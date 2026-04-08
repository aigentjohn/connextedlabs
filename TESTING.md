# Testing Guide

---

## Overview

The test suite uses **Vitest** throughout — for both the React frontend and the Express API server. Zero tests existed before this infrastructure was added. The current suite provides a foundation and clear patterns for expansion.

| Package | Test runner | Environment | Location |
|---|---|---|---|
| `@workspace/connexted` | Vitest | jsdom (simulated browser) | `artifacts/connexted/src/__tests__/` |
| `@workspace/api-server` | Vitest + Supertest | Node | `artifacts/api-server/src/__tests__/` |

---

## Running Tests

```bash
# Run all tests across both packages
pnpm -r run test

# Run only frontend tests
pnpm --filter @workspace/connexted run test

# Run only API tests
pnpm --filter @workspace/api-server run test

# Watch mode — re-runs affected tests on every file save
pnpm --filter @workspace/connexted run test:watch

# Coverage report — shows which lines of code are tested
pnpm --filter @workspace/connexted run test:coverage
pnpm --filter @workspace/api-server run test:coverage
```

Coverage reports are generated as HTML in `artifacts/connexted/coverage/` and `artifacts/api-server/coverage/`. Open `index.html` in a browser to see line-by-line coverage.

---

## Folder Structure

```
artifacts/
  connexted/
    vitest.config.ts                        ← Vitest config: jsdom, @/ alias, coverage scope
    src/
      __tests__/
        setup.ts                            ← Loads jest-dom matchers before each test
        services/
          accessTicketService.test.ts       ← Access control, ticket validation
        hooks/
          (add hook tests here)
        components/
          (add component tests here — only for critical flows)

  api-server/
    vitest.config.ts                        ← Vitest config: node environment, coverage scope
    src/
      __tests__/
        setup.ts                            ← Sets env vars so Supabase client initialises
        routes/
          health.test.ts                    ← GET /api/healthz
          pathways.test.ts                  ← Pathway route tests
          (add route tests here)
```

---

## How to Add a Service Test

Services are the highest priority for testing — they contain the core business logic.

**Step 1 — Create the file**

`artifacts/connexted/src/__tests__/services/yourServiceName.test.ts`

**Step 2 — Mock Supabase at the top**

Every service imports `supabase` from `@/lib/supabase`. Replace it before the service loads:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must be before any import that uses @/lib/supabase
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Wire up the Supabase fluent chain
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle, select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
  mockFrom.mockReturnValue({ select: mockSelect });
});
```

**Step 3 — Import the function under test**

```typescript
import { yourFunction } from '@/services/yourServiceName';
```

**Step 4 — Write tests following this pattern**

```typescript
describe('yourFunction', () => {
  it('returns expected result on success', async () => {
    // Configure the mock to return success data
    mockSingle.mockResolvedValueOnce({
      data: { id: '123', status: 'active' },
      error: null,
    });

    const result = await yourFunction('123');

    expect(result).toMatchObject({ id: '123' });
  });

  it('returns null when record does not exist', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await yourFunction('nonexistent');

    expect(result).toBeNull();
  });

  it('throws when database errors', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection failed', code: 'PGRST000' },
    });

    await expect(yourFunction('123')).rejects.toThrow();
  });
});
```

---

## How to Add an API Route Test

**Step 1 — Create the file**

`artifacts/api-server/src/__tests__/routes/yourRoute.test.ts`

**Step 2 — Mock the Supabase admin client**

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({ select: mockSelect });
});
```

**Step 3 — Import Supertest and the app**

```typescript
import request from 'supertest';
import app from '../../app.js';
```

**Step 4 — Write tests**

```typescript
describe('GET /api/your-route', () => {
  it('returns 200 with expected shape', async () => {
    mockSelect.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

    const response = await request(app).get('/api/your-route');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns 500 when database errors', async () => {
    mockSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });

    const response = await request(app).get('/api/your-route');

    expect(response.status).toBe(500);
  });
});
```

---

## What to Test and What to Skip

**Test these:**
- All service functions (business logic, access control rules, state transitions)
- All API routes (status codes, response shapes, error handling)
- Custom hooks with complex state logic (`useProgramMembership`, `useJourneyCompletion`)

**Skip these:**
- Simple presentational components (a card that displays data has no logic to test)
- Generated code in `lib/api-zod/` and `lib/api-client-react/`
- Utility functions that are wrappers around native APIs

**Coverage targets:**
- `src/services/` — aim for 80%+ coverage
- `src/routes/` in api-server — aim for 80%+ coverage
- `src/hooks/` — aim for 60%+ coverage on complex hooks

---

## Current Test Coverage

| File | Tests | What's covered |
|---|---|---|
| `accessTicketService.test.ts` | 6 | Type structure, Supabase mock patterns, error cases |
| `health.test.ts` | 3 | Status 200, JSON response, content type |
| `pathways.test.ts` | 7 | GET pathways list, enrollments, recommended — success and error cases |

**Total: 16 tests.** The service tests are patterns and mocks — extend them with real function calls once you confirm exported function names from each service file.

---

## Three-Step Rule for Each New Feature

Before marking any feature complete:

1. `pnpm run typecheck` — no TypeScript errors
2. `pnpm -r run test` — all tests pass
3. `pnpm run build` — production build succeeds

If any of these fail, the feature is not done.
