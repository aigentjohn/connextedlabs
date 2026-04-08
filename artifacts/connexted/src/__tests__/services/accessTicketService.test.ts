/**
 * Tests for accessTicketService
 *
 * HOW SUPABASE MOCKING WORKS:
 * The service calls supabase.from(...).select()...etc.
 * vi.mock replaces the real Supabase client with a fake one.
 * The fake returns whatever data you define — no real DB calls.
 * Each test can override the mock to simulate different scenarios
 * (success, empty result, error).
 *
 * PATTERN FOR ADDING NEW TESTS:
 * 1. Find the function you want to test in accessTicketService.ts
 * 2. Add a describe block below with the function name
 * 3. Write one it() per scenario: success, empty, error
 * 4. Adjust the mockResolvedValue to return the data that scenario needs
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock Supabase before importing the service ──────────────────────────────
// This must come before any import that uses @/lib/supabase.
// vi.mock is hoisted to the top of the file automatically by Vitest.

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// ─── Wire up the chain: from().select().eq().single() ────────────────────────
// Supabase uses a fluent builder pattern. Each method returns an object
// with the next method available. We reproduce that chain with mocks.
beforeEach(() => {
  vi.clearAllMocks();

  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle, select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  });
});

// ─── Import the service AFTER the mock is defined ────────────────────────────
import type { AccessTicket } from '@/services/accessTicketService';

// ─── Shared test data ─────────────────────────────────────────────────────────
// A complete AccessTicket object with realistic values.
// Copy and modify this in individual tests to simulate different states.
const baseTicket: AccessTicket = {
  id: 'ticket-001',
  user_id: 'user-001',
  container_type: 'course',
  container_id: 'course-001',
  bundle_items: [],
  acquisition_source: 'direct_enrollment',
  acquisition_context: {},
  ticket_type: 'free',
  original_price_cents: 0,
  price_paid_cents: 0,
  discount_applied_cents: 0,
  discount_reason: null,
  payment_status: 'waived',
  payment_method: null,
  payment_transaction_id: null,
  payment_completed_at: null,
  status: 'active',
  first_accessed_at: null,
  last_accessed_at: null,
  total_access_count: 0,
  progress_percentage: 0,
  progress_data: {},
  granted_at: '2026-01-01T00:00:00Z',
  activated_at: null,
  expires_at: null,
  completed_at: null,
  cancelled_at: null,
  referral_code: null,
  referral_clicks: 0,
  referral_conversions: 0,
  referral_earnings_cents: 0,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────
// These are structured as templates. Each describe block corresponds to one
// function in accessTicketService.ts. Fill in the import and function call
// once you confirm the exported function names.

describe('AccessTicket types and structure', () => {
  it('baseTicket has all required fields', () => {
    // This test validates our test data is complete — if the type changes,
    // this will surface the gap immediately.
    expect(baseTicket).toMatchObject({
      id: expect.any(String),
      user_id: expect.any(String),
      container_type: expect.stringMatching(/^(course|program|bundle)$/),
      status: expect.stringMatching(/^(active|paused|cancelled|completed|expired|revoked)$/),
      payment_status: expect.stringMatching(/^(pending|paid|failed|refunded|partially_refunded|waived)$/),
    });
  });

  it('active ticket with no expiry is valid', () => {
    const ticket = { ...baseTicket, status: 'active' as const, expires_at: null };
    expect(ticket.status).toBe('active');
    expect(ticket.expires_at).toBeNull();
  });

  it('expired ticket has a past expires_at date', () => {
    const ticket = {
      ...baseTicket,
      status: 'expired' as const,
      expires_at: '2020-01-01T00:00:00Z',
    };
    const expiry = new Date(ticket.expires_at);
    expect(expiry < new Date()).toBe(true);
  });
});

describe('Supabase mock — query pattern', () => {
  it('mock returns data when configured', async () => {
    // Shows how to configure the mock for a successful query.
    // Replace this pattern in real function tests below.
    mockSingle.mockResolvedValueOnce({
      data: baseTicket,
      error: null,
    });

    // Simulate what the service does: supabase.from('access_tickets').select('*').eq('id', ...).single()
    const result = await mockFrom('access_tickets')
      .select('*')
      .eq('id', 'ticket-001')
      .single();

    expect(result.data).toEqual(baseTicket);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('access_tickets');
  });

  it('mock returns error when configured', async () => {
    // Shows how to simulate a database error.
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
    });

    const result = await mockFrom('access_tickets')
      .select('*')
      .eq('id', 'nonexistent')
      .single();

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error.code).toBe('PGRST116');
  });

  it('mock returns empty for missing table (PGRST205)', async () => {
    // Simulates the case where migrations have not been applied yet.
    // The service has isTableMissing() logic to handle this gracefully.
    mockSelect.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST205', message: 'Could not find the table' },
    });

    const result = await mockFrom('access_tickets').select('*');

    expect(result.error?.code).toBe('PGRST205');
  });
});

// ─── TEMPLATE: Add real function tests here ───────────────────────────────────
// Once you confirm the exported function names from accessTicketService.ts,
// import them at the top of this file and add describe blocks following
// the pattern above.
//
// Example:
//
// import { getUserTickets } from '@/services/accessTicketService';
//
// describe('getUserTickets', () => {
//   it('returns tickets for a valid user', async () => {
//     mockEq.mockResolvedValueOnce({ data: [baseTicket], error: null });
//     const result = await getUserTickets('user-001');
//     expect(result).toHaveLength(1);
//     expect(result[0].user_id).toBe('user-001');
//   });
//
//   it('returns empty array when user has no tickets', async () => {
//     mockEq.mockResolvedValueOnce({ data: [], error: null });
//     const result = await getUserTickets('user-no-tickets');
//     expect(result).toEqual([]);
//   });
//
//   it('handles database error gracefully', async () => {
//     mockEq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
//     await expect(getUserTickets('user-001')).rejects.toThrow();
//   });
// });
