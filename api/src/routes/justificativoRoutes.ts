import { Router, Request, Response, NextFunction } from 'express';
import { listarFaltasJustificables, crearJustificativo, descargarJustificativo } from '../controllers/justificativoController';
import { verifyToken } from '../middlewares/authMiddleware';
import { uploadJustificativo } from '../config/upload';

const router = Router();

// Envuelve multer para convertir sus errores (tipo no permitido, tamaño máximo) en JSON 400
const subirArchivo = (req: Request, res: Response, next: NextFunction) => {
  uploadJustificativo.single('archivo')(req, res, (err: any) => {
    if (err) return res.status(400).json({ message: err.message || 'Error al subir el archivo' });
    next();
  });
};

router.get('/faltas/:alumnoId', verifyToken, listarFaltasJustificables);
router.get('/:id/archivo', verifyToken, descargarJustificativo);
router.post('/', verifyToken, subirArchivo, crearJustificativo);
export default router;
