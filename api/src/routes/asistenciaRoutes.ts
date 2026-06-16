import { Router } from 'express';
import { registrarAsistencia, obtenerAsistencias } from '../controllers/asistenciaController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', verifyToken, registrarAsistencia);
router.get('/:id_curso/:fecha', verifyToken, obtenerAsistencias);

export default router;