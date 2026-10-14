import { Request, Response } from 'express';
import pool from '../config/db';
import { parsearId } from '../utils/notificaciones';
import { buscarNotificacionDeRol } from '../utils/notificacionesData';

const MAX_MOTIVO = 1000;

export const crearIntervencion = async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const idAlumno = parsearId(body.id_alumno);
  if (idAlumno === null) return res.status(400).json({ message: 'Falta id_alumno o es inválido' });

  const traeNotificacion = body.id_notificacion !== undefined && body.id_notificacion !== null;
  const idNotificacion = traeNotificacion ? parsearId(body.id_notificacion) : null;
  if (traeNotificacion && idNotificacion === null) {
    return res.status(400).json({ message: 'id_notificacion inválido' });
  }

  const motivo = typeof body.motivo === 'string' && body.motivo.trim() !== ''
    ? body.motivo.trim().slice(0, MAX_MOTIVO)
    : null;
  const { id: idUsuario, rol } = (req as any).user ?? {};

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (idNotificacion !== null) {
      // Lock de fila: si dos personas avisan a la vez, la segunda ve 'gestionada' y recibe 409.
      const notif = await buscarNotificacionDeRol(connection, idNotificacion, rol, true);
      if (!notif) {
        await connection.rollback();
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }
      if (notif.id_alumno !== null && notif.id_alumno !== idAlumno) {
        await connection.rollback();
        return res.status(400).json({ message: 'La notificación no corresponde a ese alumno' });
      }
      if (notif.estado === 'gestionada') {
        await connection.rollback();
        return res.status(409).json({
          message: 'Esta notificación ya fue gestionada',
          gestionada_por_nombre: notif.gestionada_por_nombre,
          gestionada_at: notif.gestionada_at,
        });
      }
    }

    const [result]: any = await connection.query(
      `INSERT INTO intervenciones (id_alumno, id_notificacion, id_usuario, motivo)
       VALUES (?, ?, ?, ?)`,
      [idAlumno, idNotificacion, idUsuario ?? null, motivo]
    );
    if (idNotificacion !== null) {
      await connection.query(
        `UPDATE notificaciones SET estado = 'gestionada', gestionada_por = ?, gestionada_at = NOW() WHERE id = ?`,
        [idUsuario ?? null, idNotificacion]
      );
    }
    await connection.commit();
    res.status(201).json({ message: 'Intervención registrada', id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('Error en crearIntervencion:', error);
    res.status(500).json({ message: 'Error al registrar la intervención' });
  } finally {
    connection.release();
  }
};
