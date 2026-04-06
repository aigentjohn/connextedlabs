# Membership Tier & Ticketing Roadmap

## Overview

This document outlines what is currently built, what is partially built, and what needs to be completed to fully enforce membership tiers for courses and programs, and to close gaps in the ticketing and waitlist systems.

---

## Current State

### Membership Tiers

Tiers are stored on the `users` table as `membership_tier`:

| Tier | Meaning |
|---|---|
| `free` | Default for all new users |
| `member` | Mid-level paid subscription |
| `premium` | Full access tier |
| `unlimited` | Defined in constants but not used in UI |

**How tier is set today**: Manually only. The Membership page in My Account displays the user's current tier with a note that changes are processed by contacting support. There is no automated payment integration wired to tier upgrades or downgrades.

---

## Courses — What Is Built vs. What Is Missing

### What Is Built

Courses have a `pricing_type` field that controls enrollment behavior:

| `pricing_type` | Current behavior |
|---|---|
| `free` | Anyone can enroll — access ticket created immediately |
| `paid` | Redirects user to ConvertKit Commerce payment URL; ticket expected on payment webhook return |
| `members-only` | Shows a UI toast: *"This course is only available to premium members"* and blocks the enroll button |

### What Is Missing

1. **Server-side enforcement for `members-only` courses**
   - The `members-only` check is UI-only (a toast in `CourseLandingPage.tsx`).
   - The `accessTicketService` does not verify `membership_tier` before creating a ticket.
   - A user who bypasses the landing page UI could enroll without the required tier.
   - **Fix needed**: Add a `membership_tier` check inside `accessTicketService.createTicket()` for courses with `pricing_type === 'members-only'`, returning an error if the user's tier is `free`.

2. **No RLS enforcement for `members-only` courses**
   - The database has no row-level policy preventing enrollment if the user is `free`.
   - **Fix needed**: Either enforce at the service layer (above) or add a Postgres function/policy that validates tier before inserting an `access_ticket` for a `members-only` course.

3. **Upgrade prompt instead of a toast**
   - When a `free` user tries to enroll in a `members-only` course, they currently see a dismissible toast.
   - **Fix needed**: Replace the toast with a proper upgrade modal or page that explains the tier benefit and provides a path to upgrade.

4. **ConvertKit payment webhook not confirmed end-to-end**
   - The `paid` pricing type redirects to ConvertKit Commerce but the return webhook that creates the access ticket has not been verified to work in production.
   - **Fix needed**: End-to-end test the ConvertKit webhook → `accessTicketService.createTicket()` flow and confirm the ticket is created and the user gains access.

---

## Programs — What Is Built vs. What Is Missing

### What Is Built

Programs use a `visibility` field (`public`, `member`, `unlisted`, `private`) and an enrollment system based on `member_ids` and `access_tickets`. The `visibility: 'member'` setting means the user must be **enrolled** (in `member_ids` or have an active `access_ticket`) — it does **not** check `membership_tier`.

### What Is Missing

1. **No tier-based gating for programs**
   - Programs currently have no concept of a required membership tier for enrollment.
   - Any logged-in user (including `free` tier) can apply or enroll in any program regardless of its intended audience.
   - **Fix needed**:
     - Add a `required_tier` column to the `programs` table (values: `free`, `member`, `premium`).
     - Add a per-program setting in `ProgramSetupDashboard` so admins can set this.
     - In `ProgramLandingPage.tsx` and the enrollment/application flow, check `profile.membership_tier` against `program.required_tier` before showing the enroll/apply button.
     - If the user's tier is below the requirement, show an upgrade prompt instead.

2. **`visibility-access.ts` does not include programs**
   - The `VISIBILITY_RULES` map in `visibility-access.ts` defines `memberRequiresTier: true` for documents, events, posts, episodes, blogs, books, decks, and reviews — but **not** for programs or courses.
   - Programs currently fall through to the `default` rule (`memberRequiresTier: false`).
   - **Fix needed**: Once `required_tier` is added to programs, the gating should live in the enrollment flow rather than `visibility-access.ts` (since it's per-program, not platform-wide).

---

## Ticketing System — What Is Built vs. What Is Missing

### What Is Built

- `access_tickets` table — unified source of truth for enrollment across courses, programs, circles, and events.
- `ticket_inventory_items` table — individual seats per batch; status: `available`, `assigned`, `voided`.
- `WaitlistBlock` component — shown on course and program landing pages when a linked ticket template has no available inventory.
- Admin tools: `TicketInventoryAdmin` (batch creation, bulk fulfillment) and `WaitlistManager` (promoting applicants).
- `enrollmentBridge` — when an access ticket is created, it also updates legacy tables (`course_enrollments`, program `member_ids`) for backwards compatibility.

### What Is Missing

1. **`access_tickets` ON CONFLICT constraint is missing**
   - Error seen in browser console: `42P10 — there is no unique or exclusion constraint matching the ON CONFLICT specification`.
   - The upsert in `accessTicketService` uses `ON CONFLICT (user_id, container_id, container_type)` but the corresponding unique index does not exist on the table.
   - **Fix needed**: Add a unique index on `access_tickets (user_id, container_id, container_type)` in Supabase.

2. **Waitlist depends on an Edge Function**
   - The `WaitlistBlock` join and queue-position lookup go through the Edge Function at `/waitlist/*`.
   - If the Edge Function is unavailable or returns an error, the waitlist silently fails with no user feedback.
   - **Fix needed**: Add error handling in `WaitlistBlock` to show a fallback message when the Edge Function is unreachable, and consider migrating waitlist reads/writes to direct Supabase queries.

3. **No ticket template linking UI for admins**
   - For the `WaitlistBlock` to appear on a course or program landing page, a `TicketTemplate` must be linked to that container via `container_id` and `container_type`.
   - There is currently no in-context UI on `ProgramSetupDashboard` or the course admin pages that lets an admin create and link a ticket template without navigating to the standalone `TicketInventoryAdmin`.
   - **Fix needed**: Add a "Ticket & Waitlist" tab or section to `ProgramSetupDashboard` and the course admin setup page that allows admins to create a template and set inventory capacity inline.

4. **Program enrollment bridge needs end-to-end verification**
   - When a program access ticket is created, `enrollmentBridge.enrollInProgram` is supposed to also add the user to `member_ids` on the program.
   - This has not been verified end-to-end.
   - **Fix needed**: Confirm the bridge correctly updates `member_ids` on the `programs` table and that `ProgramPageRouter` recognizes the user as a member after ticket creation.

---

## Automated Tier Management — What Is Missing

The biggest foundational gap is that there is no automated way for users to change their membership tier.

**Fix needed (full flow)**:

1. Choose a payment provider (Stripe or ConvertKit Commerce are already partially integrated).
2. Create subscription products for `member` and `premium` tiers.
3. On successful subscription payment, update `users.membership_tier` via a webhook handler.
4. On cancellation or downgrade, revert the tier.
5. Wire the "Upgrade" CTA in `MembershipManagement.tsx` to the payment provider checkout.
6. Re-enable and complete the `MyPaymentsPage` (currently removed from navigation) to show billing history and active subscription.

---

## Priority Order (Suggested)

| Priority | Item |
|---|---|
| 1 | Fix `access_tickets` unique index (ON CONFLICT error) |
| 2 | Server-side enforcement for `members-only` courses |
| 3 | Automated tier upgrade/downgrade payment flow |
| 4 | `required_tier` field and gating for programs |
| 5 | Inline ticket template + inventory UI on program/course admin pages |
| 6 | Waitlist Edge Function fallback handling |
| 7 | End-to-end verification of ConvertKit webhook and enrollment bridge |
