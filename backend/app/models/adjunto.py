from datetime import datetime
from ..extensions import db


class Adjunto(db.Model):
    __tablename__ = "adjuntos"

    id = db.Column(db.Integer, primary_key=True)
    contenedor_id = db.Column(db.Integer, db.ForeignKey("contenedores.id", ondelete="CASCADE"), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # "photo" or "document"
    nombre = db.Column(db.String(200), nullable=False)
    filename = db.Column(db.String(300))
    data = db.Column(db.Text)  # base64
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contenedor = db.relationship("Contenedor", backref="adjuntos")

    def to_dict(self):
        return {
            "id": self.id,
            "contenedor_id": self.contenedor_id,
            "tipo": self.tipo,
            "nombre": self.nombre,
            "filename": self.filename,
            "data": self.data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
