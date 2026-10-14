// Lógica pura del modelo de notificaciones (sin acceso a DB).
import { ROLES_VALIDOS, RolValido } from './validateRegistro';

export const TIPOS_NOTIFICACION = ['Riesgo', 'Critico', 'RegularidadAnual'] as const;
export type TipoNotificacion = typeof TIPOS_NOTIFICACION[number];

const esRolValido = (rol: string): rol is RolValido =>
  (ROLES_VALIDOS as readonly string[]).includes(rol);

export function esTipoValido(tipo: unknown): tipo is TipoNotificacion {
  return typeof tipo === 'string' && (TIPOS_NOTIFICACION as readonly string[]).includes(tipo);
}

/** Convierte el CSV guardado en DB en una lista de roles válidos (ignora vacíos, duplicados e inválidos). */
export function parsearRolesDestino(csv: unknown): RolValido[] {
  if (typeof csv !== 'string') return [];
  const roles = csv.split(',').map(r => r.trim()).filter(r => r.length > 0);
  return [...new Set(roles)].filter(esRolValido);
}

/** Convierte una lista de roles al CSV que se guarda en DB. Lanza si es inválida: es un error de programación. */
export function serializarRolesDestino(roles: readonly string[]): string {
  const unicos = [...new Set(roles.map(r => r.trim()))];
  if (unicos.length === 0) throw new Error('roles_destino no puede estar vacío');
  const invalidos = unicos.filter(r => !esRolValido(r));
  if (invalidos.length > 0) throw new Error(`Roles inválidos en roles_destino: ${invalidos.join(', ')}`);
  return unicos.join(',');
}

export function esDestinatario(rol: unknown, rolesDestino: unknown): boolean {
  return typeof rol === 'string' && parsearRolesDestino(rolesDestino).includes(rol as RolValido);
}

/** Id entero positivo desde params/body; null si no es válido. */
export function parsearId(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isInteger(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}
