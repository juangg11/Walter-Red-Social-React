import { Router } from 'express';
import { comentariosController } from '../controllers/comentarios.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(comentariosController.getByPublicacion));
router.post('/', authMiddleware, asyncHandler(comentariosController.create));
router.delete('/:id', authMiddleware, asyncHandler(comentariosController.remove));

export default router;
