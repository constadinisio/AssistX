import { describe, it, expect } from 'vitest';
import { peso, sumarFaltas, nivelBimestral, superaRegularidadAnual } from './riesgo';

describe('peso', () => {
  it('Ausente vale 1', () => expect(peso('Ausente')).toBe(1));
  it('Tarde vale 0.5', () => expect(peso('Tarde')).toBe(0.5));
  it('Retiro vale 0.5', () => expect(peso('Retiro')).toBe(0.5));
  it('Ausente Justificado vale 0', () => expect(peso('Ausente Justificado')).toBe(0));
  it('Presente vale 0', () => expect(peso('Presente')).toBe(0));
  it('Ausencia con Presencia vale 0', () => expect(peso('Ausencia con Presencia')).toBe(0));
  it('estado desconocido vale 0', () => expect(peso('Cualquiera')).toBe(0));
});

describe('sumarFaltas', () => {
  it('suma los pesos de los estados', () => {
    expect(sumarFaltas(['Ausente', 'Tarde', 'Retiro', 'Presente'])).toBe(2);
  });
  it('lista vacía da 0', () => expect(sumarFaltas([])).toBe(0));
});

describe('nivelBimestral', () => {
  it('menos de 4 es Normal', () => expect(nivelBimestral(3.5)).toBe('Normal'));
  it('4 es Riesgo', () => expect(nivelBimestral(4)).toBe('Riesgo'));
  it('4.5 sigue siendo Riesgo', () => expect(nivelBimestral(4.5)).toBe('Riesgo'));
  it('5 es Critico', () => expect(nivelBimestral(5)).toBe('Critico'));
});

describe('superaRegularidadAnual', () => {
  it('18 no supera', () => expect(superaRegularidadAnual(18)).toBe(false));
  it('19 supera', () => expect(superaRegularidadAnual(19)).toBe(true));
});
