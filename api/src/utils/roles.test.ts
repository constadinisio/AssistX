import { describe, it, expect } from 'vitest';
import { esRolGestion, puedeAsignarRol, esRolDeRiesgo, ROLES_RIESGO } from './roles';

describe('esRolGestion', () => {
  it('Secretario/a es de gestión', () => expect(esRolGestion('Secretario/a')).toBe(true));
  it('Directivo/a es de gestión', () => expect(esRolGestion('Directivo/a')).toBe(true));
  it('Preceptor/a no es de gestión', () => expect(esRolGestion('Preceptor/a')).toBe(false));
  it('Profesor/a EF no es de gestión', () => expect(esRolGestion('Profesor/a EF')).toBe(false));
  it('rol inexistente no es de gestión', () => expect(esRolGestion('Hacker')).toBe(false));
  it('undefined no es de gestión', () => expect(esRolGestion(undefined)).toBe(false));
});

describe('puedeAsignarRol', () => {
  it('Directivo/a puede asignar Directivo/a', () =>
    expect(puedeAsignarRol('Directivo/a', 'Directivo/a')).toBe(true));
  it('Secretario/a no puede asignar Directivo/a', () =>
    expect(puedeAsignarRol('Secretario/a', 'Directivo/a')).toBe(false));
  it('Secretario/a puede asignar Secretario/a', () =>
    expect(puedeAsignarRol('Secretario/a', 'Secretario/a')).toBe(true));
  it('Secretario/a puede asignar Preceptor/a', () =>
    expect(puedeAsignarRol('Secretario/a', 'Preceptor/a')).toBe(true));
  it('Directivo/a puede asignar Profesor/a EF', () =>
    expect(puedeAsignarRol('Directivo/a', 'Profesor/a EF')).toBe(true));
  it('Preceptor/a no puede asignar ningún rol', () =>
    expect(puedeAsignarRol('Preceptor/a', 'Preceptor/a')).toBe(false));
  it('rol destino inválido se rechaza', () =>
    expect(puedeAsignarRol('Directivo/a', 'Hacker')).toBe(false));
});

describe('esRolDeRiesgo', () => {
  it('Preceptor/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Preceptor/a')).toBe(true));
  it('Secretario/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Secretario/a')).toBe(true));
  it('Directivo/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Directivo/a')).toBe(true));
  it('Profesor/a EF no recibe alertas de riesgo', () => expect(esRolDeRiesgo('Profesor/a EF')).toBe(false));
  it('undefined no recibe alertas de riesgo', () => expect(esRolDeRiesgo(undefined)).toBe(false));
  it('ROLES_RIESGO no incluye a Profesor/a EF', () => expect(ROLES_RIESGO).not.toContain('Profesor/a EF'));
});
