import { Router } from 'express';
import { listarNotificaciones, marcarLeida } from '../controllers/notificacionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, listarNotificaciones);
router.patch('/:id/leida', verifyToken, marcarLeida);

export default router;
