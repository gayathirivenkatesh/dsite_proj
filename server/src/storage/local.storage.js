import fs from 'fs';
import path from 'path';
import { BaseStorage } from './base.storage.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class LocalStorageDriver extends BaseStorage {
  constructor(baseDir = config.UPLOAD_DIR) {
    super();
    this.baseDir = path.resolve(process.cwd(), baseDir);
    // Ensure upload directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Safely resolves key against baseDir, preventing path traversal attacks.
   */
  resolveSafePath(key) {
    if (!key || typeof key !== 'string') {
      throw new BadRequestError('Invalid storage key', [], 'INVALID_STORAGE_KEY');
    }

    const safeKey = path.basename(key);
    const resolvedPath = path.resolve(this.baseDir, safeKey);

    // Strictly ensure resolved path stays within base directory
    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new BadRequestError('Path traversal attempt detected', [], 'PATH_TRAVERSAL_DETECTED');
    }

    return resolvedPath;
  }

  async save({ key, buffer }) {
    const targetPath = this.resolveSafePath(key);
    await fs.promises.writeFile(targetPath, buffer);
    return key;
  }

  async getStream(key) {
    const targetPath = this.resolveSafePath(key);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError('File not found in storage', [], 'FILE_NOT_FOUND');
    }
    return fs.createReadStream(targetPath);
  }

  async delete(key) {
    try {
      const targetPath = this.resolveSafePath(key);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async exists(key) {
    try {
      const targetPath = this.resolveSafePath(key);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }
}

