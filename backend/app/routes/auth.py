from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from ..extensions import db, bcrypt
from ..models.user import User
from ..models.permiso import Permiso
from ..utils.decorators import login_required
import os

auth_bp = Blueprint("auth", __name__)


def _can_manage_users(user) -> bool:
    if user.role == "admin":
        return True
    return bool(user.permisos and user.permisos.can_manage_users)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/register", methods=["POST"])
@login_required
def register(current_user):
    if not _can_manage_users(current_user):
        return jsonify({"error": "Acceso denegado"}), 403
    data = request.get_json()
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "El nombre de usuario ya existe"}), 400
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "El email ya está registrado"}), 400

    password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    role = data.get("role", "operator")

    user = User(username=data["username"], email=data["email"], password_hash=password_hash, role=role)
    db.session.add(user)
    db.session.flush()

    is_admin = role == "admin"
    permisos = Permiso(
        user_id=user.id,
        can_manage_users=is_admin,
        can_manage_clientes=True,
        can_manage_estados=is_admin,
        can_view_reports=is_admin,
        can_view_globe=is_admin,
        can_export_data=is_admin,
        can_scan_qr=True,
    )
    db.session.add(permisos)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@auth_bp.route("/me", methods=["GET"])
@login_required
def me(current_user):
    return jsonify(current_user.to_dict())


@auth_bp.route("/seed-admin", methods=["POST"])
def seed_admin():
    """One-time endpoint to create the initial admin from env vars."""
    if User.query.first() is not None:
        return jsonify({"error": "Ya existen usuarios en el sistema"}), 400

    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@eml.com")
    password = os.getenv("ADMIN_PASSWORD", "admin123")

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(username=username, email=email, password_hash=password_hash, role="admin")
    db.session.add(user)
    db.session.flush()

    permisos = Permiso(
        user_id=user.id,
        can_manage_users=True,
        can_manage_clientes=True,
        can_manage_estados=True,
        can_view_reports=True,
        can_view_globe=True,
        can_export_data=True,
        can_scan_qr=True,
    )
    db.session.add(permisos)
    db.session.commit()

    return jsonify(user.to_dict()), 201
