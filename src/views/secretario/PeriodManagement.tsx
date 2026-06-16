import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';

interface Periodo {
  id: number;
  nombre: string;
  anio_lectivo: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export const PeriodManagement: React.FC = () => {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [form, setForm] = useState({ nombre: '', anio_lectivo: '2026', fecha_inicio: '', fecha_fin: '' });
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token');

  const cargar = async () => {
    try {
      const res = await fetch('/api/periodos', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setPeriodos(await res.json());
    } catch (e) {
      console.error('Error cargando períodos:', e);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    setError('');
    try {
      const res = await fetch('/api/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, anio_lectivo: Number(form.anio_lectivo) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setForm({ nombre: '', anio_lectivo: '2026', fecha_inicio: '', fecha_fin: '' });
        await cargar();
      } else {
        setError(data.message || 'Error al crear el período');
      }
    } catch (e) {
      console.error('Error creando período:', e);
      setError('Error de conexión');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este período?')) return;
    try {
      await fetch(`/api/periodos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      await cargar();
    } catch (e) {
      console.error('Error eliminando período:', e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 ml-64">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-black text-brand-navy tracking-tight">Períodos / Bimestres</h2>
          <p className="text-slate-500 font-medium">Definí los bimestres del ciclo lectivo que usa el cálculo de riesgo.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm md:col-span-2" />
          <input placeholder="Año" type="number" value={form.anio_lectivo} onChange={(e) => setForm({ ...form, anio_lectivo: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <button onClick={crear} className="md:col-span-5 flex items-center justify-center gap-2 bg-brand-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800">
            <Plus size={18} /> Agregar período
          </button>
        </div>
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl p-3 font-medium">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
          {periodos.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-sm">No hay períodos cargados.</p>
          ) : (
            periodos.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <CalendarRange className="text-brand-navy" size={20} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{p.nombre} <span className="text-slate-400">({p.anio_lectivo})</span></p>
                    <p className="text-xs text-slate-500">{new Date(p.fecha_inicio).toLocaleDateString()} → {new Date(p.fecha_fin).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => eliminar(p.id)} className="text-rose-500 hover:text-rose-700 p-2"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
