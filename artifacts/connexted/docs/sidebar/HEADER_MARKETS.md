# Feature: Markets

Markets is the platform's product and service directory. Community members create **Companies** (organizations) and publish **Offerings** (products, services, software, hardware, etc.) under those companies. Admins define named **Market** categories that serve as curated storefronts, then manually place offerings into those markets via a placement table. An optional **Kit Commerce** integration allows paid purchases of offerings using ConvertKit's commerce system, with automatic ticket issuance on purchase.

**Core data model:**
- `markets` — admin-defined categories (e.g., "Discovery Lab", "Launch Pad", "Marketplace")
- `market_companies` — company profiles; each owned by one user
- `market_offerings` — products/services owned by a user and optionally associated with a company
- `market_placements` — join table connecting offerings to markets (with `featured` flag)
- `company_companion_items` — curated content items attached to a company (pitches, documents, QR codes, etc.)
- `company_members` — additional users who can manage a company
- `market_inquiries` — contact-founder messages submitted from an offering profile
- `market_offering_views`, `market_offering_links`, `market_offering_media`, `market_offering_features` — supplementary offering data

---

## Markets Landing Page (`/markets`)

**File:** `src/app/components/MarketsPage.tsx`

**What it does:** Hero landing page for the Markets section. Shows all active, public market categories as cards, a global stat bar (total companies + total offerings), up to 6 featured offerings, and bottom CTAs to browse all offerings, all companies, and network companies.

**Data loaded:**
- `markets` table — active + public only, ordered by `display_order`
- `market_placements` — counts per market (active placements)
- `market_companies` — count of public companies (for stat bar)
- `market_placements` join `market_offerings` — up to 6 featured placements (`featured = true`)
- `market_companies` and `users` — for each featured offering's company/owner name

**User actions:**
- Search (redirects to `/markets/search?q=...`)
- Click a market card → navigates to `/markets/:slug`
- Click "List Your Product" → `/my-ventures`
- Click "Browse All Offerings" → `/markets/all-offerings`
- Click "All Companies" → `/markets/all-companies`
- Click "Network Companies" → `/markets/network-companies`

**Known issues / gaps:**
- The `/markets/search` route is referenced in the search handler but there is no `SearchPage` component visible in the codebase — the search feature appears unimplemented.
- Featured offerings section only shows up to 6 items; no controls to see more featured items.
- N+1 query pattern: offering counts and featured offering details are fetched in per-item `Promise.all` loops (no batching).

---

## Market Detail Page (`/markets/:marketType`)

**File:** `src/app/components/MarketDetailPage.tsx`

**What it does:** Shows all offerings placed in a specific market. Renders a colored header with market name/tagline/description, a search input, a type filter dropdown, and a grid of `OfferingCard` components.

**Data loaded:**
- `markets` — looks up by slug
- `market_placements` join `market_offerings` — active, public offerings in this market
- `market_companies` and `users` — company/owner name for each offering

**User actions:**
- Text search (client-side filter on name, tagline, company name)
- Type filter: All Types / Software/SaaS / Services / Physical Products / Digital Products / Hardware (client-side)
- Click offering card → `/markets/offerings/:slug`

**Known issues / gaps:**
- Market lookup and offering fetch are two separate Supabase calls on the same slug; could be consolidated.
- N+1 query pattern for company/owner resolution per offering.
- `console.log` debug statements are left in production code.

---

## Browse All Markets (`/markets/all-markets`)

**File:** `src/app/components/MarketsAllMarketsPage.tsx`

**What it does:** A legacy/alternate view that hardcodes three markets — "Discovery Lab" (discovery), "Launch Pad" (launch), and "Marketplace" (marketplace) — and shows their offerings grouped by those three hardcoded `market_type` string values. Shows up to 3 offerings per section with a "View all" link.

**Known issues / gaps:**
- This page uses an older hardcoded market model (`market_type` string enum: discovery/launch/marketplace) rather than the newer admin-configurable `markets` table. It reads `market_type` from `market_placements`, which may be a legacy column. This page appears to be superseded by the dynamic `MarketsPage` + `MarketDetailPage` pair and may be stale or unused.

---

## All Offerings (`/markets/all-offerings`)

**File:** `src/app/components/MarketsAllOfferingsPage.tsx`

**What it does:** Flat browse of every active, public offering across all markets. Includes text search and a "From My Network" toggle that filters to offerings owned by users the current user follows.

**Data loaded:**
- `market_offerings` — all active/public, newest first
- `market_placements` — to attach market_type labels to each offering
- `market_companies`, `users` — company/owner details per offering
- `user_connections` — current user's following list (for network filter)

**User actions:**
- Text search (client-side)
- Toggle "From My Network" to see only offerings from followed users

**Known issues / gaps:**
- N+1 query pattern: each offering makes 2–3 additional Supabase calls (placements, company, owner).
- The `market_types` field on `OfferingCard` is populated from `market_placements.market_type` (the legacy string field) rather than from the market name in the `markets` table.

---

## All Companies (`/markets/all-companies`)

**File:** `src/app/components/MarketsAllCompaniesPage.tsx`

**What it does:** Directory of all public companies. Shows a grid of `CompanyCard` components. Supports text search (name, industry, location, tagline, owner name) and a "From My Network" toggle for companies owned by followed users.

**Data loaded:**
- `market_companies` — all public, newest first, with owner join
- `market_offerings` — count per company
- `user_connections` — current user's following list
- `market_companies` filtered by followed user IDs — for network set

**User actions:**
- Text search (client-side)
- Toggle "From My Network"
- Click company card → `/markets/companies/:slug`

---

## Company Profile (`/markets/companies/:slug`)

**File:** `src/app/components/markets/CompanyProfilePage.tsx`

**What it does:** Public profile page for an individual company. Has three tabs: Overview, Offerings, and News.

**Data loaded:**
- `market_companies` — company record
- `users` — owner (founder) info
- `market_offerings` — all offerings for this company
- `company_news` and `posts` — up to 5 recent news posts
- `useCompanyBadges` hook + `useBadgeTypes` hook — badges earned/available

**Tabs:**
- **Overview** — full description, company details (industry, stage, location, employee count, founded year), and Badges & Achievements section (earned badges + available-to-earn list for the owner)
- **Offerings** — grid of the company's offerings; owner sees an "Add Offering" button; each card links to view or edit
- **News** — up to 5 recent posts from the company news feed; "View All News" button navigates to `/markets/companies/:slug/news`

**User actions:**
- Visit website (external link)
- Open Companion page (`/markets/companies/:slug/companion`)
- Owner/admin: click "Manage" → `/markets/edit-company/:id`
- Owner: Add Offering → `/markets/create-offering?companyId=...`
- Owner: Edit an offering → `/markets/edit-offering/:id`
- View all news → `/markets/companies/:slug/news`

**Known issues / gaps:**
- Breadcrumbs use `path` prop in some items instead of `href` (inconsistent with rest of codebase).
- No follow/connection action for the company itself (only profiles have follow).

---

## Company Companion Page (`/markets/companies/:slug/companion`)

**File:** `src/app/components/markets/CompanyCompanionPage.tsx`

**What it does:** A streamlined, curated content hub for a company. Designed to be accessed directly (e.g., at a trade show). Displays QR codes prominently at top, then linked content items (pitches, documents, episodes, books, checklists, elevators) with direct navigation links. Accessible to public; owners/members see a "Manage" button.

**Data loaded:**
- `market_companies` — basic company info
- `company_companion_items` — ordered list of items
- Per-item lookups to resolve names/slugs from the relevant content tables

**User actions:**
- Back to company profile
- Open individual content items (pitches, documents, etc.)
- Owners/members: navigate to Edit Company to manage items

---

## My Companies (`/markets/my-companies`)

**File:** `src/app/components/markets/MyCompaniesPage.tsx`

**What it does:** Shows the authenticated user's companies — both owned (shown first, badged "Owner") and companies where they are a member (badged "Member"). Shows companion item count per company.

**Data loaded:**
- `market_companies` — owned by current user
- `company_members` — membership rows for current user
- `market_companies` — member companies not already owned
- `company_companion_items` — counts per company

**User actions:**
- View public profile (`/markets/companies/:slug`)
- Open companion page
- Manage company (`/markets/edit-company/:id`)
- Browse all companies
- Navigate to My Ventures

---

## Create Company (`/markets/create-company`)

**File:** `src/app/components/markets/CreateCompanyPage.tsx`

**What it does:** Form to create a new company. Auto-generates slug from name. Validates slug uniqueness before insert. On success, navigates to `/my-ventures`.

**Fields:** Name (required), URL Slug (required), Tagline, Description, Industry (required, dropdown), Team Size (dropdown), Headquarters Location, Website URL.

**Data written:** `market_companies` (with `is_public: true` by default, `owner_user_id` from auth context).

---

## Edit Company (`/markets/edit-company/:id`)

**File:** `src/app/components/markets/EditCompanyPage.tsx`

**What it does:** Combined page for editing company profile info AND managing the company's companion content. Access is granted to owner, company members, and platform admins.

**Sections:**
1. **Companion Content** — add/remove items that appear on the companion page. Supported item types: Elevator, Pitch, Document, Checklist, Episode, Book, QR Code. Each type (except QR Code) is picked from a searchable list of existing platform content. QR Codes require a URL and optional label. Items can be removed but not reordered in-UI (order field exists in DB but drag-handle is render-only with no drag handler).
2. **Company Information Form** — same fields as Create Company, plus Founded Year. Delete button available to owner only (with confirmation dialog).
3. **Members Dialog** — opens `CompanyMemberDialog` to view/manage company members.

**Known issues / gaps:**
- Drag-to-reorder (`GripVertical` icon) is present visually but has no drag handler — item order cannot be changed from the UI.

---

## Create Offering (`/markets/create-offering`)

**File:** `src/app/components/markets/CreateOfferingPage.tsx`

**What it does:** Multi-section form to list a new product or service. Checks `checkMarketAccess` (tier permission) before allowing access. Requires at least one company to exist. Navigates to `/my-ventures` on success.

**Fields:**
- **Basic Info:** Company (required, dropdown of user's own companies), Name, URL Slug, Tagline, Description, Offering Type (Software/SaaS, Services, Physical, Digital, Hardware), Category (free text)
- **Engagement & Pricing:** Engagement Style (Self-Serve / Talk to Founder / Quick Start), Pricing Model (Free / Freemium / Subscription / One-Time / Contact / Custom), Pricing Details
- **What Are You Seeking:** Checkboxes for Feedback, Early Adopters, Customers, Partners
- **Additional Details:** Target Audience, Website URL, Demo/Video URL
- **Market Placement (required):** Checkboxes for each active market; must select at least one

**Data written:** `market_offerings`, then one `market_placements` row per selected market.

**Known issues / gaps:**
- `checkMarketAccess` enforces a tier permission, but the tier/permission system details are in a separate module (`/lib/tier-permissions`). If a user doesn't pass this check they are silently redirected to `/my-ventures`.

---

## Offering Profile (`/markets/offerings/:slug`)

**File:** `src/app/components/OfferingProfilePage.tsx`

**What it does:** Full detail page for an individual offering. Tracks a view on each page load. Shows CTA buttons based on `purchase_type`. Includes an inquiry form (contact-founder modal) always available.

**Data loaded:**
- `market_offerings` — full offering record (including Kit Commerce fields)
- `market_companies` — associated company
- `users` — owner info
- `market_placements.market_type` — market badges
- `market_offering_links`, `market_offering_media`, `market_offering_features` — supplementary content
- `templateApi.forOffering()` — linked ticket template (from KV store via edge function)
- `waitlistApi.getPosition()` — user's waitlist position (if logged in and template exists)
- `accessTicketService.getUserTicket()` — whether user already has an access ticket

**CTA logic (purchase_type field on offering):**
| purchase_type | Behavior |
|---|---|
| `free_claim` (no linked template) | "Claim Free Access" button — calls `accessTicketService.createTicket` |
| `kit_commerce` | `KitCommerceButton` embeds a ConvertKit Commerce purchase overlay |
| `external_link` | Button links to `external_url` |
| Any type + linked template with inventory | "Claim Ticket" button — pulls from `inventoryApi` |
| Any type + linked template, no inventory | "Join Waitlist" / "You're on the waitlist" state |

**User actions:**
- All CTA flows above
- Leave/join waitlist
- Contact founder (inquiry form modal — saves to `market_inquiries`)
- Visit website, demo link, or additional links
- Owner: Edit offering

**Known issues / gaps:**
- `market_placements.market_type` is read from the old hardcoded enum column; the page uses legacy `getMarketName()` helper that maps `'discovery'/'launch'/'marketplace'` strings rather than the dynamic market names from the `markets` table.
- View tracking writes to `market_offering_views` unconditionally (including when the owner views their own listing).
- `hasAccess` banner/redirect only works when `linkedTemplate.unlocks.containerId` is set; if the offering's template has no unlocks configured, the user sees the "You have access!" banner but no action button.

---

## Kit Commerce (`/platform-admin/kit-commerce`)

**File:** `src/app/components/admin/KitCommerceAdmin.tsx`

**What it does:** Admin setup and audit page for the ConvertKit (Kit) Commerce → ticket pipeline. This is the integration that handles paid purchases of offerings.

**The full pipeline:**
1. Offering is given a `kit_product_id` and `purchase_type = 'kit_commerce'` (via Edit Offering)
2. A Ticket Template is created in the platform's ticket system, linked to the offering and given the Kit product ID
3. A batch of inventory tickets is created under that template
4. Webhook in Kit dashboard points to the platform's edge function
5. When a Kit purchase arrives, the webhook auto-assigns an inventory ticket to the buyer

**Sections:**
1. **Webhook Setup** — displays copyable webhook URLs for the Kit dashboard. Commerce Purchase webhook is required; Commerce Refund is recommended; Form Subscribe and Tag Added are optional.
2. **Offering → Kit ID Setup** — table of all active offerings showing whether each has a `kit_product_id`. Warning badge shows count of offerings missing a Kit ID.
3. **Ticket Template Chain Audit** — lists all active templates with health status pills: offering linked / Kit ID set / inventory exists / available slots remain. Templates fully wired are shown as "Fully Wired ⚡". Gap links route to the correct fix page.
4. **Recent Kit Purchases** — last 25 purchase log entries from KV store (email, product name, amount, date, user link).
5. **Quick Reference** — visual pipeline flow: Kit Dashboard → Edit Offering → Ticket Templates → Ticket Inventory → User Wallet.

**Known issues / gaps:**
- The `KitCommerceButton` component has the Kit account subdomain hardcoded (`aigent-john.kit.com`) in both the script src and button href — this is not configurable from the admin UI. If the Kit account changes, this requires a code change.
- Purchase log is stored in KV and is limited to 25 rows in the display; no pagination or export.

---

## Admin: Markets Configuration (`/platform-admin/markets/configuration`)

**File:** `src/app/components/admin/MarketsConfiguration.tsx`

**What it does:** CRUD management for the `markets` table. Admins define the market categories that appear on the Markets landing page.

**Fields per market:** Name, URL Slug (auto-generated from name), Tagline, Description, Icon (15 Lucide options), Color Theme (10 options), Active toggle, Public toggle.

**User actions:**
- Create market (dialog)
- Edit market (dialog)
- Toggle active/inactive (eye icon, inline)
- Toggle public/members-only (inline)
- Reorder markets (up/down arrow buttons, swaps `display_order` values)
- Delete market (blocked if it has active offerings)

**Business rules:**
- `is_active`: controls whether market appears in admin tools; inactive markets are excluded from the public browse
- `is_public`: public markets visible to all users; members-only markets visible only to authenticated members

---

## Admin: Market Management (`/platform-admin/markets`)

**File:** `src/app/components/admin/MarketManagement.tsx`

**What it does:** Admin tool for controlling which offerings appear in which markets. Two views toggled by a dropdown.

**Offerings view:** Table with one column per configured market. For each offering row and each market column, admin can: add offering to market (+ button), remove it (trash icon), or toggle featured status (star icon, highlighted when featured). Also shows offering type, stage, and public/active status.

**Companies view:** Read-only overview table of all companies with offering count. No actions beyond display.

**Known issues / gaps:**
- Stats cards only show the first two markets (hardcoded `markets.slice(0, 2)`) regardless of how many markets are configured.
- The "Configure Markets" link navigates to `MarketsConfiguration` for creating/editing market categories.
- File header comment notes this is a "split candidate" (~592 lines) — `MarketCard`, `MarketOfferingsPanel`, and `MarketEditDialog` should be extracted.

---

## Admin: Companies Management (`/platform-admin/companies`)

**File:** `src/app/components/admin/CompaniesManagement.tsx`

**What it does:** Admin table of all companies with bulk import/export. The current authenticated admin becomes the `owner_user_id` on any imported companies.

**User actions:**
- Search by name, slug, industry, location, tagline
- Export all companies as JSON or CSV
- Import companies from JSON file (paste or upload) with duplicate strategy: error / skip / update
- Import companies from CSV (upload) with same duplicate strategy
- Edit company (link to `EditCompanyPage`)
- View company public profile
- Delete company (with warning that associated offerings will also be deleted)

**Import fields:** Name (required), Slug (auto-generated if blank), Tagline, Description, Logo URL, Website URL, Industry, Location, Team Size, Is Public.

---

## Data Architecture Summary

```
markets (admin-defined categories)
  └── market_placements (join: offering ↔ market, with featured flag)
        └── market_offerings (products/services)
              └── market_companies (company that owns the offering)
                    └── company_companion_items (curated content for companion page)
                    └── company_members (additional managers)
              └── market_offering_links / media / features (supplementary content)
              └── market_inquiries (contact-founder messages)
              └── market_offering_views (view tracking)
```

**Kit Commerce extension on market_offerings:**
- `purchase_type`: `free_claim` | `kit_commerce` | `external_link` | `contact_only`
- `kit_product_id`: numeric ID from ConvertKit
- `kit_product_url`: ConvertKit checkout URL
- `kit_landing_page_url`: optional learn-more page
- `cta_text`: custom CTA button label
- `external_url`: used when `purchase_type = external_link`

---

## Route Map

| Route | Component |
|---|---|
| `/markets` | `MarketsPage` |
| `/markets/:marketType` | `MarketDetailPage` |
| `/markets/all-markets` | `MarketsAllMarketsPage` (legacy) |
| `/markets/all-offerings` | `MarketsAllOfferingsPage` |
| `/markets/all-companies` | `MarketsAllCompaniesPage` |
| `/markets/my-companies` | `MyCompaniesPage` |
| `/markets/companies/:slug` | `CompanyProfilePage` |
| `/markets/companies/:slug/companion` | `CompanyCompanionPage` |
| `/markets/companies/:slug/news` | `CompanyNewsPage` |
| `/markets/create-company` | `CreateCompanyPage` |
| `/markets/edit-company/:id` | `EditCompanyPage` |
| `/markets/create-offering` | `CreateOfferingPage` |
| `/markets/edit-offering/:id` | `EditOfferingPage` |
| `/markets/offerings/:slug` | `OfferingProfilePage` |
| `/platform-admin/markets` | `MarketManagement` |
| `/platform-admin/markets/configuration` | `MarketsConfiguration` |
| `/platform-admin/companies` | `CompaniesManagement` |
| `/platform-admin/kit-commerce` | `KitCommerceAdmin` |
