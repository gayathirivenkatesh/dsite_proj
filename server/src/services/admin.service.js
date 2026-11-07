import { User } from '../models/user.model.js';
import { File } from '../models/file.model.js';
import { ShareLink } from '../models/shareLink.model.js';
import { storage } from '../storage/index.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export const adminService = {
  /**
   * List all users with pagination and optional email search.
   */
  async listUsers({ page = 1, limit = 20, search }) {
    const query = {};
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Enable or disable a user account.
   * If disabling, all active refresh tokens are immediately revoked.
   * Admins are prevented from disabling themselves.
   */
  async setUserDisabled({ targetUserId, isDisabled, adminUserId }) {
    if (targetUserId === adminUserId && isDisabled) {
      throw new BadRequestError(
        'You cannot disable your own admin account',
        [],
        'CANNOT_DISABLE_SELF'
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found', [], 'NOT_FOUND');
    }

    user.isDisabled = Boolean(isDisabled);

    // If disabled, immediately revoke all existing refresh tokens
    if (user.isDisabled) {
      user.refreshTokens = [];
    }

    await user.save();
    return user;
  },

  /**
   * List all files in the vault across all owners with pagination and optional search.
   */
  async listAllFiles({ page = 1, limit = 20, search }) {
    const query = {};
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [files, total] = await Promise.all([
      File.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', 'email'),
      File.countDocuments(query),
    ]);

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Permanently delete any file, its underlying storage, and all associated share links.
   */
  async deleteAnyFile({ fileId }) {
    const file = await File.findById(fileId);
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    // Delete stored binary
    await storage.delete(file.storageKey);

    // Clean up all share links created for this file
    await ShareLink.deleteMany({ file: file._id });

    // Remove file record
    await File.deleteOne({ _id: file._id });

    return { message: 'File and associated links deleted successfully' };
  },

  /**
   * Revoke any share link in the system.
   */
  async revokeAnyLink({ linkId }) {
    const link = await ShareLink.findById(linkId);
    if (!link) {
      throw new NotFoundError('Share link not found', [], 'NOT_FOUND');
    }

    link.isRevoked = true;
    await link.save();

    return link;
  },
};
