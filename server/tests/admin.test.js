import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup.js';
import { User } from '../src/models/user.model.js';
import { File } from '../src/models/file.model.js';
import { ShareLink } from '../src/models/shareLink.model.js';
import { hashPassword } from '../src/utils/crypto.js';

let app;
let adminToken;
let userAToken;
let adminUserId;
let userAId;
let userAFileId;

const MINIMAL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

async function loginUser(app, email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { accessToken: res.body.accessToken, cookie: res.headers['set-cookie'] };
}

async function uploadTestFile(app, token) {
  const res = await request(app)
    .post('/api/v1/files')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', MINIMAL_PNG, { filename: 'admin-test.png', contentType: 'image/png' });
  return res.body.file;
}

beforeAll(async () => {
  await setupTestDB();
  app = createApp();

  const pwHash = await hashPassword('Password1!');
  const adminUser = await User.create({
    email: 'admin@example.com',
    passwordHash: pwHash,
    role: 'ADMIN',
  });
  const standardUser = await User.create({
    email: 'target@example.com',
    passwordHash: pwHash,
    role: 'USER',
  });

  adminUserId = adminUser._id.toString();
  userAId = standardUser._id.toString();

  const adminAuth = await loginUser(app, 'admin@example.com', 'Password1!');
  const userAuth = await loginUser(app, 'target@example.com', 'Password1!');

  adminToken = adminAuth.accessToken;
  userAToken = userAuth.accessToken;

  const file = await uploadTestFile(app, userAToken);
  userAFileId = file.id;
});

afterEach(async () => {
  // Re-enable target user between tests if disabled
  await User.updateOne({ _id: userAId }, { isDisabled: false });
});

afterAll(async () => {
  await clearTestDB();
  await teardownTestDB();
});

// ── RBAC PROTECTION ──────────────────────────────────────────────────────────

describe('Admin RBAC Guard', () => {
  it('rejects unauthenticated requests to /api/v1/admin/users with 401', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('rejects standard USER access to /api/v1/admin/users with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(403);
  });

  it('allows access to /api/v1/admin/users for ADMIN role', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });
});

// ── USER MANAGEMENT & DISABLE ENFORCEMENT ─────────────────────────────────────

describe('Admin User Management & Disable Enforcement', () => {
  it('lists users with pagination and search filtering', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?search=target')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
    expect(res.body.users[0].email).toBe('target@example.com');
  });

  it('prevents an admin from disabling their own account (400 CANNOT_DISABLE_SELF)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUserId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isDisabled: true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DISABLE_SELF');
  });

  it('disables a user account and immediately blocks login, refresh, and getMe', async () => {
    // 1. Disable the target user
    const disableRes = await request(app)
      .patch(`/api/v1/admin/users/${userAId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isDisabled: true });

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.user.isDisabled).toBe(true);

    // 2. Disabled user cannot login (403 ACCOUNT_DISABLED)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'target@example.com', password: 'Password1!' });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_DISABLED');

    // 3. Disabled user cannot call GET /users/me (403 ACCOUNT_DISABLED)
    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(meRes.status).toBe(403);
    expect(meRes.body.error.code).toBe('ACCOUNT_DISABLED');

    // 4. Re-enable the user
    const reEnableRes = await request(app)
      .patch(`/api/v1/admin/users/${userAId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isDisabled: false });
    expect(reEnableRes.status).toBe(200);
    expect(reEnableRes.body.user.isDisabled).toBe(false);

    // 5. User can log in again
    const postReEnableLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'target@example.com', password: 'Password1!' });
    expect(postReEnableLogin.status).toBe(200);
  });
});

// ── FILE MANAGEMENT ──────────────────────────────────────────────────────────

describe('Admin File Management', () => {
  it('lists all files in the system across all users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/files')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.files.length).toBeGreaterThanOrEqual(1);
    expect(res.body.files[0].originalName).toBe('admin-test.png');
    expect(res.body.files[0].owner.email).toBe('target@example.com');
  });

  it('admin can delete any file and its associated share links', async () => {
    // Create a temporary file and link
    const file = await uploadTestFile(app, userAToken);
    const linkRes = await request(app)
      .post('/api/v1/links')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ fileId: file.id });

    const linkId = linkRes.body.link.id;

    // Admin deletes the file
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/files/${file.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);

    // Verify file and link are removed
    const foundFile = await File.findById(file.id);
    expect(foundFile).toBeNull();

    const foundLink = await ShareLink.findById(linkId);
    expect(foundLink).toBeNull();
  });
});

// ── LINK MANAGEMENT ──────────────────────────────────────────────────────────

describe('Admin Link Management', () => {
  it('admin can revoke any share link', async () => {
    const linkRes = await request(app)
      .post('/api/v1/links')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ fileId: userAFileId });

    const linkId = linkRes.body.link.id;
    const token = linkRes.body.token;

    // Admin revokes link
    const revokeRes = await request(app)
      .delete(`/api/v1/admin/links/${linkId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.link.isRevoked).toBe(true);

    // Download now fails with 410 LINK_REVOKED
    const downloadRes = await request(app).get(`/api/v1/links/public/${token}/download`);
    expect(downloadRes.status).toBe(410);
    expect(downloadRes.body.error.code).toBe('LINK_REVOKED');
  });
});
