/**
 * Tests for GET /api/healthz
 *
 * Supertest calls the Express app directly — no server needs to be running.
 * Import the app, pass it to request(), call the route, check the response.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('GET /api/healthz', () => {
  it('returns 200', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.status).toBe(200);
  });

  it('returns a status field in the response body', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.body).toHaveProperty('status');
  });

  it('returns JSON content type', async () => {
    const response = await request(app).get('/api/healthz');
    expect(response.headers['content-type']).toMatch(/json/);
  });
});
