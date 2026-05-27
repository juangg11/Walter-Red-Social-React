import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import jwt from 'jsonwebtoken';

import { WebSocketServer } from 'ws';
import swaggerUi from 'swagger-ui-express';

import { notFoundHandler, errorHandler } from './middleware/error.js';
import { securityMiddleware } from './middleware/security.js';

import authRoutes from './routes/auth.js';
import comunidadesRoutes from './routes/comunidades.js';
import publicacionesRoutes from './routes/publicaciones.js';
import comentariosRoutes from './routes/comentarios.js';
import notificacionesRoutes from './routes/notificaciones.js';
import usuariosRoutes from './routes/usuarios.js';
import chatRoutes from './routes/chat.js';
import mediaRoutes from './routes/media.js';

import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const socketsByUser = new Map();

const swaggerFile = JSON.parse(
  fs.readFileSync('./swagger-output.json', 'utf8')
);

function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/(?=(\/+))\1$/, '');
}

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const envAllowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins.map(normalizeOrigin),
    ...envAllowedOrigins,
  ]),
];

const devOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const vercelPreviewPattern =
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

app.use(
  cors({
    origin(origin, callback) {
      const normalized = normalizeOrigin(origin);

      if (
        !origin ||
        allowedOrigins.includes(normalized) ||
        devOriginPattern.test(normalized) ||
        vercelPreviewPattern.test(normalized)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(`Not allowed by CORS: ${normalized}`)
      );
    },
  })
);

app.use(securityMiddleware);

app.use(express.json());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerFile)
);

app.use('/api/auth', authRoutes);
app.use('/api/comunidades', comunidadesRoutes);
app.use('/api/publicaciones', publicacionesRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/media', mediaRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      db: 'connected',
    });
  } catch (e) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: e.message,
    });
  }
});

app.use(notFoundHandler);

app.use(errorHandler);

const wss = new WebSocketServer({
  server,
  path: '/ws',
});

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    const token = url.searchParams.get('token');

    const user = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    ws.userId = user.id;

    if (!socketsByUser.has(user.id)) {
      socketsByUser.set(user.id, new Set());
    }

    socketsByUser.get(user.id).add(ws);

    ws.on('close', () => {
      const sockets = socketsByUser.get(user.id);

      sockets?.delete(ws);

      if (sockets?.size === 0) {
        socketsByUser.delete(user.id);
      }
    });
  } catch {
    ws.close();
  }
});

app.set(
  'broadcastChatMessage',
  async (message, recipients = []) => {
    for (const userId of recipients) {
      const sockets = socketsByUser.get(userId);

      if (!sockets) continue;

      for (const socket of sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'chat:message',
              message,
            })
          );
        }
      }
    }
  }
);

server.listen(PORT, () => {
  console.log(
    `Servidor corriendo en el puerto ${PORT}`
  );

  console.log(
    `Swagger disponible en http://localhost:${PORT}/api-docs`
  );
});