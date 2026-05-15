import React from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Search, 
  Settings, 
  XCircle 
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const users = [
    { name: 'Rodriguez, Martina', email: 'martina.r@assistx.edu', dni: '22.455.908', role: 'Admin', lastLogin: '2 mins ago', status: 'Active' },
    { name: 'Juarez, Pablo', email: 'p.juarez@assistx.edu', dni: '30.112.544', role: 'Preceptor', lastLogin: 'Today, 08:14', status: 'Active' },
    { name: 'Sosa, Gabriela', email: 'g.sosa@assistx.edu', dni: '27.889.332', role: 'Management', lastLogin: 'Yesterday', status: 'Active' },
    { name: 'Lopez, Facundo', email: 'f.lopez@assistx.edu', dni: '34.566.001', role: 'PE Teacher', lastLogin: 'Aug 20, 2024', status: 'Active' },
    { name: 'Mendez, Ana', email: 'a.mendez@assistx.edu', dni: '18.233.119', role: 'Preceptor', lastLogin: 'Inactive', status: 'Disabled' },
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
            <h1 className="text-3xl font-black text-brand-navy tracking-tight">Control de Usuario</h1>
            <p className="text-slate-500 font-medium">Gestionar el acceso administrativo y las credenciales del personal en todos los departamentos de la institución.</p>
          </div>
          <button className="bg-brand-navy text-white font-bold flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95">
            <UserPlus size={18} /> Create User
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Active Users', value: '42', icon: ShieldCheck, trend: '+2 new' },
            { label: 'Pending Resets', value: '5', icon: Lock, trend: 'Avg 14m' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><stat.icon size={20} /></div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">{stat.trend}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-brand-navy tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" placeholder="Filter by name or DNI..." />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Name & Profile</th>
                <th className="px-8 py-4">DNI (Login)</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Last Login</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user, i) => (
                <tr key={i} className={`hover:bg-slate-50/30 transition-colors group ${user.status === 'Disabled' ? 'opacity-50 italic' : ''}`}>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200">
                        {user.name.split(',')[0][0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none mb-1 uppercase tracking-tight">{user.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 lowercase tracking-widest">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 font-mono text-xs text-slate-600">{user.dni}</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-slate-400">{user.lastLogin}</td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><Settings size={16} /></button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><Lock size={16} /></button>
                      <button className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"><XCircle size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
