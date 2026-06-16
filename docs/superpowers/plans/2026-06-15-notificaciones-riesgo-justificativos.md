# Notificaciones de riesgo + Justificativos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cablear punta a punta el monitoreo de riesgo de inasistencias (pop-up al guardar + campana persistente + log de intervención) y el panel de justificativos que justifica una falta puntual.

**Architecture:** Backend Express/MySQL sin ORM, queries parametrizadas, un controlador por recurso. La lógica de conteo de faltas vive en una función pura unit-testeada (`utils/riesgo.ts`) y una capa de datos (`utils/riesgoData.ts`). El riesgo se calcula on-demand. El frontend reusa el andamiaje existente (`RiskNotificationModal`, campana del `TopBar`, estados del `Dashboard`).

**Tech Stack:** Express 5, mysql2, TypeScript, multer (nuevo, subida de archivos), vitest (nuevo, solo unit tests de `utils/riesgo.ts`), React + Vite + motion + lucide.

**Spec:** `docs/superpowers/specs/2026-06-15-notificaciones-riesgo-justificativos-design.md`

**Convención de tests:** solo `utils/riesgo.ts` lleva unit tests (vitest). El resto se verifica manualmente con `curl`/Thunder + revisión de DB + UI. Para los `curl`, primero obtené un token:
```bash
curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d '{"usuario":"admin","password":"123456"}'
# Guardá el token devuelto en $TOKEN para los demás requests.
```
(El hash sembrado corresponde a una contraseña de prueba; usá la que tengas configurada.)

---

## Estructura de archivos

**Backend — crear:**
- `db/migrations/2026-06-15_notificaciones_justificativos.sql` — 4 tablas + seed de bimestres 2026
- `api/src/utils/riesgo.ts` — funciones puras de conteo/umbral
- `api/src/utils/riesgo.test.ts` — unit tests (vitest)
- `api/src/utils/riesgoData.ts` — capa de datos del riesgo (queries + agregación)
- `api/src/controllers/notificacionController.ts` — listar/marcar leída + `generarNotificacionesRiesgo`
- `api/src/controllers/intervencionController.ts` — registrar intervención
- `api/src/controllers/periodoController.ts` — ABM de bimestres
- `api/src/controllers/justificativoController.ts` — faltas justificables + subir + descargar
- `api/src/config/upload.ts` — config de multer
- `api/src/routes/notificacionRoutes.ts`, `intervencionRoutes.ts`, `periodoRoutes.ts`, `justificativoRoutes.ts`

**Backend — modificar:**
- `api/package.json` — deps multer, devDeps vitest/@types/multer, script `test`
- `api/src/app.ts` — montar rutas nuevas; quitar la ruta vieja `/api/admin/riesgo`
- `api/src/controllers/asistenciaController.ts` — disparar notificaciones tras guardar
- `api/src/controllers/adminController.ts` — quitar `getAlumnosEnRiesgo` (stub viejo)
- `api/src/controllers/alumnoController.ts` — nuevo `getAlumnosEnRiesgo` (badges)
- `api/src/routes/alumnoRoutes.ts` — ruta `GET /riesgo`
- `.gitignore` — ignorar `api/uploads/`

**Frontend — crear:**
- `src/views/justificativos/JustificativosPanel.tsx` — panel de carga
- `src/views/secretario/PeriodManagement.tsx` — ABM de bimestres

**Frontend — modificar:**
- `src/components/layout/TopBar.tsx` — campana real
- `src/components/layout/RiskNotificationModal.tsx` — prop `onSendAviso` + tipo
- `src/views/preceptor/AttendanceBoard.tsx` — pop-up al guardar
- `src/views/dashboard/Dashboard.tsx` — alertas reales, modal on-click
- `src/views/secretario/StudentsDirectory.tsx` — badge + métrica reales
- `src/App.tsx` y `src/components/layout/Sidebar.tsx` — navegación a los paneles nuevos

---

## Task 1: Migración SQL (4 tablas + seed)

**Files:**
- Create: `db/migrations/2026-06-15_notificaciones_justificativos.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Notificaciones de riesgo + Justificativos (2026-06-15)

CREATE TABLE IF NOT EXISTS `periodos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `anio_lectivo` INT(11) NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_alumno` INT(11) NOT NULL,
  `tipo` ENUM('Riesgo','Critico','RegularidadAnual') NOT NULL,
  `faltas_snapshot` DECIMAL(4,1) NOT NULL DEFAULT 0,
  `id_periodo` INT(11) DEFAULT NULL,
  `anio` INT(11) DEFAULT NULL,
  `mensaje` VARCHAR(255) NOT NULL,
  `estado` ENUM('nueva','gestionada') NOT NULL DEFAULT 'nueva',
  `leida` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notif_alumno` (`id_alumno`),
  KEY `idx_notif_periodo` (`id_periodo`),
  CONSTRAINT `notif_alumno_fk` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notif_periodo_fk` FOREIGN KEY (`id_periodo`) REFERENCES `periodos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `intervenciones` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_alumno` INT(11) NOT NULL,
  `id_notificacion` INT(11) DEFAULT NULL,
  `id_usuario` INT(11) DEFAULT NULL,
  `motivo` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_interv_alumno` (`id_alumno`),
  KEY `idx_interv_notif` (`id_notificacion`),
  CONSTRAINT `interv_alumno_fk` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interv_notif_fk` FOREIGN KEY (`id_notificacion`) REFERENCES `notificaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `interv_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `justificativos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_asistencia` INT(11) NOT NULL,
  `archivo_path` VARCHAR(255) NOT NULL,
  `archivo_nombre` VARCHAR(255) NOT NULL,
  `mime` VARCHAR(100) NOT NULL,
  `motivo` VARCHAR(255) DEFAULT NULL,
  `fecha_certificado` DATE DEFAULT NULL,
  `id_usuario` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_justificativo_asistencia` (`id_asistencia`),
  CONSTRAINT `just_asistencia_fk` FOREIGN KEY (`id_asistencia`) REFERENCES `asistencias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `just_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed: bimestres del ciclo lectivo 2026 (editable luego desde el ABM)
INSERT INTO `periodos` (`nombre`, `anio_lectivo`, `fecha_inicio`, `fecha_fin`) VALUES
('1er Bimestre', 2026, '2026-03-01', '2026-04-30'),
('2do Bimestre', 2026, '2026-05-01', '2026-06-30'),
('3er Bimestre', 2026, '2026-08-01', '2026-09-30'),
('4to Bimestre', 2026, '2026-10-01', '2026-11-30');
```

- [ ] **Step 2: Aplicar la migración**

Run (ajustá usuario/host según tu entorno):
```bash
mysql -u root assistx_db < db/migrations/2026-06-15_notificaciones_justificativos.sql
```
Expected: sin errores.

- [ ] **Step 3: Verificar tablas y seed**

Run:
```bash
mysql -u root assistx_db -e "SHOW TABLES LIKE '%'; SELECT * FROM periodos;"
```
Expected: aparecen `periodos`, `notificaciones`, `intervenciones`, `justificativos` y 4 filas de bimestres.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/2026-06-15_notificaciones_justificativos.sql
git commit -m "feat: migracion de notificaciones, intervenciones, periodos y justificativos"
```

---

## Task 2: Lógica pura de riesgo + unit tests (vitest)

**Files:**
- Modify: `api/package.json`
- Create: `api/src/utils/riesgo.ts`
- Test: `api/src/utils/riesgo.test.ts`

- [ ] **Step 1: Agregar vitest y el script de test**

En `api/package.json`, agregá a `scripts`:
```json
    "test": "vitest run"
```
y a `devDependencies`:
```json
    "vitest": "^2.1.0"
```
Luego instalá:
```bash
cd api && npm install
```
Expected: vitest queda en `node_modules`.

Además, para que `npm run build` (tsc) no intente compilar los tests, agregá en `api/tsconfig.json` la clave `exclude` (o sumá el patrón si ya existe):
```json
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
```

- [ ] **Step 2: Escribir el test que falla**

Create `api/src/utils/riesgo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { peso, sumarFaltas, nivelBimestral, superaRegularidadAnual } from './riesgo';

describe('peso', () => {
  it('Ausente vale 1', () => expect(peso('Ausente')).toBe(1));
  it('Tarde vale 0.5', () => expect(peso('Tarde')).toBe(0.5));
  it('Retiro vale 0.5', () => expect(peso('Retiro')).toBe(0.5));
  it('Ausente Justificado vale 0', () => expect(peso('Ausente Justificado')).toBe(0));
  it('Presente vale 0', () => expect(peso('Presente')).toBe(0));
  it('Ausencia con Presencia vale 0', () => expect(peso('Ausencia con Presencia')).toBe(0));
  it('estado desconocido vale 0', () => expect(peso('Cualquiera')).toBe(0));
});

describe('sumarFaltas', () => {
  it('suma los pesos de los estados', () => {
    expect(sumarFaltas(['Ausente', 'Tarde', 'Retiro', 'Presente'])).toBe(2);
  });
  it('lista vacía da 0', () => expect(sumarFaltas([])).toBe(0));
});

describe('nivelBimestral', () => {
  it('menos de 4 es Normal', () => expect(nivelBimestral(3.5)).toBe('Normal'));
  it('4 es Riesgo', () => expect(nivelBimestral(4)).toBe('Riesgo'));
  it('4.5 sigue siendo Riesgo', () => expect(nivelBimestral(4.5)).toBe('Riesgo'));
  it('5 es Critico', () => expect(nivelBimestral(5)).toBe('Critico'));
});

describe('superaRegularidadAnual', () => {
  it('18 no supera', () => expect(superaRegularidadAnual(18)).toBe(false));
  it('19 supera', () => expect(superaRegularidadAnual(19)).toBe(true));
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd api && npm test`
Expected: FAIL — no existe `./riesgo`.

- [ ] **Step 4: Implementar `riesgo.ts`**

Create `api/src/utils/riesgo.ts`:
```ts
export type NivelRiesgo = 'Normal' | 'Riesgo' | 'Critico';

const PESOS: Record<string, number> = {
  'Ausente': 1,
  'Tarde': 0.5,
  'Retiro': 0.5,
};

export const UMBRAL_RIESGO_BIMESTRAL = 4;
export const UMBRAL_CRITICO_BIMESTRAL = 5;
export const UMBRAL_REGULARIDAD_ANUAL = 19;

export function peso(estado: string): number {
  return PESOS[estado] ?? 0;
}

export function sumarFaltas(estados: readonly string[]): number {
  return estados.reduce((acc, estado) => acc + peso(estado), 0);
}

export function nivelBimestral(total: number): NivelRiesgo {
  if (total >= UMBRAL_CRITICO_BIMESTRAL) return 'Critico';
  if (total >= UMBRAL_RIESGO_BIMESTRAL) return 'Riesgo';
  return 'Normal';
}

export function superaRegularidadAnual(total: number): boolean {
  return total >= UMBRAL_REGULARIDAD_ANUAL;
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd api && npm test`
Expected: PASS — todos los casos en verde.

- [ ] **Step 6: Commit**

```bash
git add api/package.json api/package-lock.json api/src/utils/riesgo.ts api/src/utils/riesgo.test.ts
git commit -m "feat: logica pura de conteo de riesgo con unit tests (vitest)"
```

---

## Task 3: Capa de datos del riesgo (`riesgoData.ts`)

**Files:**
- Create: `api/src/utils/riesgoData.ts`

- [ ] **Step 1: Implementar la capa de datos**

Create `api/src/utils/riesgoData.ts`:
```ts
import pool from '../config/db';
import { sumarFaltas, nivelBimestral, superaRegularidadAnual, NivelRiesgo } from './riesgo';

export interface PeriodoVigente {
  id: number;
  nombre: string;
  anio_lectivo: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface RiesgoAlumno {
  id_alumno: number;
  acumuladoBimestral: number;
  nivel: NivelRiesgo;
  acumuladoAnual: number;
  superaAnual: boolean;
  id_periodo: number | null;
  anio: number;
}

export async function getPeriodoVigente(fecha: string): Promise<PeriodoVigente | null> {
  const [rows]: any = await pool.query(
    `SELECT id, nombre, anio_lectivo, fecha_inicio, fecha_fin
     FROM periodos
     WHERE ? BETWEEN fecha_inicio AND fecha_fin
     LIMIT 1`,
    [fecha]
  );
  return rows[0] ?? null;
}

function agruparEstados(rows: Array<{ id_alumno: number; estado: string }>): Map<number, string[]> {
  const mapa = new Map<number, string[]>();
  for (const row of rows) {
    const previos = mapa.get(row.id_alumno) ?? [];
    mapa.set(row.id_alumno, [...previos, row.estado]);
  }
  return mapa;
}

/**
 * Evalúa el riesgo de los alumnos indicados (o de todos si `alumnoIds` es null).
 * Cuenta faltas del bimestre vigente y del año lectivo de `fecha`.
 */
export async function evaluarRiesgo(alumnoIds: number[] | null, fecha: string): Promise<RiesgoAlumno[]> {
  const periodo = await getPeriodoVigente(fecha);
  const anio = Number(fecha.slice(0, 4));

  const tieneFiltro = Array.isArray(alumnoIds) && alumnoIds.length > 0;
  const filtro = tieneFiltro ? `AND id_alumno IN (${alumnoIds!.map(() => '?').join(',')})` : '';
  const idsParams = tieneFiltro ? alumnoIds! : [];

  let bimestralRows: Array<{ id_alumno: number; estado: string }> = [];
  if (periodo) {
    const [rows]: any = await pool.query(
      `SELECT id_alumno, estado FROM asistencias
       WHERE fecha BETWEEN ? AND ? ${filtro}`,
      [periodo.fecha_inicio, periodo.fecha_fin, ...idsParams]
    );
    bimestralRows = rows;
  }

  const [anualRows]: any = await pool.query(
    `SELECT id_alumno, estado FROM asistencias
     WHERE YEAR(fecha) = ? ${filtro}`,
    [anio, ...idsParams]
  );

  const bim = agruparEstados(bimestralRows);
  const anual = agruparEstados(anualRows);

  const todos = new Set<number>([...bim.keys(), ...anual.keys()]);
  const resultado: RiesgoAlumno[] = [];
  for (const id of todos) {
    const acumuladoBimestral = sumarFaltas(bim.get(id) ?? []);
    const acumuladoAnual = sumarFaltas(anual.get(id) ?? []);
    resultado.push({
      id_alumno: id,
      acumuladoBimestral,
      nivel: nivelBimestral(acumuladoBimestral),
      acumuladoAnual,
      superaAnual: superaRegularidadAnual(acumuladoAnual),
      id_periodo: periodo?.id ?? null,
      anio,
    });
  }
  return resultado;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores de tipo en `riesgoData.ts`.

- [ ] **Step 3: Commit**

```bash
git add api/src/utils/riesgoData.ts
git commit -m "feat: capa de datos del calculo de riesgo (bimestral y anual)"
```

---

## Task 4: Endpoint de badges `GET /api/alumnos/riesgo` + limpieza del stub viejo

**Files:**
- Modify: `api/src/controllers/alumnoController.ts`
- Modify: `api/src/routes/alumnoRoutes.ts`
- Modify: `api/src/controllers/adminController.ts` (quitar stub)
- Modify: `api/src/app.ts` (quitar ruta vieja)

- [ ] **Step 1: Agregar el controlador nuevo en `alumnoController.ts`**

Agregá al final de `api/src/controllers/alumnoController.ts` (y asegurate de que `pool` ya esté importado en el archivo):
```ts
import { evaluarRiesgo } from '../utils/riesgoData';

export const getAlumnosEnRiesgo = async (_req: Request, res: Response) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const riesgos = await evaluarRiesgo(null, hoy);
    const enRiesgo = riesgos.filter(r => r.nivel !== 'Normal' || r.superaAnual);

    if (enRiesgo.length === 0) return res.json([]);

    const ids = enRiesgo.map(r => r.id_alumno);
    const [alumnos]: any = await pool.query(
      `SELECT id, nombre, apellido, dni FROM alumnos WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const porId = new Map<number, any>(alumnos.map((a: any) => [a.id, a]));

    const payload = enRiesgo.map(r => {
      const alumno = porId.get(r.id_alumno);
      return {
        id: r.id_alumno,
        nombre: alumno?.nombre ?? '',
        apellido: alumno?.apellido ?? '',
        dni: alumno?.dni ?? '',
        faltas: r.acumuladoBimestral,
        nivel: r.nivel,
        superaAnual: r.superaAnual,
      };
    });
    res.json(payload);
  } catch (error) {
    console.error('Error en getAlumnosEnRiesgo:', error);
    res.status(500).json({ message: 'Error al obtener alumnos en riesgo' });
  }
};
```
(Si `import { Request, Response }` y `pool` ya están al tope del archivo, no los dupliques; agregá solo el `import { evaluarRiesgo }`.)

- [ ] **Step 2: Registrar la ruta en `alumnoRoutes.ts`**

Importá `getAlumnosEnRiesgo` desde `../controllers/alumnoController` y agregá, **antes** de cualquier ruta con parámetro tipo `/:id`:
```ts
router.get('/riesgo', verifyToken, getAlumnosEnRiesgo);
```
(Si `verifyToken` no está importado en el archivo, importalo de `../middlewares/authMiddleware`.)

- [ ] **Step 3: Quitar el stub viejo**

En `api/src/controllers/adminController.ts` eliminá por completo la función `getAlumnosEnRiesgo` (la que usa `DATE_SUB(CURDATE(), INTERVAL 45 DAY)`).
En `api/src/app.ts` eliminá la línea de import `import { getAlumnosEnRiesgo } from './controllers/adminController';` y la línea `app.get('/api/admin/riesgo', verifyToken, getAlumnosEnRiesgo);`.
(El `import { verifyToken, isAdmin }` en `app.ts` puede quedar si se usa en otro lado; si queda sin uso, quitalo para que compile sin warnings.)

- [ ] **Step 4: Verificar compilación y endpoint**

Run: `cd api && npx tsc --noEmit && npm run dev`
En otra terminal:
```bash
curl -s http://127.0.0.1:5000/api/alumnos/riesgo -H "Authorization: Bearer $TOKEN"
```
Expected: `[]` (o alumnos en riesgo si ya hay faltas cargadas en el bimestre vigente). Sin error 500.

- [ ] **Step 5: Commit**

```bash
git add api/src/controllers/alumnoController.ts api/src/routes/alumnoRoutes.ts api/src/controllers/adminController.ts api/src/app.ts
git commit -m "feat: endpoint /api/alumnos/riesgo con calculo real y baja del stub viejo"
```

---

## Task 5: Generación de notificaciones + disparo al guardar asistencia

**Files:**
- Create: `api/src/controllers/notificacionController.ts`
- Create: `api/src/routes/notificacionRoutes.ts`
- Modify: `api/src/controllers/asistenciaController.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Crear `notificacionController.ts`**

Create `api/src/controllers/notificacionController.ts`:
```ts
import { Request, Response } from 'express';
import pool from '../config/db';
import { evaluarRiesgo } from '../utils/riesgoData';

export interface AlertaRiesgo {
  id_alumno: number;
  nombre: string;
  apellido: string;
  tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual';
  faltas: number;
  mensaje: string;
  id_notificacion: number;
}

function construirMensaje(tipo: AlertaRiesgo['tipo'], snapshot: number, nombre: string): string {
  if (tipo === 'Critico') return `${nombre} alcanzó ${snapshot} faltas en el bimestre (nivel crítico).`;
  if (tipo === 'Riesgo') return `${nombre} alcanzó ${snapshot} faltas en el bimestre (en riesgo).`;
  return `${nombre} alcanzó ${snapshot} faltas en el año (riesgo de pérdida de regularidad).`;
}

async function crearNotificacionSiNoExiste(
  idAlumno: number,
  tipo: AlertaRiesgo['tipo'],
  idPeriodo: number | null,
  anio: number,
  snapshot: number
): Promise<AlertaRiesgo | null> {
  const cond = idPeriodo !== null
    ? 'id_alumno = ? AND tipo = ? AND id_periodo = ?'
    : 'id_alumno = ? AND tipo = ? AND id_periodo IS NULL AND anio = ?';
  const params = idPeriodo !== null ? [idAlumno, tipo, idPeriodo] : [idAlumno, tipo, anio];

  const [existe]: any = await pool.query(`SELECT id FROM notificaciones WHERE ${cond} LIMIT 1`, params);
  if (existe.length > 0) return null;

  const [alumnoRows]: any = await pool.query('SELECT nombre, apellido FROM alumnos WHERE id = ?', [idAlumno]);
  const alumno = alumnoRows[0];
  if (!alumno) return null;

  const nombreCompleto = `${alumno.apellido}, ${alumno.nombre}`;
  const mensaje = construirMensaje(tipo, snapshot, nombreCompleto);

  const [result]: any = await pool.query(
    `INSERT INTO notificaciones (id_alumno, tipo, faltas_snapshot, id_periodo, anio, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idAlumno, tipo, snapshot, idPeriodo, anio, mensaje]
  );

  return {
    id_alumno: idAlumno,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    tipo,
    faltas: snapshot,
    mensaje,
    id_notificacion: result.insertId,
  };
}

/**
 * Evalúa los alumnos indicados y genera (con dedup) las notificaciones por umbral cruzado.
 * Devuelve solo las alertas NUEVAS, para mostrarlas como pop-up.
 */
export async function generarNotificacionesRiesgo(alumnoIds: number[], fecha: string): Promise<AlertaRiesgo[]> {
  if (alumnoIds.length === 0) return [];
  const riesgos = await evaluarRiesgo(alumnoIds, fecha);
  const alertas: AlertaRiesgo[] = [];

  for (const r of riesgos) {
    if (r.acumuladoBimestral >= 4) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'Riesgo', r.id_periodo, r.anio, r.acumuladoBimestral);
      if (a) alertas.push(a);
    }
    if (r.acumuladoBimestral >= 5) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'Critico', r.id_periodo, r.anio, r.acumuladoBimestral);
      if (a) alertas.push(a);
    }
    if (r.superaAnual) {
      const a = await crearNotificacionSiNoExiste(r.id_alumno, 'RegularidadAnual', null, r.anio, r.acumuladoAnual);
      if (a) alertas.push(a);
    }
  }
  return alertas;
}

export const listarNotificaciones = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.id_alumno, a.nombre, a.apellido, n.tipo,
              n.faltas_snapshot AS faltas, n.mensaje, n.estado, n.leida, n.created_at
       FROM notificaciones n
       JOIN alumnos a ON a.id = n.id_alumno
       ORDER BY n.leida ASC, n.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error en listarNotificaciones:', error);
    res.status(500).json({ message: 'Error al listar notificaciones' });
  }
};

export const marcarLeida = async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error en marcarLeida:', error);
    res.status(500).json({ message: 'Error al marcar la notificación' });
  }
};
```

- [ ] **Step 2: Crear `notificacionRoutes.ts`**

Create `api/src/routes/notificacionRoutes.ts`:
```ts
import { Router } from 'express';
import { listarNotificaciones, marcarLeida } from '../controllers/notificacionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, listarNotificaciones);
router.patch('/:id/leida', verifyToken, marcarLeida);

export default router;
```

- [ ] **Step 3: Disparar al guardar asistencia**

En `api/src/controllers/asistenciaController.ts`, importá arriba:
```ts
import { generarNotificacionesRiesgo } from './notificacionController';
```
Y reemplazá el bloque que va desde `await connection.commit();` hasta el `res.status(201).json({ message: 'Asistencia registrada correctamente' });` por:
```ts
        await connection.commit();

        // Tras guardar, evaluar riesgo y generar notificaciones para los alumnos afectados
        const alumnoIds = registros.map((r: any) => r.id_alumno);
        let alertas: any[] = [];
        try {
            alertas = await generarNotificacionesRiesgo(alumnoIds, fecha);
        } catch (notifError) {
            console.error('Error generando notificaciones de riesgo:', notifError);
        }

        res.status(201).json({ message: 'Asistencia registrada correctamente', alertas });
```
(La generación de notificaciones va **después** del commit y envuelta en su propio try/catch para que un fallo de notificación no rompa el guardado de asistencia.)

- [ ] **Step 4: Montar la ruta en `app.ts`**

En `api/src/app.ts` agregá el import `import notificacionRoutes from './routes/notificacionRoutes';` y, junto a las demás `app.use`:
```ts
app.use('/api/notificaciones', notificacionRoutes);
```

- [ ] **Step 5: Verificar el flujo completo**

Run: `cd api && npx tsc --noEmit && npm run dev`. Luego cargá asistencia que lleve a un alumno a 4+ faltas en el bimestre vigente:
```bash
# Marcar Ausente al alumno 1 en varias fechas del bimestre hasta llegar a 4, luego:
curl -s -X POST http://127.0.0.1:5000/api/asistencias -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_curso":1,"fecha":"2026-06-15","registros":[{"id_alumno":1,"estado":"Ausente","observaciones":""}]}'
curl -s http://127.0.0.1:5000/api/notificaciones -H "Authorization: Bearer $TOKEN"
```
Expected: el POST devuelve `alertas` con la notificación cuando se cruza el umbral; `GET /api/notificaciones` la lista. Repetir el mismo POST NO duplica la notificación (dedup).

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/notificacionController.ts api/src/routes/notificacionRoutes.ts api/src/controllers/asistenciaController.ts api/src/app.ts
git commit -m "feat: generacion de notificaciones de riesgo al guardar asistencia + endpoints de campana"
```

---

## Task 6: Intervenciones (Enviar Aviso)

**Files:**
- Create: `api/src/controllers/intervencionController.ts`
- Create: `api/src/routes/intervencionRoutes.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Crear `intervencionController.ts`**

Create `api/src/controllers/intervencionController.ts`:
```ts
import { Request, Response } from 'express';
import pool from '../config/db';

export const crearIntervencion = async (req: Request, res: Response) => {
  const { id_alumno, id_notificacion, motivo } = req.body;
  const id_usuario = (req as any).user?.id || null;

  if (!id_alumno) return res.status(400).json({ message: 'Falta id_alumno' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result]: any = await connection.query(
      `INSERT INTO intervenciones (id_alumno, id_notificacion, id_usuario, motivo)
       VALUES (?, ?, ?, ?)`,
      [id_alumno, id_notificacion ?? null, id_usuario, motivo ?? null]
    );
    if (id_notificacion) {
      await connection.query(`UPDATE notificaciones SET estado = 'gestionada' WHERE id = ?`, [id_notificacion]);
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

- [ ] **Step 2: Crear `intervencionRoutes.ts`**

Create `api/src/routes/intervencionRoutes.ts`:
```ts
import { Router } from 'express';
import { crearIntervencion } from '../controllers/intervencionController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();
router.post('/', verifyToken, crearIntervencion);
export default router;
```

- [ ] **Step 3: Montar en `app.ts`**

Agregá `import intervencionRoutes from './routes/intervencionRoutes';` y:
```ts
app.use('/api/intervenciones', intervencionRoutes);
```

- [ ] **Step 4: Verificar**

Run (con una notificación existente, ej. id 1):
```bash
curl -s -X POST http://127.0.0.1:5000/api/intervenciones -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_alumno":1,"id_notificacion":1,"motivo":"Aviso a la familia por inasistencias"}'
curl -s http://127.0.0.1:5000/api/notificaciones -H "Authorization: Bearer $TOKEN"
```
Expected: la intervención se crea y la notificación 1 pasa a `estado: "gestionada"`.

- [ ] **Step 5: Commit**

```bash
git add api/src/controllers/intervencionController.ts api/src/routes/intervencionRoutes.ts api/src/app.ts
git commit -m "feat: registro de intervenciones (avisar a la familia) y marcado de notificacion gestionada"
```

---

## Task 7: ABM de períodos (bimestres)

**Files:**
- Create: `api/src/controllers/periodoController.ts`
- Create: `api/src/routes/periodoRoutes.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Crear `periodoController.ts`**

Create `api/src/controllers/periodoController.ts`:
```ts
import { Request, Response } from 'express';
import pool from '../config/db';

function validar(body: any): string | null {
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = body;
  if (!nombre || !anio_lectivo || !fecha_inicio || !fecha_fin) return 'Faltan campos obligatorios';
  if (fecha_inicio > fecha_fin) return 'La fecha de inicio no puede ser posterior a la fecha de fin';
  return null;
}

export const listarPeriodos = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM periodos ORDER BY anio_lectivo DESC, fecha_inicio ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error en listarPeriodos:', error);
    res.status(500).json({ message: 'Error al listar períodos' });
  }
};

export const crearPeriodo = async (req: Request, res: Response) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ message: error });
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO periodos (nombre, anio_lectivo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
      [nombre, anio_lectivo, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ id: result.insertId, message: 'Período creado' });
  } catch (e) {
    console.error('Error en crearPeriodo:', e);
    res.status(500).json({ message: 'Error al crear el período' });
  }
};

export const actualizarPeriodo = async (req: Request, res: Response) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ message: error });
  const { nombre, anio_lectivo, fecha_inicio, fecha_fin } = req.body;
  try {
    await pool.query(
      'UPDATE periodos SET nombre = ?, anio_lectivo = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
      [nombre, anio_lectivo, fecha_inicio, fecha_fin, req.params.id]
    );
    res.json({ message: 'Período actualizado' });
  } catch (e) {
    console.error('Error en actualizarPeriodo:', e);
    res.status(500).json({ message: 'Error al actualizar el período' });
  }
};

export const eliminarPeriodo = async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM periodos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Período eliminado' });
  } catch (e) {
    console.error('Error en eliminarPeriodo:', e);
    res.status(500).json({ message: 'Error al eliminar el período' });
  }
};
```

- [ ] **Step 2: Crear `periodoRoutes.ts`**

Create `api/src/routes/periodoRoutes.ts`:
```ts
import { Router } from 'express';
import { listarPeriodos, crearPeriodo, actualizarPeriodo, eliminarPeriodo } from '../controllers/periodoController';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware';

const router = Router();
router.get('/', verifyToken, listarPeriodos);
router.post('/', verifyToken, isAdmin, crearPeriodo);
router.put('/:id', verifyToken, isAdmin, actualizarPeriodo);
router.delete('/:id', verifyToken, isAdmin, eliminarPeriodo);
export default router;
```

- [ ] **Step 3: Montar en `app.ts`**

Agregá `import periodoRoutes from './routes/periodoRoutes';` y:
```ts
app.use('/api/periodos', periodoRoutes);
```

- [ ] **Step 4: Verificar**

Run:
```bash
curl -s http://127.0.0.1:5000/api/periodos -H "Authorization: Bearer $TOKEN"
```
Expected: los 4 bimestres sembrados.

- [ ] **Step 5: Commit**

```bash
git add api/src/controllers/periodoController.ts api/src/routes/periodoRoutes.ts api/src/app.ts
git commit -m "feat: ABM de periodos (bimestres) para el secretario"
```

---

## Task 8: Justificativos backend (multer + carga + descarga)

**Files:**
- Modify: `api/package.json`
- Create: `api/src/config/upload.ts`
- Create: `api/src/controllers/justificativoController.ts`
- Create: `api/src/routes/justificativoRoutes.ts`
- Modify: `api/src/app.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Instalar multer**

En `api/package.json` agregá a `dependencies` `"multer": "^2.0.0"` y a `devDependencies` `"@types/multer": "^2.0.0"`, luego:
```bash
cd api && npm install
```

- [ ] **Step 2: Config de multer**

Create `api/src/config/upload.ts`:
```ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const UPLOAD_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unico);
  },
});

export const uploadJustificativo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.'));
  },
});
```

- [ ] **Step 3: Controlador de justificativos**

Create `api/src/controllers/justificativoController.ts`:
```ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../config/db';
import { UPLOAD_DIR } from '../config/upload';

export const listarFaltasJustificables = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, fecha, estado, observaciones
       FROM asistencias
       WHERE id_alumno = ? AND estado = 'Ausente'
       ORDER BY fecha DESC`,
      [req.params.alumnoId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error en listarFaltasJustificables:', error);
    res.status(500).json({ message: 'Error al obtener las faltas del alumno' });
  }
};

export const crearJustificativo = async (req: Request, res: Response) => {
  const file = (req as any).file;
  const { id_asistencia, motivo, fecha_certificado } = req.body;
  const id_usuario = (req as any).user?.id || null;

  if (!file) return res.status(400).json({ message: 'Falta el archivo del justificativo' });
  if (!id_asistencia) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ message: 'Falta id_asistencia' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [asist]: any = await connection.query('SELECT id FROM asistencias WHERE id = ?', [id_asistencia]);
    if (asist.length === 0) {
      await connection.rollback();
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'La falta indicada no existe' });
    }

    await connection.query(
      `INSERT INTO justificativos (id_asistencia, archivo_path, archivo_nombre, mime, motivo, fecha_certificado, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_asistencia, `/uploads/${file.filename}`, file.originalname, file.mimetype, motivo ?? null, fecha_certificado || null, id_usuario]
    );
    await connection.query(`UPDATE asistencias SET estado = 'Ausente Justificado' WHERE id = ?`, [id_asistencia]);

    await connection.commit();
    res.status(201).json({ message: 'Justificativo cargado y falta justificada' });
  } catch (error: any) {
    await connection.rollback();
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Esa falta ya tiene un justificativo cargado' });
    }
    console.error('Error en crearJustificativo:', error);
    res.status(500).json({ message: 'Error al cargar el justificativo' });
  } finally {
    connection.release();
  }
};

export const descargarJustificativo = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT archivo_path FROM justificativos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Justificativo no encontrado' });
    const filePath = path.join(UPLOAD_DIR, path.basename(rows[0].archivo_path));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Archivo no encontrado' });
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error en descargarJustificativo:', error);
    res.status(500).json({ message: 'Error al descargar el justificativo' });
  }
};
```
(La descarga pasa por un endpoint autenticado en vez de servir `/uploads` estático, porque los certificados pueden ser sensibles. `path.basename` evita path traversal.)

- [ ] **Step 4: Rutas de justificativos**

Create `api/src/routes/justificativoRoutes.ts`:
```ts
import { Router } from 'express';
import { listarFaltasJustificables, crearJustificativo, descargarJustificativo } from '../controllers/justificativoController';
import { verifyToken } from '../middlewares/authMiddleware';
import { uploadJustificativo } from '../config/upload';

const router = Router();
router.get('/faltas/:alumnoId', verifyToken, listarFaltasJustificables);
router.get('/:id/archivo', verifyToken, descargarJustificativo);
router.post('/', verifyToken, uploadJustificativo.single('archivo'), crearJustificativo);
export default router;
```

- [ ] **Step 5: Montar en `app.ts` + ignorar uploads**

Agregá `import justificativoRoutes from './routes/justificativoRoutes';` y:
```ts
app.use('/api/justificativos', justificativoRoutes);
```
En `.gitignore` (raíz del repo) agregá:
```
api/uploads/
```

- [ ] **Step 6: Verificar carga**

Run (con un archivo PDF de prueba y una asistencia `Ausente` existente, ej. id 1):
```bash
curl -s -X POST http://127.0.0.1:5000/api/justificativos -H "Authorization: Bearer $TOKEN" \
  -F "id_asistencia=1" -F "motivo=Certificado medico" -F "archivo=@/ruta/a/certificado.pdf"
mysql -u root assistx_db -e "SELECT estado FROM asistencias WHERE id=1; SELECT * FROM justificativos;"
```
Expected: la asistencia 1 pasa a `Ausente Justificado`, hay una fila en `justificativos`, y el archivo está en `api/uploads/`. Subir un `.txt` debe devolver error de tipo no permitido.

- [ ] **Step 7: Commit**

```bash
git add api/package.json api/package-lock.json api/src/config/upload.ts api/src/controllers/justificativoController.ts api/src/routes/justificativoRoutes.ts api/src/app.ts .gitignore
git commit -m "feat: backend de justificativos con multer (carga, descarga autenticada y justificacion de la falta)"
```

---

## Task 9: Campana real en el TopBar

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Reescribir `TopBar.tsx` con la campana funcional**

Replace el contenido de `src/components/layout/TopBar.tsx` por:
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Send, Check } from 'lucide-react';

interface TopBarProps {
  userRole: string;
}

interface Notificacion {
  id: number;
  id_alumno: number;
  nombre: string;
  apellido: string;
  tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual';
  faltas: number;
  mensaje: string;
  estado: 'nueva' | 'gestionada';
  leida: number;
}

export const TopBar: React.FC<TopBarProps> = ({ userRole }) => {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const token = () => localStorage.getItem('token');

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/notificaciones', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setNotifs(await res.json());
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
    try {
      await fetch(`/api/notificaciones/${id}/leida`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, leida: 1 } : n)));
    } catch (e) {
      console.error('Error marcando leída:', e);
    }
  };

  const enviarAviso = async (n: Notificacion) => {
    try {
      await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id_alumno: n.id_alumno, id_notificacion: n.id, motivo: 'Aviso a la familia por riesgo de asistencias' }),
      });
      setNotifs(prev => prev.map(x => (x.id === n.id ? { ...x, estado: 'gestionada' } : x)));
    } catch (e) {
      console.error('Error enviando aviso:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 ml-64">
      <div className="flex items-center gap-4 flex-grow">
        <img src="/images/EncabezadoET20.webp" alt="Encabezado-ET20" className="h-11 w-auto object-contain opacity-90" />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)} className="p-2 hover:bg-slate-50 rounded-full transition-colors relative text-slate-500">
            <Bell size={20} />
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                {noLeidas}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
              <div className="p-4 border-b border-slate-100 font-black text-brand-navy text-sm uppercase tracking-tight">
                Notificaciones de Riesgo
              </div>
              {notifs.length === 0 ? (
                <p className="p-6 text-center text-slate-400 text-sm font-medium">No hay notificaciones.</p>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className={`p-4 border-b border-slate-50 ${n.leida === 0 ? 'bg-rose-50/40' : ''}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className={n.tipo === 'Critico' || n.tipo === 'RegularidadAnual' ? 'text-rose-600 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                      <div className="flex-grow">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{n.mensaje}</p>
                        <div className="flex gap-2 mt-2">
                          {n.estado !== 'gestionada' ? (
                            <button onClick={() => enviarAviso(n)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy hover:underline">
                              <Send size={12} /> Enviar Aviso
                            </button>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Gestionada</span>
                          )}
                          {n.leida === 0 && (
                            <button onClick={() => marcarLeida(n.id)} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                              <Check size={12} /> Marcar leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 leading-none">
              {userRole === 'Secretario/a' ? 'Marta López' : userRole === 'Preceptor/a' ? 'Ricardo Gómez' : 'Prof. Javier Rossi'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              {userRole === 'Secretario/a' ? 'Secretaría Institucional' : userRole === 'Preceptor/a' ? 'Preceptor de Turno' : 'Departamento de Ed. Física'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full border border-slate-200 overflow-hidden shadow-sm">
            <img src={
              userRole === 'Secretario/a' ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' :
              userRole === 'Preceptor/a' ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' :
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'
            } alt="Perfil" />
          </div>
        </div>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Verificar en la UI**

Run: `npm run dev` (frontend). Iniciá sesión, generá una notificación (cargando faltas) y abrí la campana.
Expected: el badge muestra el número de no leídas; el dropdown lista los mensajes; "Marcar leída" baja el contador; "Enviar Aviso" deja la notificación como "Gestionada".

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: campana de notificaciones funcional en el TopBar"
```

---

## Task 10: Pop-up al guardar asistencia (AttendanceBoard + RiskNotificationModal)

**Files:**
- Modify: `src/components/layout/RiskNotificationModal.tsx`
- Modify: `src/views/preceptor/AttendanceBoard.tsx`

- [ ] **Step 1: Extender `RiskNotificationModal` con `onSendAviso` y tipo**

En `src/components/layout/RiskNotificationModal.tsx`, reemplazá la interfaz de props y el botón "Enviar Aviso":

Props:
```tsx
interface RiskNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  absencesCount: number;
  onViewDetails: () => void;
  onSendAviso?: () => void;
  tipo?: 'Riesgo' | 'Critico' | 'RegularidadAnual';
}
```
Firma del componente:
```tsx
export const RiskNotificationModal: React.FC<RiskNotificationModalProps> = ({
  isOpen,
  onClose,
  studentName,
  absencesCount,
  onViewDetails,
  onSendAviso,
  tipo,
}) => {
```
Botón "Enviar Aviso" (reemplazá el `<button ...>` que hoy no tiene `onClick`):
```tsx
            <button onClick={onSendAviso} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-navy text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer text-sm uppercase tracking-wider">
              <Send size={18} /> Enviar Aviso
            </button>
```
Y dentro del header del modal, hacé que el color refleje el tipo (opcional pero útil): donde dice `text-rose-600` en el header, dejalo igual si `tipo` es `Critico`/`RegularidadAnual`, o usá `text-amber-500` si `tipo === 'Riesgo'`. Para mantenerlo simple, podés dejar el rose fijo — el `tipo` queda disponible para futuros estilos.

- [ ] **Step 2: Disparar el pop-up en `AttendanceBoard.handleSubmit`**

En `src/views/preceptor/AttendanceBoard.tsx`:

Agregá el import al tope:
```tsx
import { RiskNotificationModal } from '../../components/layout/RiskNotificationModal';
```
Definí el tipo y los estados dentro del componente (junto a los otros `useState`):
```tsx
  type AlertaRiesgo = { id_alumno: number; nombre: string; apellido: string; tipo: 'Riesgo' | 'Critico' | 'RegularidadAnual'; faltas: number; mensaje: string; id_notificacion: number };
  const [alertasCola, setAlertasCola] = useState<AlertaRiesgo[]>([]);
  const [alertaIndex, setAlertaIndex] = useState(0);
```
En `handleSubmit`, reemplazá el bloque `if (response.ok) { alert(...) } else { ... }` por:
```tsx
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const alertas: AlertaRiesgo[] = data.alertas ?? [];
        if (alertas.length > 0) {
          setAlertasCola(alertas);
          setAlertaIndex(0);
        } else {
          alert(isEF ? 'Reporte de Educación Física enviado' : 'Asistencia enviada con éxito');
        }
      } else {
        alert('Error al guardar la asistencia');
      }
```
Agregá los handlers (antes del `return`):
```tsx
  const alertaActual = alertasCola[alertaIndex] ?? null;

  const cerrarAlerta = () => {
    if (alertaIndex < alertasCola.length - 1) {
      setAlertaIndex(i => i + 1);
    } else {
      setAlertasCola([]);
      setAlertaIndex(0);
      alert(isEF ? 'Reporte de Educación Física enviado' : 'Asistencia enviada con éxito');
    }
  };

  const enviarAvisoAlerta = async () => {
    if (!alertaActual) return;
    try {
      await fetch('/api/intervenciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id_alumno: alertaActual.id_alumno, id_notificacion: alertaActual.id_notificacion, motivo: 'Aviso a la familia por riesgo de asistencias' }),
      });
    } catch (e) {
      console.error('Error enviando aviso:', e);
    }
    cerrarAlerta();
  };
```
Justo antes del cierre del `</motion.div>` raíz, agregá:
```tsx
      {alertaActual && (
        <RiskNotificationModal
          isOpen={true}
          onClose={cerrarAlerta}
          studentName={`${alertaActual.apellido}, ${alertaActual.nombre}`}
          absencesCount={alertaActual.faltas}
          tipo={alertaActual.tipo}
          onViewDetails={cerrarAlerta}
          onSendAviso={enviarAvisoAlerta}
        />
      )}
```

- [ ] **Step 3: Verificar en la UI**

Run: `npm run dev`. Como preceptor, marcá faltas que lleven un alumno a 4+ en el bimestre y finalizá el reporte.
Expected: aparece el pop-up con el alumno y su cantidad de faltas. "Enviar Aviso" registra la intervención y cierra/avanza. Si cruzan umbral varios alumnos, se muestran en secuencia.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/RiskNotificationModal.tsx src/views/preceptor/AttendanceBoard.tsx
git commit -m "feat: pop-up de riesgo al guardar asistencia con accion de enviar aviso"
```

---

## Task 11: Dashboard con alertas reales

**Files:**
- Modify: `src/views/dashboard/Dashboard.tsx`

- [ ] **Step 1: Cambiar la fuente de datos y el panel de alertas**

En `src/views/dashboard/Dashboard.tsx`:

Reemplazá el `useEffect` que llama a `/api/admin/riesgo` por uno que traiga notificaciones:
```tsx
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await fetch('/api/notificaciones', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setRiskStudents(data);
        }
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };
    fetchNotifs();
  }, []);
```
Reemplazá el bloque hardcodeado de "Alertas Críticas" (el `div` con "Javier Ortega") por la lista real. Sustituí el contenido del contenedor `<div className="space-y-4">` dentro de "Alertas Críticas" por:
```tsx
            {riskStudents.length === 0 ? (
              <div className="bg-white border border-slate-200 p-5 rounded-2xl text-sm text-slate-400 font-medium">
                No hay alertas activas.
              </div>
            ) : (
              riskStudents.slice(0, 5).map((n: any, i: number) => (
                <div key={n.id ?? i} className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-2xl shadow-sm">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {n.tipo === 'Critico' ? 'Alerta Crítica' : n.tipo === 'RegularidadAnual' ? 'Riesgo de Regularidad' : 'Alerta de Riesgo'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.mensaje}</p>
                      <button
                        onClick={() => { setActiveRiskIndex(i); setIsRiskModalOpen(true); }}
                        className="mt-3 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:brightness-90"
                      >
                        Ver Alerta
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
```
Actualizá el bloque del `RiskNotificationModal` al final del archivo para que use los campos de notificación y registre intervención:
```tsx
    {/* Sistema de Notificaciones de Riesgo */}
    {riskStudents.length > 0 && (
      <RiskNotificationModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        studentName={riskStudents[activeRiskIndex] ? `${riskStudents[activeRiskIndex].apellido}, ${riskStudents[activeRiskIndex].nombre}` : ''}
        absencesCount={riskStudents[activeRiskIndex]?.faltas ?? 0}
        tipo={riskStudents[activeRiskIndex]?.tipo}
        onViewDetails={() => { setIsRiskModalOpen(false); onNavigate('history'); }}
        onSendAviso={async () => {
          const n = riskStudents[activeRiskIndex];
          if (n) {
            try {
              await fetch('/api/intervenciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ id_alumno: n.id_alumno, id_notificacion: n.id, motivo: 'Aviso a la familia por riesgo de asistencias' }),
              });
            } catch (e) {
              console.error('Error enviando aviso:', e);
            }
          }
          setIsRiskModalOpen(false);
        }}
      />
    )}
```
(El modal ahora abre **solo al hacer clic** en "Ver Alerta", nunca automáticamente.)

- [ ] **Step 2: Verificar en la UI**

Run: `npm run dev`. Entrá al Dashboard con notificaciones existentes.
Expected: las "Alertas Críticas" muestran las notificaciones reales; el modal abre solo al hacer clic en "Ver Alerta"; "Enviar Aviso" registra la intervención.

- [ ] **Step 3: Commit**

```bash
git add src/views/dashboard/Dashboard.tsx
git commit -m "feat: dashboard con alertas de riesgo reales desde notificaciones"
```

---

## Task 12: Badges reales en StudentsDirectory

**Files:**
- Modify: `src/views/secretario/StudentsDirectory.tsx`

- [ ] **Step 1: Traer el riesgo y mapearlo**

En `src/views/secretario/StudentsDirectory.tsx`, agregá un estado y un `useEffect` que consulte `/api/alumnos/riesgo`:
```tsx
  const [riesgoPorAlumno, setRiesgoPorAlumno] = useState<Record<number, { nivel: string; faltas: number }>>({});

  useEffect(() => {
    const fetchRiesgo = async () => {
      try {
        const res = await fetch('/api/alumnos/riesgo', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
          const data: any[] = await res.json();
          const mapa: Record<number, { nivel: string; faltas: number }> = {};
          for (const r of data) mapa[r.id] = { nivel: r.nivel, faltas: r.faltas };
          setRiesgoPorAlumno(mapa);
        }
      } catch (e) {
        console.error('Error cargando riesgo:', e);
      }
    };
    fetchRiesgo();
  }, []);
```
(Si `useState`/`useEffect` no están importados, agregalos al import de React.)

- [ ] **Step 2: Mostrar el badge y la métrica reales**

Para la métrica "Alertas de Riesgo" (hoy `value: '0'`), reemplazá `'0'` por:
```tsx
Object.keys(riesgoPorAlumno).length.toString()
```
Y en la fila/tarjeta de cada alumno (donde se renderiza el alumno en la lista), agregá un badge condicional usando su `id`:
```tsx
{riesgoPorAlumno[student.id] && (
  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
    riesgoPorAlumno[student.id].nivel === 'Critico' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
  }`}>
    {riesgoPorAlumno[student.id].nivel === 'Critico' ? 'Crítico' : 'Riesgo'} · {riesgoPorAlumno[student.id].faltas}
  </span>
)}
```
(Adaptá el nombre de la variable del alumno —`student`/`alumno`— al que use el `.map` existente del archivo.)

- [ ] **Step 3: Verificar en la UI**

Run: `npm run dev`. Como secretario, entrá a "Gestión de Alumnos".
Expected: los alumnos en riesgo muestran badge amarillo/rojo con su cantidad de faltas; la métrica "Alertas de Riesgo" refleja la cantidad real.

- [ ] **Step 4: Commit**

```bash
git add src/views/secretario/StudentsDirectory.tsx
git commit -m "feat: badges de riesgo y metrica real en el directorio de alumnos"
```

---

## Task 13: Panel de Justificativos (frontend) + navegación

**Files:**
- Create: `src/views/justificativos/JustificativosPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Crear el panel**

Create `src/views/justificativos/JustificativosPanel.tsx`:
```tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Upload, FileCheck, AlertCircle } from 'lucide-react';

interface Falta {
  id: number;
  fecha: string;
  estado: string;
  observaciones: string | null;
}

interface AlumnoResultado {
  alumno_id: number;
  dni: string;
  nombre: string;
  apellido: string;
}

export const JustificativosPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [alumno, setAlumno] = useState<AlumnoResultado | null>(null);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [loading, setLoading] = useState(false);
  const [faltaSel, setFaltaSel] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');

  const token = () => localStorage.getItem('token');

  const buscar = async () => {
    if (!searchTerm) return;
    setLoading(true);
    setMensaje('');
    try {
      const res = await fetch(`/api/reports/historial/${searchTerm}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data: any[] = await res.json();
        if (data.length === 0) { setAlumno(null); setFaltas([]); setMensaje('No se encontró el alumno.'); return; }
        const primero = data[0];
        const al: AlumnoResultado = { alumno_id: primero.alumno_id, dni: primero.dni, nombre: primero.nombre, apellido: primero.apellido };
        setAlumno(al);
        await cargarFaltas(al.alumno_id);
      }
    } catch (e) {
      console.error('Error buscando alumno:', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarFaltas = async (alumnoId: number) => {
    try {
      const res = await fetch(`/api/justificativos/faltas/${alumnoId}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setFaltas(await res.json());
    } catch (e) {
      console.error('Error cargando faltas:', e);
    }
  };

  const subir = async () => {
    if (!faltaSel || !archivo) { setMensaje('Elegí una falta y un archivo.'); return; }
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('id_asistencia', String(faltaSel));
    if (motivo) form.append('motivo', motivo);
    try {
      const res = await fetch('/api/justificativos', { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMensaje('Justificativo cargado. La falta quedó justificada.');
        setFaltaSel(null);
        setArchivo(null);
        setMotivo('');
        if (alumno) await cargarFaltas(alumno.alumno_id);
      } else {
        setMensaje(data.message || 'Error al cargar el justificativo.');
      }
    } catch (e) {
      console.error('Error subiendo justificativo:', e);
      setMensaje('Error de conexión.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 ml-64">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-black text-brand-navy mb-4">Justificativos</h2>
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar alumno por DNI, nombre o apellido..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-navy/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-brand-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors">Buscar</button>
          </form>
        </div>

        {mensaje && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-700 text-sm font-medium">{mensaje}</div>
        )}

        {loading ? (
          <div className="text-center py-10 text-slate-500 font-medium">Buscando...</div>
        ) : alumno && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-brand-navy uppercase text-sm">{alumno.apellido}, {alumno.nombre}</h3>
              <p className="text-xs text-slate-500 font-medium">DNI: {alumno.dni} — Faltas sin justificar</p>
            </div>

            {faltas.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileCheck className="mx-auto mb-3 text-slate-300" size={40} />
                <p className="font-medium text-sm">Este alumno no tiene faltas pendientes de justificar.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {faltas.map((f) => (
                  <label key={f.id} className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 ${faltaSel === f.id ? 'bg-brand-navy/5' : ''}`}>
                    <input type="radio" name="falta" checked={faltaSel === f.id} onChange={() => setFaltaSel(f.id)} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{new Date(f.fecha).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-500">{f.estado}{f.observaciones ? ` — ${f.observaciones}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {faltas.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-navy/10"
                />
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-slate-100 file:font-bold file:text-slate-700"
                />
                <button onClick={subir} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:brightness-95 transition-all">
                  <Upload size={18} /> Subir justificativo
                </button>
              </div>
            )}
          </div>
        )}

        {!alumno && !loading && !mensaje && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Buscá un alumno para cargar un justificativo.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Registrar la ruta en `App.tsx`**

En `src/App.tsx` agregá el import:
```tsx
import { JustificativosPanel } from './views/justificativos/JustificativosPanel';
```
Y dentro del `<AnimatePresence>`, junto a las demás vistas:
```tsx
              {activeTab === 'justificativos' && (userRole === 'Preceptor/a' || userRole === 'Secretario/a') && (
                <JustificativosPanel key="just" />
              )}
```

- [ ] **Step 3: Agregar el ítem al `Sidebar`**

En `src/components/layout/Sidebar.tsx`, importá un ícono (`FileCheck`) en el import de `lucide-react` y agregá al array `menuItems`:
```tsx
    { id: 'justificativos', label: 'Justificativos', icon: FileCheck, roles: ['Secretario/a', 'Preceptor/a'] },
```

- [ ] **Step 4: Verificar en la UI**

Run: `npm run dev`. Como preceptor o secretario, entrá a "Justificativos", buscá un alumno con faltas, elegí una, subí un PDF.
Expected: la falta desaparece de la lista (quedó `Ausente Justificado`); el archivo queda en `api/uploads/`; el conteo de riesgo de ese alumno baja.

- [ ] **Step 5: Commit**

```bash
git add src/views/justificativos/JustificativosPanel.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: panel de justificativos con carga de archivo que justifica la falta"
```

---

## Task 14: Panel ABM de períodos (frontend)

**Files:**
- Create: `src/views/secretario/PeriodManagement.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Crear el panel**

Create `src/views/secretario/PeriodManagement.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';

interface Periodo {
  id: number;
  nombre: string;
  anio_lectivo: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export const PeriodManagement: React.FC = () => {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [form, setForm] = useState({ nombre: '', anio_lectivo: '2026', fecha_inicio: '', fecha_fin: '' });
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token');

  const cargar = async () => {
    try {
      const res = await fetch('/api/periodos', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setPeriodos(await res.json());
    } catch (e) {
      console.error('Error cargando períodos:', e);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    setError('');
    try {
      const res = await fetch('/api/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, anio_lectivo: Number(form.anio_lectivo) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setForm({ nombre: '', anio_lectivo: '2026', fecha_inicio: '', fecha_fin: '' });
        await cargar();
      } else {
        setError(data.message || 'Error al crear el período');
      }
    } catch (e) {
      console.error('Error creando período:', e);
      setError('Error de conexión');
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este período?')) return;
    try {
      await fetch(`/api/periodos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      await cargar();
    } catch (e) {
      console.error('Error eliminando período:', e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 ml-64">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-black text-brand-navy tracking-tight">Períodos / Bimestres</h2>
          <p className="text-slate-500 font-medium">Definí los bimestres del ciclo lectivo que usa el cálculo de riesgo.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm md:col-span-2" />
          <input placeholder="Año" type="number" value={form.anio_lectivo} onChange={(e) => setForm({ ...form, anio_lectivo: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl text-sm" />
          <button onClick={crear} className="md:col-span-5 flex items-center justify-center gap-2 bg-brand-navy text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800">
            <Plus size={18} /> Agregar período
          </button>
        </div>
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl p-3 font-medium">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
          {periodos.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-sm">No hay períodos cargados.</p>
          ) : (
            periodos.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <CalendarRange className="text-brand-navy" size={20} />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{p.nombre} <span className="text-slate-400">({p.anio_lectivo})</span></p>
                    <p className="text-xs text-slate-500">{new Date(p.fecha_inicio).toLocaleDateString()} → {new Date(p.fecha_fin).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => eliminar(p.id)} className="text-rose-500 hover:text-rose-700 p-2"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Registrar en `App.tsx`**

Agregá:
```tsx
import { PeriodManagement } from './views/secretario/PeriodManagement';
```
Y dentro del `<AnimatePresence>`:
```tsx
              {activeTab === 'periodos' && userRole === 'Secretario/a' && (
                <PeriodManagement key="per" />
              )}
```

- [ ] **Step 3: Agregar el ítem al `Sidebar`**

Importá `CalendarRange` en `lucide-react` y agregá al `menuItems`:
```tsx
    { id: 'periodos', label: 'Períodos / Bimestres', icon: CalendarRange, roles: ['Secretario/a'] },
```

- [ ] **Step 4: Verificar en la UI**

Run: `npm run dev`. Como secretario, entrá a "Períodos / Bimestres".
Expected: se ven los 4 bimestres sembrados; podés crear y eliminar; validación de fechas (inicio > fin devuelve error).

- [ ] **Step 5: Commit**

```bash
git add src/views/secretario/PeriodManagement.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: panel ABM de periodos (bimestres) para el secretario"
```

---

## Verificación final (end-to-end)

- [ ] Cargar faltas a un alumno hasta 4 en el bimestre → al guardar aparece el pop-up amarillo (Riesgo) y queda en la campana.
- [ ] Llegar a 5 → pop-up rojo (Crítico). Repetir guardado NO duplica notificaciones.
- [ ] "Enviar Aviso" (en pop-up, campana o dashboard) → la notificación pasa a "Gestionada" y se registra la intervención.
- [ ] Subir un justificativo a una de esas faltas → la falta pasa a `Ausente Justificado`, baja el acumulado y el badge del alumno se ajusta.
- [ ] El secretario edita un bimestre y el cálculo respeta el nuevo rango.
- [ ] `cd api && npm test` → unit tests de riesgo en verde.

---

## Notas de seguridad (verificar antes de cerrar)

- Subida: solo PDF/JPG/PNG, límite 5 MB, nombre de archivo generado por el servidor (no el del cliente), descarga por endpoint autenticado (no `/uploads` estático). `path.basename` evita path traversal.
- Todas las queries parametrizadas.
- `verifyToken` en todos los endpoints; `isAdmin` en mutaciones de períodos.
- `api/uploads/` ignorado en git.
