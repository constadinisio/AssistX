import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  Users, 
  BadgeCheck, 
  AlertTriangle, 
  MoreVertical, 
  Filter, 
  Eye,
  History,
  XCircle
} from 'lucide-react';

interface StudentsDirectoryProps {
  cursoIdInicial?: number | null;
  onClearFilter?: () => void;
}

export const StudentsDirectory: React.FC<StudentsDirectoryProps> = ({ cursoIdInicial, onClearFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'risk' | 'present' | 'absent'>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({ nombre: '', apellido: '', dni: '', id_curso: '' });
  const [formError, setFormError] = useState('');
  const [riesgoPorAlumno, setRiesgoPorAlumno] = useState<Record<number, { nivel: string; faltas: number }>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atajo de teclado: presionar '/' para enfocar el buscador rápidamente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const etiquetasFiltro: Record<string, string> = {
    all: 'Todos',
    risk: 'En Riesgo',
    present: 'Presentes',
    absent: 'Ausentes'
  };

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

  useEffect(() => {
    const fetchRiesgo = async () => {
      try {
        const res = await fetch('/api/alumnos/riesgo', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
          const data: any[] = await res.json();
          const mapa: Record<number, { nivel: string; faltas: number }> = {};
          for (const r of data) mapa[r.id] = { nivel: r.nivel, faltas: r.faltas };
          setRiesgoPorAlumno(mapa);
        }
      } catch (e) {
        console.error('Error cargando riesgo:', e);
      }
    };
    fetchRiesgo();
  }, []);

  const filteredStudents = students.filter(s => {
    const fullName = `${s.apellido} ${s.nombre}`.toLowerCase();
    const courseInfo = `${s.anio} ${s.division}`.toLowerCase();

    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      s.dni.includes(searchTerm) ||
      courseInfo.includes(searchTerm.toLowerCase());

    const matchesFilter = filter === 'all' || 
                         (filter === 'present' && s.status === 'Presente') || 
                         (filter === 'absent' && s.status === 'Ausente');

    const matchesCurso = cursoIdInicial ? s.id_curso === cursoIdInicial : true;

    return matchesSearch && matchesFilter && matchesCurso;
  });

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 ml-64"
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-brand-navy tracking-tight">Directorio de Alumnos</h2>
            <p className="text-slate-500 font-medium">Gestionar perfiles de alumnos, historial de asistencia y estados de riesgo.</p>
          </div>
          <button onClick={() => { setFormError(''); setShowModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98]">
            <UserPlus size={18} /> Añadir Alumno
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Alumnos', value: students.length.toString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Activos Hoy', value: students.length.toString(), icon: BadgeCheck, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Alertas de Riesgo', value: Object.keys(riesgoPorAlumno).length.toString(), icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <button className="text-slate-300 hover:text-slate-500">
                  <MoreVertical size={16} />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-brand-navy tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/10 outline-none" 
                placeholder="Buscar por nombre, DNI o curso (Ej: 1ro A)..."
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-400 font-bold hidden md:block">
                /
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'risk', 'present', 'absent'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    filter === f 
                    ? 'bg-brand-navy text-white' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {etiquetasFiltro[f]}
                </button>
              ))}
              <div className="w-[1px] bg-slate-200 mx-1"></div>
              <button className="p-2.5 border border-slate-200 rounded-lg hover:bg-white text-slate-500 transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Alumno</th>
                  <th className="px-6 py-4">DNI</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Historial Reciente</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando directorio...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No se encontraron alumnos</td></tr>
                ) : filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                          {student.apellido[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-brand-navy leading-none mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                            {student.apellido}, {student.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.anio} {student.division}</p>
                          {riesgoPorAlumno[student.id] && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              riesgoPorAlumno[student.id].nivel === 'Critico' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {riesgoPorAlumno[student.id].nivel === 'Critico' ? 'Crítico' : 'Riesgo'} · {riesgoPorAlumno[student.id].faltas}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{student.dni}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded inline-block tracking-widest ${
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        Activo
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-4 rounded-full ${
                            'bg-slate-200'
                          }`} title={
                            'Sin registro'
                          } />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all">
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Mostrando {filteredStudents.length} de {students.length} alumnos</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors">Ant</button>
              <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors">Sig</button>
            </div>
          </div>
        </div>
      </div>

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
    </motion.div>
  );
};
