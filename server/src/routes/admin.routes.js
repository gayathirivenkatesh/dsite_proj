import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { logController } from '../controllers/log.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  listUsersQuerySchema,
  setUserStatusSchema,
  listAllFilesQuerySchema,
} from '../validators/admin.validator.js';
import { listLogsQuerySchema } from '../validators/log.validator.js';

const router = Router();

// Restrict all routes in this router to authenticated ADMIN users
router.use(authenticate, authorize('ADMIN'));

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'admin-authorized' });
});

// ── User management ──────────────────────────────────────────────────────────
router.get('/users', validateRequest(listUsersQuerySchema, 'query'), adminController.listUsers);
router.patch(
  '/users/:id/disable',
  validateRequest(setUserStatusSchema),
  adminController.setUserStatus
);
router.patch(
  '/users/:id/status',
  validateRequest(setUserStatusSchema),
  adminController.setUserStatus
);

// ── File & Link management ───────────────────────────────────────────────────
router.get(
  '/files',
  validateRequest(listAllFilesQuerySchema, 'query'),
  adminController.listAllFiles
);
router.delete('/files/:id', adminController.deleteFile);
router.delete('/links/:id', adminController.revokeLink);

// ── Audit logs ───────────────────────────────────────────────────────────────
router.get('/logs', validateRequest(listLogsQuerySchema, 'query'), logController.getAllLogs);

export default router;
