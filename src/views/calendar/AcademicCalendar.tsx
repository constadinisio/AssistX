import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  AlertTriangle 
} from 'lucide-react';

interface AcademicCalendarProps {
  userRole: string;
}

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({ userRole }) => {
  const days = Array.from({ length: 30 }).map((_, i) => i + 1);
  const events = [
    { day: 2, title: 'Teacher Planning', type: 'admin' },
    { day: 9, title: 'Bimester 1 Start', type: 'academic' },
    { day: 16, title: 'Independence Day', type: 'holiday' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 ml-64"
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tight">Academic Calendar</h1>
            <p className="text-slate-500 font-medium">Configure school year periods, holidays, and academic milestones.</p>
          </div>
          {userRole === 'Secretario' && (
            <div className="flex gap-3">
              <button className="bg-brand-navy text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 text-sm">
                <Plus size={16} /> New Event
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-brand-navy">September 2024</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all"><ChevronLeft size={18} /></button>
                <button className="px-4 py-2 hover:bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold transition-all">Today</button>
                <button className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-grow min-h-[600px]">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="border-r border-b border-slate-50 bg-slate-50/30" />)}
              {days.map(d => {
                const dayEvents = events.filter(e => e.day === d);
                return (
                  <div key={d} className="border-r border-b border-slate-50 p-3 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col gap-1 min-h-[100px]">
                    <span className="text-xs font-bold text-slate-900">{d}</span>
                    {dayEvents.map((e, idx) => (
                      <div key={idx} className={`text-[9px] font-black uppercase px-2 py-1 rounded border overflow-hidden truncate leading-none ${
                        e.type === 'academic' ? 'bg-brand-navy text-white border-brand-navy' :
                        e.type === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-brand-navy">Academic Bimesters</h3>
                {userRole === 'Secretario' && (
                  <button className="text-slate-400 hover:text-brand-navy transition-colors"><Settings size={18} /></button>
                )}
              </div>
              <div className="space-y-4">
                {[
                  { name: 'First Bimester', range: 'Sept 9 - Nov 15', current: true },
                  { name: 'Second Bimester', range: 'Nov 18 - Jan 31', current: false },
                  { name: 'Third Bimester', range: 'Feb 3 - Apr 12', current: false },
                  { name: 'Fourth Bimester', range: 'Apr 15 - Jun 28', current: false },
                ].map((bim, i) => (
                  <div key={i} className={`p-4 rounded-2xl border-l-4 transition-all hover:bg-slate-50 cursor-pointer ${bim.current ? 'bg-slate-50 border-brand-navy' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-bold text-slate-900">{bim.name}</p>
                      {bim.current && <span className="bg-brand-navy text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest shadow-sm">Current</span>}
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{bim.range}</p>
                  </div>
                ))}
                <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-black text-[10px] uppercase tracking-widest hover:border-slate-300 hover:text-slate-500 transition-all">
                  + Add Bimester
                </button>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                 <AlertTriangle size={120} />
               </div>
               <div className="relative z-10 flex gap-4">
                 <div className="w-10 h-10 bg-brand-error text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200 animate-pulse">
                   <AlertTriangle size={20} />
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-brand-error uppercase tracking-tight">Holiday Conflict</h3>
                   <p className="text-xs text-rose-800/80 font-medium leading-relaxed mt-1">Sept 16 overlaps with the scheduled Bimester 1 Welcome Assembly. System suggests rescheduling the opening event.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
