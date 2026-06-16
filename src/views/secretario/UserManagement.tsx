import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Search, 
  Settings,
  XCircle,
  Check,
  Clock
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    usuario: '',
    password: '',
    rol: 'Preceptor/a'
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/usuarios', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendientes = async () => {
    try {
      const response = await fetch('/api/admin/usuarios/pendientes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) setPendientes(await response.json());
    } catch (error) {
      console.error('Error al cargar solicitudes pendientes:', error);
    }
  };

  const aprobar = async (id: number, rol: string) => {
    const response = await fetch(`/api/admin/usuarios/${id}/aprobar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ rol })
    });
    if (response.ok) { fetchPendientes(); fetchUsers(); }
    else alert('Error al aprobar la solicitud');
  };

  const rechazar = async (id: number) => {
    const response = await fetch(`/api/admin/usuarios/${id}/rechazar`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.ok) fetchPendientes();
    else alert('Error al rechazar la solicitud');
  };

  useEffect(() => {
    fetchUsers();
    fetchPendientes();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchUsers(); // Recargar lista
        setFormData({ nombre: '', apellido: '', usuario: '', password: '', rol: 'Preceptor/a' });
      } else {
        alert("Error al crear usuario");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const filteredUsers = users.filter(user => 
    `${user.apellido} ${user.nombre}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.usuario.includes(searchQuery)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 ml-64" // Keep ml-64 for sidebar spacing
    >
      <div className="max-w-[1440px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tight">Control de Usuario</h1>
            <p className="text-slate-500 font-medium">Gestionar el acceso administrativo y las credenciales del personal en todos los departamentos de la institución.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-brand-navy text-white font-bold flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
          > 
            <UserPlus size={18} /> Crear Usuario
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Usuarios en Sistema', value: users.length.toString(), icon: ShieldCheck, trend: 'Sincronizado' },
            { label: 'Roles Definidos', value: '3', icon: Lock, trend: 'Seguro' },
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

        {pendientes.length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-amber-100 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <h2 className="font-black text-amber-700 uppercase tracking-tight text-sm">
                Solicitudes pendientes ({pendientes.length})
              </h2>
            </div>
            <div className="divide-y divide-amber-100">
              {pendientes.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{p.apellido}, {p.nombre}</p>
                    <p className="text-[11px] font-bold text-slate-400">
                      {p.usuario} · DNI {p.dni} · {p.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={p.rol}
                      id={`rol-${p.id}`}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10"
                    >
                      <option value="Secretario/a">Secretario/a</option>
                      <option value="Preceptor/a">Preceptor/a</option>
                      <option value="Profesor/a EF">Profesor/a EF</option>
                    </select>
                    <button
                      onClick={() => aprobar(p.id, (document.getElementById(`rol-${p.id}`) as HTMLSelectElement).value)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Check size={14} /> Aprobar
                    </button>
                    <button
                      onClick={() => rechazar(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50 transition-all active:scale-95"
                    >
                      <XCircle size={14} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10" 
                placeholder="Filtrar por nombre o DNI..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Nombre y Perfil</th>
                <th className="px-8 py-4">DNI (Acceso)</th>
                <th className="px-8 py-4">Rol</th>
                <th className="px-8 py-4">Último Acceso</th>
                <th className="px-8 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando personal...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No se encontraron usuarios</td></tr>
              ) : filteredUsers.map((user, i) => (
                <tr key={user.id || i} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-200">
                        {user.apellido[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none mb-1 uppercase tracking-tight">
                          {user.apellido}, {user.nombre}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 lowercase tracking-widest">{user.usuario}@assistx.edu</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 font-mono text-xs text-slate-600">{user.usuario}</td>
                  <td className="px-8 py-4"> 
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-slate-400">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td> 
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

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/20 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-brand-navy uppercase tracking-tight">Nuevo Miembro del Personal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nombre</label>
                  <input 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Apellido</label>
                  <input 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10"
                    value={formData.apellido}
                    onChange={e => setFormData({...formData, apellido: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Usuario (DNI)</label>
                <input 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-navy/10"
                  value={formData.usuario}
                  onChange={e => setFormData({...formData, usuario: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Contraseña Temporal</label>
                <input 
                  required
                  type="password"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Rol Asignado</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10"
                  value={formData.rol}
                  onChange={e => setFormData({...formData, rol: e.target.value})}
                >
                  <option value="Secretario/a">Secretario/a</option>
                  <option value="Preceptor/a">Preceptor/a</option>
                  <option value="Profesor/a EF">Profesor/a EF</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-navy text-white font-bold py-3 rounded-xl mt-4 shadow-lg shadow-brand-navy/20 hover:brightness-110 transition-all active:scale-[0.98]"
              >
                Confirmar y Registrar
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
