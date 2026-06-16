import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../config/db';
import { UPLOAD_DIR } from '../config/upload';

export const listarFaltasJustificables = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, fecha, estado, observaciones
       FROM asistencias
       WHERE id_alumno = ? AND estado = 'Ausente'
       ORDER BY fecha DESC`,
      [req.params.alumnoId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error en listarFaltasJustificables:', error);
    res.status(500).json({ message: 'Error al obtener las faltas del alumno' });
  }
};

export const crearJustificativo = async (req: Request, res: Response) => {
  const file = (req as any).file;
  const { id_asistencia, motivo, fecha_certificado } = req.body;
  const id_usuario = (req as any).user?.id || null;

  if (!file) return res.status(400).json({ message: 'Falta el archivo del justificativo' });
  if (!id_asistencia) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ message: 'Falta id_asistencia' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [asist]: any = await connection.query('SELECT id FROM asistencias WHERE id = ?', [id_asistencia]);
    if (asist.length === 0) {
      await connection.rollback();
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'La falta indicada no existe' });
    }

    await connection.query(
      `INSERT INTO justificativos (id_asistencia, archivo_path, archivo_nombre, mime, motivo, fecha_certificado, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_asistencia, `/uploads/${file.filename}`, file.originalname, file.mimetype, motivo ?? null, fecha_certificado || null, id_usuario]
    );
    await connection.query(`UPDATE asistencias SET estado = 'Ausente Justificado' WHERE id = ?`, [id_asistencia]);

    await connection.commit();
    res.status(201).json({ message: 'Justificativo cargado y falta justificada' });
  } catch (error: any) {
    await connection.rollback();
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Esa falta ya tiene un justificativo cargado' });
    }
    console.error('Error en crearJustificativo:', error);
    res.status(500).json({ message: 'Error al cargar el justificativo' });
  } finally {
    connection.release();
  }
};

export const descargarJustificativo = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT archivo_path FROM justificativos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Justificativo no encontrado' });
    const filePath = path.join(UPLOAD_DIR, path.basename(rows[0].archivo_path));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Archivo no encontrado' });
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error en descargarJustificativo:', error);
    res.status(500).json({ message: 'Error al descargar el justificativo' });
  }
};
