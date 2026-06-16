import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  CheckCircle2,
  Search
} from 'lucide-react';
import { AttendanceStatus } from '../../types';
import { RiskNotificationModal } from '../../components/layout/RiskNotificationModal';

interface AttendanceBoardProps {
  userRole: string;
}

type AttendanceEntry = { status: AttendanceStatus; obs: string };

// Mapeo del estado guardado en la DB (español) al status interno del panel (inglés)
const ESTADO_TO_STATUS: Record<string, AttendanceStatus> = {
  'Presente': 'Present',
  'Ausente': 'Absent',
  'Tarde': 'Late',
  'Retiro': 'Withdrawal',
  'Ausente Justificado': 'Justified',
  'Ausencia con Presencia': 'NC',
};

const estadoToStatus = (estado: string): AttendanceStatus => ESTADO_TO_STATUS[estado] ?? 'Present';

export const AttendanceBoard: React.FC<AttendanceBoardProps> = ({ userRole }) => {
  const isEF = userRole === 'Profesor/a EF';
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({});

  type AlertaRiesgo = { id_alumno: number; nombre: string; apellido: string; tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual'; faltas: number; mensaje: string; id_notificacion: number };
  const [alertasCola, setAlertasCola] = useState<AlertaRiesgo[]>([]);
  const [alertaIndex, setAlertaIndex] = useState(0);

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/cursos', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setCourses(data);
        if (data.length > 0) setSelectedCourse(data[0]);
      } catch (error) {
        console.error("Error al obtener cursos:", error);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      if (!selectedCourse) return;
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const fecha = new Date().toISOString().split('T')[0];

        const [resStudents, resAttendance] = await Promise.all([
          fetch(`/api/alumnos/curso/${selectedCourse.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/asistencias/${selectedCourse.id}/${fecha}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
        ]);

        const studentsData = await resStudents.json();
        const savedData: Array<{ id_alumno: number; estado: string; observaciones: string | null }> =
          resAttendance.ok ? await resAttendance.json() : [];

        setStudents(studentsData);
        setIsSubmitted(savedData.length > 0);

        // Si el reporte ya fue finalizado (savedData.length > 0), reseteamos visualmente a 'Presente' 
        // según el requerimiento. Si no, cargamos lo guardado hoy para que puedan seguir editando.
        const savedByAlumno = new Map(savedData.map(r => [r.id_alumno, r]));
        const initial: Record<string, AttendanceEntry> = {};
        for (const s of studentsData) {
          // Si existe reporte para hoy, ignoramos los estados reales y forzamos 'Present'
          const saved = savedData.length > 0 ? null : savedByAlumno.get(s.id);
          initial[s.id] = saved
            ? { status: estadoToStatus(saved.estado), obs: saved.observaciones ?? '' }
            : { status: 'Present', obs: '' };
        }
        setAttendance(initial);
      } catch (error) {
        console.error("Error al obtener alumnos/asistencias:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentsAndAttendance();
  }, [selectedCourse]);

  const filteredStudents = students.filter(s => {
    const fullName = `${s.apellido} ${s.nombre}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || s.dni.includes(searchTerm);
    return matchesSearch;
  });

  const stats = {
    total: students.length,
    present: Object.values(attendance).filter(a => (a as any).status === 'Present').length,
    absent: Object.values(attendance).filter(a => (a as any).status === 'Absent').length,
    late: Object.values(attendance).filter(a => (a as any).status === 'Late').length,
    withdrawal: Object.values(attendance).filter(a => (a as any).status === 'Withdrawal').length,
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleObsChange = (studentId: string, obs: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], obs }
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        id_curso: selectedCourse.id,
        fecha: new Date().toISOString().split('T')[0],
        registros: Object.entries(attendance).map(([id, data]: [string, AttendanceEntry]) => ({
          id_alumno: parseInt(id),
          estado: data.status === 'Present' ? 'Presente' : 
                  data.status === 'Absent' ? 'Ausente' : 
                  data.status === 'Late' ? 'Tarde' : 'Retiro',
          observaciones: data.obs
        }))
      };

      const response = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const alertas: AlertaRiesgo[] = data.alertas ?? [];
        setIsSubmitted(true);
        // Resetear visualmente a todos los alumnos a 'Presente' y limpiar observaciones
        setAttendance(prev => {
          const reset: Record<string, AttendanceEntry> = {};
          Object.keys(prev).forEach(id => {
            reset[id] = { status: 'Present', obs: '' };
          });
          return reset;
        });
        if (alertas.length > 0) {
          setAlertasCola(alertas);
          setAlertaIndex(0);
        } else {
          alert(isEF ? 'Reporte de Educación Física enviado' : 'Asistencia enviada con éxito');
        }
      } else {
        alert('Error al guardar la asistencia');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const alertaActual = alertasCola[alertaIndex] ?? null;

  const cerrarAlerta = () => {
    if (alertaIndex < alertasCola.length - 1) {
      setAlertaIndex(i => i + 1);
    } else {
      setAlertasCola([]);
      setAlertaIndex(0);
      alert(isEF ? 'Reporte de Educación Física enviado' : 'Asistencia enviada con éxito');
    }
  };

  const enviarAvisoAlerta = async () => {
    if (!alertaActual) return;
    try {
      await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id_alumno: alertaActual.id_alumno, id_notificacion: alertaActual.id_notificacion, motivo: 'Aviso a la familia por riesgo de asistencias' }),
      });
    } catch (e) {
      console.error('Error enviando aviso:', e);
    }
    cerrarAlerta();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 pb-12 ml-64 min-h-screen bg-slate-50/30"
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-brand-navy tracking-tight">
              {isEF ? 'Panel del Profesor/a de Educación Física' : 'Panel de Asistencia del Preceptor/a'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isEF ? 'Gestioná la asistencia de tus grupos y clases deportivas.' : 'Registrá la asistencia diaria y seguí las estadísticas en tiempo real.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
              {isEF ? 'Grupo/Año:' : 'Sección:'}
            </p>
            <div className="flex gap-1">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCourse.id === course.id 
                    ? 'bg-brand-navy text-white shadow-md' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {course.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Alumnos', value: stats.total, color: 'text-brand-navy' },
            { label: 'Presentes', value: stats.present, color: 'text-emerald-600' },
            { label: 'Ausentes', value: stats.absent, color: 'text-rose-600' },
            { label: isEF ? 'Con Retiro/Tarde' : 'Excepciones', value: stats.late + stats.withdrawal, color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
              <h4 className={`text-2xl font-black ${s.color}`}>{s.value}</h4>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-navy rounded-xl flex items-center justify-center text-white">
                <CalendarDays size={20} />
              </div>
                {selectedCourse && <div>
                <h3 className="font-bold text-slate-900">{selectedCourse.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{isEF ? 'Complejo Deportivo' : selectedCourse.room} • {new Date().toLocaleDateString()}</p>
                </div>}
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={isSubmitted || isLoading}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                isSubmitted 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 text-white shadow-emerald-600/10 hover:brightness-95'
              }`}
            >
              <CheckCircle2 size={18} /> 
              {isSubmitted 
                ? (isEF ? 'Clase Finalizada' : 'Reporte Finalizado') 
                : (isEF ? 'Finalizar Clase' : 'Finalizar Reporte de Asistencia')}
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/10 outline-none" 
                placeholder="Buscar alumno por nombre o DNI..."
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400 font-bold hidden md:block">
                /
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Alumno</th>
                  <th className="px-8 py-5">Estado de Asistencia</th>
                  <th className="px-8 py-5">{isEF ? 'Observaciones de Clase' : 'Observaciones Internas'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={3} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando alumnos...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay alumnos en este curso</td></tr>
                ) : filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">
                          {student.apellido[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                            {student.apellido}, {student.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">{student.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        {(['Present', 'Absent', 'Late', 'Withdrawal'] as const).map(status => (
                          <button
                            key={status}
                            disabled={isSubmitted}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              attendance[student.id]?.status === status
                              ? status === 'Present' ? 'bg-emerald-600 text-white shadow-md' :
                                status === 'Absent' ? 'bg-rose-600 text-white shadow-md' :
                                status === 'Late' ? 'bg-amber-500 text-white shadow-md' :
                                'bg-brand-navy text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {status === 'Withdrawal' ? 'Retiro' : status === 'Present' ? 'Pres' : status === 'Absent' ? 'Aus' : 'Tarde'}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <input 
                        type="text"
                        disabled={isSubmitted}
                        value={attendance[student.id]?.obs ?? ''}
                        onChange={(e) => handleObsChange(student.id, e.target.value)}
                        placeholder="Agregar notas..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all italic placeholder:text-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {alertaActual && (
        <RiskNotificationModal
          isOpen={true}
          onClose={cerrarAlerta}
          studentName={`${alertaActual.apellido}, ${alertaActual.nombre}`}
          absencesCount={alertaActual.faltas}
          tipo={alertaActual.tipo}
          onViewDetails={cerrarAlerta}
          onSendAviso={enviarAvisoAlerta}
        />
      )}
    </motion.div>
  );
};
