import { Router } from 'express';
import { listarPeriodos, crearPeriodo, actualizarPeriodo, eliminarPeriodo } from '../controllers/periodoController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', verifyToken, listarPeriodos);
router.post('/', verifyToken, isAdmin, crearPeriodo);
router.put('/:id', verifyToken, isAdmin, actualizarPeriodo);
router.delete('/:id', verifyToken, isAdmin, eliminarPeriodo);
export default router;
