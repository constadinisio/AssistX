# Plan de Implementación — Alta de Alumnos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Conectar el botón "Añadir Alumno" con un modal de alta (nombre, apellido, DNI, curso obligatorio) y endurecer el endpoint de creación.

**Architecture:** El endpoint `POST /api/admin/alumnos` ya existe (`adminController.crearAlumno`); se le agrega validación y 409 por DNI duplicado. El frontend `StudentsDirectory` suma un modal y la carga de cursos para el select. Sin migración ni rutas nuevas.

**Tech Stack:** Node + Express 5 + TS + mysql2; React 19 + Vite + Tailwind; validación manual; verificación manual + `tsc`.

**Spec:** `docs/superpowers/specs/2026-06-03-alta-alumnos-design.md`

> **Ejecución:** rama `feat/registro-personal`, **sin commitear** (working tree).

---

## Task 1: Endurecer `crearAlumno`

**Files:**
- Modify: `api/src/controllers/adminController.ts` (función `crearAlumno`)

- [ ] **Step 1: Reemplazar la función `crearAlumno`**

Reemplazar la función actual por:

```typescript
export const crearAlumno = async (req: Request, res: Response) => {
    const { nombre, apellido, dni, id_curso } = req.body;
    if (!nombre || !apellido || !dni || !id_curso ||
        String(nombre).trim() === '' || String(apellido).trim() === '' || String(dni).trim() === '') {
        return res.status(400).json({ message: 'Nombre, apellido, DNI y curso son obligatorios.' });
    }
    try {
        await pool.query(
            'INSERT INTO alumnos (nombre, apellido, dni, id_curso) VALUES (?, ?, ?, ?)',
            [String(nombre).trim(), String(apellido).trim(), String(dni).trim(), id_curso]
        );
        res.status(201).json({ message: 'Alumno registrado correctamente' });
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe un alumno con ese DNI.' });
        }
        console.error('Error en crearAlumno:', error);
        res.status(500).json({ message: 'Error al registrar alumno' });
    }
};
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores nuevos (ignorar error preexistente de `StudentHistory.tsx`).

- [ ] **Step 3: Verificar runtime**

Backend en 5000, token Secretario/a. `POST /api/admin/alumnos`:
- `{nombre:'Test',apellido:'Alta',dni:'<dni-nuevo>',id_curso:1}` → 201.
- Mismo DNI otra vez → 409.
- Sin `id_curso` → 400.
- Limpiar el alumno de prueba al final (`DELETE FROM alumnos WHERE dni='<dni-nuevo>'`).

---

## Task 2: Modal de alta en `StudentsDirectory.tsx`

**Files:**
- Modify: `src/views/secretario/StudentsDirectory.tsx`

- [ ] **Step 1: Agregar `XCircle` al import de lucide-react**

En el import de `lucide-react`, agregar `XCircle` a la lista existente.

- [ ] **Step 2: Agregar estado del modal y de cursos**

Junto a los `useState` existentes, agregar:

```tsx
  const [showModal, setShowModal] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({ nombre: '', apellido: '', dni: '', id_curso: '' });
  const [formError, setFormError] = useState('');
```

- [ ] **Step 3: Extraer `fetchStudents` al scope del componente**

Hoy `fetchStudents` está definido dentro del `useEffect`. Moverlo al cuerpo del componente para poder reusarlo:

```tsx
  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/admin/alumnos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Error al cargar alumnos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);
```

- [ ] **Step 4: Cargar cursos para el select**

Agregar otro `useEffect`:

```tsx
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/cursos', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) setCourses(await response.json());
      } catch (error) {
        console.error("Error al cargar cursos:", error);
      }
    };
    fetchCourses();
  }, []);
```

- [ ] **Step 5: Agregar el handler de alta**

```tsx
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const response = await fetch('/api/admin/alumnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setShowModal(false);
        setFormData({ nombre: '', apellido: '', dni: '', id_curso: '' });
        fetchStudents();
      } else {
        setFormError(data.message || 'No se pudo registrar el alumno.');
      }
    } catch {
      setFormError('Error de conexión con el servidor.');
    }
  };
```

- [ ] **Step 6: Conectar el botón "Añadir Alumno"**

Cambiar el botón actual para que abra el modal:

```tsx
          <button onClick={() => { setFormError(''); setShowModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98]">
            <UserPlus size={18} /> Añadir Alumno
          </button>
```

- [ ] **Step 7: Agregar el modal antes del cierre del componente**

Insertar este bloque justo antes del `</motion.div>` final (después del `</div>` que cierra el contenedor `max-w-[1440px]`):

```tsx
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/20 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-brand-navy uppercase tracking-tight">Nuevo Alumno</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nombre</label>
                  <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Apellido</label>
                  <input required value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">DNI</label>
                <input required value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-navy/10" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Curso</label>
                <select required value={formData.id_curso} onChange={e => setFormData({ ...formData, id_curso: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10">
                  <option value="" disabled>Seleccionar curso...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
              </div>
              <button type="submit"
                className="w-full bg-brand-navy text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-brand-navy/20 hover:brightness-110 transition-all active:scale-[0.98]">
                Registrar Alumno
              </button>
            </form>
          </motion.div>
        </div>
      )}
```

- [ ] **Step 8: Verificar tipado**

Run: `npx tsc --noEmit` (raíz)
Expected: sin errores en `StudentsDirectory.tsx`.

- [ ] **Step 9: Verificar runtime (UI)**

`localhost:3001` como Secretario/a → Directorio de Alumnos → "Añadir Alumno" abre el modal →
crear alumno con curso → aparece en la tabla con su curso. DNI repetido → error visible.

---

## Verificación final
- `tsc` limpio (salvo `StudentHistory.tsx` preexistente).
- Recorrer §8 de la spec.
