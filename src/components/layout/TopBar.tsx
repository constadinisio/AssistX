import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Send, Check, CheckCheck } from 'lucide-react';
import {
  Notificacion,
  listarNotificaciones,
  marcarLeida as marcarLeidaApi,
  marcarTodasLeidas,
  enviarAviso as enviarAvisoApi,
  textoGestion,
} from '../../services/notificaciones';

interface TopBarProps {
  userRole: string;
}

interface PerfilDemo {
  nombre: string;
  area: string;
}

const PERFILES: Record<string, PerfilDemo> = {
  'Directivo/a': {
    nombre: 'Laura Fernández',
    area: 'Dirección',
  },
  'Secretario/a': {
    nombre: 'Marta López',
    area: 'Secretaría Institucional',
  },
  'Preceptor/a': {
    nombre: 'Ricardo Gómez',
    area: 'Preceptor de Turno',
  },
};

const PERFIL_EF: PerfilDemo = {
  nombre: 'Prof. Javier Rossi',
  area: 'Departamento de Ed. Física',
};

export const TopBar: React.FC<TopBarProps> = ({ userRole }) => {
  const perfil = PERFILES[userRole] ?? PERFIL_EF;
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      setNotifs(await listarNotificaciones());
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
    setError(null);
    try {
      await marcarLeidaApi(id);
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, leida: 1 } : n)));
    } catch (e) {
      console.error('Error marcando leída:', e);
      setError('No se pudo marcar la notificación como leída.');
    }
  };

  const marcarTodas = async () => {
    setError(null);
    try {
      await marcarTodasLeidas();
      setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (e) {
      console.error('Error marcando todas como leídas:', e);
      setError('No se pudieron marcar las notificaciones como leídas.');
    }
  };

  const enviarAviso = async (n: Notificacion) => {
    if (n.id_alumno === null) return;
    setError(null);
    const r = await enviarAvisoApi({ id_alumno: n.id_alumno, id_notificacion: n.id });
    if ('message' in r) {
      setError(r.message);
      return;
    }
    // Éxito o ya gestionada por otra persona: recargar para mostrar quién y cuándo.
    await fetchNotifs();
  };

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 ml-64">
      <div className="flex items-center gap-4 flex-grow">
        <img src="/images/Encabezado-et20.jpg" alt="Encabezado-ET20" className="h-11 w-auto object-contain opacity-90" />
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
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-black text-brand-navy text-sm uppercase tracking-tight">Notificaciones</span>
                {noLeidas > 0 && (
                  <button onClick={marcarTodas} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                    <CheckCheck size={12} /> Marcar todas
                  </button>
                )}
              </div>
              {error && (
                <p className="px-4 py-2 text-[11px] font-medium text-rose-600 bg-rose-50 border-b border-rose-100">{error}</p>
              )}
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
                            n.id_alumno !== null && (
                              <button onClick={() => enviarAviso(n)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy hover:underline">
                                <Send size={12} /> Enviar Aviso
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{textoGestion(n)}</span>
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
              {perfil.nombre}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              {perfil.area}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
