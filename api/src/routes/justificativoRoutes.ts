import { Router } from 'express';
import { listarFaltasJustificables, crearJustificativo, descargarJustificativo } from '../controllers/justificativoController';
import { verifyToken } from '../middlewares/authMiddleware';
import { uploadJustificativo } from '../config/upload';

const router = Router();
router.get('/faltas/:alumnoId', verifyToken, listarFaltasJustificables);
router.get('/:id/archivo', verifyToken, descargarJustificativo);
router.post('/', verifyToken, uploadJustificativo.single('archivo'), crearJustificativo);
export default router;
