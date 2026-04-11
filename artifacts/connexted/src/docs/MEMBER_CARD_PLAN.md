# Member Card Consolidation Plan

## Current State

There are five pages that each render member cards inline with no shared component:

| Page | File |
|------|------|
| Friends | `src/app/pages/FriendsPage.tsx` |
| Following | `src/app/components/FollowingPage.tsx` |
| Followers | `src/app/components/FollowersPage.tsx` |
| All Members | `src/app/components/MembersPage.tsx` |
| Socials | `src/app/pages/SocialsPage.tsx` |
| Member Matches | `src/app/components/MemberMatchesPage.tsx` |

---

## Standard Fields (all pages)

- Avatar → links to `/users/:id`
- Name → links to `/users/:id`
- Email or tagline
- Membership tier badge
- Hover shadow

---

## Unique Fields and Actions Per Page

| Page | Unique Fields | Unique Actions |
|------|--------------|----------------|
| **Friends** | Badge count, circle count, "Friends since" date | View Profile, Message |
| **Following** | Bio, "Following since" date | Unfollow |
| **Followers** | Bio, "Followed" date | Follow Back / Following toggle |
| **All Members** | Bio, email, circle count, role badge (admin/host) | Follow/Unfollow, Moments, Portfolio, WhatsApp |
| **Socials** | Job title, social platform icons (per privacy settings) | vCard download |
| **Member Matches** | Tagline, job title, years experience, credentials, match score bar, match reason chips (color-coded by profile section) | Connect |

---

## Proposed Shared Component

**File:** `src/app/components/shared/MemberCard.tsx`

### Props

```tsx
interface MemberCardProps {
  // Core (required)
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    tagline?: string | null;
    bio?: string | null;
    job_title?: string | null;
    membership_tier?: string;
    role?: string;
    whatsapp_number?: string | null;
  };

  // Layout
  variant?: 'card' | 'row';           // card = FriendsPage style, row = compact list

  // Optional display fields
  showBio?: boolean;
  showEmail?: boolean;
  showJobTitle?: boolean;
  showCircleCount?: number;
  showBadgeCount?: number;
  showCredentials?: string[];
  showYearsExperience?: number;
  dateLabel?: string;                  // e.g. "Friends since", "Following since"
  dateValue?: string;                  // ISO date string

  // Match-specific
  matchScore?: number;                 // 0-100, renders score bar
  matchReasons?: {
    label: string;
    source: 'basics' | 'professional' | 'engagement';
  }[];

  // Actions (all optional)
  onFollow?: () => void;
  onUnfollow?: () => void;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  showMoments?: boolean;
  showPortfolio?: boolean;
  showMessage?: boolean;
  showVCard?: boolean;
  onVCardDownload?: () => void;
  showConnect?: boolean;
  onConnect?: () => void;

  // Social icons (Socials page)
  socialLinks?: {
    platform: string;
    icon: ComponentType;
    url: string;
    color: string;
    isHighlighted?: boolean;
  }[];
}
```

### Variants

**`variant="card"`** — FriendsPage style
- Centered layout
- Large avatar (w-20 h-20) with gradient background
- Mutual/friend badge indicator
- Name centered, stats row, date context
- Action buttons full-width at bottom

**`variant="row"`** — Compact list style
- Single horizontal row
- Small avatar (w-10 h-10) left-aligned
- Name + tagline/title inline
- Tier badge
- Primary action button right-aligned
- Good for large directories (All Members, Contact Directory)

---

## Card vs List Toggle

### Where to add it
All member list pages should support a card/list toggle. Add to:
- `MembersPage` (viewMode state already exists but table view not built)
- `FriendsPage`
- `FollowingPage`
- `FollowersPage`
- `MemberMatchesPage`

### Implementation
```tsx
// Reusable toggle — two icon buttons
<div className="flex gap-1 border rounded-lg p-1">
  <button onClick={() => setViewMode('card')} className={viewMode === 'card' ? 'active' : ''}>
    <LayoutGrid className="w-4 h-4" />
  </button>
  <button onClick={() => setViewMode('row')} className={viewMode === 'row' ? 'active' : ''}>
    <List className="w-4 h-4" />
  </button>
</div>
```

### Default view per page

| Page | Default | Rationale |
|------|---------|-----------|
| All Members | Row | Directory — scanning many people |
| Friends | Card | Relationship-focused, identity matters |
| Following | Card | Relationship-focused |
| Followers | Card | Relationship-focused |
| Member Matches | Card | Match reasons need card space |
| Socials | Card | Platform icons are visual |
| Active Members | Row | Quick scan |
| Contact Directory | Row | Sortable, data-dense |

---

## Implementation Steps

1. **Create `src/app/components/shared/MemberCard.tsx`**
   - Build card variant based on FriendsPage inline card (current best design)
   - Build row variant as condensed horizontal layout
   - Accept all props above

2. **Wire into MemberMatchesPage** (highest priority — uses mock data, easy swap)

3. **Wire into FriendsPage** (current design becomes the card default)

4. **Wire into FollowingPage and FollowersPage** (similar card structure)

5. **Wire into MembersPage** (replace renderUserCard, add row variant + toggle)

6. **Wire into SocialsPage** (add socialLinks prop rendering)

7. **Add card/row toggle** to all pages that support it

---

## Notes

- Follow/unfollow logic stays in each page — card just calls `onFollow` / `onUnfollow` callbacks
- Privacy checks (show_email, show_whatsapp, etc.) stay in the page data layer, not the card
- Match score bar and reason chips are card-only — no row equivalent needed
- SocialsPage social icon buttons stay as-is in the card; row variant shows platform count only
- `viewMode` preference could be stored in localStorage per page for persistence
