import { fileService } from '../services/file.service.js';
import { BadRequestError } from '../utils/errors.js';

export const fileController = {
  async upload(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError(
          'No file provided in form-data field "file"',
          [],
          'FILE_REQUIRED'
        );
      }

      const file = await fileService.uploadFile({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        ownerId: req.user.id,
        size: req.file.size,
      });

      res.status(201).json({
        file,
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;

      const result = await fileService.listFiles({
        ownerId: req.user.id,
        page,
        limit,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const file = await fileService.getFile({
        fileId: req.params.id,
        ownerId: req.user.id,
      });

      res.status(200).json({
        file,
      });
    } catch (err) {
      next(err);
    }
  },

  async rename(req, res, next) {
    try {
      const file = await fileService.renameFile({
        fileId: req.params.id,
        ownerId: req.user.id,
        newName: req.body.name,
      });

      res.status(200).json({
        file,
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await fileService.deleteFile({
        fileId: req.params.id,
        ownerId: req.user.id,
      });

      res.status(200).json({
        message: 'File successfully deleted',
      });
    } catch (err) {
      next(err);
    }
  },

  async download(req, res, next) {
    try {
      const { file, stream } = await fileService.getDownloadStream({
        fileId: req.params.id,
        ownerId: req.user.id,
      });

      // Escape quotes and encode for RFC 5987 / UTF-8 compatibility
      const asciiFallback = file.originalName.replace(/["\\]/g, '_');
      const utf8Encoded = encodeURIComponent(file.originalName);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
};
