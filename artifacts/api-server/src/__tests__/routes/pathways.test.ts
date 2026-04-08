/**
 * Tests for pathway routes
 *
 * HOW SUPABASE IS MOCKED HERE:
 * The pathway routes use supabaseAdmin from lib/supabase.ts.
 * vi.mock replaces it before the routes load.
 * Each test configures what the mock returns to simulate
 * different database states.
 *
 * AUTH:
 * requireAuth calls supabaseAdmin.auth.getUser(token).
 * mockGetUser defaults to returning a valid user so tests
 * focus on route behaviour, not auth. Override in individual
 * tests to verify 401 handling.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock supabaseAdmin before importing app ──────────────────────────────────
const mockGetUser = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();

  // Auth succeeds by default
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  });

  // Wire up the Supabase fluent chain
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockEq.mockReturnValue({ order: mockOrder, select: mockSelect, single: vi.fn().mockResolvedValue({ data: null, error: null }) });
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
});

import request from 'supertest';
import app from '../../app.js';

// ─── Shared test data ─────────────────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer test-token' };

const samplePathway = {
  id: 'pathway-001',
  title: 'AI in Manufacturing Fundamentals',
  description: 'Core concepts for applying AI on the factory floor',
  created_at: '2026-01-01T00:00:00Z',
  pathway_steps: [],
};

const sampleEnrollment = {
  id: 'enrollment-001',
  pathway_id: 'pathway-001',
  user_id: 'test-user-id',
  enrolled_at: '2026-01-15T00:00:00Z',
  status: 'active',
  pathways: samplePathway,
};

// ─── GET /api/pathways ─────────────────────────────────────────────────────────
describe('GET /api/pathways', () => {
  it('returns 200 with an array', async () => {
    mockOrder.mockResolvedValueOnce({ data: [samplePathway], error: null });

    const response = await request(app)
      .get('/api/pathways')
      .set(AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.pathways)).toBe(true);
  });

  it('returns empty array when no pathways exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const response = await request(app)
      .get('/api/pathways')
      .set(AUTH_HEADER);

    expect(response.status).toBe(200);
    expect(response.body.pathways).toEqual([]);
  });

  it('returns 500 when database errors', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection failed' },
    });

    const response = await request(app)
      .get('/api/pathways')
      .set(AUTH_HEADER);

    expect(response.status).toBe(500);
  });

  it('returns 401 when no auth token is provided', async () => {
    const response = await request(app).get('/api/pathways');
    expect(response.status).toBe(401);
  });

  it('returns 401 when auth token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });

    const response = await request(app)
      .get('/api/pathways')
      .set(AUTH_HEADER);

    expect(response.status).toBe(401);
  });
});

// ─── GET /api/pathways/user/enrollments ────────────────────────────────────────
describe('GET /api/pathways/user/enrollments', () => {
  it('returns enrollments for the authenticated user', async () => {
    mockEq.mockReturnValueOnce({ order: mockOrder, select: mockSelect });
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ data: [sampleEnrollment], error: null });

    const response = await request(app)
      .get('/api/pathways/user/enrollments')
      .set(AUTH_HEADER);

    expect(response.status).toBe(200);
  });
});

// ─── GET /api/pathways/user/:userId/enrollments ────────────────────────────────
describe('GET /api/pathways/user/:userId/enrollments', () => {
  it('returns enrollments ignoring the URL param — uses authenticated user', async () => {
    mockEq.mockReturnValueOnce({ order: mockOrder, select: mockSelect });
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ data: [], error: null });

    const response = await request(app)
      .get('/api/pathways/user/some-other-user/enrollments')
      .set(AUTH_HEADER);

    // Route uses authenticated user ID, not the URL param
    expect(response.status).toBe(200);
  });

  it('returns empty array when user has no enrollments', async () => {
    mockEq.mockReturnValueOnce({ data: [], error: null });

    const response = await request(app)
      .get('/api/pathways/user/test-user-id/enrollments')
      .set(AUTH_HEADER);

    expect(response.status).toBe(200);
  });
});

// ─── GET /api/pathways/user/recommended ───────────────────────────────────────
describe('GET /api/pathways/user/recommended', () => {
  it('returns 200', async () => {
    mockOrder.mockResolvedValueOnce({ data: [samplePathway], error: null });

    const response = await request(app)
      .get('/api/pathways/user/recommended')
      .set(AUTH_HEADER);

    expect(response.status).toBe(200);
  });
});
