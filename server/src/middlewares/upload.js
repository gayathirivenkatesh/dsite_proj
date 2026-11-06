import multer from 'multer';
import { config } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

export const singleFileUpload = (fieldName = 'file') => {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new BadRequestError(
              `File exceeds maximum allowed size of ${Math.round(config.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`,
              [],
              'FILE_TOO_LARGE'
            )
          );
        }
        return next(new BadRequestError(err.message, [], 'UPLOAD_ERROR'));
      }
      next();
    });
  };
};

