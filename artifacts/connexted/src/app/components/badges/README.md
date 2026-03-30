# Badges Components

React components for the CONNEXTED Badges System.

## Components

### AdminBadgeAssignment

Admin interface for manually assigning badges to users or companies.

**Usage:**
```tsx
import { AdminBadgeAssignment } from '@/app/components/badges/AdminBadgeAssignment';

<AdminBadgeAssignment 
  onSuccess={() => console.log('Badge issued!')}
  onCancel={() => setShowForm(false)}
/>
```

**Features:**
- ✅ Search for users or companies
- ✅ Select badge type from available badges
- ✅ Add personal message
- ✅ Include evidence URL
- ✅ Set endorsement level (for endorsement badges)
- ✅ Control public visibility

---

### BadgeDisplay

Compact badge display for profiles and cards.

**Usage:**
```tsx
import { BadgeDisplay } from '@/app/components/badges/BadgeDisplay';

<BadgeDisplay 
  badges={userBadges} 
  maxDisplay={5}
  showIssuer={true}
  size="md"
/>
```

**Props:**
- `badges` - Array of UserBadge or CompanyBadge objects
- `maxDisplay?` - Maximum number of badges to show (default: all)
- `showIssuer?` - Show who issued the badge in tooltip (default: true)
- `size?` - 'sm' | 'md' | 'lg' (default: 'md')

**Features:**
- ✅ Circular badge icons with custom colors
- ✅ Hover tooltips with badge details
- ✅ "+N" indicator for remaining badges
- ✅ Category-based icon display

---

### BadgeCard

Detailed badge card with full information.

**Usage:**
```tsx
import { BadgeCard } from '@/app/components/badges/BadgeDisplay';

<BadgeCard badge={userBadge} showRecipient={false} />
```

**Props:**
- `badge` - UserBadge or CompanyBadge object
- `showRecipient?` - Show recipient info (default: false)

**Features:**
- ✅ Large badge icon
- ✅ Badge name and description
- ✅ Issuer information
- ✅ Issue date
- ✅ Personal message (if provided)
- ✅ Evidence link

---

### BadgeList

Organized list of badges, optionally grouped by category.

**Usage:**
```tsx
import { BadgeList } from '@/app/components/badges/BadgeDisplay';

<BadgeList badges={userBadges} groupByCategory={true} />
```

**Props:**
- `badges` - Array of UserBadge or CompanyBadge objects
- `groupByCategory?` - Group badges by category (default: true)

**Features:**
- ✅ Category headers
- ✅ Multiple BadgeCards in organized layout
- ✅ Responsive grid

---

### BadgeManagementPage

Complete admin page for badge management.

**Usage:**
```tsx
import { BadgeManagementPage } from '@/app/components/badges/BadgeManagementPage';

<BadgeManagementPage />
```

**Features:**
- ✅ Tabbed interface (Assign, Badge Types, Recent Activity)
- ✅ Badge assignment form
- ✅ Badge type catalog
- ✅ Success/error notifications

---

## Hooks

See `/src/hooks/useBadges.ts` for React hooks:

- `useBadgeTypes()` - Load all badge types
- `useUserBadges(userId)` - Load user's badges
- `useCompanyBadges(companyId)` - Load company's badges
- `useBadgeActions()` - Issue/revoke badge actions
- `useHasBadge(type, id, slug)` - Check for specific badge

---

## Examples

### Display badges on user profile

```tsx
import { useUserBadges } from '@/hooks/useBadges';
import { BadgeDisplay } from '@/app/components/badges/BadgeDisplay';

function UserProfile({ userId }: { userId: string }) {
  const { badges, loading } = useUserBadges(userId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Achievements</h2>
      <BadgeDisplay badges={badges} maxDisplay={6} />
    </div>
  );
}
```

### Admin badge assignment modal

```tsx
import { useState } from 'react';
import { AdminBadgeAssignment } from '@/app/components/badges/AdminBadgeAssignment';

function AdminPanel() {
  const [showAssign, setShowAssign] = useState(false);

  return (
    <>
      <button onClick={() => setShowAssign(true)}>
        Assign Badge
      </button>

      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <AdminBadgeAssignment 
              onSuccess={() => {
                alert('Badge issued!');
                setShowAssign(false);
              }}
              onCancel={() => setShowAssign(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
```

### Full badge management page

```tsx
import { BadgeManagementPage } from '@/app/components/badges/BadgeManagementPage';

// In your admin routes
<Route path="/admin/badges" element={<BadgeManagementPage />} />
```

---

## Styling

All components use Tailwind CSS and are responsive. They follow the CONNEXTED design system with:

- Blue (`#3B82F6`) as the primary color
- Badge-specific colors from `badge_types.badge_color`
- Hover states and transitions
- Accessible tooltips and focus states

---

## Permissions

Badge display components are read-only and work for all users. Admin components require:

- `user_class >= 8` (platform admin) OR
- `can_sponsor = true` (sponsors)

RLS policies enforce these permissions at the database level.

---

## Future Enhancements

1. **Badge Builder UI** - Create custom badge types through UI
2. **Badge Analytics** - Track badge distribution and value
3. **Badge Export** - Download badges as images/PDFs
4. **Badge Sharing** - Social media sharing
5. **Badge Verification** - Public verification page

---

## Related Documentation

- [Badges System Overview](/docs/badges-system.md)
- [Badge Service API](/src/services/badgeService.ts)
- [Badge Hooks](/src/hooks/useBadges.ts)
- [Database Schema](/supabase/migrations/20260210000001_upgrade_to_badges_system.sql)
