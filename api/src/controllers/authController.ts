import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

export const login = async (req: Request, res: Response) => {
    const { usuario, password } = req.body;

    try {
        const [rows]: any = await pool.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        // Comparar hash con bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Generar Token (JWT)
        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                nombre: user.nombre,
                apellido: user.apellido,
                rol: user.rol
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};