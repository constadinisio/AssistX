import { Router } from 'express';
import { crearIntervencion } from '../controllers/intervencionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();
router.post('/', verifyToken, crearIntervencion);
export default router;
