import { Router } from 'express';
import { linkController } from '../controllers/link.controller.js';
import { logController } from '../controllers/log.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  createLinkSchema,
  unlockLinkSchema,
  listLinksQuerySchema,
} from '../validators/link.validator.js';
import { listLogsQuerySchema } from '../validators/log.validator.js';

const router = Router();

// ── Owner routes (authentication required) ────────────────────────────────────
router.post('/', authenticate, validateRequest(createLinkSchema), linkController.create);
router.get('/', authenticate, validateRequest(listLinksQuerySchema, 'query'), linkController.list);
router.get(
  '/:id/logs',
  authenticate,
  validateRequest(listLogsQuerySchema, 'query'),
  logController.getLinkLogs
);
router.delete('/:id', authenticate, linkController.revoke);

// ── Public routes (no authentication) ────────────────────────────────────────
router.get('/public/:token', linkController.getPublicMetadata);
router.post('/public/:token/unlock', validateRequest(unlockLinkSchema), linkController.unlock);
router.get('/public/:token/download', linkController.download);
router.post('/public/:token/download', linkController.download);

export default router;
