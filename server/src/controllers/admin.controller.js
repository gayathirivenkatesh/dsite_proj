import { adminService } from '../services/admin.service.js';

export const adminController = {
  async listUsers(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await adminService.listUsers({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async setUserStatus(req, res, next) {
    try {
      const { isDisabled } = req.body;
      const user = await adminService.setUserDisabled({
        targetUserId: req.params.id,
        isDisabled,
        adminUserId: req.user.id,
      });
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  },

  async listAllFiles(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await adminService.listAllFiles({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search,
      });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async deleteFile(req, res, next) {
    try {
      const result = await adminService.deleteAnyFile({ fileId: req.params.id });
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },

  async revokeLink(req, res, next) {
    try {
      const link = await adminService.revokeAnyLink({ linkId: req.params.id });
      return res.json({ link });
    } catch (err) {
      return next(err);
    }
  },
};
