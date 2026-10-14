// Se ejecuta antes de cada archivo de test de integración, antes de importar la app.
// dotenv no pisa variables ya definidas, así que DB_NAME queda apuntando a la base de test.
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.DB_NAME = 'assistx_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-tests';
