import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logError } from '@/lib/error-handler';

// ============================================================================
// COURSE EXPORT/IMPORT SYSTEM
// ============================================================================
// Complete system for exporting and importing courses as JSON
// Includes all journeys, journey items, and metadata
// ============================================================================

export interface CourseExport {
  version: string;
  exportedAt: string;
  exportedBy: string;
  course: {
    slug: string;
    title: string;
    description: string;
    category: string | null;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    pricing_type: 'free' | 'paid' | 'members-only';
    price_cents: number;
    currency: string;
    access_level: 'public' | 'member' | 'premium';
    instructor_name: string;
    instructor_bio: string;
    instructor_avatar_url: string | null;
    is_published: boolean;
    featured: boolean;
    total_lessons: number;
    convertkit_product_id: string | null;
  };
  journeys: Array<{
    title: string;
    description: string;
    order_index: number;
    status: string;
    start_date: string | null;
    finish_date: string | null;
    items: Array<{
      item_type: string;
      item_id: string | null;
      title: string;
      description: string;
      order_index: number;
      is_required: boolean;
      estimated_duration_minutes: number | null;
    }>;
  }>;
}

/**
 * Export a complete course with all journeys and items as JSON
 */
export async function exportCourse(courseId: string): Promise<CourseExport | null> {
  try {
    // Fetch course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    if (!course) throw new Error('Course not found');

    // Fetch journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('program_journeys')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (journeysError) throw journeysError;

    // Fetch journey items for each journey
    const journeysWithItems = await Promise.all(
      (journeys || []).map(async (journey) => {
        const { data: items, error: itemsError } = await supabase
          .from('journey_items')
          .select('*')
          .eq('journey_id', journey.id)
          .order('order_index', { ascending: true });

        if (itemsError) {
          console.warn('Could not fetch items for journey:', journey.id, itemsError);
        }

        return {
          title: journey.title,
          description: journey.description,
          order_index: journey.order_index,
          status: journey.status,
          start_date: journey.start_date,
          finish_date: journey.finish_date,
          items: (items || []).map((item) => ({
            item_type: item.item_type,
            item_id: item.item_id,
            title: item.title,
            description: item.description,
            order_index: item.order_index,
            is_required: item.is_required,
            estimated_duration_minutes: item.estimated_duration_minutes,
          })),
        };
      })
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const exportData: CourseExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user?.id || 'unknown',
      course: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        difficulty_level: course.difficulty_level,
        pricing_type: course.pricing_type,
        price_cents: course.price_cents,
        currency: course.currency,
        access_level: course.access_level,
        instructor_name: course.instructor_name,
        instructor_bio: course.instructor_bio,
        instructor_avatar_url: course.instructor_avatar_url,
        is_published: course.is_published,
        featured: course.featured,
        total_lessons: course.total_lessons,
        convertkit_product_id: course.convertkit_product_id,
      },
      journeys: journeysWithItems,
    };

    return exportData;
  } catch (error: any) {
    logError('Error exporting course:', error, { component: 'courseExportService' });
    toast.error('Failed to export course: ' + error.message);
    return null;
  }
}

/**
 * Import a course from JSON export
 * Creates new course with new IDs (does not overwrite existing)
 */
export async function importCourse(
  exportData: CourseExport,
  options: {
    newSlug?: string; // Optional: change the slug to avoid conflicts
    setAsPublished?: boolean; // Optional: override published status
  } = {}
): Promise<string | null> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to import a course');

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    // Check for slug conflicts
    const slug = options.newSlug || exportData.course.slug;
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingCourse) {
      throw new Error(
        `A course with slug "${slug}" already exists. Please provide a different slug using the newSlug option.`
      );
    }

    // Create the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        slug,
        title: exportData.course.title,
        description: exportData.course.description,
        category: exportData.course.category,
        difficulty_level: exportData.course.difficulty_level,
        pricing_type: exportData.course.pricing_type,
        price_cents: exportData.course.price_cents,
        currency: exportData.course.currency,
        access_level: exportData.course.access_level,
        instructor_id: user.id,
        instructor_name: profile.full_name || exportData.course.instructor_name,
        instructor_bio: exportData.course.instructor_bio,
        instructor_avatar_url: profile.avatar_url || exportData.course.instructor_avatar_url,
        created_by: user.id,
        is_published: options.setAsPublished ?? false, // Default to unpublished on import
        featured: false, // Never import as featured
        enrollment_count: 0,
        total_lessons: exportData.course.total_lessons,
        average_rating: 0,
        convertkit_product_id: exportData.course.convertkit_product_id,
      })
      .select()
      .single();

    if (courseError) throw courseError;
    if (!course) throw new Error('Failed to create course');

    // Create journeys
    for (const journeyData of exportData.journeys) {
      const { data: journey, error: journeyError } = await supabase
        .from('program_journeys')
        .insert({
          course_id: course.id,
          title: journeyData.title,
          description: journeyData.description,
          order_index: journeyData.order_index,
          status: journeyData.status,
          start_date: journeyData.start_date,
          finish_date: journeyData.finish_date,
        })
        .select()
        .single();

      if (journeyError) throw journeyError;
      if (!journey) throw new Error('Failed to create journey');

      // Create journey items
      if (journeyData.items && journeyData.items.length > 0) {
        const itemsToInsert = journeyData.items.map((item) => ({
          journey_id: journey.id,
          item_type: item.item_type,
          item_id: item.item_id,
          title: item.title,
          description: item.description,
          order_index: item.order_index,
          is_required: item.is_required,
          estimated_duration_minutes: item.estimated_duration_minutes,
        }));

        const { error: itemsError } = await supabase
          .from('journey_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.warn('Failed to create some journey items:', itemsError);
          // Don't throw - continue with other items
        }
      }
    }

    toast.success(`Course "${exportData.course.title}" imported successfully!`);
    return course.id;
  } catch (error: any) {
    logError('Error importing course:', error, { component: 'courseExportService' });
    toast.error('Failed to import course: ' + error.message);
    return null;
  }
}

/**
 * Download course export as JSON file
 */
export function downloadCourseExport(exportData: CourseExport, filename?: string) {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `course-${exportData.course.slug}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse course export from JSON file
 */
export function parseCourseExport(jsonString: string): CourseExport | null {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.version || !data.course || !data.journeys) {
      throw new Error('Invalid course export format');
    }

    return data as CourseExport;
  } catch (error: any) {
    logError('Error parsing course export:', error, { component: 'courseExportService' });
    toast.error('Invalid course export file: ' + error.message);
    return null;
  }
}

/**
 * Duplicate an existing course (export + import with new slug)
 */
export async function duplicateCourse(
  courseId: string,
  newSlug: string,
  newTitle: string
): Promise<string | null> {
  try {
    // Export the course
    const exportData = await exportCourse(courseId);
    if (!exportData) throw new Error('Failed to export course');

    // Modify for duplication
    exportData.course.slug = newSlug;
    exportData.course.title = newTitle;

    // Import as new course
    const newCourseId = await importCourse(exportData, {
      newSlug,
      setAsPublished: false,
    });

    if (!newCourseId) throw new Error('Failed to import course');

    toast.success(`Course duplicated successfully!`);
    return newCourseId;
  } catch (error: any) {
    logError('Error duplicating course:', error, { component: 'courseExportService' });
    toast.error('Failed to duplicate course: ' + error.message);
    return null;
  }
}
