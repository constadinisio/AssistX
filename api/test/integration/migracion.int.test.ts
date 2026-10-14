import fs from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Connection } from 'mysql2/promise';
import { archivosBase, recrearBase, conectar, RUTA_MIGRACION_NOTIF_USUARIO } from '../helpers/db';

const BASE = 'assistx_test_mig';
const ROLES_RIESGO_CSV = 'Preceptor/a,Secretario/a,Directivo/a';

describe('migración 2026-10-14 notificaciones por usuario', () => {
  let conn: Connection;
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    // Estado previo: dump + migraciones anteriores, sin la nueva.
    const previas = archivosBase().filter(f => f !== RUTA_MIGRACION_NOTIF_USUARIO);
    await recrearBase(BASE, previas);
    conn = await conectar(BASE);

    const [[alumno]]: any = await conn.query('SELECT MIN(id) AS id FROM alumnos');
    const [[preceptor]]: any = await conn.query("SELECT id FROM usuarios WHERE rol = 'Preceptor/a' AND estado = 'Activo' LIMIT 1");
    ids.preceptor = preceptor.id;

    const [pend]: any = await conn.query(
      "INSERT INTO usuarios (nombre, apellido, usuario, password, rol, estado) VALUES ('Pe', 'Ndiente', 'pendiente_mig', 'x', 'Preceptor/a', 'Pendiente')"
    );
    ids.pendiente = pend.insertId;

    const insertar = async (leida: number, estado: string) => {
      const [r]: any = await conn.query(
        "INSERT INTO notificaciones (id_alumno, tipo, faltas_snapshot, mensaje, estado, leida) VALUES (?, 'Riesgo', 4, 'm', ?, ?)",
        [alumno.id, estado, leida]
      );
      return r.insertId as number;
    };
    ids.leida = await insertar(1, 'nueva');
    ids.gestionadaConIntervencion = await insertar(0, 'gestionada');
    ids.gestionadaSinIntervencion = await insertar(0, 'gestionada');

    await conn.query(
      "INSERT INTO intervenciones (id_alumno, id_notificacion, id_usuario, motivo, created_at) VALUES (?, ?, ?, 'aviso', '2026-05-10 10:00:00')",
      [alumno.id, ids.gestionadaConIntervencion, ids.preceptor]
    );

    await conn.query(fs.readFileSync(RUTA_MIGRACION_NOTIF_USUARIO, 'utf8'));
  });

  afterAll(async () => {
    await conn?.end();
  });

  it('asigna los roles de riesgo a las notificaciones existentes', async () => {
    const [rows]: any = await conn.query('SELECT DISTINCT roles_destino FROM notificaciones');
    expect(rows.map((r: any) => r.roles_destino)).toEqual([ROLES_RIESGO_CSV]);
  });

  it('roles_destino queda NOT NULL y sin valor por defecto', async () => {
    const [cols]: any = await conn.query("SHOW COLUMNS FROM notificaciones LIKE 'roles_destino'");
    expect(cols[0].Null).toBe('NO');
    expect(cols[0].Default).toBeNull();
  });

  it('las leídas quedan leídas para cada usuario activo de esos roles, y solo para ellos', async () => {
    const [esperados]: any = await conn.query(
      "SELECT id FROM usuarios WHERE estado = 'Activo' AND rol IN ('Preceptor/a','Secretario/a','Directivo/a') ORDER BY id"
    );
    const [lecturas]: any = await conn.query(
      'SELECT id_usuario FROM notificacion_lecturas WHERE id_notificacion = ? ORDER BY id_usuario', [ids.leida]
    );
    expect(lecturas.map((l: any) => l.id_usuario)).toEqual(esperados.map((u: any) => u.id));
    expect(lecturas.map((l: any) => l.id_usuario)).not.toContain(ids.pendiente);
  });

  it('las no leídas no tienen lecturas', async () => {
    const [lecturas]: any = await conn.query(
      'SELECT COUNT(*) AS n FROM notificacion_lecturas WHERE id_notificacion IN (?, ?)',
      [ids.gestionadaConIntervencion, ids.gestionadaSinIntervencion]
    );
    expect(Number(lecturas[0].n)).toBe(0);
  });

  it('las gestionadas toman quién y cuándo de la última intervención', async () => {
    const [[n]]: any = await conn.query(
      "SELECT gestionada_por, DATE_FORMAT(gestionada_at, '%Y-%m-%d %H:%i:%s') AS at FROM notificaciones WHERE id = ?",
      [ids.gestionadaConIntervencion]
    );
    expect(n.gestionada_por).toBe(ids.preceptor);
    expect(n.at).toBe('2026-05-10 10:00:00');
  });

  it('una gestionada sin intervención conserva fecha y queda sin autor', async () => {
    const [[n]]: any = await conn.query(
      'SELECT gestionada_por, gestionada_at FROM notificaciones WHERE id = ?', [ids.gestionadaSinIntervencion]
    );
    expect(n.gestionada_por).toBeNull();
    expect(n.gestionada_at).not.toBeNull();
  });

  it('elimina la columna leida y deja tipo como VARCHAR e id_alumno nullable', async () => {
    const [cols]: any = await conn.query('SHOW COLUMNS FROM notificaciones');
    const porNombre = Object.fromEntries(cols.map((c: any) => [c.Field, c]));
    expect(porNombre.leida).toBeUndefined();
    expect(porNombre.tipo.Type).toBe('varchar(40)');
    expect(porNombre.id_alumno.Null).toBe('YES');
  });
});
