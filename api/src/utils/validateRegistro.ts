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
