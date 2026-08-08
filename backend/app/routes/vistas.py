from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from ..extensions import db
from ..models.vista import Vista
from ..models.contenedor import Contenedor
from ..models.movimiento import Movimiento
from ..models.estado import Estado
from ..models.cliente import Cliente
from ..utils.decorators import login_required
from sqlalchemy import func

vistas_bp = Blueprint("vistas", __name__)

GROUP_BY_OPTIONS = [
    "estado", "tipo_iso", "peligrosa", "cliente", "destino", "origen",
    "alquilado", "peso_por_estado", "peso_por_cliente", "movimientos_por_dia",
    "movimientos_por_estado",
]


@vistas_bp.route("", methods=["GET"])
@login_required
def get_vistas(current_user):
    vistas = Vista.query.order_by(Vista.updated_at.desc()).all()
    return jsonify([v.to_dict() for v in vistas])


@vistas_bp.route("", methods=["POST"])
@login_required
def create_vista(current_user):
    data = request.get_json()
    vista = Vista(
        nombre=data["nombre"],
        config=data["config"],
        user_id=current_user.id,
    )
    db.session.add(vista)
    db.session.commit()
    return jsonify(vista.to_dict()), 201


@vistas_bp.route("/<int:vista_id>", methods=["PUT"])
@login_required
def update_vista(current_user, vista_id):
    vista = Vista.query.get_or_404(vista_id)
    data = request.get_json()
    if "nombre" in data:
        vista.nombre = data["nombre"]
    if "config" in data:
        vista.config = data["config"]
    db.session.commit()
    return jsonify(vista.to_dict())


@vistas_bp.route("/<int:vista_id>", methods=["DELETE"])
@login_required
def delete_vista(current_user, vista_id):
    vista = Vista.query.get_or_404(vista_id)
    db.session.delete(vista)
    db.session.commit()
    return jsonify({"message": "Vista eliminada"})


@vistas_bp.route("/options", methods=["GET"])
@login_required
def get_options(current_user):
    """Return available group-by options and filter lists for the builder."""
    clientes = Cliente.query.order_by(Cliente.nombre).all()
    estados = Estado.query.order_by(Estado.orden).all()
    return jsonify({
        "groupBy": GROUP_BY_OPTIONS,
        "clientes": [{"id": c.id, "nombre": c.nombre} for c in clientes],
        "estados": [{"id": e.id, "nombre": e.nombre} for e in estados],
    })


@vistas_bp.route("/preview", methods=["POST"])
@login_required
def preview_vista(current_user):
    """Execute a vista query and return the data for preview."""
    config = request.get_json().get("config", {})
    chart_type = config.get("chartType", "bar")
    data = _query_data(config)
    return jsonify({"data": data, "chartType": chart_type})


def _container_query(config):
    q = Contenedor.query
    if config.get("clienteId"):
        q = q.filter(Contenedor.cliente_id == int(config["clienteId"]))
    if config.get("estadoId"):
        q = q.filter(Contenedor.estado_id == int(config["estadoId"]))
    if config.get("peligrosaOnly"):
        q = q.filter(Contenedor.mercancia_peligrosa == True)  # noqa: E712
    if config.get("alquiladoOnly"):
        q = q.filter(Contenedor.alquilado == True)  # noqa: E712
    return q


def _apply_limit_sort(rows, config):
    limit = int(config.get("limit", 0) or 0)
    sort_dir = config.get("sortDir", "desc")
    rows.sort(key=lambda r: r["value"], reverse=(sort_dir == "desc"))
    if limit and limit > 0:
        rows = rows[:limit]
    return rows


def _query_data(config):
    group_by = config.get("groupBy", "estado")
    limit = int(config.get("limit", 0) or 0)
    sort_dir = config.get("sortDir", "desc")

    if group_by == "estado":
        results = (
            db.session.query(Estado.nombre, Estado.color, func.count(Contenedor.id))
            .outerjoin(Contenedor, Contenedor.estado_id == Estado.id)
            .group_by(Estado.id)
            .order_by(Estado.orden)
            .all()
        )
        rows = [{"name": r[0], "value": r[2], "color": r[1]} for r in results]
    elif group_by == "tipo_iso":
        results = (
            _container_query(config)
            .with_entities(Contenedor.tipo_iso, func.count(Contenedor.id))
            .group_by(Contenedor.tipo_iso)
            .all()
        )
        rows = [{"name": r[0] or "Sin tipo", "value": r[1]} for r in results]
    elif group_by == "peligrosa":
        base = _container_query(config)
        total = base.count()
        peligrosa = base.filter(Contenedor.mercancia_peligrosa == True).count()  # noqa: E712
        rows = [
            {"name": "Peligrosa", "value": peligrosa, "color": "#ef4444"},
            {"name": "Normal", "value": total - peligrosa, "color": "#22c55e"},
        ]
    elif group_by == "cliente":
        results = (
            db.session.query(Cliente.nombre, func.count(Contenedor.id))
            .outerjoin(Contenedor, Contenedor.cliente_id == Cliente.id)
            .group_by(Cliente.id)
            .all()
        )
        rows = [{"name": r[0] or "Sin cliente", "value": r[1]} for r in results]
    elif group_by == "destino":
        results = (
            _container_query(config)
            .with_entities(Contenedor.destino, func.count(Contenedor.id))
            .group_by(Contenedor.destino)
            .all()
        )
        rows = [{"name": r[0] or "Sin destino", "value": r[1]} for r in results]
    elif group_by == "origen":
        results = (
            _container_query(config)
            .with_entities(Contenedor.origen, func.count(Contenedor.id))
            .group_by(Contenedor.origen)
            .all()
        )
        rows = [{"name": r[0] or "Sin origen", "value": r[1]} for r in results]
    elif group_by == "alquilado":
        base = _container_query(config)
        total = base.count()
        alq = base.filter(Contenedor.alquilado == True).count()  # noqa: E712
        rows = [
            {"name": "Alquilado", "value": alq, "color": "#8b5cf6"},
            {"name": "Propio", "value": total - alq, "color": "#22c55e"},
        ]
    elif group_by == "peso_por_estado":
        results = (
            db.session.query(Estado.nombre, func.coalesce(func.sum(Contenedor.peso_kg), 0))
            .outerjoin(Contenedor, Contenedor.estado_id == Estado.id)
            .group_by(Estado.id)
            .order_by(Estado.orden)
            .all()
        )
        rows = [{"name": r[0], "value": float(r[1])} for r in results]
    elif group_by == "peso_por_cliente":
        results = (
            db.session.query(Cliente.nombre, func.coalesce(func.sum(Contenedor.peso_kg), 0))
            .outerjoin(Contenedor, Contenedor.cliente_id == Cliente.id)
            .group_by(Cliente.id)
            .all()
        )
        rows = [{"name": r[0] or "Sin cliente", "value": float(r[1])} for r in results]
    elif group_by == "movimientos_por_dia":
        days = int(config.get("days", 14) or 14)
        since = datetime.utcnow() - timedelta(days=days)
        results = (
            db.session.query(
                func.date(Movimiento.fecha),
                func.count(Movimiento.id),
            )
            .filter(Movimiento.fecha >= since)
            .group_by(func.date(Movimiento.fecha))
            .order_by(func.date(Movimiento.fecha))
            .all()
        )
        rows = [{"name": r[0].isoformat(), "value": r[1]} for r in results]
    elif group_by == "movimientos_por_estado":
        results = (
            db.session.query(Estado.nombre, func.count(Movimiento.id))
            .join(Movimiento, Movimiento.estado_nuevo_id == Estado.id)
            .group_by(Estado.id)
            .order_by(Estado.orden)
            .all()
        )
        rows = [{"name": r[0], "value": r[1]} for r in results]
    else:
        rows = []

    return _apply_limit_sort(rows, config)
