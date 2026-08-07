from flask import Blueprint, request, jsonify
from ..extensions import db, bcrypt
from ..models.user import User
from ..models.permiso import Permiso
from ..utils.decorators import login_required, admin_required

users_bp = Blueprint("users", __name__)


@users_bp.route("", methods=["GET"])
@admin_required
def get_users(current_user):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route("/<int:user_id>", methods=["GET"])
@admin_required
def get_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@users_bp.route("/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if "username" in data:
        existing = User.query.filter_by(username=data["username"]).first()
        if existing and existing.id != user.id:
            return jsonify({"error": "El nombre de usuario ya existe"}), 400
        user.username = data["username"]
    if "email" in data:
        existing = User.query.filter_by(email=data["email"]).first()
        if existing and existing.id != user.id:
            return jsonify({"error": "El email ya está registrado"}), 400
        user.email = data["email"]
    if "password" in data:
        user.password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    if "role" in data:
        user.role = data["role"]

    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(current_user, user_id):
    if current_user.id == user_id:
        return jsonify({"error": "No puedes eliminar tu propio usuario"}), 400
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Usuario eliminado"})


@users_bp.route("/<int:user_id>/permisos", methods=["PUT"])
@admin_required
def update_permisos(current_user, user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if not user.permisos:
        user.permisos = Permiso(user_id=user.id)
        db.session.add(user.permisos)

    for key in ["can_manage_users", "can_manage_clientes", "can_manage_estados",
                 "can_view_reports", "can_view_globe", "can_export_data", "can_scan_qr"]:
        if key in data:
            setattr(user.permisos, key, data[key])

    db.session.commit()
    return jsonify(user.to_dict())
