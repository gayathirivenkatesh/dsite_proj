import { linkService } from '../services/link.service.js';

export const linkController = {
  async create(req, res, next) {
    try {
      const { fileId, expiresAt, maxDownloads, password } = req.body;
      const { link, rawToken } = await linkService.createLink({
        ownerId: req.user.id,
        fileId,
        expiresAt,
        maxDownloads,
        password,
      });
      return res.status(201).json({ link, token: rawToken });
    } catch (err) {
      return next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { page, limit, fileId } = req.query;
      const result = await linkService.listLinks({
        ownerId: req.user.id,
        fileId,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async revoke(req, res, next) {
    try {
      const link = await linkService.revokeLink({
        linkId: req.params.id,
        ownerId: req.user.id,
      });
      return res.json({ link });
    } catch (err) {
      return next(err);
    }
  },

  async getPublicMetadata(req, res, next) {
    try {
      const meta = await linkService.getPublicMetadata({
        rawToken: req.params.token,
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      });
      return res.json({ link: meta, ...meta });
    } catch (err) {
      return next(err);
    }
  },

  async unlock(req, res, next) {
    try {
      const { password } = req.body;
      const ip = req.ip;
      const userAgent = req.get('user-agent') || null;
      const result = await linkService.unlockLink({
        rawToken: req.params.token,
        password,
        ip,
        userAgent,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async download(req, res, next) {
    try {
      const ip = req.ip;
      const userAgent = req.get('user-agent') || null;
      // Password may be supplied in body for password-protected links
      const password = req.body?.password ?? null;
      const { file, stream } = await linkService.downloadViaLink({
        rawToken: req.params.token,
        password,
        ip,
        userAgent,
      });

      const encoded = encodeURIComponent(file.originalName);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`
      );
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      stream.pipe(res);
    } catch (err) {
      return next(err);
    }
  },
};
