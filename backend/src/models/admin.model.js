import pool from '../config/db.js';

const RESOURCES = {
  auth: {
    name: 'auth',
    label: 'Auth / cuentas',
    description: 'Cuentas registradas visibles para administracion',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT id, email, username, is_admin, fecha_creacion
            FROM users
            ORDER BY fecha_creacion DESC`,
  },
  usuarios: {
    name: 'usuarios',
    label: 'Usuarios',
    description: 'Usuarios completos sin exponer passwords',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT id, email, username, avatar_url, bio, is_admin, fecha_creacion
            FROM users
            ORDER BY fecha_creacion DESC`,
  },
  comunidades: {
    name: 'comunidades',
    label: 'Comunidades',
    description: 'Comunidades y datos de su creador',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT c.*, u.username AS creador_username
            FROM comunidades c
            LEFT JOIN users u ON u.id = c.creador_id
            ORDER BY c.fecha_creacion DESC`,
  },
  publicaciones: {
    name: 'publicaciones',
    label: 'Publicaciones',
    description: 'Posts con autor, comunidad y media asociada',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT p.*, u.username, c.nombre AS comunidad_nombre, ma.secure_url AS media_url, ma.resource_type AS media_resource_type
            FROM publicaciones p
            LEFT JOIN users u ON u.id = p.usuario_id
            LEFT JOIN comunidades c ON c.id = p.comunidad_id
            LEFT JOIN media_assets ma ON ma.id = p.media_asset_id
            ORDER BY p.fecha_creacion DESC`,
  },
  comentarios: {
    name: 'comentarios',
    label: 'Comentarios',
    description: 'Comentarios de todos los usuarios',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT cm.*, u.username, p.titulo AS publicacion_titulo
            FROM comentarios cm
            LEFT JOIN users u ON u.id = cm.usuario_id
            LEFT JOIN publicaciones p ON p.id = cm.publicacion_id
            ORDER BY cm.fecha_creacion DESC`,
  },
  notificaciones: {
    name: 'notificaciones',
    label: 'Notificaciones',
    description: 'Todas las notificaciones del sistema, no solo las del usuario actual',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT n.*, destinatario.username AS destinatario_username, actor.username AS actor_username,
                   p.titulo AS publicacion_titulo, cm.contenido AS comentario_contenido
            FROM notificaciones n
            LEFT JOIN users destinatario ON destinatario.id = n.usuario_id
            LEFT JOIN users actor ON actor.id = n.actor_usuario_id
            LEFT JOIN publicaciones p ON p.id = n.publicacion_id
            LEFT JOIN comentarios cm ON cm.id = n.comentario_id
            ORDER BY n.fecha_creacion DESC`,
  },
  media: {
    name: 'media',
    label: 'Media',
    description: 'Assets subidos a Cloudinary y usados por posts o chats',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT *
            FROM media_assets
            ORDER BY created_at DESC`,
  },
  chats: {
    name: 'chats',
    label: 'Chats',
    description: 'Conversaciones y resumen de participantes/mensajes',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT c.*, creador.username AS creador_username,
                   COUNT(DISTINCT cp.usuario_id) AS participantes,
                   COUNT(DISTINCT m.id) AS mensajes
            FROM chats c
            LEFT JOIN users creador ON creador.id = c.creado_por
            LEFT JOIN chats_participantes cp ON cp.chat_id = c.id
            LEFT JOIN mensajes_chat m ON m.chat_id = c.id
            GROUP BY c.id
            ORDER BY c.fecha_actualizacion DESC`,
  },
  mensajes_chat: {
    name: 'mensajes_chat',
    label: 'Mensajes chat',
    description: 'Mensajes de chat con usuario y media asociada',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT m.*, u.username, ma.secure_url AS media_url, ma.resource_type AS media_resource_type
            FROM mensajes_chat m
            LEFT JOIN users u ON u.id = m.usuario_id
            LEFT JOIN media_assets ma ON ma.id = m.media_asset_id
            ORDER BY m.fecha_creacion DESC`,
  },
  chats_participantes: {
    name: 'chats_participantes',
    label: 'Participantes chat',
    description: 'Relacion entre usuarios y chats',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT cp.*, u.username
            FROM chats_participantes cp
            LEFT JOIN users u ON u.id = cp.usuario_id
            ORDER BY cp.id DESC`,
  },
  miembros_comunidad: {
    name: 'miembros_comunidad',
    label: 'Miembros comunidad',
    description: 'Usuarios unidos a comunidades',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT mc.*, u.username, c.nombre AS comunidad_nombre
            FROM miembros_comunidad mc
            LEFT JOIN users u ON u.id = mc.usuario_id
            LEFT JOIN comunidades c ON c.id = mc.comunidad_id
            ORDER BY mc.fecha_union DESC`,
  },
  votos_usuarios: {
    name: 'votos_usuarios',
    label: 'Votos',
    description: 'Votos emitidos sobre publicaciones',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT v.*, u.username, p.titulo AS publicacion_titulo
            FROM votos_usuarios v
            LEFT JOIN users u ON u.id = v.usuario_id
            LEFT JOIN publicaciones p ON p.id = v.publicacion_id
            ORDER BY v.fecha_creacion DESC`,
  },
  usuarios_seguidos: {
    name: 'usuarios_seguidos',
    label: 'Seguimientos',
    description: 'Relaciones de follow entre usuarios',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT us.*, seguidor.username AS seguidor_username, seguido.username AS seguido_username
            FROM usuarios_seguidos us
            LEFT JOIN users seguidor ON seguidor.id = us.seguidor_id
            LEFT JOIN users seguido ON seguido.id = us.seguido_id
            ORDER BY us.fecha_creacion DESC`,
  },
  publicaciones_compartidas: {
    name: 'publicaciones_compartidas',
    label: 'Compartidos',
    description: 'Publicaciones compartidas por usuarios',
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    query: `SELECT pc.*, u.username, p.titulo AS publicacion_titulo
            FROM publicaciones_compartidas pc
            LEFT JOIN users u ON u.id = pc.usuario_id
            LEFT JOIN publicaciones p ON p.id = pc.publicacion_id
            ORDER BY pc.fecha_creacion DESC`,
  },
};

function toResourceSummary(resource) {
  const { query, ...summary } = resource;
  return summary;
}

export const AdminModel = {
  listResources() {
    return Object.values(RESOURCES).map(toResourceSummary);
  },

  hasResource(resourceName) {
    return Boolean(RESOURCES[resourceName]);
  },

  async findAll(resourceName) {
    const resource = RESOURCES[resourceName];
    if (!resource) return null;

    const [rows] = await pool.query(resource.query);
    return rows;
  },
};
