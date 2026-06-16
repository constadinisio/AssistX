import { Router } from 'express';
import {
    listarCursos,
    listarCursosAdmin,
    crearCurso,
    editarCurso,
    eliminarCurso
} from '../controllers/cursoController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// /admin debe ir antes que /:id para no ser capturada como parámetro
router.get('/admin', verifyToken, isAdmin, listarCursosAdmin);
router.get('/', verifyToken, listarCursos);
router.post('/', verifyToken, isAdmin, crearCurso);
router.put('/:id', verifyToken, isAdmin, editarCurso);
router.delete('/:id', verifyToken, isAdmin, eliminarCurso);

export default router;
