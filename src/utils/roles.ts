// Roles con acceso a los paneles de gestión. Debe coincidir con api/src/utils/roles.ts.
export const ROLES_GESTION = ['Secretario/a', 'Directivo/a'] as const;

export const isGestion = (role: string): boolean =>
  (ROLES_GESTION as readonly string[]).includes(role);
