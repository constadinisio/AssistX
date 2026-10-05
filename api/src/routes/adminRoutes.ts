import { Router } from 'express';
import {
    listarUsuarios,
    crearAlumno, 
    listarTodosLosAlumnos, 
    crearUsuario,
    listarEventos,
    crearEvento,
    eliminarEvento,
    listarPendientes,
    aprobarUsuario,
    rechazarUsuario
} from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Gestión de Calendario (Eventos)
router.get('/eventos', verifyToken, listarEventos); // Todos los usuarios autenticados pueden ver
router.post('/eventos', verifyToken, isAdmin, crearEvento); // Solo Secretario/a
router.delete('/eventos/:id', verifyToken, isAdmin, eliminarEvento); // Solo Secretario/a

// Gestión de Alumnos y Usuarios (Personal)
router.get('/usuarios', verifyToken, isAdmin, listarUsuarios);
router.post('/usuarios', verifyToken, isAdmin, crearUsuario);

// Solicitudes de registro (pendientes)
router.get('/usuarios/pendientes', verifyToken, isAdmin, listarPendientes);
router.patch('/usuarios/:id/aprobar', verifyToken, isAdmin, aprobarUsuario);
router.patch('/usuarios/:id/rechazar', verifyToken, isAdmin, rechazarUsuario);
router.get('/alumnos', verifyToken, isAdmin, listarTodosLosAlumnos);
router.post('/alumnos', verifyToken, isAdmin, crearAlumno);

export default router;