import { Request, Response } from 'express';
import pool from '../config/db';

export const crearIntervencion = async (req: Request, res: Response) => {
  const { id_alumno, id_notificacion, motivo } = req.body;
  const id_usuario = (req as any).user?.id || null;

  if (!id_alumno) return res.status(400).json({ message: 'Falta id_alumno' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result]: any = await connection.query(
      `INSERT INTO intervenciones (id_alumno, id_notificacion, id_usuario, motivo)
       VALUES (?, ?, ?, ?)`,
      [id_alumno, id_notificacion ?? null, id_usuario, motivo ?? null]
    );
    if (id_notificacion) {
      await connection.query(`UPDATE notificaciones SET estado = 'gestionada' WHERE id = ?`, [id_notificacion]);
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
