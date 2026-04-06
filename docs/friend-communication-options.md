# Friend Communication — Future Development Options

## Context

Friends are defined as **mutual followers** — users who follow each other. The `user_connections` table tracks these relationships. The `FriendsPage` displays mutual connections and currently links to `/messages/:id`, which is a dead route with no backend.

The options below are ranked from easiest to hardest to implement.

---

## Option 1 — Friends Activity Feed
**Effort: Very Easy (1–2 days)**

A dedicated page or tab that filters the existing posts feed to show only content from mutual friends.

- No new database tables required
- Query `posts WHERE author_id IN (mutualIds)` — mutualIds computed from `user_connections`
- Could be a tab added to the existing FriendsPage or a standalone `/friends/feed` route
- Shows what friends are posting across the platform, including across circles
- Not strictly 1:1 — it's a shared consumption experience

**Depends on:** Existing `posts` table, existing `user_connections` table.

---

## Option 2 — Friends-Only Post Visibility
**Effort: Easy (2–3 days)**

Add a "Friends only" visibility option when creating a post, so the post is shown only to mutual followers.

- The `posts` table already has an `access_level` field — add a `'friends'` level
- Posts with this level appear in the Friends Activity Feed (Option 1)
- The post composer UI (ContainerFeed) would need a new visibility selector option
- Still not 1:1 — posts are visible to all mutual followers, not just one person

**Depends on:** Option 1 (Friends Feed) to make the posts discoverable.

---

## Option 3 — Direct Messages
**Effort: Medium (4–6 days)**

A proper 1:1 text conversation between two friends. This is the most natural answer to "communicate one on one."

- The `/messages/:id` route already exists as a dead link in the friend card — it needs to be brought to life
- Requires a new `direct_messages` table:
  ```
  direct_messages(id, sender_id, recipient_id, content, created_at, read_at)
  ```
- UI needed: conversation list (inbox at `/messages`) + thread view (`/messages/:userId`)
- Unread badge/count on the nav icon
- Optional: real-time updates via Supabase Realtime subscriptions
- Privacy: only mutual friends (or any follower relationship) can initiate a DM

**New tables required:** `direct_messages`

---

## Option 4 — Private 1:1 Forum Thread
**Effort: Medium (3–5 days)**

Reuse the existing `forum_threads` / `forum_thread_replies` infrastructure (already working inside circles) but scope a thread to just two users.

- Add `is_direct BOOLEAN` and `recipient_id UUID` columns to `forum_threads`
- An inbox page lists all your direct threads (partners, latest message, unread count)
- Clicking into a thread uses the existing forum reply UI
- Richer than Direct Messages: threaded replies, longer-form discussion, the ability to reference back through history
- Easier to build than DMs because the thread + reply data model and UI already exist

**Schema changes:** Two columns on `forum_threads`, plus an inbox query.

---

## Option 5 — Shared Moments or Portfolio Space
**Effort: Hard (1–2 weeks)**

A shared personal space where both friends can contribute content — similar to a joint Moments board or a co-authored portfolio.

- Currently Moments (`/moments/:userId`) and Portfolio (`/portfolio/:userId`) are strictly per-user and read-only for visitors
- Making them collaborative requires:
  - A new co-ownership data model (e.g., `shared_spaces` or `friendship_spaces` table)
  - A new concept of "contributed by" vs "owned by"
  - UI for both parties to add, edit, and view shared content
  - Privacy controls: visible only to the pair, or to their broader friends list
- UX design work is needed before code — the concept needs to be clearly defined first

**New tables required:** New schema for shared/co-owned content spaces.

---

## Option 6 — Automatic Private Circle Per Friendship
**Effort: Hardest (2–3 weeks)**

When two users become mutual followers, automatically provision a private invite-only circle containing just the two of them. This gives the full circle experience — feed, forum, events, documents, members.

- Gives the most capability: everything a circle offers, in a 1:1 context
- Trigger creation when mutual follow is detected (client-side or Supabase database function)
- Challenges:
  - **Scaling:** 100 friends = 100 circles per user; platform circle limits (`max_admin_circles` in `user_classes`) would need exceptions for friendship circles
  - **Lifecycle:** What happens when one person unfollows — archive, soft-delete, or preserve the circle?
  - **Naming:** Auto-generated names like "Alex & Jordan" need to be handled gracefully
  - **Notifications:** Both parties need to be notified when a friendship circle is created
  - **Data integrity:** Circle admin rights, moderation, and guest access settings all need defaults
  - **Discovery:** Friendship circles should be hidden from the general circle browse page

**New tables required:** None (reuses circles), but significant new logic for auto-provisioning and lifecycle management.

---

## Comparison Summary

| Option | Effort | 1:1? | New DB Tables | Real-time Possible |
|--------|--------|-------|---------------|-------------------|
| Friends Activity Feed | Very Easy | No | None | No |
| Friends-Only Post Visibility | Easy | No | None | No |
| Direct Messages | Medium | Yes | 1 (`direct_messages`) | Yes |
| Private 1:1 Forum Thread | Medium | Yes | 0 (columns only) | Yes |
| Shared Moments/Portfolio | Hard | Yes | 1–2 | No |
| Auto Private Circle | Hardest | Yes | 0 (logic only) | Yes (via existing circle feed) |

---

## Recommended Path

If the goal is **true 1:1 communication**, the most practical starting point is **Option 4 (Private Forum Thread)** because the reply infrastructure already exists, followed by **Option 3 (Direct Messages)** for a more familiar messaging experience. These two can coexist — threads for longer conversations, DMs for quick back-and-forth.

**Option 1 (Friends Feed)** and **Option 2 (Friends-Only Posts)** are worthwhile as companion features regardless of which 1:1 option is chosen — they enrich the friends experience at minimal cost.

**Option 6 (Auto Private Circle)** is the most powerful but carries the most architectural risk and should only be considered once simpler options are proven out.
