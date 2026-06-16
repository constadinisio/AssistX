import React from 'react';
import {
  BarChart3,
  Users,
  ShieldCheck,
  Calendar as CalendarIcon,
  Settings,
  LogOut,
  CheckSquare,
  GraduationCap,
  FileCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: BarChart3, roles: ['Secretario/a', 'Preceptor/a', 'Profesor/a EF'] },
    { id: 'preceptor', label: userRole === 'Profesor/a EF' ? 'Clases y Prácticas' : 'Registro de Asistencia', icon: CheckSquare, roles: ['Preceptor/a', 'Profesor/a EF'] },
    { id: 'history', label: 'Historial por Alumno', icon: CalendarIcon, roles: ['Preceptor/a', 'Secretario/a'] },
    { id: 'justificativos', label: 'Justificativos', icon: FileCheck, roles: ['Secretario/a', 'Preceptor/a'] },
    { id: 'students', label: 'Gestión de Alumnos', icon: Users, roles: ['Secretario/a'] },
    { id: 'courses', label: 'Gestión de Cursos', icon: GraduationCap, roles: ['Secretario/a'] },
    { id: 'users', label: 'Roles de Usuario', icon: ShieldCheck, roles: ['Secretario/a'] },
    { id: 'calendar', label: 'Calendario Académico', icon: CalendarIcon, roles: ['Secretario/a', 'Preceptor/a', 'Profesor/a EF'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <nav className="fixed left-0 top-0 h-full w-64 flex flex-col p-4 bg-white border-r border-slate-200 z-50">
      <div className="mb-8 px-4">
        <div className="flex items-center gap-2">
          <img 
            src="images/AssistX.png" 
            alt="AssistX Logo" 
            className="w-10 h-10 object-cover rounded-xl shadow-lg shadow-brand-navy/10 border border-slate-100" 
          />
          <div>
            <h1 className="text-xl font-black text-brand-navy tracking-tighter leading-none">AssistX</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1"></p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-grow">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              localStorage.setItem('activeTab', item.id);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-slate-100 text-brand-navy font-semibold' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <item.icon size={18} />
            <span className="text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4 flex flex-col gap-1 text-slate-500">
        <button 
          onClick={() => {
            localStorage.clear(); // Limpia todo (rol y posibles pestañas guardadas)
            window.location.reload(); // Fuerza el reinicio limpio de la app
          }}
          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors text-sm text-rose-600"
        > 
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};
