from ..extensions import db


class Permiso(db.Model):
    __tablename__ = "permisos"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    can_manage_users = db.Column(db.Boolean, default=False)
    can_manage_clientes = db.Column(db.Boolean, default=True)
    can_manage_estados = db.Column(db.Boolean, default=False)
    can_view_reports = db.Column(db.Boolean, default=False)
    can_view_globe = db.Column(db.Boolean, default=False)
    can_export_data = db.Column(db.Boolean, default=False)
    can_scan_qr = db.Column(db.Boolean, default=True)

    user = db.relationship("User", back_populates="permisos")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "can_manage_users": self.can_manage_users,
            "can_manage_clientes": self.can_manage_clientes,
            "can_manage_estados": self.can_manage_estados,
            "can_view_reports": self.can_view_reports,
            "can_view_globe": self.can_view_globe,
            "can_export_data": self.can_export_data,
            "can_scan_qr": self.can_scan_qr,
        }
