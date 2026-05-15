import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  CheckCircle2 
} from 'lucide-react';
import { mockStudents, mockCourses } from '../../data';
import { AttendanceStatus } from '../../types';

interface AttendanceBoardProps {
  userRole: string;
}

export const AttendanceBoard: React.FC<AttendanceBoardProps> = ({ userRole }) => {
  const isEF = userRole === 'Profesor EF';
  const [selectedCourse, setSelectedCourse] = useState(mockCourses[0]);
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus, obs: string }>>(
    mockStudents.reduce((acc, s) => ({ ...acc, [s.id]: { status: 'Present', obs: '' } }), {})
  );

  const stats = {
    total: mockStudents.length,
    present: Object.values(attendance).filter(a => (a as any).status === 'Present').length,
    absent: Object.values(attendance).filter(a => (a as any).status === 'Absent').length,
    late: Object.values(attendance).filter(a => (a as any).status === 'Late').length,
    withdrawal: Object.values(attendance).filter(a => (a as any).status === 'Withdrawal').length,
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleObsChange = (studentId: string, obs: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], obs }
    }));
  };

  const handleSubmit = () => {
    const data = {
      course: selectedCourse.code,
      timestamp: new Date().toISOString(),
      attendance: attendance
    };
    console.log('Submitting Attendance:', data);
    alert(isEF ? `Reporte de clase de Ed. Física enviado con éxito para ${selectedCourse.name}` : `Attendance data submitted successfully for ${selectedCourse.name}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 pb-12 ml-64 min-h-screen bg-slate-50/30"
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-black text-brand-navy tracking-tight">
              {isEF ? 'Panel del Profesor de Educación Física' : 'Preceptor Attendance Board'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isEF ? 'Gestioná la asistencia de tus grupos y clases deportivas.' : 'Register daily attendance and track real-time classroom statistics.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
              {isEF ? 'Grupo/Año:' : 'Section:'}
            </p>
            <div className="flex gap-1">
              {mockCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCourse.id === course.id 
                    ? 'bg-brand-navy text-white shadow-md' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {course.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Alumnos', value: stats.total, color: 'text-brand-navy' },
            { label: 'Presentes', value: stats.present, color: 'text-emerald-600' },
            { label: 'Ausentes', value: stats.absent, color: 'text-rose-600' },
            { label: isEF ? 'Con Retiro/Tarde' : 'Exceptions', value: stats.late + stats.withdrawal, color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
              <h4 className={`text-2xl font-black ${s.color}`}>{s.value}</h4>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-navy rounded-xl flex items-center justify-center text-white">
                <CalendarDays size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{selectedCourse.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{isEF ? 'Complejo Deportivo' : selectedCourse.room} • {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <button 
              onClick={handleSubmit}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-95 transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
            >
              <CheckCircle2 size={18} /> {isEF ? 'Finalizar Clase' : 'Finish Attendance Report'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Alumno</th>
                  <th className="px-8 py-5">Estado de Asistencia</th>
                  <th className="px-8 py-5">{isEF ? 'Observaciones de Clase' : 'Internal Observations'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">{student.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        {(['Present', 'Absent', 'Late', 'Withdrawal'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              attendance[student.id]?.status === status
                              ? status === 'Present' ? 'bg-emerald-600 text-white shadow-md' :
                                status === 'Absent' ? 'bg-rose-600 text-white shadow-md' :
                                status === 'Late' ? 'bg-amber-500 text-white shadow-md' :
                                'bg-brand-navy text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {status === 'Withdrawal' ? 'Retiro' : status === 'Present' ? 'Pres' : status === 'Absent' ? 'Aus' : 'Tarde'}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <input 
                        type="text"
                        value={attendance[student.id]?.obs}
                        onChange={(e) => handleObsChange(student.id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-navy/10 focus:border-brand-navy/30 transition-all italic placeholder:text-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
