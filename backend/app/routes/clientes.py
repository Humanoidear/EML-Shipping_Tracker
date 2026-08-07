from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.cliente import Cliente
from ..utils.decorators import login_required

clientes_bp = Blueprint("clientes", __name__)


@clientes_bp.route("", methods=["GET"])
@login_required
def get_clientes(current_user):
    clientes = Cliente.query.order_by(Cliente.nombre).all()
    return jsonify([c.to_dict() for c in clientes])


@clientes_bp.route("/<int:cliente_id>", methods=["GET"])
@login_required
def get_cliente(current_user, cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    return jsonify(cliente.to_dict())


@clientes_bp.route("", methods=["POST"])
@login_required
def create_cliente(current_user):
    data = request.get_json()
    cliente = Cliente(
        nombre=data["nombre"],
        email=data.get("email"),
        telefono=data.get("telefono"),
        direccion=data.get("direccion"),
    )
    db.session.add(cliente)
    db.session.commit()
    return jsonify(cliente.to_dict()), 201


@clientes_bp.route("/<int:cliente_id>", methods=["PUT"])
@login_required
def update_cliente(current_user, cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    for field in ["nombre", "email", "telefono", "direccion"]:
        if field in data:
            setattr(cliente, field, data[field])
    db.session.commit()
    return jsonify(cliente.to_dict())


@clientes_bp.route("/<int:cliente_id>", methods=["DELETE"])
@login_required
def delete_cliente(current_user, cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({"message": "Cliente eliminado"})
