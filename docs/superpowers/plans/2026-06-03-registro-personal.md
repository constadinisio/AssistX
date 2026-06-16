# Plan de Implementación — Auto-Registro de Personal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el personal se auto-registre desde el Login con un formulario de información; la cuenta queda Pendiente hasta que un Secretario/a la apruebe o rechace.

**Architecture:** Enfoque A — se extiende la tabla `usuarios` con `dni`, `email` y `estado`. Endpoint público `POST /api/auth/register` inserta en estado `Pendiente`; el login solo deja entrar a `Activo`; el Secretario/a aprueba/rechaza desde una sección dentro de `UserManagement`. Se incluye limpieza de seguridad del login (backdoor `admin123`, fallback de `JWT_SECRET`, logs de PII).

**Tech Stack:** React 19 + Vite + Tailwind (frontend), Node + Express 5 + TypeScript + `mysql2` (backend, sin ORM), bcrypt + JWT. Validación manual (sin Zod). Verificación manual + `tsc` (sin framework de tests).

**Spec de referencia:** `docs/superpowers/specs/2026-06-03-registro-personal-design.md`

---

## ⚠️ Antes de empezar (decisión de rama)

La rama `master` tiene muchos cambios sin commitear. Antes de ejecutar este plan, definir la estrategia de rama (recomendado: crear rama `feat/registro-personal` partiendo del estado actual). Los pasos de commit del plan asumen que ya se trabaja en una rama de feature.

## Estructura de archivos

**Nuevos:**
- `db/migrations/2026-06-03_add_registro_fields.sql` — migración del esquema.
- `api/src/utils/validateRegistro.ts` — validación + whitelist de roles (reutilizable).
- `src/views/auth/RegisterScreen.tsx` — pantalla pública de registro.

**Modificados:**
- `api/src/controllers/authController.ts` — `register` + endurecimiento de `login`.
- `api/src/middlewares/authMiddleware.ts` — quitar fallback de `JWT_SECRET`.
- `api/src/app.ts` — fail-fast si falta `JWT_SECRET`.
- `api/src/controllers/adminController.ts` — pendientes/aprobar/rechazar + filtro de activos.
- `api/src/routes/authRoutes.ts` — ruta `register`.
- `api/src/routes/adminRoutes.ts` — rutas de pendientes/aprobar/rechazar.
- `src/App.tsx` — sub-estado `authView` (login ↔ register).
- `src/views/auth/LoginScreen.tsx` — etiqueta "Usuario" + link a registro.
- `src/views/secretario/UserManagement.tsx` — sección "Solicitudes pendientes".

---

## Task 1: Migración del esquema `usuarios`

**Files:**
- Create: `db/migrations/2026-06-03_add_registro_fields.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Migración: agrega dni, email y estado a usuarios (auto-registro de personal)
-- Ejecutar manualmente en phpMyAdmin sobre la base assistx_db.

ALTER TABLE usuarios
  ADD COLUMN dni    VARCHAR(15)  NULL AFTER apellido,
  ADD COLUMN email  VARCHAR(150) NULL AFTER usuario,
  ADD COLUMN estado ENUM('Pendiente','Activo','Rechazada') NOT NULL DEFAULT 'Pendiente' AFTER rol,
  ADD UNIQUE KEY uq_usuarios_dni   (dni),
  ADD UNIQUE KEY uq_usuarios_email (email);

-- Los usuarios seed existentes quedan activos
UPDATE usuarios SET estado = 'Activo';
```

- [ ] **Step 2: Ejecutar la migración**

En phpMyAdmin → base `assistx_db` → pestaña SQL → pegar y ejecutar el script.

- [ ] **Step 3: Verificar manualmente**

En phpMyAdmin, ejecutar: `DESCRIBE usuarios;` → confirmar columnas `dni`, `email`, `estado`.
Ejecutar: `SELECT usuario, estado FROM usuarios;` → los 3 seed (admin, preceptor1, profe_ef) en `Activo`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/2026-06-03_add_registro_fields.sql
git commit -m "feat(db): agregar dni, email y estado a usuarios para auto-registro"
```

---

## Task 2: Helper de validación del backend

**Files:**
- Create: `api/src/utils/validateRegistro.ts`

- [ ] **Step 1: Escribir el helper completo**

```typescript
// api/src/utils/validateRegistro.ts
export const ROLES_VALIDOS = ['Secretario/a', 'Preceptor/a', 'Profesor/a EF'] as const;
export type RolValido = typeof ROLES_VALIDOS[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAMPOS_REQUERIDOS = ['nombre', 'apellido', 'dni', 'usuario', 'email', 'password', 'rol'] as const;

/**
 * Valida el body de registro. Devuelve una lista de errores (vacía si es válido).
 */
export function validateRegistro(body: unknown): string[] {
  const errores: string[] = [];
  const data = (body ?? {}) as Record<string, unknown>;

  for (const campo of CAMPOS_REQUERIDOS) {
    const valor = data[campo];
    if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El campo "${campo}" es obligatorio.`);
    }
  }
  // Si falta algún requerido, no seguimos con validaciones de formato.
  if (errores.length > 0) return errores;

  if (!EMAIL_RE.test(data.email as string)) {
    errores.push('El email no tiene un formato válido.');
  }
  if ((data.password as string).length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres.');
  }
  if (!ROLES_VALIDOS.includes(data.rol as RolValido)) {
    errores.push('El rol seleccionado no es válido.');
  }
  return errores;
}
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `validateRegistro.ts`.

- [ ] **Step 3: Commit**

```bash
git add api/src/utils/validateRegistro.ts
git commit -m "feat(api): helper de validación de registro y whitelist de roles"
```

---

## Task 3: Fail-fast de `JWT_SECRET` en arranque

**Files:**
- Modify: `api/src/app.ts` (después del bloque de `dotenv.config()`)

- [ ] **Step 1: Agregar la guarda tras cargar dotenv**

En `api/src/app.ts`, justo después del bloque `if (envResult.error) { ... }` y antes de los `import express`, agregar:

```typescript
if (!process.env.JWT_SECRET) {
    console.error("❌ Falta la variable de entorno JWT_SECRET. El servidor no arranca por seguridad.");
    process.exit(1);
}
```

- [ ] **Step 2: Verificar que `.env` tiene `JWT_SECRET`**

Confirmar que el `.env` local define `JWT_SECRET` (cualquier string largo). Si no existe, agregarlo:
`JWT_SECRET="<cadena-larga-aleatoria>"`

- [ ] **Step 3: Verificar arranque**

Run: `cd api && npm run dev`
Expected: arranca normal con `JWT_SECRET` presente. (Probar a quitarla temporalmente → debe imprimir el error y salir; volver a ponerla.)

- [ ] **Step 4: Commit**

```bash
git add api/src/app.ts
git commit -m "feat(api): fail-fast al arrancar si falta JWT_SECRET"
```

---

## Task 4: Endurecer `authController` (register + login)

**Files:**
- Modify: `api/src/controllers/authController.ts` (reescritura completa del archivo)

- [ ] **Step 1: Reescribir el controlador completo**

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { validateRegistro } from '../utils/validateRegistro';

// --- AUTO-REGISTRO PÚBLICO ---
export const register = async (req: Request, res: Response) => {
    const errores = validateRegistro(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ message: errores[0] });
    }

    const { nombre, apellido, dni, usuario, email, password, rol } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO usuarios (nombre, apellido, dni, usuario, email, password, rol, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [nombre.trim(), apellido.trim(), dni.trim(), usuario.trim(), email.trim(), hashedPassword, rol]
        );
        return res.status(201).json({
            message: 'Solicitud de registro enviada. Queda pendiente de aprobación.'
        });
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe una cuenta con ese usuario, DNI o email.' });
        }
        console.error('Error en register:', error);
        return res.status(500).json({ message: 'Error al procesar el registro.' });
    }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
    }

    try {
        const [rows]: any = await pool.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        if (user.estado === 'Pendiente') {
            return res.status(403).json({ message: 'Tu cuenta está pendiente de aprobación.' });
        }
        if (user.estado === 'Rechazada') {
            return res.status(403).json({ message: 'Tu solicitud de acceso fue rechazada.' });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' }
        );

        return res.json({
            token,
            user: {
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
};
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificar runtime (login)**

Con el server corriendo y un usuario `Activo`, probar login con credenciales válidas → 200 + token.
Probar con `password='admin123'` y un usuario cualquiera → debe FALLAR con 401 (el backdoor ya no existe).

- [ ] **Step 4: Commit**

```bash
git add api/src/controllers/authController.ts
git commit -m "feat(api): endpoint register y endurecimiento de login (sin backdoor ni fallback JWT)"
```

---

## Task 5: Quitar fallback de `JWT_SECRET` en el middleware

**Files:**
- Modify: `api/src/middlewares/authMiddleware.ts:10`

- [ ] **Step 1: Reemplazar la línea del fallback**

Cambiar:

```typescript
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
```

por:

```typescript
        const verified = jwt.verify(token, process.env.JWT_SECRET as string);
```

- [ ] **Step 2: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificar runtime**

Con un token válido (del login), pegar a un endpoint protegido (ej. `GET /api/admin/usuarios` con el token de admin) → 200.

- [ ] **Step 4: Commit**

```bash
git add api/src/middlewares/authMiddleware.ts
git commit -m "fix(api): quitar fallback inseguro de JWT_SECRET en authMiddleware"
```

---

## Task 6: Endpoints de gestión de pendientes en `adminController`

**Files:**
- Modify: `api/src/controllers/adminController.ts`

- [ ] **Step 1: Agregar el import de la whitelist de roles**

Al inicio del archivo, junto a los imports existentes, agregar:

```typescript
import { ROLES_VALIDOS } from '../utils/validateRegistro';
```

- [ ] **Step 2: Filtrar `listarUsuarios` a solo activos**

Reemplazar las dos queries dentro de `listarUsuarios` para que filtren por estado activo:

```typescript
        const [rows] = await pool.query(
            "SELECT id, nombre, apellido, usuario, rol, created_at FROM usuarios WHERE estado = 'Activo'"
        ).catch(async (err) => {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.warn("⚠️ Advertencia: Falta la columna created_at en la tabla usuarios.");
                return pool.query(
                    "SELECT id, nombre, apellido, usuario, rol, NULL as created_at FROM usuarios WHERE estado = 'Activo'"
                );
            }
            throw err;
        });
```

- [ ] **Step 3: Agregar los tres handlers nuevos**

Al final del archivo (después de `crearUsuario` o donde corresponda), agregar:

```typescript
// --- GESTIÓN DE SOLICITUDES DE REGISTRO ---
export const listarPendientes = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombre, apellido, dni, usuario, email, rol, created_at
             FROM usuarios WHERE estado = 'Pendiente' ORDER BY created_at ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en listarPendientes:', error);
        res.status(500).json({ message: 'Error al obtener solicitudes pendientes' });
    }
};

export const aprobarUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rol } = req.body;

    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ message: 'El rol seleccionado no es válido.' });
    }

    try {
        const [result]: any = await pool.query(
            `UPDATE usuarios SET estado = 'Activo', rol = COALESCE(?, rol)
             WHERE id = ? AND estado = 'Pendiente'`,
            [rol ?? null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }
        res.json({ message: 'Usuario aprobado correctamente.' });
    } catch (error) {
        console.error('Error en aprobarUsuario:', error);
        res.status(500).json({ message: 'Error al aprobar el usuario' });
    }
};

export const rechazarUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [result]: any = await pool.query(
            `UPDATE usuarios SET estado = 'Rechazada' WHERE id = ? AND estado = 'Pendiente'`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }
        res.json({ message: 'Solicitud rechazada.' });
    } catch (error) {
        console.error('Error en rechazarUsuario:', error);
        res.status(500).json({ message: 'Error al rechazar la solicitud' });
    }
};
```

- [ ] **Step 4: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add api/src/controllers/adminController.ts
git commit -m "feat(api): listar/aprobar/rechazar solicitudes y filtrar usuarios activos"
```

---

## Task 7: Rutas (auth + admin)

**Files:**
- Modify: `api/src/routes/authRoutes.ts`
- Modify: `api/src/routes/adminRoutes.ts`

- [ ] **Step 1: Reescribir `authRoutes.ts`**

```typescript
import { Router } from 'express';
import { login, register } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/register', register);

export default router;
```

- [ ] **Step 2: Actualizar `adminRoutes.ts`**

En el bloque de imports de `adminController`, agregar `listarPendientes, aprobarUsuario, rechazarUsuario`. Luego, en la sección de gestión de usuarios, agregar las rutas:

```typescript
// Solicitudes de registro (pendientes)
router.get('/usuarios/pendientes', verifyToken, isAdmin, listarPendientes);
router.patch('/usuarios/:id/aprobar', verifyToken, isAdmin, aprobarUsuario);
router.patch('/usuarios/:id/rechazar', verifyToken, isAdmin, rechazarUsuario);
```

> **Orden importante:** declarar `/usuarios/pendientes` ANTES que cualquier ruta `/usuarios/:algo` para que Express no la capture como parámetro. En este router no hay conflicto (las otras son `/usuarios` exacta), pero mantener `/usuarios/pendientes` junto a las nuevas.

- [ ] **Step 3: Verificar tipado**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificar runtime (flujo completo backend)**

Con el server corriendo:
1. `POST /api/auth/register` con body válido → 201.
2. Login como `admin` → obtener token.
3. `GET /api/admin/usuarios/pendientes` (con token) → aparece la solicitud.
4. `PATCH /api/admin/usuarios/<id>/aprobar` con `{ "rol": "Preceptor/a" }` → 200.
5. Login con la cuenta recién aprobada → 200 + rol correcto.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/authRoutes.ts api/src/routes/adminRoutes.ts
git commit -m "feat(api): rutas de registro y de gestión de solicitudes pendientes"
```

---

## Task 8: Pantalla pública de registro (`RegisterScreen`)

**Files:**
- Create: `src/views/auth/RegisterScreen.tsx`

- [ ] **Step 1: Escribir el componente completo**

```tsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

const ROLES = ['Secretario/a', 'Preceptor/a', 'Profesor/a EF'] as const;

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
```

- [ ] **Step 2: Verificar tipado**

Run: `npx tsc --noEmit` (desde la raíz del proyecto)
Expected: sin errores en `RegisterScreen.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/views/auth/RegisterScreen.tsx
git commit -m "feat(ui): pantalla pública de registro de personal"
```

---

## Task 9: Integrar navegación de auth (`App.tsx` + `LoginScreen`)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/views/auth/LoginScreen.tsx`

- [ ] **Step 1: Agregar import y sub-estado en `App.tsx`**

Agregar el import junto a los otros de auth:

```tsx
import { RegisterScreen } from './views/auth/RegisterScreen';
```

Dentro del componente `App`, junto a los otros `useState`, agregar:

```tsx
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
```

- [ ] **Step 2: Renderizar Login o Register cuando no hay sesión**

Reemplazar el bloque `{!userRole ? ( <LoginScreen onLogin={handleLogin} /> ) : (` por:

```tsx
      {!userRole ? (
        authView === 'login' ? (
          <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterScreen onBackToLogin={() => setAuthView('login')} />
        )
      ) : (
```

- [ ] **Step 3: Actualizar la firma de props de `LoginScreen`**

En `src/views/auth/LoginScreen.tsx`, cambiar la interfaz y la firma:

```tsx
interface LoginScreenProps {
  onLogin: (role: string) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoToRegister }) => {
```

- [ ] **Step 4: Renombrar etiqueta "DNI" → "Usuario" y agregar link de registro**

En `LoginScreen.tsx`, cambiar el `<label>` del primer campo de `DNI` a `Usuario` y su `placeholder` de `"DNI"` a `"Usuario"`. Luego, dentro del bloque de la tarjeta inferior de soporte, agregar arriba del texto de soporte:

```tsx
          <p className="text-[11px] text-slate-500 font-medium mb-2">
            ¿No tenés cuenta?{' '}
            <button type="button" onClick={onGoToRegister}
              className="text-brand-navy font-bold hover:underline cursor-pointer">
              Registrate acá
            </button>
          </p>
```

> Nota: el estado local de LoginScreen se llama `dni`; podés dejarlo así (es solo el nombre de la variable) o renombrarlo a `usuario`. El body que se envía ya usa la clave `usuario`, así que el backend no se ve afectado.

- [ ] **Step 5: Verificar tipado**

Run: `npx tsc --noEmit` (desde la raíz)
Expected: sin errores.

- [ ] **Step 6: Verificar runtime (UI)**

`npm run dev` → en el Login, el campo dice "Usuario", aparece el link "Registrate acá" → lleva al form → enviar solicitud válida → pantalla de éxito → volver al login. Intentar loguear con esa cuenta → error "pendiente de aprobación".

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/views/auth/LoginScreen.tsx
git commit -m "feat(ui): navegación login/registro y campo de usuario en Login"
```

---

## Task 10: Sección "Solicitudes pendientes" en `UserManagement`

**Files:**
- Modify: `src/views/secretario/UserManagement.tsx`

- [ ] **Step 1: Agregar estado e import de íconos para pendientes**

En el import de `lucide-react`, agregar `Check` y `Clock`. Dentro del componente, junto a los `useState` existentes, agregar:

```tsx
  const [pendientes, setPendientes] = useState<any[]>([]);
```

- [ ] **Step 2: Agregar fetch de pendientes y handlers de aprobar/rechazar**

Agregar dentro del componente, después de `fetchUsers`:

```tsx
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
```

- [ ] **Step 3: Llamar `fetchPendientes` en el `useEffect` inicial**

Cambiar el `useEffect` existente para que también cargue pendientes:

```tsx
  useEffect(() => {
    fetchUsers();
    fetchPendientes();
  }, []);
```

- [ ] **Step 4: Renderizar la sección de pendientes**

Dentro del `<div className="max-w-[1440px] mx-auto space-y-8">`, justo antes del bloque de la tabla de usuarios (`<div className="bg-white border border-slate-200 rounded-3xl ...">`), insertar:

```tsx
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
```

> Nota: `XCircle` ya está importado en el archivo. Solo hay que sumar `Check` y `Clock` al import (Step 1).

- [ ] **Step 5: Verificar tipado**

Run: `npx tsc --noEmit` (desde la raíz)
Expected: sin errores.

- [ ] **Step 6: Verificar runtime (flujo end-to-end)**

`npm run dev` (frontend) + server backend corriendo:
1. Registrar una solicitud desde el Login.
2. Loguear como `admin` → ir a "Control de Usuario" → ver la solicitud en la sección ámbar.
3. Ajustar el rol en el select → Aprobar → desaparece de pendientes y aparece en la tabla de activos.
4. Registrar otra → Rechazar → desaparece de pendientes; intentar loguear con ella → "rechazada".

- [ ] **Step 7: Commit**

```bash
git add src/views/secretario/UserManagement.tsx
git commit -m "feat(ui): sección de solicitudes pendientes con aprobar/rechazar"
```

---

## Verificación final del módulo

Recorrer el **Plan de verificación** de la spec (§9) completo, en especial:
- El backdoor `admin123` ya no permite ingresar.
- Cuenta pendiente → 403; tras aprobar → login OK con el rol asignado.
- Duplicados (usuario/DNI/email) → 409 con mensaje claro.
- `npx tsc --noEmit` limpio en `api/` y en la raíz.

## Follow-ups (fuera de alcance, anotar en Kanban)

- Rehacer seed de usuarios con contraseñas reales hasheadas.
- Alinear `.env.example` con variables reales (`DB_*`, `PORT`, `JWT_SECRET`).
- Montar framework de tests (Vitest + supertest).
- Sistema de Notificaciones (siguiente tarea; el email recolectado acá lo habilita).
