import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sanitizeInput } from '../src/middlewares/sanitize.js';

describe('Server Foundation Smoke Tests', () => {
  const app = createApp();

  it('GET / returns 200 with service info and status ok', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('name', 'Secure File Vault API');
  });

  it('GET /health returns 200 with status ok and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('verifies security headers and disabled X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('handles unmatched routes with standard 404 error shape', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Route not found'),
        details: [],
      },
    });
  });

  it('sanitizes malicious NoSQL query keys starting with $ or containing dots', () => {
    const req = {
      body: {
        username: 'alice',
        $where: 'malicious_code',
        'nested.key': 'attack',
        safeNested: {
          $gt: 0,
          valid: true,
        },
      },
      query: {
        $ne: 'admin',
        filter: 'active',
      },
      params: {},
    };

    sanitizeInput(req, {}, () => {});

    expect(req.body).toEqual({
      username: 'alice',
      safeNested: {
        valid: true,
      },
    });
    expect(req.body.$where).toBeUndefined();
    expect(req.body['nested.key']).toBeUndefined();
    expect(req.body.safeNested.$gt).toBeUndefined();
    expect(req.query).toEqual({
      filter: 'active',
    });
    expect(req.query.$ne).toBeUndefined();
  });
});
