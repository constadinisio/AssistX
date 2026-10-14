import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import app from '../../src/app';
import pool from '../../src/config/db';
import { crearUsuario, tokenCon, insertarNotificacion, limpiarNotificaciones, UsuarioTest } from '../helpers/fixtures';

describe('bandeja de notificaciones por usuario', () => {
  let preceptorA: UsuarioTest;
  let preceptorB: UsuarioTest;
  let secretaria: UsuarioTest;
  let ef: UsuarioTest;

  const listar = (token: string) =>
    request(app).get('/api/notificaciones').set('Authorization', `Bearer ${token}`);
  const leer = (token: string, id: number | string) =>
    request(app).patch(`/api/notificaciones/${id}/leida`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    preceptorA = await crearUsuario('Preceptor/a');
    preceptorB = await crearUsuario('Preceptor/a');
    secretaria = await crearUsuario('Secretario/a');
    ef = await crearUsuario('Profesor/a EF');
  });

  beforeEach(async () => {
    await limpiarNotificaciones();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('cada rol ve solo lo dirigido a su rol', async () => {
    const paraTodos = await insertarNotificacion();
    const soloSecretaria = await insertarNotificacion({ roles_destino: 'Secretario/a' });

    const delPreceptor = (await listar(preceptorA.token).expect(200)).body.map((n: any) => n.id);
    const deSecretaria = (await listar(secretaria.token).expect(200)).body.map((n: any) => n.id);

    expect(delPreceptor).toEqual([paraTodos]);
    expect(deSecretaria.sort()).toEqual([paraTodos, soloSecretaria].sort());
  });

  it('Profesor/a EF no ve alertas de riesgo', async () => {
    await insertarNotificacion();
    expect((await listar(ef.token).expect(200)).body).toEqual([]);
  });

  it('el leído es independiente entre dos usuarios del mismo rol', async () => {
    const id = await insertarNotificacion();
    await leer(preceptorA.token, id).expect(200);

    const deA = (await listar(preceptorA.token)).body.find((n: any) => n.id === id);
    const deB = (await listar(preceptorB.token)).body.find((n: any) => n.id === id);
    expect(deA.leida).toBe(1);
    expect(deB.leida).toBe(0);
  });

  it('marcar como leída dos veces es idempotente', async () => {
    const id = await insertarNotificacion();
    await leer(preceptorA.token, id).expect(200);
    await leer(preceptorA.token, id).expect(200);
    const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM notificacion_lecturas WHERE id_notificacion = ?', [id]);
    expect(Number(rows[0].n)).toBe(1);
  });

  it('marcar una notificación de otro rol responde 404', async () => {
    const id = await insertarNotificacion({ roles_destino: 'Secretario/a' });
    await leer(preceptorA.token, id).expect(404);
  });

  it('id inválido responde 400', async () => {
    await leer(preceptorA.token, 'abc').expect(400);
    await leer(preceptorA.token, '0').expect(400);
  });

  it('marcar todas marca solo las del usuario', async () => {
    const a = await insertarNotificacion();
    const b = await insertarNotificacion();
    await insertarNotificacion({ roles_destino: 'Secretario/a' });

    const res = await request(app)
      .patch('/api/notificaciones/leidas')
      .set('Authorization', `Bearer ${preceptorA.token}`)
      .expect(200);
    expect(res.body.marcadas).toBe(2);

    const deA = (await listar(preceptorA.token)).body;
    expect(deA.map((n: any) => [n.id, n.leida]).sort()).toEqual([[a, 1], [b, 1]].sort());
    const deSecretaria = (await listar(secretaria.token)).body;
    expect(deSecretaria.every((n: any) => n.leida === 0)).toBe(true);
    const deB = (await listar(preceptorB.token)).body;
    expect(deB.map((n: any) => [n.id, n.leida]).sort()).toEqual([[a, 0], [b, 0]].sort());
  });

  it('las no leídas aparecen primero', async () => {
    const vieja = await insertarNotificacion();
    const nueva = await insertarNotificacion();
    await leer(preceptorA.token, nueva).expect(200);
    const ids = (await listar(preceptorA.token)).body.map((n: any) => n.id);
    expect(ids).toEqual([vieja, nueva]);
  });

  it('una notificación sin alumno aparece con nombre y apellido null', async () => {
    const id = await insertarNotificacion({ id_alumno: null });
    const n = (await listar(preceptorA.token)).body.find((x: any) => x.id === id);
    expect(n).toBeDefined();
    expect(n.nombre).toBeNull();
    expect(n.apellido).toBeNull();
  });

  it('un token sin rol o con rol inexistente no ve nada ni puede marcar', async () => {
    const id = await insertarNotificacion();
    for (const token of [tokenCon({ id: preceptorA.id }), tokenCon({ id: preceptorA.id, rol: 'Hacker' })]) {
      expect((await listar(token).expect(200)).body).toEqual([]);
      await leer(token, id).expect(404);
    }
  });

  it('expone quién gestionó la notificación', async () => {
    const id = await insertarNotificacion();
    await pool.query("UPDATE notificaciones SET estado = 'gestionada', gestionada_por = ?, gestionada_at = NOW() WHERE id = ?", [secretaria.id, id]);
    const n = (await listar(preceptorA.token)).body.find((x: any) => x.id === id);
    expect(n.estado).toBe('gestionada');
    expect(n.gestionada_por_nombre).toBe(secretaria.nombre);
    expect(n.gestionada_at).not.toBeNull();
  });
});
