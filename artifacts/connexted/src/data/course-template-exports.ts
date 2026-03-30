/**
 * Pre-built Course & Program Templates (with content items)
 *
 * Complete, importable templates that include actual journey content
 * (documents, episodes, checklists, decks) — not just structural shells.
 *
 * Both courses and programs use the same JourneyContentItem types.
 *
 * Templates are coaching and professional development focused
 * to match the Connexted platform.
 */

import type { CourseTemplate, ProgramTemplate } from "@/types/templates";

// ============================================================================
// COURSE: Coaching Foundations
// ============================================================================

export const COACHING_FOUNDATIONS_COURSE: CourseTemplate = {
  version: "1.0",
  export_level: "full",

  course: {
    title: "Coaching Foundations",
    description:
      "Learn the core skills of professional coaching — active listening, powerful questioning, goal setting, and accountability frameworks. Built for aspiring coaches, managers, and leaders who want to coach effectively.",
    difficulty_level: "beginner",
    pricing_type: "free",
    category: "coaching",
    tags: ["coaching", "listening", "questions", "goals", "leadership"],
    learning_objectives: [
      "Understand the core competencies of professional coaching",
      "Practice active listening and presence techniques",
      "Ask powerful questions that unlock insight",
      "Use the GROW model to structure coaching conversations",
      "Build accountability without micromanaging",
    ],
    requirements: [
      "No prior coaching experience required",
      "Willingness to practice with a peer or colleague",
      "A journal or notebook for reflections",
    ],
    duration_hours: 8,
    total_lessons: 12,
  },

  journeys: [
    {
      title: "Module 1: What Is Coaching?",
      description:
        "Understand the coaching mindset, how it differs from mentoring and consulting, and when to use each approach.",
      order_index: 0,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "The Coaching Mindset",
          description: "How coaching differs from mentoring, consulting, and therapy — and why it matters.",
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: "document",
            body: "# The Coaching Mindset\n\n## Coaching vs. Other Helping Modalities\n\n| Approach | Focus | Expertise | Direction |\n|----------|-------|-----------|----------|\n| **Coaching** | Client's agenda | Client is the expert on their life | Client decides next steps |\n| **Mentoring** | Mentor's experience | Mentor shares what worked for them | Mentor suggests direction |\n| **Consulting** | Problem diagnosis | Consultant brings expertise | Consultant prescribes solutions |\n| **Therapy** | Past patterns & healing | Therapist has clinical training | Therapist facilitates healing |\n\n## Core Beliefs of Coaching\n1. **The client is whole and capable** — they have the answers within them\n2. **Coaching is partnership** — coach and client are equals\n3. **Awareness precedes change** — insight drives action\n4. **The client sets the agenda** — not the coach\n\n## When to Coach vs. When NOT to Coach\n- **Coach when**: someone needs clarity, motivation, accountability, or perspective\n- **Mentor when**: someone needs specific expertise you have\n- **Refer when**: someone needs clinical/therapeutic support\n\n## The Coaching Stance\nBe curious, not certain. Ask, don't tell. Trust the process.",
          },
        },
        {
          item_type: "document",
          title: "ICF Core Competencies Overview",
          description: "A practical summary of the International Coaching Federation's 8 core competencies.",
          order_index: 1,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# ICF Core Competencies\n\nThe International Coaching Federation defines 8 core competencies grouped into 4 domains:\n\n## A. Foundation\n1. **Demonstrates Ethical Practice** — Integrity, confidentiality, professional boundaries\n2. **Embodies a Coaching Mindset** — Open, curious, flexible, client-centered\n\n## B. Co-Creating the Relationship\n3. **Establishes and Maintains Agreements** — Clear expectations, goals, logistics\n4. **Cultivates Trust and Safety** — Psychological safety, respect, empathy\n\n## C. Communicating Effectively\n5. **Maintains Presence** — Fully engaged, manages emotions, comfortable with silence\n6. **Listens Actively** — Hears beyond words, notices patterns, reflects back\n7. **Evokes Awareness** — Powerful questions, reframing, challenging assumptions\n\n## D. Cultivating Learning and Growth\n8. **Facilitates Client Growth** — Goal setting, accountability, celebrates progress\n\n## Your Learning Journey\nIn this course, we'll focus on competencies 5, 6, 7, and 8 — the practical skills you'll use in every coaching conversation.",
          },
        },
        {
          item_type: "checklist",
          title: "Module 1 Checkpoint",
          description: "Verify your understanding before moving on.",
          order_index: 2,
          content: {
            checklist_items: [
              { title: "I can explain the difference between coaching, mentoring, and consulting", order_index: 0 },
              { title: "I understand the 4 core beliefs of coaching", order_index: 1 },
              { title: "I can name the 8 ICF core competencies", order_index: 2 },
              { title: "I've reflected on which competencies are strongest/weakest for me", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Module 2: Active Listening & Presence",
      description:
        "Develop deep listening skills — hearing beyond words, noticing body language, and creating space for insight.",
      order_index: 1,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Three Levels of Listening",
          description: "Move from surface-level hearing to deep, intuitive listening.",
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: "document",
            body: "# Three Levels of Listening\n\n## Level 1: Internal Listening\n- Focus is on **your own thoughts, reactions, judgments**\n- You're thinking about what to say next\n- This is where most people live in conversation\n- In coaching: this is where you start — but you must move past it\n\n## Level 2: Focused Listening\n- Full attention on the **client's words, tone, emotions**\n- You hear what they say AND what they don't say\n- You notice shifts in energy, pauses, changes in voice\n- In coaching: this is your primary operating level\n\n## Level 3: Global Listening\n- Awareness of the **entire environment and energy**\n- You sense the mood in the room, unspoken dynamics\n- You trust your intuition and share what you notice\n- In coaching: this is where breakthroughs happen\n\n## Practice Exercise\nHave a 10-minute conversation with someone. For the first 3 minutes, notice when you're at Level 1. Then consciously shift to Level 2. In the last 3 minutes, try Level 3 — share what you sense beyond the words.\n\n## The Power of Silence\nAfter asking a question, count to 10 silently. The client's best thinking often happens in that silence. Resist the urge to fill it.",
          },
        },
        {
          item_type: "document",
          title: "Presence in Practice",
          description: "How to show up fully in a coaching conversation — managing distractions, emotions, and agenda.",
          order_index: 1,
          estimated_time: 10,
          content: {
            media_type: "document",
            body: "# Presence in Practice\n\n## What Presence Looks Like\n- Full eye contact (or full attention on a call)\n- Body language that says \"I'm here with you\"\n- No multitasking — phone away, tabs closed\n- Emotional regulation — your calm creates their safety\n\n## Pre-Session Ritual (2 minutes)\n1. Close all other apps/tabs\n2. Take 3 deep breaths\n3. Set an intention: \"I am here for this person\"\n4. Release any agenda — you don't need to fix anything\n\n## When You Lose Presence\nIt happens to everyone. When you notice:\n1. Name it internally: \"I drifted\"\n2. Re-anchor: feel your feet on the floor\n3. Re-engage: \"I want to make sure I'm tracking — can you say more about that?\"\n\n## The Paradox of Presence\nThe more you try to be present, the less present you are. Presence is not something you do — it's something you allow when you stop doing everything else.",
          },
        },
        {
          item_type: "deck",
          title: "Active Listening Flashcards",
          description: "Practice recognizing listening levels and presence techniques.",
          order_index: 2,
          estimated_time: 10,
          content: {
            cards: [
              { front: "What is Level 1 Listening?", back: "Internal Listening — focus on your own thoughts and reactions. You're thinking about what to say next.", order_index: 0 },
              { front: "What is Level 2 Listening?", back: "Focused Listening — full attention on the client's words, tone, emotions, and what they're NOT saying.", order_index: 1 },
              { front: "What is Level 3 Listening?", back: "Global Listening — awareness of the entire environment, energy, unspoken dynamics. Trust your intuition.", order_index: 2 },
              { front: "How long should you wait after asking a question?", back: "Count to 10 silently. The client's best thinking often happens in the silence.", order_index: 3 },
              { front: "What should you do when you lose presence?", back: "1. Name it internally, 2. Re-anchor (feet on floor), 3. Re-engage with curiosity.", order_index: 4 },
            ],
          },
        },
        {
          item_type: "checklist",
          title: "Module 2 Checkpoint",
          description: "Practice tasks to build your listening muscles.",
          order_index: 3,
          content: {
            checklist_items: [
              { title: "Practiced the 3-level listening exercise with a partner", order_index: 0 },
              { title: "Created and used a pre-session presence ritual", order_index: 1 },
              { title: "Had a conversation where I counted to 10 after each question", order_index: 2 },
              { title: "Journaled about what I noticed at each listening level", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Module 3: Powerful Questions",
      description:
        "Learn to ask questions that create insight, challenge assumptions, and move clients forward.",
      order_index: 2,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "The Art of Powerful Questions",
          description: "What makes a question powerful, and a library of go-to coaching questions.",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# The Art of Powerful Questions\n\n## What Makes a Question Powerful?\n- **Open-ended** — can't be answered with yes/no\n- **Forward-focused** — moves toward possibility, not blame\n- **Simple** — short questions create the deepest thinking\n- **Curious** — comes from genuine interest, not judgment\n- **Challenging** — invites the client to think differently\n\n## Questions to Avoid\n- Leading questions: \"Don't you think you should...?\"\n- Multiple questions: \"What do you want, and how will you get there, and when?\"\n- \"Why\" questions (can feel judgmental): \"Why did you do that?\"\n  - Better: \"What was behind that decision?\"\n\n## Powerful Questions Library\n\n### Exploring\n- \"What matters most to you about this?\"\n- \"What's really going on here?\"\n- \"What are you not saying?\"\n\n### Challenging\n- \"What would you do if you weren't afraid?\"\n- \"What assumption are you making?\"\n- \"What would [person you admire] do?\"\n\n### Moving Forward\n- \"What's the smallest next step?\"\n- \"What does success look like?\"\n- \"What would make this a 10 out of 10?\"\n\n### Deepening\n- \"What else?\" (the most powerful 2-word question in coaching)\n- \"Say more about that.\"\n- \"What's underneath that feeling?\"\n\n## The Golden Rule\nAsk the question, then STOP. Let the silence do the work.",
          },
        },
        {
          item_type: "checklist",
          title: "Module 3 Checkpoint",
          description: "Practice using powerful questions in real conversations.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Practiced asking only open-ended questions for 15 minutes", order_index: 0 },
              { title: "Used 'What else?' at least 3 times in a conversation", order_index: 1 },
              { title: "Asked a question that surprised the other person into new thinking", order_index: 2 },
              { title: "Caught myself asking a leading question and reframed it", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Module 4: The GROW Model",
      description:
        "Structure your coaching conversations with the GROW framework — Goal, Reality, Options, Will.",
      order_index: 3,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "GROW Model Deep Dive",
          description: "A step-by-step guide to running a coaching conversation using GROW.",
          order_index: 0,
          estimated_time: 25,
          content: {
            media_type: "document",
            body: "# The GROW Model\n\nDeveloped by Sir John Whitmore, GROW is the most widely used coaching framework in the world.\n\n## G — Goal\n**What do you want?**\n\nClarify the outcome for this conversation AND the bigger goal.\n- \"What would you like to focus on today?\"\n- \"What would make this conversation valuable for you?\"\n- \"Where do you want to be in 90 days regarding this?\"\n\n## R — Reality\n**Where are you now?**\n\nExplore the current situation without judgment.\n- \"What's happening right now?\"\n- \"On a scale of 1-10, where are you?\"\n- \"What have you tried so far? What worked?\"\n- \"What's getting in the way?\"\n\n## O — Options\n**What could you do?**\n\nBrainstorm possibilities without evaluating yet.\n- \"What are your options?\"\n- \"What else could you try?\" (keep asking)\n- \"If there were no constraints, what would you do?\"\n- \"Who could help you with this?\"\n\n## W — Will (Way Forward)\n**What WILL you do?**\n\nConvert options into commitments.\n- \"Which option resonates most?\"\n- \"What specifically will you do?\"\n- \"By when?\"\n- \"How will you hold yourself accountable?\"\n- \"On a scale of 1-10, how committed are you?\"\n  - If less than 8: \"What would make it a 9?\"\n\n## Session Flow (45-60 minutes)\n| Phase | Time | Focus |\n|-------|------|-------|\n| Goal | 5 min | Clarify today's topic |\n| Reality | 15 min | Explore current state |\n| Options | 15 min | Generate possibilities |\n| Will | 10 min | Commit to action |\n\n## Pro Tips\n- Don't rush through Goal — a clear goal makes everything else easier\n- Spend the most time in Reality — this is where awareness happens\n- In Options, quantity beats quality — brainstorm before evaluating\n- Will must include a specific action, timeline, and accountability",
          },
        },
        {
          item_type: "checklist",
          title: "Module 4 Checkpoint",
          description: "Run your first GROW coaching conversation.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Practiced a full GROW conversation with a peer (30+ minutes)", order_index: 0 },
              { title: "The coachee identified at least 3 options", order_index: 1 },
              { title: "The coachee committed to a specific action with a deadline", order_index: 2 },
              { title: "Followed up with the coachee within 1 week", order_index: 3 },
              { title: "Reflected on what went well and what to improve", order_index: 4 },
            ],
          },
        },
      ],
    },
  ],
};

// ============================================================================
// COURSE: Building Your Coaching Business
// ============================================================================

export const COACHING_BUSINESS_COURSE: CourseTemplate = {
  version: "1.0",
  export_level: "full",

  course: {
    title: "Building Your Coaching Business",
    description:
      "Turn your coaching skills into a sustainable business. Learn to define your niche, attract clients, price your services, and deliver results that generate referrals.",
    difficulty_level: "intermediate",
    pricing_type: "paid",
    category: "business",
    tags: ["coaching-business", "marketing", "pricing", "niche", "clients"],
    learning_objectives: [
      "Define your coaching niche and ideal client profile",
      "Create a compelling offer and pricing structure",
      "Build a client pipeline without feeling salesy",
      "Deliver coaching engagements that generate referrals",
      "Set up systems for scheduling, payments, and client management",
    ],
    requirements: [
      "Basic coaching skills (or completion of Coaching Foundations)",
      "Clarity on wanting to coach professionally",
      "Willingness to put yourself out there",
    ],
    duration_hours: 10,
    total_lessons: 14,
  },

  journeys: [
    {
      title: "Module 1: Finding Your Niche",
      description:
        "Define who you serve, what transformation you provide, and why clients should choose you.",
      order_index: 0,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "The Niche Framework",
          description: "How to find the intersection of your expertise, passion, and market demand.",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# Finding Your Coaching Niche\n\n## The 3-Circle Framework\nYour ideal niche lives at the intersection of:\n\n1. **What you're great at** — skills, experience, certifications\n2. **What you love doing** — topics that energize you\n3. **What people will pay for** — real market demand\n\n## Niche Dimensions\n\n### Who (Target Client)\n- Demographics: age, career stage, industry\n- Psychographics: values, challenges, aspirations\n- Situation: what trigger brings them to coaching?\n\n### What (Transformation)\n- From: current painful state\n- To: desired future state\n- Duration: how long does the transformation take?\n\n### How (Your Method)\n- What's your unique approach?\n- What frameworks or models do you use?\n- What makes your coaching different?\n\n## Examples of Strong Niches\n- \"I help new managers in tech companies become confident leaders in their first 90 days\"\n- \"I help burned-out professionals redesign their careers around their values\"\n- \"I help entrepreneurs scale from solopreneur to team leader without losing their culture\"\n\n## Exercise: Your Niche Statement\nI help [WHO] to [TRANSFORMATION] through [HOW], so they can [OUTCOME].\n\nDraft it 3 times. Each version should get more specific.",
          },
        },
        {
          item_type: "document",
          title: "Validating Your Niche",
          description: "How to test whether your niche has real demand before building your business around it.",
          order_index: 1,
          estimated_time: 15,
          content: {
            media_type: "assignment",
            body: "# Niche Validation Playbook\n\n## Step 1: Talk to 10 People in Your Target Market\nDon't sell. Just learn.\n- \"What's the biggest challenge you're facing at work right now?\"\n- \"Have you ever considered coaching? What stopped you?\"\n- \"If coaching could solve one problem for you, what would it be?\"\n- \"What would that be worth to you?\"\n\n## Step 2: Check Existing Demand\n- Are there coaches already serving this niche? (Good — it means there's demand)\n- Are people searching for help with this problem online?\n- Are there communities, forums, or groups for your target audience?\n\n## Step 3: Test with a Free Offer\nOffer 5 free discovery sessions to people in your target market.\n- Did they show up?\n- Was the conversation energizing for both of you?\n- Did they express interest in continuing?\n\n## Validation Scorecard\n- [ ] 10 people said this problem is real and painful\n- [ ] At least 3 said they'd pay for help\n- [ ] 5 people booked free discovery sessions\n- [ ] At least 2 wanted to continue after the free session\n\nIf you can check all 4 boxes, you have a validated niche.",
          },
        },
        {
          item_type: "checklist",
          title: "Module 1 Checkpoint",
          description: "Validate your niche before moving on.",
          order_index: 2,
          content: {
            checklist_items: [
              { title: "Completed the 3-Circle Framework exercise", order_index: 0 },
              { title: "Written 3 drafts of your niche statement", order_index: 1 },
              { title: "Talked to at least 5 people in your target market", order_index: 2 },
              { title: "Completed the Validation Scorecard", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Module 2: Your Offer & Pricing",
      description:
        "Design coaching packages that deliver transformation and price them with confidence.",
      order_index: 1,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Designing Your Coaching Offer",
          description: "How to structure coaching packages, not hourly rates.",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# Designing Your Coaching Offer\n\n## Don't Sell Hours — Sell Transformation\nClients don't want 6 sessions. They want to become a confident leader, land their dream job, or build a thriving business.\n\n## Package Structure\n\n### Discovery Package (Starter)\n- 3 sessions over 6 weeks\n- Best for: clients who want a quick win or to test coaching\n- Price range: $500-$1,500\n\n### Signature Program (Core)\n- 6-12 sessions over 3-6 months\n- Includes assessments, resources, between-session support\n- Best for: meaningful transformation\n- Price range: $2,000-$5,000\n\n### Premium/VIP (High-touch)\n- 12+ sessions over 6-12 months\n- Includes unlimited messaging, emergency sessions\n- Best for: executives, high-stakes situations\n- Price range: $5,000-$15,000+\n\n## What to Include Beyond Sessions\n- Pre-session reflection prompts\n- Between-session accountability (email/messaging)\n- Assessments (StrengthsFinder, DiSC, 360)\n- Resource library access\n- Session recordings/notes\n\n## Pricing Psychology\n1. Price based on value, not time\n2. Offer 3 tiers (anchoring effect)\n3. Always include a payment plan option\n4. Never apologize for your price",
          },
        },
        {
          item_type: "checklist",
          title: "Module 2 Checkpoint",
          description: "Design your first coaching package.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Designed at least 2 coaching package tiers", order_index: 0 },
              { title: "Set prices based on transformation value, not hourly rate", order_index: 1 },
              { title: "Created a payment plan option for your signature program", order_index: 2 },
              { title: "Written a 1-paragraph description of your signature offer", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Module 3: Finding Clients",
      description:
        "Build a client pipeline through authentic relationship building, content, and referrals.",
      order_index: 2,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "The Client Attraction System",
          description: "How to find coaching clients without being pushy or salesy.",
          order_index: 0,
          estimated_time: 25,
          content: {
            media_type: "document",
            body: "# The Client Attraction System\n\n## The Anti-Sales Approach\nYou don't need to be salesy. You need to be helpful, visible, and clear.\n\n## 3 Pillars of Client Attraction\n\n### 1. Content (Visibility)\nShare your coaching perspective regularly:\n- LinkedIn posts about your niche topics\n- Short articles or case studies (anonymized)\n- Speak at events, podcasts, workshops\n- Goal: be the person people think of when they need coaching\n\n### 2. Conversations (Connection)\nHave genuine conversations, not pitches:\n- Offer free workshops or webinars (group format)\n- Host discovery sessions (1:1, 30 minutes)\n- Network in communities where your ideal clients hang out\n- Ask \"How can I help?\" not \"Do you need coaching?\"\n\n### 3. Community (Referrals)\nBuild relationships that generate referrals:\n- Deliver exceptional results (the best marketing)\n- Ask happy clients for referrals (with a specific ask)\n- Build a referral network with complementary professionals\n- Create a community for past and current clients\n\n## The Discovery Session Framework\n1. Build rapport (5 min)\n2. Understand their situation (10 min)\n3. Explore their desired outcome (5 min)\n4. Share how coaching could help (5 min)\n5. Discuss fit and next steps (5 min)\n\n## Key Metric\nAim for 3-5 discovery sessions per week when building your practice.",
          },
        },
        {
          item_type: "checklist",
          title: "Module 3 Checkpoint",
          description: "Build your client pipeline.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Published 3 pieces of content related to your niche", order_index: 0 },
              { title: "Conducted at least 3 discovery sessions", order_index: 1 },
              { title: "Asked 2 people for referrals", order_index: 2 },
              { title: "Joined 1 community where your ideal clients gather", order_index: 3 },
            ],
          },
        },
      ],
    },
  ],
};

// ============================================================================
// PROGRAM: Design Thinking Sprint (with content items)
// ============================================================================

export const DESIGN_THINKING_PROGRAM: ProgramTemplate = {
  version: "1.0",
  export_level: "full",

  program: {
    name: "Design Thinking Sprint",
    description:
      "A 5-day design sprint program for teams to solve complex problems through empathy, ideation, prototyping, and testing.",
    template_id: "design-thinking-sprint",
    status: "not-started",
  },

  circle: {
    name: "Sprint Team",
    description: "Collaborate with your sprint team throughout the design thinking process.",
    visibility: "private",
    join_type: "invite-only",
    tags: ["design-thinking", "innovation", "sprint"],
  },

  journeys: [
    {
      title: "Day 1: Empathize",
      description: "Understand the problem deeply through user research and empathy mapping.",
      order_index: 0,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Empathy Research Guide",
          description: "How to conduct user interviews and build empathy maps.",
          order_index: 0,
          estimated_time: 30,
          content: {
            media_type: "document",
            body: "# Empathy Research Guide\n\n## Why Empathy First?\nDesign thinking starts with understanding the human experience. Before we solve anything, we need to feel what our users feel.\n\n## User Interview Process\n1. **Prepare 5-7 open-ended questions** about their experience\n2. **Interview 3-5 users** (in person or video call)\n3. **Listen for emotions**, not just facts\n4. **Capture exact quotes** — their words are gold\n\n## Empathy Map Template\nFor each user, fill in:\n- **Says**: Direct quotes from the interview\n- **Thinks**: What they might be thinking but not saying\n- **Feels**: Emotions they expressed or you sensed\n- **Does**: Actions and behaviors you observed\n\n## Synthesis\nAfter all interviews, look for patterns:\n- What surprised you?\n- What pain points came up repeatedly?\n- What unmet needs did you discover?",
          },
        },
        {
          item_type: "checklist",
          title: "Day 1 Checklist",
          description: "Complete before Day 2.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Conducted at least 3 user interviews", order_index: 0 },
              { title: "Created empathy maps for each user", order_index: 1 },
              { title: "Identified top 3 pain points", order_index: 2 },
              { title: "Shared findings with the sprint team", order_index: 3 },
            ],
          },
        },
      ],
    },
    {
      title: "Day 2: Define",
      description: "Synthesize research into clear problem statements and design challenges.",
      order_index: 1,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Problem Framing Workshop",
          description: "How to write 'How Might We' statements that inspire creative solutions.",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# Problem Framing\n\n## From Insights to 'How Might We'\n\nTake your empathy research and transform pain points into design opportunities.\n\n### Formula\n\"How might we [action] for [user] so that [outcome]?\"\n\n### Examples\n- Insight: \"New managers feel overwhelmed by feedback conversations\"\n- HMW: \"How might we make feedback conversations feel safe and productive for new managers?\"\n\n### Rules\n- Not too broad (\"How might we fix management?\")\n- Not too narrow (\"How might we create a feedback form?\")\n- Inspiring but grounded in real user needs\n\n## Priority Matrix\nMap your HMW statements on two axes:\n- **Impact**: How much would solving this matter to users?\n- **Feasibility**: How realistic is it to solve within our constraints?\n\nFocus on high-impact, high-feasibility challenges for ideation.",
          },
        },
        {
          item_type: "checklist",
          title: "Day 2 Checklist",
          description: "Complete before Day 3.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Generated at least 5 'How Might We' statements", order_index: 0 },
              { title: "Voted on top 2-3 HMW challenges", order_index: 1 },
              { title: "Selected one primary challenge for ideation", order_index: 2 },
            ],
          },
        },
      ],
    },
    {
      title: "Day 3: Ideate",
      description: "Generate a wide range of creative solutions through structured brainstorming.",
      order_index: 2,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Ideation Techniques",
          description: "Structured brainstorming methods that go beyond 'just think of ideas.'",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# Ideation Techniques\n\n## Rules of Brainstorming\n1. **Defer judgment** — no critiquing during ideation\n2. **Go for quantity** — aim for 50+ ideas\n3. **Build on others' ideas** — \"Yes, and...\"\n4. **Be wild** — impractical ideas inspire practical ones\n\n## Technique 1: Crazy 8s\n- Fold paper into 8 sections\n- Set timer for 8 minutes\n- Sketch one idea per section (1 minute each)\n- Share and discuss\n\n## Technique 2: SCAMPER\nTake an existing solution and apply each lens:\n- **S**ubstitute — What can you replace?\n- **C**ombine — What can you merge?\n- **A**dapt — What can you borrow from elsewhere?\n- **M**odify — What can you change in scale or form?\n- **P**ut to other use — How else could this be used?\n- **E**liminate — What can you remove?\n- **R**earrange — What can you reorder?\n\n## Converging\nAfter generating ideas, use dot voting:\n- Each person gets 3 votes\n- Vote on the ideas with the most potential\n- Discuss the top-voted ideas\n- Select 1-2 to prototype",
          },
        },
        {
          item_type: "checklist",
          title: "Day 3 Checklist",
          description: "Complete before Day 4.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Generated 30+ ideas using structured techniques", order_index: 0 },
              { title: "Conducted dot voting to prioritize", order_index: 1 },
              { title: "Selected 1-2 ideas to prototype", order_index: 2 },
            ],
          },
        },
      ],
    },
    {
      title: "Day 4: Prototype",
      description: "Build quick, testable prototypes — just enough to learn from users.",
      order_index: 3,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "Rapid Prototyping Guide",
          description: "Build something testable in hours, not weeks.",
          order_index: 0,
          estimated_time: 15,
          content: {
            media_type: "document",
            body: "# Rapid Prototyping\n\n## The Golden Rule\n*Build just enough to learn. Not more.*\n\n## Prototype Types\n\n| Type | Best For | Time |\n|------|----------|------|\n| Paper sketch | Flow & layout | 30 min |\n| Clickable wireframe | Digital products | 2-3 hours |\n| Role play | Services | 30 min |\n| Storyboard | Experiences | 1 hour |\n| Landing page | Value proposition | 2 hours |\n\n## What to Prototype\n- The core value moment (the \"aha\")\n- The first interaction\n- The hardest part\n\n## What NOT to Prototype\n- Every feature\n- Backend/infrastructure\n- Edge cases\n- Perfect visual design",
          },
        },
        {
          item_type: "checklist",
          title: "Day 4 Checklist",
          description: "Complete before Day 5 testing.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Built a testable prototype for your top idea", order_index: 0 },
              { title: "Prepared a test script with 5 tasks for users", order_index: 1 },
              { title: "Scheduled 3-5 user tests for Day 5", order_index: 2 },
            ],
          },
        },
      ],
    },
    {
      title: "Day 5: Test & Learn",
      description: "Put your prototype in front of real users and learn what works.",
      order_index: 4,
      status: "not-started",
      containers: [],
      items: [
        {
          item_type: "document",
          title: "User Testing Playbook",
          description: "How to run effective user tests and synthesize findings.",
          order_index: 0,
          estimated_time: 20,
          content: {
            media_type: "document",
            body: "# User Testing Playbook\n\n## Session Format (30 min per user)\n1. **Intro (3 min)**: Explain the purpose, get consent\n2. **Context (5 min)**: Ask about their current experience\n3. **Tasks (15 min)**: Ask them to complete 3-5 tasks with the prototype\n4. **Debrief (7 min)**: Overall impressions, questions\n\n## During the Test\n- Observe, don't explain\n- Ask: \"What are you thinking?\" (think-aloud protocol)\n- Note: where they struggle, smile, or get confused\n- Never defend the prototype\n\n## After All Tests\nCreate a results grid:\n| Task | User 1 | User 2 | User 3 | Pattern |\n|------|--------|--------|--------|---------|\n| Task 1 | | | | |\n| Task 2 | | | | |\n\n## Decision Framework\n- Pattern of success? Keep it.\n- Pattern of confusion? Redesign it.\n- Mixed results? Test more.\n\n## Next Steps\n- Share findings with stakeholders\n- Decide: iterate, pivot, or ship\n- Document what you learned for future sprints",
          },
        },
        {
          item_type: "checklist",
          title: "Day 5 Checklist",
          description: "Complete the sprint.",
          order_index: 1,
          content: {
            checklist_items: [
              { title: "Tested with at least 3 users", order_index: 0 },
              { title: "Filled in the results grid", order_index: 1 },
              { title: "Identified top 3 findings", order_index: 2 },
              { title: "Made a decision: iterate, pivot, or ship", order_index: 3 },
              { title: "Shared sprint results with the team", order_index: 4 },
            ],
          },
        },
      ],
    },
  ],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const COURSE_TEMPLATE_LIST: CourseTemplate[] = [
  COACHING_FOUNDATIONS_COURSE,
  COACHING_BUSINESS_COURSE,
];

export const COURSE_TEMPLATE_LIBRARY: Record<string, CourseTemplate> = {
  "coaching-foundations": COACHING_FOUNDATIONS_COURSE,
  "coaching-business": COACHING_BUSINESS_COURSE,
};

export const PROGRAM_WITH_CONTENT_LIST: ProgramTemplate[] = [
  DESIGN_THINKING_PROGRAM,
];

export const PROGRAM_WITH_CONTENT_LIBRARY: Record<string, ProgramTemplate> = {
  "design-thinking-sprint": DESIGN_THINKING_PROGRAM,
};
