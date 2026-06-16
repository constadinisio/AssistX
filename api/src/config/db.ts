import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'assistx_db',
    waitForConnections: true,
    connectionLimit: 10
});

// Verificar la conexión al iniciar
pool.getConnection()
    .then(conn => {
        console.log("🛢️  Conexión a MySQL establecida correctamente.");
        conn.release();
    })
    .catch(err => console.error("❌ Error conectando a la base de datos:", err.message));

export default pool;