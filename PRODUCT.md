# Product Context

For technical team members who want to understand why the product is built the way it is. Knowing the business model helps make better technical decisions.

---

## What This Is

ConnextedLabs is infrastructure for exclusive professional communities — specifically in industrial and trade verticals where practitioners share knowledge through peer learning, structured cohort programs, and mentorship.

It is not a general-purpose community platform. It is purpose-built for communities like:

- AI in Manufacturing (practitioners applying AI on the factory floor)
- Safety in Electrical and Mechanical Contracting (compliance, OSHA, safety management)
- Data Analysis in Construction (operational and project analytics)
- Industrial Capital Equipment Project Management
- Leadership Development in PMO and Project environments

These verticals have corporate professional development budgets, real peer learning value, and are poorly served by existing consumer platforms.

---

## The Business Model

**Three revenue layers:**

| Layer | Source | When it activates |
|---|---|---|
| SaaS operator fee | Mentor or community operator pays monthly | From first operator |
| Cohort program revenue | Participants pay per program | From first cohort launch |
| Community membership | Members pay monthly | Builds as community grows |

**The operator:** A mentor, training consultant, or professional association that runs a community in their vertical. They bring their own audience. The platform provides the infrastructure — pathways, cohort tools, community, admin.

**The member:** An industrial professional in that vertical. They pay to be in the community and to participate in cohort programs.

---

## The Multi-Instance Architecture

Each operator gets their own instance — not a tenant in a shared system, but a fully independent deployment with its own database. This is a deliberate choice:

**Why independent instances:**
- Operators fear that their clients will discover competing operators on the same platform — a shared marketplace erodes trust
- Independent instances eliminate that concern structurally, not just by policy
- Each community can have its own branding, terminology, and configuration
- Data isolation is complete — not a permission problem, a physical separation

**The tradeoff:** Operational overhead scales with instance count. Deployment automation (one-click new instance from a playbook) is the priority that resolves this.

---

## The Staggered Cohort Model

The operational model that makes the business work at a small team size:

One program manager runs four community instances. Each instance runs two cohort programs per year. The cohort schedules are staggered so only one or two are active at any given time.

```
         Q1          Q2          Q3          Q4
─────────────────────────────────────────────────────
Instance A  [COHORT]    community   [COHORT]    community
Instance B  community   [COHORT]    community   [COHORT]
Instance C  community   community   [COHORT]    community
Instance D  [COHORT]    community   community   [COHORT]
```

**Cohort mode:** High attention — facilitation, feedback, progress tracking, live sessions. ~25 hours/week per active cohort.

**Community mode:** Low attention — moderation, occasional events, content curation. ~6 hours/week per community.

With four instances on this schedule, one program manager carries the workload. This is how the unit economics work at early stage without proportional headcount growth.

---

## The Mentor-Operator Model

Mentors use the platform to manage their existing practice — not to compete in a marketplace.

**The fear this model addresses:** A professional mentor will not bring their clients to a platform where those clients can discover competing mentors. This is not paranoia — it is why independent creators left Udemy for Teachable.

**How the platform resolves it:**
- Each operator's community is private by default — not visible to other communities
- Clients the operator brings in cannot see other operators or their content
- Marketplace listing (where new clients can discover the operator) is a separate, opt-in feature
- Platform commits to never marketing directly to an operator's existing clients

**The progression:** Tool first (operator brings existing clients, platform is invisible infrastructure), marketplace second (operator opts in to discovery when ready to grow).

---

## The User Classification System

Ten user classes (1–10) control what each user can see and do. This is the feature-gating mechanism for the platform.

It serves two purposes:
1. **Operational:** Gate different feature tiers so not all users see everything at once
2. **Product validation:** Different cohorts of users can be assigned different classes to progressively test features

Classes are configurable by platform admins via the admin UI. The `user_class_permissions` table maps class number to visible container types. The nav config in code is the fallback if the DB has no entries.

See `DEVELOPER.md` for the technical implementation.

---

## What Is Validated vs. What Is Hypothesis

**Built and working:**
- Community features (circles, forums, events, members)
- Learning features (courses, pathways, badges, progress tracking)
- Content types (episodes, playlists, documents, reviews, blogs)
- Admin tooling (platform admin, circle admin, program admin)
- User classification and permission system
- Access ticket and enrollment system

**Not yet validated with real users:**
- Whether operators will pay the proposed pricing
- Whether the staggered cohort model works operationally at scale
- Which of the 264 routes users actually find valuable vs. which are noise
- Whether the mentor-operator model resolves the trust concern in practice

**The next milestone:** One operator running one complete cohort cycle with real participants. That single data point validates the core model.

---

## Target Customer for First Sales

The ideal first operator:
- Has an existing cohort of 15–25 professional practitioners they already work with
- Currently managing the program via email, spreadsheets, and Zoom
- Is in one of the industrial verticals listed above
- Has a professional reputation in that community (ISA membership, LinkedIn credibility, prior speaking)

The founder has existing relationships in these verticals through the ISA (International Society of Automation) board positions and the Greater Atlanta IoT Meetup (2,000 members). First operators will come from warm outreach to that network, not from inbound marketing.
