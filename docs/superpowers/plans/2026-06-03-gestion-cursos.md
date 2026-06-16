# Plan de Implementación — Panel de Gestión de Cursos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al Secretario/a un panel para crear, editar, listar y (de forma acotada) eliminar cursos, con la lógica de cursos extraída a su propio módulo backend.

**Architecture:** Enfoque A — se crea `cursoController.ts` (moviendo `listarCursos`/`crearCurso` desde `adminController`) y se expande `cursoRoutes.ts` con CRUD bajo `/api/cursos`. Frontend: nueva vista `CourseManagement` + ítem de Sidebar + ruta en `App.tsx`. Sin migración de DB (la tabla `cursos` ya tiene anio/division/aula).

**Tech Stack:** Node + Express 5 + TypeScript + mysql2 (sin ORM, queries parametrizadas); React 19 + Vite + Tailwind; validación manual; verificación manual + `tsc`.

**Spec de referencia:** `docs/superpowers/specs/2026-06-03-gestion-cursos-design.md`

> **Nota de ejecución:** trabajamos en la rama `feat/registro-personal`, **sin commitear** (el usuario commitea él mismo). Saltear los pasos de commit; dejar todo en el working tree.

## Estructura de archivos

**Nuevos:**
- `api/src/controllers/cursoController.ts` — toda la lógica de cursos (list, list-admin, crear, editar, eliminar).
- `src/views/secretario/CourseManagement.tsx` — panel ABM de cursos.

**Modificados:**
- `api/src/routes/cursoRoutes.ts` — rutas CRUD de cursos.
- `api/src/controllers/adminController.ts` — se quitan `crearCurso` y `listarCursos`.
- `api/src/routes/adminRoutes.ts` — se quitan import y rutas de cursos.
- `src/components/layout/Sidebar.tsx` — ítem "Gestión de Cursos".
- `src/App.tsx` — render del tab `courses`.

---

## Task 1: Crear `cursoController.ts`

**Files:**
- Create: `api/src/controllers/cursoController.ts`

- [ ] **Step 1: Escribir el controlador completo**

```typescript
import { Request, Response } from 'express';
import pool from '../config/db';

// Listado "shape" para dropdowns y panel de asistencia (NO cambiar su forma)
export const listarCursos = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, CONCAT(anio, ' ', division) as code, anio as name, aula as room FROM cursos"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en listarCursos:", error);
        res.status(500).json({ message: 'Error al obtener cursos' });
    }
};

// Listado para el panel de gestión: campos crudos + cantidad de alumnos
export const listarCursosAdmin = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.id, c.anio, c.division, c.aula, COUNT(a.id) AS cantidad_alumnos
             FROM cursos c
             LEFT JOIN alumnos a ON a.id_curso = c.id
             GROUP BY c.id, c.anio, c.division, c.aula
             ORDER BY c.anio, c.division`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en listarCursosAdmin:", error);
        res.status(500).json({ message: 'Error al obtener la lista de cursos' });
    }
};

export const crearCurso = async (req: Request, res: Response) => {
    const { anio, division, aula } = req.body;
    if (!anio || !division || String(anio).trim() === '' || String(division).trim() === '') {
        return res.status(400).json({ message: 'El año y la división son obligatorios.' });
    }
    try {
        await pool.query(
            'INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)',
            [String(anio).trim(), String(division).trim(), aula ? String(aula).trim() : null]
        );
        res.status(201).json({ message: 'Curso creado con éxito' });
    } catch (error) {
        console.error("Error en crearCurso:", error);
        res.status(500).json({ message: 'Error al crear curso' });
    }
};

export const editarCurso = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { anio, division, aula } = req.body;
    if (!anio || !division || String(anio).trim() === '' || String(division).trim() === '') {
        return res.status(400).json({ message: 'El año y la división son obligatorios.' });
    }
    try {
        const [result]: any = await pool.query(
            'UPDATE cursos SET anio = ?, division = ?, aula = ? WHERE id = ?',
            [String(anio).trim(), String(division).trim(), aula ? String(aula).trim() : null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        res.json({ message: 'Curso actualizado.' });
    } catch (error) {
        console.error("Error en editarCurso:", error);
        res.status(500).json({ message: 'Error al actualizar curso' });
    }
};

export const eliminarCurso = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [alumnos]: any = await pool.query('SELECT COUNT(*) AS total FROM alumnos WHERE id_curso = ?', [id]);
        const [asistencias]: any = await pool.query('SELECT COUNT(*) AS total FROM asistencias WHERE id_curso = ?', [id]);

        if (alumnos[0].total > 0 || asistencias[0].total > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar: el curso tiene alumnos o asistencias asociadas.'
            });
        }

        const [result]: any = await pool.query('DELETE FROM cursos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        res.json({ message: 'Curso eliminado.' });
    } catch (error) {
        console.error("Error en eliminarCurso:", error);
        res.status(500).json({ message: 'Error al eliminar curso' });
    }
};
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores nuevos en `cursoController.ts` (puede persistir el error preexistente de `StudentHistory.tsx`, ajeno a esta tarea).

---

## Task 2: Rutas de cursos (`cursoRoutes.ts`)

**Files:**
- Modify: `api/src/routes/cursoRoutes.ts` (reescritura completa)

- [ ] **Step 1: Reescribir el archivo**

```typescript
import { Router } from 'express';
import {
    listarCursos,
    listarCursosAdmin,
    crearCurso,
    editarCurso,
    eliminarCurso
} from '../controllers/cursoController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// /admin debe ir antes que /:id para no ser capturada como parámetro
router.get('/admin', verifyToken, isAdmin, listarCursosAdmin);
router.get('/', verifyToken, listarCursos);
router.post('/', verifyToken, isAdmin, crearCurso);
router.put('/:id', verifyToken, isAdmin, editarCurso);
router.delete('/:id', verifyToken, isAdmin, eliminarCurso);

export default router;
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores nuevos.

---

## Task 3: Limpiar cursos de `adminController` y `adminRoutes`

**Files:**
- Modify: `api/src/controllers/adminController.ts`
- Modify: `api/src/routes/adminRoutes.ts`

- [ ] **Step 1: Confirmar que el frontend no usa `/api/admin/cursos`**

Run (búsqueda): grep de `api/admin/cursos` en `src/`.
Expected: sin coincidencias (el panel de asistencia usa `/api/cursos`). Si hubiera alguna, detenerse y reportar antes de seguir.

- [ ] **Step 2: Quitar `crearCurso` y `listarCursos` de `adminController.ts`**

Eliminar del archivo las dos funciones (el bloque `// --- GESTIÓN DE CURSOS ---` con `crearCurso` y `listarCursos`). Dejar intactas el resto (usuarios, alumnos, eventos, pendientes). No debe quedar ninguna referencia a `crearCurso`/`listarCursos` en `adminController.ts`.

- [ ] **Step 3: Quitar import y rutas de cursos en `adminRoutes.ts`**

En el import desde `../controllers/adminController`, eliminar `crearCurso` y `listarCursos` de la lista.
Eliminar las dos líneas de rutas:
```typescript
router.get('/cursos', verifyToken, listarCursos);
router.post('/cursos', verifyToken, isAdmin, crearCurso);
```
(y el comentario `// Gestión de Cursos` asociado).

- [ ] **Step 4: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores nuevos. Si aparece "Cannot find name 'listarCursos'/'crearCurso'", quedó una referencia colgada que hay que eliminar.

- [ ] **Step 5: Verificar runtime (flujo backend de cursos)**

Con el backend corriendo (puerto 5000) y un token de Secretario/a:
1. `GET /api/cursos/admin` → 200, lista con `cantidad_alumnos`.
2. `POST /api/cursos` con `{anio:'3ro', division:'C', aula:'Aula 303'}` → 201; reaparece en el listado.
3. `PUT /api/cursos/<idNuevo>` con `{anio:'3ro', division:'C', aula:'Aula 305'}` → 200.
4. `DELETE /api/cursos/<idNuevo>` (curso vacío) → 200.
5. `DELETE /api/cursos/1` (curso con alumnos/asistencias) → 409 con mensaje.
6. `GET /api/cursos` (sin cambios de forma) → 200, devuelve `id, code, name, room`.

---

## Task 4: Vista `CourseManagement.tsx`

**Files:**
- Create: `src/views/secretario/CourseManagement.tsx`

- [ ] **Step 1: Escribir el componente completo**

```tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Plus, Pencil, Trash2, Users, XCircle } from 'lucide-react';

interface Curso {
  id: number;
  anio: string;
  division: string;
  aula: string | null;
  cantidad_alumnos: number;
}

type FormState = { anio: string; division: string; aula: string };
const EMPTY_FORM: FormState = { anio: '', division: '', aula: '' };

export const CourseManagement: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const fetchCursos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cursos/admin', { headers: authHeaders() });
      if (res.ok) setCursos(await res.json());
    } catch (e) {
      console.error('Error al cargar cursos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCursos(); }, []);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit = (c: Curso) => {
    setEditingId(c.id);
    setForm({ anio: c.anio, division: c.division, aula: c.aula ?? '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const url = editingId ? `/api/cursos/${editingId}` : '/api/cursos';
    const method = editingId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        fetchCursos();
      } else {
        setError(data.message || 'No se pudo guardar el curso.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    }
  };

  const handleDelete = async (c: Curso) => {
    if (!window.confirm(`¿Eliminar el curso ${c.anio} ${c.division}?`)) return;
    try {
      const res = await fetch(`/api/cursos/${c.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        fetchCursos();
      } else {
        alert(data.message || 'No se pudo eliminar el curso.');
      }
    } catch {
      alert('Error de conexión con el servidor.');
    }
  };

  const totalAlumnos = cursos.reduce((acc, c) => acc + Number(c.cantidad_alumnos), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 ml-64">
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tight">Gestión de Cursos</h1>
            <p className="text-slate-500 font-medium">Crear y administrar los cursos, divisiones y aulas de la institución.</p>
          </div>
          <button onClick={openCreate}
            className="bg-brand-navy text-white font-bold flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95">
            <Plus size={18} /> Crear Curso
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Cursos', value: cursos.length.toString(), icon: GraduationCap },
            { label: 'Alumnos Totales', value: totalAlumnos.toString(), icon: Users },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-xl w-fit mb-4"><stat.icon size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-brand-navy tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Curso</th>
                <th className="px-8 py-4">Aula</th>
                <th className="px-8 py-4">Alumnos</th>
                <th className="px-8 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando cursos...</td></tr>
              ) : cursos.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay cursos cargados</td></tr>
              ) : cursos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-4 text-sm font-bold text-slate-900 uppercase tracking-tight">{c.anio} {c.division}</td>
                  <td className="px-8 py-4 text-sm text-slate-600">{c.aula || '—'}</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                      {c.cantidad_alumnos} alumno(s)
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(c)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/20 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-brand-navy uppercase tracking-tight">{editingId ? 'Editar Curso' : 'Nuevo Curso'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Año</label>
                  <input required value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })}
                    placeholder="Ej: 1ro"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">División</label>
                  <input required value={form.division} onChange={e => setForm({ ...form, division: e.target.value })}
                    placeholder="Ej: A"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Aula (opcional)</label>
                <input value={form.aula} onChange={e => setForm({ ...form, aula: e.target.value })}
                  placeholder="Ej: Aula 101"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" />
              </div>
              <button type="submit"
                className="w-full bg-brand-navy text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-brand-navy/20 hover:brightness-110 transition-all active:scale-[0.98]">
                {editingId ? 'Guardar cambios' : 'Crear curso'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
```

- [ ] **Step 2: Verificar tipado**

Run: `npx tsc --noEmit` (desde la raíz)
Expected: sin errores en `CourseManagement.tsx`.

---

## Task 5: Integrar en Sidebar y App

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Agregar el ícono e ítem en `Sidebar.tsx`**

En el import de `lucide-react`, agregar `GraduationCap`. En el array `menuItems`, agregar (por ejemplo, después del ítem `students`):

```tsx
    { id: 'courses', label: 'Gestión de Cursos', icon: GraduationCap, roles: ['Secretario/a'] },
```

- [ ] **Step 2: Importar y renderizar `CourseManagement` en `App.tsx`**

Agregar el import junto a las otras views de secretario:

```tsx
import { CourseManagement } from './views/secretario/CourseManagement';
```

Dentro del `<AnimatePresence mode="wait">`, agregar el bloque de render (junto a los otros tabs):

```tsx
              {activeTab === 'courses' && userRole === 'Secretario/a' && (
                <CourseManagement key="courses" />
              )}
```

- [ ] **Step 3: Verificar tipado**

Run: `npx tsc --noEmit` (desde la raíz)
Expected: sin errores.

- [ ] **Step 4: Verificar runtime (UI end-to-end)**

`npm run dev` (frontend en 3001) + backend en 5000. Como Secretario/a:
1. Aparece "Gestión de Cursos" en el Sidebar → abre la tabla de cursos.
2. Crear un curso (año/división/aula) → aparece con 0 alumnos.
3. Editar ese curso → cambios reflejados.
4. Eliminar el curso vacío → desaparece.
5. Intentar eliminar el curso 1 (con alumnos/asistencias) → alerta con el mensaje 409, sin romper.
6. Ir al panel de asistencia → los cursos siguen listándose normalmente.

---

## Verificación final del módulo

- `npx tsc --noEmit` limpio en `api/` y en la raíz (salvo el error preexistente ajeno de `StudentHistory.tsx`).
- Recorrer el Plan de verificación de la spec (§8) completo.
- Confirmar que ninguna referencia a `crearCurso`/`listarCursos` quedó colgada en `adminController`/`adminRoutes`.

## Follow-ups (fuera de alcance)

- Asignación de preceptor a curso (descartada).
- Borrado lógico/archivado de cursos.
- Reubicar/arreglar `StudentHistory.tsx` (rompe `tsc` en `api/`) y tipar `AttendanceBoard` ya hecho.
