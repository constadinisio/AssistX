# Diseño — Sistema de Auto-Registro de Personal (Enfoque A)

- **Fecha:** 2026-06-03
- **Proyecto:** AssistX — Gestión de Asistencias Escolares
- **Tarea Kanban:** "Crear sistema de registro con formulario de información"
- **Estado:** Aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Permitir que un nuevo miembro del personal (Secretario/a, Preceptor/a, Profesor/a EF)
se **auto-registre** desde una pantalla pública enlazada en el Login, completando un
formulario de información. La cuenta nace en estado **Pendiente** y **no puede iniciar
sesión** hasta que un Secretario/a la **apruebe** (confirmando o ajustando el rol).

Hoy ya existe un alta administrativa básica en `UserManagement.tsx`
(`POST /api/admin/usuarios`); este módulo agrega el flujo **público + aprobación**,
no lo reemplaza.

## 2. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Tipo de registro | Auto-registro **público** con **aprobación** de Secretario/a |
| Campos del formulario | nombre, apellido, **DNI**, **nombre de usuario**, **email institucional**, contraseña, **rol solicitado** |
| Identificador de login | **Nombre de usuario** (el DNI queda informativo) |
| Rol | Lo **solicita el usuario**; el Secretario/a lo **confirma o ajusta** al aprobar |
| Gestión de pendientes | Sección **dentro de "Control de Usuario"** (UserManagement) |
| Rechazo | Marca la cuenta como **Rechazada** (no se borra; queda registro) |
| Validación | **Manual**, sin dependencias nuevas |
| Testing | **Verificación manual + `tsc`**; montar framework de tests = tarea aparte |
| Arquitectura de datos | **Enfoque A**: extender la tabla `usuarios` con estado (una sola fuente de verdad) |

## 3. Alcance de seguridad incluido

El registro público convive en el mismo `authController.ts` que hoy tiene un backdoor.
Abrir registro público con ese backdoor activo es peligroso, por lo que este módulo
**incluye** la siguiente limpieza (acordada con el usuario):

- **Eliminar el backdoor** `const isDevMasterKey = (password === 'admin123')`.
- **Eliminar el fallback** `process.env.JWT_SECRET || 'secret_key'` tanto en
  `authController.ts` como en `authMiddleware.ts`. Si falta `JWT_SECRET`, el servidor
  falla al arrancar (fail-fast).
- **Quitar** el `SELECT` de debug que lista todos los usuarios y los `console.log`
  que exponen DNI/usuarios (fuga de PII).

> Fuera de alcance (otras tareas): rehacer el seed con contraseñas reales, alinear
> `.env.example` con las variables reales, montar framework de tests.

## 4. Modelo de datos

Migración SQL nueva en `db/migrations/2026-06-03_add_registro_fields.sql`
(se ejecuta manualmente en phpMyAdmin; el proyecto no usa herramienta de migraciones):

```sql
ALTER TABLE usuarios
  ADD COLUMN dni    VARCHAR(15)  NULL AFTER apellido,
  ADD COLUMN email  VARCHAR(150) NULL AFTER usuario,
  ADD COLUMN estado ENUM('Pendiente','Activo','Rechazada') NOT NULL DEFAULT 'Pendiente' AFTER rol,
  ADD UNIQUE KEY uq_usuarios_dni   (dni),
  ADD UNIQUE KEY uq_usuarios_email (email);

-- Los 3 usuarios seed existentes quedan activos
UPDATE usuarios SET estado = 'Activo';
```

Notas:
- `dni` y `email` son `NULL`-ables: MySQL permite múltiples `NULL` bajo `UNIQUE`,
  por lo que los usuarios seed sin esos datos no rompen la restricción.
- El **rol solicitado** se guarda directamente en la columna `rol` existente (ya es
  `ENUM` con los 3 roles); no se requiere columna adicional.

## 5. Backend

### 5.1 `authController.ts`

- **`register(req, res)`** (nuevo, público):
  1. Validar body con helper `validateRegistro` (ver §7).
  2. `bcrypt.hash(password, 10)`.
  3. `INSERT INTO usuarios (nombre, apellido, dni, usuario, email, password, rol, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`.
  4. Manejar `ER_DUP_ENTRY` (usuario / DNI / email ya existentes) → 409 con mensaje claro.
  5. Éxito → 201 `{ message: 'Solicitud de registro enviada. Queda pendiente de aprobación.' }`.

- **`login` (modificado):**
  - Quitar el `SELECT usuario FROM usuarios` de debug y los `console.log` de PII.
  - Eliminar el backdoor `admin123`.
  - Tras validar contraseña, chequear `estado`:
    - `Pendiente` → 403 "Tu cuenta está pendiente de aprobación."
    - `Rechazada` → 403 "Tu solicitud de acceso fue rechazada."
    - `Activo` → continúa y emite el JWT.
  - `JWT_SECRET` sin fallback (ver §3).

### 5.2 `authMiddleware.ts`

- `verifyToken`: `JWT_SECRET` sin fallback `'secret_key'`.
- `isAdmin`: sin cambios (ya valida `rol === 'Secretario/a'`).

### 5.3 `adminController.ts` (todo bajo `verifyToken + isAdmin`)

- **`listarPendientes`** (nuevo): `SELECT id, nombre, apellido, dni, usuario, email, rol, created_at
  FROM usuarios WHERE estado = 'Pendiente' ORDER BY created_at ASC`.
- **`aprobarUsuario(:id)`** (nuevo): body opcional `{ rol }`. `UPDATE usuarios
  SET estado='Activo', rol = COALESCE(?, rol) WHERE id = ? AND estado='Pendiente'`.
  Valida que `rol` (si viene) esté en la whitelist.
- **`rechazarUsuario(:id)`** (nuevo): `UPDATE usuarios SET estado='Rechazada'
  WHERE id = ? AND estado='Pendiente'`.
- **`listarUsuarios` (modificado):** filtra a `WHERE estado = 'Activo'` para que la tabla
  principal de "Control de Usuario" muestre solo cuentas activas.

### 5.4 Rutas

- `authRoutes.ts`: `router.post('/register', register)` (pública).
- `adminRoutes.ts`:
  - `router.get('/usuarios/pendientes', verifyToken, isAdmin, listarPendientes)`
  - `router.patch('/usuarios/:id/aprobar', verifyToken, isAdmin, aprobarUsuario)`
  - `router.patch('/usuarios/:id/rechazar', verifyToken, isAdmin, rechazarUsuario)`

## 6. Frontend

- **`RegisterScreen.tsx`** (nuevo, `src/views/auth/`): formulario con nombre, apellido,
  DNI, usuario, email, contraseña y `<select>` de rol. Al enviar → `POST /api/auth/register`.
  En éxito muestra pantalla de confirmación ("Solicitud enviada, pendiente de aprobación")
  con botón para volver al Login. Reutiliza el estilo de los formularios/modales existentes.
- **`App.tsx`** (modificado): sub-estado `authView: 'login' | 'register'` mientras
  `!userRole`, para alternar entre Login y Registro sin router.
- **`LoginScreen.tsx`** (modificado): renombrar etiqueta y placeholder "DNI" → "Usuario";
  agregar link "Crear cuenta" que setea `authView='register'`. Ya muestra `data.message`,
  así que los 403 de pendiente/rechazada se renderizan sin cambios extra.
- **`UserManagement.tsx`** (modificado): nueva sección **"Solicitudes pendientes"** encima
  de la tabla. Hace `GET /api/admin/usuarios/pendientes`; cada fila muestra los datos +
  `<select>` de rol (pre-cargado con el rol solicitado) + botones **Aprobar** / **Rechazar**
  (`PATCH .../aprobar` con `{ rol }` / `PATCH .../rechazar`). Refresca lista y pendientes
  tras cada acción.

## 7. Validación y manejo de errores

- **Backend** — helper `validateRegistro(body)` (archivo chico, p. ej.
  `api/src/utils/validateRegistro.ts`):
  - Campos requeridos: nombre, apellido, dni, usuario, email, password, rol.
  - `email`: formato válido (regex simple).
  - `password`: mínimo 8 caracteres.
  - `rol`: dentro de `['Secretario/a','Preceptor/a','Profesor/a EF']`.
  - Devuelve lista de errores; el controller responde 400 con el primer mensaje claro.
- **Frontend:** `required` en inputs, validación de formato básica, submit deshabilitado
  mientras carga, mensajes de error visibles (mismo patrón que LoginScreen/UserManagement).
- Todas las queries permanecen **parametrizadas** (prevención de inyección SQL).

## 8. Archivos afectados

**Nuevos:**
- `db/migrations/2026-06-03_add_registro_fields.sql`
- `src/views/auth/RegisterScreen.tsx`
- `api/src/utils/validateRegistro.ts`

**Modificados:**
- `api/src/controllers/authController.ts`
- `api/src/middlewares/authMiddleware.ts`
- `api/src/controllers/adminController.ts`
- `api/src/routes/authRoutes.ts`
- `api/src/routes/adminRoutes.ts`
- `src/App.tsx`
- `src/views/auth/LoginScreen.tsx`
- `src/views/secretario/UserManagement.tsx`

## 9. Plan de verificación (manual)

1. Ejecutar la migración en phpMyAdmin; confirmar columnas y que los seed quedan `Activo`.
2. `tsc --noEmit` en frontend y `tsc` en `api/` sin errores.
3. Registro: completar el form → 201 → la solicitud aparece en "Solicitudes pendientes".
4. Login con cuenta pendiente → 403 "pendiente de aprobación".
5. Aprobar (confirmando/ajustando rol) → la cuenta pasa a la tabla de activos →
   login exitoso con el rol asignado.
6. Rechazar otra solicitud → login → 403 "rechazada"; la cuenta no aparece en activos.
7. Duplicados: registrar con usuario/DNI/email existente → 409 con mensaje claro.
8. Confirmar que el backdoor `admin123` ya **no** permite ingresar.

## 10. Fuera de alcance / follow-ups

- Rehacer seed de usuarios con contraseñas reales hasheadas.
- Alinear `.env.example` con variables reales (`DB_*`, `PORT`, `JWT_SECRET`).
- Montar framework de tests (Vitest + supertest) — tarea propia del Kanban.
- Sistema de Notificaciones (tarea siguiente del Kanban; el email recolectado acá lo habilita).
