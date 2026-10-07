// api/src/utils/roles.ts
import { ROLES_VALIDOS, RolValido } from './validateRegistro';

// Roles con acceso a los paneles de gestión (usuarios, alumnos, cursos, períodos, eventos).
export const ROLES_GESTION: readonly RolValido[] = ['Secretario/a', 'Directivo/a'];

export function esRolGestion(rol: unknown): boolean {
  return ROLES_GESTION.includes(rol as RolValido);
}

/**
 * Indica si un usuario con rol `actor` puede asignar el rol `destino` a otro usuario.
 * Solo los roles de gestión asignan roles, y solo un Directivo/a puede crear otro Directivo/a.
 */
export function puedeAsignarRol(actor: unknown, destino: unknown): boolean {
  if (!esRolGestion(actor)) return false;
  if (!ROLES_VALIDOS.includes(destino as RolValido)) return false;
  if (destino === 'Directivo/a') return actor === 'Directivo/a';
  return true;
}
