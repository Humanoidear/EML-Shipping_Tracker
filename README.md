# EML Shipping Tracker

Aplicación de escritorio (Electron) para el seguimiento de rutas de contenedores de transporte marítimo. Utiliza un tablero Kanban con arrastrar y soltar para gestionar el estado de los contenedores, visualización de rutas en mapa 2D (OpenStreetMap) y globo 3D, generación de códigos QR, y panel de administración con reportes personalizables.

## Requisitos

- **Docker** (para PostgreSQL)
- **Python 3.9+** (backend Flask)
- **Node.js 18+** (frontend + Electron)

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd EML-Shipping_Tracker

# 2. Iniciar PostgreSQL con Docker
docker compose up -d

# 3. Instalar dependencias del backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Copiar variables de entorno
cd ..
cp .env.example .env

# 5. Instalar dependencias del frontend
cd frontend
npm install
```

## Ejecución

### Modo desarrollo (Vite + Flask por separado)

```bash
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
python run.py          # Flask en http://localhost:5050

# Terminal 2 - Frontend
cd frontend
npm run dev            # Vite en http://localhost:5173
```

Abrir `http://localhost:5173` en el navegador.

### Modo aplicación (Electron)

```bash
# Construir el frontend
cd frontend
npm run build

# Ejecutar Electron
cd ..
npx electron .
```

### Crear usuario administrador

La primera vez, enviar una petición POST para crear el admin:

```bash
curl -X POST http://localhost:5050/api/auth/seed-admin
```

Credenciales por defecto: `admin` / `admin123`

Configurables en el archivo `.env`.

## Estructura del proyecto

```
EML-Shipping_Tracker/
├── backend/             # API Flask + SQLAlchemy
│   ├── app/
│   │   ├── models/      # Modelos de base de datos
│   │   ├── routes/      # Endpoints REST
│   │   └── services/    # Lógica de negocio
│   └── requirements.txt
├── frontend/            # React + Vite + shadcn/ui
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   └── contexts/    # Contextos React
│   └── package.json
├── electron/            # Electron wrapper
│   ├── main.js          # Proceso principal
│   └── preload.js       # Script de precarga
├── docker-compose.yml   # PostgreSQL
└── .env.example         # Variables de entorno
```

## Funcionalidades principales

- **Kanban de contenedores** — Arrastrar y soltar para cambiar estados
- **Grupos de contenedores** — Agrupar múltiples contenedores para moverlos juntos
- **Mapa 2D** — OpenStreetMap con marcadores de ubicación arrastrables
- **Globo 3D** — Visualización global con nubes animadas y rutas
- **Códigos QR** — Generación y escaneo por webcam
- **Fotos y documentos** — Adjuntar archivos a cada contenedor
- **Reportes personalizables** — Vistas con gráficos de barras, torta y líneas
- **Exportación Excel/PDF** — Datos del contenedor y movimientos
- **Modo oscuro** — Toggle en la barra lateral
- **Gestión de usuarios** — Admin puede crear usuarios y gestionar permisos
