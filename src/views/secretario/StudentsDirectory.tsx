import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  Users, 
  BadgeCheck, 
  AlertTriangle, 
  MoreVertical, 
  Filter, 
  Eye, 
  History 
} from 'lucide-react';
import { mockStudents } from '../../data';

export const StudentsDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'risk' | 'present' | 'absent'>('all');

  const filteredStudents = mockStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.dni.includes(searchTerm);
    const matchesFilter = filter === 'all' || 
                         (filter === 'risk' && s.riskAbsences) || 
                         (filter === 'present' && s.status === 'Present') || 
                         (filter === 'absent' && s.status === 'Absent');
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 ml-64"
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-brand-navy tracking-tight">Student Directory</h2>
            <p className="text-slate-500 font-medium">Manage student profiles, track individual attendance history and risk status.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98]">
            <UserPlus size={18} /> Add Student
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Students', value: '450', icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Active Today', value: '412', icon: BadgeCheck, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Risk Alerts', value: '14', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <button className="text-slate-300 hover:text-slate-500">
                  <MoreVertical size={16} />
                </button>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-brand-navy tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/10 outline-none" 
                placeholder="Search by name or DNI..."
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'risk', 'present', 'absent'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    filter === f 
                    ? 'bg-brand-navy text-white' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
              <div className="w-[1px] bg-slate-200 mx-1"></div>
              <button className="p-2.5 border border-slate-200 rounded-lg hover:bg-white text-slate-500 transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">DNI</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last History</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden ${student.riskAbsences ? 'ring-2 ring-brand-error ring-offset-2' : ''}`}>
                          {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : student.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-brand-navy leading-none mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Section 4-B</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{student.dni}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded inline-block tracking-widest ${
                        student.status === 'Present' ? 'bg-emerald-50 text-emerald-600' :
                        student.status === 'Absent' ? 'bg-rose-50 text-rose-600' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {student.history.map((h, i) => (
                          <div key={i} className={`w-2 h-4 rounded-full ${
                            h === 'present' ? 'bg-emerald-400' : 
                            h === 'absent' ? 'bg-rose-400' : 
                            h === 'late' ? 'bg-amber-400' : 'bg-slate-200'
                          }`} title={h} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all">
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filteredStudents.length} of {mockStudents.length} students</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors">Prev</button>
              <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
