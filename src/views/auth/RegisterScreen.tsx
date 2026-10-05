import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

const ROLES = ['Preceptor/a', 'Profesor/a EF'] as const;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onBackToLogin }) => {
  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', usuario: '', email: '', password: '', rol: 'Preceptor/a'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (campo: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [campo]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          dni: form.dni.trim(),
          usuario: form.usuario.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: form.rol
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'No se pudo completar el registro.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[380px] bg-white border border-slate-200 p-8 rounded-xl shadow-sm text-center space-y-4">
          <div className="flex justify-center"><CheckCircle2 className="text-emerald-600" size={48} /></div>
          <h2 className="text-lg font-bold text-slate-800">Solicitud enviada</h2>
          <p className="text-sm text-slate-500">
            Tu cuenta quedó <strong>pendiente de aprobación</strong>. Un Secretario/a la revisará antes de que puedas ingresar.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full py-2 bg-brand-navy text-white rounded-lg font-bold hover:opacity-90 transition-all active:scale-[0.98]"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="images/AssistX.png" alt="AssistX Logo" className="w-16 h-16 object-cover rounded-2xl shadow-xl shadow-brand-navy/20 border-2 border-white mb-3" />
        <h1 className="text-2xl font-black text-brand-navy tracking-tight">AssistX</h1>
      </div>

      <div className="w-full max-w-[380px]">
        <div className="bg-white border border-slate-200 p-7 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Crear cuenta de personal</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <input required value={form.nombre} onChange={update('nombre')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Apellido</label>
                <input required value={form.apellido} onChange={update('apellido')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">DNI</label>
              <input required value={form.dni} onChange={update('dni')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm font-mono" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nombre de usuario</label>
              <input required value={form.usuario} onChange={update('usuario')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email institucional</label>
              <input required type="email" value={form.email} onChange={update('email')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Contraseña</label>
              <input required type="password" value={form.password} onChange={update('password')}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rol solicitado</label>
              <select value={form.rol} onChange={update('rol')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm font-bold text-slate-700">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <button type="submit" disabled={isLoading}
              className={`w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </div>

        <button onClick={onBackToLogin}
          className="mt-4 w-full flex items-center justify-center gap-1 text-[12px] text-slate-500 hover:text-brand-navy font-medium transition-colors">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
};
