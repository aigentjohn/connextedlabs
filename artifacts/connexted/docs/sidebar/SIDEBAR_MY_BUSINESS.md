# Sidebar Section: My Business
## Testing Notes

The MY BUSINESS section in the sidebar (`MyBusinessSection.tsx`) expands to show: All Companies, My Ventures, My Companies, and Company Companions.
**Date:** 2026-04-28 21:21:04

---

### My Companies (`/my-companies`)

**Component:** `src/app/components/markets/MyCompaniesPage.tsx`

**What it does:** Lists all companies the current user owns or belongs to as a member. Owned companies are shown first with an "Owner" badge; member companies follow with a "Member" badge. Each card shows the company logo, name, tagline, industry, and action buttons for Profile, Companion, and Manage.

**Data loaded:**
- `market_companies` — `id, name, slug, tagline, logo_url, industry, owner_user_id` filtered by `owner_user_id = userId`
- `company_members` — `company_id` filtered by `user_id = userId` (for member companies)
- `market_companies` — second query for non-owned member company IDs
- `company_companion_items` — `company_id` for all company IDs (to compute companion item counts)

**User actions:**
- Navigate to company profile (`/markets/companies/:slug`)
- Navigate to company companion page (`/markets/companies/:slug/companion`)
- Navigate to company management / edit page (`/markets/edit-company/:id`)
- Navigate to "Browse All" companies (`/markets/all-companies`)
- Navigate to "My Ventures" (`/my-ventures`) — linked from empty state

**Tabs / sub-views:** None (flat list).

**Known issues / gaps:**
- No search or sort within the page.

---

### Company Profile (`/markets/companies/:slug`)

**Component:** `src/app/components/markets/CompanyProfilePage.tsx`

**What it does:** Full company profile. Shows a cover image banner, company logo (overlapping the banner), name, stage badge, tagline, industry, location, founded year, inline earned badges, and an "Founded by" owner attribution. Three tabs cover the company overview, its product/service offerings, and a news feed.

**Data loaded:**
- `market_companies` — single row by slug
- `users` — owner profile (`id, name, email, avatar, bio`)
- `market_offerings` — `id, name, slug, tagline, logo_url, offering_type, pricing_model, is_active, created_at` filtered by `company_id`
- `company_news` — single row by `company_id` (gets the news container ID)
- `posts` — last 5 posts filtered by `company_news_id`
- `badge_assignments` (via `useCompanyBadges` hook) — company's earned badges
- `badge_types` (via `useBadgeTypes` hook) — all badge types (for "Available to Earn" section shown to owner)

**User actions:**
- Visit company website (external link)
- Navigate to the company's companion page (`/markets/companies/:slug/companion`)
- Navigate to manage/edit the company (`/markets/edit-company/:id`) — owner and platform admins only
- Add an offering (`/markets/create-offering?companyId=:id`) — owner only
- View / Edit individual offerings
- Navigate to full news page (`/markets/companies/:slug/news`)

**Tabs / sub-views:**
| Tab | Content |
|---|---|
| Overview | About text, company details grid (industry, stage, location, size, founded), badges earned + available to earn (owner only) |
| Offerings | Grid of offering cards with type/pricing badges; Add Offering button for owner |
| News | Last 5 company news posts with like counts; link to full news page |

**Known issues / gaps:**
- The news tab fetches `company_news` with `.single()`, which will throw if a company has no news container record yet — the error is caught at the top-level try/catch but results in news posts simply being empty with no distinct error state.
- The "Available to Earn" badges section is only shown to the company owner, not to platform admins who might want to award badges.
- Confirm how the number of circles a user has is defined and if it is hardcoded or in platform admin.
- Identify the routes where a company can be created.
- Review the relationship of user tier with the premium tier related to business.
