import React from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface TopBarProps {
  userRole: string;
}

export const TopBar: React.FC<TopBarProps> = ({ userRole }) => (
  <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 ml-64">
    <div className="flex items-center gap-4 w-1/2">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-brand-navy/20 outline-none" 
          placeholder="Search student, course or ID..."
        />
      </div>
    </div>

    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-slate-500">
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <HelpCircle size={20} />
        </button>
      </div>
      <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900 leading-none">
            {userRole === 'Secretario' ? 'Marta López' : userRole === 'Preceptor' ? 'Ricardo Gómez' : 'Prof. Javier Rossi'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {userRole === 'Secretario' ? 'Secretaría Institucional' : userRole === 'Preceptor' ? 'Preceptor de Turno' : 'Departamento de Ed. Física'}
          </p>
        </div>
        <div className="h-10 w-10 rounded-full border border-slate-200 overflow-hidden shadow-sm">
          <img src={
            userRole === 'Secretario' ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100" : 
            userRole === 'Preceptor' ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" :
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100"
          } alt="Profile" />
        </div>
      </div>
    </div>
  </header>
);
