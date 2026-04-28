# Member Retention & Progression Strategy

**The Innovation Jungle — Platform Strategy Document**
*Last updated: April 2026*

---

## The Core Problem

Getting someone to create an account is the easy part. The hard part is turning that account into an active community member, and turning an active member into a committed contributor. Without a deliberate retention and progression system, most new members will log in once, find nothing pulling them forward, and quietly disappear.

This document defines:
- The progression model — how members advance through the community
- What's already built and what's missing
- How to measure engagement health
- How to communicate progress to leadership and investors

---

## The Progression Model

Member depth is controlled by three orthogonal dimensions that already exist in the platform:

| Dimension | Values | Controls |
|---|---|---|
| **user_class** | 1–10 | Feature access — how many circles, what tools |
| **membership_tier** | free / member / premium | Billing — what market features are unlocked |
| **role** | member / admin / super | Platform permissions |

Progression is primarily driven by **user_class advancement**. A new member starts at class 3. As they engage more deeply — joining circles, completing programs, contributing content — their class should advance, unlocking more of the platform.

### Progression Ladder

```
Class 1–2    Visitor / Guest          Browsing, no participation
Class 3–4    Basic / Attender         Joined a circle, attended an event
Class 5–6    Regular / Regular+       Active in circles, completed a course
Class 7–8    Power / Circle Leader    Leading a circle, completing a program
Class 9–10   Leader+ / Platform Admin Mentoring others, platform stewardship
```

The intent is that class advancement is **earned through demonstrated participation**, not purchased. Billing tier is what you pay; class is what you earn.

---

## The Retention Funnel

Every member moves through a predictable lifecycle. The platform already has the state machine built; what's missing is the automation and visibility.

```
Account Created
      ↓
  Activated        — logged in, completed profile, joined first circle
      ↓
  Engaged          — posting, attending events, completing course steps
      ↓
  Committed        — leading content, completing a program, advancing class
      ↓
  Ambassador       — referring others, mentoring, deep circle leadership
```

### Risk States (already tracked in `participants` table)

| State | Trigger | Action Needed |
|---|---|---|
| `new_member` | Just enrolled | Welcome sequence, circle assignment |
| `at_risk` | Attendance < 50% | Personal outreach, re-engagement nudge |
| `inactive` | 3+ consecutive absences | Exit interview or win-back campaign |
| `completed` | Program/pathway finished | Celebrate + advance class + offer next step |

---

## What's Built vs. What's Missing

### Built

| Feature | Location | Status |
|---|---|---|
| Member state tracking | `participants` table | ✅ Full schema + RPC |
| Funnel configuration per program/circle | `/programs/:id/admin/funnel-config` | ✅ Working |
| Lifecycle state view | `MembershipFunnelView` | ✅ Working |
| Auto-suggestions (at_risk, inactive) | `get_state_suggestions()` RPC | ✅ Working |
| Pathway enrollment and progress | `pathway_enrollments` | ✅ Working |
| Course enrollment tracking | `course_enrollments` | ✅ Working |
| User class management | `/platform-admin/user-classes` | ✅ Working |
| Profile section import/export | MyBasicsPage, MyProfessionalPage, MyEngagementPage | ✅ Working |
| Onboarding wizard | MyBasicsPage | ✅ Working |

### Missing — High Priority

| Feature | What It Does | Effort |
|---|---|---|
| **Activation check** | Detects if new member has joined a circle, completed a profile, attended an event | Medium |
| **Automatic class advancement** | Triggers user_class upgrade when participation thresholds are met | Medium |
| **At-risk notifications** | Alerts admin when a member goes at_risk or inactive | Small |
| **Member dashboard engagement score** | Shows member their own engagement level and what to do next | Medium |
| **Pathway step completion tracking** | Records when a member completes a step; currently stubbed | Medium |
| **Self-report submission** | Members can report activities for pathway credit; currently stubbed | Small |
| **Platform-wide lifecycle dashboard** | `LifecycleDashboard` exists but needs its RPC (`get_lifecycle_metrics`) | Medium |

### Missing — Medium Priority

| Feature | What It Does | Effort |
|---|---|---|
| **Retention email triggers** | Sends automated emails when member goes inactive | Medium |
| **Pathway recommendation scoring** | Matches pathways to member profile/interests; currently loads all | Medium |
| **Circle health score** | Aggregate activity score per circle to identify thriving vs. dying circles | Medium |
| **Program completion ceremonies** | Badge award + class upgrade + announcement on program completion | Medium |
| **Progress nudges** | In-platform notification when member is close to finishing a pathway/program | Small |

---

## Engagement Metrics — What to Measure

### Level 1 — Activation (first 14 days)

These tell you if new members are getting value fast enough to stay:

```sql
-- % of new members who joined at least one circle within 14 days
SELECT
  COUNT(*) FILTER (WHERE joined_circle) AS activated,
  COUNT(*) AS total_new,
  ROUND(100.0 * COUNT(*) FILTER (WHERE joined_circle) / COUNT(*), 1) AS activation_rate
FROM (
  SELECT
    u.id,
    EXISTS (
      SELECT 1 FROM circles c
      WHERE u.id = ANY(c.member_ids)
    ) AS joined_circle
  FROM users u
  WHERE u.created_at >= now() - interval '14 days'
) t;

-- Average time from account creation to first circle join
SELECT AVG(EXTRACT(epoch FROM (first_join - created_at)) / 86400) AS avg_days_to_first_circle
FROM (
  SELECT u.id, u.created_at,
    MIN(c.created_at) AS first_join
  FROM users u
  JOIN circles c ON u.id = ANY(c.member_ids)
  GROUP BY u.id, u.created_at
) t;
```

### Level 2 — Engagement (ongoing)

These tell you if members are actually participating:

```sql
-- Active members by class (posted or attended event in last 30 days)
SELECT
  u.user_class,
  COUNT(DISTINCT u.id) AS total_members,
  COUNT(DISTINCT p.author_id) AS posted_last_30d,
  ROUND(100.0 * COUNT(DISTINCT p.author_id) / COUNT(DISTINCT u.id), 1) AS engagement_rate
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
  AND p.created_at >= now() - interval '30 days'
GROUP BY u.user_class
ORDER BY u.user_class;

-- Members at risk by state
SELECT current_state, COUNT(*) AS count
FROM participants
WHERE current_state IN ('at_risk', 'inactive', 'new_member')
GROUP BY current_state;

-- Circle activity health
SELECT
  c.name,
  COUNT(DISTINCT p.author_id) AS active_contributors,
  COUNT(p.id) AS posts_last_30d,
  array_length(c.member_ids, 1) AS total_members
FROM circles c
LEFT JOIN posts p ON p.circle_id = c.id
  AND p.created_at >= now() - interval '30 days'
GROUP BY c.id, c.name
ORDER BY posts_last_30d DESC;
```

### Level 3 — Progression (class advancement)

These tell you if members are deepening their commitment:

```sql
-- User class distribution
SELECT
  user_class,
  COUNT(*) AS members,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM users
WHERE role = 'member'
GROUP BY user_class
ORDER BY user_class;

-- Pathway completion rate
SELECT
  p.name AS pathway,
  COUNT(pe.user_id) AS enrolled,
  COUNT(pe.completed_at) AS completed,
  ROUND(100.0 * COUNT(pe.completed_at) / NULLIF(COUNT(pe.user_id), 0), 1) AS completion_rate
FROM pathways p
JOIN pathway_enrollments pe ON pe.pathway_id = p.id
GROUP BY p.id, p.name
ORDER BY enrolled DESC;

-- Program completion rate
SELECT
  pr.name AS program,
  COUNT(DISTINCT pa.user_id) AS applicants,
  COUNT(DISTINCT pa.user_id) FILTER (WHERE pa.status = 'approved') AS enrolled,
  COUNT(DISTINCT pa.user_id) FILTER (WHERE pa.status = 'completed') AS completed
FROM programs pr
JOIN program_applications pa ON pa.program_id = pr.id
GROUP BY pr.id, pr.name;
```

---

## Retention KPIs for Leadership & Investors

These are the numbers that tell the story of a healthy community:

### Core Metrics

| KPI | Target | How to Measure |
|---|---|---|
| **D14 Activation Rate** | > 60% | % new members who join a circle within 14 days |
| **M1 Retention** | > 40% | % of members still active 30 days after joining |
| **M3 Retention** | > 25% | % of members still active 90 days after joining |
| **Monthly Active Members (MAM)** | Growing | Unique members who posted, attended, or completed content in 30 days |
| **Circle Participation Rate** | > 50% | % of members who are active in at least one circle |
| **Course/Program Completion Rate** | > 30% | % of enrolled members who finish |
| **Pathway Completion Rate** | > 20% | % of enrolled members who complete a pathway |
| **Class Advancement Rate** | > 10%/quarter | % of members who advance at least one user_class per quarter |

### Engagement Depth Score (proposed formula)

A single number summarizing member engagement, calculated per member:

```
Score = (circle_posts × 2) + (events_attended × 3) + (courses_completed × 5)
      + (programs_completed × 10) + (pathways_completed × 8) + (content_created × 1)
```

Segment by quartile:
- **Q4 (top 25%)** — Champions. Nurture into leadership roles.
- **Q3** — Active. Surface next-step opportunities.
- **Q2** — Passive. Targeted re-engagement.
- **Q1 (bottom 25%)** — At risk. Personal outreach or exit.

### Investor-Ready Summary View

```
Community Health Dashboard — [Month] [Year]

Total Members:          XXX
Monthly Active (MAM):   XXX  (XX% of total)
New This Month:         XXX
D14 Activation Rate:    XX%

Retention:
  M1:  XX%
  M3:  XX%

Progression:
  Class 1–3 (early):    XX%
  Class 4–6 (engaged):  XX%
  Class 7–10 (leaders): XX%

Programs Active:        XX
Program Completion:     XX%

Circles Active:         XX
Avg Posts/Circle/Month: XX
```

---

## Development Plan — Priority Order

### Phase 1 — Foundation (now, 1–2 weeks)

1. **Build `get_lifecycle_metrics` RPC** — powers the LifecycleDashboard with real aggregate data
2. **Fix pathway step completion tracking** — record completions in `pathway_step_completions` table
3. **Fix self-report submission** — save activity completions via RPC
4. **Build activation check query** — surface in admin dashboard: how many new members activated this week

### Phase 2 — Automation (2–4 weeks)

5. **At-risk notifications** — when `get_state_suggestions()` flags a member, create an in-platform admin notification
6. **Class advancement triggers** — define thresholds per class, check on key events (program complete, pathway complete, N posts), auto-advance
7. **Platform lifecycle dashboard** — wire up LifecycleDashboard with real data from Phase 1 RPC

### Phase 3 — Visibility (4–8 weeks)

8. **Member engagement score** — calculate and display per-member score in admin user list
9. **Circle health score** — surface in circle admin dashboard
10. **Progress nudges** — in-platform notifications when member is 80% through a pathway/program
11. **Admin retention report** — exportable monthly summary matching the investor-ready format above

---

## Immediate Actions You Can Take Today

Without any new development, you can start measuring and acting now:

1. **Run the engagement queries above** in the Supabase SQL editor to establish your baseline
2. **Configure funnel states** on your active circles and programs via `/programs/:id/admin/funnel-config`
3. **Define user class thresholds** in `/platform-admin/user-classes` — document what behavior earns each class
4. **Manually advance class** for members who have earned it via `/platform-admin/users`
5. **Build pathways** that map your existing courses and programs into a progression sequence

The data infrastructure exists. What's missing is the automation layer that acts on it and the reporting layer that surfaces it. Both are buildable in short cycles on top of what's already there.
