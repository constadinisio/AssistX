import app from './app';

// Debug de puerto y DB (solo para desarrollo)
console.log(`🔧 Puerto configurado: ${process.env.PORT}`);
console.log(`🔧 Host DB: ${process.env.DB_HOST}`);

const PORT = 5000;
const HOST = '127.0.0.1'; // Forzamos localhost para coincidir exactamente con el proxy

app.listen(PORT, HOST, () => {
    console.log(`🚀 SERVIDOR ACTIVO en: http://127.0.0.1:${PORT}`);
});
