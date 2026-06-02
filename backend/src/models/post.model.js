import pool from '../config/db.js';

const BASE_COLUMNS = `p.*, u.username, u.avatar_url, c.nombre AS comunidad_nombre,
  ma.id AS media_asset_id, ma.secure_url AS media_url, ma.resource_type AS media_resource_type`;

const BASE_FROM = `
  FROM publicaciones p
  LEFT JOIN users u ON u.id = p.usuario_id
  LEFT JOIN comunidades c ON c.id = p.comunidad_id
  LEFT JOIN media_assets ma ON ma.id = p.media_asset_id
`;

function voteSelect(userId) {
  return userId
    ? ', (SELECT tipo_voto FROM votos_usuarios WHERE usuario_id = ? AND publicacion_id = p.id) AS voto_usuario'
    : '';
}

function membershipSelect(userId) {
  return userId
    ? ', EXISTS(SELECT 1 FROM miembros_comunidad mc WHERE mc.comunidad_id = p.comunidad_id AND mc.usuario_id = ?) AS es_miembro_comunidad'
    : ', 0 AS es_miembro_comunidad';
}

function sharedSelect(userId) {
  return userId
    ? ', EXISTS(SELECT 1 FROM publicaciones_compartidas pc WHERE pc.publicacion_id = p.id AND pc.usuario_id = ?) AS compartido_por_usuario'
    : ', 0 AS compartido_por_usuario';
}

export const PostModel = {
  async findAll({ comunidad_id, userId }) {
    let where = '';
    const params = [];

    if (userId) params.push(userId, userId, userId);
    if (comunidad_id) {
      where = 'WHERE p.comunidad_id = ?';
      params.push(comunidad_id);
    }

    const [rows] = await pool.query(
      `SELECT ${BASE_COLUMNS} ${voteSelect(userId)} ${membershipSelect(userId)} ${sharedSelect(userId)} ${BASE_FROM} ${where} ORDER BY p.fecha_creacion DESC`,
      params
    );
    return rows;
  },

  async findById(id, userId = null) {
    const params = userId ? [userId, userId, userId, id] : [id];
    const [rows] = await pool.query(`SELECT ${BASE_COLUMNS} ${voteSelect(userId)} ${membershipSelect(userId)} ${sharedSelect(userId)} ${BASE_FROM} WHERE p.id = ?`, params);
    return rows[0] || null;
  },

  async findRawById(id) {
    const [rows] = await pool.query('SELECT * FROM publicaciones WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByUserId(userId, viewerId = null) {
    const params = viewerId ? [viewerId, userId] : [userId];
    const [rows] = await pool.query(
      `SELECT ${BASE_COLUMNS} ${sharedSelect(viewerId)} ${BASE_FROM} WHERE p.usuario_id = ? ORDER BY p.fecha_creacion DESC`,
      params
    );
    return rows;
  },

  async findSharedByUserId(userId, viewerId = null) {
    const params = viewerId ? [viewerId, userId] : [userId];
    const [rows] = await pool.query(
      `SELECT ${BASE_COLUMNS} ${sharedSelect(viewerId)}, pc.fecha_creacion AS compartido_en
       FROM publicaciones_compartidas pc
       INNER JOIN publicaciones p ON p.id = pc.publicacion_id
       LEFT JOIN users u ON u.id = p.usuario_id
       LEFT JOIN comunidades c ON c.id = p.comunidad_id
       LEFT JOIN media_assets ma ON ma.id = p.media_asset_id
       WHERE pc.usuario_id = ?
       ORDER BY pc.fecha_creacion DESC`,
      params
    );
    return rows;
  },

  async create({ titulo, contenido, url_imagen, url_video, media_asset_id, comunidad_id, usuarioId }) {
    const [result] = await pool.query(
      'INSERT INTO publicaciones (titulo, contenido, url_imagen, url_video, media_asset_id, usuario_id, comunidad_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [titulo, contenido, url_imagen, url_video, media_asset_id || null, usuarioId, comunidad_id]
    );
    return result.insertId;
  },

  async delete(id) {
    await pool.query('DELETE FROM publicaciones WHERE id = ?', [id]);
  },

  async incrementVotes(postId, delta) {
    await pool.query('UPDATE publicaciones SET votos = votos + ? WHERE id = ?', [delta, postId]);
  },

  async share(userId, postId) {
    await pool.query(
      'INSERT IGNORE INTO publicaciones_compartidas (usuario_id, publicacion_id) VALUES (?, ?)',
      [userId, postId]
    );
  },

  async unshare(userId, postId) {
    await pool.query(
      'DELETE FROM publicaciones_compartidas WHERE usuario_id = ? AND publicacion_id = ?',
      [userId, postId]
    );
  },

  async recalculateVotes(postId) {
    await pool.query(`
      UPDATE publicaciones p
      SET votos = (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN v.tipo_voto = 'up' THEN 1
              WHEN v.tipo_voto = 'down' THEN -1
              ELSE 0
            END
          ),
          0
        )
        FROM votos_usuarios v
        WHERE v.publicacion_id = p.id
      )
      WHERE p.id = ?
    `, [postId]);
  },
};
