import { Request, Response } from 'express';
import pool from '../config/db';
import { generarNotificacionesRiesgo } from './notificacionController';

export const registrarAsistencia = async (req: Request, res: Response) => {
    const { id_curso, fecha, registros } = req.body; 
    // registros: Array<{ id_alumno: number, estado: string, observaciones: string }>
    const id_usuario = (req as any).user?.id || null;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const reg of registros) {
            await connection.query(
                `INSERT INTO asistencias (id_alumno, id_curso, id_usuario, fecha, estado, observaciones) 
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 estado = VALUES(estado), 
                 observaciones = VALUES(observaciones), 
                 id_usuario = VALUES(id_usuario)`,
                [reg.id_alumno, id_curso, id_usuario, fecha, reg.estado, reg.observaciones]
            );
        }

        await connection.commit();

        // Tras guardar, evaluar riesgo y generar notificaciones para los alumnos afectados
        const alumnoIds = registros.map((r: any) => r.id_alumno);
        let alertas: any[] = [];
        try {
            alertas = await generarNotificacionesRiesgo(alumnoIds, fecha);
        } catch (notifError) {
            console.error('Error generando notificaciones de riesgo:', notifError);
        }

        res.status(201).json({ message: 'Asistencia registrada correctamente', alertas });
    } catch (error) {
        console.error("❌ Error en registrarAsistencia:", error);
        await connection.rollback();
        const msg = (error as any).code === 'ER_DUP_ENTRY'
            ? 'Ya existe un registro de asistencia para este alumno en la fecha seleccionada.'
            : 'Error al registrar asistencia';
        res.status(500).json({ message: msg });
    } finally {
        connection.release();
    }
};

// Devuelve las asistencias ya cargadas para un curso en una fecha (para precargar el panel)
export const obtenerAsistencias = async (req: Request, res: Response) => {
    const { id_curso, fecha } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT id_alumno, estado, observaciones FROM asistencias WHERE id_curso = ? AND fecha = ?',
            [id_curso, fecha]
        );
        res.json(rows);
    } catch (error) {
        console.error("❌ Error en obtenerAsistencias:", error);
        res.status(500).json({ message: 'Error al obtener asistencias' });
    }
};