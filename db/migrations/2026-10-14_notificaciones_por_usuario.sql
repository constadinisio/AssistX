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
ALTER TABLE `notificaciones` ALTER COLUMN `roles_destino` DROP DEFAULT;

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
