/**
 * JSON Schema Definitions for Import/Export
 * 
 * This file defines the JSON structure for exporting and importing
 * containers, circles, and programs. Enables rapid content migration
 * and template creation.
 */
// Split candidate: ~499 lines — consider splitting into program-schema.ts, circle-schema.ts, and container-schema.ts.

// Base metadata included in all exports
export interface ExportMetadata {
  version: string;
  exportedAt: string;
  exportedBy: string;
  exportType: 'container' | 'circle' | 'program' | 'course';
  containerType?: string;
  platform: string;
}

// ============================================================================
// CONTAINER SCHEMAS
// ============================================================================

export interface PitchExport {
  metadata: ExportMetadata;
  pitch: {
    name: string;
    slug: string;
    description: string;
    problem_statement?: string;
    solution_overview?: string;
    target_market?: string;
    competitive_advantage?: string;
    business_model?: string;
    traction?: string;
    team_overview?: string;
    ask_amount?: string;
    use_of_funds?: string;
    pitch_deck_url?: string;
    demo_video_url?: string;
    website_url?: string;
    status: string;
    visibility: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
  };
}

export interface BuildExport {
  metadata: ExportMetadata;
  build: {
    name: string;
    slug: string;
    description: string;
    build_type: string;
    status: string;
    visibility: string;
    requirements?: string;
    objectives?: string;
    deliverables?: string;
    timeline?: string;
    resources?: string;
    success_criteria?: string;
    tags?: string[];
    phases?: Array<{
      name: string;
      description: string;
      order_index: number;
      status: string;
      start_date?: string;
      end_date?: string;
      deliverables?: string;
    }>;
    tasks?: Array<{
      title: string;
      description?: string;
      status: string;
      priority?: string;
      due_date?: string;
      phase_name?: string;
    }>;
    custom_fields?: Record<string, any>;
  };
}

export interface TableExport {
  metadata: ExportMetadata;
  table: {
    name: string;
    slug: string;
    description: string;
    table_type: string;
    visibility: string;
    max_participants?: number;
    meeting_schedule?: string;
    meeting_link?: string;
    tags?: string[];
    columns?: Array<{
      name: string;
      column_type: string;
      order_index: number;
      is_required: boolean;
      options?: string[];
    }>;
    rows?: Array<{
      data: Record<string, any>;
      order_index: number;
    }>;
    custom_fields?: Record<string, any>;
  };
}

export interface ElevatorExport {
  metadata: ExportMetadata;
  elevator: {
    name: string;
    slug: string;
    description: string;
    elevator_type: string;
    duration_seconds?: number;
    visibility: string;
    prompt_text?: string;
    guidelines?: string;
    evaluation_criteria?: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
  };
}

export interface MeetingExport {
  metadata: ExportMetadata;
  meeting: {
    name: string;
    slug: string;
    description: string;
    meeting_type: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    meeting_link?: string;
    agenda?: string;
    max_participants?: number;
    visibility: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
  };
}

export interface StandupExport {
  metadata: ExportMetadata;
  standup: {
    name: string;
    slug: string;
    description: string;
    standup_type: string;
    schedule: string;
    time_limit_minutes?: number;
    visibility: string;
    questions?: string[];
    tags?: string[];
    custom_fields?: Record<string, any>;
  };
}

export interface MeetupExport {
  metadata: ExportMetadata;
  meetup: {
    name: string;
    slug: string;
    description: string;
    meetup_type: string;
    visibility: string;
    location?: string;
    tags?: string[];
    meetings?: Array<{
      name: string;
      description: string;
      start_time?: string;
      end_time?: string;
      location?: string;
      meeting_link?: string;
    }>;
    custom_fields?: Record<string, any>;
  };
}

export interface LibraryExport {
  metadata: ExportMetadata;
  library: {
    name: string;
    slug: string;
    description: string;
    library_type: string;
    visibility: string;
    tags?: string[];
    items?: Array<{
      title: string;
      description?: string;
      item_type: string;
      content?: string;
      url?: string;
      file_url?: string;
      order_index: number;
      tags?: string[];
    }>;
    custom_fields?: Record<string, any>;
  };
}

export interface ChecklistExport {
  metadata: ExportMetadata;
  checklist: {
    name: string;
    slug: string;
    description: string;
    checklist_type: string;
    visibility: string;
    tags?: string[];
    items?: Array<{
      title: string;
      description?: string;
      order_index: number;
      is_required: boolean;
      estimated_time_minutes?: number;
    }>;
    custom_fields?: Record<string, any>;
  };
}

export interface SprintExport {
  metadata: ExportMetadata;
  sprint: {
    name: string;
    slug: string;
    description: string;
    sprint_type: string;
    start_date?: string;
    end_date?: string;
    goal?: string;
    visibility: string;
    tags?: string[];
    tasks?: Array<{
      title: string;
      description?: string;
      status: string;
      priority?: string;
      points?: number;
      assigned_to?: string;
    }>;
    custom_fields?: Record<string, any>;
  };
}

// Union type for all container exports
export type ContainerExport =
  | PitchExport
  | BuildExport
  | TableExport
  | ElevatorExport
  | MeetingExport
  | StandupExport
  | MeetupExport
  | LibraryExport
  | ChecklistExport
  | SprintExport;

// ============================================================================
// CIRCLE SCHEMA
// ============================================================================

export interface CircleExport {
  metadata: ExportMetadata;
  circle: {
    name: string;
    slug: string;
    description: string;
    vision?: string;
    mission?: string;
    circle_type: string;
    visibility: string;
    tags?: string[];
    settings?: {
      auto_approve_members?: boolean;
      allow_member_invites?: boolean;
      show_member_list?: boolean;
      enable_discussions?: boolean;
      enable_events?: boolean;
      enable_documents?: boolean;
    };
    containers?: Array<{
      container_type: string;
      container_data: ContainerExport;
    }>;
    custom_fields?: Record<string, any>;
  };
}

// ============================================================================
// PROGRAM SCHEMA
// ============================================================================

export interface ProgramExport {
  metadata: ExportMetadata;
  program: {
    name: string;
    slug: string;
    description: string;
    overview?: string;
    objectives?: string;
    requirements?: string;
    program_type: string;
    duration_weeks?: number;
    visibility: string;
    tags?: string[];
    pricing?: {
      is_paid: boolean;
      price_cents?: number;
      payment_required?: boolean;
      allow_free_enrollment?: boolean;
      revenue_share_percentage?: number;
    };
    circles?: Array<CircleExport>;
    custom_fields?: Record<string, any>;
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateContainerExport(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json.metadata) {
    errors.push('Missing metadata');
  } else {
    if (!json.metadata.version) errors.push('Missing metadata.version');
    if (!json.metadata.exportType) errors.push('Missing metadata.exportType');
    if (json.metadata.exportType !== 'container') {
      errors.push('Invalid exportType: expected "container"');
    }
  }

  // Validate container type-specific data
  const containerType = json.metadata?.containerType;
  if (!containerType) {
    errors.push('Missing metadata.containerType');
  } else {
    const containerKey = containerType.toLowerCase();
    if (!json[containerKey]) {
      errors.push(`Missing ${containerKey} data`);
    } else {
      if (!json[containerKey].name) errors.push(`Missing ${containerKey}.name`);
      if (!json[containerKey].slug) errors.push(`Missing ${containerKey}.slug`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateCircleExport(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json.metadata) {
    errors.push('Missing metadata');
  } else {
    if (!json.metadata.version) errors.push('Missing metadata.version');
    if (!json.metadata.exportType) errors.push('Missing metadata.exportType');
    if (json.metadata.exportType !== 'circle') {
      errors.push('Invalid exportType: expected "circle"');
    }
  }

  if (!json.circle) {
    errors.push('Missing circle data');
  } else {
    if (!json.circle.name) errors.push('Missing circle.name');
    if (!json.circle.slug) errors.push('Missing circle.slug');
    if (!json.circle.circle_type) errors.push('Missing circle.circle_type');
  }

  return { valid: errors.length === 0, errors };
}

export function validateProgramExport(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Metadata is optional — static templates from the library won't have it,
  // but server-exported programs will. Validate only if present.
  if (json.metadata) {
    if (!json.metadata.version) errors.push('Missing metadata.version');
    if (json.metadata.exportType && json.metadata.exportType !== 'program') {
      errors.push('Invalid exportType: expected "program"');
    }
  }

  if (!json.program) {
    errors.push('Missing program data');
  } else {
    if (!json.program.name) errors.push('Missing program.name');
  }

  return { valid: errors.length === 0, errors };
}

export function validateCourseExport(json: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Metadata is optional — static templates from the library won't have it,
  // but server-exported courses will. Validate only if present.
  if (json.metadata) {
    if (!json.metadata.version) errors.push('Missing metadata.version');
    if (json.metadata.exportType && json.metadata.exportType !== 'course') {
      errors.push('Invalid exportType: expected "course"');
    }
  }

  if (!json.course) {
    errors.push('Missing course data');
  } else {
    if (!json.course.title) errors.push('Missing course.title');
  }

  if (!json.journeys) {
    // Journeys optional for courses (can import structure-only)
  } else if (!Array.isArray(json.journeys)) {
    errors.push('journeys must be an array');
  } else {
    json.journeys.forEach((j: any, i: number) => {
      if (!j.title) errors.push(`Journey ${i}: missing title`);
      if (j.items && !Array.isArray(j.items)) {
        errors.push(`Journey ${i}: items must be an array`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate slug from name (used during import if slug conflicts)
 */
export function generateSlug(name: string, suffix?: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  if (suffix) {
    slug += `-${suffix}`;
  }
  
  return slug;
}

/**
 * Create a unique slug by appending timestamp
 */
export function createUniqueSlug(name: string): string {
  const timestamp = Date.now().toString().slice(-6);
  return generateSlug(name, timestamp);
}

/**
 * Download JSON as file
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read JSON from file upload
 */
export function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}