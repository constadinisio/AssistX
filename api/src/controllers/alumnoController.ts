import { Request, Response } from 'express';
import pool from '../config/db';

export const getAlumnosPorCurso = async (req: Request, res: Response) => {
    const { cursoId } = req.params;

    try {
        // Obtenemos alumnos y sumamos inasistencias 
        // (Ausente y Ausencia con Presencia valen 1 punto)
        const [rows]: any = await pool.query(`
            SELECT a.*, 
            (SELECT COUNT(*) FROM asistencias 
             WHERE id_alumno = a.id 
             AND estado IN ('Ausente', 'Ausencia con Presencia')) as total_faltas
            FROM alumnos a
            WHERE a.id_curso = ?`, [cursoId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alumnos' });
    }
};

export const getAlumnosEnRiesgo = async (req: Request, res: Response) => {
    try {
        const [rows]: any = await pool.query(`
            SELECT a.nombre, a.apellido, c.anio, c.division, COUNT(asist.id) as total_faltas
            FROM alumnos a
            JOIN cursos c ON a.id_curso = c.id
            JOIN asistencias asist ON a.id = asist.id_alumno
            WHERE asist.estado IN ('Ausente', 'Ausencia con Presencia')
            GROUP BY a.id
            HAVING total_faltas >= 15
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alumnos en riesgo' });
    }
};