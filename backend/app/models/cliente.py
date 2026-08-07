from datetime import datetime
from ..extensions import db


class Cliente(db.Model):
    __tablename__ = "clientes"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120))
    telefono = db.Column(db.String(50))
    direccion = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contenedores = db.relationship("Contenedor", back_populates="cliente")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "telefono": self.telefono,
            "direccion": self.direccion,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
