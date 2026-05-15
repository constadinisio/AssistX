import { Router } from 'express';
import { getAsistenciaPorRango, getMetricasDashboard } from '../controllers/reportController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/historial/:cursoId', verifyToken, getAsistenciaPorRango);
router.get('/stats/hoy', verifyToken, getMetricasDashboard);

export default router;