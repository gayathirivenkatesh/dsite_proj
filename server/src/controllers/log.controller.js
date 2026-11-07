import { accessLogService } from '../services/accessLog.service.js';

export const logController = {
  async getFileLogs(req, res, next) {
    try {
      const { page, limit, outcome } = req.query;
      const result = await accessLogService.listFileLogs({
        fileId: req.params.id,
        ownerId: req.user.id,
        outcome,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async getLinkLogs(req, res, next) {
    try {
      const { page, limit, outcome } = req.query;
      const result = await accessLogService.listLinkLogs({
        linkId: req.params.id,
        ownerId: req.user.id,
        outcome,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async getAllLogs(req, res, next) {
    try {
      const { page, limit, outcome, fileId, linkId } = req.query;
      const result = await accessLogService.listAllLogs({
        outcome,
        fileId,
        linkId,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },
};
