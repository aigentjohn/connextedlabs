/**
 * Export Service
 * 
 * Exports courses, programs, and journeys to JSON format
 * Generates portable definitions that can be imported elsewhere
 */

import { supabase } from '@/lib/supabase';
import {
  ContainerDefinition,
  StandaloneJourneyDefinition,
  JourneyDefinition,
  JourneyItemDefinition,
  ExportOptions
} from '../schemas/containerSchema';

export class ExportService {
  /**
   * Export a complete course or program to JSON
   */
  static async exportContainer(
    containerId: string,
    containerType: 'program' | 'course',
    options: ExportOptions = {}
  ): Promise<ContainerDefinition> {
    // Step 1: Get container metadata
    const metadata = await this.getContainerMetadata(containerId, containerType);

    // Step 2: Get all journeys
    const journeys = await this.getJourneys(containerId, containerType, options);

    // Step 3: Build definition
    const definition: ContainerDefinition = {
      version: '1.0',
      type: containerType,
      id: containerId,
      metadata,
      journeys
    };

    // Step 4: Add optional fields
    if (options.includeTimestamps) {
      definition.exported_at = new Date().toISOString();
    }

    if (options.includeUserInfo && metadata.created_by) {
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', metadata.created_by)
        .single();
      
      if (user) {
        definition.exported_by = user.name || user.email;
      }
    }

    return definition;
  }

  /**
   * Export a single journey to JSON
   */
  static async exportJourney(
    journeyId: string,
    options: ExportOptions = {}
  ): Promise<StandaloneJourneyDefinition> {
    // Get journey details
    const { data: journey, error } = await supabase
      .from('program_journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (error || !journey) {
      throw new Error(`Journey not found: ${journeyId}`);
    }

    // Get journey items
    const items = await this.getJourneyItems(journeyId, options);

    const journeyDef: JourneyDefinition = {
      local_id: journey.id,
      title: journey.title,
      description: journey.description,
      order_index: journey.order_index,
      is_published: journey.is_published,
      items
    };

    const definition: StandaloneJourneyDefinition = {
      version: '1.0',
      journey: journeyDef
    };

    if (options.includeTimestamps) {
      definition.template = {
        name: journey.title,
        description: journey.description,
        created_at: journey.created_at
      };
    }

    return definition;
  }

  /**
   * Export to JSON string (with optional formatting)
   */
  static async exportToJSON(
    containerId: string,
    containerType: 'program' | 'course',
    options: ExportOptions = {}
  ): Promise<string> {
    const definition = await this.exportContainer(containerId, containerType, options);
    
    if (options.pretty !== false) {
      return JSON.stringify(definition, null, 2);
    }
    
    return JSON.stringify(definition);
  }

  /**
   * Export journey to JSON string
   */
  static async exportJourneyToJSON(
    journeyId: string,
    options: ExportOptions = {}
  ): Promise<string> {
    const definition = await this.exportJourney(journeyId, options);
    
    if (options.pretty !== false) {
      return JSON.stringify(definition, null, 2);
    }
    
    return JSON.stringify(definition);
  }

  /**
   * Download as file (for browser usage)
   */
  static downloadAsFile(
    json: string,
    filename: string
  ): void {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export and download container
   */
  static async exportAndDownload(
    containerId: string,
    containerType: 'program' | 'course',
    options: ExportOptions = {}
  ): Promise<void> {
    const json = await this.exportToJSON(containerId, containerType, options);
    const metadata = await this.getContainerMetadata(containerId, containerType);
    const filename = `${metadata.slug || containerId}-${containerType}.json`;
    this.downloadAsFile(json, filename);
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Get container metadata
   */
  private static async getContainerMetadata(
    containerId: string,
    containerType: 'program' | 'course'
  ): Promise<any> {
    const tableName = containerType === 'course' ? 'courses' : 'programs';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', containerId)
      .single();

    if (error || !data) {
      throw new Error(`${containerType} not found: ${containerId}`);
    }

    const metadata: any = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      short_description: data.short_description,
      category: data.category,
      difficulty_level: data.difficulty_level,
      instructor_name: data.instructor_name,
      instructor_bio: data.instructor_bio,
      instructor_avatar_url: data.instructor_avatar_url,
      thumbnail_url: data.thumbnail_url,
      featured_image_url: data.featured_image_url,
      video_trailer_url: data.video_trailer_url,
      estimated_duration_hours: data.estimated_duration_hours,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
      created_by: data.created_by
    };

    // Course-specific fields
    if (containerType === 'course') {
      metadata.pricing_type = data.pricing_type;
      metadata.price_cents = data.price_cents;
      metadata.currency = data.currency;
      metadata.status = data.course_status;
    } else {
      metadata.status = data.status;
    }

    return metadata;
  }

  /**
   * Get all journeys for a container
   */
  private static async getJourneys(
    containerId: string,
    containerType: 'program' | 'course',
    options: ExportOptions
  ): Promise<JourneyDefinition[]> {
    const field = containerType === 'program' ? 'program_id' : 'course_id';

    let query = supabase
      .from('program_journeys')
      .select('*')
      .eq(field, containerId)
      .order('order_index');

    if (!options.includeUnpublished) {
      query = query.eq('is_published', true);
    }

    const { data: journeys, error } = await query;

    if (error) {
      throw new Error(`Failed to get journeys: ${error.message}`);
    }

    const journeyDefinitions: JourneyDefinition[] = [];

    for (const journey of journeys || []) {
      const items = await this.getJourneyItems(journey.id, options);

      journeyDefinitions.push({
        local_id: journey.id,
        title: journey.title,
        description: journey.description,
        order_index: journey.order_index,
        is_published: journey.is_published,
        items
      });
    }

    return journeyDefinitions;
  }

  /**
   * Get all items for a journey
   */
  private static async getJourneyItems(
    journeyId: string,
    options: ExportOptions
  ): Promise<JourneyItemDefinition[]> {
    let query = supabase
      .from('journey_items')
      .select('*')
      .eq('journey_id', journeyId)
      .order('order_index');

    if (!options.includeUnpublished) {
      query = query.eq('is_published', true);
    }

    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Failed to get journey items: ${error.message}`);
    }

    return (items || []).map(item => ({
      local_id: item.id,
      item_type: item.item_type,
      item_id: item.item_id,
      title: item.title,
      description: item.description,
      order_index: item.order_index,
      is_published: item.is_published,
      is_required: item.is_required,
      estimated_duration_minutes: item.estimated_duration_minutes
    }));
  }

  /**
   * Export multiple containers as a batch
   */
  static async exportBatch(
    containers: Array<{ id: string; type: 'program' | 'course' }>,
    options: ExportOptions = {}
  ): Promise<string> {
    const definitions = await Promise.all(
      containers.map(c => this.exportContainer(c.id, c.type, options))
    );

    const batch = {
      version: '1.0',
      containers: definitions,
      exported_at: new Date().toISOString()
    };

    if (options.pretty !== false) {
      return JSON.stringify(batch, null, 2);
    }

    return JSON.stringify(batch);
  }
}

// Export singleton
export const exportService = ExportService;
