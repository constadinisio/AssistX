import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { validateRegistro } from '../utils/validateRegistro';

// --- AUTO-REGISTRO PÚBLICO ---
export const register = async (req: Request, res: Response) => {
    const errores = validateRegistro(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ message: errores[0] });
    }

    const { nombre, apellido, dni, usuario, email, password, rol } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO usuarios (nombre, apellido, dni, usuario, email, password, rol, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [nombre.trim(), apellido.trim(), dni.trim(), usuario.trim(), email.trim(), hashedPassword, rol]
        );
        return res.status(201).json({
            message: 'Solicitud de registro enviada. Queda pendiente de aprobación.'
        });
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe una cuenta con ese usuario, DNI o email.' });
        }
        console.error('Error en register:', error);
        return res.status(500).json({ message: 'Error al procesar el registro.' });
    }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
    }

    try {
        const [rows]: any = await pool.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        if (user.estado === 'Pendiente') {
            return res.status(403).json({ message: 'Tu cuenta está pendiente de aprobación.' });
        }
        if (user.estado === 'Rechazada') {
            return res.status(403).json({ message: 'Tu solicitud de acceso fue rechazada.' });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' }
        );

        return res.json({
            token,
            user: {
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
};
