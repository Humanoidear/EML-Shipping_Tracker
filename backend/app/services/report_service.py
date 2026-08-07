from sqlalchemy import func
from ..models.contenedor import Contenedor
from ..models.movimiento import Movimiento
from ..models.estado import Estado
from ..extensions import db


def get_estado_distribucion():
    results = (
        db.session.query(Estado.nombre, Estado.color, func.count(Contenedor.id))
        .outerjoin(Contenedor, Contenedor.estado_id == Estado.id)
        .group_by(Estado.id)
        .order_by(Estado.orden)
        .all()
    )
    return [{"nombre": r[0], "color": r[1], "cantidad": r[2]} for r in results]


def get_tipos_iso():
    results = (
        db.session.query(Contenedor.tipo_iso, func.count(Contenedor.id))
        .group_by(Contenedor.tipo_iso)
        .all()
    )
    return [{"tipo": r[0] or "Sin tipo", "cantidad": r[1]} for r in results]


def get_peligrosa_stats():
    total = Contenedor.query.count()
    peligrosa = Contenedor.query.filter_by(mercancia_peligrosa=True).count()
    normal = total - peligrosa
    return [
        {"tipo": "Peligrosa", "cantidad": peligrosa},
        {"tipo": "Normal", "cantidad": normal},
    ]


def get_actividad_reciente(desde=None, hasta=None):
    q = Movimiento.query
    if desde:
        q = q.filter(Movimiento.created_at >= desde)
    if hasta:
        q = q.filter(Movimiento.created_at <= hasta)
    movimientos = q.order_by(Movimiento.created_at.desc()).limit(100).all()
    return [m.to_dict() for m in movimientos]


def get_tiempo_promedio_por_estado():
    results = (
        db.session.query(
            Estado.nombre,
            func.avg(Movimiento.created_at).label("avg_time"),
            func.count(Movimiento.id),
        )
        .join(Movimiento, Movimiento.estado_nuevo_id == Estado.id)
        .group_by(Estado.id)
        .order_by(Estado.orden)
        .all()
    )
    return [{"estado": r[0], "promedio_dias": 0, "total_movimientos": r[2]} for r in results]
