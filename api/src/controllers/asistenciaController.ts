import { Request, Response } from 'express';
import pool from '../config/db';

export const registrarAsistenciaMasiva = async (req: Request, res: Response) => {
    const { id_curso, fecha, registros } = req.body; 
    // registros: [{ id_alumno: 1, estado: 'Presente', observaciones: '' }, ...]
    
    const id_usuario = (req as any).user.id; // Obtenido del token JWT

    try {
        // Usamos una transacción para asegurar que se guarden todos o ninguno
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const queries = registros.map((r: any) => {
                return connection.query(
                    `INSERT INTO asistencias (id_alumno, fecha, estado, observaciones) 
                     VALUES (?, ?, ?, ?)`,
                    [r.id_alumno, fecha, r.estado, r.observaciones]
                );
            });

            await Promise.all(queries);
            await connection.commit();
            
            res.status(201).json({ message: 'Asistencia registrada correctamente' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar la asistencia' });
    }
};