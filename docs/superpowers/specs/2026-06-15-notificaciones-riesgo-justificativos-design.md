# Notificaciones de riesgo de asistencia + Justificativos — Diseño

**Fecha:** 2026-06-15
**Branch:** feat/registro-personal
**Estado:** Aprobado para planificación

## Objetivo

Dos features acopladas:

1. **Notificaciones de riesgo:** monitoreo en vivo del acumulado de inasistencias que dispara un pop-up al guardar asistencia y deja una notificación persistente en la campana, con acción de "Enviar Aviso" (registro de intervención hacia la familia).
2. **Justificativos:** panel para subir un certificado (PDF/imagen) asociado a una falta puntual; al subirlo, esa falta pasa a `Ausente Justificado` y deja de contar para el riesgo.

## Estado actual (versión más reciente del repo)

Existe un andamiaje a medio cablear que **no funciona punta a punta**:

- `src/components/layout/RiskNotificationModal.tsx` — modal solo visual. Botón **"Enviar Aviso" sin `onClick`** (muerto). "Ver Detalles" navega a `history`.
- `src/views/dashboard/Dashboard.tsx` — estado `isRiskModalOpen` (arranca `false` y **nunca pasa a `true`** → el modal no abre), `riskStudents` (fetch a `/api/admin/riesgo`), `activeRiskIndex` sin navegación.
- `api/src/controllers/adminController.ts` → `getAlumnosEnRiesgo` — cuenta **solo** `estado='Ausente'`, ventana móvil de **45 días**, umbral plano `>=4`. La ruta `/api/admin/riesgo` está registrada directamente en `app.ts:49` (no en `adminRoutes.ts`), así que **devuelve datos con el conteo defectuoso** — el problema no es la ruta.
- `src/components/layout/TopBar.tsx` — campana (`Bell`) con punto rojo **fijo**, sin contador ni dropdown.
- `src/views/secretario/StudentsDirectory.tsx` — filtro "En Riesgo" y métrica "Alertas de Riesgo: 0" hardcodeados.

El diseño **reaprovecha** todas estas piezas en lugar de crear nuevas.

## Decisiones (validadas con el usuario)

### Definición de riesgo (monitoreo en vivo del acumulado)

| Límite | Umbral | Efecto |
|---|---|---|
| Bimestral | 4ta falta | Pop-up + badge **amarillo** (Riesgo) |
| Bimestral | 5ta falta | Pop-up + badge **rojo** (Crítico) |
| Anual | falta nº 19 | Pop-up de **alerta de pérdida de regularidad** |

### Conteo de faltas (peso por estado)

```
Ausente = 1 · Tarde = ½ · Retiro = ½ · Ausente Justificado = 0 · Ausencia con Presencia = 0
```

La regla horaria (después de 10:30 / 16:10 queda Presente) es para decidir Tarde vs Presente al **tomar** asistencia; no afecta el conteo.

### Período bimestral

Configurable por el secretario mediante un ABM de períodos (tabla `periodos`). El sistema ubica `CURDATE()` en su período vigente y cuenta solo las faltas de ese rango.

### Disparo del pop-up

**Solo al guardar asistencia + campana persistente.** El Dashboard **no** abre el modal automáticamente al entrar; sus "Alertas Críticas" y la campana muestran las alertas, y el modal se abre solo al hacer clic.

### "Enviar Aviso" / avisar a la familia

**Log interno:** registra una intervención (alumno, usuario, motivo, fecha) y marca la notificación como `gestionada`. Sin contacto externo, email ni PDF en esta etapa.

### Justificativos

- Archivo real (PDF/imagen) recibido con **`multer`** (dependencia nueva, aprobada), guardado en `/uploads`; en la DB se guarda la ruta.
- **Carga directa que justifica en el acto:** preceptor o secretario sube el archivo asociado a una falta puntual y esa `asistencia` pasa a `Ausente Justificado` inmediatamente, sin paso de aprobación.

## Modelo de datos (4 tablas nuevas)

El enum de `asistencias.estado` ya incluye `Ausente Justificado`, así que no se modifica.

### `periodos` (bimestres — ABM del secretario)
```
id            INT PK AI
nombre        VARCHAR(50)      -- ej. "1er Bimestre"
anio_lectivo INT
fecha_inicio  DATE
fecha_fin     DATE
created_at    TIMESTAMP
```

### `notificaciones` (campana persistente + historial)
```
id              INT PK AI
id_alumno       INT FK -> alumnos(id) ON DELETE CASCADE
tipo            ENUM('Riesgo','Critico','RegularidadAnual')
faltas_snapshot DECIMAL(4,1)   -- acumulado al momento de generarse
id_periodo      INT NULL FK -> periodos(id)   -- NULL en RegularidadAnual
anio            INT NULL                       -- año lectivo (para dedup anual)
mensaje         VARCHAR(255)
estado          ENUM('nueva','gestionada') DEFAULT 'nueva'
leida           TINYINT(1) DEFAULT 0
created_at      TIMESTAMP
```
**Dedup:** cada umbral dispara una sola vez por período. Antes de insertar, el controlador verifica si ya existe una notificación para `(id_alumno, tipo, id_periodo/anio)`; si existe, no inserta. (Check-then-insert, robusto frente a la semántica de NULL en índices únicos de MySQL; índice único como backstop.)

### `intervenciones` (log de "Enviar Aviso")
```
id              INT PK AI
id_alumno       INT FK -> alumnos(id) ON DELETE CASCADE
id_notificacion INT NULL FK -> notificaciones(id)
id_usuario      INT FK -> usuarios(id)
motivo          TEXT
created_at      TIMESTAMP
```
Al crear una intervención, su notificación pasa a `estado='gestionada'`.

### `justificativos`
```
id               INT PK AI
id_asistencia    INT FK -> asistencias(id) ON DELETE CASCADE, UNIQUE
archivo_path     VARCHAR(255)   -- ruta interna en /uploads (nombre generado)
archivo_nombre   VARCHAR(255)   -- nombre original (display)
mime             VARCHAR(100)
motivo           VARCHAR(255) NULL
fecha_certificado DATE NULL
id_usuario       INT FK -> usuarios(id)
created_at       TIMESTAMP
```
Al insertar, la `asistencia` ligada pasa a `estado='Ausente Justificado'`.

## Cálculo de riesgo — `api/src/utils/riesgo.ts` (nuevo)

Función central de conteo reutilizada por todos los endpoints. Reemplaza la lógica del stub `getAlumnosEnRiesgo`.

- `peso(estado)`: Ausente=1, Tarde=0.5, Retiro=0.5, resto=0.
- **Bimestral:** suma de pesos del alumno dentro del `periodo` vigente. Nivel: `>=5` → Crítico, `>=4` → Riesgo, si no → Normal.
- **Anual:** suma de pesos del año lectivo. `>=19` → alerta de regularidad.
- Devuelve, por alumno, el acumulado bimestral, el nivel y el flag anual — para badges y para detección de cruce de umbral.

## Endpoints (patrón controller/route existente, sin ORM, queries parametrizadas)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| `GET` | `/api/notificaciones` | autenticado | Lista para la campana (no leídas primero) |
| `PATCH` | `/api/notificaciones/:id/leida` | autenticado | Marca leída |
| `POST` | `/api/intervenciones` | autenticado | Registra intervención + marca notif `gestionada` |
| `GET` | `/api/alumnos/riesgo` | autenticado | Badges en vivo por alumno (reescribe el stub) |
| `GET` | `/api/periodos` | autenticado | Lista períodos |
| `POST/PUT/DELETE` | `/api/periodos[/:id]` | secretario (`isAdmin`) | ABM de bimestres |
| `GET` | `/api/justificativos/faltas/:alumnoId` | autenticado | Faltas justificables (Ausente sin justificar) del alumno |
| `POST` | `/api/justificativos` | autenticado | `multipart/form-data`: sube archivo y justifica la falta |

**Disparo:** en `POST /api/asistencias` (controlador de asistencia), tras guardar se recalcula el riesgo de los alumnos afectados; los que **cruzan un umbral nuevo** generan `notificacion` (con dedup) y el endpoint **devuelve esas alertas nuevas** en la respuesta para el pop-up inmediato.

Nuevos archivos backend: `controllers/notificacionController.ts`, `controllers/intervencionController.ts`, `controllers/justificativoController.ts`, `controllers/periodoController.ts`, `routes/*` correspondientes, `utils/riesgo.ts`, config de `multer` + servido estático de `/uploads`, migración SQL en `db/migrations/`.

## Frontend (reusando el andamiaje)

- **`AttendanceBoard.handleSubmit`** — con las alertas devueltas por el POST, abre el `RiskNotificationModal` (hoy nunca abre).
- **`RiskNotificationModal`** — cablear "Enviar Aviso" → `POST /api/intervenciones`; navegación entre múltiples alertas usando el `activeRiskIndex` existente.
- **`TopBar`** — campana con contador real de no leídas + dropdown (lista, marcar leída, Enviar Aviso). Reemplaza el punto rojo fijo.
- **`Dashboard`** — "Alertas Críticas" pasa a listar notificaciones reales; el modal abre solo al hacer clic (no auto).
- **`StudentsDirectory`** — badge de riesgo real + métrica "Alertas de Riesgo" real desde `/api/alumnos/riesgo`.
- **Panel Justificativos** (vista nueva, secretario/preceptor) — buscar alumno → ver faltas justificables → subir archivo por falta.

## Seguridad

- **Subida de archivos:** validar `mimetype` (solo `application/pdf`, `image/jpeg`, `image/png`), límite de tamaño (ej. 5 MB), y **nombre de archivo generado** por el servidor (no usar el nombre del cliente → evita path traversal). `/uploads` fuera del árbol servido como código.
- Todas las queries parametrizadas (ya es el patrón del repo).
- Auth: `verifyToken` en todo; `isAdmin` en ABM de períodos.
- Validar inputs en los límites (ids numéricos, existencia de la falta antes de justificar).

## Fuera de alcance (por ahora)

- Envío real a la familia (email/WhatsApp) y datos de contacto del tutor.
- Aprobación/rechazo de justificativos (se eligió carga directa).
- Notificaciones por usuario individual (la campana es a nivel institución: `leida` global).
- Recálculo que "resuelva" notificaciones históricas si baja el acumulado (los badges se recalculan en vivo; las notificaciones quedan como historial).
