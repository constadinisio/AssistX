import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Upload, FileCheck, AlertCircle } from 'lucide-react';

interface Falta {
  id: number;
  fecha: string;
  estado: string;
  observaciones: string | null;
}

interface AlumnoResultado {
  alumno_id: number;
  dni: string;
  nombre: string;
  apellido: string;
}

export const JustificativosPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [alumno, setAlumno] = useState<AlumnoResultado | null>(null);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [loading, setLoading] = useState(false);
  const [faltaSel, setFaltaSel] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');

  const token = () => localStorage.getItem('token');

  const buscar = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setMensaje('');
    try {
      const res = await fetch(`/api/reports/historial/${searchTerm}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data: any[] = await res.json();
        if (data.length === 0) { setAlumno(null); setFaltas([]); setMensaje('No se encontró el alumno.'); return; }
        const primero = data[0];
        const al: AlumnoResultado = { alumno_id: primero.alumno_id, dni: primero.dni, nombre: primero.nombre, apellido: primero.apellido };
        setAlumno(al);
        await cargarFaltas(al.alumno_id);
      }
    } catch (e) {
      console.error('Error buscando alumno:', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarFaltas = async (alumnoId: number) => {
    try {
      const res = await fetch(`/api/justificativos/faltas/${alumnoId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setFaltas(await res.json());
    } catch (e) {
      console.error('Error cargando faltas:', e);
    }
  };

  const subir = async () => {
    if (!faltaSel || !archivo) { setMensaje('Elegí una falta y un archivo.'); return; }
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('id_asistencia', String(faltaSel));
    if (motivo) form.append('motivo', motivo);
    try {
      const res = await fetch('/api/justificativos', { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMensaje('Justificativo cargado. La falta quedó justificada.');
        setFaltaSel(null);
        setArchivo(null);
        setMotivo('');
        if (alumno) await cargarFaltas(alumno.alumno_id);
      } else {
        setMensaje(data.message || 'Error al cargar el justificativo.');
      }
    } catch (e) {
      console.error('Error subiendo justificativo:', e);
      setMensaje('Error de conexión.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 ml-64">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-black text-brand-navy mb-4">Justificativos</h2>
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar alumno por DNI, nombre o apellido..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-brand-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors">Buscar</button>
          </form>
        </div>

        {mensaje && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-700 text-sm font-medium">{mensaje}</div>
        )}

        {loading ? (
          <div className="text-center py-10 text-slate-500 font-medium">Buscando...</div>
        ) : alumno && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-brand-navy uppercase text-sm">{alumno.apellido}, {alumno.nombre}</h3>
              <p className="text-xs text-slate-500 font-medium">DNI: {alumno.dni} — Faltas sin justificar</p>
            </div>

            {faltas.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileCheck className="mx-auto mb-3 text-slate-300" size={40} />
                <p className="font-medium text-sm">Este alumno no tiene faltas pendientes de justificar.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {faltas.map((f) => (
                  <label key={f.id} className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 ${faltaSel === f.id ? 'bg-brand-navy/5' : ''}`}>
                    <input type="radio" name="falta" checked={faltaSel === f.id} onChange={() => setFaltaSel(f.id)} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{new Date(f.fecha).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">{f.estado}{f.observaciones ? ` — ${f.observaciones}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {faltas.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10"
                />
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-slate-100 file:font-bold file:text-slate-700"
                />
                <button onClick={subir} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:brightness-95 transition-all">
                  <Upload size={18} /> Subir justificativo
                </button>
              </div>
            )}
          </div>
        )}

        {!alumno && !loading && !mensaje && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Buscá un alumno para cargar un justificativo.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
