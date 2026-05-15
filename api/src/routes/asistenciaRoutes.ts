import { Router } from 'express';
import { registrarAsistenciaMasiva } from '../controllers/asistenciaController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint: POST /api/asistencias/bulk
router.post('/bulk', verifyToken, registrarAsistenciaMasiva);

export default router;