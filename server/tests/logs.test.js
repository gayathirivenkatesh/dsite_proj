import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup.js';
import { User } from '../src/models/user.model.js';
import { AccessLog } from '../src/models/accessLog.model.js';
import { ShareLink } from '../src/models/shareLink.model.js';
import { accessLogService } from '../src/services/accessLog.service.js';
import { hashPassword } from '../src/utils/crypto.js';

let app;
let userAToken;
let userBToken;
let adminToken;
let testFileId;

const MINIMAL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

async function loginUser(app, email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.accessToken;
}

async function uploadTestFile(app, token) {
  const res = await request(app)
    .post('/api/v1/files')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', MINIMAL_PNG, { filename: 'test-log.png', contentType: 'image/png' });
  return res.body.file;
}

async function createLink(app, token, fileId, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/links')
    .set('Authorization', `Bearer ${token}`)
    .send({ fileId, ...overrides });
  return res.body;
}

beforeAll(async () => {
  await setupTestDB();
  app = createApp();

  const pwHash = await hashPassword('Password1!');
  await User.create({ email: 'owner@example.com', passwordHash: pwHash, role: 'USER' });
  await User.create({ email: 'attacker@example.com', passwordHash: pwHash, role: 'USER' });
  await User.create({ email: 'admin@example.com', passwordHash: pwHash, role: 'ADMIN' });

  userAToken = await loginUser(app, 'owner@example.com', 'Password1!');
  userBToken = await loginUser(app, 'attacker@example.com', 'Password1!');
  adminToken = await loginUser(app, 'admin@example.com', 'Password1!');

  const file = await uploadTestFile(app, userAToken);
  testFileId = file.id;
});

afterEach(async () => {
  await AccessLog.deleteMany({});
  await ShareLink.deleteMany({});
});

afterAll(async () => {
  await clearTestDB();
  await teardownTestDB();
});

// ── LOG SERVICE & MODEL INTEGRITY ─────────────────────────────────────────────

describe('AccessLog Model & Service Integrity', () => {
  it('logging never throws into request flow even if database operation fails', async () => {
    // Calling with invalid types or null should not throw an unhandled exception
    await expect(
      accessLogService.record({ outcome: null, ip: null, userAgent: null })
    ).resolves.not.toThrow();
  });

  it('access logs never store passwords, tokens, or raw credentials', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId, {
      password: 'SuperSecretPassword123!',
    });

    // Attempt a download with correct password
    await request(app)
      .post(`/api/v1/links/public/${token}/download`)
      .send({ password: 'SuperSecretPassword123!' });

    const logs = await AccessLog.find({ linkId: link.id });
    expect(logs.length).toBeGreaterThan(0);

    for (const log of logs) {
      const json = log.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.passwordHash).toBeUndefined();
      expect(json.token).toBeUndefined();
      expect(json.rawToken).toBeUndefined();
      expect(json.tokenHash).toBeUndefined();
    }
  });
});

// ── RECORDING OF ALL ACCESS OUTCOMES ─────────────────────────────────────────

describe('Public Access Outcome Logging', () => {
  it('logs "success" outcome on successful download with IP and user-agent', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId);

    const res = await request(app)
      .get(`/api/v1/links/public/${token}/download`)
      .set('User-Agent', 'Custom-Agent/1.0');

    expect(res.status).toBe(200);

    const logs = await AccessLog.find({ linkId: link.id, outcome: 'success' });
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('success');
    expect(logs[0].userAgent).toBe('Custom-Agent/1.0');
    expect(logs[0].fileId.toString()).toBe(testFileId);
    expect(logs[0].timestamp).toBeDefined();
  });

  it('logs "wrong_password" outcome on failed password attempt', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId, {
      password: 'CorrectPassword!',
    });

    const res = await request(app)
      .post(`/api/v1/links/public/${token}/download`)
      .send({ password: 'WrongPassword!' });

    expect(res.status).toBe(401);

    const logs = await AccessLog.find({ linkId: link.id, outcome: 'wrong_password' });
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('wrong_password');
    expect(logs[0].fileId.toString()).toBe(testFileId);
  });

  it('logs "expired" outcome when accessing time-expired link', async () => {
    const past = new Date(Date.now() - 1000);
    const { link, token } = await createLink(app, userAToken, testFileId, {
      expiresAt: past.toISOString(),
    });

    const res = await request(app).get(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(410);

    const logs = await AccessLog.find({ linkId: link.id, outcome: 'expired' });
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('expired');
  });

  it('logs "exhausted" outcome when max downloads limit is reached', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId, {
      maxDownloads: 1,
    });

    // 1st download succeeds
    await request(app).get(`/api/v1/links/public/${token}/download`);

    // 2nd download fails (exhausted)
    const res = await request(app).get(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(410);

    const exhaustedLogs = await AccessLog.find({ linkId: link.id, outcome: 'exhausted' });
    expect(exhaustedLogs.length).toBe(1);
    expect(exhaustedLogs[0].outcome).toBe('exhausted');
  });

  it('logs "revoked" outcome when accessing revoked link', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId);

    // Revoke link
    await request(app)
      .delete(`/api/v1/links/${link.id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    const res = await request(app).get(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(410);

    const logs = await AccessLog.find({ linkId: link.id, outcome: 'revoked' });
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('revoked');
  });

  it('logs "not_found" outcome when accessing an unknown token', async () => {
    const res = await request(app).get('/api/v1/links/public/nonexistenttokendownload/download');
    expect(res.status).toBe(404);

    const logs = await AccessLog.find({ outcome: 'not_found' });
    expect(logs.length).toBe(1);
    expect(logs[0].outcome).toBe('not_found');
    expect(logs[0].linkId).toBeNull();
  });
});

// ── OWNER ENDPOINTS: FILE LOGS ───────────────────────────────────────────────

describe('GET /api/v1/files/:id/logs (Owner file logs)', () => {
  it('returns paginated logs for the owned file', async () => {
    const { token } = await createLink(app, userAToken, testFileId);

    // Generate 3 access events
    await request(app).get(`/api/v1/links/public/${token}/download`);
    await request(app).get(`/api/v1/links/public/${token}/download`);
    await request(app).get(`/api/v1/links/public/${token}/download`);

    const res = await request(app)
      .get(`/api/v1/files/${testFileId}/logs?page=1&limit=2`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.pages).toBe(2);
  });

  it('filters file logs by outcome', async () => {
    const { token } = await createLink(app, userAToken, testFileId, { password: 'pass' });

    // 1 failure (wrong password)
    await request(app).post(`/api/v1/links/public/${token}/download`).send({ password: 'wrong' });

    // 1 success
    await request(app).post(`/api/v1/links/public/${token}/download`).send({ password: 'pass' });

    const successRes = await request(app)
      .get(`/api/v1/files/${testFileId}/logs?outcome=success`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(successRes.status).toBe(200);
    expect(successRes.body.logs.length).toBe(1);
    expect(successRes.body.logs[0].outcome).toBe('success');

    const failureRes = await request(app)
      .get(`/api/v1/files/${testFileId}/logs?outcome=wrong_password`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(failureRes.status).toBe(200);
    expect(failureRes.body.logs.length).toBe(1);
    expect(failureRes.body.logs[0].outcome).toBe('wrong_password');
  });

  it('enforces owner-only access: User B cannot view User A file logs (IDOR -> 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${testFileId}/logs`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated request with 401', async () => {
    const res = await request(app).get(`/api/v1/files/${testFileId}/logs`);
    expect(res.status).toBe(401);
  });
});

// ── OWNER ENDPOINTS: LINK LOGS ───────────────────────────────────────────────

describe('GET /api/v1/links/:id/logs (Owner link logs)', () => {
  it('returns paginated logs for the owned link', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId);

    await request(app).get(`/api/v1/links/public/${token}/download`);
    await request(app).get(`/api/v1/links/public/${token}/download`);

    const res = await request(app)
      .get(`/api/v1/links/${link.id}/logs`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters link logs by outcome', async () => {
    const { link, token } = await createLink(app, userAToken, testFileId, { password: 'pass' });

    await request(app).post(`/api/v1/links/public/${token}/download`).send({ password: 'wrong' });
    await request(app).post(`/api/v1/links/public/${token}/download`).send({ password: 'pass' });

    const res = await request(app)
      .get(`/api/v1/links/${link.id}/logs?outcome=wrong_password`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(1);
    expect(res.body.logs[0].outcome).toBe('wrong_password');
  });

  it('enforces owner-only access: User B cannot view User A link logs (IDOR -> 404)', async () => {
    const { link } = await createLink(app, userAToken, testFileId);

    const res = await request(app)
      .get(`/api/v1/links/${link.id}/logs`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });
});

// ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

describe('GET /api/v1/admin/logs (Admin view all logs)', () => {
  it('standard user cannot access admin logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(403);
  });

  it('admin can view all system logs paginated', async () => {
    const { token } = await createLink(app, userAToken, testFileId);
    await request(app).get(`/api/v1/links/public/${token}/download`);

    const res = await request(app)
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });
});
