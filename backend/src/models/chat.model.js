import pool from '../config/db.js';

const MESSAGE_SELECT = `
  SELECT m.*, u.username, u.avatar_url,
    ma.secure_url AS media_url, ma.resource_type AS media_resource_type,
    r.contenido AS respuesta_contenido, ru.username AS respuesta_username
  FROM mensajes_chat m
  LEFT JOIN users u ON u.id = m.usuario_id
  LEFT JOIN media_assets ma ON ma.id = m.media_asset_id
  LEFT JOIN mensajes_chat r ON r.id = m.respuesta_a_id
  LEFT JOIN users ru ON ru.id = r.usuario_id
`;

function isLegacySchemaError(error) {
  return ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_COLUMN'].includes(error?.code);
}

function mapLegacyMessages(rows) {
  return rows.map((row) => ({
    ...row,
    media_url: row.media_url || null,
    media_resource_type: row.media_resource_type || null,
    respuesta_contenido: row.respuesta_contenido || null,
    respuesta_username: row.respuesta_username || null,
  }));
}

export const ChatModel = {
  async findDirectChat(userA, userB) {
    const [rows] = await pool.query(
      `SELECT c.*
       FROM chats c
       INNER JOIN chats_participantes p1 ON p1.chat_id = c.id AND p1.usuario_id = ?
       INNER JOIN chats_participantes p2 ON p2.chat_id = c.id AND p2.usuario_id = ?
       LIMIT 1`,
      [userA, userB]
    );
    return rows[0] || null;
  },

  async createDirectChat(createdBy, otherUserId) {
    const [result] = await pool.query('INSERT INTO chats (creado_por, estado) VALUES (?, ?)', [createdBy, 'pendiente']);
    await pool.query('INSERT INTO chats_participantes (chat_id, usuario_id) VALUES (?, ?), (?, ?)', [
      result.insertId,
      createdBy,
      result.insertId,
      otherUserId,
    ]);
    return result.insertId;
  },

  async findByIdForUser(chatId, userId) {
    const [rows] = await pool.query(
      `SELECT c.*
       FROM chats c
       INNER JOIN chats_participantes cp ON cp.chat_id = c.id
       WHERE c.id = ? AND cp.usuario_id = ?`,
      [chatId, userId]
    );
    return rows[0] || null;
  },

  async listForUser(userId) {
    try {
      const [rows] = await pool.query(
        `SELECT c.id, c.estado, c.creado_por, c.fecha_actualizacion,
          other_user.id AS other_user_id,
          other_user.username AS other_username,
          other_user.avatar_url AS other_avatar_url,
          last_msg.contenido AS ultimo_mensaje,
          last_ma.secure_url AS ultima_imagen,
          last_msg.fecha_creacion AS ultimo_mensaje_fecha
         FROM chats c
         INNER JOIN chats_participantes me ON me.chat_id = c.id AND me.usuario_id = ?
         INNER JOIN chats_participantes other_p ON other_p.chat_id = c.id AND other_p.usuario_id <> ?
         INNER JOIN users other_user ON other_user.id = other_p.usuario_id
         LEFT JOIN mensajes_chat last_msg ON last_msg.id = (
           SELECT id FROM mensajes_chat WHERE chat_id = c.id ORDER BY fecha_creacion DESC LIMIT 1
         )
         LEFT JOIN media_assets last_ma ON last_ma.id = last_msg.media_asset_id
         ORDER BY COALESCE(last_msg.fecha_creacion, c.fecha_actualizacion) DESC`,
        [userId, userId]
      );
      return rows;
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      const [rows] = await pool.query(
        `SELECT c.id, c.estado, c.creado_por, c.fecha_actualizacion,
          other_user.id AS other_user_id,
          other_user.username AS other_username,
          other_user.avatar_url AS other_avatar_url,
          last_msg.contenido AS ultimo_mensaje,
          NULL AS ultima_imagen,
          last_msg.fecha_creacion AS ultimo_mensaje_fecha
         FROM chats c
         INNER JOIN chats_participantes me ON me.chat_id = c.id AND me.usuario_id = ?
         INNER JOIN chats_participantes other_p ON other_p.chat_id = c.id AND other_p.usuario_id <> ?
         INNER JOIN users other_user ON other_user.id = other_p.usuario_id
         LEFT JOIN mensajes_chat last_msg ON last_msg.id = (
           SELECT id FROM mensajes_chat WHERE chat_id = c.id ORDER BY fecha_creacion DESC LIMIT 1
         )
         ORDER BY COALESCE(last_msg.fecha_creacion, c.fecha_actualizacion) DESC`,
        [userId, userId]
      );
      return rows;
    }
  },

  async listMessages(chatId, userId) {
    await this.findByIdForUser(chatId, userId);
    try {
      const [rows] = await pool.query(`${MESSAGE_SELECT} WHERE m.chat_id = ? ORDER BY m.fecha_creacion ASC`, [chatId]);
      return rows;
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      try {
        const [rows] = await pool.query(
          `SELECT m.*, u.username, u.avatar_url,
            NULL AS media_url, NULL AS media_resource_type,
            r.contenido AS respuesta_contenido, ru.username AS respuesta_username
           FROM mensajes_chat m
           LEFT JOIN users u ON u.id = m.usuario_id
           LEFT JOIN mensajes_chat r ON r.id = m.respuesta_a_id
           LEFT JOIN users ru ON ru.id = r.usuario_id
           WHERE m.chat_id = ?
           ORDER BY m.fecha_creacion ASC`,
          [chatId]
        );
        return mapLegacyMessages(rows);
      } catch (legacyError) {
        if (!isLegacySchemaError(legacyError)) throw legacyError;
        const [rows] = await pool.query(
          `SELECT m.*, u.username, u.avatar_url,
            NULL AS media_url, NULL AS media_resource_type,
            NULL AS respuesta_contenido, NULL AS respuesta_username
           FROM mensajes_chat m
           LEFT JOIN users u ON u.id = m.usuario_id
           WHERE m.chat_id = ?
           ORDER BY m.fecha_creacion ASC`,
          [chatId]
        );
        return mapLegacyMessages(rows);
      }
    }
  },

  async participantIds(chatId) {
    const [rows] = await pool.query('SELECT usuario_id FROM chats_participantes WHERE chat_id = ?', [chatId]);
    return rows.map(row => row.usuario_id);
  },

  async addMessage({ chatId, userId, contenido, media_asset_id, respuesta_a_id }) {
    let result;
    try {
      [result] = await pool.query(
        'INSERT INTO mensajes_chat (chat_id, usuario_id, contenido, media_asset_id, respuesta_a_id) VALUES (?, ?, ?, ?, ?)',
        [chatId, userId, contenido, media_asset_id || null, respuesta_a_id]
      );
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      try {
        [result] = await pool.query(
          'INSERT INTO mensajes_chat (chat_id, usuario_id, contenido, respuesta_a_id) VALUES (?, ?, ?, ?)',
          [chatId, userId, contenido, respuesta_a_id]
        );
      } catch (legacyInsertError) {
        if (!isLegacySchemaError(legacyInsertError)) throw legacyInsertError;
        [result] = await pool.query(
          'INSERT INTO mensajes_chat (chat_id, usuario_id, contenido) VALUES (?, ?, ?)',
          [chatId, userId, contenido]
        );
      }
    }

    await pool.query('UPDATE chats SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?', ['activo', chatId]);
    try {
      const [rows] = await pool.query(`${MESSAGE_SELECT} WHERE m.id = ?`, [result.insertId]);
      return rows[0];
    } catch (error) {
      if (!isLegacySchemaError(error)) throw error;
      const [rows] = await pool.query(
        `SELECT m.*, u.username, u.avatar_url,
          NULL AS media_url, NULL AS media_resource_type,
          r.contenido AS respuesta_contenido, ru.username AS respuesta_username
         FROM mensajes_chat m
         LEFT JOIN users u ON u.id = m.usuario_id
         LEFT JOIN mensajes_chat r ON r.id = m.respuesta_a_id
         LEFT JOIN users ru ON ru.id = r.usuario_id
         WHERE m.id = ?`,
        [result.insertId]
      );
      return mapLegacyMessages(rows)[0] || null;
    }
  },
};
