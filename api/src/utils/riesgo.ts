export type NivelRiesgo = 'Normal' | 'Riesgo' | 'Critico';

const PESOS: Record<string, number> = {
  'Ausente': 1,
  'Tarde': 0.5,
  'Retiro': 0.5,
};

export const UMBRAL_RIESGO_BIMESTRAL = 4;
export const UMBRAL_CRITICO_BIMESTRAL = 5;
export const UMBRAL_REGULARIDAD_ANUAL = 19;

export function peso(estado: string): number {
  return PESOS[estado] ?? 0;
}

export function sumarFaltas(estados: readonly string[]): number {
  return estados.reduce((acc, estado) => acc + peso(estado), 0);
}

export function nivelBimestral(total: number): NivelRiesgo {
  if (total >= UMBRAL_CRITICO_BIMESTRAL) return 'Critico';
  if (total >= UMBRAL_RIESGO_BIMESTRAL) return 'Riesgo';
  return 'Normal';
}

export function superaRegularidadAnual(total: number): boolean {
  return total >= UMBRAL_REGULARIDAD_ANUAL;
}
