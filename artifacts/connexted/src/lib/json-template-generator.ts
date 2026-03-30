/**
 * JSON Template Generator
 * 
 * Generates empty JSON templates for all container types with AI prompts
 * to help users understand how to create properly formatted JSON files.
 */
// Split candidate: ~2377 lines — consider splitting into per-container-type modules (e.g., program-templates.ts, circle-templates.ts, journey-templates.ts) and an index re-export.

import { downloadJSON } from '@/lib/json-schemas';

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

export function generateTableTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "tables",
      platform: "CONNEXTED LABS"
    },
    table: {
      name: "Example Strategy Table",
      slug: "example-strategy-table",
      description: "A collaborative space for discussing product strategy and roadmap planning",
      table_type: "discussion",
      visibility: "public",
      max_participants: 50,
      meeting_schedule: "Weekly on Thursdays at 2pm EST",
      meeting_link: "https://zoom.us/j/example",
      tags: ["strategy", "product", "planning"],
      columns: [
        {
          name: "Topic",
          column_type: "text",
          order_index: 0,
          is_required: true
        },
        {
          name: "Priority",
          column_type: "select",
          order_index: 1,
          is_required: true,
          options: ["High", "Medium", "Low"]
        },
        {
          name: "Status",
          column_type: "select",
          order_index: 2,
          is_required: false,
          options: ["Not Started", "In Progress", "Completed"]
        },
        {
          name: "Notes",
          column_type: "text",
          order_index: 3,
          is_required: false
        }
      ],
      rows: [
        {
          data: {
            "Topic": "Q1 Product Roadmap",
            "Priority": "High",
            "Status": "In Progress",
            "Notes": "Review customer feedback and prioritize features"
          },
          order_index: 0
        },
        {
          data: {
            "Topic": "Competitor Analysis",
            "Priority": "Medium",
            "Status": "Not Started",
            "Notes": "Research top 5 competitors"
          },
          order_index: 1
        }
      ],
      custom_fields: {}
    }
  };
}

export function generatePitchTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "pitches",
      platform: "CONNEXTED LABS"
    },
    pitch: {
      name: "AI-Powered Analytics Platform",
      slug: "ai-analytics-platform",
      description: "An AI-driven analytics platform helping businesses make data-driven decisions",
      problem_statement: "Businesses struggle to extract actionable insights from their data due to complex tools and lack of AI expertise",
      solution_overview: "Our platform uses advanced AI to automatically analyze data, identify trends, and provide actionable recommendations in plain English",
      target_market: "Small to medium-sized businesses (50-500 employees) across retail, e-commerce, and SaaS industries. Market size: $10B TAM",
      competitive_advantage: "1) Proprietary AI algorithms, 2) No-code interface, 3) Real-time insights, 4) Affordable pricing for SMBs",
      business_model: "SaaS subscription: $99/month (Starter), $299/month (Professional), $799/month (Enterprise). Revenue projections: $500K Year 1, $2M Year 2",
      traction: "- 150 beta users\n- 25 paying customers\n- $15K MRR\n- 15% month-over-month growth\n- Partnership with 3 industry leaders",
      team_overview: "CEO: 10 years in data analytics at Google. CTO: ML PhD, former Amazon. CMO: Growth expert, scaled 2 startups to $10M ARR",
      ask_amount: "$1.5M seed round",
      use_of_funds: "40% Product development\n30% Sales & marketing\n20% Team expansion\n10% Operations",
      pitch_deck_url: "https://drive.google.com/deck-link",
      demo_video_url: "https://youtube.com/demo",
      website_url: "https://example.com",
      status: "active",
      visibility: "public",
      tags: ["AI", "analytics", "SaaS", "data"],
      custom_fields: {}
    }
  };
}

export function generateBuildTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "builds",
      platform: "CONNEXTED LABS"
    },
    build: {
      name: "MVP Mobile App Development",
      slug: "mvp-mobile-app",
      description: "Building a cross-platform mobile app MVP for our product launch",
      build_type: "mobile-app",
      status: "in-progress",
      visibility: "members-only",
      requirements: "- Cross-platform (iOS & Android)\n- User authentication\n- Profile management\n- Real-time notifications\n- Offline capability",
      objectives: "1. Launch MVP within 12 weeks\n2. Support 1000 concurrent users\n3. Achieve 4.5+ star rating\n4. 70% feature completion for launch",
      deliverables: "- Fully functional mobile app\n- Backend API\n- Admin dashboard\n- Technical documentation\n- User guides",
      timeline: "12 weeks total: Research (2 weeks), Design (3 weeks), Development (5 weeks), Testing (2 weeks)",
      resources: "Team: 2 developers, 1 designer, 1 PM. Budget: $50K. Tools: React Native, Firebase, Figma",
      success_criteria: "- All critical features working\n- <2s load time\n- 0 critical bugs\n- Positive user feedback from 50+ testers",
      tags: ["mobile", "MVP", "React Native", "app development"],
      phases: [
        {
          name: "Research & Planning",
          description: "User research, competitive analysis, feature prioritization",
          order_index: 0,
          status: "completed",
          start_date: "2026-01-01",
          end_date: "2026-01-14",
          deliverables: "User personas, feature roadmap, technical architecture"
        },
        {
          name: "Design",
          description: "UI/UX design, prototyping, design system creation",
          order_index: 1,
          status: "in-progress",
          start_date: "2026-01-15",
          end_date: "2026-02-05",
          deliverables: "High-fidelity mockups, interactive prototype, design system"
        },
        {
          name: "Development",
          description: "Frontend and backend development",
          order_index: 2,
          status: "not-started",
          start_date: "2026-02-06",
          end_date: "2026-03-12",
          deliverables: "Working mobile app, API, admin dashboard"
        },
        {
          name: "Testing & Launch",
          description: "QA testing, bug fixes, app store deployment",
          order_index: 3,
          status: "not-started",
          start_date: "2026-03-13",
          end_date: "2026-03-26",
          deliverables: "Tested app, deployment to app stores"
        }
      ],
      tasks: [
        {
          title: "Complete user interviews",
          description: "Interview 20 potential users to understand pain points",
          status: "completed",
          priority: "high",
          due_date: "2026-01-07",
          phase_name: "Research & Planning"
        },
        {
          title: "Create wireframes",
          description: "Design low-fidelity wireframes for all screens",
          status: "in-progress",
          priority: "high",
          due_date: "2026-01-22",
          phase_name: "Design"
        },
        {
          title: "Setup development environment",
          description: "Configure React Native, Firebase, and CI/CD pipeline",
          status: "not-started",
          priority: "medium",
          due_date: "2026-02-06",
          phase_name: "Development"
        }
      ],
      custom_fields: {}
    }
  };
}

export function generateMeetingTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "meetings",
      platform: "CONNEXTED LABS"
    },
    meeting: {
      name: "Weekly Product Sync",
      slug: "weekly-product-sync",
      description: "Weekly alignment meeting for product team to discuss progress, blockers, and priorities",
      meeting_type: "recurring",
      start_time: "2026-02-06T14:00:00Z",
      end_time: "2026-02-06T15:00:00Z",
      location: "Conference Room B / Zoom",
      meeting_link: "https://zoom.us/j/example-meeting-123",
      agenda: "1. Quick wins from last week (10 min)\n2. Current sprint progress (15 min)\n3. Blockers and challenges (15 min)\n4. Next week priorities (10 min)\n5. Q&A and open discussion (10 min)",
      max_participants: 20,
      visibility: "members-only",
      tags: ["product", "weekly", "sync", "team meeting"],
      custom_fields: {
        recurrence: "weekly",
        meeting_notes_url: "https://docs.example.com/notes",
        requires_prep: true
      }
    }
  };
}

export function generateStandupTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "standups",
      platform: "CONNEXTED LABS"
    },
    standup: {
      name: "Daily Dev Standup",
      slug: "daily-dev-standup",
      description: "Quick daily sync for development team to share progress and surface blockers",
      standup_type: "daily",
      schedule: "Monday-Friday at 10:00 AM EST",
      time_limit_minutes: 15,
      visibility: "members-only",
      questions: [
        "What did you accomplish yesterday?",
        "What are you working on today?",
        "Any blockers or challenges?",
        "Do you need help from anyone?"
      ],
      tags: ["engineering", "daily", "standup", "agile"],
      custom_fields: {
        slack_channel: "#engineering-standup",
        async_enabled: true
      }
    }
  };
}

export function generateMeetupTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "meetups",
      platform: "CONNEXTED LABS"
    },
    meetup: {
      name: "Startup Founders Networking Event",
      slug: "founders-networking-feb-2026",
      description: "Monthly networking event bringing together startup founders, investors, and industry leaders for meaningful connections and knowledge sharing",
      meetup_type: "networking",
      visibility: "public",
      location: "Innovation Hub, 123 Tech Street, San Francisco, CA",
      tags: ["networking", "startups", "founders", "investors"],
      meetings: [
        {
          name: "Registration & Welcome Coffee",
          description: "Check-in, name tags, and networking over coffee",
          start_time: "2026-02-15T17:30:00Z",
          end_time: "2026-02-15T18:00:00Z",
          location: "Main Lobby",
          meeting_link: ""
        },
        {
          name: "Keynote: Scaling from 0 to 1M Users",
          description: "Learn from a successful founder who scaled their startup to 1M users",
          start_time: "2026-02-15T18:00:00Z",
          end_time: "2026-02-15T18:45:00Z",
          location: "Auditorium",
          meeting_link: "https://zoom.us/j/keynote-stream"
        },
        {
          name: "Breakout Sessions",
          description: "Small group discussions on fundraising, product-market fit, and hiring",
          start_time: "2026-02-15T18:45:00Z",
          end_time: "2026-02-15T19:30:00Z",
          location: "Rooms A, B, C",
          meeting_link: ""
        },
        {
          name: "Open Networking",
          description: "Informal networking with drinks and appetizers",
          start_time: "2026-02-15T19:30:00Z",
          end_time: "2026-02-15T21:00:00Z",
          location: "Rooftop Terrace",
          meeting_link: ""
        }
      ],
      custom_fields: {
        max_attendees: 150,
        ticket_price: "$25",
        sponsors: ["TechCorp", "Venture Partners"]
      }
    }
  };
}

export function generateElevatorTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "elevators",
      platform: "CONNEXTED LABS"
    },
    elevator: {
      name: "Investor Pitch Challenge",
      slug: "investor-pitch-challenge",
      description: "Practice and perfect your 60-second elevator pitch to investors. Get feedback from experienced entrepreneurs and VCs.",
      elevator_type: "pitch",
      duration_seconds: 60,
      visibility: "public",
      prompt_text: "You're in an elevator with a potential investor who asks: 'So, what does your company do?' You have 60 seconds before they reach their floor. Go!",
      guidelines: "- Start with the problem you're solving\n- Clearly state your solution\n- Mention your target market\n- Share your unique advantage\n- End with your ask or next step\n- Be passionate and confident!\n- Stay within 60 seconds",
      evaluation_criteria: "Judges will score based on:\n1. Clarity (20 points) - Is the pitch easy to understand?\n2. Problem/Solution Fit (20 points) - Is the problem clear and solution compelling?\n3. Market Opportunity (15 points) - Is the target market well-defined?\n4. Differentiation (15 points) - What makes this unique?\n5. Delivery (15 points) - Confidence, passion, body language\n6. Call to Action (15 points) - Clear next step or ask",
      tags: ["pitch", "practice", "feedback", "investors"],
      custom_fields: {
        allows_video: true,
        allows_audio: true,
        max_submissions_per_user: 3
      }
    }
  };
}

export function generateLibraryTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "libraries",
      platform: "CONNEXTED LABS"
    },
    library: {
      name: "Startup Founder Resources",
      slug: "startup-founder-resources",
      description: "Curated collection of essential resources for first-time startup founders including templates, guides, tools, and expert advice",
      library_type: "resource-hub",
      visibility: "public",
      tags: ["startups", "resources", "founders", "templates"],
      items: [
        {
          title: "Lean Canvas Template",
          description: "One-page business plan template to quickly outline your startup idea and business model",
          item_type: "template",
          content: "",
          url: "https://example.com/lean-canvas-template",
          file_url: "https://example.com/files/lean-canvas.pdf",
          order_index: 0,
          tags: ["business plan", "template", "lean canvas"]
        },
        {
          title: "Fundraising 101: Complete Guide",
          description: "Comprehensive guide covering everything from finding investors to closing your round",
          item_type: "guide",
          content: "This guide covers: 1) Types of funding, 2) When to fundraise, 3) How much to raise, 4) Finding investors, 5) Pitch deck creation, 6) Term sheets, 7) Due diligence, 8) Closing",
          url: "https://example.com/fundraising-guide",
          file_url: "",
          order_index: 1,
          tags: ["fundraising", "guide", "investors"]
        },
        {
          title: "Pitch Deck Template",
          description: "Investor-ready pitch deck template based on successful decks from top startups",
          item_type: "template",
          content: "",
          url: "https://example.com/pitch-deck",
          file_url: "https://example.com/files/pitch-deck.pptx",
          order_index: 2,
          tags: ["pitch deck", "template", "investors"]
        },
        {
          title: "Customer Interview Script",
          description: "Structured interview guide to validate your product idea and understand customer needs",
          item_type: "template",
          content: "Interview Structure:\n\nIntro (2 min):\n- Thank you for your time\n- Explain purpose\n- Ask permission to record\n\nBackground (5 min):\n- Tell me about your role\n- What does a typical day look like?\n\nProblem Discovery (10 min):\n- How do you currently handle [problem area]?\n- What's frustrating about the current process?\n- How much time/money does this cost you?\n\nSolution Validation (10 min):\n- [Show prototype]\n- What's your first impression?\n- Would this solve your problem?\n- What would you change?\n\nClosing (3 min):\n- Would you pay for this? How much?\n- Can I follow up with you?\n- Anyone else I should talk to?",
          url: "",
          file_url: "",
          order_index: 3,
          tags: ["customer discovery", "interviews", "validation"]
        },
        {
          title: "Essential SaaS Metrics Dashboard",
          description: "Track the key metrics that matter: MRR, CAC, LTV, Churn, and more",
          item_type: "tool",
          content: "",
          url: "https://example.com/saas-metrics-dashboard",
          file_url: "https://example.com/files/metrics-template.xlsx",
          order_index: 4,
          tags: ["SaaS", "metrics", "analytics"]
        }
      ],
      custom_fields: {
        curator: "Platform Admin",
        last_updated: "2026-01-31"
      }
    }
  };
}

export function generateChecklistTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "checklists",
      platform: "CONNEXTED LABS"
    },
    checklist: {
      name: "Product Launch Checklist",
      slug: "product-launch-checklist",
      description: "Comprehensive checklist to ensure a successful product launch covering marketing, sales, support, and technical preparation",
      checklist_type: "launch",
      visibility: "public",
      tags: ["product launch", "checklist", "go-to-market"],
      items: [
        {
          title: "Define target audience and positioning",
          description: "Create detailed buyer personas and craft your unique value proposition",
          order_index: 0,
          is_required: true,
          estimated_time_minutes: 240
        },
        {
          title: "Build landing page and website",
          description: "Create compelling landing page with clear CTA, benefits, and social proof",
          order_index: 1,
          is_required: true,
          estimated_time_minutes: 480
        },
        {
          title: "Set up analytics and tracking",
          description: "Install Google Analytics, set up conversion tracking, and create dashboard",
          order_index: 2,
          is_required: true,
          estimated_time_minutes: 120
        },
        {
          title: "Create launch content",
          description: "Blog posts, social media content, press release, demo videos",
          order_index: 3,
          is_required: true,
          estimated_time_minutes: 600
        },
        {
          title: "Prepare customer support",
          description: "Create FAQ, knowledge base, and train support team",
          order_index: 4,
          is_required: true,
          estimated_time_minutes: 360
        },
        {
          title: "Set up email sequences",
          description: "Welcome emails, onboarding sequence, engagement campaigns",
          order_index: 5,
          is_required: true,
          estimated_time_minutes: 300
        },
        {
          title: "Test all user flows",
          description: "Sign up, onboarding, core features, payment, cancellation",
          order_index: 6,
          is_required: true,
          estimated_time_minutes: 240
        },
        {
          title: "Reach out to early adopters",
          description: "Personal emails to beta users, industry contacts, and potential champions",
          order_index: 7,
          is_required: true,
          estimated_time_minutes: 180
        },
        {
          title: "Submit to directories",
          description: "Product Hunt, Hacker News, industry-specific directories",
          order_index: 8,
          is_required: false,
          estimated_time_minutes: 120
        },
        {
          title: "Prepare PR outreach",
          description: "Pitch to journalists, bloggers, and influencers in your space",
          order_index: 9,
          is_required: false,
          estimated_time_minutes: 240
        },
        {
          title: "Load test infrastructure",
          description: "Ensure servers can handle expected traffic spike",
          order_index: 10,
          is_required: true,
          estimated_time_minutes: 180
        },
        {
          title: "Set up monitoring and alerts",
          description: "Uptime monitoring, error tracking, performance monitoring",
          order_index: 11,
          is_required: true,
          estimated_time_minutes: 120
        },
        {
          title: "Create launch day plan",
          description: "Hour-by-hour schedule, team assignments, contingency plans",
          order_index: 12,
          is_required: true,
          estimated_time_minutes: 120
        },
        {
          title: "Schedule social media posts",
          description: "Queue up launch announcements across all channels",
          order_index: 13,
          is_required: true,
          estimated_time_minutes: 90
        },
        {
          title: "Alert internal team",
          description: "Ensure everyone knows launch is happening and what to expect",
          order_index: 14,
          is_required: true,
          estimated_time_minutes: 30
        }
      ],
      custom_fields: {
        estimated_total_hours: 62,
        recommended_timeline: "4-6 weeks"
      }
    }
  };
}

export function generateSprintTemplate() {
  return {
    metadata: {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: "template-generator",
      exportType: "container",
      containerType: "sprints",
      platform: "CONNEXTED LABS"
    },
    sprint: {
      name: "Sprint 12: User Dashboard Redesign",
      slug: "sprint-12-dashboard-redesign",
      description: "Two-week sprint focused on redesigning the user dashboard for better usability and engagement",
      sprint_type: "development",
      start_date: "2026-02-03",
      end_date: "2026-02-14",
      goal: "Ship redesigned dashboard with improved navigation, personalized widgets, and 30% faster load time",
      visibility: "members-only",
      tags: ["design", "frontend", "UX", "dashboard"],
      tasks: [
        {
          title: "Create wireframes for new dashboard layout",
          description: "Design low-fidelity wireframes showing new information architecture and widget placement",
          status: "completed",
          priority: "high",
          points: 5,
          assigned_to: "sarah@example.com"
        },
        {
          title: "User research: test wireframes with 10 users",
          description: "Conduct usability testing sessions to validate new design direction",
          status: "completed",
          priority: "high",
          points: 8,
          assigned_to: "sarah@example.com"
        },
        {
          title: "Design high-fidelity mockups",
          description: "Create pixel-perfect designs for all dashboard states and responsive breakpoints",
          status: "in-progress",
          priority: "high",
          points: 8,
          assigned_to: "sarah@example.com"
        },
        {
          title: "Implement new dashboard component structure",
          description: "Build reusable React components for dashboard layout and widgets",
          status: "in-progress",
          priority: "high",
          points: 13,
          assigned_to: "mike@example.com"
        },
        {
          title: "Optimize dashboard data loading",
          description: "Implement lazy loading, caching, and reduce API calls for faster performance",
          status: "not-started",
          priority: "high",
          points: 8,
          assigned_to: "mike@example.com"
        },
        {
          title: "Add personalization engine",
          description: "Allow users to customize widget visibility and order, save preferences",
          status: "not-started",
          priority: "medium",
          points: 13,
          assigned_to: "alex@example.com"
        },
        {
          title: "Write unit tests for dashboard components",
          description: "Achieve 80% test coverage for all new components",
          status: "not-started",
          priority: "medium",
          points: 5,
          assigned_to: "alex@example.com"
        },
        {
          title: "QA testing: cross-browser and responsive",
          description: "Test on Chrome, Firefox, Safari, Edge and all mobile breakpoints",
          status: "not-started",
          priority: "high",
          points: 5,
          assigned_to: "qa-team@example.com"
        },
        {
          title: "Performance testing and optimization",
          description: "Measure load times, identify bottlenecks, optimize to hit 30% improvement target",
          status: "not-started",
          priority: "high",
          points: 5,
          assigned_to: "mike@example.com"
        },
        {
          title: "Update documentation",
          description: "Document new dashboard features, customization options, and API changes",
          status: "not-started",
          priority: "low",
          points: 3,
          assigned_to: "alex@example.com"
        }
      ],
      custom_fields: {
        total_points: 73,
        team_capacity: 75,
        scrum_master: "jane@example.com",
        sprint_review_date: "2026-02-14T15:00:00Z"
      }
    }
  };
}

// ============================================================================
// AI PROMPT GENERATORS
// ============================================================================

export function generateAIPrompt(containerType: string, templateData: any): string {
  const prompts: Record<string, string> = {
    tables: `# AI Prompt for Creating Table JSON

I need help creating a JSON file for a Table container in CONNEXTED LABS. Please use this template structure and customize it based on my requirements:

## My Table Details:
[Describe your table here - what it's for, who will use it, what topics it will cover]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Customize the table name and description for: [YOUR TABLE PURPOSE]
2. Define appropriate columns for tracking: [LIST WHAT YOU WANT TO TRACK]
3. Create 3-5 sample rows with realistic data
4. Suggest relevant tags
5. Ensure all required fields are filled

## Tips for Tables:
- **table_type options**: "discussion", "project-tracking", "resource-sharing", "decision-making", "brainstorming"
- **visibility options**: "public" (anyone can view/join), "members-only" (only community members)
- **column_type options**: "text", "number", "select" (dropdown), "date", "checkbox", "url"
- **Use columns creatively**: Track status, priority, assignments, dates, links, etc.
- **Sample row data**: Make it realistic and helpful as examples for your members

Please generate a complete, ready-to-import JSON file that I can use immediately.`,

    pitches: `# AI Prompt for Creating Pitch JSON

I need help creating a JSON file for a Pitch container in CONNEXTED LABS. Please use this template structure and customize it based on my startup/project:

## My Startup/Project:
[Describe your startup, product, or project idea]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create a compelling pitch for: [YOUR STARTUP NAME/IDEA]
2. Fill in all pitch sections with specific, realistic details
3. Include metrics and traction if available
4. Suggest appropriate tags
5. Make it investor-ready and persuasive

## Tips for Pitches:
- **Problem statement**: Be specific about the pain point. Use data if possible.
- **Solution**: Clearly explain HOW you solve it, not just WHAT you do
- **Target market**: Define specific segments with TAM/SAM/SOM if possible
- **Competitive advantage**: What makes you truly unique? Patents? Network effects? Expertise?
- **Traction**: Real numbers are powerful: users, revenue, growth rate, partnerships
- **Team**: Highlight relevant experience and expertise
- **Ask amount**: Be specific about funding needs and use of funds
- **status options**: "draft", "active", "funded", "archived"
- **visibility options**: "public", "members-only", "private"

Please generate a complete, investor-ready pitch JSON that I can use immediately.`,

    builds: `# AI Prompt for Creating Build JSON

I need help creating a JSON file for a Build container in CONNEXTED LABS. Please use this template structure and customize it based on my project:

## My Build Project:
[Describe what you're building - product, feature, campaign, etc.]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create a detailed build plan for: [YOUR PROJECT NAME]
2. Define 3-5 realistic phases with dates
3. Create 10-15 actionable tasks distributed across phases
4. Set appropriate status, priority, and timelines
5. Suggest relevant tags and success criteria

## Tips for Builds:
- **build_type options**: "mobile-app", "web-app", "feature", "campaign", "infrastructure", "design-system", "api", "integration"
- **status options**: "planning", "in-progress", "completed", "on-hold", "cancelled"
- **Phase best practices**: Each phase should have clear deliverables and realistic timeframes
- **Task priority options**: "low", "medium", "high", "urgent"
- **Task status options**: "not-started", "in-progress", "blocked", "completed"
- **Success criteria**: Make them specific and measurable (SMART goals)
- **Timeline**: Be realistic. Add buffer time for unexpected challenges.

Please generate a complete, actionable build plan JSON that I can use immediately.`,

    meetings: `# AI Prompt for Creating Meeting JSON

I need help creating a JSON file for a Meeting container in CONNEXTED LABS. Please use this template structure and customize it based on my meeting:

## My Meeting:
[Describe the meeting purpose, frequency, and who should attend]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create meeting details for: [YOUR MEETING NAME/PURPOSE]
2. Write a clear, structured agenda
3. Set appropriate date/time and duration
4. Add relevant meeting links and location info
5. Suggest appropriate tags

## Tips for Meetings:
- **meeting_type options**: "recurring", "one-time", "workshop", "training", "review", "planning", "standup"
- **Agenda format**: Number items, assign time estimates, include Q&A
- **Times**: Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ) in UTC
- **max_participants**: Set realistic limits for productive discussion
- **visibility options**: "public", "members-only", "private"
- **Best practices**: Include pre-work if needed, share materials in advance, assign facilitator

Please generate a complete, well-structured meeting JSON that I can use immediately.`,

    standups: `# AI Prompt for Creating Standup JSON

I need help creating a JSON file for a Standup container in CONNEXTED LABS. Please use this template structure and customize it based on my team:

## My Standup:
[Describe your team and what kind of daily/regular sync you need]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create standup details for: [YOUR TEAM NAME]
2. Write 3-5 effective standup questions
3. Set appropriate schedule and time limits
4. Suggest relevant tags
5. Add useful custom fields

## Tips for Standups:
- **standup_type options**: "daily", "weekly", "sprint", "async"
- **Schedule format**: Be specific: "Monday-Friday at 10:00 AM EST" or "Mondays at 2:00 PM"
- **time_limit_minutes**: Daily standups: 15 min. Weekly: 30-45 min
- **Good questions**: Focus on progress, plans, blockers, and collaboration needs
- **Async standups**: Great for distributed teams across timezones
- **visibility**: Usually "members-only" for internal team syncs

Please generate a complete, effective standup JSON that I can use immediately.`,

    meetups: `# AI Prompt for Creating Meetup JSON

I need help creating a JSON file for a Meetup container in CONNEXTED LABS. Please use this template structure and customize it based on my event:

## My Meetup Event:
[Describe your event - networking, conference, workshop, etc.]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create meetup details for: [YOUR EVENT NAME]
2. Design a compelling event flow with 3-6 sub-meetings/sessions
3. Set realistic times and locations
4. Add relevant tags and custom fields
5. Make it attractive to potential attendees

## Tips for Meetups:
- **meetup_type options**: "networking", "conference", "workshop", "social", "hackathon", "demo-day", "training"
- **Event structure**: Welcome/registration → Main content → Networking → Closing
- **Timing**: Allow buffer time between sessions, include breaks
- **Location**: Be specific. Include room numbers, parking info
- **Meetings array**: Each sub-event should have clear purpose and timing
- **visibility**: "public" for open events, "members-only" for community-only
- **Custom fields**: max_attendees, ticket_price, sponsors, dress_code, parking_info

Please generate a complete, well-planned meetup JSON that I can use immediately.`,

    elevators: `# AI Prompt for Creating Elevator Pitch Challenge JSON

I need help creating a JSON file for an Elevator container in CONNEXTED LABS. Please use this template structure and customize it based on my challenge:

## My Elevator Challenge:
[Describe what kind of pitch practice you want to create]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create elevator pitch challenge for: [YOUR CHALLENGE PURPOSE]
2. Write an engaging, realistic prompt scenario
3. Provide clear, helpful guidelines (6-8 points)
4. Define scoring criteria with point values
5. Suggest relevant tags

## Tips for Elevators:
- **elevator_type options**: "pitch", "introduction", "sales", "networking", "story"
- **duration_seconds**: 30s (very short), 60s (standard), 90s (extended), 120s (detailed)
- **Prompt text**: Set the scene. Make it realistic and relatable.
- **Guidelines**: Help participants structure their pitch effectively
- **Evaluation criteria**: Break down into 5-7 categories with point values (total 100)
- **Common criteria**: Clarity, Problem/Solution fit, Passion, Uniqueness, Call to action
- **visibility**: "public" for open practice, "members-only" for community

Please generate a complete, engaging elevator pitch challenge JSON that I can use immediately.`,

    libraries: `# AI Prompt for Creating Library JSON

I need help creating a JSON file for a Library container in CONNEXTED LABS. Please use this template structure and customize it based on my resource collection:

## My Library:
[Describe what resources you want to curate and for whom]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create library details for: [YOUR LIBRARY NAME/TOPIC]
2. Curate 8-12 high-value resources
3. Mix different item types (templates, guides, tools, articles)
4. Write helpful descriptions for each item
5. Organize with tags and categories

## Tips for Libraries:
- **library_type options**: "resource-hub", "learning-center", "template-library", "tool-directory", "reading-list", "case-studies"
- **item_type options**: "template", "guide", "tool", "article", "video", "course", "book", "podcast", "case-study"
- **Good descriptions**: Explain what it is, who it's for, and what value it provides
- **URLs**: Link to high-quality, authoritative sources
- **file_url**: For downloadable templates, PDFs, spreadsheets
- **content field**: For text-based resources you want to include inline
- **Tags**: Help users find resources by topic, skill level, format
- **Order**: Prioritize most valuable resources first (lower order_index)

Please generate a complete, valuable library JSON that I can use immediately.`,

    checklists: `# AI Prompt for Creating Checklist JSON

I need help creating a JSON file for a Checklist container in CONNEXTED LABS. Please use this template structure and customize it based on my process:

## My Checklist:
[Describe what process or workflow you want to create a checklist for]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create checklist details for: [YOUR PROCESS NAME]
2. Break down into 10-20 actionable items
3. Mark critical items as required
4. Add time estimates for each item
5. Order items logically (dependencies, priority)

## Tips for Checklists:
- **checklist_type options**: "launch", "onboarding", "review", "compliance", "quality-assurance", "pre-flight", "closing"
- **Item titles**: Action-oriented. Start with verbs: "Create...", "Set up...", "Review..."
- **Descriptions**: Provide context, tools needed, or tips for completion
- **is_required**: Mark critical path items as true
- **estimated_time_minutes**: Be realistic. Helps users plan their time
- **Order**: Logical sequence. Consider dependencies and priority
- **Total time**: Sum up estimated times in custom_fields
- **Best practices**: Group related items, include validation steps, add helpful resources

Please generate a complete, actionable checklist JSON that I can use immediately.`,

    sprints: `# AI Prompt for Creating Sprint JSON

I need help creating a JSON file for a Sprint container in CONNEXTED LABS. Please use this template structure and customize it based on my sprint:

## My Sprint:
[Describe your sprint goal, team, and what you want to accomplish]

## Template Structure to Follow:
${JSON.stringify(templateData, null, 2)}

## What I need:
1. Create sprint details for: [YOUR SPRINT GOAL]
2. Define a clear, measurable sprint goal
3. Create 8-15 realistic tasks with story points
4. Distribute tasks across team members
5. Set appropriate status, priority, and points

## Tips for Sprints:
- **sprint_type options**: "development", "design", "research", "marketing", "planning", "bug-fixing"
- **Sprint duration**: 1-4 weeks. 2 weeks is most common
- **Sprint goal**: SMART goal - Specific, Measurable, Achievable, Relevant, Time-bound
- **Story points**: Fibonacci scale (1,2,3,5,8,13,21). Represents complexity, not hours
- **Task status options**: "not-started", "in-progress", "blocked", "completed"
- **Task priority options**: "low", "medium", "high", "urgent"
- **Assigned_to**: Use email addresses or team member names
- **Team capacity**: Sum of points should not exceed team's capacity (usually 60-80% of max)
- **Custom fields**: Track scrum master, review date, retrospective notes

Please generate a complete, realistic sprint plan JSON that I can use immediately.`
  };

  return prompts[containerType] || `Please help me create a JSON file for a ${containerType} container.`;
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

export function downloadTemplateWithPrompt(containerType: string) {
  const generators: Record<string, () => any> = {
    tables: generateTableTemplate,
    pitches: generatePitchTemplate,
    builds: generateBuildTemplate,
    meetings: generateMeetingTemplate,
    standups: generateStandupTemplate,
    meetups: generateMeetupTemplate,
    elevators: generateElevatorTemplate,
    libraries: generateLibraryTemplate,
    checklists: generateChecklistTemplate,
    sprints: generateSprintTemplate,
  };

  const generator = generators[containerType];
  if (!generator) {
    throw new Error(`Unknown container type: ${containerType}`);
  }

  const template = generator();
  
  // Helper to convert plural container type to singular property name
  const singularMapping: Record<string, string> = {
    tables: 'table',
    pitches: 'pitch',
    builds: 'build',
    meetings: 'meeting',
    standups: 'standup',
    meetups: 'meetup',
    elevators: 'elevator',
    libraries: 'library',
    checklists: 'checklist',
    sprints: 'sprint',
  };
  const singularKey = singularMapping[containerType] || containerType.slice(0, -1);
  const slug = template[singularKey]?.slug || 'template';
  
  // Download the JSON template
  downloadJSON(template, `${slug}-template.json`);
  
  return template;
}

export function downloadAIPromptFile(containerType: string) {
  const generators: Record<string, () => any> = {
    tables: generateTableTemplate,
    pitches: generatePitchTemplate,
    builds: generateBuildTemplate,
    meetings: generateMeetingTemplate,
    standups: generateStandupTemplate,
    meetups: generateMeetupTemplate,
    elevators: generateElevatorTemplate,
    libraries: generateLibraryTemplate,
    checklists: generateChecklistTemplate,
    sprints: generateSprintTemplate,
  };

  const generator = generators[containerType];
  if (!generator) {
    throw new Error(`Unknown container type: ${containerType}`);
  }

  const template = generator();
  const prompt = generateAIPrompt(containerType, template);
  
  // Download as a text file
  const blob = new Blob([prompt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${containerType}-ai-prompt.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadBothTemplateAndPrompt(containerType: string) {
  // Download JSON template
  const template = downloadTemplateWithPrompt(containerType);
  
  // Also download AI prompt
  setTimeout(() => {
    downloadAIPromptFile(containerType);
  }, 500); // Small delay to avoid browser blocking multiple downloads
  
  return template;
}

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

export interface DocumentCategory {
  name: string;
  description: string;
  icon: string;
  templates: DocumentTemplate[];
}

export interface DocumentTemplate {
  title: string;
  description: string;
  content: string;
  tags: string[];
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    name: "Business Planning",
    description: "Documents for strategic planning and business operations",
    icon: "Briefcase",
    templates: [
      {
        title: "Business Plan",
        description: "Comprehensive business plan template",
        tags: ["planning", "strategy", "business"],
        content: `# Business Plan: [Company Name]

## Executive Summary
[2-3 paragraph overview of your business, mission, and key highlights]

## Company Description
- **Company Name:** 
- **Founded:** 
- **Location:** 
- **Mission Statement:** 
- **Vision Statement:** 
- **Core Values:** 

## Market Analysis
### Industry Overview
[Describe your industry, market size, growth trends]

### Target Market
[Define your ideal customers - demographics, psychographics, behaviors]

### Competitive Analysis
[Analyze top 3-5 competitors - strengths, weaknesses, market position]

### Market Opportunity
[Explain the gap in the market and your unique opportunity]

## Products & Services
[Detailed description of what you offer, pricing, delivery]

## Marketing & Sales Strategy
### Marketing Channels
- Channel 1: [Strategy and budget]
- Channel 2: [Strategy and budget]
- Channel 3: [Strategy and budget]

### Sales Process
[Describe your sales funnel and conversion strategy]

### Customer Acquisition Cost (CAC)
[Estimated cost to acquire one customer]

### Lifetime Value (LTV)
[Expected revenue from one customer]

## Organization & Management
### Team Structure
[Organizational chart and key roles]

### Key Team Members
[Bios of founders and leadership team]

### Advisors & Board
[Notable advisors, board members, mentors]

## Financial Projections
### Revenue Model
[How you make money]

### Year 1-3 Projections
- Year 1: $XXX,XXX
- Year 2: $XXX,XXX
- Year 3: $XXX,XXX

### Key Assumptions
[List critical assumptions behind your numbers]

### Funding Requirements
[How much you need and how you'll use it]

## Appendix
[Supporting documents, charts, research data]`
      },
      {
        title: "One-Page Business Plan",
        description: "Quick business plan overview on a single page",
        tags: ["planning", "lean", "quick-start"],
        content: `# One-Page Business Plan: [Company Name]

## The Opportunity
**Problem:** [What problem are you solving?]

**Solution:** [How do you solve it?]

**Market Size:** [How big is the opportunity?]

## The Product/Service
[What are you offering? Key features and benefits]

## Target Customers
[Who is your ideal customer? Be specific]

## Competitive Advantage
[Why will you win? What makes you unique?]

## Business Model
**Revenue Streams:** [How do you make money?]

**Pricing:** [What do you charge?]

**Unit Economics:** CAC: $XXX | LTV: $XXX | Margin: XX%

## Go-to-Market Strategy
**Marketing:** [Top 3 channels]

**Sales:** [How you'll sell]

**Partnerships:** [Key partnerships]

## Traction & Milestones
**Current Status:** [Where are you now?]

**Key Metrics:** [Users, revenue, growth rate]

**Next Milestones:** 
- 3 months: 
- 6 months: 
- 12 months: 

## Team
**Founders:** [Names and relevant experience]

**Advisors:** [Key advisors]

**Hiring Plan:** [Next 3-5 hires]

## Financial Summary
**Current Runway:** [Months of cash]

**Funding Ask:** [$XXX,XXX]

**Use of Funds:** 
- XX% Product
- XX% Marketing  
- XX% Team
- XX% Operations

**3-Year Revenue Target:** $XXX,XXX`
      },
      {
        title: "Lean Canvas",
        description: "One-page business model canvas",
        tags: ["lean", "business model", "planning"],
        content: `# Lean Canvas: [Company Name]

## Problem
**Top 3 Problems:**
1. 
2. 
3. 

**Existing Alternatives:**
[How do people solve this today?]

## Solution
**Top 3 Features:**
1. 
2. 
3. 

## Unique Value Proposition
**Single, clear, compelling message:**
[Why you are different and worth buying]

**High-Level Concept:**
[X for Y, e.g., "Uber for dog walking"]

## Unfair Advantage
**Cannot be easily copied or bought:**
[Insider info, expertise, dream team, network, etc.]

## Customer Segments
**Target Customers:**
[Who are your early adopters?]

**User Personas:**
[Describe 1-2 detailed personas]

## Key Metrics
**Metrics that Matter:**
[What are you tracking? Users, revenue, engagement, etc.]

## Channels
**Path to Customers:**
[How will you reach them? Direct sales, web, social, partners, etc.]

## Cost Structure
**Fixed Costs:**
- 
- 

**Variable Costs:**
- 
- 

## Revenue Streams
**Revenue Model:**
[Subscription, transaction fee, advertising, etc.]

**Lifetime Value:**
$XXX

**Pricing:**
$XX/month or $XX/transaction`
      }
    ]
  },
  {
    name: "Investor Relations",
    description: "Documents for fundraising and investor communication",
    icon: "TrendingUp",
    templates: [
      {
        title: "Investor Update (Monthly)",
        description: "Monthly email update for investors",
        tags: ["investors", "updates", "fundraising"],
        content: `# Investor Update - [Month Year]

**To:** Investors and Advisors
**From:** [Founder Name], CEO
**Date:** [Date]

## TL;DR
[2-3 sentences with the most important updates]

## Key Metrics
| Metric | This Month | Last Month | Change |
|--------|-----------|------------|--------|
| MRR | $XX,XXX | $XX,XXX | +X% |
| Total Users | X,XXX | X,XXX | +X% |
| Active Users | X,XXX | X,XXX | +X% |
| Customer Churn | X% | X% | X% |
| Burn Rate | $XX,XXX | $XX,XXX | X% |
| Runway | X months | X months | X months |

## Product Updates
✅ **Shipped:**
- [Feature/improvement 1]
- [Feature/improvement 2]
- [Feature/improvement 3]

🚧 **In Progress:**
- [What you're building now]
- [What you're building now]

📋 **Coming Next:**
- [What's coming next month]
- [What's coming next month]

## Business Development
🎯 **Wins:**
- [New partnership, big customer, press coverage]
- [Another win]

🤝 **Partnerships:**
- [Partnership updates or new conversations]

## Team Updates
👥 **Hiring:**
- [New hires this month]
- [Open positions]

📚 **Culture:**
- [Team events, achievements, or culture initiatives]

## Challenges & How You Can Help
⚠️ **Current Challenges:**
1. [Challenge 1] - Ask: [Specific help needed]
2. [Challenge 2] - Ask: [Specific help needed]

## Financial Update
💰 **Cash Position:** $XXX,XXX (X months runway)

📊 **This Month:**
- Revenue: $XX,XXX
- Expenses: $XX,XXX
- Net Burn: $XX,XXX

## Looking Ahead
🎯 **Next Month's Goals:**
1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

🚀 **Next Quarter:**
[Key initiatives and objectives]

## Asks
How you can help this month:
1. [Specific intro or connection]
2. [Specific advice or expertise]
3. [Specific resource or support]

---
Thanks for your continued support!

[Founder Name]
[Title]
[Contact Info]`
      },
      {
        title: "Executive Summary",
        description: "Executive summary for pitch deck or business plan",
        tags: ["investors", "pitch", "summary"],
        content: `# Executive Summary: [Company Name]

## The Opportunity
[Company Name] is [brief description] addressing the $XXB market for [target market]. We solve [specific problem] by [unique solution approach].

## Problem
[Describe the significant problem affecting your target market. Use data and specific pain points.]

Key facts:
- XX% of [target market] struggle with [problem]
- Current solutions cost $XXX and take XX hours
- Market dissatisfaction rate: XX%

## Solution
[Company Name] provides [solution description]. Unlike existing alternatives, we [key differentiator].

Core capabilities:
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Market Opportunity
**Total Addressable Market (TAM):** $XXB
**Serviceable Addressable Market (SAM):** $XXB  
**Serviceable Obtainable Market (SOM):** $XXM

Target customers: [Specific customer segments]

## Business Model
We generate revenue through [revenue model]. 

**Pricing:** $XX per [unit]
**Customer Acquisition Cost:** $XXX
**Lifetime Value:** $X,XXX
**Payback Period:** X months

## Traction
- XXX users/customers
- $XXX in ARR/MRR
- XX% month-over-month growth
- XX% customer retention
- [Notable customers/partnerships]

## Competitive Landscape
We compete in a market with [competitors], but differentiate through:
1. [Unique advantage 1]
2. [Unique advantage 2]
3. [Unique advantage 3]

## Team
**[Founder 1]** - [Title]: [Relevant background and expertise]

**[Founder 2]** - [Title]: [Relevant background and expertise]

**Advisors:** [Notable advisors and their credentials]

## Financial Projections
| Year | Revenue | Customers | Employees |
|------|---------|-----------|-----------|
| 2026 | $XXX K | XXX | XX |
| 2027 | $X.X M | X,XXX | XX |
| 2028 | $XX M | XX,XXX | XXX |

## Funding
**Raising:** $X.XM [round type]
**Use of Funds:**
- XX% Product development
- XX% Sales & marketing
- XX% Team expansion
- XX% Operations & infrastructure

**Key Milestones:**
- [Milestone to be achieved with funding]
- [Milestone to be achieved with funding]
- [Milestone to be achieved with funding]

## Contact
[Founder Name]
[Email]
[Phone]
[Website]`
      }
    ]
  },
  {
    name: "Product Development",
    description: "Documents for product planning and requirements",
    icon: "Package",
    templates: [
      {
        title: "Product Requirements Document (PRD)",
        description: "Detailed product requirements and specifications",
        tags: ["product", "requirements", "development"],
        content: `# Product Requirements Document

## Document Info
- **Product:** [Product/Feature Name]
- **Author:** [Your Name]
- **Date:** [Date]
- **Status:** [Draft/In Review/Approved]
- **Stakeholders:** [List key stakeholders]

## Overview
### Background
[Context: Why are we building this? What prompted this initiative?]

### Objective
[What is the goal? What problem does this solve?]

### Success Metrics
- **Primary Metric:** [e.g., 20% increase in user engagement]
- **Secondary Metrics:** 
  - [Metric 2]
  - [Metric 3]

## User Personas
### Primary Persona: [Name]
- **Role:** [Job title/role]
- **Goals:** [What they want to achieve]
- **Pain Points:** [What frustrates them]
- **Use Case:** [How they'll use this feature]

### Secondary Persona: [Name]
[Repeat above]

## User Stories
**As a** [type of user]
**I want** [goal/desire]
**So that** [benefit/value]

**Acceptance Criteria:**
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]

[Repeat for 5-10 key user stories]

## Functional Requirements

### Must Have (P0)
1. **[Feature Name]**
   - Description: [What it does]
   - User flow: [Step-by-step flow]
   - Edge cases: [What happens when...]

2. **[Feature Name]**
   [Repeat above]

### Should Have (P1)
[Nice-to-have features that add significant value]

### Could Have (P2)
[Features to consider for future iterations]

## Non-Functional Requirements
### Performance
- Page load time: < X seconds
- API response time: < XXXms
- Support X concurrent users

### Security
- [Security requirements]
- [Data encryption standards]
- [Access control requirements]

### Accessibility
- WCAG 2.1 Level AA compliance
- Screen reader support
- Keyboard navigation

### Scalability
- Support growth to X users
- Handle X transactions per second

## Design & User Experience
### Wireframes
[Link to wireframes or embedded images]

### User Flows
[Link to user flow diagrams]

### Design Assets
[Link to design files]

## Technical Specifications
### Architecture
[High-level technical approach]

### Dependencies
- [External API or service 1]
- [Library or framework needed]

### Data Model
[Database schema or data structure]

### APIs
[API endpoints needed, request/response formats]

## Timeline & Milestones
| Phase | Duration | Deliverable | Owner |
|-------|----------|-------------|-------|
| Design | X weeks | Mockups approved | Designer |
| Development | X weeks | Feature complete | Engineer |
| QA | X weeks | All tests passing | QA |
| Launch | X days | Live to 100% users | PM |

## Risks & Mitigation
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to mitigate] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to mitigate] |

## Open Questions
1. [Unresolved question that needs stakeholder input]
2. [Another question]

## Appendix
- [Supporting research]
- [Competitive analysis]
- [User research findings]`
      },
      {
        title: "Feature Specification",
        description: "Lightweight feature spec for agile teams",
        tags: ["product", "features", "agile"],
        content: `# Feature Specification: [Feature Name]

## Summary
**One-liner:** [What is this feature in one sentence?]

**Problem:** [What user problem does this solve?]

**Solution:** [How does this feature solve it?]

## Why Now?
[Why is this a priority? Business or user value?]

## Goals & Success Metrics
**Primary Goal:** [e.g., Increase user retention by 15%]

**How We'll Measure Success:**
- [Metric 1]: Target: [X]
- [Metric 2]: Target: [X]
- [Metric 3]: Target: [X]

## Target Users
**Who:** [Which user segment?]

**When:** [In what scenario do they need this?]

**Current Behavior:** [How do they handle this today?]

## User Experience

### User Flow
1. User [action]
2. System [response]
3. User sees [result]
4. [Continue flow...]

### Key Screens/States
**Screen 1: [Name]**
- Elements: [What's on screen]
- Interactions: [What user can do]
- Next: [Where they go next]

[Repeat for each screen]

## Requirements

### Must Have ✅
- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Nice to Have 🎯
- [ ] [Enhancement 1]
- [ ] [Enhancement 2]

### Out of Scope ❌
- [Explicitly not included in v1]
- [To be considered for v2]

## Technical Notes
**Approach:** [Brief technical approach]

**Dependencies:** [What needs to exist first?]

**Concerns:** [Any technical risks or questions?]

## Design
[Link to Figma/design files]

## Open Questions
- [ ] [Question for stakeholder 1]
- [ ] [Question for stakeholder 2]

## Timeline
**Target Launch:** [Date]

**Key Dates:**
- Design complete: [Date]
- Development starts: [Date]
- QA: [Date]
- Launch: [Date]

## Rollout Plan
**Phase 1:** [XX% of users - Date]
**Phase 2:** [XX% of users - Date]  
**Phase 3:** [100% - Date]

## Success Criteria
Launch is successful if:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Metrics meet targets
- [ ] No P0/P1 bugs`
      }
    ]
  },
  {
    name: "Marketing & Sales",
    description: "Documents for marketing campaigns and sales processes",
    icon: "Megaphone",
    templates: [
      {
        title: "Marketing Campaign Brief",
        description: "Campaign planning and strategy document",
        tags: ["marketing", "campaign", "planning"],
        content: `# Marketing Campaign Brief: [Campaign Name]

## Campaign Overview
**Campaign Name:** [Name]
**Campaign Type:** [Product Launch / Brand Awareness / Lead Gen / Event / etc.]
**Duration:** [Start Date] - [End Date]
**Owner:** [Campaign Manager]
**Budget:** $XXX,XXX

## Objective
**Primary Goal:** [What is the #1 goal?]

**Success Metrics:**
- [Metric 1]: Target [X]
- [Metric 2]: Target [X]
- [Metric 3]: Target [X]

## Target Audience
### Primary Audience
- **Demographics:** [Age, location, income, etc.]
- **Psychographics:** [Interests, values, behaviors]
- **Pain Points:** [What keeps them up at night?]
- **Where They Hang Out:** [Channels, platforms, communities]

### Secondary Audience
[If applicable]

## Key Message
**Main Message:** [One sentence that captures the core message]

**Supporting Messages:**
- [Point 1]
- [Point 2]
- [Point 3]

**Call to Action:** [What do you want people to do?]

## Campaign Strategy
### Channels
| Channel | Tactic | Budget | Goal | Owner |
|---------|--------|--------|------|-------|
| Email | Newsletter series | $X,XXX | X leads | [Name] |
| Social | Paid ads + organic | $XX,XXX | X impressions | [Name] |
| Content | Blog posts + videos | $X,XXX | X views | [Name] |
| PR | Media outreach | $X,XXX | X mentions | [Name] |
| [etc] | [tactic] | $X,XXX | [goal] | [name] |

### Content Calendar
**Week 1:**
- [Date]: [Content piece] on [channel]
- [Date]: [Content piece] on [channel]

**Week 2:**
[Continue...]

## Creative Assets Needed
- [ ] [Asset 1: e.g., Landing page design]
- [ ] [Asset 2: e.g., Social media graphics]
- [ ] [Asset 3: e.g., Email templates]
- [ ] [Asset 4: e.g., Video script]

## Timeline
| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| [Date] | Campaign brief approved | [Name] | ✅ |
| [Date] | Creative assets ready | [Name] | 🔄 |
| [Date] | Campaign launch | [Name] | ⏳ |
| [Date] | Mid-campaign review | [Name] | ⏳ |
| [Date] | Campaign ends | [Name] | ⏳ |
| [Date] | Results analysis | [Name] | ⏳ |

## Budget Breakdown
| Line Item | Cost | Notes |
|-----------|------|-------|
| Paid advertising | $XX,XXX | [Platform breakdown] |
| Content creation | $X,XXX | [Video, design, copy] |
| Tools & software | $X,XXX | [Marketing automation, etc.] |
| Events/sponsorships | $X,XXX | [If applicable] |
| Misc/contingency | $X,XXX | [10% buffer] |
| **Total** | **$XXX,XXX** | |

## Competitive Analysis
**Competitor 1:** [What are they doing?]
**Competitor 2:** [What are they doing?]
**Our Advantage:** [How are we different/better?]

## Risks & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Plan] |
| [Risk 2] | High/Med/Low | High/Med/Low | [Plan] |

## Measurement Plan
### KPIs
- [KPI 1]: Target [X] | Track via [Tool]
- [KPI 2]: Target [X] | Track via [Tool]
- [KPI 3]: Target [X] | Track via [Tool]

### Reporting
- **Weekly:** [Quick update on key metrics]
- **End of Campaign:** [Full analysis with learnings]

## Post-Campaign
### Analysis Questions
- What worked well?
- What didn't work?
- What surprised us?
- What should we do next time?

### Follow-Up Actions
- [ ] [Action 1]
- [ ] [Action 2]

---
**Approved by:**
- [Stakeholder 1]: ________ Date: ____
- [Stakeholder 2]: ________ Date: ____`
      },
      {
        title: "Sales Playbook",
        description: "Sales process, scripts, and best practices",
        tags: ["sales", "process", "playbook"],
        content: `# Sales Playbook: [Company Name]

## Our Value Proposition
**Elevator Pitch (30 seconds):**
[Your compelling 30-second pitch]

**Longer Version (2 minutes):**
[Extended pitch with more details]

## Ideal Customer Profile (ICP)
### Company Characteristics
- **Industry:** [Industries you serve best]
- **Company Size:** [Employee count or revenue]
- **Geography:** [Regions/countries]
- **Tech Stack:** [Technologies they use]
- **Pain Points:** [Problems they have]

### Buyer Personas
**Persona 1: [Title, e.g., VP of Marketing]**
- **Goals:** [What they want to achieve]
- **Challenges:** [What holds them back]
- **Cares About:** [Metrics, outcomes they value]
- **How to Reach:** [Best channels, times]
- **Objections:** [Common pushback]

[Repeat for 2-3 key personas]

## Sales Process

### Stage 1: Prospecting
**Goal:** Build a list of qualified leads

**Activities:**
- Research target companies
- Identify decision makers
- Find warm intro paths
- Prepare personalized outreach

**Success Criteria:** X qualified prospects per week

### Stage 2: Initial Outreach
**Goal:** Get a meeting booked

**Channels:**
- Email (see templates below)
- LinkedIn
- Phone
- Referral

**Success Criteria:** X% reply rate, X meetings booked per week

### Stage 3: Discovery Call
**Goal:** Understand their needs, build rapport, qualify

**Duration:** 30 minutes

**Agenda:**
1. Intro & build rapport (5 min)
2. Their current situation (10 min)
3. Pain points & goals (10 min)
4. Next steps (5 min)

**Questions to Ask:**
- [Key discovery question 1]
- [Key discovery question 2]
- [Key discovery question 3]
- [BANT: Budget, Authority, Need, Timeline]

**Disqualifying Signals:**
- [Signal that this isn't a fit]
- [Another disqualifying factor]

**Success Criteria:** Clear understanding of needs, demo scheduled

### Stage 4: Demo/Presentation
**Goal:** Show value, address specific pain points

**Duration:** 45-60 minutes

**Demo Flow:**
1. Quick recap of their needs (5 min)
2. Show solution tailored to them (30 min)
3. Address questions (10 min)
4. Discuss pricing & next steps (10 min)

**Demo Best Practices:**
- Start with their biggest pain point
- Use their data/examples when possible
- Focus on outcomes, not features
- Leave time for questions
- End with clear CTA

**Success Criteria:** Proposal requested, champion identified

### Stage 5: Proposal
**Goal:** Present clear, compelling offer

**Components:**
- Executive summary
- Solution overview
- Pricing options (3 tiers ideally)
- Implementation timeline
- ROI calculation
- Terms & conditions

**Success Criteria:** Proposal sent within 24 hours

### Stage 6: Negotiation
**Goal:** Address objections, reach agreement

**Common Objections & Responses:**

**"It's too expensive"**
→ [Your response focusing on ROI, payment options, cost of not solving problem]

**"We need to think about it"**
→ [Your response to uncover real objection, create urgency]

**"We're happy with current solution"**
→ [Your differentiation and switching value]

**"Not a priority right now"**
→ [Your business case for urgency]

**Negotiation Guardrails:**
- Can discount up to X% with manager approval
- Cannot discount below $XXX minimum
- Can extend payment terms to X months
- Can add [features] to sweeten deal

### Stage 7: Close
**Goal:** Get signature, onboard customer

**Closing Techniques:**
- Assumptive close: "I'll send the contract today..."
- Alternative close: "Should we start on [date 1] or [date 2]?"
- Urgency close: "This pricing is good through [date]..."

**Post-Close:**
- [ ] Send contract via [tool]
- [ ] Introduce to customer success
- [ ] Schedule kickoff call
- [ ] Send welcome email

## Email Templates

### Template 1: Cold Outreach
**Subject:** [Personalized subject line]

Hi [First Name],

[Personal connection or relevant insight about their company]

I noticed [specific trigger: funding round, new initiative, pain point].

[Company Name] helps [similar companies] [achieve specific outcome]. For example, [customer] saw [specific result] in [timeframe].

Would you be open to a quick 15-minute call to explore if we could help [Company Name] [achieve specific goal]?

[Your calendar link]

Best,
[Your Name]

### Template 2: Follow-Up
[Include 3-5 more templates]

## Sales Resources
### Case Studies
- [Customer 1]: [Result achieved]
- [Customer 2]: [Result achieved]

### Competitive Battle Cards
**vs. Competitor 1:**
- Their Strengths: [List]
- Our Advantages: [List]
- Positioning: [How to position against them]

### Pricing
[Link to pricing sheet or overview]

### Demo Environment
[Link to demo account]

## Success Metrics
### Individual Rep Metrics
- Outreach: [X] per day
- Meetings booked: [X] per week
- Demos: [X] per week
- Proposals sent: [X] per month
- Closed deals: [X] per month
- Quota: $XXX,XXX per quarter

### Team Metrics
- Win rate: Target [X]%
- Average deal size: Target $XX,XXX
- Sales cycle length: Target [X] days
- Pipeline coverage: Target [X]x quota

## Tools & Systems
- **CRM:** [Salesforce, HubSpot, etc.]
- **Email:** [Outreach, SalesLoft, etc.]
- **Calling:** [Tool]
- **Video:** [Zoom, etc.]
- **Contract:** [DocuSign, etc.]

## Tips from Top Performers
1. [Tip from your best salesperson]
2. [Another best practice]
3. [Another best practice]`
      }
    ]
  },
  {
    name: "Operations",
    description: "Documents for processes, policies, and SOPs",
    icon: "Settings",
    templates: [
      {
        title: "Standard Operating Procedure (SOP)",
        description: "Template for documenting processes",
        tags: ["operations", "process", "SOP"],
        content: `# Standard Operating Procedure

## Document Information
- **SOP Title:** [Process Name]
- **SOP ID:** [Unique identifier]
- **Department:** [Which department owns this]
- **Created By:** [Name]
- **Created Date:** [Date]
- **Last Updated:** [Date]
- **Review Frequency:** [Monthly/Quarterly/Annually]
- **Version:** [1.0]

## Purpose
[What is this process for? Why does it exist?]

## Scope
**Applies to:** [Who should follow this SOP?]
**Does NOT apply to:** [Any exceptions or exclusions]

## Definitions
- **[Term 1]:** [Definition]
- **[Term 2]:** [Definition]

## Roles & Responsibilities
- **[Role 1]:** [What they're responsible for]
- **[Role 2]:** [What they're responsible for]
- **[Role 3]:** [What they're responsible for]

## Required Materials/Tools
- [ ] [Tool or resource 1]
- [ ] [Tool or resource 2]
- [ ] [Access/permission needed]

## Prerequisites
Before starting this process, ensure:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

## Procedure

### Step 1: [Action Name]
**Responsible:** [Role/Person]
**Time Required:** [X minutes]

**Instructions:**
1. [Detailed sub-step]
2. [Detailed sub-step]
3. [Detailed sub-step]

**Expected Output:** [What should result from this step]

**Common Issues & Solutions:**
- Issue: [Problem that might occur]
  Solution: [How to resolve it]

---

### Step 2: [Action Name]
[Repeat format above]

---

### Step 3: [Action Name]
[Repeat format above]

[Continue for all steps...]

## Quality Checks
At the end of this process, verify:
- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

## Success Criteria
This process is complete when:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Metrics & KPIs
Track the following:
- **[Metric 1]:** Target: [X]
- **[Metric 2]:** Target: [X]
- **[Metric 3]:** Target: [X]

## Troubleshooting

### Problem: [Common issue 1]
**Symptoms:** [How you know this is happening]
**Cause:** [Why it happens]
**Solution:** [Step-by-step fix]

### Problem: [Common issue 2]
[Repeat above]

## Safety/Compliance Notes
⚠️ **Important:**
- [Safety consideration or compliance requirement]
- [Another important note]

## References & Related Documents
- [Related SOP or document]
- [Policy reference]
- [Training materials]

## Appendix
### Appendix A: [Supporting Material]
[Charts, templates, screenshots, etc.]

### Appendix B: [Checklist]
[Quick reference checklist version of this SOP]

---

## Change Log
| Version | Date | Changed By | Description of Changes |
|---------|------|------------|------------------------|
| 1.0 | [Date] | [Name] | Initial creation |
| | | | |

## Approval
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Created By | | | |
| Reviewed By | | | |
| Approved By | | | |`
      },
      {
        title: "Project Charter",
        description: "Project initiation and authorization document",
        tags: ["project management", "charter", "planning"],
        content: `# Project Charter: [Project Name]

## Project Information
- **Project Name:** [Full project name]
- **Project ID:** [Unique identifier]
- **Start Date:** [Planned start]
- **End Date:** [Planned completion]
- **Project Manager:** [Name]
- **Executive Sponsor:** [Name]
- **Budget:** $XXX,XXX

## Executive Summary
[2-3 paragraph overview of the project, why it matters, and expected outcome]

## Project Purpose & Justification
**Business Case:**
[Why are we doing this project? What business problem does it solve?]

**Strategic Alignment:**
[How does this support company strategy or goals?]

**Expected ROI:**
[What return do we expect? Cost savings, revenue, efficiency?]

## Project Objectives
### Primary Objective
[The #1 goal of this project - SMART format]

### Secondary Objectives
1. [Objective 2 - SMART format]
2. [Objective 3 - SMART format]
3. [Objective 4 - SMART format]

## Project Scope

### In Scope
- [Deliverable or activity 1]
- [Deliverable or activity 2]
- [Deliverable or activity 3]

### Out of Scope
- [Explicitly NOT included]
- [Another exclusion]
- [Another exclusion]

## Deliverables
| Deliverable | Description | Due Date | Owner |
|-------------|-------------|----------|-------|
| [Deliverable 1] | [What it is] | [Date] | [Name] |
| [Deliverable 2] | [What it is] | [Date] | [Name] |
| [Deliverable 3] | [What it is] | [Date] | [Name] |

## Success Criteria
This project will be considered successful if:
- [ ] [Criterion 1 - measurable]
- [ ] [Criterion 2 - measurable]
- [ ] [Criterion 3 - measurable]
- [ ] Completed on time and within budget
- [ ] Stakeholder satisfaction rating of [X]/10

## Stakeholders
| Name | Role | Interest | Influence | Communication Needs |
|------|------|----------|-----------|---------------------|
| [Name] | Sponsor | High | High | Weekly updates |
| [Name] | User | Med | Low | Monthly demos |
| [Name] | Contributor | Med | Med | Daily standups |

## Project Team
| Name | Role | Responsibilities | Time Allocation |
|------|------|------------------|-----------------|
| [Name] | Project Manager | [Responsibilities] | 100% |
| [Name] | [Role] | [Responsibilities] | X% |
| [Name] | [Role] | [Responsibilities] | X% |

## High-Level Timeline
| Phase | Duration | Start Date | End Date | Key Milestones |
|-------|----------|------------|----------|----------------|
| Initiation | X weeks | [Date] | [Date] | Charter approved |
| Planning | X weeks | [Date] | [Date] | Plan approved |
| Execution | X weeks | [Date] | [Date] | [Milestone] |
| Closing | X weeks | [Date] | [Date] | Project complete |

## Budget
| Category | Estimated Cost | Notes |
|----------|----------------|-------|
| Personnel | $XXX,XXX | [FTE costs] |
| Software/Tools | $XX,XXX | [Tool licenses] |
| External Services | $XX,XXX | [Contractors, vendors] |
| Hardware/Equipment | $XX,XXX | [If applicable] |
| Training | $X,XXX | [Team training] |
| Contingency (10%) | $XX,XXX | [Risk buffer] |
| **Total** | **$XXX,XXX** | |

## Assumptions
1. [Assumption 1]
2. [Assumption 2]
3. [Assumption 3]

## Constraints
1. [Constraint 1 - time, budget, resource, etc.]
2. [Constraint 2]
3. [Constraint 3]

## Risks
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to prevent/mitigate] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to prevent/mitigate] |
| [Risk 3] | High/Med/Low | High/Med/Low | [How to prevent/mitigate] |

## Dependencies
1. [Dependency on another project or team]
2. [External dependency]
3. [Resource dependency]

## Communication Plan
| Audience | Method | Frequency | Owner |
|----------|--------|-----------|-------|
| Sponsor | Status report | Weekly | PM |
| Team | Standup | Daily | PM |
| Stakeholders | Newsletter | Bi-weekly | PM |

## Change Management
**Change Request Process:**
1. [How changes to scope/budget/timeline are requested]
2. [Who reviews and approves]
3. [How changes are communicated]

**Approval Threshold:**
- Changes < $X,XXX or < X days: PM approval
- Changes > $X,XXX or > X days: Sponsor approval

## Project Approval
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | | | |
| Executive Sponsor | | | |
| [Other Approver] | | | |

---
**PROJECT AUTHORIZED TO PROCEED:** ☐ Yes ☐ No`
      }
    ]
  }
];

export function downloadDocumentTemplate(category: string, templateIndex: number) {
  const cat = DOCUMENT_CATEGORIES.find(c => c.name === category);
  if (!cat || !cat.templates[templateIndex]) {
    throw new Error('Template not found');
  }
  
  const template = cat.templates[templateIndex];
  const filename = template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Download as markdown file
  const blob = new Blob([template.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
