import { Router } from 'express';
import { getAlumnosPorCurso, getAlumnosEnRiesgo } from '../controllers/alumnoController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/riesgo', verifyToken, getAlumnosEnRiesgo);
router.get('/curso/:cursoId', verifyToken, getAlumnosPorCurso);

export default router;