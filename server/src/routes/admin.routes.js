import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Restrict all routes in this router to authenticated ADMIN users
router.use(authenticate, authorize('ADMIN'));

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'admin-authorized' });
});

export default router;

