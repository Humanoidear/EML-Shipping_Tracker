from datetime import datetime
from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="operator")  # admin | operator
    theme = db.Column(db.String(10), nullable=False, default="light")
    sidebar_collapsed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    permisos = db.relationship("Permiso", back_populates="user", uselist=False, cascade="all, delete-orphan")
    movimientos = db.relationship("Movimiento", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "theme": self.theme,
            "sidebar_collapsed": self.sidebar_collapsed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "permisos": self.permisos.to_dict() if self.permisos else None,
        }
