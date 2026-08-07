from datetime import datetime
from ..extensions import db


class Movimiento(db.Model):
    __tablename__ = "movimientos"

    id = db.Column(db.Integer, primary_key=True)
    contenedor_id = db.Column(db.Integer, db.ForeignKey("contenedores.id"), nullable=False)
    estado_anterior_id = db.Column(db.Integer, db.ForeignKey("estados.id"), nullable=True)
    estado_nuevo_id = db.Column(db.Integer, db.ForeignKey("estados.id"), nullable=False)
    ubicacion_lat = db.Column(db.Numeric(10, 7))
    ubicacion_lng = db.Column(db.Numeric(10, 7))
    notas = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contenedor = db.relationship("Contenedor", back_populates="movimientos")
    user = db.relationship("User", back_populates="movimientos")
    estado_anterior = db.relationship("Estado", foreign_keys=[estado_anterior_id])
    estado_nuevo = db.relationship("Estado", foreign_keys=[estado_nuevo_id])

    def to_dict(self):
        return {
            "id": self.id,
            "contenedor_id": self.contenedor_id,
            "estado_anterior_id": self.estado_anterior_id,
            "estado_anterior": self.estado_anterior.to_dict() if self.estado_anterior else None,
            "estado_nuevo_id": self.estado_nuevo_id,
            "estado_nuevo": self.estado_nuevo.to_dict() if self.estado_nuevo else None,
            "ubicacion_lat": float(self.ubicacion_lat) if self.ubicacion_lat else None,
            "ubicacion_lng": float(self.ubicacion_lng) if self.ubicacion_lng else None,
            "notas": self.notas,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
