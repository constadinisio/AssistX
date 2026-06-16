# Diseño — Panel de Gestión de Cursos (Enfoque A)

- **Fecha:** 2026-06-03
- **Proyecto:** AssistX — Gestión de Asistencias Escolares
- **Tarea Kanban:** "Panel para crear cursos / gestionar cursos"
- **Estado:** Aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Dar al Secretario/a un panel para **gestionar cursos** (crear, editar, listar y, de forma
acotada, eliminar) con año, división y aula. No incluye asignación de preceptor: **todos los
preceptores acceden a todos los cursos** (decisión del usuario, para cubrir ausencias con
facilidad), que además es el comportamiento actual del panel de asistencia.

## 2. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Asignación de preceptor | **No.** Todos los preceptores ven todos los cursos (ya es así hoy) |
| Operaciones | Listar, crear, editar; eliminar **solo si el curso está vacío** |
| Campos del curso | `anio`, `division`, `aula` (aula opcional) |
| Borrado | Bloqueado (409) si el curso tiene alumnos o asistencias; "generalmente no se borran" |
| Acceso | Solo **Secretario/a** |
| Arquitectura | **Enfoque A:** controlador dedicado `cursoController.ts` (sacar cursos del cajón de sastre `adminController`) |
| Validación | Manual, sin dependencias |
| Esquema de DB | **Sin cambios** (la tabla `cursos` ya tiene anio, division, aula) |

## 3. Modelo de datos

Sin migración. Tabla `cursos` existente: `id, anio, division, aula, created_at`.

El borrado seguro se apoya en:
- FK `asistencias_ibfk_2 (id_curso → cursos.id)` sin `ON DELETE` → **bloquea** el borrado si hay asistencias.
- FK `alumnos_ibfk_1 (id_curso → cursos.id) ON DELETE SET NULL`.
- Chequeo explícito de conteo en `eliminarCurso` (alumnos y asistencias) **antes** de intentar el DELETE,
  para devolver un 409 con mensaje claro en lugar de un error SQL crudo.

## 4. Backend — `cursoController.ts` (nuevo) + `cursoRoutes.ts`

Se crea `api/src/controllers/cursoController.ts` y se **mueven** ahí las funciones de cursos que
hoy viven en `adminController.ts`.

### 4.1 Funciones

- **`listarCursos`** *(movida desde adminController, sin cambios de forma)*
  ```sql
  SELECT id, CONCAT(anio, ' ', division) AS code, anio AS name, aula AS room FROM cursos
  ```
  Consumida por el panel de asistencia (`AttendanceBoard`) y dropdowns. **No cambia su shape.**

- **`listarCursosAdmin`** *(nueva)* — para la tabla del panel:
  ```sql
  SELECT c.id, c.anio, c.division, c.aula, COUNT(a.id) AS cantidad_alumnos
  FROM cursos c
  LEFT JOIN alumnos a ON a.id_curso = c.id
  GROUP BY c.id, c.anio, c.division, c.aula
  ORDER BY c.anio, c.division
  ```

- **`crearCurso`** *(movida + arreglada)* — ahora incluye `aula`:
  ```sql
  INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)
  ```
  Valida `anio` y `division` requeridos (400 si faltan).

- **`editarCurso`** *(nueva)*:
  ```sql
  UPDATE cursos SET anio = ?, division = ?, aula = ? WHERE id = ?
  ```
  Valida requeridos; 404 si `affectedRows === 0`.

- **`eliminarCurso`** *(nueva)*:
  1. `SELECT COUNT(*) FROM alumnos WHERE id_curso = ?`
  2. `SELECT COUNT(*) FROM asistencias WHERE id_curso = ?`
  3. Si alguno > 0 → **409** `{ message: 'No se puede eliminar: el curso tiene alumnos o asistencias asociadas.' }`
  4. Si ambos 0 → `DELETE FROM cursos WHERE id = ?`.

### 4.2 Rutas (`cursoRoutes.ts`, montado en `/api/cursos`)

| Método | Ruta | Middleware | Handler |
|--------|------|-----------|---------|
| GET | `/api/cursos` | `verifyToken` | `listarCursos` |
| GET | `/api/cursos/admin` | `verifyToken, isAdmin` | `listarCursosAdmin` |
| POST | `/api/cursos` | `verifyToken, isAdmin` | `crearCurso` |
| PUT | `/api/cursos/:id` | `verifyToken, isAdmin` | `editarCurso` |
| DELETE | `/api/cursos/:id` | `verifyToken, isAdmin` | `eliminarCurso` |

> **Orden de rutas:** declarar `/admin` antes de cualquier `/:id` para que no sea capturada como parámetro.

### 4.3 Limpieza en adminController / adminRoutes

- `adminController.ts`: se **eliminan** `crearCurso` y `listarCursos` (movidas a `cursoController`).
- `adminRoutes.ts`: se **quitan** el import de esas funciones y las rutas `GET /cursos` y `POST /cursos`
  (quedaban duplicadas; el frontend no usa `/api/admin/cursos`).

## 5. Frontend

- **`CourseManagement.tsx`** *(nuevo, `src/views/secretario/`)* — sigue el patrón de `UserManagement`:
  - Tabla de cursos vía `GET /api/cursos/admin` (muestra año, división, aula, cantidad de alumnos).
  - Botón **"Crear Curso"** → modal con inputs año, división, aula → `POST /api/cursos` → refresca.
  - **Editar** por fila → modal pre-cargado → `PUT /api/cursos/:id` → refresca.
  - **Eliminar** por fila → confirmación; `DELETE /api/cursos/:id`; si responde 409, muestra el mensaje
    del backend (curso con datos) sin romper la UI.
  - Tarjetas de stats simples (total de cursos, total de alumnos).
- **`Sidebar.tsx`** — nuevo ítem `{ id: 'courses', label: 'Gestión de Cursos', icon: GraduationCap, roles: ['Secretario/a'] }`.
- **`App.tsx`** — render `activeTab === 'courses' && userRole === 'Secretario/a'` → `<CourseManagement />`.

## 6. Validación y manejo de errores

- **Backend (manual, sin deps):** `anio` y `division` requeridos (trim, no vacíos) en crear/editar;
  `aula` opcional. Queries parametrizadas. `eliminarCurso` devuelve 409 ante dependencias; editar/eliminar
  devuelven 404 si el `id` no existe.
- **Frontend:** `required` en el modal, submit deshabilitado mientras carga, errores visibles,
  confirmación antes de borrar.

## 7. Archivos afectados

**Nuevos:**
- `api/src/controllers/cursoController.ts`
- `src/views/secretario/CourseManagement.tsx`

**Modificados:**
- `api/src/routes/cursoRoutes.ts`
- `api/src/controllers/adminController.ts` (se sacan cursos)
- `api/src/routes/adminRoutes.ts` (se sacan rutas de cursos)
- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`

## 8. Plan de verificación (manual)

1. `tsc --noEmit` en `api/` y en la raíz sin errores nuevos.
2. Como Secretario/a: aparece "Gestión de Cursos" en el Sidebar.
3. Crear un curso (año/división/aula) → aparece en la tabla con 0 alumnos.
4. Editar ese curso → cambios reflejados.
5. Verificar que el panel de asistencia (`AttendanceBoard`) sigue listando cursos igual que antes
   (la forma de `listarCursos` no cambió).
6. Eliminar el curso recién creado (vacío) → se borra.
7. Intentar eliminar un curso con alumnos/asistencias (ej. curso 1) → **409** con mensaje, sin romper.

## 9. Fuera de alcance / follow-ups

- Asignación de preceptor a curso (descartada por decisión de acceso abierto).
- Borrado lógico/archivado de cursos (no requerido; "generalmente no se borran").
- Selector de fecha en el panel de asistencia (follow-up previo).
