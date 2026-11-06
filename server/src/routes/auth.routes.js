import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, validateRequest(registerSchema), authController.register);

router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);

router.post('/refresh', authRateLimiter, authController.refresh);

router.post('/logout', authController.logout);

export default router;
