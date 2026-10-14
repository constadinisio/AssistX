import { describe, it, expect } from 'vitest';
import {
  TIPOS_NOTIFICACION,
  esTipoValido,
  parsearRolesDestino,
  serializarRolesDestino,
  esDestinatario,
  parsearId,
} from './notificaciones';

describe('esTipoValido', () => {
  it('acepta los tipos de riesgo', () => {
    for (const t of TIPOS_NOTIFICACION) expect(esTipoValido(t)).toBe(true);
  });
  it('rechaza un tipo desconocido', () => expect(esTipoValido('Spam')).toBe(false));
  it('rechaza valores no string', () => {
    expect(esTipoValido(undefined)).toBe(false);
    expect(esTipoValido(3)).toBe(false);
  });
});

describe('parsearRolesDestino', () => {
  it('separa por coma y recorta espacios', () =>
    expect(parsearRolesDestino(' Preceptor/a , Directivo/a ')).toEqual(['Preceptor/a', 'Directivo/a']));
  it('descarta vacíos y duplicados', () =>
    expect(parsearRolesDestino('Preceptor/a,,Preceptor/a,')).toEqual(['Preceptor/a']));
  it('descarta roles inexistentes', () =>
    expect(parsearRolesDestino('Preceptor/a,Hacker')).toEqual(['Preceptor/a']));
  it('devuelve [] para valores no string', () => {
    expect(parsearRolesDestino(null)).toEqual([]);
    expect(parsearRolesDestino(undefined)).toEqual([]);
  });
});

describe('serializarRolesDestino', () => {
  it('une roles válidos con coma', () =>
    expect(serializarRolesDestino(['Preceptor/a', 'Secretario/a'])).toBe('Preceptor/a,Secretario/a'));
  it('elimina duplicados', () =>
    expect(serializarRolesDestino(['Preceptor/a', 'Preceptor/a'])).toBe('Preceptor/a'));
  it('lanza si la lista está vacía', () => expect(() => serializarRolesDestino([])).toThrow());
  it('lanza si hay un rol inválido', () => expect(() => serializarRolesDestino(['Preceptor/a', 'Hacker'])).toThrow());
});

describe('esDestinatario', () => {
  const destino = 'Preceptor/a,Secretario/a,Directivo/a';
  it('true si el rol está en la lista', () => expect(esDestinatario('Secretario/a', destino)).toBe(true));
  it('false si el rol no está', () => expect(esDestinatario('Profesor/a EF', destino)).toBe(false));
  it('false si el rol es undefined', () => expect(esDestinatario(undefined, destino)).toBe(false));
  it('no confunde prefijos', () => expect(esDestinatario('Preceptor', destino)).toBe(false));
});

describe('parsearId', () => {
  it('acepta enteros positivos como string o número', () => {
    expect(parsearId('5')).toBe(5);
    expect(parsearId(7)).toBe(7);
  });
  it('rechaza cero, negativos, decimales y texto', () => {
    for (const v of ['0', '-1', '1.5', 'abc', '5abc', '', ' ', 0, -3, 2.5, null, undefined, {}]) {
      expect(parsearId(v)).toBeNull();
    }
  });
});
