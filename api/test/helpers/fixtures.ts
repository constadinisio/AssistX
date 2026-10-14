import jwt from 'jsonwebtoken';
import pool from '../../src/config/db';

export interface UsuarioTest {
  id: number;
  rol: string;
  token: string;
  nombre: string;
}

let contador = 0;

/** Crea un usuario activo y le firma un JWT igual al del login ({ id, rol }). */
export async function crearUsuario(rol: string): Promise<UsuarioTest> {
  contador += 1;
  const usuario = `t_${Date.now().toString(36)}_${contador}`;
  const [r]: any = await pool.query(
    "INSERT INTO usuarios (nombre, apellido, usuario, password, rol, estado) VALUES ('Test', ?, ?, 'x', ?, 'Activo')",
    [usuario, usuario, rol]
  );
  const token = jwt.sign({ id: r.insertId, rol }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  return { id: r.insertId, rol, token, nombre: `Test ${usuario}` };
}

/** Firma un token arbitrario (para probar roles ausentes o inválidos). */
export function tokenCon(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

export async function primerAlumno(): Promise<{ id: number; id_curso: number }> {
  const [rows]: any = await pool.query('SELECT id, id_curso FROM alumnos ORDER BY id LIMIT 1');
  return rows[0];
}

export async function insertarNotificacion(
  opts: { roles_destino?: string; id_alumno?: number | null } = {}
): Promise<number> {
  const idAlumno = opts.id_alumno === undefined ? (await primerAlumno()).id : opts.id_alumno;
  const [r]: any = await pool.query(
    "INSERT INTO notificaciones (id_alumno, tipo, faltas_snapshot, mensaje, roles_destino) VALUES (?, 'Riesgo', 4, 'Mensaje de prueba', ?)",
    [idAlumno, opts.roles_destino ?? 'Preceptor/a,Secretario/a,Directivo/a']
  );
  return r.insertId;
}

export async function limpiarNotificaciones(): Promise<void> {
  await pool.query('DELETE FROM notificacion_lecturas');
  await pool.query('DELETE FROM intervenciones');
  await pool.query('DELETE FROM notificaciones');
}
