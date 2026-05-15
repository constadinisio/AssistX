import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) return res.status(403).json({ message: 'Acceso denegado. No hay token.' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        (req as any).user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token no válido.' });
    }
};

// Middleware para restringir por rol (ej. solo puede crear alumnos)
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user.rol !== 'Secretario') {
        return res.status(403).json({ message: 'Requiere rol de Secretario.' });
    }
    next();
};