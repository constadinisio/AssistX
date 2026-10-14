import { Router } from 'express';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../controllers/notificacionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, listarNotificaciones);
router.patch('/leidas', verifyToken, marcarTodasLeidas);
router.patch('/:id/leida', verifyToken, marcarLeida);

export default router;
