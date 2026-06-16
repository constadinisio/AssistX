import { Request, Response } from 'express';
import pool from '../config/db';
import { evaluarRiesgo } from '../utils/riesgoData';

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
        console.error("Error SQL en getAlumnosPorCurso:", error);
        res.status(500).json({ message: 'Error al obtener alumnos' });
    }
};

export const getAlumnosEnRiesgo = async (_req: Request, res: Response) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const riesgos = await evaluarRiesgo(null, hoy);
    const enRiesgo = riesgos.filter(r => r.nivel !== 'Normal' || r.superaAnual);

    if (enRiesgo.length === 0) return res.json([]);

    const ids = enRiesgo.map(r => r.id_alumno);
    const [alumnos]: any = await pool.query(
      `SELECT id, nombre, apellido, dni FROM alumnos WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const porId = new Map<number, any>(alumnos.map((a: any) => [a.id, a]));

    const payload = enRiesgo.map(r => {
      const alumno = porId.get(r.id_alumno);
      return {
        id: r.id_alumno,
        nombre: alumno?.nombre ?? '',
        apellido: alumno?.apellido ?? '',
        dni: alumno?.dni ?? '',
        faltas: r.acumuladoBimestral,
        nivel: r.nivel,
        superaAnual: r.superaAnual,
      };
    });
    res.json(payload);
  } catch (error) {
    console.error('Error en getAlumnosEnRiesgo:', error);
    res.status(500).json({ message: 'Error al obtener alumnos en riesgo' });
  }
};