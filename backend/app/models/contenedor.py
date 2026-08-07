from datetime import datetime
from ..extensions import db
from .grupo import grupo_contenedores


class Contenedor(db.Model):
    __tablename__ = "contenedores"

    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(20), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"), nullable=True)
    tipo_iso = db.Column(db.String(10))
    origen = db.Column(db.String(200))
    estado_id = db.Column(db.Integer, db.ForeignKey("estados.id"), nullable=True)
    mercancia_peligrosa = db.Column(db.Boolean, default=False)
    peso_kg = db.Column(db.Numeric(10, 2))
    mercancia = db.Column(db.String(300))
    destino = db.Column(db.String(300))
    notas = db.Column(db.Text)
    alquilado = db.Column(db.Boolean, default=False)
    fecha_inicio_alquiler = db.Column(db.DateTime, nullable=True)
    fecha_devolucion_alquiler = db.Column(db.DateTime, nullable=True)
    ubicacion_lat = db.Column(db.Numeric(10, 7))
    ubicacion_lng = db.Column(db.Numeric(10, 7))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cliente = db.relationship("Cliente", back_populates="contenedores")
    estado = db.relationship("Estado", back_populates="contenedores")
    movimientos = db.relationship("Movimiento", back_populates="contenedor", order_by="Movimiento.fecha", cascade="all, delete-orphan")
    grupos = db.relationship('Grupo', secondary=grupo_contenedores, back_populates='contenedores')

    def to_dict(self):
        return {
            "id": self.id,
            "matricula": self.matricula,
            "cliente_id": self.cliente_id,
            "cliente": self.cliente.to_dict() if self.cliente else None,
            "tipo_iso": self.tipo_iso,
            "origen": self.origen,
            "estado_id": self.estado_id,
            "estado": self.estado.to_dict() if self.estado else None,
            "mercancia_peligrosa": self.mercancia_peligrosa,
            "peso_kg": float(self.peso_kg) if self.peso_kg else None,
            "mercancia": self.mercancia,
            "destino": self.destino,
            "alquilado": self.alquilado,
            "fecha_inicio_alquiler": self.fecha_inicio_alquiler.isoformat() if self.fecha_inicio_alquiler else None,
            "fecha_devolucion_alquiler": self.fecha_devolucion_alquiler.isoformat() if self.fecha_devolucion_alquiler else None,
            "notas": self.notas,
            "ubicacion_lat": float(self.ubicacion_lat) if self.ubicacion_lat else None,
            "ubicacion_lng": float(self.ubicacion_lng) if self.ubicacion_lng else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
