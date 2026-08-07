from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.vista import Vista
from ..models.contenedor import Contenedor
from ..models.movimiento import Movimiento
from ..models.estado import Estado
from ..utils.decorators import login_required
from sqlalchemy import func

vistas_bp = Blueprint("vistas", __name__)


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


@vistas_bp.route("/preview", methods=["POST"])
@login_required
def preview_vista(current_user):
    """Execute a vista query and return the data for preview."""
    config = request.get_json().get("config", {})
    chart_type = config.get("chartType", "bar")
    group_by = config.get("groupBy", "estado")

    data = _query_data(group_by)
    return jsonify({"data": data, "chartType": chart_type})


def _query_data(group_by):
    if group_by == "estado":
        results = (
            db.session.query(Estado.nombre, Estado.color, func.count(Contenedor.id))
            .outerjoin(Contenedor, Contenedor.estado_id == Estado.id)
            .group_by(Estado.id)
            .order_by(Estado.orden)
            .all()
        )
        return [{"name": r[0], "value": r[2], "color": r[1]} for r in results]
    elif group_by == "tipo_iso":
        results = (
            db.session.query(Contenedor.tipo_iso, func.count(Contenedor.id))
            .group_by(Contenedor.tipo_iso)
            .all()
        )
        return [{"name": r[0] or "Sin tipo", "value": r[1]} for r in results]
    elif group_by == "peligrosa":
        total = Contenedor.query.count()
        peligrosa = Contenedor.query.filter_by(mercancia_peligrosa=True).count()
        return [
            {"name": "Peligrosa", "value": peligrosa},
            {"name": "Normal", "value": total - peligrosa},
        ]
    elif group_by == "cliente":
        from ..models.cliente import Cliente
        results = (
            db.session.query(Cliente.nombre, func.count(Contenedor.id))
            .outerjoin(Contenedor, Contenedor.cliente_id == Cliente.id)
            .group_by(Cliente.id)
            .order_by(func.count(Contenedor.id).desc())
            .limit(10)
            .all()
        )
        return [{"name": r[0] or "Sin cliente", "value": r[1]} for r in results]
    elif group_by == "movimientos_time":
        results = (
            db.session.query(Estado.nombre, func.count(Movimiento.id))
            .join(Movimiento, Movimiento.estado_nuevo_id == Estado.id)
            .group_by(Estado.id)
            .order_by(Estado.orden)
            .all()
        )
        return [{"name": r[0], "value": r[1]} for r in results]
    return []
