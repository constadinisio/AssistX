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

interface CourseManagementProps {
  onViewStudents?: (id: number) => void;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({ onViewStudents }) => {
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
                <tr 
                  key={c.id} 
                  onClick={() => onViewStudents?.(c.id)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="px-8 py-4 text-sm font-bold text-brand-navy uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                    {c.anio} {c.division}
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-600">{c.aula || '—'}</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                      {c.cantidad_alumnos} alumno(s)
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {/* e.stopPropagation() evita que al editar/borrar se dispare la redirección */}
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
