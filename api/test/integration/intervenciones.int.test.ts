import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import app from '../../src/app';
import pool from '../../src/config/db';
import { crearUsuario, primerAlumno, insertarNotificacion, limpiarNotificaciones, UsuarioTest } from '../helpers/fixtures';

describe('POST /api/intervenciones', () => {
  let preceptor: UsuarioTest;
  let secretaria: UsuarioTest;
  let ef: UsuarioTest;
  let alumnoId: number;
  let otroAlumnoId: number;

  const avisar = (u: UsuarioTest, body: object) =>
    request(app).post('/api/intervenciones').set('Authorization', `Bearer ${u.token}`).send(body);

  beforeAll(async () => {
    preceptor = await crearUsuario('Preceptor/a');
    secretaria = await crearUsuario('Secretario/a');
    ef = await crearUsuario('Profesor/a EF');
    alumnoId = (await primerAlumno()).id;
    const [rows]: any = await pool.query('SELECT id FROM alumnos WHERE id <> ? ORDER BY id LIMIT 1', [alumnoId]);
    otroAlumnoId = rows[0].id;
  });

  beforeEach(async () => {
    await limpiarNotificaciones();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('registra la intervención y marca la notificación gestionada por quien la hizo', async () => {
    const id = await insertarNotificacion();
    await avisar(preceptor, { id_alumno: alumnoId, id_notificacion: id, motivo: 'Aviso' }).expect(201);

    const [[n]]: any = await pool.query('SELECT estado, gestionada_por, gestionada_at FROM notificaciones WHERE id = ?', [id]);
    expect(n.estado).toBe('gestionada');
    expect(n.gestionada_por).toBe(preceptor.id);
    expect(n.gestionada_at).not.toBeNull();
  });

  it('un segundo aviso responde 409 con quién la gestionó y no duplica la intervención', async () => {
    const id = await insertarNotificacion();
    await avisar(preceptor, { id_alumno: alumnoId, id_notificacion: id }).expect(201);
    const res = await avisar(secretaria, { id_alumno: alumnoId, id_notificacion: id }).expect(409);

    expect(res.body.gestionada_por_nombre).toBe(preceptor.nombre);
    expect(res.body.gestionada_at).toBeTruthy();
    const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM intervenciones WHERE id_notificacion = ?', [id]);
    expect(Number(rows[0].n)).toBe(1);
  });

  it('dos avisos simultáneos: uno 201 y otro 409', async () => {
    const id = await insertarNotificacion();
    const [r1, r2] = await Promise.all([
      avisar(preceptor, { id_alumno: alumnoId, id_notificacion: id }),
      avisar(secretaria, { id_alumno: alumnoId, id_notificacion: id }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
  });

  it('notificación no dirigida a su rol responde 404', async () => {
    const id = await insertarNotificacion();
    await avisar(ef, { id_alumno: alumnoId, id_notificacion: id }).expect(404);
    const [[n]]: any = await pool.query('SELECT estado FROM notificaciones WHERE id = ?', [id]);
    expect(n.estado).toBe('nueva');
  });

  it('notificación inexistente responde 404', async () => {
    await avisar(preceptor, { id_alumno: alumnoId, id_notificacion: 999999 }).expect(404);
  });

  it('notificación de otro alumno responde 400', async () => {
    const id = await insertarNotificacion({ id_alumno: alumnoId });
    await avisar(preceptor, { id_alumno: otroAlumnoId, id_notificacion: id }).expect(400);
  });

  it('ids inválidos responden 400', async () => {
    await avisar(preceptor, {}).expect(400);
    await avisar(preceptor, { id_alumno: 'abc' }).expect(400);
    await avisar(preceptor, { id_alumno: alumnoId, id_notificacion: 'x' }).expect(400);
  });

  it('permite una intervención sin notificación asociada', async () => {
    await avisar(preceptor, { id_alumno: alumnoId, motivo: 'Llamado preventivo' }).expect(201);
  });
});
