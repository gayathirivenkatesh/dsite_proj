import crypto from 'crypto';
import { File } from '../models/file.model.js';
import { storage } from '../storage/index.js';
import { sanitizeFilename, validateFileType } from '../utils/fileValidation.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const fileService = {
  async uploadFile({ buffer, originalName, ownerId, size }) {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestError('No file uploaded or file is empty', [], 'EMPTY_FILE');
    }

    // Step 1: Validate file extension AND magic bytes against allowlist
    const { detectedMime, extension } = await validateFileType(buffer, originalName);

    // Step 2: Sanitize original filename for safe storage as metadata
    const cleanOriginalName = sanitizeFilename(originalName);

    // Step 3: Generate a cryptographically random filename outside public access
    const randomKey = `${crypto.randomBytes(24).toString('hex')}${extension}`;

    // Step 4: Save file buffer using storage driver
    await storage.save({
      key: randomKey,
      buffer,
      mimeType: detectedMime,
    });

    // Step 5: Create owner-scoped database record
    const file = new File({
      originalName: cleanOriginalName,
      storageKey: randomKey,
      mimeType: detectedMime,
      size: size || buffer.length,
      owner: ownerId,
    });

    await file.save();

    return file;
  },

  async listFiles({ ownerId, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      File.find({ owner: ownerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      File.countDocuments({ owner: ownerId }),
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

  async getFile({ fileId, ownerId }) {
    // Owner-scoped query to strictly prevent IDOR
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }
    return file;
  },

  async renameFile({ fileId, ownerId, newName }) {
    const cleanName = sanitizeFilename(newName);
    if (!cleanName || cleanName === 'unnamed_file') {
      throw new BadRequestError('Invalid file name', [], 'INVALID_FILENAME');
    }

    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    file.originalName = cleanName;
    await file.save();

    return file;
  },

  async deleteFile({ fileId, ownerId }) {
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    // Remove underlying file from storage driver
    await storage.delete(file.storageKey);

    // Remove file record from DB
    await File.deleteOne({ _id: fileId });

    return { success: true };
  },

  async getDownloadStream({ fileId, ownerId }) {
    const file = await File.findOne({ _id: fileId, owner: ownerId });
    if (!file) {
      throw new NotFoundError('File not found', [], 'NOT_FOUND');
    }

    const stream = await storage.getStream(file.storageKey);
    return {
      file,
      stream,
    };
  },
};
