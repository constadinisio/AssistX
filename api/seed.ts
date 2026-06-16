import pool from './src/config/db';
import bcrypt from 'bcrypt';

async function seed() {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Iniciando carga de datos...');

        // 0. Limpiar tablas previas (para evitar errores de duplicado)
        console.log('🧹 Limpiando datos existentes...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE asistencias');
        await connection.query('TRUNCATE TABLE alumnos');
        await connection.query('TRUNCATE TABLE usuarios');
        await connection.query('TRUNCATE TABLE cursos');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 1. Insertar Cursos
        console.log('📚 Insertando cursos...');
        await connection.query('INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)', ['1ro', 'A', 'Aula 101']);
        await connection.query('INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)', ['1ro', 'B', 'Aula 102']);
        await connection.query('INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)', ['2do', 'A', 'Aula 201']);
        await connection.query('INSERT INTO cursos (anio, division, aula) VALUES (?, ?, ?)', ['Ed. Física', 'Grupo Varones A', 'Playón Deportivo']);

        // 2. Insertar Usuarios (Contraseña: password123)
        console.log('👤 Insertando usuarios...');
        const passwordHash = await bcrypt.hash('password123', 10);
        
        await connection.query(
            'INSERT INTO usuarios (nombre, apellido, usuario, password, rol) VALUES (?, ?, ?, ?, ?)',
            ['Admin', 'Sistemas', 'admin', passwordHash, 'Secretario/a']
        );
        await connection.query(
            'INSERT INTO usuarios (nombre, apellido, usuario, password, rol) VALUES (?, ?, ?, ?, ?)',
            ['Juan', 'Pérez', 'preceptor1', passwordHash, 'Preceptor/a']
        );
        await connection.query(
            'INSERT INTO usuarios (nombre, apellido, usuario, password, rol) VALUES (?, ?, ?, ?, ?)',
            ['Marta', 'García', 'profe_ef', passwordHash, 'Profesor/a EF']
        );

        // 3. Insertar Alumnos
        console.log('🎓 Insertando alumnos...');
        const students = [
            ['Lucas', 'Gómez', '45000111', 1],
            ['Sofía', 'Rodríguez', '45000222', 1],
            ['Mateo', 'López', '45000333', 1],
            ['Valentina', 'Martínez', '45000444', 1],
            ['Benjamín', 'González', '45000555', 2],
            ['Emma', 'Sánchez', '45000666', 2],
        ];

        for (const s of students) {
            await connection.query(
                'INSERT INTO alumnos (nombre, apellido, dni, id_curso) VALUES (?, ?, ?, ?)',
                s
            );
        }

        console.log('✅ Semilla ejecutada con éxito. Usuarios creados con clave: password123');
    } catch (error) {
        console.error('❌ Error ejecutando la semilla:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

seed();