import React, { useState } from 'react';
import { 
  School, 
  AlertTriangle, 
  BadgeCheck, 
  Lock, 
  Eye, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hardcoded credentials for differentiation
    if (dni === '123' && password === 'admin123') {
      onLogin('Secretario');
    } else if (dni === '456' && password === 'precept123') {
      onLogin('Preceptor');
    } else if (dni === '789' && password === 'pe123') {
      onLogin('Profesor EF');
    } else {
      setError('Credenciales Inválidas');
    }
  };
  
  return (
    <div className="min-h-screen grid lg:grid-cols-12 overflow-hidden">
      <div className="lg:col-span-7 flex flex-col bg-white p-8 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
        
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full z-10">
          <div className="mb-12">
            <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
              <School size={28} />
            </div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tighter">AssistX</h1>
            <p className="text-slate-500 font-medium">Panel Adminitrativo Escolar</p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-xl shadow-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Inicio de Sesión</h2>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DNI número</label>
                <div className="relative">
                  <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all"
                    placeholder="Ingresar DNI (sin puntos ni guiones)"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                  
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPass ? 'text' : 'password'}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy" />
                <span className="text-xs text-slate-500 font-medium">Recordar este dispositivo</span>
              </label>

              <button 
                type="submit"
                className="w-full py-4 bg-brand-navy text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-navy/10 active:scale-[0.98] transition-all"
              >
                Acceder <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3">
              <ShieldCheck className="text-brand-slate shrink-0" size={20} />
              <p className="text-[11px] text-slate-500 italic leading-relaxed">
                Sesión asegurada. El acceso está únicamente restringido para gente del personal.
              </p>
            </div>
          </div>

          <div className="mt-12 flex justify-center gap-4 text-slate-400 text-xs font-medium">
            <button className="hover:text-brand-navy transition-colors">Privacidad</button>
            <span>•</span>
            <button className="hover:text-brand-navy transition-colors">Términos</button>
          </div>
        </div>

        <p className="mt-auto text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pt-8">
          © 2026 AssistX • Todos los derechos reservados
        </p>
      </div>

      <div className="hidden lg:col-span-5 lg:block relative bg-brand-navy overflow-hidden">
        <img 
          src="images/front_et20.webp" 
          className="w-full h-full object-cover mix-blend-overlay"
          alt="Imagen Escuela"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-brand-navy/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <div className="w-16 h-1 bg-white/30 mb-8 rounded-full"></div>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-6">
           Eficiencia en la gestión educativa
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
          </p>
        </div>
      </div>
    </div>
  );
};
