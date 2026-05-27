import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', authRateLimit, asyncHandler(authController.register));
router.post('/login', authRateLimit, asyncHandler(authController.login));
router.get('/check-username', asyncHandler(authController.checkUsername));

export default router;