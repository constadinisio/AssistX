import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { esRolGestion } from '../utils/roles';

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) return res.status(403).json({ message: 'Acceso denegado. No hay token.' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET as string);
        (req as any).user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token no válido.' });
    }
};

// Middleware para restringir a roles de gestión (Secretario/a y Directivo/a)
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!esRolGestion(user?.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Secretario o Directivo.' });
    }
    next();
};