import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup.js';
import { User } from '../src/models/user.model.js';
import { ShareLink } from '../src/models/shareLink.model.js';
import { hashPassword } from '../src/utils/crypto.js';

let app;
let userAToken;
let userBToken;
let testFileId;

// A minimal valid PNG (1x1 pixel)
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
    .attach('file', MINIMAL_PNG, { filename: 'test.png', contentType: 'image/png' });
  return res.body.file;
}

beforeAll(async () => {
  await setupTestDB();
  app = createApp();

  // Create two users
  const pwHash = await hashPassword('Password1!');
  await User.create({ email: 'usera@example.com', passwordHash: pwHash, role: 'USER' });
  await User.create({ email: 'userb@example.com', passwordHash: pwHash, role: 'USER' });

  userAToken = await loginUser(app, 'usera@example.com', 'Password1!');
  userBToken = await loginUser(app, 'userb@example.com', 'Password1!');

  // Upload a file as User A
  const file = await uploadTestFile(app, userAToken);
  testFileId = file.id;
});

afterEach(async () => {
  // Remove all share links between tests to keep isolation
  await ShareLink.deleteMany({});
});

afterAll(async () => {
  await clearTestDB();
  await teardownTestDB();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createLink(overrides = {}) {
  const body = { fileId: testFileId, ...overrides };
  return request(app)
    .post('/api/v1/links')
    .set('Authorization', `Bearer ${userAToken}`)
    .send(body);
}

// ── CREATE LINK ───────────────────────────────────────────────────────────────

describe('POST /api/v1/links', () => {
  it('creates a link with no constraints and returns token once', async () => {
    const res = await createLink();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.link.status).toBe('ACTIVE');
    expect(res.body.link.tokenHash).toBeUndefined();
    expect(res.body.link.passwordHash).toBeUndefined();
  });

  it('creates a link with expiresAt', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const res = await createLink({ expiresAt: future.toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.link.expiresAt).toBeDefined();
  });

  it('creates a link with maxDownloads', async () => {
    const res = await createLink({ maxDownloads: 5 });
    expect(res.status).toBe(201);
    expect(res.body.link.maxDownloads).toBe(5);
  });

  it('creates a password-protected link (passwordHash not exposed)', async () => {
    const res = await createLink({ password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.link.isPasswordProtected).toBe(true);
    expect(res.body.link.passwordHash).toBeUndefined();
  });

  it('creates a link with all constraints combined', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const res = await createLink({ expiresAt: future.toISOString(), maxDownloads: 3, password: 'pass' });
    expect(res.status).toBe(201);
    expect(res.body.link.isPasswordProtected).toBe(true);
    expect(res.body.link.maxDownloads).toBe(3);
  });

  it('returns 404 when creating link for another user\'s file', async () => {
    const res = await request(app)
      .post('/api/v1/links')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ fileId: testFileId });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/v1/links').send({ fileId: testFileId });
    expect(res.status).toBe(401);
  });
});

// ── LIST LINKS ────────────────────────────────────────────────────────────────

describe('GET /api/v1/links', () => {
  it('lists own links with pagination', async () => {
    await createLink();
    await createLink();
    const res = await request(app)
      .get('/api/v1/links')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.links.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('User B cannot see User A\'s links', async () => {
    await createLink();
    const res = await request(app)
      .get('/api/v1/links')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.links.length).toBe(0);
  });

  it('filters by fileId', async () => {
    await createLink();
    const res = await request(app)
      .get(`/api/v1/links?fileId=${testFileId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.links.length).toBe(1);
  });
});

// ── REVOKE LINK ───────────────────────────────────────────────────────────────

describe('DELETE /api/v1/links/:id', () => {
  it('owner can revoke a link', async () => {
    const createRes = await createLink();
    const linkId = createRes.body.link.id;
    const res = await request(app)
      .delete(`/api/v1/links/${linkId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.link.isRevoked).toBe(true);
  });

  it('User B cannot revoke User A\'s link', async () => {
    const createRes = await createLink();
    const linkId = createRes.body.link.id;
    const res = await request(app)
      .delete(`/api/v1/links/${linkId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });
});

// ── PUBLIC METADATA ───────────────────────────────────────────────────────────

describe('GET /api/v1/links/public/:token', () => {
  it('returns metadata without file info when password-protected', async () => {
    const createRes = await createLink({ password: 'hidden' });
    const token = createRes.body.token;
    const res = await request(app).get(`/api/v1/links/public/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.isPasswordProtected).toBe(true);
    expect(res.body.file).toBeUndefined();
  });

  it('returns metadata with file info when not password-protected', async () => {
    const createRes = await createLink();
    const token = createRes.body.token;
    const res = await request(app).get(`/api/v1/links/public/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.isPasswordProtected).toBe(false);
    expect(res.body.file).toBeDefined();
    expect(res.body.file.originalName).toBe('test.png');
  });

  it('returns 404 for unknown token', async () => {
    const res = await request(app).get('/api/v1/links/public/unknowntoken123abc');
    expect(res.status).toBe(404);
  });
});

// ── UNLOCK ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/links/public/:token/unlock', () => {
  it('returns 403 for non-password-protected link', async () => {
    const createRes = await createLink();
    const token = createRes.body.token;
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/unlock`)
      .send({ password: 'anything' });
    expect(res.status).toBe(403);
  });

  it('returns 401 with WRONG_PASSWORD for incorrect password', async () => {
    const createRes = await createLink({ password: 'correct' });
    const token = createRes.body.token;
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/unlock`)
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
  });

  it('returns 200 and file info on correct password', async () => {
    const createRes = await createLink({ password: 'correct' });
    const token = createRes.body.token;
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/unlock`)
      .send({ password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.file).toBeDefined();
    expect(res.body.file.originalName).toBe('test.png');
  });

  it('locks out IP after 5 consecutive wrong passwords', async () => {
    const createRes = await createLink({ password: 'correct' });
    const token = createRes.body.token;

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/v1/links/public/${token}/unlock`)
        .set('X-Forwarded-For', '10.0.0.1')
        .send({ password: 'wrong' });
    }

    // 6th attempt should be locked out
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/unlock`)
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ password: 'wrong' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// ── DOWNLOAD VIA LINK ─────────────────────────────────────────────────────────

describe('POST /api/v1/links/public/:token/download', () => {
  it('downloads a file via a valid link', async () => {
    const createRes = await createLink();
    const token = createRes.body.token;
    const res = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 404 for unknown token', async () => {
    const res = await request(app).post('/api/v1/links/public/totallyunknowntoken/download');
    expect(res.status).toBe(404);
  });

  it('returns 410 LINK_REVOKED after revocation', async () => {
    const createRes = await createLink();
    const token = createRes.body.token;
    const linkId = createRes.body.link.id;

    await request(app)
      .delete(`/api/v1/links/${linkId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    const res = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('LINK_REVOKED');
  });

  it('returns 410 LINK_EXPIRED for time-expired link', async () => {
    const past = new Date(Date.now() - 1000);
    const createRes = await createLink({ expiresAt: past.toISOString() });
    const token = createRes.body.token;
    const res = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('LINK_EXPIRED');
  });

  it('returns 410 LINK_EXHAUSTED after max downloads reached', async () => {
    const createRes = await createLink({ maxDownloads: 1 });
    const token = createRes.body.token;

    // First download should succeed
    const first = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(first.status).toBe(200);

    // Second download should fail
    const second = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(second.status).toBe(410);
    expect(second.body.error.code).toBe('LINK_EXHAUSTED');
  });

  it('enforces both expiry constraints simultaneously', async () => {
    const future = new Date(Date.now() + 60 * 1000);
    const createRes = await createLink({ expiresAt: future.toISOString(), maxDownloads: 1 });
    const token = createRes.body.token;

    const first = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(first.status).toBe(200);

    const second = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(second.status).toBe(410);
  });

  it('returns 401 PASSWORD_REQUIRED when password not provided for protected link', async () => {
    const createRes = await createLink({ password: 'secret' });
    const token = createRes.body.token;
    const res = await request(app).post(`/api/v1/links/public/${token}/download`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('PASSWORD_REQUIRED');
  });

  it('returns 401 WRONG_PASSWORD for protected link with wrong password', async () => {
    const createRes = await createLink({ password: 'correct' });
    const token = createRes.body.token;
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/download`)
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
  });

  it('downloads successfully with correct password', async () => {
    const createRes = await createLink({ password: 'correct' });
    const token = createRes.body.token;
    const res = await request(app)
      .post(`/api/v1/links/public/${token}/download`)
      .send({ password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  // ── KEY CHALLENGE A: Concurrency test ─────────────────────────────────────
  it('allows exactly ONE download when maxDownloads=1 and 10 concurrent requests race', async () => {
    const createRes = await createLink({ maxDownloads: 1 });
    const token = createRes.body.token;

    // Fire 10 parallel requests simultaneously
    const requests = Array.from({ length: 10 }, () =>
      request(app).post(`/api/v1/links/public/${token}/download`)
    );
    const results = await Promise.allSettled(requests);

    const statuses = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value.status);

    const successes = statuses.filter((s) => s === 200).length;
    const failures = statuses.filter((s) => s === 410).length;

    expect(successes).toBe(1);
    expect(failures).toBe(9);
  }, 30000); // allow up to 30s for concurrent I/O
});
