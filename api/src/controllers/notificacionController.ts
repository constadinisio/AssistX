import { Request, Response } from 'express';
import pool from '../config/db';
import { evaluarRiesgo } from '../utils/riesgoData';

export interface AlertaRiesgo {
  id_alumno: number;
  nombre: string;
  apellido: string;
  tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual';
  faltas: number;
  mensaje: string;
  id_notificacion: number;
}

function construirMensaje(tipo: AlertaRiesgo['tipo'], snapshot: number, nombre: string): string {
  if (tipo === 'Critico') return `${nombre} alcanzó ${snapshot} faltas en el bimestre (nivel crítico).`;
  if (tipo === 'Riesgo') return `${nombre} alcanzó ${snapshot} faltas en el bimestre (en riesgo).`;
  return `${nombre} alcanzó ${snapshot} faltas en el año (riesgo de pérdida de regularidad).`;
}

async function crearNotificacionSiNoExiste(
  idAlumno: number,
  tipo: AlertaRiesgo['tipo'],
  idPeriodo: number | null,
  anio: number,
  snapshot: number
): Promise<AlertaRiesgo | null> {
  const cond = idPeriodo !== null
    ? 'id_alumno = ? AND tipo = ? AND id_periodo = ?'
    : 'id_alumno = ? AND tipo = ? AND id_periodo IS NULL AND anio = ?';
  const params = idPeriodo !== null ? [idAlumno, tipo, idPeriodo] : [idAlumno, tipo, anio];

  const [existe]: any = await pool.query(`SELECT id FROM notificaciones WHERE ${cond} LIMIT 1`, params);
  if (existe.length > 0) return null;

  const [alumnoRows]: any = await pool.query('SELECT nombre, apellido FROM alumnos WHERE id = ?', [idAlumno]);
  const alumno = alumnoRows[0];
  if (!alumno) return null;

  const nombreCompleto = `${alumno.apellido}, ${alumno.nombre}`;
  const mensaje = construirMensaje(tipo, snapshot, nombreCompleto);

  const [result]: any = await pool.query(
    `INSERT INTO notificaciones (id_alumno, tipo, faltas_snapshot, id_periodo, anio, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idAlumno, tipo, snapshot, idPeriodo, anio, mensaje]
  );

  return {
    id_alumno: idAlumno,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    tipo,
    faltas: snapshot,
    mensaje,
    id_notificacion: result.insertId,
  };
}

/**
 * Evalúa los alumnos indicados y genera (con dedup) las notificaciones por umbral cruzado.
 * Devuelve solo las alertas NUEVAS, para mostrarlas como pop-up.
 */
export async function generarNotificacionesRiesgo(alumnoIds: number[], fecha: string): Promise<AlertaRiesgo[]> {
  if (alumnoIds.length === 0) return [];
  const riesgos = await evaluarRiesgo(alumnoIds, fecha);
  const alertas: AlertaRiesgo[] = [];

  for (const r of riesgos) {
    if (r.acumuladoBimestral >= 4) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'Riesgo', r.id_periodo, r.anio, r.acumuladoBimestral);
      if (a) alertas.push(a);
    }
    if (r.acumuladoBimestral >= 5) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'Critico', r.id_periodo, r.anio, r.acumuladoBimestral);
      if (a) alertas.push(a);
    }
    if (r.superaAnual) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'RegularidadAnual', null, r.anio, r.acumuladoAnual);
      if (a) alertas.push(a);
    }
  }
  return alertas;
}

export const listarNotificaciones = async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT n.id, n.id_alumno, a.nombre, a.apellido, n.tipo,
              n.faltas_snapshot AS faltas, n.mensaje, n.estado, n.leida, n.created_at
       FROM notificaciones n
       JOIN alumnos a ON a.id = n.id_alumno
       ORDER BY n.leida ASC, n.created_at DESC`
    );
    // faltas_snapshot (DECIMAL) llega como string desde mysql2; lo normalizamos a número
    res.json(rows.map((r: any) => ({ ...r, faltas: Number(r.faltas) })));
  } catch (error) {
    console.error('Error en listarNotificaciones:', error);
    res.status(500).json({ message: 'Error al listar notificaciones' });
  }
};

export const marcarLeida = async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(500).json({ message: 'Error al marcar la notificación' });
  }
};
