import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    name: 'Secure File Vault API',
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
