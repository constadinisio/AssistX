import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';

// --- GESTIÓN DE CURSOS ---
export const crearCurso = async (req: Request, res: Response) => {
    const { anio, division } = req.body;
    try {
        await pool.query('INSERT INTO cursos (anio, division) VALUES (?, ?)', [anio, division]);
        res.status(201).json({ message: 'Curso creado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear curso' });
    }
};

// --- GESTIÓN DE ALUMNOS ---
export const crearAlumno = async (req: Request, res: Response) => {
    const { nombre, apellido, dni, id_curso } = req.body;
    try {
        await pool.query(
            'INSERT INTO alumnos (nombre, apellido, dni, id_curso) VALUES (?, ?, ?, ?)',
            [nombre, apellido, dni, id_curso]
        );
        res.status(201).json({ message: 'Alumno registrado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar alumno (verifique si el DNI ya existe)' });
    }
};

// --- GESTIÓN DE USUARIOS (PERSONAL) ---
export const crearUsuario = async (req: Request, res: Response) => {
    const { nombre, apellido, usuario, password, rol } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nombre, apellido, usuario, password, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, usuario, hashedPassword, rol]
        );
        res.status(201).json({ message: 'Usuario del personal creado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};