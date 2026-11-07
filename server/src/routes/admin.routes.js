import { Router } from 'express';
import { logController } from '../controllers/log.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { listLogsQuerySchema } from '../validators/log.validator.js';

const router = Router();

// Restrict all routes in this router to authenticated ADMIN users
router.use(authenticate, authorize('ADMIN'));

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'admin-authorized' });
});

router.get('/logs', validateRequest(listLogsQuerySchema, 'query'), logController.getAllLogs);

export default router;
