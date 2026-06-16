import pool from '../config/db';
import { sumarFaltas, nivelBimestral, superaRegularidadAnual, NivelRiesgo } from './riesgo';

export interface PeriodoVigente {
  id: number;
  nombre: string;
  anio_lectivo: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface RiesgoAlumno {
  id_alumno: number;
  acumuladoBimestral: number;
  nivel: NivelRiesgo;
  acumuladoAnual: number;
  superaAnual: boolean;
  id_periodo: number | null;
  anio: number;
}

export async function getPeriodoVigente(fecha: string): Promise<PeriodoVigente | null> {
  const [rows]: any = await pool.query(
    `SELECT id, nombre, anio_lectivo, fecha_inicio, fecha_fin
     FROM periodos
     WHERE ? BETWEEN fecha_inicio AND fecha_fin
     LIMIT 1`,
    [fecha]
  );
  return rows[0] ?? null;
}

function agruparEstados(rows: Array<{ id_alumno: number; estado: string }>): Map<number, string[]> {
  const mapa = new Map<number, string[]>();
  for (const row of rows) {
    const previos = mapa.get(row.id_alumno) ?? [];
    mapa.set(row.id_alumno, [...previos, row.estado]);
  }
  return mapa;
}

/**
 * Evalúa el riesgo de los alumnos indicados (o de todos si `alumnoIds` es null).
 * Cuenta faltas del bimestre vigente y del año lectivo de `fecha`.
 */
export async function evaluarRiesgo(alumnoIds: number[] | null, fecha: string): Promise<RiesgoAlumno[]> {
  const periodo = await getPeriodoVigente(fecha);
  const anio = Number(fecha.slice(0, 4));

  const tieneFiltro = Array.isArray(alumnoIds) && alumnoIds.length > 0;
  const filtro = tieneFiltro ? `AND id_alumno IN (${alumnoIds!.map(() => '?').join(',')})` : '';
  const idsParams = tieneFiltro ? alumnoIds! : [];

  let bimestralRows: Array<{ id_alumno: number; estado: string }> = [];
  if (periodo) {
    const [rows]: any = await pool.query(
      `SELECT id_alumno, estado FROM asistencias
       WHERE fecha BETWEEN ? AND ? ${filtro}`,
      [periodo.fecha_inicio, periodo.fecha_fin, ...idsParams]
    );
    bimestralRows = rows;
  }

  const [anualRows]: any = await pool.query(
    `SELECT id_alumno, estado FROM asistencias
     WHERE YEAR(fecha) = ? ${filtro}`,
    [anio, ...idsParams]
  );

  const bim = agruparEstados(bimestralRows);
  const anual = agruparEstados(anualRows);

  const todos = new Set<number>([...bim.keys(), ...anual.keys()]);
  const resultado: RiesgoAlumno[] = [];
  for (const id of todos) {
    const acumuladoBimestral = sumarFaltas(bim.get(id) ?? []);
    const acumuladoAnual = sumarFaltas(anual.get(id) ?? []);
    resultado.push({
      id_alumno: id,
      acumuladoBimestral,
      nivel: nivelBimestral(acumuladoBimestral),
      acumuladoAnual,
      superaAnual: superaRegularidadAnual(acumuladoAnual),
      id_periodo: periodo?.id ?? null,
      anio,
    });
  }
  return resultado;
}
