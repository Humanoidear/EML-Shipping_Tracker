from flask import Blueprint, jsonify, request
from ..utils.decorators import login_required
from ..services.report_service import (
    get_estado_distribucion,
    get_tipos_iso,
    get_peligrosa_stats,
    get_actividad_reciente,
    get_tiempo_promedio_por_estado,
)

reportes_bp = Blueprint("reportes", __name__)


@reportes_bp.route("/estados-distribucion", methods=["GET"])
@login_required
def estados_distribucion(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_view_reports):
        return jsonify({"error": "Acceso denegado"}), 403
    return jsonify(get_estado_distribucion())


@reportes_bp.route("/tipos-iso", methods=["GET"])
@login_required
def tipos_iso(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_view_reports):
        return jsonify({"error": "Acceso denegado"}), 403
    return jsonify(get_tipos_iso())


@reportes_bp.route("/peligrosa", methods=["GET"])
@login_required
def peligrosa(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_view_reports):
        return jsonify({"error": "Acceso denegado"}), 403
    return jsonify(get_peligrosa_stats())


@reportes_bp.route("/actividad", methods=["GET"])
@login_required
def actividad(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_view_reports):
        return jsonify({"error": "Acceso denegado"}), 403
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    return jsonify(get_actividad_reciente(desde, hasta))


@reportes_bp.route("/tiempo-estado", methods=["GET"])
@login_required
def tiempo_estado(current_user):
    if current_user.role != "admin" and not (current_user.permisos and current_user.permisos.can_view_reports):
        return jsonify({"error": "Acceso denegado"}), 403
    return jsonify(get_tiempo_promedio_por_estado())
