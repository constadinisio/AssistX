import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

export const BASE_TEST = 'assistx_test';

const RAIZ_DB = path.resolve(__dirname, '../../../db');
export const RUTA_MIGRACION_NOTIF_USUARIO = path.join(RAIZ_DB, 'migrations', '2026-10-14_notificaciones_por_usuario.sql');

/** Dump con datos + todas las migraciones, en orden alfabético (las fechas en el nombre dan el orden). */
export function archivosBase(): string[] {
  const dirMigraciones = path.join(RAIZ_DB, 'migrations');
  const migraciones = fs.readdirSync(dirMigraciones)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => path.join(dirMigraciones, f));
  return [path.join(RAIZ_DB, 'assistx_db_condatos.sql'), ...migraciones];
}

function validarNombreTest(nombre: string): void {
  // Guarda de seguridad: los tests jamás pueden borrar la base real (assistx_db).
  if (!/^assistx_test[a-z_]*$/.test(nombre)) {
    throw new Error(`Nombre de base de test inválido: "${nombre}". Debe empezar con "assistx_test".`);
  }
}

function credenciales() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };
}

export async function conectar(nombre: string): Promise<mysql.Connection> {
  validarNombreTest(nombre);
  return mysql.createConnection({ ...credenciales(), database: nombre, multipleStatements: true });
}

export async function recrearBase(nombre: string, archivos: string[]): Promise<void> {
  validarNombreTest(nombre);
  const conn = await mysql.createConnection({ ...credenciales(), multipleStatements: true });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
    await conn.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    await conn.query(`USE \`${nombre}\``);
    for (const archivo of archivos) {
      await conn.query(fs.readFileSync(archivo, 'utf8'));
    }
  } finally {
    await conn.end();
  }
}
