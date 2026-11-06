import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError } from './errors.js';

// Allowed MIME types mapped to their permitted file extensions
export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  // Archives
  'application/zip': ['.zip'],
  // Plain Text & Data formats
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
};

// All allowed extensions flattened for quick lookup
const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_FILE_TYPES).flat());

/**
 * Sanitize user-provided filename:
 * - Strips directory traversal components and path separators
 * - Strips null bytes and non-printable control characters
 * - Trims leading/trailing spaces and periods
 * - Enforces safe max length
 */
export function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') {
    return 'unnamed_file';
  }

  // Remove path separators and null/control characters
  let clean = originalName
    .replace(/[/\\]/g, '')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || (code >= 127 && code <= 159));
    })
    .join('')
    .trim();

  // Remove leading/trailing dots to avoid hidden files or extension tricks
  clean = clean.replace(/^\.+|\.+$/g, '').trim();

  // Truncate to maximum safe length (200 characters)
  if (clean.length > 200) {
    const ext = path.extname(clean);
    const base = path.basename(clean, ext).slice(0, 200 - ext.length);
    clean = `${base}${ext}`;
  }

  return clean || 'unnamed_file';
}

/**
 * Validate file extension AND magic bytes against allowlist.
 * Prevents file extension spoofing and disguised executables.
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<{ detectedMime: string, extension: string }>}
 */
export async function validateFileType(buffer, originalName) {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('Uploaded file is empty', [], 'EMPTY_FILE');
  }

  const ext = path.extname(originalName).toLowerCase();

  // Step 1: Check extension allowlist
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestError(
      `File extension '${ext}' is not permitted. Allowed extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
      [],
      'DISALLOWED_FILE_TYPE'
    );
  }

  // Step 2: Detect magic bytes using file-type
  const detected = await fileTypeFromBuffer(buffer);

  // Handle text-based formats (plain text, CSV, JSON) which have no binary magic header
  if (!detected) {
    if (ext === '.txt' || ext === '.csv' || ext === '.json') {
      // Check for binary null bytes: text files must not contain 0x00 bytes
      for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
        if (buffer[i] === 0x00) {
          throw new BadRequestError(
            'Binary executable content detected in text file',
            [],
            'INVALID_FILE_TYPE'
          );
        }
      }

      if (ext === '.json') {
        try {
          JSON.parse(buffer.toString('utf8'));
          return { detectedMime: 'application/json', extension: '.json' };
        } catch {
          throw new BadRequestError('Invalid JSON content', [], 'INVALID_FILE_CONTENT');
        }
      }

      return {
        detectedMime: ext === '.csv' ? 'text/csv' : 'text/plain',
        extension: ext,
      };
    }

    // Binary file without recognized magic header matching allowed types
    throw new BadRequestError(
      'File contents do not match any recognized allowed file format',
      [],
      'INVALID_FILE_TYPE'
    );
  }

  // Step 3: Verify detected binary MIME matches the extension
  const permittedExtensions = ALLOWED_FILE_TYPES[detected.mime];
  if (!permittedExtensions || !permittedExtensions.includes(ext)) {
    throw new BadRequestError(
      `File content detected as '${detected.mime}', which does not match extension '${ext}'`,
      [],
      'MIMETYPE_EXTENSION_MISMATCH'
    );
  }

  return {
    detectedMime: detected.mime,
    extension: ext,
  };
}
