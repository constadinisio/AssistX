import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  BadgeCheck, 
  AlertTriangle, 
  ChevronRight, 
  CheckSquare,
  Calendar as CalendarIcon,
  ShieldCheck
} from 'lucide-react';
import { RiskNotificationModal } from '../../components/layout/RiskNotificationModal';

interface DashboardProps {
  userRole: string;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  const [metrics, setMetrics] = useState({
    totalAlumnos: 0,
    personalActivo: 0,
    solicitudesPendientes: 0
  });

  // Estados para el sistema de notificaciones de riesgo
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskStudents, setRiskStudents] = useState<any[]>([]);
  const [activeRiskIndex, setActiveRiskIndex] = useState(0);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/reports/metrics', {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error cargando métricas:', error);
      }
    };
    fetchMetrics();
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await fetch('/api/notificaciones', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          // Mostrar solo alertas activas (no gestionadas) en el dashboard
          setRiskStudents(Array.isArray(data) ? data.filter((n: any) => n.estado !== 'gestionada') : []);
        }
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };
    fetchNotifs();
  }, []);

  return (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 ml-64"
  >
    <div className="max-w-[1440px] mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-brand-navy tracking-tight">Panel de {userRole}</h1>
          <p className="text-slate-500 font-medium">Bienvenido/a {userRole}.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${userRole === 'Secretario/a' ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-1'}`}>
        {userRole === 'Secretario/a' && (
          <>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total de Alumnos</p>
                  <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">{metrics.totalAlumnos.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Personal Activo</p>
                  <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">{metrics.personalActivo}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigate('users')}
              className={`bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer ${metrics.solicitudesPendientes > 0 ? 'border-l-4 border-l-amber-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Solicitudes Pendientes</p>
                  <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">{metrics.solicitudesPendientes}</h3>
                </div>
                <div className={`p-3 rounded-xl ${metrics.solicitudesPendientes > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-300'}`}>
                  <BadgeCheck size={20} />
                </div>
              </div>
              <div className={`mt-4 text-[11px] font-black uppercase tracking-widest ${metrics.solicitudesPendientes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {metrics.solicitudesPendientes > 0 ? 'Revisar solicitudes' : 'Sin solicitudes'}
              </div>
            </div>
          </>
        )}

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Alertas de Riesgo</p>
              <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">{riskStudents.length}</h3>
            </div>
            <button 
              onClick={() => riskStudents.length > 0 && setIsRiskModalOpen(true)}
              className={`p-3 rounded-xl transition-colors cursor-pointer active:scale-90 shadow-sm ${
                riskStudents.length > 0 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-slate-50 text-slate-300'
              }`}
            >
              <AlertTriangle size={20} />
            </button>
          </div>
          <div className={`mt-4 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest ${riskStudents.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
            {riskStudents.length > 0 ? `${riskStudents.length} Alertas de riesgo detectadas` : 'Sin alertas críticas'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xl font-bold text-brand-navy">Módulos de Acceso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRole === 'Secretario/a' ? (
              <>
                <div 
                  onClick={() => onNavigate('students')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <Users className="text-slate-900 mb-4 group-hover:text-blue-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">Gestionar Alumnos</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Inscribir nuevos alumnos, actualizar registros y gestionar el rendimiento académico.</p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    Explorar <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div 
                  onClick={() => onNavigate('users')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <ShieldCheck className="text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">Gestionar Usuarios</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Asignar roles, restablecer contraseñas y auditar accesos del personal.</p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    Explorar <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div 
                  onClick={() => onNavigate('preceptor')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <CheckSquare className="text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">
                    {userRole === 'Profesor/a EF' ? 'Clases y Grupos' : 'Registro de Asistencia'}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {userRole === 'Profesor/a EF' ? 'Registrá la actividad física de tus alumnos y gestioná las clases diarias.' : 'Tomar asistencia diaria, registrar retiros y seguir el estado del aula.'}
                  </p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    {userRole === 'Profesor/a EF' ? 'Abrir Panel' : 'Abrir Registro'} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div 
                  onClick={() => onNavigate('history')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <CalendarIcon className="text-slate-900 mb-4 group-hover:text-amber-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">Historial por Alumno</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    Consultar el registro completo de inasistencias y observaciones de un alumno específico.
                  </p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    Consultar <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div 
                  onClick={() => onNavigate('calendar')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <CalendarIcon className="text-slate-900 mb-4 group-hover:text-blue-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">
                    {userRole === 'Profesor/a EF' ? 'Calendario Deportivo' : 'Calendario Académico'}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {userRole === 'Profesor/a EF' ? 'Consultá eventos deportivos, torneos y jornadas institucionales.' : 'Ver eventos institucionales, feriados y periodos académicos.'}
                  </p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    {userRole === 'Profesor/a EF' ? 'Ver Eventos' : 'Ver Calendario'} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alertas Críticas */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xl font-bold text-brand-navy">Alertas Críticas</h2>
          <div className="space-y-4">
            {riskStudents.length === 0 ? (
              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-sm text-slate-400 font-medium">
                No hay alertas activas.
              </div>
            ) : (
              riskStudents.slice(0, 5).map((n: any, i: number) => (
                <div key={n.id ?? i} className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-2xl shadow-sm">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {n.tipo === 'Critico' ? 'Alerta Crítica' : n.tipo === 'RegularidadAnual' ? 'Riesgo de Regularidad' : 'Alerta de Riesgo'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.mensaje}</p>
                      <button
                        onClick={() => { setActiveRiskIndex(i); setIsRiskModalOpen(true); }}
                        className="mt-3 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:brightness-90"
                      >
                        Ver Alerta
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Sistema de Notificaciones de Riesgo */}
    {riskStudents.length > 0 && (
      <RiskNotificationModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        studentName={riskStudents[activeRiskIndex] ? `${riskStudents[activeRiskIndex].apellido}, ${riskStudents[activeRiskIndex].nombre}` : ''}
        absencesCount={riskStudents[activeRiskIndex]?.faltas ?? 0}
        tipo={riskStudents[activeRiskIndex]?.tipo}
        onViewDetails={() => { setIsRiskModalOpen(false); onNavigate('history'); }}
        onSendAviso={async () => {
          const n = riskStudents[activeRiskIndex];
          if (n) {
            try {
              await fetch('/api/intervenciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ id_alumno: n.id_alumno, id_notificacion: n.id, motivo: 'Aviso a la familia por riesgo de asistencias' }),
              });
            } catch (e) {
              console.error('Error enviando aviso:', e);
            }
          }
          setIsRiskModalOpen(false);
        }}
      />
    )}
  </motion.div>
  );
};
