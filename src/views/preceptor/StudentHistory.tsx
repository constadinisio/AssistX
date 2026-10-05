import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';

export const StudentHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudentDni, setSelectedStudentDni] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/historial/${searchTerm}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSelectedStudentDni(null);
      }
    } catch (error) {
      console.error("Error al buscar historial:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar resultados por alumno único para la lista inicial
  const uniqueStudents = Array.from(new Set(results.map(r => r.dni))).map(dni => {
    return results.find(r => r.dni === dni);
  });

  // Filtrar el historial del alumno seleccionado (solo registros con fecha)
  const studentHistory = results.filter(r => r.dni === selectedStudentDni && r.fecha !== null);
  const currentStudent = uniqueStudents.find(s => s.dni === selectedStudentDni);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="p-8 ml-64"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-black text-brand-navy mb-4">Historial de Asistencia</h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-medium">
            Tip: Puedes buscar por DNI, Nombre o Apellido.
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex gap-2"
          >
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Ingrese el ID del alumno..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="bg-brand-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 font-medium">Buscando registros...</div>
        ) : results.length > 0 ? (
          !selectedStudentDni ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">Alumnos Encontrados ({uniqueStudents.length})</h3>
              <div className="grid grid-cols-1 gap-3">
                {uniqueStudents.map((student) => (
                  <div key={student.dni} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-navy transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-brand-navy font-bold">
                        {student.nombre[0]}{student.apellido[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{student.apellido}, {student.nombre}</h4>
                        <p className="text-sm text-slate-500">DNI: {student.dni}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedStudentDni(student.dni)}
                      className="flex items-center gap-2 text-brand-navy font-black text-xs uppercase tracking-widest hover:bg-slate-50 px-4 py-2 rounded-xl transition-all"
                    >
                      Ver Historial <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button 
                  onClick={() => setSelectedStudentDni(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-brand-navy font-bold text-sm transition-colors"
                >
                  <ArrowLeft size={18} /> Volver a la lista
                </button>
                <div className="text-right">
                  <h3 className="font-black text-brand-navy uppercase text-sm">{currentStudent?.apellido}, {currentStudent?.nombre}</h3>
                  <p className="text-xs text-slate-500 font-medium">Historial Completo</p>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Curso</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentHistory.length > 0 ? (
                    studentHistory.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">
                          {new Date(reg.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {reg.anio} {reg.division}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            reg.estado === 'Presente' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {reg.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 italic">
                          {reg.observaciones || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                        Este alumno no registra inasistencias ni actividades aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : searchTerm && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No se encontraron registros para este alumno.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};