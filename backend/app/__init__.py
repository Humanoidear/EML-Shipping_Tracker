from flask import Flask
from config import Config
from .extensions import db, bcrypt, jwt, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.clientes import clientes_bp
    from .routes.estados import estados_bp
    from .routes.contenedores import contenedores_bp
    from .routes.reportes import reportes_bp
    from .routes.vistas import vistas_bp
    from .routes.grupos import grupos_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(clientes_bp, url_prefix="/api/clientes")
    app.register_blueprint(estados_bp, url_prefix="/api/estados")
    app.register_blueprint(contenedores_bp, url_prefix="/api/contenedores")
    app.register_blueprint(reportes_bp, url_prefix="/api/reportes")
    app.register_blueprint(vistas_bp, url_prefix="/api/vistas")
    app.register_blueprint(grupos_bp, url_prefix="/api/grupos")

    from .utils.errors import register_error_handlers
    register_error_handlers(app)

    with app.app_context():
        from .models import user, cliente, estado, contenedor, movimiento, permiso, vista, grupo
        db.create_all()
        _seed_estados()

    return app


def _seed_estados():
    from .models.estado import Estado
    if Estado.query.first() is not None:
        return

    defaults = [
        ("Reservado", "#6b7280", 0, True),
        ("Gate-In", "#3b82f6", 1, True),
        ("Cargado", "#8b5cf6", 2, True),
        ("En Tránsito", "#f59e0b", 3, True),
        ("En Puerto", "#06b6d4", 4, True),
        ("Aduana", "#ef4444", 5, True),
        ("Entregado", "#22c55e", 6, True),
        ("Vacío Devuelto", "#84cc16", 7, True),
    ]
    for nombre, color, orden, is_default in defaults:
        db.session.add(Estado(nombre=nombre, color=color, orden=orden, is_default=is_default))
    db.session.commit()
