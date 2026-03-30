/**
 * Pre-built Program Templates (Full Export Format)
 * 
 * Complete, importable program templates with circles and content items.
 * Users can import these to instantly create a full program structure.
 * 
 * Templates are coaching and professional development focused
 * to match the Connexted platform.
 * 
 * NOTE: Container entries (elevators, pitches, tables, builds, standups, meetups)
 * are in the items[] array with their proper item_type. The containers[]
 * array is kept empty for compatibility with the import engine which only processes
 * containers when items[] is empty.
 */

import { ProgramTemplate } from '@/types/templates';
import { DESIGN_THINKING_PROGRAM } from '@/data/course-template-exports';

// ==========================================
// GROUP COACHING ACCELERATOR
// ==========================================

export const GROUP_COACHING_TEMPLATE: ProgramTemplate = {
  version: '1.0',
  export_level: 'full',
  program: {
    name: 'Group Coaching Accelerator',
    description: 'An 8-week structured group coaching program with weekly sessions, accountability partnerships, and milestone celebrations',
    template_id: 'group-coaching',
    status: 'not-started',
  },
  circle: {
    name: 'Coaching Cohort',
    description: 'Your cohort community — share wins, support each other, and stay accountable between sessions',
    visibility: 'private',
    join_type: 'invite-only',
    tags: ['coaching', 'cohort', 'accountability'],
    mission: 'To create a trusted space where every member achieves meaningful growth through coaching, community, and accountability.',
  },
  journeys: [
    {
      title: 'Foundation',
      description: 'Set the stage: clarify your vision, set goals, and build trust with your cohort',
      order_index: 0,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Welcome to the Accelerator',
          description: 'Program overview, expectations, and how to get the most from the next 8 weeks.',
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: 'document',
            body: "# Welcome to the Group Coaching Accelerator\n\nOver the next 8 weeks, you'll work with a small cohort of peers and a dedicated coach to achieve a meaningful transformation.\n\n## Program Structure\n\n| Phase | Weeks | Focus |\n|-------|-------|-------|\n| Foundation | 1-2 | Vision, goals, trust-building |\n| Deep Work | 3-6 | Skill building, hot seats, coaching practice |\n| Integration | 7-8 | Apply learnings, celebrate, plan forward |\n\n## Weekly Rhythm\n- **Monday**: Weekly reflection prompt posted\n- **Wednesday**: Group coaching session (90 min)\n- **Friday**: Accountability partner check-in (30 min)\n\n## Community Agreements\n1. **Confidentiality** — What's shared here stays here\n2. **Presence** — Show up fully, cameras on when possible\n3. **Courage** — Share honestly, even when it's uncomfortable\n4. **Generosity** — Give feedback freely and kindly\n5. **Accountability** — Follow through on commitments\n\n## What You'll Need\n- A journal or digital notebook\n- Willingness to be vulnerable\n- 3-4 hours per week (including session time)",
          },
        },
        {
          item_type: 'document',
          title: 'Goal Setting Workshop',
          description: 'Define your 8-week transformation goal using the SMART + Heart framework.',
          order_index: 1,
          estimated_time: 25,
          content: {
            media_type: 'assignment',
            body: "# Goal Setting: SMART + Heart\n\n## Beyond SMART Goals\nSMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) are great for planning. But coaching goals also need **Heart** — emotional resonance that keeps you going when it gets hard.\n\n## Your 8-Week Goal\n\n### The Head (SMART)\n- **Specific**: What exactly will you achieve? ___\n- **Measurable**: How will you know you've achieved it? ___\n- **Achievable**: Is this realistic in 8 weeks? ___\n- **Relevant**: Why does this matter for your life/career right now? ___\n- **Time-bound**: By what date? ___\n\n### The Heart\n- **Why this goal matters deeply to you**: ___\n- **How you'll feel when you achieve it**: ___\n- **Who else benefits when you succeed**: ___\n- **What you're willing to sacrifice for it**: ___\n\n## Your Goal Statement\n\"In 8 weeks, I will [SPECIFIC OUTCOME] because [HEART REASON]. I'll know I've succeeded when [MEASURE].\"\n\nYour statement: ___\n\n## Share Your Goal\nPost your goal statement in Member Introductions. Vulnerability builds trust, and declaring your goal publicly increases commitment.",
          },
        },
        {
          item_type: 'checklist',
          title: 'Foundation Checklist',
          description: 'Complete before Week 3.',
          order_index: 2,
          content: {
            checklist_items: [
              { title: 'Completed your Member Introduction', order_index: 0 },
              { title: 'Written your SMART + Heart goal statement', order_index: 1 },
              { title: 'Shared your goal with the cohort', order_index: 2 },
              { title: 'Connected with your accountability partner', order_index: 3 },
              { title: 'Attended the first group coaching session', order_index: 4 },
            ],
          },
        },
        { item_type: 'elevator', title: 'Member Introductions', description: 'Share who you are, what you do, and what you want from this program', order_index: 3, content: { name: 'Member Introductions', visibility: 'members-only', tags: ['introductions', 'goals'] } },
        { item_type: 'table', title: 'Goal Tracking Board', description: 'Track your goals, milestones, and weekly progress', order_index: 4, content: { name: 'Goal Tracking Board', visibility: 'members-only', tags: ['goals', 'tracking'] } },
      ],
    },
    {
      title: 'Deep Work',
      description: 'Weekly group coaching with hot seats, skill practice, and accountability',
      order_index: 1,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Hot Seat Guide',
          description: 'How to make the most of your time in the hot seat — preparation, participation, and follow-through.',
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: 'document',
            body: "# The Hot Seat\n\n## What Is a Hot Seat?\nA focused 15-20 minute coaching conversation where one member presents a challenge and the group (plus coach) provides support, questions, and insights.\n\n## Before Your Hot Seat\nPrepare a brief summary:\n1. **The situation**: What's happening? (2-3 sentences)\n2. **What you've tried**: What approaches have you taken?\n3. **What you want**: What outcome would be ideal?\n4. **Your specific ask**: What do you need from the group? (feedback? brainstorming? accountability? emotional support?)\n\n## During Your Hot Seat\n- Be honest and specific\n- Listen more than defend\n- Write down insights — you'll forget later\n- It's OK to feel uncomfortable — that's where growth happens\n\n## After Your Hot Seat\n- Identify 1-2 takeaways to act on\n- Share your action commitment with the group\n- Report back at the next session\n\n## When You're in the Audience\n- Listen with full presence (Level 2-3)\n- Ask questions before offering advice\n- Share your own experience briefly — then return focus to them\n- Respect time boundaries",
          },
        },
        {
          item_type: 'document',
          title: 'Accountability Partnership Guide',
          description: 'How to structure your weekly accountability partner check-ins.',
          order_index: 1,
          estimated_time: 10,
          content: {
            media_type: 'document',
            body: "# Accountability Partnership\n\n## Your Weekly Check-in (30 min)\nMeet with your accountability partner every Friday.\n\n### Structure\n1. **Wins** (5 min each): What did you accomplish this week?\n2. **Challenges** (5 min each): Where are you stuck?\n3. **Commitments** (5 min each): What will you do next week?\n\n### Ground Rules\n- No advice unless asked\n- Celebrate progress, no matter how small\n- Hold each other accountable with kindness\n- Be honest about what you didn't do — and why\n\n### What Makes a Great Partner\n- Shows up consistently\n- Asks questions before offering solutions\n- Remembers what you said last week\n- Challenges you when you're playing small\n- Celebrates your wins as if they were their own",
          },
        },
        {
          item_type: 'checklist',
          title: 'Deep Work Phase Checklist',
          description: 'Track your engagement during Weeks 3-6.',
          order_index: 2,
          content: {
            checklist_items: [
              { title: 'Completed at least 1 hot seat', order_index: 0 },
              { title: 'Attended at least 3 out of 4 group sessions', order_index: 1 },
              { title: 'Met with accountability partner at least 3 times', order_index: 2 },
              { title: 'Shared at least 2 weekly reflections', order_index: 3 },
              { title: 'Gave meaningful feedback to at least 2 cohort members', order_index: 4 },
            ],
          },
        },
        { item_type: 'standup', title: 'Weekly Reflections', description: 'Share your weekly wins, challenges, and commitments', order_index: 3, content: { name: 'Weekly Reflections', visibility: 'members-only', tags: ['reflections', 'accountability'] } },
        { item_type: 'meetup', title: 'Group Coaching Sessions', description: 'Weekly 90-minute group coaching with hot seats and skill practice', order_index: 4, content: { name: 'Group Coaching Sessions', visibility: 'members-only', tags: ['coaching', 'sessions'] } },
      ],
    },
    {
      title: 'Integration',
      description: 'Apply your learnings, celebrate your transformation, and plan your next chapter',
      order_index: 2,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Transformation Reflection',
          description: 'Look back on your 8-week journey and capture what you learned about yourself.',
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: 'assignment',
            body: "# Transformation Reflection\n\n## Look Back\n\n### Where I Started\n- My original goal was: ___\n- I was feeling: ___\n- My biggest fear was: ___\n\n### Where I Am Now\n- What I actually achieved: ___\n- How I feel now: ___\n- What surprised me most: ___\n\n### What I Learned\n- About myself: ___\n- About coaching: ___\n- About community: ___\n\n## Look Forward\n\n### My 90-Day Plan\n- Goal 1: ___\n- Goal 2: ___\n- Goal 3: ___\n\n### How I'll Stay Accountable\n- ___\n\n### What I'll Take With Me\n- One habit I'll continue: ___\n- One mindset shift I'll remember: ___\n- One relationship I'll nurture: ___\n\n## Your Transformation Story\nWrite a 3-5 sentence story of your journey. Share it in the Transformation Stories section during our final session.",
          },
        },
        {
          item_type: 'checklist',
          title: 'Integration Checklist',
          description: 'Final tasks to complete the program.',
          order_index: 1,
          content: {
            checklist_items: [
              { title: 'Completed the Transformation Reflection', order_index: 0 },
              { title: 'Written your 90-day forward plan', order_index: 1 },
              { title: 'Shared your Transformation Story with the cohort', order_index: 2 },
              { title: 'Attended the graduation celebration', order_index: 3 },
              { title: 'Exchanged contact info with cohort members you want to stay connected with', order_index: 4 },
            ],
          },
        },
        { item_type: 'pitch', title: 'Transformation Stories', description: 'Share your coaching journey and transformation with the cohort', order_index: 2, content: { name: 'Transformation Stories', access_level: 'member', tags: ['transformation', 'celebration'], long_description: 'Present your growth journey at the graduation celebration' } },
        { item_type: 'meetup', title: 'Graduation Celebration', description: 'Celebrate your cohort\'s achievements and plan next steps', order_index: 3, content: { name: 'Graduation Celebration', visibility: 'members-only', tags: ['graduation', 'celebration'] } },
        { item_type: 'table', title: '90-Day Forward Plan', description: 'Document your goals and action steps for the next quarter', order_index: 4, content: { name: '90-Day Forward Plan', visibility: 'members-only', tags: ['planning', 'goals'] } },
      ],
    },
  ],
};

// ==========================================
// LEADERSHIP DEVELOPMENT COHORT
// ==========================================

export const LEADERSHIP_DEV_TEMPLATE: ProgramTemplate = {
  version: '1.0',
  export_level: 'full',
  program: {
    name: 'Leadership Development Cohort',
    description: 'A 12-week program for emerging leaders with assessments, coaching, 360 feedback, and an applied leadership project',
    template_id: 'leadership-dev',
    status: 'not-started',
  },
  circle: {
    name: 'Leadership Circle',
    description: 'A confidential peer network for emerging leaders to share challenges, insights, and support',
    visibility: 'private',
    join_type: 'invite-only',
    tags: ['leadership', 'development', 'cohort'],
    mission: 'To develop the next generation of leaders through self-awareness, skill-building, and peer support.',
  },
  journeys: [
    {
      title: 'Self-Discovery',
      description: 'Complete leadership assessments, gather 360 feedback, and identify your development priorities',
      order_index: 0,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Your Leadership Assessment Guide',
          description: 'How to complete and interpret your leadership assessments (StrengthsFinder, DiSC, or EQ-i).',
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: 'document',
            body: "# Leadership Assessment Guide\n\n## Why Assessments?\nSelf-awareness is the foundation of great leadership. Assessments give you objective data about your strengths, blind spots, and tendencies.\n\n## Your Assessments\nComplete the following before Week 2:\n\n### 1. Strengths Assessment\nIdentify your natural talents and how to leverage them.\n- Focus on: your top 5 strengths\n- Key question: How can I lead FROM my strengths?\n\n### 2. Communication Style (DiSC or similar)\nUnderstand your default communication patterns.\n- Focus on: your style under stress vs. at your best\n- Key question: How does my style impact my team?\n\n### 3. 360 Feedback\nGather candid feedback from your manager, peers, and direct reports.\n- We'll send a brief survey to 8-10 people you nominate\n- Focus on: themes and patterns, not individual scores\n- Key question: What's my reputation as a leader?\n\n## Processing Your Results\nAfter receiving results:\n1. Notice what resonates — what feels true?\n2. Notice what surprises you — that's your blind spot\n3. Identify 2-3 development priorities\n4. Share your top insights with your coaching partner",
          },
        },
        {
          item_type: 'document',
          title: 'Leadership Vision Statement',
          description: 'Define the leader you want to become — your values, impact, and legacy.',
          order_index: 1,
          estimated_time: 20,
          content: {
            media_type: 'assignment',
            body: "# Your Leadership Vision\n\n## The Leader I Want to Be\n\n### Values\nList 3-5 values that are non-negotiable for how you lead:\n1. ___\n2. ___\n3. ___\n\n### Impact\nHow do you want people to feel after working with you?\n- My team feels: ___\n- My peers feel: ___\n- My stakeholders feel: ___\n\n### Legacy\nIn 5 years, what do you want people to say about your leadership?\n\"[Your name] was the kind of leader who ___.\"\n\n### Gap Analysis\nBased on your assessments:\n- My biggest strength as a leader: ___\n- My biggest growth area: ___\n- One thing I need to start doing: ___\n- One thing I need to stop doing: ___\n\n### My Development Focus (Pick 2)\n1. ___\n2. ___\n\nShare your Leadership Vision in the cohort introductions.",
          },
        },
        {
          item_type: 'checklist',
          title: 'Self-Discovery Checklist',
          description: 'Complete before Phase 2.',
          order_index: 2,
          content: {
            checklist_items: [
              { title: 'Completed strengths assessment', order_index: 0 },
              { title: 'Completed communication style assessment', order_index: 1 },
              { title: 'Nominated 8-10 people for 360 feedback', order_index: 2 },
              { title: 'Reviewed all assessment results', order_index: 3 },
              { title: 'Written your Leadership Vision Statement', order_index: 4 },
              { title: 'Identified 2 development priorities', order_index: 5 },
              { title: 'Shared insights with your coaching partner', order_index: 6 },
            ],
          },
        },
        { item_type: 'elevator', title: 'Leader Introductions', description: 'Share your leadership journey, strengths, and development focus', order_index: 3, content: { name: 'Leader Introductions', visibility: 'members-only', tags: ['introductions', 'leadership'] } },
        { item_type: 'table', title: 'Assessment Results Dashboard', description: 'Track your assessment scores and development priorities', order_index: 4, content: { name: 'Assessment Results Dashboard', visibility: 'members-only', tags: ['assessments', 'results'] } },
      ],
    },
    {
      title: 'Skill Building',
      description: 'Develop core leadership capabilities through workshops, practice, and peer coaching',
      order_index: 1,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Leadership Skill Modules',
          description: 'Overview of the core leadership skills covered in this phase.',
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: 'document',
            body: "# Core Leadership Skills\n\nOver Weeks 4-8, we'll cover one skill per week:\n\n## Week 4: Coaching Conversations\n- Move from telling to asking\n- Use the GROW model with your team\n- Practice: Coach a peer on a real challenge\n\n## Week 5: Giving Effective Feedback\n- SBI model: Situation, Behavior, Impact\n- Make feedback timely, specific, and actionable\n- Practice: Give feedback to a team member this week\n\n## Week 6: Delegation & Empowerment\n- The delegation spectrum: tell > sell > consult > delegate\n- Matching tasks to development levels\n- Practice: Delegate one thing you've been holding onto\n\n## Week 7: Difficult Conversations\n- Prepare with the DESC framework: Describe, Express, Specify, Consequences\n- Manage emotions (yours and theirs)\n- Practice: Have a conversation you've been avoiding\n\n## Week 8: Strategic Thinking\n- Move from operational to strategic\n- Ask \"why\" before \"how\"\n- Practice: Present a strategic recommendation to the cohort",
          },
        },
        {
          item_type: 'checklist',
          title: 'Skill Building Checklist',
          description: 'Track your practice and learning.',
          order_index: 1,
          content: {
            checklist_items: [
              { title: 'Coached a peer using the GROW model', order_index: 0 },
              { title: 'Gave SBI feedback to a team member', order_index: 1 },
              { title: 'Delegated one task using the delegation spectrum', order_index: 2 },
              { title: 'Had a difficult conversation using DESC', order_index: 3 },
              { title: 'Presented a strategic recommendation', order_index: 4 },
              { title: 'Attended at least 4 out of 5 workshops', order_index: 5 },
            ],
          },
        },
        { item_type: 'meetup', title: 'Leadership Workshops', description: 'Weekly 2-hour workshops on core leadership skills', order_index: 2, content: { name: 'Leadership Workshops', visibility: 'members-only', tags: ['workshops', 'skills'] } },
        { item_type: 'standup', title: 'Practice Reflections', description: 'Share what you practiced this week and what you learned', order_index: 3, content: { name: 'Practice Reflections', visibility: 'members-only', tags: ['practice', 'reflections'] } },
        { item_type: 'build', title: 'Leadership Playbook', description: 'Build your personal leadership playbook with frameworks and tools', order_index: 4, content: { name: 'Leadership Playbook', visibility: 'members-only', tags: ['playbook', 'tools'] } },
      ],
    },
    {
      title: 'Applied Leadership Project',
      description: 'Lead a real initiative while receiving coaching, peer support, and stakeholder feedback',
      order_index: 2,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Applied Project Guide',
          description: 'How to select, scope, and execute your leadership project.',
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: 'document',
            body: "# Applied Leadership Project\n\n## Purpose\nApply what you've learned by leading a real initiative in your organization. This is where theory becomes practice.\n\n## Project Criteria\nYour project should:\n- Be completable in 4 weeks\n- Require you to use at least 2 skills from the Skill Building phase\n- Involve working with or through others (not a solo task)\n- Have a visible outcome or deliverable\n\n## Examples\n- Lead a cross-functional team to solve a specific problem\n- Design and deliver a team development initiative\n- Have a series of feedback/coaching conversations with your direct reports\n- Propose and implement a process improvement\n\n## Project Plan\n1. **What**: Describe the project in 2-3 sentences\n2. **Why**: How does this stretch your leadership?\n3. **Who**: Who's involved? What's your role?\n4. **When**: What's the timeline?\n5. **How you'll measure success**: What will be different when it's done?\n\n## Weekly Updates\nShare your progress in the Project Updates standup each week.",
          },
        },
        {
          item_type: 'checklist',
          title: 'Project Checklist',
          description: 'Track your project milestones.',
          order_index: 1,
          content: {
            checklist_items: [
              { title: 'Defined and scoped your project', order_index: 0 },
              { title: 'Got buy-in from your manager or sponsor', order_index: 1 },
              { title: 'Shared your project plan with the cohort', order_index: 2 },
              { title: 'Completed Week 1 of the project', order_index: 3 },
              { title: 'Completed Week 2 of the project', order_index: 4 },
              { title: 'Completed Week 3 of the project', order_index: 5 },
              { title: 'Completed Week 4 of the project', order_index: 6 },
              { title: 'Prepared your Impact Presentation', order_index: 7 },
            ],
          },
        },
        { item_type: 'standup', title: 'Project Updates', description: 'Weekly progress updates on your applied leadership project', order_index: 2, content: { name: 'Project Updates', visibility: 'members-only', tags: ['project', 'updates'] } },
        { item_type: 'meetup', title: 'Coaching Office Hours', description: '1:1 coaching check-ins on your project', order_index: 3, content: { name: 'Coaching Office Hours', visibility: 'members-only', tags: ['coaching', '1-on-1'] } },
        { item_type: 'pitch', title: 'Impact Presentations', description: 'Present your project outcomes and leadership learnings to the cohort', order_index: 4, content: { name: 'Impact Presentations', access_level: 'member', tags: ['impact', 'presentation'], long_description: 'Share what you did, what you learned, and how you grew as a leader' } },
      ],
    },
  ],
};

// ==========================================
// MASTERMIND CIRCLE
// ==========================================

export const MASTERMIND_TEMPLATE: ProgramTemplate = {
  version: '1.0',
  export_level: 'full',
  program: {
    name: 'Mastermind Circle',
    description: 'A 6-month peer mastermind with rotating hot seats, accountability partnerships, and quarterly goal reviews',
    template_id: 'mastermind',
    status: 'not-started',
  },
  circle: {
    name: 'Mastermind Circle',
    description: 'A confidential space for peer advisory, strategic thinking, and mutual support',
    visibility: 'private',
    join_type: 'invite-only',
    tags: ['mastermind', 'peer-advisory', 'strategy'],
    mission: 'To accelerate each member\'s growth through the collective wisdom and support of the group.',
  },
  journeys: [
    {
      title: 'Q1: Launch & Align',
      description: 'Form the group, set quarterly goals, and establish the mastermind rhythm',
      order_index: 0,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Mastermind Operating Guide',
          description: 'How the mastermind works — format, rhythm, roles, and norms.',
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: 'document',
            body: "# Mastermind Operating Guide\n\n## Session Format (90 min, twice monthly)\n\n### Opening (10 min)\n- Quick check-in: energy level 1-10, one-word mood\n- Wins since last session\n\n### Hot Seat (60 min, 2 members x 30 min)\n**The Hot Seat Member:**\n1. Presents their challenge or opportunity (5 min)\n2. States their specific ask (1 min)\n3. Listens as the group asks questions (10 min)\n4. Receives insights and suggestions (10 min)\n5. States their action commitment (4 min)\n\n### Closing (20 min)\n- Key takeaways from each member\n- Action commitments for next 2 weeks\n- Schedule: who's on the hot seat next time?\n\n## Roles\n- **Facilitator** (rotates): keeps time, manages flow\n- **Hot Seat** (rotates): presents challenge\n- **Advisory Board** (everyone else): asks questions, shares insights\n\n## Sacred Rules\n1. Vegas Rule: what's shared stays in the room\n2. No unsolicited advice — ask first\n3. Challenge with love — honesty is a gift\n4. Honor time commitments\n5. Follow through on your commitments",
          },
        },
        {
          item_type: 'document',
          title: 'Quarterly Goal Setting',
          description: 'Set your Q1 goals and share them with the mastermind.',
          order_index: 1,
          estimated_time: 20,
          content: {
            media_type: 'assignment',
            body: "# Q1 Goals\n\n## Your Big 3\nIdentify the 3 most important outcomes for this quarter.\n\n### Goal 1: ___\n- Why it matters: ___\n- Key milestones: ___\n- How the mastermind can help: ___\n\n### Goal 2: ___\n- Why it matters: ___\n- Key milestones: ___\n- How the mastermind can help: ___\n\n### Goal 3: ___\n- Why it matters: ___\n- Key milestones: ___\n- How the mastermind can help: ___\n\n## Success Metrics\nAt the end of Q1, I'll consider it successful if:\n1. ___\n2. ___\n3. ___\n\n## Accountability\nI want the group to hold me accountable by: ___",
          },
        },
        {
          item_type: 'checklist',
          title: 'Q1 Launch Checklist',
          description: 'Get the mastermind off to a strong start.',
          order_index: 2,
          content: {
            checklist_items: [
              { title: 'Completed your member profile and introduction', order_index: 0 },
              { title: 'Set your Q1 Big 3 goals', order_index: 1 },
              { title: 'Shared goals with the mastermind', order_index: 2 },
              { title: 'Attended the launch session', order_index: 3 },
              { title: 'Completed your first hot seat', order_index: 4 },
            ],
          },
        },
        { item_type: 'elevator', title: 'Member Profiles', description: 'Share your background, expertise, and what you bring to the group', order_index: 3, content: { name: 'Member Profiles', visibility: 'members-only', tags: ['profiles', 'introductions'] } },
        { item_type: 'meetup', title: 'Mastermind Sessions', description: 'Bi-monthly mastermind meetings with rotating hot seats', order_index: 4, content: { name: 'Mastermind Sessions', visibility: 'members-only', tags: ['mastermind', 'hot-seat'] } },
        { item_type: 'table', title: 'Goal Dashboard', description: 'Track everyone\'s quarterly goals and progress', order_index: 5, content: { name: 'Goal Dashboard', visibility: 'members-only', tags: ['goals', 'tracking'] } },
      ],
    },
    {
      title: 'Q2: Deepen & Accelerate',
      description: 'Review Q1 results, set Q2 goals, and go deeper on challenges',
      order_index: 1,
      status: 'not-started',
      containers: [],
      items: [
        {
          item_type: 'document',
          title: 'Quarterly Review & Reset',
          description: 'Reflect on Q1, celebrate wins, learn from misses, and set Q2 goals.',
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: 'assignment',
            body: "# Quarterly Review & Reset\n\n## Q1 Review\n\n### Goal 1: ___\n- Result: ___\n- What worked: ___\n- What I'd do differently: ___\n\n### Goal 2: ___\n- Result: ___\n- What worked: ___\n- What I'd do differently: ___\n\n### Goal 3: ___\n- Result: ___\n- What worked: ___\n- What I'd do differently: ___\n\n## Biggest Learning from Q1: ___\n\n## Q2 Big 3 Goals\n1. ___\n2. ___\n3. ___\n\n## What I Need from the Mastermind in Q2: ___",
          },
        },
        { item_type: 'standup', title: 'Monthly Check-ins', description: 'Quick monthly updates on progress and priorities', order_index: 1, content: { name: 'Monthly Check-ins', visibility: 'members-only', tags: ['check-ins', 'progress'] } },
        { item_type: 'build', title: 'Resource Vault', description: 'Shared tools, templates, and resources contributed by members', order_index: 2, content: { name: 'Resource Vault', visibility: 'members-only', tags: ['resources', 'tools'] } },
      ],
    },
  ],
};

// ==========================================
// EXPORTS
// ==========================================

export const PROGRAM_TEMPLATE_LIST: ProgramTemplate[] = [
  GROUP_COACHING_TEMPLATE,
  LEADERSHIP_DEV_TEMPLATE,
  MASTERMIND_TEMPLATE,
  DESIGN_THINKING_PROGRAM,
];

export const PROGRAM_TEMPLATE_LIBRARY: Record<string, ProgramTemplate> = {
  'group-coaching': GROUP_COACHING_TEMPLATE,
  'leadership-dev': LEADERSHIP_DEV_TEMPLATE,
  'mastermind': MASTERMIND_TEMPLATE,
  'design-thinking-sprint': DESIGN_THINKING_PROGRAM,
};
