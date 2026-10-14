# Notificaciones por usuario (bandeja individual) — Diseño

**Fecha:** 2026-10-14
**Branch:** main
**Estado:** Aprobado para planificación
**Antecedente:** [2026-06-15-notificaciones-riesgo-justificativos-design.md](./2026-06-15-notificaciones-riesgo-justificativos-design.md)

## Contexto y objetivo

El sistema de notificaciones de riesgo (junio 2026) funciona punta a punta, pero la campana es **a nivel institución**: `notificaciones.leida` es global, así que si una persona marca una alerta como leída queda leída para todos, y todos los roles ven todo.

Este es el **subproyecto 1 de 3** de la evolución del sistema de notificaciones:

1. **Bandeja por usuario + modelo genérico de notificación** ← este documento
2. Tipos de eventos nuevos (registros pendientes, justificativos, calendario, avisos de Dirección, …) sobre el modelo genérico.
3. Comunicado imprimible para la familia (cuaderno de comunicados) desde "Enviar Aviso".

**Restricción del proyecto:** todo es **interno**. No hay dominio para configurar mail ni número para WhatsApp, así que no hay envío externo. La llegada a las familias se resuelve en papel (subproyecto 3); **no** habrá cuentas de familias.

### Criterios de éxito

- Cada usuario ve en la campana solo las notificaciones dirigidas a su rol.
- El estado leído/no leído es **individual**: que un usuario lea una alerta no la marca para otro del mismo rol.
- El estado "gestionada" es **global** y muestra quién y cuándo la gestionó; no se puede gestionar dos veces.
- El modelo admite tipos de notificación nuevos sin otra migración de esquema.
- Las notificaciones existentes se migran sin que reaparezcan como nuevas.

## Decisiones (validadas con el usuario)

| Tema | Decisión |
|---|---|
| Destinatarios de las alertas de riesgo | **Por rol:** Preceptor/a, Secretario/a y Directivo/a. Profesor/a EF no las recibe. No hay filtro por curso (no existe asignación preceptor↔curso). |
| Estado "gestionada" | **Global:** la intervención de una persona marca la alerta como gestionada para todos, registrando quién y cuándo. |
| Estado "leída" | **Por usuario.** |
| Familias | Solo papel (subproyecto 3). Sin portal ni cuentas de familia. |
| Modelo de almacenamiento | **Evento + `roles_destino` + tabla de lecturas** (sin fan-out de una fila por destinatario). |

### Alternativa descartada: fan-out por destinatario

Insertar una fila por usuario destinatario al crear la notificación. Se descartó porque multiplica los inserts por alerta, los usuarios creados después no ven las alertas vigentes y un cambio de rol deja filas desactualizadas. Si en el subproyecto 2 un evento necesita apuntar a una persona puntual, se agrega una columna `id_usuario_destino` nullable al modelo elegido.

## Modelo de datos

### Cambios a `notificaciones`

| Columna | Cambio | Detalle |
|---|---|---|
| `roles_destino` | **nueva** | `VARCHAR(255) NOT NULL`, roles separados por coma, ej. `'Preceptor/a,Secretario/a,Directivo/a'`. |
| `tipo` | `ENUM` → `VARCHAR(40) NOT NULL` | Los valores válidos se validan en la API contra `TIPOS_NOTIFICACION`. |
| `id_alumno` | pasa a `NULL` | Para eventos sin alumno (subproyecto 2). La FK `ON DELETE CASCADE` se mantiene. |
| `gestionada_por` | **nueva** | `INT NULL`, FK → `usuarios(id) ON DELETE SET NULL`. |
| `gestionada_at` | **nueva** | `TIMESTAMP NULL`. |
| `estado` | sin cambios | `ENUM('nueva','gestionada')`. |
| `leida` | **se elimina** | Reemplazada por `notificacion_lecturas`. |

### Tabla nueva `notificacion_lecturas`

```
id_notificacion  INT NOT NULL  FK -> notificaciones(id) ON DELETE CASCADE
id_usuario       INT NOT NULL  FK -> usuarios(id)       ON DELETE CASCADE
leida_at         TIMESTAMP NOT NULL DEFAULT current_timestamp()
PRIMARY KEY (id_notificacion, id_usuario)
```

La PK compuesta hace que marcar como leída sea idempotente (`INSERT IGNORE`).

### Migración — `db/migrations/2026-10-14_notificaciones_por_usuario.sql`

En este orden:

1. Crear `notificacion_lecturas`.
2. Agregar `roles_destino`, `gestionada_por`, `gestionada_at`; cambiar `tipo` a `VARCHAR(40)` y `id_alumno` a `NULL`.
3. Backfill de destinatarios: `roles_destino = 'Preceptor/a,Secretario/a,Directivo/a'` para todas las notificaciones existentes (hoy son todas de riesgo).
4. Backfill de lecturas: por cada notificación con `leida = 1`, insertar una lectura para cada usuario `Activo` de esos roles.
5. Backfill de gestión: para las notificaciones `estado = 'gestionada'`, tomar `gestionada_por` / `gestionada_at` de la última intervención asociada (`intervenciones.id_notificacion`).
6. Eliminar la columna `leida`.

Sin cambios: `intervenciones`, `periodos`, `justificativos`, cálculo de riesgo y dedup.

## API

Mismos endpoints, todos con `verifyToken`. El rol y el id del usuario salen de `req.user` (JWT: `{ id, rol }`). **La forma de la respuesta de `GET` se mantiene** (`leida` sigue siendo `0`/`1`, ahora calculado por usuario) para minimizar cambios en el frontend.

| Método | Ruta | Comportamiento |
|---|---|---|
| `GET` | `/api/notificaciones` | Solo las dirigidas al rol del usuario (`FIND_IN_SET(?, roles_destino)`). `leida` = existe fila en `notificacion_lecturas` para (notificación, usuario) vía `LEFT JOIN`. Agrega `gestionada_por_nombre` y `gestionada_at`. `id_alumno`/`nombre`/`apellido` pueden ser `null` (`LEFT JOIN alumnos`). Orden: no leídas primero, luego `created_at DESC`. |
| `PATCH` | `/api/notificaciones/:id/leida` | Valida `:id` entero positivo (400). Si la notificación no existe o no está dirigida al rol del usuario → **404** (no revela su existencia). `INSERT IGNORE` en lecturas. |
| `PATCH` | `/api/notificaciones/leidas` | **Nuevo.** Marca como leídas todas las dirigidas al rol del usuario. Se registra **antes** de `/:id/leida` en el router. |
| `POST` | `/api/intervenciones` | En la misma transacción: inserta la intervención y, si trae `id_notificacion`, la marca `gestionada` con `gestionada_por = req.user.id` y `gestionada_at = NOW()`. Si la notificación no existe o no es para su rol → **404**. Si ya estaba gestionada → **409** con `{ gestionada_por_nombre, gestionada_at }`. Lectura con `SELECT … FOR UPDATE` para evitar la carrera entre dos usuarios. |

### Organización del código

- **`api/src/utils/notificaciones.ts` (nuevo):**
  - `TIPOS_NOTIFICACION` (constante; hoy `Riesgo`, `Critico`, `RegularidadAnual`).
  - `esTipoValido(tipo)`, `parsearRolesDestino(csv)`, `esDestinatario(rol, rolesDestino)` — funciones puras.
  - `crearNotificacion({ tipo, mensaje, roles_destino, id_alumno?, faltas_snapshot?, id_periodo?, anio? })` — único punto de inserción; valida tipo y roles contra `ROLES_VALIDOS` (de `utils/validateRegistro.ts`).
- **`api/src/utils/roles.ts`:** agrega `ROLES_RIESGO: readonly RolValido[] = ['Preceptor/a', 'Secretario/a', 'Directivo/a']`, con el mismo patrón que `ROLES_GESTION`.
- **`notificacionController.ts`:** `generarNotificacionesRiesgo` usa `crearNotificacion` con `ROLES_RIESGO`; dedup y respuesta para el pop-up sin cambios. `listarNotificaciones`, `marcarLeida` y el nuevo `marcarTodasLeidas` aplican el filtro por rol/usuario.
- **`intervencionController.ts`:** validación de destinatario, 409 y `gestionada_por`/`gestionada_at`.

### Manejo de errores

- try/catch en cada handler; detalle con `console.error` en el servidor (patrón actual del repo), mensajes en español sin datos internos al cliente.
- Formato de error uniforme: `{ message }`.
- Códigos: **400** input inválido · **404** inexistente o no dirigida a su rol · **409** ya gestionada · **500** error inesperado.
- Todas las queries parametrizadas.

## Frontend

- **`src/services/notificaciones.ts` (nuevo):** `listar()`, `marcarLeida(id)`, `marcarTodas()`, `enviarAviso({ id_alumno, id_notificacion, motivo })`. `enviarAviso` distingue el 409 y devuelve `{ yaGestionada: true, gestionada_por_nombre, gestionada_at }`. Reemplaza los `fetch` duplicados en `TopBar`, `Dashboard` y `AttendanceBoard`.
- **`TopBar.tsx`:** contador de no leídas por usuario (sin cambio de cálculo); botón **"Marcar todas como leídas"**; las gestionadas muestran *"Gestionada por {nombre} · {dd/mm hh:mm}"* en lugar de "Enviar Aviso"; ante 409 actualiza el ítem con quién la gestionó. Tipo `Notificacion` con `id_alumno`, `nombre`, `apellido` nullables y `gestionada_por_nombre`/`gestionada_at`.
- **`Dashboard.tsx` y `AttendanceBoard.tsx`:** usan el servicio y manejan el 409 igual que la campana.
- Profesor/a EF ve la campana vacía ("No hay notificaciones.").

## Testing

- **Unitarios (Vitest, TDD)** — `api/src/utils/notificaciones.test.ts`: `esTipoValido`, `parsearRolesDestino` (espacios, vacíos, roles inválidos), `esDestinatario`, y que `ROLES_RIESGO` excluya a Profesor/a EF.
- **Integración (Vitest + `supertest`, devDependency nueva)** contra la base **`assistx_test`** en el contenedor `assistx-mariadb`, recreada con dump + migraciones antes de la corrida. Requiere separar la app del arranque: `app.ts` exporta `app` sin llamar a `listen`, y un `server.ts` nuevo hace el `listen` (se actualizan los scripts `dev` y `start` de `api/package.json` para apuntar a `server.ts` / `dist/server.js`).
  - Cada rol ve solo sus notificaciones; Profesor/a EF ve ninguna.
  - Leído independiente entre dos usuarios del mismo rol.
  - `PATCH /:id/leida` sobre una notificación de otro rol → 404; id inválido → 400; doble marcado idempotente.
  - `PATCH /leidas` marca solo las del usuario.
  - Intervención doble → 409 con quién la gestionó.
  - La migración preserva leídos (para usuarios activos de los roles) y gestionadas.
- **E2E:** fuera de alcance (no hay infraestructura de Playwright). Verificación manual en navegador: guardar asistencia que cruce umbral → pop-up y campana; dos usuarios del mismo rol con leído independiente; "Enviar Aviso" → gestionada para ambos; segundo aviso → mensaje de ya gestionada.

## Fuera de alcance

- Tipos de eventos nuevos (subproyecto 2).
- Comunicado imprimible (subproyecto 3).
- Asignación preceptor↔curso y filtrado por curso.
- Portal/cuentas de familias y cualquier envío externo (mail, WhatsApp, SMS).
- Tiempo real (WebSocket/SSE): la campana se refresca al cargar/abrir, como hoy.
