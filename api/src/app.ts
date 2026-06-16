import dotenv from 'dotenv';
const envResult = dotenv.config();

if (envResult.error) {
    console.error("⚠️ No se pudo cargar el archivo .env:", envResult.error);
} else {
    console.log("✅ Variables de entorno cargadas correctamente.");
}

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.error("❌ ERROR CRÍTICO: No se encontró JWT_SECRET en el archivo .env.");
    console.log("Ruta actual de ejecución:", process.cwd());
    process.exit(1);
}
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import alumnoRoutes from './routes/alumnoRoutes';
import asistenciaRoutes from './routes/asistenciaRoutes';
import adminRoutes from './routes/adminRoutes';
import reportRoutes from './routes/reportRoutes';
import cursoRoutes from './routes/cursoRoutes';
import notificacionRoutes from './routes/notificacionRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// Logger para ver si las peticiones llegan al backend
// Ruta raíz para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.json({ message: '🚀 AssistX API está en línea', version: '1.0.0' });
});

// Ruta raíz para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.json({ message: '🚀 AssistX API está en línea', version: '1.0.0' });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notificaciones', notificacionRoutes);
// Debug de puerto y DB (solo para desarrollo)
console.log(`🔧 Puerto configurado: ${process.env.PORT}`);
console.log(`🔧 Host DB: ${process.env.DB_HOST}`);

const PORT = 5000; 
const HOST = '127.0.0.1'; // Forzamos localhost para coincidir exactamente con el proxy

app.listen(PORT, HOST, () => {
    console.log(`🚀 SERVIDOR ACTIVO en: http://127.0.0.1:${PORT}`);
});