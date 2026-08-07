from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.grupo import Grupo
from ..models.contenedor import Contenedor
from ..models.movimiento import Movimiento
from ..utils.decorators import login_required

grupos_bp = Blueprint('grupos', __name__)

@grupos_bp.route('', methods=['GET'])
@login_required
def get_grupos(current_user):
    grupos = Grupo.query.order_by(Grupo.created_at.desc()).all()
    return jsonify([g.to_dict() for g in grupos])

@grupos_bp.route('', methods=['POST'])
@login_required
def create_grupo(current_user):
    data = request.get_json()
    cont_ids = data.get('contenedor_ids', [])
    first_container = Contenedor.query.get(cont_ids[0]) if cont_ids else None
    estado_id = data.get('estado_id') or (first_container.estado_id if first_container else None)
    grupo = Grupo(
        nombre=data.get('nombre', 'Grupo sin nombre'),
        estado_id=estado_id,
        ubicacion_lat=data.get('ubicacion_lat'),
        ubicacion_lng=data.get('ubicacion_lng'),
    )
    for cid in cont_ids:
        cont = Contenedor.query.get(cid)
        if cont:
            grupo.contenedores.append(cont)
            if grupo.estado_id is not None:
                cont.estado_id = grupo.estado_id
    db.session.add(grupo)
    db.session.commit()
    return jsonify(grupo.to_dict()), 201

@grupos_bp.route('/<int:grupo_id>', methods=['PUT'])
@login_required
def update_grupo(current_user, grupo_id):
    grupo = Grupo.query.get_or_404(grupo_id)
    data = request.get_json()
    if 'nombre' in data:
        grupo.nombre = data['nombre']
    if 'estado_id' in data:
        grupo.estado_id = data['estado_id']
        for cont in grupo.contenedores:
            cont.estado_id = data['estado_id']
    if 'ubicacion_lat' in data:
        grupo.ubicacion_lat = data['ubicacion_lat']
        for cont in grupo.contenedores:
            cont.ubicacion_lat = data['ubicacion_lat']
    if 'ubicacion_lng' in data:
        grupo.ubicacion_lng = data['ubicacion_lng']
        for cont in grupo.contenedores:
            cont.ubicacion_lng = data['ubicacion_lng']
    db.session.commit()
    return jsonify(grupo.to_dict())

@grupos_bp.route('/<int:grupo_id>/mover', methods=['PUT'])
@login_required
def mover_grupo(current_user, grupo_id):
    grupo = Grupo.query.get_or_404(grupo_id)
    data = request.get_json()
    nuevo_estado_id = data['nuevo_estado_id']
    estado_anterior_id = grupo.estado_id
    grupo.estado_id = nuevo_estado_id
    if data.get('ubicacion_lat'):
        grupo.ubicacion_lat = data['ubicacion_lat']
    if data.get('ubicacion_lng'):
        grupo.ubicacion_lng = data['ubicacion_lng']
    for cont in grupo.contenedores:
        cont.estado_id = nuevo_estado_id
        if data.get('ubicacion_lat'):
            cont.ubicacion_lat = data['ubicacion_lat']
        if data.get('ubicacion_lng'):
            cont.ubicacion_lng = data['ubicacion_lng']
        mov = Movimiento(
            contenedor_id=cont.id,
            estado_anterior_id=estado_anterior_id,
            estado_nuevo_id=nuevo_estado_id,
            ubicacion_lat=data.get('ubicacion_lat'),
            ubicacion_lng=data.get('ubicacion_lng'),
            notas=f'Movido con grupo: {grupo.nombre}',
            user_id=current_user.id,
        )
        db.session.add(mov)
    db.session.commit()
    return jsonify(grupo.to_dict())

@grupos_bp.route('/<int:grupo_id>/contenedores/<int:cont_id>', methods=['POST'])
@login_required
def add_to_group(current_user, grupo_id, cont_id):
    grupo = Grupo.query.get_or_404(grupo_id)
    cont = Contenedor.query.get_or_404(cont_id)
    if cont not in grupo.contenedores:
        grupo.contenedores.append(cont)
        if grupo.estado_id is None:
            grupo.estado_id = cont.estado_id
        cont.estado_id = grupo.estado_id
        if grupo.ubicacion_lat:
            cont.ubicacion_lat = grupo.ubicacion_lat
        if grupo.ubicacion_lng:
            cont.ubicacion_lng = grupo.ubicacion_lng
        db.session.commit()
    return jsonify(grupo.to_dict())

@grupos_bp.route('/<int:grupo_id>/contenedores/<int:cont_id>', methods=['DELETE'])
@login_required
def remove_from_group(current_user, grupo_id, cont_id):
    grupo = Grupo.query.get_or_404(grupo_id)
    cont = Contenedor.query.get_or_404(cont_id)
    if cont in grupo.contenedores:
        grupo.contenedores.remove(cont)
        if len(grupo.contenedores) == 0:
            db.session.delete(grupo)
        db.session.commit()
    return jsonify(grupo.to_dict() if len(grupo.contenedores) > 0 else {'message': 'Grupo eliminado'})

@grupos_bp.route('/<int:grupo_id>', methods=['DELETE'])
@login_required
def delete_grupo(current_user, grupo_id):
    grupo = Grupo.query.get_or_404(grupo_id)
    db.session.delete(grupo)
    db.session.commit()
    return jsonify({'message': 'Grupo eliminado'})
