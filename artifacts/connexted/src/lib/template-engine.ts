/**
 * Template Engine
 * 
 * Comprehensive import/export system for programs, circles, journeys, and containers.
 * Handles full automation of program creation from JSON templates.
 */
// Split candidate: ~1623 lines — consider extracting ProgramImporter, CircleImporter, JourneyImporter, and ContainerImporter into separate service modules.

import { supabase } from '@/lib/supabase';
import { 
  ProgramTemplate, 
  CircleTemplate, 
  JourneyTemplate, 
  ContainerTemplate,
  ImportResult,
  ExportOptions,
  CircleOnlyTemplate,
  ContainerOnlyTemplate,
  PostContent,
  DocumentContent,
  ReviewContent,
  EventContent,
  ForumThreadContent,
  StandupResponseContent,
  PitchSubmissionContent,
  MemberData,
  ImportOptions,
} from '@/types/templates';
import { logError } from '@/lib/error-handler';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate a unique slug from a name
 */
function generateSlug(name: string, suffix?: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return suffix ? `${baseSlug}-${suffix}` : baseSlug;
}

/**
 * Check if slug exists in a table and generate unique one if needed
 */
async function ensureUniqueSlug(
  tableName: string, 
  baseSlug: string, 
  filterColumn?: string,
  filterValue?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    let query = supabase
      .from(tableName)
      .select('id')
      .eq('slug', slug);
    
    // Add additional filter if provided (e.g., community_id)
    if (filterColumn && filterValue) {
      query = query.eq(filterColumn, filterValue);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logError(`Error checking slug uniqueness:`, error, { component: 'template-engine' });
      return `${slug}-${Date.now()}`; // Fallback to timestamp
    }
    
    if (!data || data.length === 0) {
      return slug; // Slug is unique!
    }
    
    // Slug exists, try next one
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

/**
 * Convert user ID to email
 */
async function getUserEmail(userId: string): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
  
  return data?.email || 'unknown@example.com';
}

/**
 * Fetch posts for a container
 */
async function fetchContainerPosts(containerType: string, containerId: string): Promise<PostContent[]> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .contains(column, [containerId]);
  
  if (!posts) return [];
  
  const postsWithEmails: PostContent[] = [];
  for (const post of posts) {
    postsWithEmails.push({
      content: post.content,
      author_email: await getUserEmail(post.author_id),
      created_at: post.created_at,
      likes_count: post.likes?.length || 0,
      image_url: post.image_url,
      link_url: post.link_url,
      link_title: post.link_title,
      link_description: post.link_description,
      link_image: post.link_image,
    });
  }
  
  return postsWithEmails;
}

/**
 * Fetch documents for a container
 */
async function fetchContainerDocuments(containerType: string, containerId: string): Promise<DocumentContent[]> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .contains(column, [containerId]);
  
  if (!documents) return [];
  
  const docsWithEmails: DocumentContent[] = [];
  for (const doc of documents) {
    docsWithEmails.push({
      title: doc.title,
      description: doc.description,
      url: doc.url,
      author_email: await getUserEmail(doc.author_id),
      created_at: doc.created_at,
      category: doc.category,
      tags: doc.tags,
      favorites_count: doc.favorites?.length || 0,
      views: doc.views || 0,
    });
  }
  
  return docsWithEmails;
}

/**
 * Fetch reviews for a container
 */
async function fetchContainerReviews(containerType: string, containerId: string): Promise<ReviewContent[]> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  
  const { data: reviews } = await supabase
    .from('endorsements')
    .select('*')
    .contains(column, [containerId]);
  
  if (!reviews) return [];
  
  const reviewsWithEmails: ReviewContent[] = [];
  for (const review of reviews) {
    reviewsWithEmails.push({
      title: review.title,
      description: review.description,
      link_url: review.link_url,
      author_email: await getUserEmail(review.author_id),
      created_at: review.created_at,
      rating: review.rating,
      tags: review.tags,
    });
  }
  
  return reviewsWithEmails;
}

/**
 * Fetch events for a meetup/meeting
 */
async function fetchContainerEvents(containerType: string, containerId: string): Promise<EventContent[]> {
  const column = `${containerType.slice(0, -1)}_ids`; // meetups -> meetup_ids
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .contains(column, [containerId]);
  
  if (!events) return [];
  
  const eventsWithEmails: EventContent[] = [];
  for (const event of events) {
    // Get attendee emails
    const attendee_emails: string[] = [];
    if (event.attendees && Array.isArray(event.attendees)) {
      for (const userId of event.attendees) {
        attendee_emails.push(await getUserEmail(userId));
      }
    }
    
    eventsWithEmails.push({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      location_type: event.location_type,
      meeting_url: event.meeting_url,
      max_attendees: event.max_attendees,
      attendee_emails,
      created_at: event.created_at,
    });
  }
  
  return eventsWithEmails;
}

/**
 * Fetch forum threads for a meetup/meeting
 */
async function fetchContainerForumThreads(containerType: string, containerId: string): Promise<ForumThreadContent[]> {
  const column = `${containerType.slice(0, -1)}_ids`; // meetups -> meetup_ids
  
  const { data: threads } = await supabase
    .from('forum_threads')
    .select('*')
    .contains(column, [containerId]);
  
  if (!threads) return [];
  
  const threadsWithEmails: ForumThreadContent[] = [];
  for (const thread of threads) {
    // Fetch replies
    const { data: replies } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });
    
    const repliesWithEmails = [];
    if (replies) {
      for (const reply of replies) {
        repliesWithEmails.push({
          body: reply.body,
          author_email: await getUserEmail(reply.author_id),
          created_at: reply.created_at,
          likes_count: reply.likes?.length || 0,
        });
      }
    }
    
    threadsWithEmails.push({
      title: thread.title,
      body: thread.body,
      author_email: await getUserEmail(thread.author_id),
      created_at: thread.created_at,
      tags: thread.tags,
      likes_count: thread.likes?.length || 0,
      is_pinned: thread.is_pinned,
      replies: repliesWithEmails,
    });
  }
  
  return threadsWithEmails;
}

/**
 * Fetch standup responses
 */
async function fetchStandupResponses(standupId: string): Promise<StandupResponseContent[]> {
  const { data: responses } = await supabase
    .from('standup_responses')
    .select('*')
    .eq('standup_id', standupId)
    .order('response_date', { ascending: false });
  
  if (!responses) return [];
  
  const responsesWithEmails: StandupResponseContent[] = [];
  for (const response of responses) {
    responsesWithEmails.push({
      user_email: await getUserEmail(response.user_id),
      response_date: response.response_date,
      yesterday: response.yesterday,
      today: response.today,
      blockers: response.blockers,
      created_at: response.created_at,
    });
  }
  
  return responsesWithEmails;
}

/**
 * Fetch pitch submissions for elevator/pitches
 */
async function fetchPitchSubmissions(containerType: string, containerId: string): Promise<PitchSubmissionContent[]> {
  const { data: pitches } = await supabase
    .from('elevator_pitches')
    .select('*')
    .eq(`${containerType.slice(0, -1)}_id`, containerId); // elevator_id or pitch_id
  
  if (!pitches) return [];
  
  const pitchesWithEmails: PitchSubmissionContent[] = [];
  for (const pitch of pitches) {
    pitchesWithEmails.push({
      title: pitch.title,
      pitch_text: pitch.pitch_text,
      author_email: await getUserEmail(pitch.author_id),
      submitted_at: pitch.submitted_at,
      status: pitch.status,
      video_url: pitch.video_url,
      deck_url: pitch.deck_url,
    });
  }
  
  return pitchesWithEmails;
}

/**
 * Fetch program members
 */
async function fetchProgramMembers(programId: string): Promise<MemberData[]> {
  const { data: members } = await supabase
    .from('program_members')
    .select('*, users(email)')
    .eq('program_id', programId);
  
  if (!members) return [];
  
  return members.map(member => ({
    email: (member.users as any)?.email || 'unknown@example.com',
    role: member.role,
    status: member.status,
    joined_at: member.joined_at,
  }));
}

/**
 * Export a complete program as a JSON template
 */
export async function exportProgram(
  programId: string, 
  options: ExportOptions = {}
): Promise<ProgramTemplate | null> {
  const {
    level = 'structure',
    includeContainers = true,
    includeCircle = true,
    includeMetadata = true,
    includeMembers = false,
  } = options;

  try {
    // Fetch program
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      logError('Error fetching program:', programError, { component: 'template-engine' });
      return null;
    }

    // Fetch circle
    let circleTemplate: CircleTemplate | null = null;
    if (includeCircle && program.circle_id) {
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .select('*')
        .eq('id', program.circle_id)
        .single();

      if (!circleError && circle) {
        circleTemplate = {
          name: circle.name,
          description: circle.description,
          slug: circle.slug,
          visibility: circle.visibility,
          join_type: circle.join_type,
          cover_image: circle.cover_image,
          tags: circle.tags,
          rules: circle.rules,
          mission: circle.mission,
        };
      }
    }

    // If no circle found, create a default one
    if (!circleTemplate) {
      circleTemplate = {
        name: `${program.name} Community`,
        description: `Community for ${program.name}`,
        visibility: 'public',
        join_type: 'open',
      };
    }

    // Fetch journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('program_journeys')
      .select('*')
      .eq('program_id', programId)
      .order('order_index', { ascending: true });

    if (journeysError) {
      logError('Error fetching journeys:', journeysError, { component: 'template-engine' });
      return null;
    }

    // Fetch containers for each journey
    const journeyTemplates: JourneyTemplate[] = [];
    
    for (const journey of journeys || []) {
      const containers: ContainerTemplate[] = [];

      if (includeContainers) {
        // Query all container types
        const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'standups', 'meetups'];
        
        for (const type of containerTypes) {
          try {
            const { data: containerData, error } = await supabase
              .from(type)
              .select('*')
              .eq('program_journey_id', journey.id);

            if (!error && containerData) {
              for (const container of containerData) {
                const formatted = await formatContainerForExport(container, type, level);
                containers.push(formatted);
              }
            }
          } catch (err) {
            console.debug(`Skipping ${type}:`, err);
          }
        }
      }

      journeyTemplates.push({
        title: journey.title,
        description: journey.description,
        order_index: journey.order_index,
        status: journey.status,
        start_date: journey.start_date,
        finish_date: journey.finish_date,
        containers,
      });
    }

    // Build template
    const template: ProgramTemplate = {
      program: {
        name: program.name,
        description: program.description,
        slug: program.slug,
        template_id: program.template_id,
        status: program.status,
      },
      circle: circleTemplate,
      journeys: journeyTemplates,
    };

    // Add metadata if requested
    if (includeMetadata) {
      template.version = '1.0';
      template.created_at = new Date().toISOString();
      template.exported_by = program.created_by;
      template.export_level = level;
    }

    // Add members if requested (only for full exports)
    if (level === 'full' && includeMembers) {
      template.members = await fetchProgramMembers(programId);
    }

    return template;
  } catch (error) {
    logError('Error exporting program:', error, { component: 'template-engine' });
    return null;
  }
}

/**
 * Format container data for export
 */
async function formatContainerForExport(container: any, type: string, level: string): Promise<ContainerTemplate> {
  const base: any = {
    type,
    name: container.name,
    description: container.description,
    slug: container.slug,
    visibility: container.visibility,
    cover_image: container.cover_image,
    tags: container.tags,
  };

  // Add full content if level is 'full'
  if (level === 'full') {
    // Fetch common content for most containers
    if (['tables', 'elevators', 'meetings', 'builds', 'meetups'].includes(type)) {
      base.posts = await fetchContainerPosts(type, container.id);
      base.documents = await fetchContainerDocuments(type, container.id);
      base.reviews = await fetchContainerReviews(type, container.id);
    }
  }

  // Add type-specific fields and content
  switch (type) {
    case 'pitches':
      const pitchData: any = {
        ...base,
        long_description: container.long_description,
        image: container.image,
        access_level: container.access_level,
      };
      if (level === 'full') {
        pitchData.pitches = await fetchPitchSubmissions(type, container.id);
      }
      return pitchData as ContainerTemplate;
    
    case 'elevators':
      const elevatorData: any = { ...base };
      if (level === 'full') {
        elevatorData.pitches = await fetchPitchSubmissions(type, container.id);
      }
      return elevatorData as ContainerTemplate;
    
    case 'builds':
      return {
        ...base,
        document_ids: container.document_ids,
      } as ContainerTemplate;
    
    case 'standups':
      const standupData: any = {
        ...base,
        post_ids: container.post_ids,
      };
      if (level === 'full') {
        standupData.responses = await fetchStandupResponses(container.id);
      }
      return standupData as ContainerTemplate;
    
    case 'meetups':
      const meetupData: any = {
        ...base,
        event_ids: container.event_ids,
        forum_thread_ids: container.forum_thread_ids,
      };
      if (level === 'full') {
        meetupData.events = await fetchContainerEvents(type, container.id);
        meetupData.forum_threads = await fetchContainerForumThreads(type, container.id);
      }
      return meetupData as ContainerTemplate;
    
    case 'meetings':
      const meetingData: any = {
        ...base,
        event_id: container.event_id,
      };
      if (level === 'full') {
        meetingData.events = await fetchContainerEvents(type, container.id);
        meetingData.forum_threads = await fetchContainerForumThreads(type, container.id);
      }
      return meetingData as ContainerTemplate;
    
    default:
      return base as ContainerTemplate;
  }
}

/**
 * Export just a circle
 */
export async function exportCircle(circleId: string): Promise<CircleOnlyTemplate | null> {
  try {
    const { data: circle, error } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circleId)
      .single();

    if (error || !circle) {
      logError('Error fetching circle:', error, { component: 'template-engine' });
      return null;
    }

    return {
      type: 'circle',
      circle: {
        name: circle.name,
        description: circle.description,
        slug: circle.slug,
        visibility: circle.visibility,
        join_type: circle.join_type,
        cover_image: circle.cover_image,
        tags: circle.tags,
        rules: circle.rules,
        mission: circle.mission,
      },
    };
  } catch (error) {
    logError('Error exporting circle:', error, { component: 'template-engine' });
    return null;
  }
}

/**
 * Export just a container
 */
export async function exportContainer(
  containerType: string, 
  containerId: string
): Promise<ContainerOnlyTemplate | null> {
  try {
    const { data: container, error } = await supabase
      .from(containerType)
      .select('*')
      .eq('id', containerId)
      .single();

    if (error || !container) {
      logError('Error fetching container:', error, { component: 'template-engine' });
      return null;
    }

    return {
      type: 'container',
      container: formatContainerForExport(container, containerType, 'full'),
    };
  } catch (error) {
    logError('Error exporting container:', error, { component: 'template-engine' });
    return null;
  }
}

// ==========================================
// IMPORT FUNCTIONS
// ==========================================

/**
 * Map email to user ID (reverse of getUserEmail)
 * Returns null if user not found - we'll assign to importer in that case
 */
async function getUserIdFromEmail(email: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  return data?.id || null;
}

/**
 * Import posts for a container
 */
async function importContainerPosts(
  posts: PostContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number }> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  let success = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      // Map email to user ID, fallback to importer
      const authorId = await getUserIdFromEmail(post.author_email) || importerUserId;

      const { error } = await supabase
        .from('posts')
        .insert({
          [column]: [containerId],
          circle_ids: [], // Empty for now - posts are container-specific
          author_id: authorId,
          content: post.content,
          created_at: post.created_at, // Preserve timestamp
          pinned: false,
          access_level: 'public',
          image_url: post.image_url,
          link_url: post.link_url,
          link_title: post.link_title,
          link_description: post.link_description,
          link_image: post.link_image,
        });

      if (error) {
        logError('Error importing post:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      logError('Error importing post:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Import documents for a container
 */
async function importContainerDocuments(
  documents: DocumentContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number }> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  let success = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      // Map email to user ID, fallback to importer
      const authorId = await getUserIdFromEmail(doc.author_email) || importerUserId;

      const { error } = await supabase
        .from('documents')
        .insert({
          [column]: [containerId],
          author_id: authorId,
          title: doc.title,
          description: doc.description || '',
          url: doc.url,
          created_at: doc.created_at, // Preserve timestamp
          category: doc.category || 'general',
          tags: doc.tags || [],
          favorites: [], // Reset favorites
          views: 0, // Reset views
          document_type: 'external',
          intended_audience: 'all',
        });

      if (error) {
        logError('Error importing document:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      logError('Error importing document:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Import reviews for a container
 */
async function importContainerReviews(
  reviews: ReviewContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number }> {
  const column = `${containerType.slice(0, -1)}_ids`; // tables -> table_ids
  let success = 0;
  let failed = 0;

  for (const review of reviews) {
    try {
      // Map email to user ID, fallback to importer
      const authorId = await getUserIdFromEmail(review.author_email) || importerUserId;

      const { error } = await supabase
        .from('endorsements')
        .insert({
          [column]: [containerId],
          author_id: authorId,
          title: review.title,
          description: review.description || '',
          link_url: review.link_url,
          created_at: review.created_at, // Preserve timestamp
          rating: review.rating,
          tags: review.tags || [],
        });

      if (error) {
        logError('Error importing review:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      logError('Error importing review:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Import events for a container
 */
async function importContainerEvents(
  events: EventContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number; eventIds: string[] }> {
  const column = `${containerType.slice(0, -1)}_ids`; // meetups -> meetup_ids
  let success = 0;
  let failed = 0;
  const eventIds: string[] = [];

  for (const event of events) {
    try {
      // Map attendee emails to user IDs
      const attendees: string[] = [];
      if (event.attendee_emails && Array.isArray(event.attendee_emails)) {
        for (const email of event.attendee_emails) {
          const userId = await getUserIdFromEmail(email);
          if (userId) attendees.push(userId);
        }
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          [column]: [containerId],
          title: event.title,
          description: event.description || '',
          event_type: event.event_type || 'general',
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          location_type: event.location_type || 'virtual',
          meeting_url: event.meeting_url,
          max_attendees: event.max_attendees,
          attendees,
          created_at: event.created_at, // Preserve timestamp
          created_by: importerUserId,
        })
        .select()
        .single();

      if (error) {
        logError('Error importing event:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
        if (data) eventIds.push(data.id);
      }
    } catch (err) {
      logError('Error importing event:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed, eventIds };
}

/**
 * Import forum threads for a container
 */
async function importContainerForumThreads(
  threads: ForumThreadContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number; threadIds: string[] }> {
  const column = `${containerType.slice(0, -1)}_ids`; // meetups -> meetup_ids
  let success = 0;
  let failed = 0;
  const threadIds: string[] = [];

  for (const thread of threads) {
    try {
      // Map email to user ID, fallback to importer
      const authorId = await getUserIdFromEmail(thread.author_email) || importerUserId;

      const { data: threadData, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          [column]: [containerId],
          author_id: authorId,
          title: thread.title,
          body: thread.body,
          created_at: thread.created_at, // Preserve timestamp
          tags: thread.tags || [],
          is_pinned: thread.is_pinned || false,
        })
        .select()
        .single();

      if (threadError) {
        logError('Error importing forum thread:', threadError, { component: 'template-engine' });
        failed++;
        continue;
      }

      if (threadData) threadIds.push(threadData.id);

      // Import replies
      if (thread.replies && Array.isArray(thread.replies)) {
        for (const reply of thread.replies) {
          const replyAuthorId = await getUserIdFromEmail(reply.author_email) || importerUserId;

          await supabase
            .from('forum_posts')
            .insert({
              thread_id: threadData.id,
              author_id: replyAuthorId,
              body: reply.body,
              created_at: reply.created_at, // Preserve timestamp
            });
        }
      }

      success++;
    } catch (err) {
      logError('Error importing forum thread:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed, threadIds };
}

/**
 * Import standup responses
 */
async function importStandupResponses(
  responses: StandupResponseContent[],
  standupId: string,
  importerUserId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const response of responses) {
    try {
      // Map email to user ID, fallback to importer
      const userId = await getUserIdFromEmail(response.user_email) || importerUserId;

      const { error } = await supabase
        .from('standup_responses')
        .insert({
          standup_id: standupId,
          user_id: userId,
          response_date: response.response_date,
          yesterday: response.yesterday,
          today: response.today,
          blockers: response.blockers,
          created_at: response.created_at, // Preserve timestamp
        });

      if (error) {
        logError('Error importing standup response:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      logError('Error importing standup response:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Import pitch submissions
 */
async function importPitchSubmissions(
  pitches: PitchSubmissionContent[],
  containerType: string,
  containerId: string,
  importerUserId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const pitch of pitches) {
    try {
      // Map email to user ID, fallback to importer
      const authorId = await getUserIdFromEmail(pitch.author_email) || importerUserId;

      const { error } = await supabase
        .from('elevator_pitches')
        .insert({
          [`${containerType.slice(0, -1)}_id`]: containerId, // elevator_id or pitch_id
          author_id: authorId,
          title: pitch.title,
          pitch_text: pitch.pitch_text,
          submitted_at: pitch.submitted_at,
          status: pitch.status || 'submitted',
          video_url: pitch.video_url,
          deck_url: pitch.deck_url,
        });

      if (error) {
        logError('Error importing pitch:', error, { component: 'template-engine' });
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      logError('Error importing pitch:', err, { component: 'template-engine' });
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Import all content for a container
 */
async function importContainerContent(
  template: ContainerTemplate,
  containerId: string,
  containerType: string,
  importerUserId: string
): Promise<{ totalImported: number; totalFailed: number; details: string[] }> {
  let totalImported = 0;
  let totalFailed = 0;
  const details: string[] = [];

  // Import posts (common to most containers)
  if (template.posts && template.posts.length > 0) {
    const result = await importContainerPosts(template.posts, containerType, containerId, importerUserId);
    totalImported += result.success;
    totalFailed += result.failed;
    if (result.success > 0) details.push(`${result.success} posts`);
  }

  // Import documents (common to most containers)
  if (template.documents && template.documents.length > 0) {
    const result = await importContainerDocuments(template.documents, containerType, containerId, importerUserId);
    totalImported += result.success;
    totalFailed += result.failed;
    if (result.success > 0) details.push(`${result.success} documents`);
  }

  // Import reviews (common to most containers)
  if (template.reviews && template.reviews.length > 0) {
    const result = await importContainerReviews(template.reviews, containerType, containerId, importerUserId);
    totalImported += result.success;
    totalFailed += result.failed;
    if (result.success > 0) details.push(`${result.success} reviews`);
  }

  // Type-specific imports
  switch (containerType) {
    case 'elevators':
    case 'pitches':
      if ((template as any).pitches && (template as any).pitches.length > 0) {
        const result = await importPitchSubmissions((template as any).pitches, containerType, containerId, importerUserId);
        totalImported += result.success;
        totalFailed += result.failed;
        if (result.success > 0) details.push(`${result.success} pitches`);
      }
      break;

    case 'standups':
      if ((template as any).responses && (template as any).responses.length > 0) {
        const result = await importStandupResponses((template as any).responses, containerId, importerUserId);
        totalImported += result.success;
        totalFailed += result.failed;
        if (result.success > 0) details.push(`${result.success} standup responses`);
      }
      break;

    case 'meetups':
    case 'meetings':
      // Import events
      if ((template as any).events && (template as any).events.length > 0) {
        const result = await importContainerEvents((template as any).events, containerType, containerId, importerUserId);
        totalImported += result.success;
        totalFailed += result.failed;
        if (result.success > 0) details.push(`${result.success} events`);
        
        // Update container with event IDs
        if (result.eventIds.length > 0) {
          if (containerType === 'meetups') {
            await supabase
              .from('meetups')
              .update({ event_ids: result.eventIds })
              .eq('id', containerId);
          } else if (containerType === 'meetings' && result.eventIds.length > 0) {
            await supabase
              .from('meetings')
              .update({ event_id: result.eventIds[0] })
              .eq('id', containerId);
          }
        }
      }

      // Import forum threads
      if ((template as any).forum_threads && (template as any).forum_threads.length > 0) {
        const result = await importContainerForumThreads((template as any).forum_threads, containerType, containerId, importerUserId);
        totalImported += result.success;
        totalFailed += result.failed;
        if (result.success > 0) details.push(`${result.success} forum threads`);
        
        // Update container with thread IDs
        if (result.threadIds.length > 0 && containerType === 'meetups') {
          await supabase
            .from('meetups')
            .update({ forum_thread_ids: result.threadIds })
            .eq('id', containerId);
        }
      }
      break;
  }

  return { totalImported, totalFailed, details };
}

/**
 * Import a complete program template (CLIENT-SIDE — LEGACY)
 * 
 * @deprecated Use the server-side `/json-import` route via ExportImportManager instead.
 * The server-side route uses the service role key (bypasses RLS) and handles all 17
 * JourneyContentItem types. This client-side version only handles containers.
 * See: /supabase/functions/server/template-engine.ts → importProgram()
 * See: /src/app/components/ExportImportManager.tsx for the new UI.
 */
export async function importProgram(
  template: ProgramTemplate,
  userId: string
): Promise<ImportResult> {
  const errors: string[] = [];

  try {
    // Step 1: Create Circle
    const circleSlug = template.circle.slug 
      ? await ensureUniqueSlug('circles', template.circle.slug)
      : await ensureUniqueSlug('circles', generateSlug(template.circle.name));

    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .insert({
        name: template.circle.name,
        description: template.circle.description,
        slug: circleSlug,
        visibility: template.circle.visibility || 'public',
        join_type: template.circle.join_type || 'open',
        cover_image: template.circle.cover_image,
        tags: template.circle.tags || [],
        rules: template.circle.rules,
        mission: template.circle.mission,
        created_by: userId,
        admin_ids: [userId],
        member_ids: [userId],
      })
      .select()
      .single();

    if (circleError || !circle) {
      errors.push(`Failed to create circle: ${circleError?.message}`);
      return {
        success: false,
        message: 'Failed to create circle',
        errors,
      };
    }

    // Step 2: Create Program
    const programSlug = template.program.slug 
      ? await ensureUniqueSlug('programs', template.program.slug)
      : await ensureUniqueSlug('programs', generateSlug(template.program.name));

    const { data: program, error: programError } = await supabase
      .from('programs')
      .insert({
        name: template.program.name,
        description: template.program.description,
        slug: programSlug,
        template_id: template.program.template_id,
        status: template.program.status || 'not-started',
        circle_id: circle.id, // Link to circle
        created_by: userId,
        admin_ids: [userId],
      })
      .select()
      .single();

    if (programError || !program) {
      errors.push(`Failed to create program: ${programError?.message}`);
      // Clean up circle
      await supabase.from('circles').delete().eq('id', circle.id);
      return {
        success: false,
        message: 'Failed to create program',
        errors,
      };
    }

    // Step 3: Create Journeys and Containers
    const importedJourneys = [];
    const importDetails: string[] = []; // Track import details

    for (let i = 0; i < template.journeys.length; i++) {
      const journeyTemplate = template.journeys[i];
      
      const { data: journey, error: journeyError } = await supabase
        .from('program_journeys')
        .insert({
          program_id: program.id,
          title: journeyTemplate.title,
          description: journeyTemplate.description,
          order_index: journeyTemplate.order_index !== undefined ? journeyTemplate.order_index : i,
          status: journeyTemplate.status || 'not-started',
          start_date: journeyTemplate.start_date,
          finish_date: journeyTemplate.finish_date,
          containers_template: journeyTemplate.containers, // Store template for reference
        })
        .select()
        .single();

      if (journeyError || !journey) {
        errors.push(`Failed to create journey "${journeyTemplate.title}": ${journeyError?.message}`);
        continue;
      }

      // Create containers for this journey
      const importedContainers = [];
      
      for (const containerTemplate of journeyTemplate.containers) {
        try {
          const containerResult = await createContainer(
            containerTemplate,
            circle.id,
            userId,
            program.id,
            journey.id
          );

          if (containerResult) {
            // Import content for the container if this is a full export
            if (template.export_level === 'full') {
              const contentResult = await importContainerContent(
                containerTemplate,
                containerResult.id,
                containerTemplate.type,
                userId
              );

              if (contentResult.totalImported > 0) {
                importDetails.push(`Container "${containerTemplate.name}": ${contentResult.details.join(', ')}`);
              }
              
              if (contentResult.totalFailed > 0) {
                errors.push(`Failed to import ${contentResult.totalFailed} items for "${containerTemplate.name}"`);
              }
            }

            importedContainers.push(containerResult);
          } else {
            errors.push(`Failed to create container "${containerTemplate.name}" in journey "${journeyTemplate.title}"`);
          }
        } catch (err: any) {
          errors.push(`Error creating container "${containerTemplate.name}": ${err.message}`);
        }
      }

      importedJourneys.push({
        id: journey.id,
        title: journey.title,
        containers: importedContainers,
      });
    }

    // Build success message with import details
    let successMessage = `Successfully imported program "${program.name}"`;
    if (importDetails.length > 0) {
      successMessage += ` with content: ${importDetails.join('; ')}`;
    }

    return {
      success: true,
      message: successMessage,
      data: {
        program: {
          id: program.id,
          name: program.name,
          slug: program.slug,
        },
        circle: {
          id: circle.id,
          name: circle.name,
          slug: circle.slug,
        },
        journeys: importedJourneys,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    logError('Error importing program:', error, { component: 'template-engine' });
    return {
      success: false,
      message: 'Failed to import program',
      errors: [error.message],
    };
  }
}

/**
 * Create a container from template
 */
async function createContainer(
  template: ContainerTemplate,
  circleId: string,
  userId: string,
  programId?: string,
  journeyId?: string
): Promise<{ id: string; type: string; name: string; slug: string } | null> {
  try {
    // Generate unique slug
    const baseSlug = template.slug || generateSlug(template.name);
    const slug = await ensureUniqueSlug(template.type, baseSlug, 'community_id', circleId);

    // Base fields common to all containers
    const baseData: any = {
      community_id: circleId,
      name: template.name,
      description: template.description,
      slug,
      tags: template.tags || [],
      created_by: userId,
      admin_ids: [userId],
      member_ids: [userId],
      program_id: programId,
      program_journey_id: journeyId,
    };

    // Add visibility if supported
    if (template.visibility && template.type !== 'pitches') {
      baseData.visibility = template.visibility;
    }

    // Add cover_image if supported
    if (template.cover_image && ['tables', 'elevators', 'meetings', 'builds', 'meetups'].includes(template.type)) {
      baseData.cover_image = template.cover_image;
    }

    // Add guest_ids for containers that support it
    if (['tables', 'elevators', 'meetings', 'builds', 'meetups'].includes(template.type)) {
      baseData.guest_ids = [];
    }

    // Add type-specific fields
    let containerData = { ...baseData };

    switch (template.type) {
      case 'pitches':
        containerData = {
          ...baseData,
          long_description: (template as any).long_description,
          image: (template as any).image,
          access_level: (template as any).access_level || 'public',
        };
        delete containerData.visibility; // Pitches don't use visibility
        delete containerData.guest_ids;
        break;

      case 'builds':
        containerData = {
          ...baseData,
          document_ids: (template as any).document_ids || [],
        };
        break;

      case 'standups':
        containerData = {
          ...baseData,
          post_ids: (template as any).post_ids || [],
        };
        delete containerData.cover_image; // Standups don't have cover images
        delete containerData.guest_ids;
        break;

      case 'meetups':
        containerData = {
          ...baseData,
          event_ids: (template as any).event_ids || [],
          forum_thread_ids: (template as any).forum_thread_ids || [],
        };
        break;

      case 'meetings':
        containerData = {
          ...baseData,
          event_id: (template as any).event_id,
        };
        break;

      case 'books':
        // books uses `title` instead of `name` and has no `slug` or `community_id`
        containerData = {
          title: template.name,
          description: template.description,
          tags: template.tags || [],
          created_by: userId,
          admin_ids: [userId],
          member_ids: [userId],
          visibility: template.visibility || 'public',
          category: (template as any).content?.category || '',
        };
        break;
    }

    // Insert container
    const { data, error } = await supabase
      .from(template.type)
      .insert(containerData)
      .select()
      .single();

    if (error) {
      logError(`Error creating ${template.type}:`, error, { component: 'template-engine' });
      return null;
    }

    // Post-insert: create child rows for types that need them
    if (template.type === 'books' && data) {
      const chapters = (template as any).content?.chapters;
      if (chapters && Array.isArray(chapters) && chapters.length > 0) {
        const chapterRows = chapters.map((ch: any, idx: number) => ({
          book_id: data.id,
          title: ch.title,
          content: ch.content || '',
          order_index: ch.order_index ?? idx,
        }));
        const { error: chapError } = await supabase.from('chapters').insert(chapterRows);
        if (chapError) {
          logError('Error creating chapters for book:', chapError, { component: 'template-engine' });
        }
      }
    }

    return {
      id: data.id,
      type: template.type,
      name: data.name || data.title,
      slug: data.slug || '',
    };
  } catch (error) {
    logError('Error creating container:', error, { component: 'template-engine' });
    return null;
  }
}

/**
 * Import just a circle
 */
export async function importCircle(
  template: CircleTemplate,
  userId: string
): Promise<ImportResult> {
  try {
    const slug = template.slug 
      ? await ensureUniqueSlug('circles', template.slug)
      : await ensureUniqueSlug('circles', generateSlug(template.name));

    const { data: circle, error } = await supabase
      .from('circles')
      .insert({
        name: template.name,
        description: template.description,
        slug,
        visibility: template.visibility || 'public',
        join_type: template.join_type || 'open',
        cover_image: template.cover_image,
        tags: template.tags || [],
        rules: template.rules,
        mission: template.mission,
        created_by: userId,
        admin_ids: [userId],
        member_ids: [userId],
      })
      .select()
      .single();

    if (error || !circle) {
      return {
        success: false,
        message: 'Failed to create circle',
        errors: [error?.message || 'Unknown error'],
      };
    }

    return {
      success: true,
      message: `Successfully imported circle "${circle.name}"`,
      data: {
        circle: {
          id: circle.id,
          name: circle.name,
          slug: circle.slug,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to import circle',
      errors: [error.message],
    };
  }
}

/**
 * Import just a container
 */
export async function importContainerToCircle(
  template: ContainerTemplate,
  circleId: string,
  userId: string
): Promise<ImportResult> {
  try {
    const result = await createContainer(template, circleId, userId);

    if (!result) {
      return {
        success: false,
        message: `Failed to create ${template.type}`,
        errors: ['Container creation failed'],
      };
    }

    return {
      success: true,
      message: `Successfully imported ${template.type} "${result.name}"`,
      data: {
        program: {
          id: result.id,
          name: result.name,
          slug: result.slug,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to import container',
      errors: [error.message],
    };
  }
}

// ==========================================
// DOWNLOAD HELPERS
// ==========================================

/**
 * Download a template as a JSON file
 */
export function downloadTemplate(template: any, filename: string) {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
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
 * Upload and parse a template file
 */
export function uploadTemplate(): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const template = JSON.parse(event.target.result);
          resolve(template);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}