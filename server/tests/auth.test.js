import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup.js';
import { User } from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/crypto.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Auth & RBAC Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDB();
    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Registration & Input Validation', () => {
    it('successfully registers a user with valid email and password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({
        email: 'alice@example.com',
        role: 'USER',
      });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.refreshTokens).toBeUndefined();

      // Ensure httpOnly refresh cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('successfully registers a user with optional name, email, and password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Bob Builder',
        email: 'bob@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        name: 'Bob Builder',
        email: 'bob@example.com',
        role: 'USER',
      });
    });

    it('rejects registration with invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.path === 'email')).toBe(true);
    });

    it('rejects registration with password shorter than 8 characters', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'alice@example.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.path === 'password')).toBe(true);
    });

    it('prevents mass-assignment: rejects extra fields like role in body', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'attacker@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 conflict when registering with existing email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'existing@example.com',
        password: 'Password123!',
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'existing@example.com',
        password: 'AnotherPassword123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('Login & Generic Error Responses', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'user@example.com',
        password: 'Password123!',
      });
    });

    it('logs in successfully with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('user@example.com');
      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    });

    it('returns generic error on wrong password without disclosing specifics', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'user@example.com',
        password: 'IncorrectPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns identical generic error for non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('Token Expiry, Rotation & Server-Side Revocation', () => {
    it('allows access to GET /users/me with valid Bearer token', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send({
        email: 'profile@example.com',
        password: 'Password123!',
      });

      const token = reg.body.accessToken;

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('profile@example.com');
      expect(res.body.user.role).toBe('USER');
    });

    it('rejects access to GET /users/me with invalid or malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rotates refresh token and issues new access token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send({
        email: 'rotate@example.com',
        password: 'Password123!',
      });

      const cookieHeader = loginRes.headers['set-cookie'];
      const rawCookie = cookieHeader.find((c) => c.startsWith('refreshToken='));
      const tokenValue = rawCookie.split(';')[0];

      // Refresh token request
      const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', tokenValue);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');

      const newCookies = refreshRes.headers['set-cookie'];
      expect(newCookies).toBeDefined();

      // Token reuse defense: old refresh token must be rejected
      const reuseRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', tokenValue);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('revokes refresh token on logout', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send({
        email: 'logout@example.com',
        password: 'Password123!',
      });

      const cookieHeader = loginRes.headers['set-cookie'];
      const rawCookie = cookieHeader.find((c) => c.startsWith('refreshToken='));
      const tokenValue = rawCookie.split(';')[0];

      // Logout
      const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', tokenValue);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Successfully logged out');

      // Subsequent refresh must fail because token was revoked server-side
      const refreshAfterLogout = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', tokenValue);

      expect(refreshAfterLogout.status).toBe(401);
      expect(refreshAfterLogout.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('RBAC & Role-Based Authorization', () => {
    it('returns 403 Forbidden when a standard USER tries to access ADMIN endpoint', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send({
        email: 'standard@example.com',
        password: 'Password123!',
      });

      const userToken = reg.body.accessToken;

      const res = await request(app)
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toBe('You do not have permission to perform this action');
    });

    it('allows access to ADMIN endpoint when role is ADMIN', async () => {
      const passwordHash = await hashPassword('AdminPass123!');
      const admin = await User.create({
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
      });

      const adminToken = generateAccessToken({
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      });

      const res = await request(app)
        .get('/api/v1/admin/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('admin-authorized');
    });

    it('returns 401 Unauthorized when no token is provided to protected route', async () => {
      const res = await request(app).get('/api/v1/admin/health');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
