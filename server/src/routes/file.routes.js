import { Router } from 'express';
import { fileController } from '../controllers/file.controller.js';
import { logController } from '../controllers/log.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { singleFileUpload } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate.js';
import { renameFileSchema, listFilesQuerySchema } from '../validators/file.validator.js';
import { listLogsQuerySchema } from '../validators/log.validator.js';

const router = Router();

// All file operations require authentication
router.use(authenticate);

router.post('/', singleFileUpload('file'), fileController.upload);

router.get('/', validateRequest(listFilesQuerySchema, 'query'), fileController.list);

router.get('/:id', fileController.getById);

router.patch('/:id', validateRequest(renameFileSchema), fileController.rename);

router.delete('/:id', fileController.delete);

router.get('/:id/download', fileController.download);

router.get('/:id/logs', validateRequest(listLogsQuerySchema, 'query'), logController.getFileLogs);

export default router;
