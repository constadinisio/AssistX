-- Migración: agrega dni, email y estado a usuarios (auto-registro de personal)
-- Ejecutar manualmente en phpMyAdmin sobre la base assistx_db.

ALTER TABLE usuarios
  ADD COLUMN dni    VARCHAR(15)  NULL AFTER apellido,
  ADD COLUMN email  VARCHAR(150) NULL AFTER usuario,
  ADD COLUMN estado ENUM('Pendiente','Activo','Rechazada') NOT NULL DEFAULT 'Pendiente' AFTER rol,
  ADD UNIQUE KEY uq_usuarios_dni   (dni),
  ADD UNIQUE KEY uq_usuarios_email (email);

-- Los usuarios seed existentes quedan activos
UPDATE usuarios SET estado = 'Activo';
