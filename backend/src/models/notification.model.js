import pool from '../config/db.js';

export const NotificationModel = {
  async findAllByUser(userId) {
    const [rows] = await pool.query(
      `SELECT n.*, p.titulo AS publicacion_titulo, actor.username AS actor_username
       FROM notificaciones n
       LEFT JOIN publicaciones p ON p.id = n.publicacion_id
       LEFT JOIN users actor ON actor.id = n.actor_usuario_id
       WHERE n.usuario_id = ?
         AND (
           n.tipo IN ('comentario', 'seguimiento')
           OR ((n.tipo IS NULL OR n.tipo = 'general') AND (n.publicacion_id IS NOT NULL OR n.comentario_id IS NOT NULL))
         )
       ORDER BY n.fecha_creacion DESC
       LIMIT 50`,
      [userId]
    );
    return rows;
  },

  async countUnread(userId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM notificaciones
       WHERE usuario_id = ?
         AND leida = FALSE
         AND (
           tipo IN ('comentario', 'seguimiento')
           OR ((tipo IS NULL OR tipo = 'general') AND (publicacion_id IS NOT NULL OR comentario_id IS NOT NULL))
         )`,
      [userId]
    );
    return rows[0].total;
  },

  async create({ usuario_id, titulo, mensaje, publicacion_id, comentario_id, tipo = 'general', actor_usuario_id = null }) {
    await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, publicacion_id, comentario_id, tipo, actor_usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, titulo, mensaje, publicacion_id, comentario_id, tipo, actor_usuario_id]
    );
  },

  async markAsRead(id, userId) {
    const [result] = await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    return result.affectedRows;
  },

  async markAllRead(userId) {
    await pool.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE usuario_id = ?
         AND (
           tipo IN ('comentario', 'seguimiento')
           OR ((tipo IS NULL OR tipo = 'general') AND (publicacion_id IS NOT NULL OR comentario_id IS NOT NULL))
         )`,
      [userId]
    );
  },

  async delete(id, userId) {
    const [result] = await pool.query(
      'DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );
    return result.affectedRows;
  },
};
