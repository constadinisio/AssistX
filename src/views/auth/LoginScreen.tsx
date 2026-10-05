import React, { useState } from 'react';
import { 
  AlertTriangle, 
  BadgeCheck, 
  Lock, 
  Eye, 
  X
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: string) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Usamos la ruta relativa para que pase por el proxy de Vite (puerto 5000)
      const backendUrl = '/api/auth/login';

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username.trim(), password: password.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.rol);
        onLogin(data.user.rol);
      } else {
        setError(data.message || 'Credenciales Inválidas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };                
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Header con Logo de AssistX */}
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="images/AssistX.png"
          alt="AssistX Logo"
          className="w-20 h-20 object-cover rounded-2xl shadow-xl shadow-brand-navy/20 border-2 border-white mb-4"
        />
        <h1 className="text-2xl font-black text-brand-navy tracking-tight">
          AssistX
        </h1>
      </div>

      <div className="w-full max-w-[340px] space-y-4">
        <div className="bg-white border border-slate-200 p-7 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Iniciar Sesión</h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Usuario</label>
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-all text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    showPass ? 'text-brand-navy' : 'text-slate-400 hover:text-brand-navy'
                  }`}
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Cargando...' : 'Acceder'}
            </button>
          </form>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[11px] text-slate-500 font-medium mb-2">
            ¿No tenés cuenta?{' '}
            <button type="button" onClick={onGoToRegister}
              className="text-brand-navy font-bold hover:underline cursor-pointer">
              Registrate acá
            </button>
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            ¿Problemas con el acceso? Contacte a soporte técnico.
          </p>
        </div>
        
        <div className="flex justify-center gap-4 text-[11px] text-slate-400 font-medium">
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="hover:text-brand-navy transition-colors cursor-pointer"
          >
            Términos y Condiciones
          </button>
          <button className="hover:text-brand-navy transition-colors cursor-pointer">Seguridad</button>
          <button className="hover:text-brand-navy transition-colors cursor-pointer">Contacto</button>
        </div>
      </div>

      {showTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
          onClick={() => setShowTerms(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Términos y Condiciones de Uso – AssistX</h3>
                <p className="text-sm text-slate-500">Última actualización: Mayo 2026</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                aria-label="Cerrar Términos y Condiciones"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                <p className="mb-4 font-bold text-slate-900">Bienvenido/a a AssistX. Al acceder, registrarse o utilizar esta plataforma, usted acepta los presentes Términos y Condiciones de Uso. Si no está de acuerdo con alguno de los puntos establecidos, deberá abstenerse de utilizar el sistema.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">1. Definición del Servicio</h4>
                <p className="mb-4">
                  AssistX es una aplicación web de asistencia digital escolar desarrollada con el objetivo de facilitar la gestión académica y administrativa dentro de instituciones educativas.
                </p>
                <p className="mb-4">La plataforma permite, entre otras funcionalidades:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Registro y gestión de asistencias.</li>
                  <li>Administración de usuarios y roles.</li>
                  <li>Consulta de información académica.</li>
                  <li>Gestión de calendarios escolares.</li>
                  <li>Generación de reportes.</li>
                  <li>Visualización de información institucional.</li>
                  <li>Emisión de notificaciones y alertas.</li>
                </ul>
                <p className="mb-4">AssistX está destinado a instituciones educativas, directivos, docentes, preceptores, profesores, alumnos y tutores autorizados.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">2. Aceptación de los Términos</h4>
                <p className="mb-4">El uso de AssistX implica la aceptación plena y sin reservas de estos Términos y Condiciones.</p>
                <p className="mb-4">La institución educativa y los usuarios autorizados aceptan utilizar la plataforma de manera responsable, ética y conforme a la legislación vigente.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">3. Registro y Acceso</h4>
                <p className="mb-4">Para acceder a determinadas funcionalidades, los usuarios deberán contar con una cuenta habilitada por la institución educativa correspondiente.</p>
                <p className="mb-4">Cada usuario es responsable de:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Mantener la confidencialidad de sus credenciales.</li>
                  <li>No compartir usuarios ni contraseñas.</li>
                  <li>Informar inmediatamente cualquier acceso no autorizado.</li>
                  <li>Utilizar la plataforma únicamente para fines institucionales y educativos.</li>
                </ul>
                <p className="mb-4">AssistX podrá suspender o restringir cuentas ante actividades sospechosas, incumplimientos o usos indebidos.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">4. Roles y Permisos</h4>
                <p className="mb-4">El acceso a la información y funcionalidades del sistema se encuentra regulado mediante un sistema de control de roles.</p>
                <p className="mb-4">Cada usuario únicamente podrá acceder a las funciones correspondientes a su perfil institucional.</p>
                <p className="mb-4">Los principales roles del sistema incluyen:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Secretaría / Administración.</li>
                  <li>Preceptoría.</li>
                  <li>Profesores de Educación Física.</li>
                </ul>
                <p className="mb-4">La institución educativa es responsable de asignar correctamente los permisos de acceso.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">5. Protección de Datos Personales</h4>
                <p className="mb-4">AssistX se compromete a proteger la privacidad y confidencialidad de la información almacenada.</p>
                <p className="mb-4">Los datos personales tratados por la plataforma podrán incluir:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Nombre y apellido.</li>
                  <li>Información académica.</li>
                  <li>Registros de asistencia.</li>
                  <li>Correos electrónicos institucionales.</li>
                  <li>Información de contacto.</li>
                </ul>
                <p className="mb-4">La información será utilizada únicamente con fines educativos, administrativos e institucionales.</p>
                <p className="mb-4">AssistX implementa medidas razonables de seguridad informática, incluyendo:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Encriptación de contraseñas.</li>
                  <li>Control de accesos.</li>
                  <li>Validación de usuarios.</li>
                  <li>Protección contra accesos no autorizados.</li>
                  <li>Respaldo y almacenamiento seguro de datos.</li>
                </ul>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">6. Responsabilidades del Usuario</h4>
                <p className="mb-4">Los usuarios se comprometen a:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Utilizar la plataforma de manera lícita y responsable.</li>
                  <li>No alterar ni intentar vulnerar el funcionamiento del sistema.</li>
                  <li>No acceder a información sin autorización.</li>
                  <li>No distribuir contenido malicioso o fraudulento.</li>
                  <li>Respetar la privacidad de otros usuarios.</li>
                </ul>
                <p className="mb-4">Queda prohibido:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Intentar obtener acceso no autorizado.</li>
                  <li>Modificar registros institucionales sin permiso.</li>
                  <li>Utilizar el sistema para actividades ilegales.</li>
                  <li>Compartir información confidencial fuera del ámbito institucional.</li>
                </ul>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">7. Disponibilidad del Servicio</h4>
                <p className="mb-4">AssistX buscará mantener el servicio disponible y operativo de manera continua durante el ciclo lectivo.</p>
                <p className="mb-4">Sin embargo, la plataforma podrá verse afectada por:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Mantenimiento técnico.</li>
                  <li>Actualizaciones del sistema.</li>
                  <li>Problemas de conectividad.</li>
                  <li>Fallos de infraestructura.</li>
                  <li>Eventos externos fuera del control de los desarrolladores.</li>
                </ul>
                <p className="mb-4">No se garantiza disponibilidad absoluta e ininterrumpida del servicio.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">8. Propiedad Intelectual</h4>
                <p className="mb-4">El diseño, estructura, código fuente, identidad visual, documentación y funcionalidades de AssistX constituyen propiedad intelectual de sus desarrolladores.</p>
                <p className="mb-4">Queda prohibida:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>La reproducción total o parcial del sistema.</li>
                  <li>La distribución no autorizada.</li>
                  <li>La modificación con fines comerciales.</li>
                  <li>La ingeniería inversa del software.</li>
                </ul>
                <p className="mb-4">Salvo autorización expresa de los desarrolladores o responsables del proyecto.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">9. Limitación de Responsabilidad</h4>
                <p className="mb-4">AssistX actúa como una herramienta de gestión institucional.</p>
                <p className="mb-4">Los desarrolladores no serán responsables por:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Errores derivados del uso incorrecto de la plataforma.</li>
                  <li>Carga errónea de información por parte de usuarios.</li>
                  <li>Pérdidas ocasionadas por terceros.</li>
                  <li>Interrupciones de servicios externos.</li>
                  <li>Daños derivados de accesos indebidos ocasionados por negligencia del usuario.</li>
                </ul>
                <p className="mb-4">La institución educativa es responsable de verificar la exactitud de los datos cargados en el sistema.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">10. Uso de Reportes y Datos</h4>
                <p className="mb-4">Los reportes generados por AssistX tienen carácter informativo y administrativo.</p>
                <p className="mb-4">La institución educativa será responsable del uso, interpretación y validación oficial de dichos registros.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">11. Modificaciones de los Términos</h4>
                <p className="mb-4">AssistX podrá actualizar o modificar estos Términos y Condiciones cuando resulte necesario.</p>
                <p className="mb-4">Las modificaciones entrarán en vigencia desde su publicación dentro de la plataforma.</p>
                <p className="mb-4">Se recomienda revisar periódicamente este documento.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">12. Suspensión o Terminación del Servicio</h4>
                <p className="mb-4">AssistX podrá suspender temporal o permanentemente el acceso de usuarios que:</p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">
                  <li>Incumplan estos términos.</li>
                  <li>Realicen actividades sospechosas.</li>
                  <li>Intenten vulnerar la seguridad del sistema.</li>
                  <li>Utilicen la plataforma de forma indebida.</li>
                </ul>
                <p className="mb-4">La institución educativa también podrá solicitar la baja o restricción de cuentas institucionales.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">13. Legislación Aplicable</h4>
                <p className="mb-4">Estos Términos y Condiciones se regirán conforme a las leyes aplicables de la República Argentina.</p>
                <p className="mb-4">Cualquier conflicto relacionado con el uso de la plataforma será tratado bajo la jurisdicción correspondiente.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">14. Contacto</h4>
                <p className="mb-4">Para consultas relacionadas con la plataforma, soporte técnico o reportes de incidentes, la institución educativa podrá comunicarse con el equipo responsable de AssistX mediante los canales oficiales establecidos.</p>
                <div className="border-t border-slate-200 my-5"></div>

                <h4 className="text-base font-semibold text-slate-900 mb-3">15. Conformidad</h4>
                <p className="mb-4">Al utilizar AssistX, el usuario declara haber leído, comprendido y aceptado estos Términos y Condiciones de Uso.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
