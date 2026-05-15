import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  BadgeCheck, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft,
  CheckSquare,
  Calendar as CalendarIcon,
  ShieldCheck
} from 'lucide-react';

interface DashboardProps {
  userRole: string;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 ml-64"
  >
    <div className="max-w-[1440px] mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-brand-navy tracking-tight">{userRole} Dashboard</h1>
          <p className="text-slate-500 font-medium">Welcome back. Here is the operational summary for today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Students</p>
              <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">1,284</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] text-emerald-600 font-bold uppercase tracking-wider">
            <TrendingUp size={12} /> +12% from last term
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Staff</p>
              <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">42</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BadgeCheck size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pending Requests</p>
              <h3 className="text-3xl font-black text-brand-navy tracking-tight mt-2">14</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] text-rose-600 font-black uppercase tracking-widest animate-pulse">
            Requires immediate review
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xl font-bold text-brand-navy">Quick Access Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRole === 'Secretario' ? (
              <>
                <div 
                  onClick={() => onNavigate('students')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <Users className="text-slate-900 mb-4 group-hover:text-blue-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">Manage Students</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Enroll new students, update records, and manage academic performance data.</p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    Explore <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div 
                  onClick={() => onNavigate('users')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <ShieldCheck className="text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">Manage Users</h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Assign roles, reset passwords, and audit system access logs for staff members.</p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    Explore <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
                    {userRole === 'Profesor EF' ? 'Clases y Grupos' : 'Attendance Board'}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {userRole === 'Profesor EF' ? 'Registrá la actividad física de tus alumnos y gestioná las clases diarias.' : 'Take daily attendance, register withdrawals, and track classroom status.'}
                  </p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    {userRole === 'Profesor EF' ? 'Abrir Panel' : 'Launch Board'} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div 
                  onClick={() => onNavigate('calendar')}
                  className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-brand-navy transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform"></div>
                  <CalendarIcon className="text-slate-900 mb-4 group-hover:text-blue-600 transition-colors" size={32} />
                  <h4 className="font-bold text-lg text-slate-900">
                    {userRole === 'Profesor EF' ? 'Calendario Deportivo' : 'Academic Calendar'}
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {userRole === 'Profesor EF' ? 'Consultá eventos deportivos, torneos y jornadas institucionales.' : 'View institutional events, holidays, and academic periods.'}
                  </p>
                  <div className="mt-4 flex items-center text-brand-navy font-black text-xs uppercase tracking-widest">
                    {userRole === 'Profesor EF' ? 'Ver Eventos' : 'View Calendar'} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-brand-navy">Critical Alerts</h2>
            <button className="text-[10px] font-black text-brand-navy uppercase tracking-widest hover:translate-x-1 transition-transform">View All</button>
          </div>
          <div className="space-y-4">
            <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-2xl shadow-sm">
              <div className="flex gap-3">
                <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                <div>
                  <p className="font-bold text-sm text-slate-900">Student Risk Alert</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Javier Ortega has reached 4 consecutive absences this week.</p>
                  <button className="mt-3 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:brightness-90">Send Intervention Report</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
             <div className="bg-brand-navy text-white px-6 py-4 flex justify-between items-center">
               <span className="font-bold text-sm">Academic Schedule</span>
               <div className="flex gap-2">
                 <button className="p-1 hover:bg-white/10 rounded"><ChevronLeft size={16} /></button>
                 <button className="p-1 hover:bg-white/10 rounded"><ChevronRight size={16} /></button>
               </div>
             </div>
             <div className="p-6">
                <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">
                  {['M','T','W','T','F','S','S'].map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 text-center text-xs gap-y-3">
                  {Array.from({length: 31}).map((_, i) => (
                    <div key={i} className={`p-1 font-bold ${i+1 === 25 ? 'bg-brand-navy text-white rounded-lg shadow-md scale-110' : 'text-slate-600 hover:text-brand-navy transition-colors cursor-default'}`}>
                      {i+1}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);
