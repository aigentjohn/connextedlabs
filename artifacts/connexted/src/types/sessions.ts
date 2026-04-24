// =====================================================
// SESSION TYPES - Replaces "Cohort" terminology
// =====================================================
// Sessions are one-time meetings/events that belong to
// either a Program or a Circle

export type SessionType =
  | 'meeting'
  | 'workshop'
  | 'webinar'
  | 'training'
  | 'social'
  | 'standup'
  | 'class'
  | 'other';

export type SessionStatus = 'proposed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  meeting:  'Meeting',
  workshop: 'Workshop',
  webinar:  'Webinar',
  training: 'Training',
  social:   'Social',
  standup:  'Standup',
  class:    'Class',
  other:    'Other',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  proposed:    'Date TBD',
  scheduled:   'Scheduled',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

export interface Session {
  id: string;

  // Parent relationship — one of program, circle, or pathway
  program_id: string | null;
  circle_id: string | null;
  pathway_id: string | null;

  // Session details
  name: string;
  description: string | null;
  session_type: SessionType;

  // Schedule — nullable: proposed sessions have no confirmed date yet
  start_date: string | null; // ISO timestamp or null
  duration_minutes: number | null;

  // Timezone — defaults to America/New_York
  timezone: string;
  
  // Location
  location: string | null;
  virtual_link: string | null;
  
  // Status
  status: SessionStatus;
  
  // Capacity
  max_capacity: number | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed fields (from joins)
  program_name?: string;
  circle_name?: string;
  expected_count?: number;
  attended_count?: number;
  guest_count?: number;
  attendance_rate?: number;
}

// =====================================================
// SESSION ATTENDANCE TYPES
// =====================================================

export interface SessionAttendance {
  id: string;
  session_id: string;
  
  // Member attendance (user_id populated)
  user_id: string | null;
  
  // Guest attendance (non-members)
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  
  // Attendance tracking
  expected: boolean; // Did they RSVP or were they pre-registered?
  attended: boolean; // Did they actually show up?
  
  // Notes
  notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed fields (from joins)
  user_name?: string;
  user_email?: string;
}

// =====================================================
// ENGAGEMENT LEVEL TYPES
// =====================================================

export type ProgramEngagementLevel = 
  | 'enrolled'      // New member, hasn't attended yet
  | 'participating' // ≥70% attendance
  | 'at_risk'       // 40-69% attendance OR 3+ consecutive absences
  | 'inactive'      // <40% attendance
  | 'graduated';    // Completed the program

export type CircleEngagementLevel = 
  | 'new'        // Just joined
  | 'active'     // Activity in last 14 days
  | 'occasional' // Activity in last 30 days
  | 'inactive'   // No activity in 60+ days
  | 'alumni';    // Left the circle

export interface MemberEngagement {
  engagement_level: ProgramEngagementLevel | CircleEngagementLevel;
  total_sessions_expected: number;
  total_sessions_attended: number;
  attendance_rate: number;
  consecutive_absences?: number; // Programs only
  last_session_attended_at: string | null;
  last_activity_at?: string | null; // Circles only (posts, comments, etc.)
}

// =====================================================
// EXTENDED APPLICATION TYPE (with engagement)
// =====================================================

export interface ProgramApplication {
  id: string;
  program_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  
  // Application content
  application_text: string | null;
  application_data: any;
  
  // Review
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  
  // Engagement tracking (NEW)
  engagement_level: ProgramEngagementLevel;
  last_session_attended_at: string | null;
  consecutive_absences: number;
  total_sessions_expected: number;
  total_sessions_attended: number;
  attendance_rate: number;
  
  // Timestamps
  applied_at: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  user_name?: string;
  user_email?: string;
  program_name?: string;
  reviewer_name?: string;
}

// =====================================================
// EXTENDED MEMBERSHIP TYPE (with engagement)
// =====================================================

export interface CircleMembership {
  id: string;
  container_id: string; // circle_id
  container_type: 'circle';
  user_id: string;
  role: string;
  status: 'pending' | 'active' | 'inactive';
  
  // Engagement tracking (NEW)
  engagement_level: CircleEngagementLevel;
  last_session_attended_at: string | null;
  last_activity_at: string | null;
  total_sessions_expected: number;
  total_sessions_attended: number;
  attendance_rate: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed fields
  user_name?: string;
  user_email?: string;
  circle_name?: string;
}

// =====================================================
// SESSION OVERVIEW (for admin dashboards)
// =====================================================

export interface SessionOverview {
  session_id: string;
  session_name: string;
  scheduled_at: string;
  duration_minutes: number;
  program_id: string | null;
  circle_id: string | null;
  program_name: string | null;
  circle_name: string | null;
  expected_count: number;
  attended_count: number;
  guest_count: number;
  attendance_rate: number | null;
}

// =====================================================
// ENGAGEMENT SUMMARY (for dashboards)
// =====================================================

export interface EngagementSummary {
  entity_type: 'program' | 'circle';
  entity_id: string;
  entity_name: string;
  
  // Total members by engagement level
  enrolled?: number;      // Programs only
  participating?: number; // Programs only
  at_risk?: number;       // Programs only
  inactive_program?: number; // Programs only
  graduated?: number;     // Programs only
  
  new?: number;           // Circles only
  active?: number;        // Circles only
  occasional?: number;    // Circles only
  inactive_circle?: number; // Circles only
  alumni?: number;        // Circles only
  
  // Overall stats
  total_members: number;
  total_sessions: number;
  upcoming_sessions: number;
  average_attendance_rate: number;
}
