/**
 * Base interface / abstract class for storage drivers.
 * Allows seamless switching between LocalStorageDriver (disk) and cloud providers (e.g. S3).
 */
export class BaseStorage {
  /**
   * Save a file buffer to storage.
   * @param {Object} options
   * @param {string} options.key - Unique storage key/filename
   * @param {Buffer} options.buffer - File buffer
   * @param {string} options.mimeType - MIME type
   * @returns {Promise<string>} Returns storage key
   */
  async save({ key: _key, buffer: _buffer, mimeType: _mimeType }) {
    throw new Error('save() must be implemented by storage driver');
  }

  /**
   * Retrieve a readable stream for the file.
   * @param {string} _key - Storage key
   * @returns {Promise<import('stream').Readable>}
   */
  async getStream(_key) {
    throw new Error('getStream() must be implemented by storage driver');
  }

  /**
   * Delete a file from storage.
   * @param {string} _key - Storage key
   * @returns {Promise<boolean>}
   */
  async delete(_key) {
    throw new Error('delete() must be implemented by storage driver');
  }

  /**
   * Check if a file exists in storage.
   * @param {string} _key - Storage key
   * @returns {Promise<boolean>}
   */
  async exists(_key) {
    throw new Error('exists() must be implemented by storage driver');
  }
}
