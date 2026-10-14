import { Request, Response } from 'express';
import pool from '../config/db';
import { crearNotificacion, buscarNotificacionDeRol } from '../utils/notificacionesData';
import { parsearId } from '../utils/notificaciones';
import { ROLES_RIESGO } from '../utils/roles';
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

  const idNotificacion = await crearNotificacion({
    tipo,
    mensaje,
    roles_destino: ROLES_RIESGO,
    id_alumno: idAlumno,
    faltas_snapshot: snapshot,
    id_periodo: idPeriodo,
    anio,
  });

  return {
    id_alumno: idAlumno,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    tipo,
    faltas: snapshot,
    mensaje,
    id_notificacion: idNotificacion,
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

export const listarNotificaciones = async (req: Request, res: Response) => {
  const { id: idUsuario, rol } = (req as any).user ?? {};
  if (typeof rol !== 'string') return res.json([]);
  try {
    const [rows]: any = await pool.query(
      `SELECT n.id, n.id_alumno, a.nombre, a.apellido, n.tipo,
              n.faltas_snapshot AS faltas, n.mensaje, n.estado, n.created_at,
              n.gestionada_at, CONCAT(g.nombre, ' ', g.apellido) AS gestionada_por_nombre,
              (l.id_usuario IS NOT NULL) AS leida
       FROM notificaciones n
       LEFT JOIN alumnos a ON a.id = n.id_alumno
       LEFT JOIN usuarios g ON g.id = n.gestionada_por
       LEFT JOIN notificacion_lecturas l ON l.id_notificacion = n.id AND l.id_usuario = ?
       WHERE FIND_IN_SET(?, n.roles_destino) > 0
       ORDER BY leida ASC, n.created_at DESC, n.id DESC`,
      [idUsuario ?? null, rol]
    );
    // faltas_snapshot (DECIMAL) llega como string desde mysql2; lo normalizamos a número
    res.json(rows.map((r: any) => ({ ...r, faltas: Number(r.faltas), leida: Number(r.leida) })));
  } catch (error) {
    console.error('Error en listarNotificaciones:', error);
    res.status(500).json({ message: 'Error al listar notificaciones' });
  }
};

export const marcarLeida = async (req: Request, res: Response) => {
  const id = parsearId(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Id de notificación inválido' });
  const { id: idUsuario, rol } = (req as any).user ?? {};
  try {
    const notif = await buscarNotificacionDeRol(pool, id, rol);
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada' });
    await pool.query(
      'INSERT IGNORE INTO notificacion_lecturas (id_notificacion, id_usuario) VALUES (?, ?)',
      [id, idUsuario]
    );
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(500).json({ message: 'Error al marcar la notificación' });
  }
};

export const marcarTodasLeidas = async (req: Request, res: Response) => {
  const { id: idUsuario, rol } = (req as any).user ?? {};
  if (typeof rol !== 'string') return res.json({ message: 'Sin notificaciones para marcar', marcadas: 0 });
  try {
    const [result]: any = await pool.query(
      `INSERT IGNORE INTO notificacion_lecturas (id_notificacion, id_usuario)
       SELECT n.id, ? FROM notificaciones n WHERE FIND_IN_SET(?, n.roles_destino) > 0`,
      [idUsuario, rol]
    );
    res.json({ message: 'Notificaciones marcadas como leídas', marcadas: result.affectedRows });
  } catch (error) {
    console.error('Error en marcarTodasLeidas:', error);
    res.status(500).json({ message: 'Error al marcar las notificaciones' });
  }
};
