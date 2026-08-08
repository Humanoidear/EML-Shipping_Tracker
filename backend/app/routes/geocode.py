from flask import Blueprint, request, jsonify
from ..utils.decorators import login_required
from ..services.geocode_service import forward_geocode, reverse_geocode

geocode_bp = Blueprint("geocode", __name__)


@geocode_bp.route("/search", methods=["GET"])
@login_required
def search(current_user):
    q = request.args.get("q", "")
    return jsonify(forward_geocode(q))


@geocode_bp.route("/reverse", methods=["GET"])
@login_required
def reverse(current_user):
    try:
        lat = float(request.args.get("lat"))
        lng = float(request.args.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"error": "Coordenadas inválidas"}), 400
    return jsonify(reverse_geocode(lat, lng) or {"name": ""})
