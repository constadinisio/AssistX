import { Request, Response } from 'express';
import pool from '../config/db';

// Listado "shape" para dropdowns y panel de asistencia (NO cambiar su forma)
export const listarCursos = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, CONCAT(anio, ' ', division) as code, anio as name, aula as room FROM cursos"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en listarCursos:", error);
        res.status(500).json({ message: 'Error al obtener cursos' });
    }
};

// Listado para el panel de gestión: campos crudos + cantidad de alumnos
export const listarCursosAdmin = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.id, c.anio, c.division, c.aula, COUNT(a.id) AS cantidad_alumnos
             FROM cursos c
             LEFT JOIN alumnos a ON a.id_curso = c.id
             GROUP BY c.id, c.anio, c.division, c.aula
             ORDER BY c.anio, c.division`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error en listarCursosAdmin:", error);
        res.status(500).json({ message: 'Error al obtener la lista de cursos' });
    }
};

export const crearCurso = async (req: Request, res: Response) => {
    const { anio, division, aula } = req.body;
    if (!anio || !division || String(anio).trim() === '' || String(division).trim() === '') {
        return res.status(400).json({ message: 'El año y la división son obligatorios.' });
    }
    try {
        await pool.query(
            'INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)',
            [String(anio).trim(), String(division).trim(), aula ? String(aula).trim() : null]
        );
        res.status(201).json({ message: 'Curso creado con éxito' });
    } catch (error) {
        console.error("Error en crearCurso:", error);
        res.status(500).json({ message: 'Error al crear curso' });
    }
};

export const editarCurso = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { anio, division, aula } = req.body;
    if (!anio || !division || String(anio).trim() === '' || String(division).trim() === '') {
        return res.status(400).json({ message: 'El año y la división son obligatorios.' });
    }
    try {
        const [result]: any = await pool.query(
            'UPDATE cursos SET anio = ?, division = ?, aula = ? WHERE id = ?',
            [String(anio).trim(), String(division).trim(), aula ? String(aula).trim() : null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        res.json({ message: 'Curso actualizado.' });
    } catch (error) {
        console.error("Error en editarCurso:", error);
        res.status(500).json({ message: 'Error al actualizar curso' });
    }
};

export const eliminarCurso = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [alumnos]: any = await pool.query('SELECT COUNT(*) AS total FROM alumnos WHERE id_curso = ?', [id]);
        const [asistencias]: any = await pool.query('SELECT COUNT(*) AS total FROM asistencias WHERE id_curso = ?', [id]);

        if (alumnos[0].total > 0 || asistencias[0].total > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar: el curso tiene alumnos o asistencias asociadas.'
            });
        }

        const [result]: any = await pool.query('DELETE FROM cursos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        res.json({ message: 'Curso eliminado.' });
    } catch (error) {
        console.error("Error en eliminarCurso:", error);
        res.status(500).json({ message: 'Error al eliminar curso' });
    }
};
