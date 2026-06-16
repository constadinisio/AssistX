import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Send, Check } from 'lucide-react';

interface TopBarProps {
  userRole: string;
}

interface Notificacion {
  id: number;
  id_alumno: number;
  nombre: string;
  apellido: string;
  tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual';
  faltas: number;
  mensaje: string;
  estado: 'nueva' | 'gestionada';
  leida: number;
}

export const TopBar: React.FC<TopBarProps> = ({ userRole }) => {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const token = () => localStorage.getItem('token');

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notificaciones', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setNotifs(await res.json());
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const noLeidas = notifs.filter(n => n.leida === 0).length;

  const marcarLeida = async (id: number) => {
    try {
      await fetch(`/api/notificaciones/${id}/leida`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, leida: 1 } : n)));
    } catch (e) {
      console.error('Error marcando leída:', e);
    }
  };

  const enviarAviso = async (n: Notificacion) => {
    try {
      await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id_alumno: n.id_alumno, id_notificacion: n.id, motivo: 'Aviso a la familia por riesgo de asistencias' }),
      });
      setNotifs(prev => prev.map(x => (x.id === n.id ? { ...x, estado: 'gestionada' } : x)));
    } catch (e) {
      console.error('Error enviando aviso:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 ml-64">
      <div className="flex items-center gap-4 flex-grow">
        <img src="/images/EncabezadoET20.webp" alt="Encabezado-ET20" className="h-11 w-auto object-contain opacity-90" />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)} className="p-2 hover:bg-slate-50 rounded-full transition-colors relative text-slate-500">
            <Bell size={20} />
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                {noLeidas}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
              <div className="p-4 border-b border-slate-100 font-black text-brand-navy text-sm uppercase tracking-tight">
                Notificaciones de Riesgo
              </div>
              {notifs.length === 0 ? (
                <p className="p-6 text-center text-slate-400 text-sm font-medium">No hay notificaciones.</p>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className={`p-4 border-b border-slate-50 ${n.leida === 0 ? 'bg-rose-50/40' : ''}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className={n.tipo === 'Critico' || n.tipo === 'RegularidadAnual' ? 'text-rose-600 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                      <div className="flex-grow">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{n.mensaje}</p>
                        <div className="flex gap-2 mt-2">
                          {n.estado !== 'gestionada' ? (
                            <button onClick={() => enviarAviso(n)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy hover:underline">
                              <Send size={12} /> Enviar Aviso
                            </button>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Gestionada</span>
                          )}
                          {n.leida === 0 && (
                            <button onClick={() => marcarLeida(n.id)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                              <Check size={12} /> Marcar leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 leading-none">
              {userRole === 'Secretario/a' ? 'Marta López' : userRole === 'Preceptor/a' ? 'Ricardo Gómez' : 'Prof. Javier Rossi'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              {userRole === 'Secretario/a' ? 'Secretaría Institucional' : userRole === 'Preceptor/a' ? 'Preceptor de Turno' : 'Departamento de Ed. Física'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full border border-slate-200 overflow-hidden shadow-sm">
            <img src={
              userRole === 'Secretario/a' ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' :
              userRole === 'Preceptor/a' ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' :
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'
            } alt="Perfil" />
          </div>
        </div>
      </div>
    </header>
  );
};
