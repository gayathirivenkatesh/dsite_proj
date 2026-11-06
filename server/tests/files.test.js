import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import { createApp } from '../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup.js';
import { storage } from '../src/storage/index.js';
import { sanitizeFilename } from '../src/utils/fileValidation.js';

// Minimal valid PNG buffer (PNG header + IHDR chunk)
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89,
]);

// Minimal valid PDF buffer
const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\n');

// Valid text buffer
const VALID_TXT_BUFFER = Buffer.from('Plain text contents for secure vault storage.');

describe('Files & Storage Integration Tests', () => {
  let app;
  let userAToken;
  let userBToken;

  beforeAll(async () => {
    await setupTestDB();
    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      email: 'usera@example.com',
      password: 'Password123!',
    });
    userAToken = resA.body.accessToken;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      email: 'userb@example.com',
      password: 'Password123!',
    });
    userBToken = resB.body.accessToken;
  });

  describe('File Upload & Validation', () => {
    it('successfully uploads a valid PNG file with random stored name', async () => {
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_PNG_BUFFER, 'vacation_photo.png');

      expect(res.status).toBe(201);
      expect(res.body.file).toHaveProperty('id');
      expect(res.body.file.originalName).toBe('vacation_photo.png');
      expect(res.body.file.mimeType).toBe('image/png');
      expect(res.body.file.size).toBe(VALID_PNG_BUFFER.length);

      // Internal storageKey must not be leaked to the client
      expect(res.body.file.storageKey).toBeUndefined();
    });

    it('successfully uploads a valid PDF document', async () => {
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_PDF_BUFFER, 'contract.pdf');

      expect(res.status).toBe(201);
      expect(res.body.file.mimeType).toBe('application/pdf');
    });

    it('successfully uploads a valid plain text file', async () => {
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_TXT_BUFFER, 'notes.txt');

      expect(res.status).toBe(201);
      expect(res.body.file.mimeType).toBe('text/plain');
    });

    it('rejects upload with disallowed file extension (e.g. .exe)', async () => {
      const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', fakeExeBuffer, 'installer.exe');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DISALLOWED_FILE_TYPE');
    });

    it('rejects file when magic bytes do not match the extension (spoofing attempt)', async () => {
      // Named as .png but contains random text, not PNG magic bytes
      const fakePngBuffer = Buffer.from('NOT A REAL PNG FILE HEADER');
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', fakePngBuffer, 'fake_image.png');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects upload without file attachment', async () => {
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_REQUIRED');
    });

    it('sanitizes malicious filenames containing path traversal characters', async () => {
      // Test filename sanitization utility directly
      expect(sanitizeFilename('../../../../etc/shadow.txt')).toBe('etcshadow.txt');
      expect(sanitizeFilename('file\0with\0nulls.txt')).toBe('filewithnulls.txt');
      expect(sanitizeFilename('....hidden.txt....')).toBe('hidden.txt');

      // Test upload stripping path traversal
      const res = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_TXT_BUFFER, '../../../../etc/shadow.txt');

      expect(res.status).toBe(201);
      expect(res.body.file.originalName).not.toContain('/');
      expect(res.body.file.originalName).not.toContain('\\');
      expect(res.body.file.originalName).not.toContain('..');
    });
  });

  describe('File Management (List, Get, Rename, Delete)', () => {
    let fileAId;

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_PNG_BUFFER, 'document.png');

      fileAId = uploadRes.body.file.id;
    });

    it('lists files owned by current user with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/files?page=1&limit=10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].id).toBe(fileAId);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      });
    });

    it('gets metadata for owned file', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.file.id).toBe(fileAId);
      expect(res.body.file.originalName).toBe('document.png');
    });

    it('renames an owned file successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'renamed_document.png' });

      expect(res.status).toBe(200);
      expect(res.body.file.originalName).toBe('renamed_document.png');

      // Verify update persisted
      const getRes = await request(app)
        .get(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.body.file.originalName).toBe('renamed_document.png');
    });

    it('deletes an owned file and removes underlying storage', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('File successfully deleted');

      // Subsequent get must return 404
      const getRes = await request(app)
        .get(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Download & Security Headers', () => {
    it('streams file download with attachment disposition and nosniff', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_PNG_BUFFER, 'report.png');

      const fileId = uploadRes.body.file.id;

      const res = await request(app)
        .get(`/api/v1/files/${fileId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-disposition']).toContain('attachment; filename="report.png"');
      expect(Buffer.compare(res.body, VALID_PNG_BUFFER)).toBe(0);
    });
  });

  describe('IDOR Security: User B cannot access User A files', () => {
    let fileAId;

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post('/api/v1/files')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', VALID_PNG_BUFFER, 'confidential_a.png');

      fileAId = uploadRes.body.file.id;
    });

    it('User B cannot see User A files in file listing', async () => {
      const res = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.files).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('User B cannot retrieve User A file metadata (IDOR -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User B cannot download User A file (IDOR -> 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAId}/download`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User B cannot rename User A file (IDOR -> 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'hijacked.png' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('User B cannot delete User A file (IDOR -> 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Ensure file still exists for User A
      const verifyRes = await request(app)
        .get(`/api/v1/files/${fileAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(verifyRes.status).toBe(200);
    });
  });

  describe('Storage Driver Path Traversal Prevention', () => {
    it('blocks path traversal attempts in resolveSafePath', () => {
      expect(() => {
        storage.resolveSafePath('../../windows/system32/cmd.exe');
      }).not.toThrow(); // basename extracts cmd.exe and prevents traversing up

      const resolved = storage.resolveSafePath('../../secret.txt');
      expect(resolved.startsWith(storage.baseDir)).toBe(true);
      expect(path.basename(resolved)).toBe('secret.txt');
    });
  });
});
