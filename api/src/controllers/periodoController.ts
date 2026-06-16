import { Request, Response } from 'express';
import pool from '../config/db';

function validar(body: any): string | null {
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = body;
  if (!nombre || !anio_lectivo || !fecha_inicio || !fecha_fin) return 'Faltan campos obligatorios';
  if (fecha_inicio > fecha_fin) return 'La fecha de inicio no puede ser posterior a la fecha de fin';
  return null;
}

export const listarPeriodos = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM periodos ORDER BY anio_lectivo DESC, fecha_inicio ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error en listarPeriodos:', error);
    res.status(500).json({ message: 'Error al listar períodos' });
  }
};

export const crearPeriodo = async (req: Request, res: Response) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ message: error });
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO periodos (nombre, anio_lectivo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
      [nombre, anio_lectivo, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ id: result.insertId, message: 'Período creado' });
  } catch (e) {
    console.error('Error en crearPeriodo:', e);
    res.status(500).json({ message: 'Error al crear el período' });
  }
};

export const actualizarPeriodo = async (req: Request, res: Response) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ message: error });
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = req.body;
  try {
    await pool.query(
      'UPDATE periodos SET nombre = ?, anio_lectivo = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
      [nombre, anio_lectivo, fecha_inicio, fecha_fin, req.params.id]
    );
    res.json({ message: 'Período actualizado' });
  } catch (e) {
    console.error('Error en actualizarPeriodo:', e);
    res.status(500).json({ message: 'Error al actualizar el período' });
  }
};

export const eliminarPeriodo = async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM periodos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Período eliminado' });
  } catch (e) {
    console.error('Error en eliminarPeriodo:', e);
    res.status(500).json({ message: 'Error al eliminar el período' });
  }
};
