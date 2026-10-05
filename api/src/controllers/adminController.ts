import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import { ROLES_VALIDOS } from '../utils/validateRegistro';

export const listarUsuarios = async (_req: Request, res: Response) => {
    try {
        // Intentamos obtener los usuarios. Si created_at falla, hacemos un fallback
        const [rows] = await pool.query("SELECT id, nombre, apellido, usuario, rol, created_at FROM usuarios WHERE estado = 'Activo'").catch(async (err) => {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.warn("⚠️ Advertencia: Falta la columna created_at en la tabla usuarios.");
                return pool.query("SELECT id, nombre, apellido, usuario, rol, NULL as created_at FROM usuarios WHERE estado = 'Activo'");
            }
            throw err;
        });
        res.json(rows as any[]);
    } catch (error) {
        console.error("Error SQL en listarUsuarios:", error);
        res.status(500).json({ message: 'Error al obtener la lista de usuarios' });
    }
};

// --- GESTIÓN DE ALUMNOS ---
export const crearAlumno = async (req: Request, res: Response) => {
    const { nombre, apellido, dni, id_curso } = req.body;
    if (!nombre || !apellido || !dni || !id_curso ||
        String(nombre).trim() === '' || String(apellido).trim() === '' || String(dni).trim() === '') {
        return res.status(400).json({ message: 'Nombre, apellido, DNI y curso son obligatorios.' });
    }
    try {
        await pool.query(
            'INSERT INTO alumnos (nombre, apellido, dni, id_curso) VALUES (?, ?, ?, ?)',
            [String(nombre).trim(), String(apellido).trim(), String(dni).trim(), id_curso]
        );
        res.status(201).json({ message: 'Alumno registrado correctamente' });
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe un alumno con ese DNI.' });
        }
        console.error('Error en crearAlumno:', error);
        res.status(500).json({ message: 'Error al registrar alumno' });
    }
};

export const listarTodosLosAlumnos = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.nombre, a.apellido, a.dni, a.id_curso, c.anio, c.division 
            FROM alumnos a 
            LEFT JOIN cursos c ON a.id_curso = c.id
        `);
        res.json(rows);
    } catch (error) {
        console.error("Error SQL en listarTodosLosAlumnos:", error);
        res.status(500).json({ message: 'Error al obtener la lista completa de alumnos' });
    }
};

// --- GESTIÓN DE USUARIOS (PERSONAL) ---
export const crearUsuario = async (req: Request, res: Response) => {
    const { nombre, apellido, usuario, password, rol } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO usuarios (nombre, apellido, usuario, password, rol, estado) VALUES (?, ?, ?, ?, ?, 'Activo')",
            [nombre, apellido, usuario, hashedPassword, rol]
        );
        res.status(201).json({ message: 'Usuario del personal creado' });
    } catch (error) {
        console.error("Error en crearUsuario:", error);
        const msg = (error as any).code === 'ER_DUP_ENTRY' ? 'El nombre de usuario ya existe' : 'Error al crear usuario';
        res.status(500).json({ message: msg });
    }
};

// --- GESTIÓN DE CALENDARIO ---
export const listarEventos = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query('SELECT id, titulo, fecha, tipo, descripcion, created_at FROM eventos ORDER BY fecha ASC').catch(async (err) => {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.warn("⚠️ Advertencia: Falta la columna created_at en la tabla eventos.");
                return pool.query('SELECT id, titulo, fecha, tipo, descripcion, NULL as created_at FROM eventos ORDER BY fecha ASC');
            }
            throw err;
        });
        res.json(rows);
    } catch (error) {
        console.error("❌ Error SQL en listarEventos:", error);
        res.status(500).json({ message: 'Error al obtener eventos' });
    }
};

export const crearEvento = async (req: Request, res: Response) => {
    const { titulo, fecha, tipo, descripcion } = req.body;
    try {
        await pool.query('INSERT INTO eventos (titulo, fecha, tipo, descripcion) VALUES (?, ?, ?, ?)', [titulo, fecha, tipo, descripcion]);
        res.status(201).json({ message: 'Evento creado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear evento' });
    }
};

export const eliminarEvento = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM eventos WHERE id = ?', [id]);
        res.json({ message: 'Evento eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar evento' });
    }
};

// --- GESTIÓN DE SOLICITUDES DE REGISTRO ---
export const listarPendientes = async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombre, apellido, dni, usuario, email, rol, created_at
             FROM usuarios WHERE estado = 'Pendiente' ORDER BY created_at ASC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en listarPendientes:', error);
        res.status(500).json({ message: 'Error al obtener solicitudes pendientes' });
    }
};

export const aprobarUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rol } = req.body;

    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({ message: 'El rol seleccionado no es válido.' });
    }

    try {
        const [result]: any = await pool.query(
            `UPDATE usuarios SET estado = 'Activo', rol = COALESCE(?, rol)
             WHERE id = ? AND estado = 'Pendiente'`,
            [rol ?? null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }
        res.json({ message: 'Usuario aprobado correctamente.' });
    } catch (error) {
        console.error('Error en aprobarUsuario:', error);
        res.status(500).json({ message: 'Error al aprobar el usuario' });
    }
};

export const rechazarUsuario = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [result]: any = await pool.query(
            `UPDATE usuarios SET estado = 'Rechazada' WHERE id = ? AND estado = 'Pendiente'`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }
        res.json({ message: 'Solicitud rechazada.' });
    } catch (error) {
        console.error('Error en rechazarUsuario:', error);
        res.status(500).json({ message: 'Error al rechazar la solicitud' });
    }
};
