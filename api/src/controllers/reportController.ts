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
        const [alumnos]: any = await pool.query('SELECT COUNT(*) as total FROM alumnos');
        const [usuarios]: any = await pool.query(
            `SELECT SUM(estado = 'Activo') as activos, SUM(estado = 'Pendiente') as pendientes FROM usuarios`
        );

        res.json({
            totalAlumnos: alumnos[0].total,
            personalActivo: Number(usuarios[0].activos ?? 0),
            solicitudesPendientes: Number(usuarios[0].pendientes ?? 0)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener métricas' });
    }
};

export const getHistorialAlumno = async (req: Request, res: Response) => {
    const { alumnoId } = req.params;
    const searchPattern = `%${alumnoId}%`; 
    try {
        const [rows]: any = await pool.query(`
            SELECT 
                a.id as alumno_id,
                a.dni,
                a.nombre,
                a.apellido,
                asist.fecha, 
                asist.estado, 
                asist.observaciones,
                c.anio,
                c.division
            FROM alumnos a
            LEFT JOIN asistencias asist ON a.id = asist.id_alumno
            LEFT JOIN cursos c ON a.id_curso = c.id
            WHERE a.dni LIKE ? OR a.nombre LIKE ? OR a.apellido LIKE ? OR CONCAT(a.nombre, ' ', a.apellido) LIKE ?
            ORDER BY asist.fecha DESC
        `, [searchPattern, searchPattern, searchPattern, searchPattern]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el historial del alumno' });
    }
};