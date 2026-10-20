import pool from './src/config/db';
import bcrypt from 'bcrypt';
import type { ResultSetHeader } from 'mysql2';

// Orden de borrado: primero las tablas que dependen de otras.
// Se usa DELETE (y no TRUNCATE) porque TRUNCATE hace commit implícito
// y no se puede revertir si algo falla después.
const TABLAS_A_LIMPIAR = [
    'notificacion_lecturas',
    'intervenciones',
    'justificativos',
    'notificaciones',
    'asistencias',
    'alumnos',
    'usuarios',
    'cursos',
];

async function seed() {
    const connection = await pool.getConnection();
    let exitCode = 0;
    try {
        console.log('🌱 Iniciando carga de datos...');
        await connection.beginTransaction();

        // 0. Limpiar tablas previas (para evitar errores de duplicado)
        console.log('🧹 Limpiando datos existentes...');
        for (const tabla of TABLAS_A_LIMPIAR) {
            await connection.query(`DELETE FROM ${tabla}`);
        }

        // 1. Insertar Cursos (division es VARCHAR(10))
        console.log('📚 Insertando cursos...');
        const cursos = [
            ['1ro', 'A', 'Aula 101'],
            ['1ro', 'B', 'Aula 102'],
            ['2do', 'A', 'Aula 201'],
            ['Ed. Física', 'Varones A', 'Playón Deportivo'],
        ];
        const idsCursos: number[] = [];
        for (const c of cursos) {
            const [res] = await connection.query<ResultSetHeader>(
                'INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)',
                c
            );
            idsCursos.push(res.insertId);
        }

        // 2. Insertar Usuarios (Contraseña: password123)
        console.log('👤 Insertando usuarios...');
        const passwordHash = await bcrypt.hash('password123', 10);
        const usuarios = [
            ['Laura', 'Fernández', 'directivo', 'Directivo/a'],
            ['Admin', 'Sistemas', 'admin', 'Secretario/a'],
            ['Juan', 'Pérez', 'preceptor1', 'Preceptor/a'],
            ['Marta', 'García', 'profe_ef', 'Profesor/a EF'],
        ];
        for (const [nombre, apellido, usuario, rol] of usuarios) {
            await connection.query(
                "INSERT INTO usuarios (nombre, apellido, usuario, password, rol, estado) VALUES (?, ?, ?, ?, ?, 'Activo')",
                [nombre, apellido, usuario, passwordHash, rol]
            );
        }

        // 3. Insertar Alumnos (índice del curso en `cursos`)
        console.log('🎓 Insertando alumnos...');
        const students = [
            ['Lucas', 'Gómez', '45000111', 0],
            ['Sofía', 'Rodríguez', '45000222', 0],
            ['Mateo', 'López', '45000333', 0],
            ['Valentina', 'Martínez', '45000444', 0],
            ['Benjamín', 'González', '45000555', 1],
            ['Emma', 'Sánchez', '45000666', 1],
        ] as const;

        for (const [nombre, apellido, dni, curso] of students) {
            await connection.query(
                'INSERT INTO alumnos (nombre, apellido, dni, id_curso) VALUES (?, ?, ?, ?)',
                [nombre, apellido, dni, idsCursos[curso]]
            );
        }

        await connection.commit();
        console.log('✅ Semilla ejecutada con éxito. Usuarios creados con clave: password123');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error ejecutando la semilla (no se modificó la base):', error);
        exitCode = 1;
    } finally {
        connection.release();
        process.exit(exitCode);
    }
}

seed();
