import React from 'react';
import { 
  School, 
  BarChart3, 
  Users, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut,
  CheckSquare
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Secretario', 'Preceptor', 'Profesor EF'] },
    { id: 'preceptor', label: userRole === 'Profesor EF' ? 'Clases & Prácticas' : 'Attendance Board', icon: CheckSquare, roles: ['Preceptor', 'Profesor EF'] },
    { id: 'students', label: 'Student Management', icon: Users, roles: ['Secretario'] },
    { id: 'users', label: 'User Roles', icon: ShieldCheck, roles: ['Secretario'] },
    { id: 'calendar', label: 'Academic Calendar', icon: CalendarIcon, roles: ['Secretario', 'Preceptor', 'Profesor EF'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <nav className="fixed left-0 top-0 h-full w-64 flex flex-col p-4 bg-white border-r border-slate-200 z-50">
      <div className="mb-8 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-navy rounded-lg flex items-center justify-center text-white">
            <School size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-brand-navy tracking-tighter leading-none">AssistX</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{userRole} Portal</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-grow">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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
        <button className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors text-sm">
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={() => setActiveTab('login')}
          className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors text-sm text-rose-600"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );
};
