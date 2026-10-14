# Notificaciones por usuario (bandeja individual) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada usuario tenga su propia bandeja de notificaciones (leído individual, filtrado por rol) con estado "gestionada" global, sobre un modelo de notificación genérico.

**Architecture:** `notificaciones` guarda cada evento una sola vez con `roles_destino` (CSV de roles); la nueva tabla `notificacion_lecturas` registra quién leyó qué. La API filtra por el rol del JWT y calcula `leida` por usuario, manteniendo la forma de respuesta actual. Lógica pura en `utils/notificaciones.ts` (testeada con unitarios) y acceso a datos en `utils/notificacionesData.ts`, igual que el par existente `riesgo.ts` / `riesgoData.ts`.

**Tech Stack:** Node + Express 5 + TypeScript, mysql2 (sin ORM), MariaDB 11.4, Vitest 2, supertest (nuevo, dev), React 19 + Vite.

**Spec:** [`docs/superpowers/specs/2026-10-14-notificaciones-por-usuario-design.md`](../specs/2026-10-14-notificaciones-por-usuario-design.md)

## Global Constraints

- Roles exactos (de `api/src/utils/validateRegistro.ts`): `'Directivo/a'`, `'Secretario/a'`, `'Preceptor/a'`, `'Profesor/a EF'`.
- Destinatarios de riesgo: `ROLES_RIESGO = ['Preceptor/a', 'Secretario/a', 'Directivo/a']`. Profesor/a EF no recibe alertas de riesgo.
- "Leída" es por usuario; "gestionada" es global (registra `gestionada_por` y `gestionada_at`).
- Sin ORM; todas las queries parametrizadas con `pool.query(sql, params)`.
- Errores al cliente: `{ message }` en español, sin datos internos. Detalle con `console.error` en el servidor.
- Códigos: 400 input inválido · 404 inexistente o no dirigida a su rol · 409 ya gestionada · 500 inesperado.
- La respuesta de `GET /api/notificaciones` conserva sus campos actuales; `leida` sigue siendo `0`/`1`.
- Única dependencia nueva: `supertest` + `@types/supertest` (devDependencies de `api/`).
- Los tests de integración **solo** pueden crear/borrar bases cuyo nombre empiece con `assistx_test`. Nunca tocar `assistx_db`.
- Sin envío externo (mail/WhatsApp), sin cuentas de familia, sin tiempo real.
- Commits en formato conventional (`feat:`, `test:`, `refactor:`…) en español.
- Comandos de la API se corren desde `api/`; los del frontend desde la raíz del repo.

## Review Focus

1. **Profesor/a EF guarda una asistencia que cruza un umbral:** la notificación se crea para los roles de riesgo, pero la respuesta del POST trae `alertas: []`, así EF no ve un pop-up con un "Enviar Aviso" que le daría 404. → Task 3.
2. **"Enviar Aviso" con `id_notificacion` de otro alumno:** se rechaza con 400 en vez de registrar la intervención sobre el alumno equivocado. → Task 5.
3. **Dos personas pulsan "Enviar Aviso" a la vez sobre la misma alerta:** exactamente una recibe 201 y la otra 409 (lock `FOR UPDATE`). → Task 5.
4. **Token sin `rol` o con un rol que no existe:** `GET` devuelve `[]` (no 500) y `PATCH /:id/leida` devuelve 404. → Task 4.
5. **Notificación sin alumno (`id_alumno` NULL, preparada para el subproyecto 2):** aparece en el listado con `nombre`/`apellido` en `null` en lugar de desaparecer por un `JOIN`. → Task 4.

---

## File Structure

**API (`api/`)**

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/utils/notificaciones.ts` | Crear | Lógica pura: tipos válidos, parseo/serialización de `roles_destino`, `esDestinatario`, `parsearId`. |
| `src/utils/notificaciones.test.ts` | Crear | Unitarios de lo anterior. |
| `src/utils/roles.ts` | Modificar | Agrega `ROLES_RIESGO` y `esRolDeRiesgo`. |
| `src/utils/roles.test.ts` | Modificar | Unitarios de `esRolDeRiesgo`. |
| `src/utils/notificacionesData.ts` | Crear | Acceso a datos: `crearNotificacion`, `buscarNotificacionDeRol`. |
| `src/controllers/notificacionController.ts` | Modificar | Generación de riesgo vía `crearNotificacion`; listar / marcar leída / marcar todas por usuario. |
| `src/controllers/intervencionController.ts` | Modificar | Validación, 404/409/400, `gestionada_por`/`gestionada_at`. |
| `src/controllers/asistenciaController.ts` | Modificar | Solo devuelve `alertas` a roles de riesgo. |
| `src/routes/notificacionRoutes.ts` | Modificar | Ruta `PATCH /leidas`. |
| `src/app.ts` | Modificar | Exporta `app` sin `listen`. |
| `src/server.ts` | Crear | Arranque (`listen`). |
| `package.json` | Modificar | Scripts `dev`/`start` → `server`, `test:int`; devDeps supertest. |
| `vitest.config.ts` | Modificar | Excluye `test/integration/**` de `npm test`. |
| `vitest.integration.config.ts` | Crear | Config de integración (globalSetup, setupFiles, sin paralelismo). |
| `test/setupEnv.ts` | Crear | Fuerza `DB_NAME=assistx_test` antes de importar la app. |
| `test/globalSetup.ts` | Crear | Recrea `assistx_test` con dump + migraciones. |
| `test/helpers/db.ts` | Crear | `recrearBase`, `archivosBase`, `conectar`, guardas de nombre. |
| `test/helpers/fixtures.ts` | Crear | Usuarios de prueba con JWT, notificaciones de prueba, limpieza. |
| `test/integration/*.int.test.ts` | Crear | Tests de integración por área. |

**DB:** `db/migrations/2026-10-14_notificaciones_por_usuario.sql` (crear).

**Frontend (`src/`)**

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/services/notificaciones.ts` | Crear | Cliente HTTP de notificaciones/intervenciones, manejo del 409, `textoGestion`. |
| `src/components/layout/TopBar.tsx` | Modificar | Usa el servicio; "Marcar todas"; "Gestionada por…"; errores visibles. |
| `src/views/dashboard/Dashboard.tsx` | Modificar | Usa el servicio; maneja 409. |
| `src/views/preceptor/AttendanceBoard.tsx` | Modificar | Usa el servicio; maneja 409. |

---

### Task 1: Lógica pura de notificaciones y roles de riesgo

**Files:**
- Create: `api/src/utils/notificaciones.ts`
- Create: `api/src/utils/notificaciones.test.ts`
- Modify: `api/src/utils/roles.ts`
- Modify: `api/src/utils/roles.test.ts`

**Interfaces:**
- Consumes: `ROLES_VALIDOS`, `RolValido` de `api/src/utils/validateRegistro.ts`.
- Produces:
  - `TIPOS_NOTIFICACION: readonly ['Riesgo','Critico','RegularidadAnual']`, `type TipoNotificacion`
  - `esTipoValido(tipo: unknown): tipo is TipoNotificacion`
  - `parsearRolesDestino(csv: unknown): RolValido[]`
  - `serializarRolesDestino(roles: readonly string[]): string` (lanza `Error` si queda vacío o hay un rol inválido)
  - `esDestinatario(rol: unknown, rolesDestino: unknown): boolean`
  - `parsearId(valor: unknown): number | null`
  - En `roles.ts`: `ROLES_RIESGO: readonly RolValido[]`, `esRolDeRiesgo(rol: unknown): boolean`

- [ ] **Step 1: Escribir los tests que fallan de `notificaciones.ts`**

Crear `api/src/utils/notificaciones.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  TIPOS_NOTIFICACION,
  esTipoValido,
  parsearRolesDestino,
  serializarRolesDestino,
  esDestinatario,
  parsearId,
} from './notificaciones';

describe('esTipoValido', () => {
  it('acepta los tipos de riesgo', () => {
    for (const t of TIPOS_NOTIFICACION) expect(esTipoValido(t)).toBe(true);
  });
  it('rechaza un tipo desconocido', () => expect(esTipoValido('Spam')).toBe(false));
  it('rechaza valores no string', () => {
    expect(esTipoValido(undefined)).toBe(false);
    expect(esTipoValido(3)).toBe(false);
  });
});

describe('parsearRolesDestino', () => {
  it('separa por coma y recorta espacios', () =>
    expect(parsearRolesDestino(' Preceptor/a , Directivo/a ')).toEqual(['Preceptor/a', 'Directivo/a']));
  it('descarta vacíos y duplicados', () =>
    expect(parsearRolesDestino('Preceptor/a,,Preceptor/a,')).toEqual(['Preceptor/a']));
  it('descarta roles inexistentes', () =>
    expect(parsearRolesDestino('Preceptor/a,Hacker')).toEqual(['Preceptor/a']));
  it('devuelve [] para valores no string', () => {
    expect(parsearRolesDestino(null)).toEqual([]);
    expect(parsearRolesDestino(undefined)).toEqual([]);
  });
});

describe('serializarRolesDestino', () => {
  it('une roles válidos con coma', () =>
    expect(serializarRolesDestino(['Preceptor/a', 'Secretario/a'])).toBe('Preceptor/a,Secretario/a'));
  it('elimina duplicados', () =>
    expect(serializarRolesDestino(['Preceptor/a', 'Preceptor/a'])).toBe('Preceptor/a'));
  it('lanza si la lista está vacía', () => expect(() => serializarRolesDestino([])).toThrow());
  it('lanza si hay un rol inválido', () => expect(() => serializarRolesDestino(['Preceptor/a', 'Hacker'])).toThrow());
});

describe('esDestinatario', () => {
  const destino = 'Preceptor/a,Secretario/a,Directivo/a';
  it('true si el rol está en la lista', () => expect(esDestinatario('Secretario/a', destino)).toBe(true));
  it('false si el rol no está', () => expect(esDestinatario('Profesor/a EF', destino)).toBe(false));
  it('false si el rol es undefined', () => expect(esDestinatario(undefined, destino)).toBe(false));
  it('no confunde prefijos', () => expect(esDestinatario('Preceptor', destino)).toBe(false));
});

describe('parsearId', () => {
  it('acepta enteros positivos como string o número', () => {
    expect(parsearId('5')).toBe(5);
    expect(parsearId(7)).toBe(7);
  });
  it('rechaza cero, negativos, decimales y texto', () => {
    for (const v of ['0', '-1', '1.5', 'abc', '5abc', '', ' ', 0, -3, 2.5, null, undefined, {}]) {
      expect(parsearId(v)).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `api/`): `npx vitest run src/utils/notificaciones.test.ts`
Expected: FAIL — `Failed to resolve import "./notificaciones"`.

- [ ] **Step 3: Implementar `api/src/utils/notificaciones.ts`**

```ts
// Lógica pura del modelo de notificaciones (sin acceso a DB).
import { ROLES_VALIDOS, RolValido } from './validateRegistro';

export const TIPOS_NOTIFICACION = ['Riesgo', 'Critico', 'RegularidadAnual'] as const;
export type TipoNotificacion = typeof TIPOS_NOTIFICACION[number];

const esRolValido = (rol: string): rol is RolValido =>
  (ROLES_VALIDOS as readonly string[]).includes(rol);

export function esTipoValido(tipo: unknown): tipo is TipoNotificacion {
  return typeof tipo === 'string' && (TIPOS_NOTIFICACION as readonly string[]).includes(tipo);
}

/** Convierte el CSV guardado en DB en una lista de roles válidos (ignora vacíos, duplicados e inválidos). */
export function parsearRolesDestino(csv: unknown): RolValido[] {
  if (typeof csv !== 'string') return [];
  const roles = csv.split(',').map(r => r.trim()).filter(r => r.length > 0);
  return [...new Set(roles)].filter(esRolValido);
}

/** Convierte una lista de roles al CSV que se guarda en DB. Lanza si es inválida: es un error de programación. */
export function serializarRolesDestino(roles: readonly string[]): string {
  const unicos = [...new Set(roles.map(r => r.trim()))];
  if (unicos.length === 0) throw new Error('roles_destino no puede estar vacío');
  const invalidos = unicos.filter(r => !esRolValido(r));
  if (invalidos.length > 0) throw new Error(`Roles inválidos en roles_destino: ${invalidos.join(', ')}`);
  return unicos.join(',');
}

export function esDestinatario(rol: unknown, rolesDestino: unknown): boolean {
  return typeof rol === 'string' && parsearRolesDestino(rolesDestino).includes(rol as RolValido);
}

/** Id entero positivo desde params/body; null si no es válido. */
export function parsearId(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isInteger(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/utils/notificaciones.test.ts`
Expected: PASS (todos los tests).

- [ ] **Step 5: Agregar tests que fallan de `esRolDeRiesgo`**

Agregar al final de `api/src/utils/roles.test.ts` y sumar `esRolDeRiesgo, ROLES_RIESGO` al import existente (`import { esRolGestion, puedeAsignarRol, esRolDeRiesgo, ROLES_RIESGO } from './roles';`):

```ts
describe('esRolDeRiesgo', () => {
  it('Preceptor/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Preceptor/a')).toBe(true));
  it('Secretario/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Secretario/a')).toBe(true));
  it('Directivo/a recibe alertas de riesgo', () => expect(esRolDeRiesgo('Directivo/a')).toBe(true));
  it('Profesor/a EF no recibe alertas de riesgo', () => expect(esRolDeRiesgo('Profesor/a EF')).toBe(false));
  it('undefined no recibe alertas de riesgo', () => expect(esRolDeRiesgo(undefined)).toBe(false));
  it('ROLES_RIESGO no incluye a Profesor/a EF', () => expect(ROLES_RIESGO).not.toContain('Profesor/a EF'));
});
```

- [ ] **Step 6: Correr y verificar que falla**

Run: `npx vitest run src/utils/roles.test.ts`
Expected: FAIL — `esRolDeRiesgo is not a function` (o error de import).

- [ ] **Step 7: Implementar en `api/src/utils/roles.ts`**

Agregar debajo de `ROLES_GESTION` / `esRolGestion`, siguiendo su patrón:

```ts
// Roles que reciben las alertas de riesgo de asistencia (bandeja por usuario).
export const ROLES_RIESGO: readonly RolValido[] = ['Preceptor/a', 'Secretario/a', 'Directivo/a'];

export function esRolDeRiesgo(rol: unknown): boolean {
  return typeof rol === 'string' && (ROLES_RIESGO as readonly string[]).includes(rol);
}
```

- [ ] **Step 8: Correr toda la suite unitaria**

Run: `npm test`
Expected: PASS (incluye `riesgo.test.ts`, `roles.test.ts`, `notificaciones.test.ts`).

- [ ] **Step 9: Commit**

```bash
git add api/src/utils/notificaciones.ts api/src/utils/notificaciones.test.ts api/src/utils/roles.ts api/src/utils/roles.test.ts
git commit -m "feat: logica pura de notificaciones por rol y roles de riesgo"
```

---

### Task 2: Infra de tests de integración + migración de esquema

**Files:**
- Modify: `api/src/app.ts`
- Create: `api/src/server.ts`
- Modify: `api/package.json`
- Modify: `api/vitest.config.ts`
- Create: `api/vitest.integration.config.ts`
- Create: `api/test/setupEnv.ts`, `api/test/globalSetup.ts`, `api/test/helpers/db.ts`
- Create: `db/migrations/2026-10-14_notificaciones_por_usuario.sql`
- Test: `api/test/integration/migracion.int.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces:
  - `app.ts`: `export default app` (sin `listen`).
  - `test/helpers/db.ts`: `BASE_TEST = 'assistx_test'`, `archivosBase(): string[]`, `recrearBase(nombre: string, archivos: string[]): Promise<void>`, `conectar(nombre: string): Promise<mysql.Connection>`, `RUTA_MIGRACION_NOTIF_USUARIO: string`.
  - Script `npm run test:int` (Vitest con `vitest.integration.config.ts`).
  - Esquema nuevo: `notificaciones.roles_destino`, `gestionada_por`, `gestionada_at`, `tipo VARCHAR(40)`, `id_alumno NULL`, sin `leida`; tabla `notificacion_lecturas`.

- [ ] **Step 1: Separar app de arranque**

En `api/src/app.ts`, reemplazar el bloque final (desde `// Debug de puerto y DB` hasta el cierre de `app.listen(...)`) por:

```ts
export default app;
```

Crear `api/src/server.ts`:

```ts
import app from './app';

// Debug de puerto y DB (solo para desarrollo)
console.log(`🔧 Puerto configurado: ${process.env.PORT}`);
console.log(`🔧 Host DB: ${process.env.DB_HOST}`);

const PORT = 5000;
const HOST = '127.0.0.1'; // Forzamos localhost para coincidir exactamente con el proxy

app.listen(PORT, HOST, () => {
    console.log(`🚀 SERVIDOR ACTIVO en: http://127.0.0.1:${PORT}`);
});
```

- [ ] **Step 2: Scripts y dependencias**

Run (desde `api/`): `npm install -D supertest @types/supertest`

En `api/package.json`, dejar `scripts` así:

```json
"scripts": {
  "dev": "ts-node-dev -r dotenv/config --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "seed": "ts-node -r dotenv/config seed.ts",
  "test": "vitest run",
  "test:int": "vitest run -c vitest.integration.config.ts"
},
```

- [ ] **Step 3: Verificar que la API sigue arrancando**

Si hay una API corriendo con el script viejo (`src/app.ts`), detenerla primero: al dejar de llamar a `listen`, ese proceso deja de servir.
Run: `npx tsc --noEmit` → Expected: sin errores.
Run: `npm run dev` (en background) → Expected: `🚀 SERVIDOR ACTIVO en: http://127.0.0.1:5000` y `🛢️  Conexión a MySQL establecida correctamente.`

- [ ] **Step 4: Configuración de Vitest**

`api/vitest.config.ts`:

```ts
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'test/integration/**'],
  },
});
```

Crear `api/vitest.integration.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.int.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    setupFiles: ['test/setupEnv.ts'],
    // Todos los archivos comparten la base assistx_test: sin paralelismo entre archivos.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
```

- [ ] **Step 5: Helpers de base de datos de test**

Crear `api/test/helpers/db.ts`:

```ts
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
```

Crear `api/test/globalSetup.ts`:

```ts
import dotenv from 'dotenv';
import path from 'node:path';
import { BASE_TEST, archivosBase, recrearBase } from './helpers/db';

export default async function setup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  await recrearBase(BASE_TEST, archivosBase());
}
```

Crear `api/test/setupEnv.ts`:

```ts
// Se ejecuta antes de cada archivo de test de integración, antes de importar la app.
// dotenv no pisa variables ya definidas, así que DB_NAME queda apuntando a la base de test.
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.DB_NAME = 'assistx_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-tests';
```

- [ ] **Step 6: Escribir el test de migración que falla**

Crear `api/test/integration/migracion.int.test.ts`:

```ts
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
```

- [ ] **Step 7: Correr y verificar que falla**

Run (desde `api/`): `npm run test:int -- test/integration/migracion.int.test.ts`
Expected: FAIL — `ENOENT ... 2026-10-14_notificaciones_por_usuario.sql`.

- [ ] **Step 8: Escribir la migración**

Crear `db/migrations/2026-10-14_notificaciones_por_usuario.sql`:

```sql
-- Migración: bandeja de notificaciones por usuario (2026-10-14)
-- Ejecutar sobre la base assistx_db DESPUÉS de 2026-06-15_notificaciones_justificativos.sql.
-- leída pasa a ser por usuario (notificacion_lecturas); gestionada sigue siendo global.

CREATE TABLE IF NOT EXISTS `notificacion_lecturas` (
  `id_notificacion` INT(11) NOT NULL,
  `id_usuario` INT(11) NOT NULL,
  `leida_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_notificacion`, `id_usuario`),
  KEY `idx_lectura_usuario` (`id_usuario`),
  CONSTRAINT `lectura_notif_fk` FOREIGN KEY (`id_notificacion`) REFERENCES `notificaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lectura_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `notificaciones`
  MODIFY COLUMN `tipo` VARCHAR(40) NOT NULL,
  MODIFY COLUMN `id_alumno` INT(11) NULL,
  ADD COLUMN `roles_destino` VARCHAR(255) NOT NULL DEFAULT '' AFTER `mensaje`,
  ADD COLUMN `gestionada_por` INT(11) NULL DEFAULT NULL AFTER `estado`,
  ADD COLUMN `gestionada_at` TIMESTAMP NULL DEFAULT NULL AFTER `gestionada_por`,
  ADD KEY `idx_notif_gestionada_por` (`gestionada_por`),
  ADD CONSTRAINT `notif_gestionada_por_fk` FOREIGN KEY (`gestionada_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

-- Hasta hoy todas las notificaciones son de riesgo de asistencia.
UPDATE `notificaciones` SET `roles_destino` = 'Preceptor/a,Secretario/a,Directivo/a';

-- Las que estaban leídas (global) quedan leídas para cada usuario activo de esos roles.
INSERT IGNORE INTO `notificacion_lecturas` (`id_notificacion`, `id_usuario`)
SELECT n.`id`, u.`id`
FROM `notificaciones` n
JOIN `usuarios` u ON FIND_IN_SET(u.`rol`, n.`roles_destino`) > 0
WHERE n.`leida` = 1 AND u.`estado` = 'Activo';

-- Quién y cuándo la gestionó: la última intervención asociada.
UPDATE `notificaciones` n
JOIN (
  SELECT `id_notificacion`, MAX(`id`) AS `ultima`
  FROM `intervenciones`
  WHERE `id_notificacion` IS NOT NULL
  GROUP BY `id_notificacion`
) ui ON ui.`id_notificacion` = n.`id`
JOIN `intervenciones` i ON i.`id` = ui.`ultima`
SET n.`gestionada_por` = i.`id_usuario`, n.`gestionada_at` = i.`created_at`
WHERE n.`estado` = 'gestionada';

-- Gestionadas sin intervención registrada: al menos conservan una fecha.
UPDATE `notificaciones` SET `gestionada_at` = `created_at`
WHERE `estado` = 'gestionada' AND `gestionada_at` IS NULL;

ALTER TABLE `notificaciones` DROP COLUMN `leida`;
```

- [ ] **Step 9: Correr y verificar que pasa**

Run: `npm run test:int -- test/integration/migracion.int.test.ts`
Expected: PASS (6 tests). El globalSetup también debe haber creado `assistx_test` sin errores.

- [ ] **Step 10: Verificar que los unitarios no corren los de integración**

Run: `npm test`
Expected: PASS, y la salida **no** lista `migracion.int.test.ts`.

- [ ] **Step 11: Commit**

```bash
git add api/src/app.ts api/src/server.ts api/package.json api/package-lock.json api/vitest.config.ts api/vitest.integration.config.ts api/test db/migrations/2026-10-14_notificaciones_por_usuario.sql
git commit -m "feat: migracion de notificaciones por usuario e infraestructura de tests de integracion"
```

---

### Task 3: Capa de datos y generación de alertas con destinatarios

**Files:**
- Create: `api/src/utils/notificacionesData.ts`
- Modify: `api/src/controllers/notificacionController.ts` (función `crearNotificacionSiNoExiste`)
- Modify: `api/src/controllers/asistenciaController.ts` (respuesta de `registrarAsistencia`)
- Create: `api/test/helpers/fixtures.ts`
- Test: `api/test/integration/generacion.int.test.ts`

**Interfaces:**
- Consumes: `esTipoValido`, `serializarRolesDestino`, `TipoNotificacion` (Task 1); `ROLES_RIESGO`, `esRolDeRiesgo` (Task 1); `app` (Task 2).
- Produces:
  - `crearNotificacion(n: NuevaNotificacion): Promise<number>` (devuelve el id insertado)
  - `interface NuevaNotificacion { tipo: TipoNotificacion; mensaje: string; roles_destino: readonly RolValido[]; id_alumno?: number | null; faltas_snapshot?: number; id_periodo?: number | null; anio?: number | null }`
  - `buscarNotificacionDeRol(conn: Queryable, id: number, rol: unknown, bloquear?: boolean): Promise<NotificacionAcceso | null>`
  - `interface NotificacionAcceso { id: number; id_alumno: number | null; estado: 'nueva' | 'gestionada'; gestionada_por_nombre: string | null; gestionada_at: Date | null }`
  - `type Queryable = Pool | PoolConnection` (de `mysql2/promise`)
  - Fixtures: `crearUsuario(rol: string): Promise<UsuarioTest>`, `interface UsuarioTest { id: number; rol: string; token: string; nombre: string }`, `primerAlumno(): Promise<{ id: number; id_curso: number }>`, `insertarNotificacion(opts?: { roles_destino?: string; id_alumno?: number | null }): Promise<number>`, `limpiarNotificaciones(): Promise<void>`

- [ ] **Step 1: Crear fixtures de integración**

Crear `api/test/helpers/fixtures.ts`:

```ts
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
```

- [ ] **Step 2: Escribir el test de generación que falla**

Crear `api/test/integration/generacion.int.test.ts`:

```ts
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
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `npm run test:int -- test/integration/generacion.int.test.ts`
Expected: FAIL — el INSERT actual no setea `roles_destino` (queda `''`, el primer test falla en `toEqual`) y EF recibe `alertas` con 1 elemento.

- [ ] **Step 4: Implementar `api/src/utils/notificacionesData.ts`**

```ts
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
```

- [ ] **Step 5: Usar `crearNotificacion` en la generación de riesgo**

En `api/src/controllers/notificacionController.ts`:

Agregar imports:

```ts
import { crearNotificacion } from '../utils/notificacionesData';
import { ROLES_RIESGO } from '../utils/roles';
```

Dentro de `crearNotificacionSiNoExiste`, reemplazar el bloque

```ts
  const [result]: any = await pool.query(
    `INSERT INTO notificaciones (id_alumno, tipo, faltas_snapshot, id_periodo, anio, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idAlumno, tipo, snapshot, idPeriodo, anio, mensaje]
  );
```

por

```ts
  const idNotificacion = await crearNotificacion({
    tipo,
    mensaje,
    roles_destino: ROLES_RIESGO,
    id_alumno: idAlumno,
    faltas_snapshot: snapshot,
    id_periodo: idPeriodo,
    anio,
  });
```

y en el `return` de esa función, cambiar `id_notificacion: result.insertId,` por `id_notificacion: idNotificacion,`.

- [ ] **Step 6: Devolver alertas solo a roles de riesgo**

En `api/src/controllers/asistenciaController.ts`:

Agregar import: `import { esRolDeRiesgo } from '../utils/roles';`

Reemplazar

```ts
        res.status(201).json({ message: 'Asistencia registrada correctamente', alertas });
```

por

```ts
        // Las notificaciones se crean igual; el pop-up solo lo ven quienes pueden gestionarlas.
        const rol = (req as any).user?.rol;
        res.status(201).json({
            message: 'Asistencia registrada correctamente',
            alertas: esRolDeRiesgo(rol) ? alertas : [],
        });
```

- [ ] **Step 7: Correr y verificar que pasa**

Run: `npm run test:int -- test/integration/generacion.int.test.ts`
Expected: PASS (3 tests).
Run: `npx tsc --noEmit` → Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add api/src/utils/notificacionesData.ts api/src/controllers/notificacionController.ts api/src/controllers/asistenciaController.ts api/test/helpers/fixtures.ts api/test/integration/generacion.int.test.ts
git commit -m "feat: notificaciones de riesgo con roles destino y alertas solo para roles de riesgo"
```

---

### Task 4: Bandeja por usuario (listar, marcar leída, marcar todas)

**Files:**
- Modify: `api/src/controllers/notificacionController.ts` (`listarNotificaciones`, `marcarLeida`, nuevo `marcarTodasLeidas`)
- Modify: `api/src/routes/notificacionRoutes.ts`
- Test: `api/test/integration/bandeja.int.test.ts`

**Interfaces:**
- Consumes: `parsearId` (Task 1); `buscarNotificacionDeRol` (Task 3); fixtures `crearUsuario`, `tokenCon`, `insertarNotificacion`, `limpiarNotificaciones` (Task 3).
- Produces (HTTP):
  - `GET /api/notificaciones` → `200 Array<{ id, id_alumno: number|null, nombre: string|null, apellido: string|null, tipo, faltas: number, mensaje, estado, leida: 0|1, created_at, gestionada_por_nombre: string|null, gestionada_at: string|null }>`
  - `PATCH /api/notificaciones/:id/leida` → `200 { message }` · `400` · `404`
  - `PATCH /api/notificaciones/leidas` → `200 { message, marcadas: number }`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `api/test/integration/bandeja.int.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:int -- test/integration/bandeja.int.test.ts`
Expected: FAIL — `listarNotificaciones` referencia `n.leida` (columna eliminada) → 500; `/leidas` no existe → 404.

- [ ] **Step 3: Implementar los handlers**

En `api/src/controllers/notificacionController.ts`, agregar imports:

```ts
import { parsearId } from '../utils/notificaciones';
import { buscarNotificacionDeRol } from '../utils/notificacionesData';
```

(`crearNotificacion` ya se importa desde `notificacionesData` en Task 3: unificar en una sola línea `import { crearNotificacion, buscarNotificacionDeRol } from '../utils/notificacionesData';`.)

Reemplazar `listarNotificaciones` y `marcarLeida` completos por:

```ts
export const listarNotificaciones = async (req: Request, res: Response) => {
  const { id: idUsuario, rol } = (req as any).user ?? {};
  if (typeof rol !== 'string') return res.json([]);
  try {
    const [rows]: any = await pool.query(
      `SELECT n.id, n.id_alumno, a.nombre, a.apellido, n.tipo,
              n.faltas_snapshot AS faltas, n.mensaje, n.estado, n.created_at,
              n.gestionada_at, CONCAT(g.nombre, ' ', g.apellido) AS gestionada_por_nombre,
              (l.id_usuario IS NOT NULL) AS leida
       FROM notificaciones n
       LEFT JOIN alumnos a ON a.id = n.id_alumno
       LEFT JOIN usuarios g ON g.id = n.gestionada_por
       LEFT JOIN notificacion_lecturas l ON l.id_notificacion = n.id AND l.id_usuario = ?
       WHERE FIND_IN_SET(?, n.roles_destino) > 0
       ORDER BY leida ASC, n.created_at DESC, n.id DESC`,
      [idUsuario ?? null, rol]
    );
    // faltas_snapshot (DECIMAL) llega como string desde mysql2; lo normalizamos a número
    res.json(rows.map((r: any) => ({ ...r, faltas: Number(r.faltas), leida: Number(r.leida) })));
  } catch (error) {
    console.error('Error en listarNotificaciones:', error);
    res.status(500).json({ message: 'Error al listar notificaciones' });
  }
};

export const marcarLeida = async (req: Request, res: Response) => {
  const id = parsearId(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Id de notificación inválido' });
  const { id: idUsuario, rol } = (req as any).user ?? {};
  try {
    const notif = await buscarNotificacionDeRol(pool, id, rol);
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada' });
    await pool.query(
      'INSERT IGNORE INTO notificacion_lecturas (id_notificacion, id_usuario) VALUES (?, ?)',
      [id, idUsuario]
    );
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(500).json({ message: 'Error al marcar la notificación' });
  }
};

export const marcarTodasLeidas = async (req: Request, res: Response) => {
  const { id: idUsuario, rol } = (req as any).user ?? {};
  if (typeof rol !== 'string') return res.json({ message: 'Sin notificaciones para marcar', marcadas: 0 });
  try {
    const [result]: any = await pool.query(
      `INSERT IGNORE INTO notificacion_lecturas (id_notificacion, id_usuario)
       SELECT n.id, ? FROM notificaciones n WHERE FIND_IN_SET(?, n.roles_destino) > 0`,
      [idUsuario, rol]
    );
    res.json({ message: 'Notificaciones marcadas como leídas', marcadas: result.affectedRows });
  } catch (error) {
    console.error('Error en marcarTodasLeidas:', error);
    res.status(500).json({ message: 'Error al marcar las notificaciones' });
  }
};
```

- [ ] **Step 4: Registrar la ruta**

`api/src/routes/notificacionRoutes.ts`:

```ts
import { Router } from 'express';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../controllers/notificacionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, listarNotificaciones);
router.patch('/leidas', verifyToken, marcarTodasLeidas);
router.patch('/:id/leida', verifyToken, marcarLeida);

export default router;
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `npm run test:int -- test/integration/bandeja.int.test.ts`
Expected: PASS (11 tests).
Run: `npx tsc --noEmit` → Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/notificacionController.ts api/src/routes/notificacionRoutes.ts api/test/integration/bandeja.int.test.ts
git commit -m "feat: bandeja de notificaciones por usuario con leido individual"
```

---

### Task 5: Intervenciones con gestión global (404 / 409 / 400)

**Files:**
- Modify: `api/src/controllers/intervencionController.ts` (reescritura de `crearIntervencion`)
- Test: `api/test/integration/intervenciones.int.test.ts`

**Interfaces:**
- Consumes: `parsearId` (Task 1); `buscarNotificacionDeRol` (Task 3); fixtures (Task 3).
- Produces (HTTP) `POST /api/intervenciones` con body `{ id_alumno: number, id_notificacion?: number | null, motivo?: string }`:
  - `201 { message, id }`
  - `400 { message }` (ids inválidos o notificación de otro alumno)
  - `404 { message }` (notificación inexistente o no dirigida a su rol)
  - `409 { message, gestionada_por_nombre: string | null, gestionada_at: string | null }`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `api/test/integration/intervenciones.int.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm run test:int -- test/integration/intervenciones.int.test.ts`
Expected: FAIL — segundo aviso responde 201 (no 409), EF no recibe 404, no se setea `gestionada_por`.

- [ ] **Step 3: Implementar `crearIntervencion`**

Reemplazar el contenido completo de `api/src/controllers/intervencionController.ts` por:

```ts
import { Request, Response } from 'express';
import pool from '../config/db';
import { parsearId } from '../utils/notificaciones';
import { buscarNotificacionDeRol } from '../utils/notificacionesData';

const MAX_MOTIVO = 1000;

export const crearIntervencion = async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const idAlumno = parsearId(body.id_alumno);
  if (idAlumno === null) return res.status(400).json({ message: 'Falta id_alumno o es inválido' });

  const traeNotificacion = body.id_notificacion !== undefined && body.id_notificacion !== null;
  const idNotificacion = traeNotificacion ? parsearId(body.id_notificacion) : null;
  if (traeNotificacion && idNotificacion === null) {
    return res.status(400).json({ message: 'id_notificacion inválido' });
  }

  const motivo = typeof body.motivo === 'string' && body.motivo.trim() !== ''
    ? body.motivo.trim().slice(0, MAX_MOTIVO)
    : null;
  const { id: idUsuario, rol } = (req as any).user ?? {};

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (idNotificacion !== null) {
      // Lock de fila: si dos personas avisan a la vez, la segunda ve 'gestionada' y recibe 409.
      const notif = await buscarNotificacionDeRol(connection, idNotificacion, rol, true);
      if (!notif) {
        await connection.rollback();
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }
      if (notif.id_alumno !== null && notif.id_alumno !== idAlumno) {
        await connection.rollback();
        return res.status(400).json({ message: 'La notificación no corresponde a ese alumno' });
      }
      if (notif.estado === 'gestionada') {
        await connection.rollback();
        return res.status(409).json({
          message: 'Esta notificación ya fue gestionada',
          gestionada_por_nombre: notif.gestionada_por_nombre,
          gestionada_at: notif.gestionada_at,
        });
      }
    }

    const [result]: any = await connection.query(
      `INSERT INTO intervenciones (id_alumno, id_notificacion, id_usuario, motivo)
       VALUES (?, ?, ?, ?)`,
      [idAlumno, idNotificacion, idUsuario ?? null, motivo]
    );
    if (idNotificacion !== null) {
      await connection.query(
        `UPDATE notificaciones SET estado = 'gestionada', gestionada_por = ?, gestionada_at = NOW() WHERE id = ?`,
        [idUsuario ?? null, idNotificacion]
      );
    }
    await connection.commit();
    res.status(201).json({ message: 'Intervención registrada', id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('Error en crearIntervencion:', error);
    res.status(500).json({ message: 'Error al registrar la intervención' });
  } finally {
    connection.release();
  }
};
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm run test:int -- test/integration/intervenciones.int.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Correr todo**

Run: `npm test && npm run test:int && npx tsc --noEmit`
Expected: todo PASS, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/intervencionController.ts api/test/integration/intervenciones.int.test.ts
git commit -m "feat: gestion global de notificaciones con proteccion contra avisos duplicados"
```

---

### Task 6: Frontend — servicio común, campana, dashboard y toma de asistencia

**Files:**
- Create: `src/services/notificaciones.ts`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/views/dashboard/Dashboard.tsx` (estado `riskStudents`, `useEffect` de notificaciones, `onSendAviso`)
- Modify: `src/views/preceptor/AttendanceBoard.tsx` (`enviarAvisoAlerta`)

**Interfaces:**
- Consumes: contrato HTTP de Tasks 4 y 5.
- Produces:
  - `interface Notificacion` (forma de `GET /api/notificaciones`)
  - `listarNotificaciones(): Promise<Notificacion[]>`, `marcarLeida(id: number): Promise<void>`, `marcarTodasLeidas(): Promise<void>` (lanzan `Error` si la respuesta no es ok)
  - `enviarAviso(p: { id_alumno: number; id_notificacion: number | null; motivo?: string }): Promise<ResultadoAviso>` (nunca lanza)
  - `type ResultadoAviso = { ok: true } | { ok: false; yaGestionada: true; gestionada_por_nombre: string | null; gestionada_at: string | null } | { ok: false; yaGestionada: false; message: string }`
  - `textoGestion(n: { gestionada_por_nombre: string | null; gestionada_at: string | null }): string`

No hay infraestructura de tests de frontend: la verificación es `npm run lint` (tsc) + chequeo manual en el navegador (Step 7).

- [ ] **Step 1: Crear `src/services/notificaciones.ts`**

```ts
// Cliente HTTP de notificaciones e intervenciones (compartido por TopBar, Dashboard y AttendanceBoard).

export type TipoNotificacion = 'Riesgo' | 'Critico' | 'RegularidadAnual';

export interface Notificacion {
  id: number;
  id_alumno: number | null;
  nombre: string | null;
  apellido: string | null;
  tipo: TipoNotificacion;
  faltas: number;
  mensaje: string;
  estado: 'nueva' | 'gestionada';
  leida: number;
  created_at: string;
  gestionada_por_nombre: string | null;
  gestionada_at: string | null;
}

export interface AvisoPayload {
  id_alumno: number;
  id_notificacion: number | null;
  motivo?: string;
}

export type ResultadoAviso =
  | { ok: true }
  | { ok: false; yaGestionada: true; gestionada_por_nombre: string | null; gestionada_at: string | null }
  | { ok: false; yaGestionada: false; message: string };

const MOTIVO_AVISO = 'Aviso a la familia por riesgo de asistencias';

function headers(json = false): HeadersInit {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const res = await fetch('/api/notificaciones', { headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al listar notificaciones`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Notificacion[]) : [];
}

export async function marcarLeida(id: number): Promise<void> {
  const res = await fetch(`/api/notificaciones/${id}/leida`, { method: 'PATCH', headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al marcar la notificación`);
}

export async function marcarTodasLeidas(): Promise<void> {
  const res = await fetch('/api/notificaciones/leidas', { method: 'PATCH', headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al marcar las notificaciones`);
}

export async function enviarAviso(p: AvisoPayload): Promise<ResultadoAviso> {
  try {
    const res = await fetch('/api/intervenciones', {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ motivo: MOTIVO_AVISO, ...p }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return {
        ok: false,
        yaGestionada: true,
        gestionada_por_nombre: body.gestionada_por_nombre ?? null,
        gestionada_at: body.gestionada_at ?? null,
      };
    }
    return { ok: false, yaGestionada: false, message: body.message ?? 'No se pudo registrar el aviso.' };
  } catch (e) {
    console.error('Error enviando aviso:', e);
    return { ok: false, yaGestionada: false, message: 'Error de conexión al registrar el aviso.' };
  }
}

/** "Gestionada por Juan Pérez · 14/10, 16:40" (omite lo que no se conozca). */
export function textoGestion(n: { gestionada_por_nombre: string | null; gestionada_at: string | null }): string {
  const partes = [n.gestionada_por_nombre ? `Gestionada por ${n.gestionada_por_nombre}` : 'Gestionada'];
  if (n.gestionada_at) {
    const fecha = new Date(n.gestionada_at);
    if (!Number.isNaN(fecha.getTime())) {
      partes.push(fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    }
  }
  return partes.join(' · ');
}
```

- [ ] **Step 2: Actualizar `TopBar.tsx`**

Reemplazar las líneas 1–98 (imports, interfaz `Notificacion`, perfiles y handlers) conservando `TopBarProps`, `PerfilDemo`, `PERFILES` y `PERFIL_EF` tal cual. Quedan así el inicio y los handlers:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Send, Check, CheckCheck } from 'lucide-react';
import {
  Notificacion,
  listarNotificaciones,
  marcarLeida as marcarLeidaApi,
  marcarTodasLeidas,
  enviarAviso as enviarAvisoApi,
  textoGestion,
} from '../../services/notificaciones';

interface TopBarProps {
  userRole: string;
}

// (PerfilDemo, PERFILES y PERFIL_EF sin cambios)

export const TopBar: React.FC<TopBarProps> = ({ userRole }) => {
  const perfil = PERFILES[userRole] ?? PERFIL_EF;
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      setNotifs(await listarNotificaciones());
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const noLeidas = notifs.filter(n => n.leida === 0).length;

  const marcarLeida = async (id: number) => {
    setError(null);
    try {
      await marcarLeidaApi(id);
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, leida: 1 } : n)));
    } catch (e) {
      console.error('Error marcando leída:', e);
      setError('No se pudo marcar la notificación como leída.');
    }
  };

  const marcarTodas = async () => {
    setError(null);
    try {
      await marcarTodasLeidas();
      setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (e) {
      console.error('Error marcando todas como leídas:', e);
      setError('No se pudieron marcar las notificaciones como leídas.');
    }
  };

  const enviarAviso = async (n: Notificacion) => {
    if (n.id_alumno === null) return;
    setError(null);
    const r = await enviarAvisoApi({ id_alumno: n.id_alumno, id_notificacion: n.id });
    if (!r.ok && !r.yaGestionada) {
      setError(r.message);
      return;
    }
    // Éxito o ya gestionada por otra persona: recargar para mostrar quién y cuándo.
    await fetchNotifs();
  };
```

En el JSX del dropdown, reemplazar el bloque del título (líneas 119–121) por:

```tsx
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-black text-brand-navy text-sm uppercase tracking-tight">Notificaciones</span>
                {noLeidas > 0 && (
                  <button onClick={marcarTodas} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                    <CheckCheck size={12} /> Marcar todas
                  </button>
                )}
              </div>
              {error && (
                <p className="px-4 py-2 text-[11px] font-medium text-rose-600 bg-rose-50 border-b border-rose-100">{error}</p>
              )}
```

y reemplazar el bloque de acciones de cada ítem (el ternario `n.estado !== 'gestionada' ? … : …`, líneas 132–138) por:

```tsx
                          {n.estado !== 'gestionada' ? (
                            n.id_alumno !== null && (
                              <button onClick={() => enviarAviso(n)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy hover:underline">
                                <Send size={12} /> Enviar Aviso
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{textoGestion(n)}</span>
                          )}
```

El resto del JSX (contador, botón "Marcar leída", perfil) queda igual.

- [ ] **Step 3: Actualizar `Dashboard.tsx`**

Agregar import junto a los existentes:

```tsx
import { Notificacion, listarNotificaciones, enviarAviso, textoGestion } from '../../services/notificaciones';
```

Cambiar el estado: `const [riskStudents, setRiskStudents] = useState<Notificacion[]>([]);`

Reemplazar el cuerpo del `useEffect` de notificaciones por:

```tsx
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await listarNotificaciones();
        // Mostrar solo alertas activas (no gestionadas) en el dashboard
        setRiskStudents(data.filter(n => n.estado !== 'gestionada'));
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };
    fetchNotifs();
  }, []);
```

Reemplazar el `onSendAviso` del `RiskNotificationModal` por:

```tsx
        onSendAviso={async () => {
          const n = riskStudents[activeRiskIndex];
          if (!n || n.id_alumno === null) {
            setIsRiskModalOpen(false);
            return;
          }
          const r = await enviarAviso({ id_alumno: n.id_alumno, id_notificacion: n.id });
          if (!r.ok && !r.yaGestionada) {
            alert(r.message);
            return;
          }
          if (!r.ok && r.yaGestionada) {
            alert(`${textoGestion(r)}. No se registró un aviso duplicado.`);
          }
          setRiskStudents(prev => prev.filter(x => x.id !== n.id));
          setActiveRiskIndex(0);
          setIsRiskModalOpen(false);
        }}
```

- [ ] **Step 4: Actualizar `AttendanceBoard.tsx`**

Agregar import: `import { enviarAviso, textoGestion } from '../../services/notificaciones';`

Reemplazar `enviarAvisoAlerta` completo por:

```tsx
  const enviarAvisoAlerta = async () => {
    if (!alertaActual) return;
    const r = await enviarAviso({ id_alumno: alertaActual.id_alumno, id_notificacion: alertaActual.id_notificacion });
    if (!r.ok && !r.yaGestionada) {
      alert(r.message);
      return;
    }
    if (!r.ok && r.yaGestionada) {
      alert(`${textoGestion(r)}. No se registró un aviso duplicado.`);
    }
    cerrarAlerta();
  };
```

- [ ] **Step 5: Verificar tipos**

Run (raíz del repo): `npm run lint`
Expected: sin errores. Si `Dashboard.tsx` marca campos `string | null` usados como `string` en el listado de "Alertas Críticas", usar `?? ''` en ese punto (no cambiar el tipo `Notificacion`).

- [ ] **Step 6: Aplicar la migración a la base de desarrollo y reiniciar la API**

Run (raíz del repo):
```bash
docker exec -i assistx-mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" assistx_db' < db/migrations/2026-10-14_notificaciones_por_usuario.sql
```
Expected: sin salida (éxito). Reiniciar la API (`npm run dev` en `api/`, ahora arranca `src/server.ts`) y confirmar `🛢️  Conexión a MySQL establecida correctamente.`

- [ ] **Step 7: Verificación manual en el navegador (http://localhost:3000)**

1. Entrar como `preceptor1`, tomar asistencia con 4 faltas de un mismo alumno en fechas del bimestre vigente → aparece el pop-up de riesgo y la campana muestra 1 no leída.
2. En otra ventana privada, entrar como `directivo` / `password123` → la misma alerta aparece **no leída**.
3. Como `preceptor1`, "Marcar leída" → su contador baja a 0; en la ventana de `directivo`, tras recargar, sigue en 1.
4. Como `directivo`, "Marcar todas" → contador en 0.
5. Como `preceptor1`, "Enviar Aviso" → el ítem pasa a "Gestionada por … · dd/mm, hh:mm". En la ventana de `directivo`, recargar → la ve gestionada con el mismo autor, y el Dashboard ya no la lista.
6. Con `profe_ef`, la campana muestra "No hay notificaciones." y al guardar asistencia no aparece pop-up de riesgo.

- [ ] **Step 8: Commit**

```bash
git add src/services/notificaciones.ts src/components/layout/TopBar.tsx src/views/dashboard/Dashboard.tsx src/views/preceptor/AttendanceBoard.tsx
git commit -m "feat: campana con bandeja por usuario, marcar todas y gestion visible"
```
