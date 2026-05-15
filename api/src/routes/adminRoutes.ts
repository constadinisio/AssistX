import { Router } from 'express';
import { crearCurso, crearAlumno, crearUsuario } from '../controllers/adminController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Todas estas rutas requieren privilegios de Secretario
router.post('/cursos', verifyToken, isAdmin, crearCurso);
router.post('/alumnos', verifyToken, isAdmin, crearAlumno);
router.post('/usuarios', verifyToken, isAdmin, crearUsuario);

export default router;