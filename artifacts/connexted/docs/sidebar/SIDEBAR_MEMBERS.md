# Sidebar Section: Members

The MEMBERS section in the sidebar (`MembersSection.tsx`) expands to show links including All Members, Contact Directory, Friends, Socials, Following, Followers, Active Members, and Member Matches.

---

#### Members Directory (`/members/all`, `/members/:type`)

**Component:** `src/app/components/MembersPage.tsx`

**What it does:** Displays all platform members in a searchable card grid. The `:type` route param allows deep-linking to the Admins (`/members/admins`) or Circle Hosts (`/members/hosts`) tabs.

**Data loaded:**
- `users` table — full `SELECT *` for all users
- `circles` table — full `SELECT *` for all circles (used to derive host membership)
- `user_connections` table — filtered by `follower_id = currentUser.id` to load follow state

**User actions:**
- Search members by name or email (client-side filter)
- Follow / Unfollow any member (writes to `user_connections`, triggers `notifyNewFollower`)
- Navigate to a member's profile via their name link
- Navigate to a member's Moments page (`/moments/:userId`)
- Navigate to a member's Portfolio page (`/portfolio/:userId`)
- Open WhatsApp chat if member has `whatsapp_number` set (only shown if field is populated)

**Tabs / sub-views:**
| Tab | Filter logic |
|---|---|
| All Members | All users |
| Admins | `users.role === 'admin'` or `'super'` |
| Circle Hosts | Users present in any `circle.host_ids[]` |

**Known issues / gaps:**
- Loads all users and circles with `SELECT *` — no pagination. Will degrade at scale.
- `getActivityCount()` returns a hardcoded `0`; actual activity counts are not fetched.
- `viewMode` and `sortOption` state variables are declared but never used — the sort/view toggle UI is not rendered.
- Admin tab uses `role === 'admin' || role === 'super'`; regular admin role label on cards shows `'admin'` regardless of which super-role variant matched.

---

#### User Profile (`/users/:userId`)

**Component:** `src/app/components/UserProfilePage.tsx`

**What it does:** Displays a member's full public profile — header with avatar, bio, badges, follower/following counts, and connection stats, followed by tabbed sections for activity, professional info, circle memberships, and contributions.

**Data loaded:**
- `users` — single row by `userId`
- `circles` — filtered by `member_ids @> [userId]`
- `posts` — count and last 10 rows by `author_id`
- `forum_threads` — count and last 10 rows by `author_id`
- `documents` — count and last 10 rows by `author_id`
- `events` — count by `host_id`
- `user_connections` — single row to check if current user is following
- `user_skills` — public skills (`is_public = true`)
- `user_credentials` — public credentials (`is_public = true`)
- `user_affiliations` — public affiliations (`is_public = true`)
- `badge_assignments` (via `useUserBadges` hook)

**User actions:**
- Follow / Unfollow the member (writes to `user_connections`, triggers `notifyNewFollower`)
- Navigate to the member's Moments page (`/moments/:userId`)
- Navigate to the member's Portfolio page (`/portfolio/:userId`)
- Open WhatsApp chat (if permitted by member's privacy settings)
- View member's follower list (`/users/:userId/followers`)
- View member's following list (`/users/:userId/following`)
- Navigate to individual circles the member belongs to

**Tabs / sub-views:**
| Tab | Content |
|---|---|
| Recent Activity | Last 5 posts; counts for threads and documents |
| Professional | Job title, company, status, years of experience, skills, credentials, affiliations, badges |
| Circles | Grid of circles the member belongs to, linking to each circle detail page |
| Contributions | Thread count and document count cards |

**Privacy enforcement:** Respects `users.privacy_settings` flags (`email_private`, `whatsapp_private`, `show_connections`). Platform admins bypass all privacy checks.

**Known issues / gaps:**
- Own-profile button links to `/my-basics` (the edit page) rather than a dedicated self-view page.
- The Recent Activity tab only shows posts; threads and documents appear only as counts in the Contributions tab.
