-- Migración: agrega el rol Directivo/a (gestión completa, sin toma de asistencia)
-- Ejecutar manualmente en phpMyAdmin sobre la base assistx_db.

ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('Directivo/a','Secretario/a','Preceptor/a','Profesor/a EF') NOT NULL;
