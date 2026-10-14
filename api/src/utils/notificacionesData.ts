// Acceso a datos del modelo genérico de notificaciones.
import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from '../config/db';
import { RolValido } from './validateRegistro';
import { TipoNotificacion, esTipoValido, serializarRolesDestino } from './notificaciones';

export type Queryable = Pool | PoolConnection;

export interface NuevaNotificacion {
  tipo: TipoNotificacion;
  mensaje: string;
  roles_destino: readonly RolValido[];
  id_alumno?: number | null;
  faltas_snapshot?: number;
  id_periodo?: number | null;
  anio?: number | null;
}

export interface NotificacionAcceso {
  id: number;
  id_alumno: number | null;
  estado: 'nueva' | 'gestionada';
  gestionada_por_nombre: string | null;
  gestionada_at: Date | null;
}

/** Único punto de inserción de notificaciones. Devuelve el id insertado. */
export async function crearNotificacion(n: NuevaNotificacion): Promise<number> {
  if (!esTipoValido(n.tipo)) throw new Error(`Tipo de notificación inválido: ${n.tipo}`);
  const roles = serializarRolesDestino(n.roles_destino);
  const [result]: any = await pool.query(
    `INSERT INTO notificaciones (tipo, mensaje, roles_destino, id_alumno, faltas_snapshot, id_periodo, anio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [n.tipo, n.mensaje, roles, n.id_alumno ?? null, n.faltas_snapshot ?? 0, n.id_periodo ?? null, n.anio ?? null]
  );
  return result.insertId;
}

/**
 * Busca una notificación solo si está dirigida al rol indicado (si no, null: el caller responde 404).
 * Con bloquear=true toma un lock de fila (usar dentro de una transacción).
 */
export async function buscarNotificacionDeRol(
  conn: Queryable,
  id: number,
  rol: unknown,
  bloquear = false
): Promise<NotificacionAcceso | null> {
  if (typeof rol !== 'string') return null;
  const [rows]: any = await conn.query(
    `SELECT n.id, n.id_alumno, n.estado, n.gestionada_at,
            CONCAT(g.nombre, ' ', g.apellido) AS gestionada_por_nombre
     FROM notificaciones n
     LEFT JOIN usuarios g ON g.id = n.gestionada_por
     WHERE n.id = ? AND FIND_IN_SET(?, n.roles_destino) > 0
     ${bloquear ? 'FOR UPDATE' : ''}`,
    [id, rol]
  );
  return rows[0] ?? null;
}
