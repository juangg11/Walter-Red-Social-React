import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware, asyncHandler(requireAdmin));
router.get('/resources', adminController.resources);
router.get('/:resource', asyncHandler(adminController.list));

export default router;
