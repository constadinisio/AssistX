import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import app from '../../src/app';
import pool from '../../src/config/db';
import { crearUsuario, primerAlumno, limpiarNotificaciones, UsuarioTest } from '../helpers/fixtures';

// 2do bimestre 2026 según el seed de períodos (2026-05-01 a 2026-06-30).
const FECHAS = ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07'];

describe('generación de alertas de riesgo al guardar asistencia', () => {
  let preceptor: UsuarioTest;
  let ef: UsuarioTest;
  let alumno: { id: number; id_curso: number };

  const guardarAusente = (u: UsuarioTest, fecha: string) =>
    request(app)
      .post('/api/asistencias')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ id_curso: alumno.id_curso, fecha, registros: [{ id_alumno: alumno.id, estado: 'Ausente', observaciones: '' }] });

  beforeAll(async () => {
    preceptor = await crearUsuario('Preceptor/a');
    ef = await crearUsuario('Profesor/a EF');
    alumno = await primerAlumno();
  });

  beforeEach(async () => {
    await limpiarNotificaciones();
    await pool.query('DELETE FROM asistencias WHERE id_alumno = ?', [alumno.id]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('la 4ta falta genera una notificación dirigida a los roles de riesgo', async () => {
    for (const f of FECHAS.slice(0, 3)) await guardarAusente(preceptor, f).expect(201);
    const res = await guardarAusente(preceptor, FECHAS[3]).expect(201);

    expect(res.body.alertas).toHaveLength(1);
    expect(res.body.alertas[0].tipo).toBe('Riesgo');

    const [rows]: any = await pool.query('SELECT tipo, roles_destino FROM notificaciones WHERE id_alumno = ?', [alumno.id]);
    expect(rows).toEqual([{ tipo: 'Riesgo', roles_destino: 'Preceptor/a,Secretario/a,Directivo/a' }]);
  });

  it('si guarda Profesor/a EF, la notificación se crea pero la respuesta no trae alertas', async () => {
    for (const f of FECHAS.slice(0, 3)) await guardarAusente(ef, f).expect(201);
    const res = await guardarAusente(ef, FECHAS[3]).expect(201);

    expect(res.body.alertas).toEqual([]);
    const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM notificaciones WHERE id_alumno = ?', [alumno.id]);
    expect(Number(rows[0].n)).toBe(1);
  });

  it('el dedup se mantiene: repetir la 4ta falta no crea otra notificación', async () => {
    for (const f of FECHAS) await guardarAusente(preceptor, f).expect(201);
    const res = await guardarAusente(preceptor, FECHAS[3]).expect(201);

    expect(res.body.alertas).toEqual([]);
    const [rows]: any = await pool.query('SELECT COUNT(*) AS n FROM notificaciones WHERE id_alumno = ?', [alumno.id]);
    expect(Number(rows[0].n)).toBe(1);
  });
});
