import { AccessLog } from '../models/accessLog.model.js';
import { File } from '../models/file.model.js';
import { ShareLink } from '../models/shareLink.model.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const accessLogService = {
  /**
   * Record an access attempt.
   * CRITICAL: Logging must NEVER throw into the request flow and NEVER store secrets.
   */
  async record({ outcome, ip, userAgent, linkId = null, fileId = null, ownerId = null }) {
    try {
      const normalizedOutcome = outcome ? String(outcome).toLowerCase() : 'unknown';
      await AccessLog.create({
        outcome: normalizedOutcome,
        ip: ip || 'unknown',
        userAgent: userAgent || null,
        linkId: linkId || null,
        fileId: fileId || null,
        owner: ownerId || null,
        timestamp: new Date(),
      });
    } catch (err) {
      // Must never crash or break user request flow
      logger.warn('Failed to record access log', { error: err.message, outcome });
    }
  },

  /**
   * List access logs for a specific file (owner-scoped).
   */
  async listFileLogs({ fileId, ownerId, outcome, page = 1, limit = 20 }) {
    // Owner check: verify file belongs to owner
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    const query = { fileId: file._id };
    if (outcome) {
      query.outcome = String(outcome).toLowerCase();
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AccessLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * List access logs for a specific share link (owner-scoped).
   */
  async listLinkLogs({ linkId, ownerId, outcome, page = 1, limit = 20 }) {
    // Owner check: verify link belongs to owner
    const link = await ShareLink.findOne({ _id: linkId, owner: ownerId });
    if (!link) {
      throw new NotFoundError('Share link not found', [], 'NOT_FOUND');
    }

    const query = { linkId: link._id };
    if (outcome) {
      query.outcome = String(outcome).toLowerCase();
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AccessLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * List all access logs across the system (admin-scoped).
   */
  async listAllLogs({ outcome, fileId, linkId, page = 1, limit = 20 }) {
    const query = {};
    if (outcome) {
      query.outcome = String(outcome).toLowerCase();
    }
    if (fileId) {
      query.fileId = fileId;
    }
    if (linkId) {
      query.linkId = linkId;
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AccessLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },
};
