import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Evento {
  id: number;
  titulo: string;
  fecha: string;
  tipo: 'Feriado' | 'Examen' | 'Evento' | 'Institucional';
  descripcion: string;
}

export const AcademicCalendar: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: '', fecha: '', tipo: 'Evento', descripcion: '' });
  const isAdmin = userRole === 'Secretario/a';

  // Lógica para la grilla
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajuste para que empiece en Lunes
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('es', { month: 'long' });

  const fetchEventos = async () => {
    const res = await fetch('/api/admin/eventos', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setEventos(await res.json());
  };

  useEffect(() => { fetchEventos(); }, []);

  const handleSave = async () => {
    const res = await fetch('/api/admin/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(nuevoEvento)
    });
    if (res.ok) { fetchEventos(); setShowModal(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este evento?')) return;
    const res = await fetch(`/api/admin/eventos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) fetchEventos();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 ml-64">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-brand-navy capitalize">{monthName} {year}</h2>
            <p className="text-slate-500 font-medium">Gestión de fechas institucionales.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setViewDate(new Date())} className="px-4 text-xs font-bold text-brand-navy uppercase tracking-widest">
                {monthName}
              </button>
              <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-brand-navy text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-brand-navy/10"
              >
                <Plus size={18} /> Nuevo
              </button>
            )}
          </div>
        </div>

        {/* Grilla de Calendario */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {/* Celdas vacías al inicio */}
            {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-32 border-b border-r border-slate-50 bg-slate-50/30"></div>
            ))}
            
            {/* Días del mes */}
            {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
              const day = i + 1;
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventos.filter(e => e.fecha.startsWith(dateStr));

              return (
                <div 
                  key={day} 
                  className={`h-32 border-b border-r border-slate-100 p-2 relative group transition-colors hover:bg-slate-50/50 ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <span className={`text-xs font-bold ${isToday ? 'bg-brand-navy text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                    {dayEvents.map(e => (
                      <div 
                        key={e.id}
                        title={e.descripcion}
                        className={`text-[9px] px-1.5 py-1 rounded-lg font-bold truncate flex items-center justify-between group/item ${
                          e.tipo === 'Feriado' ? 'bg-rose-100 text-rose-700' :
                          e.tipo === 'Examen' ? 'bg-amber-100 text-amber-700' :
                          e.tipo === 'Institucional' ? 'bg-slate-100 text-slate-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <span className="truncate">{e.titulo}</span>
                        {isAdmin && (
                          <button 
                            onClick={(evt) => { evt.stopPropagation(); handleDelete(e.id); }}
                            className="hidden group-hover/item:block ml-1 text-rose-900"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex gap-6 justify-center">
          {[
            { label: 'Feriado', color: 'bg-rose-400' },
            { label: 'Examen', color: 'bg-amber-400' },
            { label: 'Evento', color: 'bg-blue-400' },
            { label: 'Institucional', color: 'bg-slate-400' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${l.color}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-brand-navy mb-6">Programar Nuevo Evento</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Título</label>
                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10" value={nuevoEvento.titulo} onChange={e => setNuevoEvento({...nuevoEvento, titulo: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Fecha</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10" value={nuevoEvento.fecha} onChange={e => setNuevoEvento({...nuevoEvento, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10" value={nuevoEvento.tipo} onChange={e => setNuevoEvento({...nuevoEvento, tipo: e.target.value as any})}>
                    <option>Evento</option><option>Feriado</option><option>Examen</option><option>Institucional</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Descripción</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10 h-24" value={nuevoEvento.descripcion} onChange={e => setNuevoEvento({...nuevoEvento, descripcion: e.target.value})}></textarea>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-grow py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={handleSave} className="flex-grow py-3 rounded-xl font-bold bg-brand-navy text-white shadow-lg shadow-brand-navy/20">Guardar Evento</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};