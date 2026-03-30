/**
 * Program Summary and Reporting
 * 
 * Generate detailed reports for programs to support before/after comparison
 * during backup/restore operations.
 */
// Split candidate: ~543 lines — consider extracting MembershipReport, JourneyReport, and EngagementReport into separate report-builder modules.

import { supabase } from '@/lib/supabase';

export interface ContainerSummary {
  type: string;
  name: string;
  slug: string;
  counts: {
    posts?: number;
    documents?: number;
    reviews?: number;
    events?: number;
    forum_threads?: number;
    pitches?: number;
    standup_responses?: number;
  };
}

export interface JourneySummary {
  title: string;
  description?: string;
  status: string;
  containers: ContainerSummary[];
  totalContainers: number;
  totalContent: number;
}

export interface ProgramSummary {
  program: {
    id: string;
    name: string;
    slug: string;
    status: string;
    template_id: string;
  };
  circle: {
    id: string;
    name: string;
    slug: string;
    visibility: string;
    member_count: number;
  };
  journeys: JourneySummary[];
  totals: {
    journeys: number;
    containers: number;
    members: number;
    posts: number;
    documents: number;
    reviews: number;
    events: number;
    forum_threads: number;
    pitches: number;
    standup_responses: number;
    total_content_items: number;
  };
  containersByType: Record<string, number>;
  generated_at: string;
}

/**
 * Count content items for a container
 */
async function countContainerContent(containerType: string, containerId: string): Promise<ContainerSummary['counts']> {
  const counts: ContainerSummary['counts'] = {};
  const column = `${containerType.slice(0, -1)}_ids`;

  // Count posts
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .contains(column, [containerId]);
  if (postsCount) counts.posts = postsCount;

  // Count documents
  const { count: docsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .contains(column, [containerId]);
  if (docsCount) counts.documents = docsCount;

  // Count reviews
  const { count: reviewsCount } = await supabase
    .from('endorsements')
    .select('*', { count: 'exact', head: true })
    .contains(column, [containerId]);
  if (reviewsCount) counts.reviews = reviewsCount;

  // Type-specific counts
  switch (containerType) {
    case 'elevators':
    case 'pitches':
      const { count: pitchesCount } = await supabase
        .from('elevator_pitches')
        .select('*', { count: 'exact', head: true })
        .eq(`${containerType.slice(0, -1)}_id`, containerId);
      if (pitchesCount) counts.pitches = pitchesCount;
      break;

    case 'standups':
      const { count: responsesCount } = await supabase
        .from('standup_responses')
        .select('*', { count: 'exact', head: true })
        .eq('standup_id', containerId);
      if (responsesCount) counts.standup_responses = responsesCount;
      break;

    case 'meetups':
    case 'meetings':
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .contains(column, [containerId]);
      if (eventsCount) counts.events = eventsCount;

      const { count: threadsCount } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact', head: true })
        .contains(column, [containerId]);
      if (threadsCount) counts.forum_threads = threadsCount;
      break;
  }

  return counts;
}

/**
 * Generate a comprehensive summary report for a program
 */
export async function generateProgramSummary(programId: string): Promise<ProgramSummary | null> {
  try {
    // Fetch program
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      console.error('Error fetching program:', programError);
      return null;
    }

    // Fetch circle
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('*')
      .eq('id', program.circle_id)
      .single();

    if (circleError || !circle) {
      console.error('Error fetching circle:', circleError);
      return null;
    }

    // Fetch journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('program_journeys')
      .select('*')
      .eq('program_id', programId)
      .order('order_index', { ascending: true });

    if (journeysError) {
      console.error('Error fetching journeys:', journeysError);
      return null;
    }

    // Initialize totals
    const totals = {
      journeys: journeys?.length || 0,
      containers: 0,
      members: circle.member_ids?.length || 0,
      posts: 0,
      documents: 0,
      reviews: 0,
      events: 0,
      forum_threads: 0,
      pitches: 0,
      standup_responses: 0,
      total_content_items: 0,
    };

    const containersByType: Record<string, number> = {};
    const journeySummaries: JourneySummary[] = [];

    // Process each journey
    for (const journey of journeys || []) {
      const containerSummaries: ContainerSummary[] = [];
      let journeyContentTotal = 0;

      // Query all container types
      const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'standups', 'meetups'];
      
      for (const type of containerTypes) {
        try {
          const { data: containers, error } = await supabase
            .from(type)
            .select('*')
            .eq('program_journey_id', journey.id);

          if (!error && containers) {
            for (const container of containers) {
              // Count content for this container
              const counts = await countContainerContent(type, container.id);
              
              // Add to totals
              if (counts.posts) totals.posts += counts.posts;
              if (counts.documents) totals.documents += counts.documents;
              if (counts.reviews) totals.reviews += counts.reviews;
              if (counts.events) totals.events += counts.events;
              if (counts.forum_threads) totals.forum_threads += counts.forum_threads;
              if (counts.pitches) totals.pitches += counts.pitches;
              if (counts.standup_responses) totals.standup_responses += counts.standup_responses;

              const containerTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
              journeyContentTotal += containerTotal;

              containerSummaries.push({
                type,
                name: container.name,
                slug: container.slug,
                counts,
              });

              // Track containers by type
              containersByType[type] = (containersByType[type] || 0) + 1;
              totals.containers++;
            }
          }
        } catch (err) {
          console.debug(`Skipping ${type}:`, err);
        }
      }

      journeySummaries.push({
        title: journey.title,
        description: journey.description,
        status: journey.status,
        containers: containerSummaries,
        totalContainers: containerSummaries.length,
        totalContent: journeyContentTotal,
      });
    }

    // Calculate total content items
    totals.total_content_items = totals.posts + totals.documents + totals.reviews + 
                                   totals.events + totals.forum_threads + totals.pitches +
                                   totals.standup_responses;

    return {
      program: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        status: program.status,
        template_id: program.template_id,
      },
      circle: {
        id: circle.id,
        name: circle.name,
        slug: circle.slug,
        visibility: circle.visibility,
        member_count: circle.member_ids?.length || 0,
      },
      journeys: journeySummaries,
      totals,
      containersByType,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating program summary:', error);
    return null;
  }
}

/**
 * Download a program summary as a JSON file
 */
export function downloadProgramSummary(summary: ProgramSummary, filename?: string) {
  const defaultFilename = `${summary.program.slug}-summary-${new Date().toISOString().split('T')[0]}.json`;
  
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a human-readable text report from a summary
 */
export function generateTextReport(summary: ProgramSummary): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(70));
  lines.push(`PROGRAM SUMMARY REPORT: ${summary.program.name}`);
  lines.push('='.repeat(70));
  lines.push('');
  
  lines.push(`Program ID: ${summary.program.id}`);
  lines.push(`Program Slug: ${summary.program.slug}`);
  lines.push(`Status: ${summary.program.status}`);
  lines.push(`Template ID: ${summary.program.template_id}`);
  lines.push('');
  
  lines.push(`Circle: ${summary.circle.name} (${summary.circle.slug})`);
  lines.push(`Circle Visibility: ${summary.circle.visibility}`);
  lines.push(`Circle Members: ${summary.circle.member_count}`);
  lines.push('');
  
  lines.push('-'.repeat(70));
  lines.push('SUMMARY TOTALS');
  lines.push('-'.repeat(70));
  lines.push(`Total Journeys: ${summary.totals.journeys}`);
  lines.push(`Total Containers: ${summary.totals.containers}`);
  lines.push(`Total Members: ${summary.totals.members}`);
  lines.push(`Total Content Items: ${summary.totals.total_content_items}`);
  lines.push('');
  
  lines.push('Content Breakdown:');
  if (summary.totals.posts > 0) lines.push(`  - Posts: ${summary.totals.posts}`);
  if (summary.totals.documents > 0) lines.push(`  - Documents: ${summary.totals.documents}`);
  if (summary.totals.reviews > 0) lines.push(`  - Reviews: ${summary.totals.reviews}`);
  if (summary.totals.events > 0) lines.push(`  - Events: ${summary.totals.events}`);
  if (summary.totals.forum_threads > 0) lines.push(`  - Forum Threads: ${summary.totals.forum_threads}`);
  if (summary.totals.pitches > 0) lines.push(`  - Pitch Submissions: ${summary.totals.pitches}`);
  if (summary.totals.standup_responses > 0) lines.push(`  - Standup Responses: ${summary.totals.standup_responses}`);
  lines.push('');
  
  lines.push('Containers by Type:');
  Object.entries(summary.containersByType).forEach(([type, count]) => {
    lines.push(`  - ${type}: ${count}`);
  });
  lines.push('');
  
  lines.push('-'.repeat(70));
  lines.push('JOURNEYS DETAIL');
  lines.push('-'.repeat(70));
  
  summary.journeys.forEach((journey, index) => {
    lines.push('');
    lines.push(`Journey ${index + 1}: ${journey.title}`);
    lines.push(`Description: ${journey.description || 'N/A'}`);
    lines.push(`Status: ${journey.status}`);
    lines.push(`Containers: ${journey.totalContainers}`);
    lines.push(`Total Content: ${journey.totalContent} items`);
    
    if (journey.containers.length > 0) {
      lines.push('');
      lines.push('  Containers:');
      journey.containers.forEach((container) => {
        const contentItems = Object.entries(container.counts)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        lines.push(`    - ${container.type}: ${container.name} (${contentItems})`);
      });
    }
  });
  
  lines.push('');
  lines.push('='.repeat(70));
  lines.push(`Report generated: ${summary.generated_at}`);
  lines.push('='.repeat(70));
  
  return lines.join('\n');
}

/**
 * Download a text report
 */
export function downloadTextReport(summary: ProgramSummary, filename?: string) {
  const text = generateTextReport(summary);
  const defaultFilename = `${summary.program.slug}-report-${new Date().toISOString().split('T')[0]}.txt`;
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Compare two summaries to show what changed
 */
export interface SummaryComparison {
  program_name: string;
  before: ProgramSummary;
  after: ProgramSummary;
  differences: {
    journeys: { before: number; after: number; delta: number };
    containers: { before: number; after: number; delta: number };
    members: { before: number; after: number; delta: number };
    posts: { before: number; after: number; delta: number };
    documents: { before: number; after: number; delta: number };
    reviews: { before: number; after: number; delta: number };
    events: { before: number; after: number; delta: number };
    forum_threads: { before: number; after: number; delta: number };
    pitches: { before: number; after: number; delta: number };
    standup_responses: { before: number; after: number; delta: number };
    total_content_items: { before: number; after: number; delta: number };
  };
  is_identical: boolean;
}

/**
 * Compare two program summaries
 */
export function compareProgramSummaries(before: ProgramSummary, after: ProgramSummary): SummaryComparison {
  const differences = {
    journeys: {
      before: before.totals.journeys,
      after: after.totals.journeys,
      delta: after.totals.journeys - before.totals.journeys,
    },
    containers: {
      before: before.totals.containers,
      after: after.totals.containers,
      delta: after.totals.containers - before.totals.containers,
    },
    members: {
      before: before.totals.members,
      after: after.totals.members,
      delta: after.totals.members - before.totals.members,
    },
    posts: {
      before: before.totals.posts,
      after: after.totals.posts,
      delta: after.totals.posts - before.totals.posts,
    },
    documents: {
      before: before.totals.documents,
      after: after.totals.documents,
      delta: after.totals.documents - before.totals.documents,
    },
    reviews: {
      before: before.totals.reviews,
      after: after.totals.reviews,
      delta: after.totals.reviews - before.totals.reviews,
    },
    events: {
      before: before.totals.events,
      after: after.totals.events,
      delta: after.totals.events - before.totals.events,
    },
    forum_threads: {
      before: before.totals.forum_threads,
      after: after.totals.forum_threads,
      delta: after.totals.forum_threads - before.totals.forum_threads,
    },
    pitches: {
      before: before.totals.pitches,
      after: after.totals.pitches,
      delta: after.totals.pitches - before.totals.pitches,
    },
    standup_responses: {
      before: before.totals.standup_responses,
      after: after.totals.standup_responses,
      delta: after.totals.standup_responses - before.totals.standup_responses,
    },
    total_content_items: {
      before: before.totals.total_content_items,
      after: after.totals.total_content_items,
      delta: after.totals.total_content_items - before.totals.total_content_items,
    },
  };

  // Check if all deltas are zero
  const is_identical = Object.values(differences).every(d => d.delta === 0);

  return {
    program_name: before.program.name,
    before,
    after,
    differences,
    is_identical,
  };
}

/**
 * Generate a comparison report
 */
export function generateComparisonReport(comparison: SummaryComparison): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(70));
  lines.push(`PROGRAM COMPARISON REPORT: ${comparison.program_name}`);
  lines.push('='.repeat(70));
  lines.push('');
  
  if (comparison.is_identical) {
    lines.push('✅ PERFECT MATCH - All content restored successfully!');
    lines.push('');
    lines.push('All journeys, containers, and content items match exactly between');
    lines.push('the original and restored program.');
  } else {
    lines.push('⚠️  DIFFERENCES DETECTED');
    lines.push('');
    lines.push('The following differences were found between before and after:');
    lines.push('');
    
    Object.entries(comparison.differences).forEach(([key, stats]) => {
      if (stats.delta !== 0) {
        const direction = stats.delta > 0 ? '↑' : '↓';
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        lines.push(`  ${direction} ${label}: ${stats.before} → ${stats.after} (${stats.delta > 0 ? '+' : ''}${stats.delta})`);
      }
    });
  }
  
  lines.push('');
  lines.push('-'.repeat(70));
  lines.push('DETAILED COMPARISON');
  lines.push('-'.repeat(70));
  lines.push('');
  lines.push(`${'Metric'.padEnd(25)} ${'Before'.padStart(10)} ${'After'.padStart(10)} ${'Delta'.padStart(10)}`);
  lines.push('-'.repeat(70));
  
  Object.entries(comparison.differences).forEach(([key, stats]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const deltaStr = stats.delta > 0 ? `+${stats.delta}` : `${stats.delta}`;
    lines.push(`${label.padEnd(25)} ${stats.before.toString().padStart(10)} ${stats.after.toString().padStart(10)} ${deltaStr.padStart(10)}`);
  });
  
  lines.push('');
  lines.push('='.repeat(70));
  lines.push(`Comparison generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(70));
  
  return lines.join('\n');
}