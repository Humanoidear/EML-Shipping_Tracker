from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
from ..extensions import db
from ..models.contenedor import Contenedor
from ..models.movimiento import Movimiento
from ..models.adjunto import Adjunto
from ..models.estado import Estado
from ..utils.decorators import login_required
from ..services.qr_service import generate_qr

contenedores_bp = Blueprint("contenedores", __name__)


def _parse_fecha(val):
    if not val:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return datetime.utcnow()


def _parse_fecha_or_none(val):
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


@contenedores_bp.route("", methods=["GET"])
@login_required
def get_contenedores(current_user):
    contenedores = Contenedor.query.order_by(Contenedor.created_at.desc()).all()
    return jsonify([c.to_dict() for c in contenedores])


@contenedores_bp.route("/<int:contenedor_id>", methods=["GET"])
@login_required
def get_contenedor(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    return jsonify(contenedor.to_dict())


@contenedores_bp.route("", methods=["POST"])
@login_required
def create_contenedor(current_user):
    data = request.get_json()
    if Contenedor.query.filter_by(matricula=data["matricula"]).first():
        return jsonify({"error": "Ya existe un contenedor con esa matrícula"}), 400
    if not data.get("estado_id"):
        return jsonify({"error": "Debes seleccionar un estado inicial"}), 400
    origen_lat = data.get("origen_lat")
    origen_lng = data.get("origen_lng")

    contenedor = Contenedor(
        matricula=data["matricula"],
        cliente_id=data.get("cliente_id"),
        tipo_iso=data.get("tipo_iso"),
        origen=data.get("origen"),
        origen_lat=origen_lat,
        origen_lng=origen_lng,
        estado_id=data.get("estado_id"),
        mercancia_peligrosa=data.get("mercancia_peligrosa", False),
        peso_kg=data.get("peso_kg"),
        mercancia=data.get("mercancia"),
        destino=data.get("destino"),
        destino_lat=data.get("destino_lat"),
        destino_lng=data.get("destino_lng"),
        notas=data.get("notas"),
        alquilado=data.get("alquilado", False),
        fecha_inicio_alquiler=_parse_fecha_or_none(data.get("fecha_inicio_alquiler")),
        fecha_devolucion_alquiler=_parse_fecha_or_none(data.get("fecha_devolucion_alquiler")),
        ubicacion_lat=data.get("ubicacion_lat") or origen_lat,
        ubicacion_lng=data.get("ubicacion_lng") or origen_lng,
    )
    db.session.add(contenedor)
    db.session.flush()

    try:
        if data.get("estado_id"):
            movimiento = Movimiento(
                contenedor_id=contenedor.id,
                estado_anterior_id=None,
                estado_nuevo_id=data["estado_id"],
                ubicacion_lat=data.get("ubicacion_lat") or origen_lat,
                ubicacion_lng=data.get("ubicacion_lng") or origen_lng,
                notas="Contenedor creado",
                user_id=current_user.id,
            )
            db.session.add(movimiento)

        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error al crear contenedor"}), 500
    return jsonify(contenedor.to_dict()), 201


@contenedores_bp.route("/<int:contenedor_id>", methods=["PUT"])
@login_required
def update_contenedor(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    data = request.get_json()
    fields = [
        "matricula", "cliente_id", "tipo_iso", "origen", "origen_lat", "origen_lng",
        "destino", "destino_lat", "destino_lng",
        "mercancia_peligrosa", "peso_kg", "mercancia", "notas",
        "alquilado", "ubicacion_lat", "ubicacion_lng",
    ]
    for field in fields:
        if field in data:
            setattr(contenedor, field, data[field])
    if "fecha_inicio_alquiler" in data:
        contenedor.fecha_inicio_alquiler = _parse_fecha_or_none(data["fecha_inicio_alquiler"])
    if "fecha_devolucion_alquiler" in data:
        contenedor.fecha_devolucion_alquiler = _parse_fecha_or_none(data["fecha_devolucion_alquiler"])
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error al actualizar: matrícula duplicada o datos inválidos"}), 400
    return jsonify(contenedor.to_dict())


@contenedores_bp.route("/<int:contenedor_id>", methods=["DELETE"])
@login_required
def delete_contenedor(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)

    for grupo in list(contenedor.grupos):
        grupo.contenedores.remove(contenedor)
        if len(grupo.contenedores) == 0:
            db.session.delete(grupo)

    for adjunto in list(contenedor.adjuntos):
        db.session.delete(adjunto)

    db.session.delete(contenedor)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Error al eliminar el contenedor"}), 500
    return jsonify({"message": "Contenedor eliminado"})


@contenedores_bp.route("/<int:contenedor_id>/mover", methods=["PUT"])
@login_required
def mover_contenedor(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    data = request.get_json()

    nuevo_estado_id = data["nuevo_estado_id"]
    estado_anterior_id = contenedor.estado_id
    nuevo_estado = Estado.query.get(nuevo_estado_id)

    lat = data.get("ubicacion_lat")
    lng = data.get("ubicacion_lng")

    # Al mover a "Entregado" con destino definido, usar las coordenadas del destino.
    if lat is None and lng is None and nuevo_estado and nuevo_estado.nombre.strip().lower() == "entregado":
        if contenedor.destino_lat is not None and contenedor.destino_lng is not None:
            lat = float(contenedor.destino_lat)
            lng = float(contenedor.destino_lng)

    contenedor.estado_id = nuevo_estado_id
    contenedor.updated_at = db.func.now()

    if lat is not None:
        contenedor.ubicacion_lat = lat
    if lng is not None:
        contenedor.ubicacion_lng = lng

    movimiento = Movimiento(
        contenedor_id=contenedor.id,
        estado_anterior_id=estado_anterior_id,
        estado_nuevo_id=nuevo_estado_id,
        ubicacion_lat=lat,
        ubicacion_lng=lng,
        notas=data.get("notas", ""),
        user_id=current_user.id,
        fecha=_parse_fecha(data.get("fecha")),
    )
    db.session.add(movimiento)
    db.session.commit()
    return jsonify(contenedor.to_dict())


@contenedores_bp.route("/<int:contenedor_id>/movimientos", methods=["GET"])
@login_required
def get_movimientos(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    movimientos = Movimiento.query.filter_by(contenedor_id=contenedor_id).order_by(Movimiento.fecha.asc()).all()
    return jsonify([m.to_dict() for m in movimientos])


@contenedores_bp.route("/<int:contenedor_id>/movimientos", methods=["POST"])
@login_required
def add_movimiento(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    data = request.get_json()
    movimiento = Movimiento(
        contenedor_id=contenedor.id,
        estado_anterior_id=contenedor.estado_id,
        estado_nuevo_id=contenedor.estado_id,
        ubicacion_lat=data.get("ubicacion_lat"),
        ubicacion_lng=data.get("ubicacion_lng"),
        notas=data.get("notas", ""),
        user_id=current_user.id,
        fecha=_parse_fecha(data.get("fecha")),
    )
    db.session.add(movimiento)
    if data.get("ubicacion_lat") is not None:
        contenedor.ubicacion_lat = data["ubicacion_lat"]
    if data.get("ubicacion_lng") is not None:
        contenedor.ubicacion_lng = data["ubicacion_lng"]
    contenedor.updated_at = db.func.now()
    db.session.commit()
    return jsonify(movimiento.to_dict()), 201


@contenedores_bp.route("/<int:contenedor_id>/movimientos/<int:mov_id>", methods=["PUT"])
@login_required
def update_movimiento(current_user, contenedor_id, mov_id):
    movimiento = Movimiento.query.filter_by(id=mov_id, contenedor_id=contenedor_id).first_or_404()
    data = request.get_json()
    if "ubicacion_lat" in data:
        movimiento.ubicacion_lat = data["ubicacion_lat"]
    if "ubicacion_lng" in data:
        movimiento.ubicacion_lng = data["ubicacion_lng"]
    if "notas" in data:
        movimiento.notas = data["notas"]
    if "fecha" in data and data["fecha"]:
        movimiento.fecha = _parse_fecha(data["fecha"])
    db.session.commit()
    return jsonify(movimiento.to_dict())


@contenedores_bp.route("/<int:contenedor_id>/movimientos/<int:mov_id>", methods=["DELETE"])
@login_required
def delete_movimiento(current_user, contenedor_id, mov_id):
    movimiento = Movimiento.query.filter_by(id=mov_id, contenedor_id=contenedor_id).first_or_404()
    db.session.delete(movimiento)
    db.session.commit()
    return jsonify({"message": "Movimiento eliminado"})


@contenedores_bp.route("/<int:contenedor_id>/tiempo-ruta", methods=["GET"])
@login_required
def tiempo_en_ruta(current_user, contenedor_id):
    first = Movimiento.query.filter_by(contenedor_id=contenedor_id).order_by(Movimiento.fecha.asc()).first()
    last = Movimiento.query.filter_by(contenedor_id=contenedor_id).order_by(Movimiento.fecha.desc()).first()
    if not first:
        return jsonify({"dias": 0, "horas": 0})
    end = last.fecha if last else datetime.utcnow()
    diff = end - first.fecha
    return jsonify({
        "dias": diff.days,
        "horas": round(diff.total_seconds() / 3600, 1),
        "inicio": first.fecha.isoformat(),
        "ultimo": end.isoformat(),
    })


@contenedores_bp.route("/<int:contenedor_id>/qr", methods=["GET"])
@login_required
def get_qr(current_user, contenedor_id):
    contenedor = Contenedor.query.get_or_404(contenedor_id)
    qr_data = f"eml://contenedor/{contenedor.matricula}"
    buf = generate_qr(qr_data)
    return send_file(buf, mimetype="image/png")


@contenedores_bp.route("/qr/<matricula>", methods=["GET"])
@login_required
def lookup_by_matricula(current_user, matricula):
    contenedor = Contenedor.query.filter_by(matricula=matricula).first()
    if not contenedor:
        return jsonify({"error": "Contenedor no encontrado"}), 404
    return jsonify(contenedor.to_dict())


@contenedores_bp.route("/<int:contenedor_id>/adjuntos", methods=["GET"])
@login_required
def get_adjuntos(current_user, contenedor_id):
    adjuntos = Adjunto.query.filter_by(contenedor_id=contenedor_id).order_by(Adjunto.created_at.desc()).all()
    return jsonify([a.to_dict() for a in adjuntos])


@contenedores_bp.route("/<int:contenedor_id>/adjuntos", methods=["POST"])
@login_required
def add_adjunto(current_user, contenedor_id):
    data = request.get_json()
    adjunto = Adjunto(
        contenedor_id=contenedor_id,
        tipo=data["tipo"],
        nombre=data.get("nombre", ""),
        filename=data.get("filename", ""),
        data=data.get("data", ""),
    )
    db.session.add(adjunto)
    db.session.commit()
    return jsonify(adjunto.to_dict()), 201


@contenedores_bp.route("/<int:contenedor_id>/adjuntos/<int:adj_id>", methods=["DELETE"])
@login_required
def delete_adjunto(current_user, contenedor_id, adj_id):
    adjunto = Adjunto.query.filter_by(id=adj_id, contenedor_id=contenedor_id).first_or_404()
    db.session.delete(adjunto)
    db.session.commit()
    return jsonify({"message": "Adjunto eliminado"})
