import { Request, Response } from 'express';
import pool from '../config/db';

export const getAsistenciaPorRango = async (req: Request, res: Response) => {
    const { cursoId } = req.params;
    const { desde, hasta } = req.query; // Ejemplo: ?desde=2026-03-01&hasta=2026-04-30

    try {
        const [rows]: any = await pool.query(`
            SELECT a.nombre, a.apellido, asist.fecha, asist.estado, asist.observaciones
            FROM alumnos a
            JOIN asistencias asist ON a.id = asist.id_alumno
            WHERE a.id_curso = ? AND asist.fecha BETWEEN ? AND ?
            ORDER BY asist.fecha DESC
        `, [cursoId, desde, hasta]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el reporte de asistencia' });
    }
};

export const getMetricasDashboard = async (req: Request, res: Response) => {
    try {
        // Obtenemos el porcentaje de asistencia general del día de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const [stats]: any = await pool.query(`
            SELECT 
                estado, 
                COUNT(*) as cantidad 
            FROM asistencias 
            WHERE fecha = ? 
            GROUP BY estado
        `, [hoy]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener métricas' });
    }
};