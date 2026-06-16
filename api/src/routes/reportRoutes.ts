import { Router } from 'express';
import { getAsistenciaPorRango, getMetricasDashboard, getHistorialAlumno } from '../controllers/reportController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/asistencia/:cursoId', verifyToken, getAsistenciaPorRango);
router.get('/metrics', verifyToken, getMetricasDashboard);
router.get('/historial/:alumnoId', verifyToken, getHistorialAlumno);

export default router;