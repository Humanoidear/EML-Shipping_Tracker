from datetime import datetime
from ..extensions import db

grupo_contenedores = db.Table('grupo_contenedores',
    db.Column('grupo_id', db.Integer, db.ForeignKey('grupos.id', ondelete='CASCADE'), primary_key=True),
    db.Column('contenedor_id', db.Integer, db.ForeignKey('contenedores.id', ondelete='CASCADE'), primary_key=True)
)

class Grupo(db.Model):
    __tablename__ = 'grupos'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False, default='Grupo sin nombre')
    estado_id = db.Column(db.Integer, db.ForeignKey('estados.id'), nullable=True)
    ubicacion_lat = db.Column(db.Numeric(10, 7))
    ubicacion_lng = db.Column(db.Numeric(10, 7))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    contenedores = db.relationship('Contenedor', secondary=grupo_contenedores, back_populates='grupos')
    estado = db.relationship('Estado')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'estado_id': self.estado_id,
            'estado': self.estado.to_dict() if self.estado else None,
            'ubicacion_lat': float(self.ubicacion_lat) if self.ubicacion_lat else None,
            'ubicacion_lng': float(self.ubicacion_lng) if self.ubicacion_lng else None,
            'contenedores': [c.to_dict() for c in self.contenedores],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
