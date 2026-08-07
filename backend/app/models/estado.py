from datetime import datetime
from ..extensions import db


class Estado(db.Model):
    __tablename__ = "estados"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    color = db.Column(db.String(7), nullable=False, default="#6b7280")
    orden = db.Column(db.Integer, nullable=False, default=0)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contenedores = db.relationship("Contenedor", back_populates="estado")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "color": self.color,
            "orden": self.orden,
            "is_default": self.is_default,
        }
