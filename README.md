<div align="center">
  <img src="images/AssistX.png" alt="AssistX" width="96" height="96" />
  <h1>AssistX — Gestión de Asistencias Escolares</h1>
  <p>Sistema de gestión de asistencias para la Escuela Técnica N.° 20 D.E. 20.</p>
</div>

AssistX permite a secretaría, preceptores y profesores de Educación Física registrar la asistencia diaria, seguir el rendimiento de los alumnos, gestionar cursos y personal, y detectar de forma automática a los alumnos en riesgo por inasistencias.

## Funcionalidades

- **Registro de asistencia diario** por curso (Presente, Ausente, Tarde, Retiro, etc.).
- **Notificaciones de riesgo de asistencia:** monitoreo automático del acumulado de faltas (bimestral y anual) con pop-up al guardar y campana persistente. Conteo ponderado (Ausente = 1, Tarde/Retiro = ½, Justificado = 0).
- **Justificativos:** carga de un certificado (PDF/imagen) asociado a una falta puntual, que la marca como justificada y la quita del conteo de riesgo.
- **Gestión de alumnos, cursos y personal**, con auto-registro de personal y aprobación por secretaría.
- **Calendario académico** e **historial de asistencia por alumno**.

### Roles
- **Secretario/a** — administración completa (alumnos, cursos, usuarios, períodos, justificativos).
- **Preceptor/a** — registro de asistencia, historial, justificativos.
- **Profesor/a EF** — registro de asistencia de clases y grupos de Educación Física.

## Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19, Vite, Tailwind CSS, motion, lucide-react, recharts |
| Backend | Node.js, Express, mysql2 (sin ORM), JWT, bcrypt |
| Base de datos | MySQL / MariaDB |

## Estructura del proyecto

```
.
├── src/                  # Frontend (React + Vite)
│   ├── components/        # Layout y componentes compartidos
│   └── views/            # Vistas por rol (auth, dashboard, preceptor, secretario, ...)
├── api/                  # Backend (Express + mysql2)
│   └── src/
│       ├── controllers/  # Lógica de cada recurso
│       ├── routes/       # Definición de endpoints
│       ├── middlewares/  # Autenticación / autorización (JWT)
│       ├── config/       # Conexión a DB y configuración de subida de archivos
│       └── utils/        # Lógica de riesgo (con unit tests)
├── db/                   # Volcados (esquema / con datos) y migraciones SQL
│   └── migrations/
├── docs/                 # Especificaciones y planes de implementación
└── images/               # Logos e imágenes
```

## Puesta en marcha (local)

**Requisitos:** Node.js 18+, MySQL o MariaDB.

### 1. Base de datos
Creá la base, importá **uno** de los dos volcados y después aplicá **siempre** las migraciones (ningún volcado las incluye):

- `db/assistx_db_estructura.sql` — solo el esquema, sin datos.
- `db/assistx_db_condatos.sql` — esquema + datos de prueba (cursos, alumnos, asistencias, eventos y usuarios).

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS assistx_db;"
mysql -u root assistx_db < db/assistx_db_condatos.sql   # o db/assistx_db_estructura.sql
# Aplicar migraciones (en orden):
mysql -u root assistx_db < db/migrations/2026-06-03_add_registro_fields.sql
mysql -u root assistx_db < db/migrations/2026-06-15_notificaciones_justificativos.sql
```

### 2. Backend (`api/`)
```bash
cd api
cp .env.example .env      # completá DB_PASSWORD y un JWT_SECRET propio
npm install
npm run dev               # API en http://127.0.0.1:5000
```

### 3. Frontend (raíz)
```bash
npm install
npm run dev               # App en http://localhost:3000 (proxea /api al backend)
```

El frontend no requiere variables de entorno: el proxy de Vite redirige `/api` al backend en el puerto 5000.

## Scripts útiles

**Frontend (raíz):**
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — chequeo de tipos (`tsc --noEmit`)

**Backend (`api/`):**
- `npm run dev` — servidor con recarga
- `npm run build` — compila a `dist/`
- `npm test` — unit tests de la lógica de riesgo (vitest)
- `npm run seed` — **borra** cursos, alumnos, asistencias y usuarios y carga datos de ejemplo (usuarios con clave `password123`)

## Documentación

Las especificaciones de diseño y los planes de implementación de cada módulo están en [`docs/`](docs/superpowers).

## Seguridad

- Las contraseñas se almacenan con hash (bcrypt) y la autenticación usa JWT.
- Las credenciales y secretos van en `api/.env` (ignorado por git). **Nunca** commitees tu `.env`.
- Los archivos de justificativos se sirven mediante un endpoint autenticado, no como archivos estáticos públicos.
