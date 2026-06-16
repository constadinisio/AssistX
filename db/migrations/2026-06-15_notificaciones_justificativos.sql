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
