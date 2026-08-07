from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.estado import Estado
from ..utils.decorators import login_required

estados_bp = Blueprint("estados", __name__)


@estados_bp.route("", methods=["GET"])
@login_required
def get_estados(current_user):
    estados = Estado.query.order_by(Estado.orden).all()
    return jsonify([e.to_dict() for e in estados])


@estados_bp.route("", methods=["POST"])
@login_required
def create_estado(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_manage_estados):
        return jsonify({"error": "Acceso denegado"}), 403

    data = request.get_json()
    max_orden = db.session.query(db.func.max(Estado.orden)).scalar() or 0
    estado = Estado(
        nombre=data["nombre"],
        color=data.get("color", "#6b7280"),
        orden=data.get("orden", max_orden + 1),
    )
    db.session.add(estado)
    db.session.commit()
    return jsonify(estado.to_dict()), 201


@estados_bp.route("/<int:estado_id>", methods=["PUT"])
@login_required
def update_estado(current_user, estado_id):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_manage_estados):
        return jsonify({"error": "Acceso denegado"}), 403

    estado = Estado.query.get_or_404(estado_id)
    data = request.get_json()
    for field in ["nombre", "color", "orden"]:
        if field in data:
            setattr(estado, field, data[field])
    db.session.commit()
    return jsonify(estado.to_dict())


@estados_bp.route("/<int:estado_id>", methods=["DELETE"])
@login_required
def delete_estado(current_user, estado_id):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_manage_estados):
        return jsonify({"error": "Acceso denegado"}), 403

    estado = Estado.query.get_or_404(estado_id)
    if estado.is_default:
        return jsonify({"error": "No se puede eliminar un estado por defecto"}), 400

    cont_count = len(estado.contenedores)
    for cont in estado.contenedores:
        cont.estado_id = None

    from ..models.movimiento import Movimiento
    Movimiento.query.filter(
        (Movimiento.estado_anterior_id == estado_id) | (Movimiento.estado_nuevo_id == estado_id)
    ).update(
        {
            Movimiento.estado_anterior_id: None,
            Movimiento.estado_nuevo_id: None,
        },
        synchronize_session=False,
    )

    db.session.delete(estado)
    db.session.commit()
    return jsonify({"message": f"Estado eliminado. {cont_count} contenedor(es) desasignado(s).", "affected": cont_count})
