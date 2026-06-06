import pool from '../src/config/db.js';

const statements = [
  'ALTER TABLE users ADD COLUMN bio TEXT NULL',
  'ALTER TABLE comentarios ADD COLUMN comentario_padre_id INT NULL',
  'ALTER TABLE comentarios ADD CONSTRAINT fk_comentario_padre FOREIGN KEY (comentario_padre_id) REFERENCES comentarios(id) ON DELETE CASCADE',
  `CREATE TABLE IF NOT EXISTS media_assets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    public_id VARCHAR(255) NOT NULL UNIQUE,
    secure_url TEXT NOT NULL,
    resource_type ENUM('image', 'video', 'raw') NOT NULL,
    format VARCHAR(20) NULL,
    bytes INT NULL,
    width INT NULL,
    height INT NULL,
    duration DECIMAL(10,3) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'ALTER TABLE publicaciones ADD COLUMN media_asset_id BIGINT NULL',
  'ALTER TABLE publicaciones ADD CONSTRAINT fk_publicaciones_media_asset FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL',
  'ALTER TABLE mensajes_chat ADD COLUMN media_asset_id BIGINT NULL',
  'ALTER TABLE mensajes_chat ADD CONSTRAINT fk_mensajes_media_asset FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL',
  `CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creado_por VARCHAR(36) NOT NULL,
    estado ENUM('pendiente', 'activo') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS chats_participantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    usuario_id VARCHAR(36) NOT NULL,
    UNIQUE KEY unique_chat_usuario (chat_id, usuario_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS mensajes_chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    usuario_id VARCHAR(36) NOT NULL,
    contenido TEXT,
    imagen_data MEDIUMTEXT,
    respuesta_a_id INT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (respuesta_a_id) REFERENCES mensajes_chat(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS usuarios_seguidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seguidor_id VARCHAR(36) NOT NULL,
    seguido_id VARCHAR(36) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (seguidor_id, seguido_id),
    FOREIGN KEY (seguidor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seguido_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS publicaciones_compartidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(36) NOT NULL,
    publicacion_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_shared_post (usuario_id, publicacion_id),
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE
  )`,
  "ALTER TABLE notificaciones ADD COLUMN tipo ENUM('comentario', 'seguimiento', 'general') DEFAULT 'general'",
  'ALTER TABLE notificaciones ADD COLUMN actor_usuario_id VARCHAR(36) NULL',
  'ALTER TABLE notificaciones ADD CONSTRAINT fk_notificaciones_actor_usuario FOREIGN KEY (actor_usuario_id) REFERENCES users(id) ON DELETE SET NULL',
];

for (const statement of statements) {
  try {
    await pool.query(statement);
    console.log('OK', statement.split('\n')[0]);
  } catch (error) {
    if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_TABLE_EXISTS_ERROR', 'ER_CANT_CREATE_TABLE'].includes(error.code)) {
      console.log('SKIP', error.code);
    } else {
      throw error;
    }
  }
}

console.log('Upgrade hecho.');
process.exit(0);
