import pool from '../config/db.js';

export const UserModel = {
  async findByEmailOrUsername(email, username) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    return rows;
  },

  async isAdmin(userId) {
    const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    return rows.length > 0 && rows[0].is_admin === 1;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT id, email, username, avatar_url, bio, is_admin, fecha_creacion FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, email, username, avatar_url, bio, is_admin, fecha_creacion FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async search(query, currentUserId) {
    const term = `%${query}%`;
    const [rows] = await pool.query(
      `SELECT id, username, avatar_url
       FROM users
       WHERE id <> ? AND username LIKE ?
       ORDER BY username ASC
       LIMIT 20`,
      [currentUserId, term]
    );
    return rows;
  },

  async usernameExists(username) {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    return rows.length > 0;
  },

  async create({ id, email, username, passwordHash }) {
    await pool.query(
      'INSERT INTO users (id, email, username, password) VALUES (?, ?, ?, ?)',
      [id, email, username, passwordHash]
    );
  },

  async updateAvatar(userId, avatarUrl) {
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
    const [rows] = await pool.query(
      'SELECT id, email, username, avatar_url, bio, fecha_creacion FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  },

  async updateProfile(userId, { avatar_url, bio, username }) {
    await pool.query(
      'UPDATE users SET avatar_url = ?, bio = ?, username = ? WHERE id = ?',
      [avatar_url || null, bio || null, username || null, userId]
    );
    return this.findById(userId);
  },

  async countsByUserId(userId) {
    const [[rows]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM publicaciones WHERE usuario_id = ?) AS posts_count,
        (SELECT COUNT(*) FROM comentarios WHERE usuario_id = ?) AS comments_count,
        (SELECT COUNT(*) FROM publicaciones_compartidas WHERE usuario_id = ?) AS shared_count,
        (SELECT COUNT(*) FROM usuarios_seguidos WHERE seguido_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM usuarios_seguidos WHERE seguidor_id = ?) AS following_count`,
      [userId, userId, userId, userId, userId]
    );
    return rows;
  },

  async followersByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM usuarios_seguidos s
       INNER JOIN users u ON u.id = s.seguidor_id
       WHERE s.seguido_id = ?
       ORDER BY s.fecha_creacion DESC
       LIMIT 20`,
      [userId]
    );
    return rows;
  },

  async followingByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM usuarios_seguidos s
       INNER JOIN users u ON u.id = s.seguido_id
       WHERE s.seguidor_id = ?
       ORDER BY s.fecha_creacion DESC
       LIMIT 20`,
      [userId]
    );
    return rows;
  },

  async isFollowing(followerId, followedId) {
    if (!followerId || !followedId) return false;
    const [rows] = await pool.query(
      'SELECT 1 FROM usuarios_seguidos WHERE seguidor_id = ? AND seguido_id = ? LIMIT 1',
      [followerId, followedId]
    );
    return rows.length > 0;
  },

  async follow(followerId, followedId) {
    const [result] = await pool.query(
      'INSERT IGNORE INTO usuarios_seguidos (seguidor_id, seguido_id) VALUES (?, ?)',
      [followerId, followedId]
    );
    return result.affectedRows;
  },

  async unfollow(followerId, followedId) {
    await pool.query(
      'DELETE FROM usuarios_seguidos WHERE seguidor_id = ? AND seguido_id = ?',
      [followerId, followedId]
    );
  },
};
