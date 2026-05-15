import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.ts';
import alumnoRoutes from './routes/alumnoRoutes.ts';
import asistenciaRoutes from './routes/asistenciaRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import reportRoutes from './routes/reportRoutes.ts';
import { getAlumnosEnRiesgo } from './controllers/alumnoController.ts';
import { verifyToken, isAdmin } from './middlewares/authMiddleware.ts';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.get('/api/admin/riesgo', verifyToken, isAdmin, getAlumnosEnRiesgo);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de AssistX corriendo en http://localhost:${PORT}`);
});