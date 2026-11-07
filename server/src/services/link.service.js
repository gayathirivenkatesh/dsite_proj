import { ShareLink } from '../models/shareLink.model.js';
import { File } from '../models/file.model.js';
import { storage } from '../storage/index.js';
import { hashToken, generateRandomToken, hashPassword, verifyPassword } from '../utils/crypto.js';
import {
  NotFoundError,
  GoneError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
} from '../utils/errors.js';

// Lockout configuration for failed password attempts
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1-hour rolling window

/**
 * Resolve a link by raw token, returning the full document (including internal fields).
 * Returns null if not found.
 */
async function findLinkByToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  return ShareLink.findOne({ tokenHash });
}

/**
 * Check whether the link is currently accessible:
 * - Not revoked
 * - Not time-expired
 * - Not download-count-exhausted
 * Throws GoneError with appropriate code if inaccessible, NotFoundError if not found.
 */
function assertLinkAccessible(link) {
  if (!link) {
    throw new NotFoundError('Share link not found', [], 'LINK_NOT_FOUND');
  }
  if (link.isRevoked) {
    throw new GoneError('This link has been revoked', [], 'LINK_REVOKED');
  }
  const now = new Date();
  if (link.expiresAt && link.expiresAt <= now) {
    throw new GoneError('This link has expired', [], 'LINK_EXPIRED');
  }
  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
    throw new GoneError('This link has been used up', [], 'LINK_EXHAUSTED');
  }
}

/**
 * Check IP-based lockout and increment failed attempt counter.
 * Throws TooManyRequestsError if the IP is currently locked out.
 */
async function checkAndRecordFailedAttempt(link, ip) {
  const now = new Date();

  const existing = link.failedAttempts.find((a) => a.ip === ip);

  if (existing) {
    // If locked out, enforce lockout
    if (existing.lockedUntil && existing.lockedUntil > now) {
      const remainingSecs = Math.ceil((existing.lockedUntil - now) / 1000);
      throw new TooManyRequestsError(
        `Too many failed attempts. Try again in ${remainingSecs} seconds.`,
        [],
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Reset if outside rolling window
    if (now - existing.lastAttempt > ATTEMPT_WINDOW_MS) {
      existing.count = 1;
      existing.lockedUntil = null;
    } else {
      existing.count += 1;
    }

    existing.lastAttempt = now;

    if (existing.count >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      existing.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    }
  } else {
    link.failedAttempts.push({
      ip,
      count: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
  }

  await link.save();
}

/**
 * Clear failed attempts for an IP after a successful unlock.
 */
async function clearFailedAttempts(link, ip) {
  link.failedAttempts = link.failedAttempts.filter((a) => a.ip !== ip);
  await link.save();
}

export const linkService = {
  async createLink({ ownerId, fileId, expiresAt, maxDownloads, password }) {
    // Verify the owner owns the target file (prevents creating links to other users' files)
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    const rawToken = generateRandomToken(40);
    const tokenHash = hashToken(rawToken);

    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const link = new ShareLink({
      tokenHash,
      file: file._id,
      owner: ownerId,
      expiresAt: expiresAt || null,
      maxDownloads: maxDownloads || null,
      passwordHash,
    });

    await link.save();

    // Return the raw token ONCE so the client can share it.
    // We never store it again.
    return { link, rawToken };
  },

  async listLinks({ ownerId, fileId, page = 1, limit = 20 }) {
    const query = { owner: ownerId };

    if (fileId) {
      // Confirm the file belongs to the owner before filtering by it
      const file = await File.findOne({ _id: fileId, owner: ownerId });
      if (!file) {
        throw new NotFoundError('File not found', [], 'NOT_FOUND');
      }
      query.file = fileId;
    }

    const skip = (page - 1) * limit;
    const [links, total] = await Promise.all([
      ShareLink.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ShareLink.countDocuments(query),
    ]);

    return {
      links,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async revokeLink({ linkId, ownerId }) {
    const link = await ShareLink.findOne({ _id: linkId, owner: ownerId });
    if (!link) {
      throw new NotFoundError('Share link not found', [], 'NOT_FOUND');
    }

    link.isRevoked = true;
    await link.save();

    return link;
  },

  // ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

  /**
   * Public metadata: returns link info but hides file details when password-protected.
   */
  async getPublicMetadata({ rawToken }) {
    const link = await findLinkByToken(rawToken);
    assertLinkAccessible(link);

    const isPasswordProtected = Boolean(link.passwordHash);

    const meta = {
      id: link._id.toString(),
      status: link.getStatus(),
      isPasswordProtected,
      expiresAt: link.expiresAt,
      maxDownloads: link.maxDownloads,
      // Only expose download count when not password-protected or count is public info
      downloadCount: link.downloadCount,
      createdAt: link.createdAt,
    };

    // Hide file metadata until password is verified
    if (!isPasswordProtected) {
      const file = await File.findById(link.file);
      if (file) {
        meta.file = {
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        };
      }
    }

    return meta;
  },

  /**
   * Unlock password-protected link. Returns file metadata on success.
   * Rate-limits and locks out per link+IP on repeated failures.
   */
  async unlockLink({ rawToken, password, ip }) {
    const link = await findLinkByToken(rawToken);
    assertLinkAccessible(link);

    if (!link.passwordHash) {
      throw new ForbiddenError('This link is not password-protected', [], 'NO_PASSWORD');
    }

    // Check lockout before verifying
    const now = new Date();
    const existing = link.failedAttempts.find((a) => a.ip === ip);
    if (existing?.lockedUntil && existing.lockedUntil > now) {
      const remainingSecs = Math.ceil((existing.lockedUntil - now) / 1000);
      throw new TooManyRequestsError(
        `Too many failed attempts. Try again in ${remainingSecs} seconds.`,
        [],
        'RATE_LIMIT_EXCEEDED'
      );
    }

    const isCorrect = await verifyPassword(link.passwordHash, password);

    if (!isCorrect) {
      await checkAndRecordFailedAttempt(link, ip);
      throw new UnauthorizedError('Incorrect password', [], 'WRONG_PASSWORD');
    }

    // Clear failed attempts on success
    await clearFailedAttempts(link, ip);

    const file = await File.findById(link.file);
    return {
      file: file
        ? {
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
          }
        : null,
    };
  },

  /**
   * Atomic download: uses a single conditional findOneAndUpdate with $inc so the last
   * allowed download under concurrent load is served exactly once.
   * Never performs a read-check-write pattern.
   */
  async downloadViaLink({ rawToken, password, ip }) {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    // Step 1: First confirm link exists and is not revoked/expired without touching the counter.
    const link = await ShareLink.findOne({ tokenHash });
    assertLinkAccessible(link);

    // Step 2: Check password if required (before consuming the download slot)
    if (link.passwordHash) {
      // Check lockout first
      const existing = link.failedAttempts.find((a) => a.ip === ip);
      if (existing?.lockedUntil && existing.lockedUntil > now) {
        const remainingSecs = Math.ceil((existing.lockedUntil - now) / 1000);
        throw new TooManyRequestsError(
          `Too many failed attempts. Try again in ${remainingSecs} seconds.`,
          [],
          'RATE_LIMIT_EXCEEDED'
        );
      }

      if (!password) {
        throw new UnauthorizedError(
          'This link requires a password. Use the unlock endpoint first.',
          [],
          'PASSWORD_REQUIRED'
        );
      }

      const isCorrect = await verifyPassword(link.passwordHash, password);
      if (!isCorrect) {
        await checkAndRecordFailedAttempt(link, ip);
        throw new UnauthorizedError('Incorrect password', [], 'WRONG_PASSWORD');
      }

      await clearFailedAttempts(link, ip);
    }

    // Step 3: Atomic conditional increment – the ONLY place the counter is updated.
    // Build the filter with $and so both $or conditions are enforced (JS objects cannot have
    // duplicate keys – two bare $or entries would silently drop the first one).
    const atomicFilter = {
      tokenHash,
      isRevoked: false,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }] },
      ],
    };

    const updated = await ShareLink.findOneAndUpdate(
      atomicFilter,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!updated) {
      // The link became invalid between the first check and atomic update (race condition lost)
      throw new GoneError('This link has been used up or is no longer valid', [], 'LINK_EXHAUSTED');
    }

    // Step 4: Stream the file
    const file = await File.findById(updated.file);
    if (!file) {
      throw new NotFoundError(
        'The file associated with this link no longer exists',
        [],
        'NOT_FOUND'
      );
    }

    const stream = await storage.getStream(file.storageKey);

    return { file, stream };
  },
};
