ALTER TABLE notificaciones
  ADD COLUMN tipo ENUM('comentario', 'seguimiento', 'general') DEFAULT 'general';

ALTER TABLE notificaciones
  ADD COLUMN actor_usuario_id VARCHAR(36) NULL;

ALTER TABLE notificaciones
  ADD CONSTRAINT fk_notificaciones_actor_usuario
  FOREIGN KEY (actor_usuario_id) REFERENCES users(id) ON DELETE SET NULL;
