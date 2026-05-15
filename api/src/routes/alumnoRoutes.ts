import { Router } from 'express';
import { getAlumnosPorCurso } from '../controllers/alumnoController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

// Ruta protegida: Cualquier usuario logueado puede ver alumnos de un curso
router.get('/curso/:cursoId', verifyToken, getAlumnosPorCurso);

export default router;