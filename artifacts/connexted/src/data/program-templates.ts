// Program Templates - Pre-built program structures for coaching & learning platforms

export interface ContainerItem {
  id?: string;
  type: 'builds' | 'elevators' | 'tables' | 'standups' | 'pitches' | 'meetings' | 'meetups' | 'sprints';
  name: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

// Circle definition for programs
export interface CircleDefinition {
  name: string;
  description: string;
  access_type?: 'open' | 'invite' | 'request';
  image?: string;
}

export interface ProgramJourney {
  id: number;
  title: string;
  description: string;
  startDate?: string;
  finishDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
  containers: ContainerItem[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  category: 'coaching' | 'leadership' | 'community' | 'accelerator' | 'wellness' | 'professional';
  duration: string;
  icon: string;
  color: string;
  circle: CircleDefinition;
  journeys: ProgramJourney[];
}

// ============================================================================
// 1. Group Coaching Cohort
// ============================================================================

export const GROUP_COACHING_COHORT: ProgramTemplate = {
  id: 'group-coaching-cohort',
  name: 'Group Coaching Cohort',
  description: 'A structured cohort-based coaching program with weekly group sessions, accountability partners, and milestone check-ins',
  category: 'coaching',
  duration: '8-12 weeks',
  icon: '🎯',
  color: 'from-indigo-500 to-purple-600',
  circle: {
    name: 'Coaching Cohort',
    description: 'Your cohort community — share wins, ask questions, and support each other between sessions',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Foundation & Goal Setting',
      description: 'Clarify your vision, set measurable goals, and establish your coaching agreement with the group.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Member Introductions', status: 'not-started' },
        { type: 'tables', name: 'Goal Tracking Board', status: 'not-started' },
        { type: 'meetups', name: 'Kickoff Session', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Deep Work & Skill Building',
      description: 'Weekly group coaching sessions with targeted exercises, hot seats, and peer feedback.',
      status: 'not-started',
      containers: [
        { type: 'standups', name: 'Weekly Check-ins', status: 'not-started' },
        { type: 'meetups', name: 'Group Coaching Sessions', status: 'not-started' },
        { type: 'builds', name: 'Action Plans', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Integration & Accountability',
      description: 'Apply learnings, track progress with accountability partners, and build sustainable habits.',
      status: 'not-started',
      containers: [
        { type: 'standups', name: 'Accountability Updates', status: 'not-started' },
        { type: 'tables', name: 'Progress Dashboard', status: 'not-started' },
        { type: 'meetups', name: 'Peer Coaching Pairs', status: 'not-started' },
      ],
    },
    {
      id: 4,
      title: 'Celebration & Next Steps',
      description: 'Reflect on growth, celebrate milestones, and create a forward plan.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Transformation Stories', status: 'not-started' },
        { type: 'meetups', name: 'Graduation Ceremony', status: 'not-started' },
        { type: 'tables', name: '90-Day Forward Plan', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 2. Leadership Development Program
// ============================================================================

export const LEADERSHIP_DEVELOPMENT: ProgramTemplate = {
  id: 'leadership-development',
  name: 'Leadership Development Program',
  description: 'Develop emerging leaders through assessments, coaching sessions, 360 feedback, and real-world leadership projects',
  category: 'leadership',
  duration: '3-6 months',
  icon: '👑',
  color: 'from-amber-500 to-orange-600',
  circle: {
    name: 'Leadership Circle',
    description: 'A peer network of emerging leaders sharing insights, challenges, and support',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Self-Assessment & Awareness',
      description: 'Complete leadership assessments, gather 360 feedback, and identify growth areas.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Leadership Vision Statements', status: 'not-started' },
        { type: 'tables', name: 'Assessment Results', status: 'not-started' },
        { type: 'meetups', name: 'Orientation Workshop', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Core Leadership Skills',
      description: 'Build skills in communication, delegation, conflict resolution, and strategic thinking.',
      status: 'not-started',
      containers: [
        { type: 'meetups', name: 'Skills Workshops', status: 'not-started' },
        { type: 'builds', name: 'Leadership Playbook', status: 'not-started' },
        { type: 'standups', name: 'Weekly Reflections', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Applied Leadership Project',
      description: 'Lead a real initiative in your organization while receiving coaching and peer support.',
      status: 'not-started',
      containers: [
        { type: 'builds', name: 'Project Documentation', status: 'not-started' },
        { type: 'standups', name: 'Project Updates', status: 'not-started' },
        { type: 'meetups', name: 'Coaching Office Hours', status: 'not-started' },
      ],
    },
    {
      id: 4,
      title: 'Impact Review & Graduation',
      description: 'Present project results, receive final feedback, and plan your ongoing leadership journey.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Impact Presentations', status: 'not-started' },
        { type: 'tables', name: 'Growth Portfolio', status: 'not-started' },
        { type: 'meetups', name: 'Graduation & Alumni Launch', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 3. Community Builder
// ============================================================================

export const COMMUNITY_BUILDER: ProgramTemplate = {
  id: 'community-builder',
  name: 'Community Builder',
  description: 'Launch and grow an engaged community with structured onboarding, regular events, and member-driven content',
  category: 'community',
  duration: 'Ongoing',
  icon: '🤝',
  color: 'from-green-500 to-teal-600',
  circle: {
    name: 'Community Hub',
    description: 'The central gathering space for community members to connect, share, and collaborate',
    access_type: 'open',
  },
  journeys: [
    {
      id: 1,
      title: 'Welcome & Onboarding',
      description: 'Help new members feel at home with introductions, community guidelines, and a welcome event.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Member Introductions', status: 'not-started' },
        { type: 'tables', name: 'Community Resources', status: 'not-started' },
        { type: 'meetups', name: 'Welcome Session', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Engagement & Connection',
      description: 'Regular events, discussion topics, and collaborative projects to build relationships.',
      status: 'not-started',
      containers: [
        { type: 'meetups', name: 'Monthly Gatherings', status: 'not-started' },
        { type: 'standups', name: 'Community Pulse', status: 'not-started' },
        { type: 'tables', name: 'Member Directory', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Member-Led Initiatives',
      description: 'Empower members to lead workshops, discussions, and projects.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Initiative Proposals', status: 'not-started' },
        { type: 'builds', name: 'Project Spaces', status: 'not-started' },
        { type: 'meetups', name: 'Member-Led Sessions', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 4. Startup Accelerator
// ============================================================================

export const STARTUP_ACCELERATOR: ProgramTemplate = {
  id: 'startup-accelerator',
  name: 'Startup Accelerator',
  description: 'A 12-week intensive to take founders from idea validation through MVP launch and investor pitch',
  category: 'accelerator',
  duration: '12 weeks',
  icon: '🚀',
  color: 'from-blue-500 to-cyan-600',
  circle: {
    name: 'Accelerator Cohort',
    description: 'A community of ambitious founders building the next generation of ventures',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Validation',
      description: 'Validate your idea through customer discovery, market research, and problem-solution fit.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Founder Introductions', status: 'not-started' },
        { type: 'builds', name: 'Customer Discovery Notes', status: 'not-started' },
        { type: 'tables', name: 'Market Research', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Build',
      description: 'Define your MVP scope, build your product, and get it in front of first users.',
      status: 'not-started',
      containers: [
        { type: 'standups', name: 'Sprint Updates', status: 'not-started' },
        { type: 'builds', name: 'Product Development', status: 'not-started' },
        { type: 'meetups', name: 'Mentor Office Hours', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Launch & Pitch',
      description: 'Launch your product, refine your go-to-market, and prepare for Demo Day.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Demo Day Pitch', status: 'not-started' },
        { type: 'meetups', name: 'Demo Day Event', status: 'not-started' },
        { type: 'tables', name: 'Traction Metrics', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 5. Wellness & Mindfulness Program
// ============================================================================

export const WELLNESS_PROGRAM: ProgramTemplate = {
  id: 'wellness-program',
  name: 'Wellness & Mindfulness Program',
  description: 'A holistic program combining mindfulness practices, movement, journaling, and community support for personal well-being',
  category: 'wellness',
  duration: '6-8 weeks',
  icon: '🧘',
  color: 'from-emerald-500 to-green-600',
  circle: {
    name: 'Wellness Circle',
    description: 'A safe, supportive space for your wellness journey',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Awareness & Intention',
      description: 'Assess your current well-being, set intentions, and learn foundational mindfulness practices.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Wellness Intentions', status: 'not-started' },
        { type: 'tables', name: 'Well-being Tracker', status: 'not-started' },
        { type: 'meetups', name: 'Opening Circle', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Daily Practices',
      description: 'Build daily habits with guided meditations, journaling prompts, and movement practices.',
      status: 'not-started',
      containers: [
        { type: 'standups', name: 'Daily Reflections', status: 'not-started' },
        { type: 'meetups', name: 'Guided Sessions', status: 'not-started' },
        { type: 'builds', name: 'Personal Practice Log', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Integration & Flourishing',
      description: 'Deepen your practice, share your journey, and create a sustainable wellness plan.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Wellness Journey Stories', status: 'not-started' },
        { type: 'meetups', name: 'Closing Circle', status: 'not-started' },
        { type: 'tables', name: 'Ongoing Practice Plan', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 6. Professional Certification Prep
// ============================================================================

export const CERTIFICATION_PREP: ProgramTemplate = {
  id: 'certification-prep',
  name: 'Professional Certification Prep',
  description: 'A structured study program with study groups, practice exams, mentor support, and accountability for any professional certification',
  category: 'professional',
  duration: '8-16 weeks',
  icon: '📜',
  color: 'from-violet-500 to-purple-600',
  circle: {
    name: 'Certification Study Group',
    description: 'Study together, share resources, and keep each other accountable',
    access_type: 'request',
  },
  journeys: [
    {
      id: 1,
      title: 'Assessment & Study Plan',
      description: 'Take a diagnostic assessment, identify knowledge gaps, and create your personalized study plan.',
      status: 'not-started',
      containers: [
        { type: 'tables', name: 'Study Plan & Schedule', status: 'not-started' },
        { type: 'elevators', name: 'Study Group Introductions', status: 'not-started' },
        { type: 'meetups', name: 'Orientation & Strategy Session', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Core Study & Practice',
      description: 'Work through study materials, attend review sessions, and practice with mock exams.',
      status: 'not-started',
      containers: [
        { type: 'standups', name: 'Weekly Study Progress', status: 'not-started' },
        { type: 'meetups', name: 'Review Sessions', status: 'not-started' },
        { type: 'builds', name: 'Study Notes & Resources', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Final Review & Exam Prep',
      description: 'Intensive review, timed practice exams, and final preparation before test day.',
      status: 'not-started',
      containers: [
        { type: 'tables', name: 'Practice Exam Scores', status: 'not-started' },
        { type: 'meetups', name: 'Exam Strategy Workshop', status: 'not-started' },
        { type: 'standups', name: 'Final Week Check-ins', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 7. Mastermind Group
// ============================================================================

export const MASTERMIND_GROUP: ProgramTemplate = {
  id: 'mastermind-group',
  name: 'Mastermind Group',
  description: 'A peer-to-peer mastermind format with rotating hot seats, accountability partnerships, and structured problem-solving',
  category: 'coaching',
  duration: '6 months',
  icon: '🧠',
  color: 'from-rose-500 to-pink-600',
  circle: {
    name: 'Mastermind Circle',
    description: 'A confidential space for high-level peer support and strategic thinking',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Formation & Agreements',
      description: 'Establish group norms, confidentiality agreements, and meeting cadence.',
      status: 'not-started',
      containers: [
        { type: 'elevators', name: 'Member Profiles & Goals', status: 'not-started' },
        { type: 'tables', name: 'Meeting Schedule & Agenda', status: 'not-started' },
        { type: 'meetups', name: 'Launch Session', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Monthly Mastermind Sessions',
      description: 'Rotating hot seats where one member presents a challenge and the group provides structured input.',
      status: 'not-started',
      containers: [
        { type: 'meetups', name: 'Hot Seat Sessions', status: 'not-started' },
        { type: 'standups', name: 'Monthly Wins & Challenges', status: 'not-started' },
        { type: 'builds', name: 'Action Plans & Follow-ups', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Review & Renewal',
      description: 'Review collective progress, celebrate wins, and decide on continuation.',
      status: 'not-started',
      containers: [
        { type: 'pitches', name: 'Progress Presentations', status: 'not-started' },
        { type: 'tables', name: 'Impact Scorecard', status: 'not-started' },
        { type: 'meetups', name: 'Retrospective & Renewal', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// 8. Executive Coaching Program
// ============================================================================

export const EXECUTIVE_COACHING: ProgramTemplate = {
  id: 'executive-coaching',
  name: 'Executive Coaching Program',
  description: 'High-touch executive coaching with 1:1 sessions, 360 assessments, stakeholder interviews, and development planning',
  category: 'leadership',
  duration: '6-12 months',
  icon: '💼',
  color: 'from-slate-600 to-gray-800',
  circle: {
    name: 'Executive Circle',
    description: 'A private space for executive-level insights, resources, and peer connection',
    access_type: 'invite',
  },
  journeys: [
    {
      id: 1,
      title: 'Discovery & Assessment',
      description: 'Complete leadership assessments, stakeholder interviews, and establish coaching objectives.',
      status: 'not-started',
      containers: [
        { type: 'tables', name: 'Assessment & 360 Results', status: 'not-started' },
        { type: 'builds', name: 'Coaching Agreement', status: 'not-started' },
        { type: 'meetups', name: '1:1 Discovery Session', status: 'not-started' },
      ],
    },
    {
      id: 2,
      title: 'Active Coaching',
      description: 'Bi-weekly coaching sessions focused on your development priorities and real-time challenges.',
      status: 'not-started',
      containers: [
        { type: 'meetups', name: '1:1 Coaching Sessions', status: 'not-started' },
        { type: 'standups', name: 'Between-Session Reflections', status: 'not-started' },
        { type: 'builds', name: 'Development Journal', status: 'not-started' },
      ],
    },
    {
      id: 3,
      title: 'Mid-Point Review',
      description: 'Assess progress against goals, gather stakeholder feedback, and adjust development plan.',
      status: 'not-started',
      containers: [
        { type: 'tables', name: 'Progress Assessment', status: 'not-started' },
        { type: 'meetups', name: 'Mid-Point Review Session', status: 'not-started' },
      ],
    },
    {
      id: 4,
      title: 'Sustained Growth & Transition',
      description: 'Consolidate gains, build self-coaching capability, and create your ongoing development plan.',
      status: 'not-started',
      containers: [
        { type: 'builds', name: 'Self-Coaching Toolkit', status: 'not-started' },
        { type: 'tables', name: 'Forward Development Plan', status: 'not-started' },
        { type: 'meetups', name: 'Closing & Transition Session', status: 'not-started' },
      ],
    },
  ],
};

// ============================================================================
// ALL TEMPLATES
// ============================================================================

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  GROUP_COACHING_COHORT,
  LEADERSHIP_DEVELOPMENT,
  COMMUNITY_BUILDER,
  STARTUP_ACCELERATOR,
  WELLNESS_PROGRAM,
  CERTIFICATION_PREP,
  MASTERMIND_GROUP,
  EXECUTIVE_COACHING,
];

// Get program template by ID
export function getProgramTemplate(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find(template => template.id === id);
}

// Get programs by category
export function getProgramsByCategory(category: ProgramTemplate['category']): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter(template => template.category === category);
}
