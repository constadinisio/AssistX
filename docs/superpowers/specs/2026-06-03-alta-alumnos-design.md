# Diseño — Alta de Alumnos

- **Fecha:** 2026-06-03
- **Proyecto:** AssistX — Gestión de Asistencias Escolares
- **Tarea Kanban:** "Registrar nuevos alumnos"
- **Estado:** Aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Conectar el botón **"Añadir Alumno"** del Directorio de Alumnos (hoy sin función) con un
formulario para dar de alta alumnos (nombre, apellido, DNI, curso). El backend ya tiene el
endpoint; el trabajo es endurecerlo levemente y construir la UI.

## 2. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Alcance | **Solo crear** (editar/eliminar quedan como follow-up) |
| Curso | **Obligatorio** en el formulario |
| Acceso | Solo **Secretario/a** (la vista ya es de Secretario/a) |
| Esquema de DB | **Sin cambios** (tabla `alumnos` ya tiene nombre, apellido, dni, id_curso) |
| Reorganización | **No** se mueve a un controlador aparte; se mantiene en `adminController` (cambio mínimo) |

## 3. Modelo de datos

Sin migración. Tabla `alumnos`: `id, nombre, apellido, dni (UNIQUE), id_curso (FK→cursos), created_at`.

## 4. Backend — `adminController.crearAlumno` (ya existe)

Ruta existente: `POST /api/admin/alumnos` (`verifyToken, isAdmin`). Se endurece el handler:
- **Validación:** `nombre`, `apellido`, `dni`, `id_curso` requeridos → 400 con mensaje si falta alguno.
- **DNI duplicado:** capturar `ER_DUP_ENTRY` → **409** `{ message: 'Ya existe un alumno con ese DNI.' }`
  (hoy devuelve un 500 genérico).
- Éxito → 201 (sin cambios).
- Query parametrizada (ya lo está).

`listarTodosLosAlumnos` (consumida por el directorio vía `GET /api/admin/alumnos`) no cambia.

## 5. Frontend — `StudentsDirectory.tsx`

- Estado nuevo: `showModal`, `formData { nombre, apellido, dni, id_curso }`, `courses`, `error`.
- En el `useEffect` inicial (o uno nuevo), cargar cursos con `GET /api/cursos` (forma
  `{ id, code, name, room }`) para poblar el `<select>`.
- Conectar el botón **"Añadir Alumno"** → `onClick` abre el modal.
- Modal (estilo `UserManagement`/`CourseManagement`): inputs nombre, apellido, DNI y
  `<select>` de curso (**required**, opciones = cursos, value = `id`, label = `code`).
- Submit → `POST /api/admin/alumnos` con `{ nombre, apellido, dni, id_curso }`:
  - OK → cerrar modal, limpiar form, refrescar el directorio (re-fetch de alumnos).
  - Error → mostrar `data.message` (ej. DNI duplicado) en el modal.

## 6. Validación y manejo de errores

- **Backend:** requeridos + 409 en DNI duplicado (ver §4).
- **Frontend:** `required` en los 4 campos (incl. curso), submit deshabilitado mientras carga,
  error visible en el modal.

## 7. Archivos afectados

**Modificados:**
- `api/src/controllers/adminController.ts` (endurecer `crearAlumno`)
- `src/views/secretario/StudentsDirectory.tsx` (modal + carga de cursos + wire del botón)

## 8. Plan de verificación (manual)

1. `tsc --noEmit` en `api/` y raíz sin errores nuevos.
2. Como Secretario/a, en Directorio de Alumnos: "Añadir Alumno" abre el modal.
3. Crear un alumno (nombre, apellido, DNI nuevo, curso) → aparece en el directorio con su curso.
4. Intentar crear con un DNI existente → error 409 visible, sin romper.
5. Intentar enviar sin curso → bloqueado por `required`.

## 9. Fuera de alcance / follow-ups

- Editar / eliminar alumnos.
- Botones "ver" e "historial" por fila (hoy sin función).
