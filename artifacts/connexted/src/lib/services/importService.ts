/**
 * Import Service
 * 
 * Imports courses, programs, and journeys from JSON definitions
 * Handles validation, content verification, and database insertion
 */

import { supabase } from '@/lib/supabase';
import {
  ContainerDefinition,
  StandaloneJourneyDefinition,
  ImportOptions,
  ImportResult,
  Validator
} from '../schemas/containerSchema';

export class ImportService {
  /**
   * Import a complete course or program from JSON
   */
  static async importContainer(
    definition: ContainerDefinition,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      containerType: definition.type,
      journeyIds: [],
      itemIds: [],
      errors: [],
      warnings: [],
      summary: {
        journeysCreated: 0,
        itemsCreated: 0
      }
    };

    try {
      // Step 1: Validate the definition
      if (!options.skipValidation) {
        const validation = Validator.validate(definition);
        result.warnings.push(...validation.warnings);
        
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          return result;
        }
      }

      // Step 2: Verify content items exist (unless allowMissingContent)
      if (!options.allowMissingContent) {
        const contentCheck = await this.verifyContentExists(definition);
        if (!contentCheck.valid) {
          result.errors.push(...contentCheck.errors);
          result.warnings.push(...contentCheck.warnings);
          return result;
        }
        result.warnings.push(...contentCheck.warnings);
      }

      // Step 3: Create or update the container
      let containerId: string;
      
      if (options.updateExisting && definition.id) {
        // Update existing
        containerId = definition.id;
        await this.updateContainer(definition, options);
      } else {
        // Create new
        containerId = await this.createContainer(definition, options);
      }

      result.containerId = containerId;

      // Step 4: Import journeys and items
      for (const journeyDef of definition.journeys) {
        try {
          const journeyResult = await this.importJourney(
            journeyDef,
            containerId,
            definition.type,
            options
          );
          
          result.journeyIds.push(journeyResult.journeyId);
          result.itemIds.push(...journeyResult.itemIds);
          result.summary.journeysCreated++;
          result.summary.itemsCreated += journeyResult.itemIds.length;
        } catch (error) {
          result.errors.push(`Failed to import journey "${journeyDef.title}": ${error.message}`);
        }
      }

      // Step 5: Calculate total duration
      if (definition.metadata.estimated_duration_hours) {
        result.summary.totalDuration = definition.metadata.estimated_duration_hours;
      }

      result.success = result.errors.length === 0;
      
      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Import a standalone journey (can be attached to existing container later)
   */
  static async importStandaloneJourney(
    definition: StandaloneJourneyDefinition,
    containerId: string,
    containerType: 'program' | 'course',
    options: ImportOptions = {}
  ): Promise<{ journeyId: string; itemIds: string[] }> {
    const validation = Validator.validateJourney(definition);
    
    if (!validation.valid) {
      throw new Error(`Invalid journey definition: ${validation.errors.join(', ')}`);
    }

    return await this.importJourney(
      definition.journey,
      containerId,
      containerType,
      options
    );
  }

  /**
   * Verify that all referenced content items exist
   */
  private static async verifyContentExists(
    definition: ContainerDefinition
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Collect all unique item references
    const itemRefs = new Map<string, Set<string>>(); // type -> Set of IDs
    
    for (const journey of definition.journeys) {
      for (const item of journey.items) {
        if (!itemRefs.has(item.item_type)) {
          itemRefs.set(item.item_type, new Set());
        }
        itemRefs.get(item.item_type)!.add(item.item_id);
      }
    }

    // Check each content type
    const tableMap: Record<string, string> = {
      document: 'documents',
      book: 'books',
      deck: 'decks',
      shelf: 'libraries',
      playlist: 'playlists'
    };

    for (const [itemType, itemIds] of itemRefs.entries()) {
      const tableName = tableMap[itemType];
      
      if (!tableName) {
        // Container types (build, pitch, etc.) - skip verification for now
        warnings.push(`Skipping verification for item_type: ${itemType}`);
        continue;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .in('id', Array.from(itemIds));

      if (error) {
        warnings.push(`Could not verify ${itemType} items: ${error.message}`);
        continue;
      }

      const foundIds = new Set(data?.map(d => d.id) || []);
      const missingIds = Array.from(itemIds).filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        errors.push(
          `Missing ${itemType} items: ${missingIds.join(', ')}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a new container (course or program)
   */
  private static async createContainer(
    definition: ContainerDefinition,
    options: ImportOptions
  ): Promise<string> {
    const tableName = definition.type === 'course' ? 'courses' : 'programs';
    const metadata = definition.metadata;

    const record: any = {
      title: metadata.title,
      slug: metadata.slug,
      description: metadata.description,
      short_description: metadata.short_description,
      category: metadata.category,
      difficulty_level: metadata.difficulty_level,
      instructor_name: metadata.instructor_name,
      instructor_bio: metadata.instructor_bio,
      instructor_avatar_url: metadata.instructor_avatar_url,
      thumbnail_url: metadata.thumbnail_url,
      featured_image_url: metadata.featured_image_url,
      video_trailer_url: metadata.video_trailer_url,
      estimated_duration_hours: metadata.estimated_duration_hours,
      seo_title: metadata.seo_title,
      seo_description: metadata.seo_description,
      seo_keywords: metadata.seo_keywords,
      created_by: options.createdBy || definition.created_by
    };

    // Course-specific fields
    if (definition.type === 'course') {
      record.pricing_type = metadata.pricing_type || 'free';
      record.price_cents = metadata.price_cents || 0;
      record.currency = metadata.currency || 'USD';
      record.course_status = metadata.status || 'draft';
    } else {
      // Program-specific fields
      record.status = metadata.status || 'draft';
      if (options.createdBy) {
        record.admin_ids = [options.createdBy];
      }
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create ${definition.type}: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update an existing container
   */
  private static async updateContainer(
    definition: ContainerDefinition,
    options: ImportOptions
  ): Promise<void> {
    const tableName = definition.type === 'course' ? 'courses' : 'programs';
    const metadata = definition.metadata;

    const record: any = {
      title: metadata.title,
      description: metadata.description,
      short_description: metadata.short_description,
      category: metadata.category,
      difficulty_level: metadata.difficulty_level,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(tableName)
      .update(record)
      .eq('id', definition.id!);

    if (error) {
      throw new Error(`Failed to update ${definition.type}: ${error.message}`);
    }
  }

  /**
   * Import a single journey with its items
   */
  private static async importJourney(
    journeyDef: any,
    containerId: string,
    containerType: 'program' | 'course',
    options: ImportOptions
  ): Promise<{ journeyId: string; itemIds: string[] }> {
    // Create journey
    const journeyRecord: any = {
      title: journeyDef.title,
      description: journeyDef.description,
      order_index: journeyDef.order_index,
      is_published: journeyDef.is_published
    };

    if (containerType === 'program') {
      journeyRecord.program_id = containerId;
    } else {
      journeyRecord.course_id = containerId;
    }

    const { data: journey, error: journeyError } = await supabase
      .from('program_journeys')
      .insert(journeyRecord)
      .select('id')
      .single();

    if (journeyError) {
      throw new Error(`Failed to create journey: ${journeyError.message}`);
    }

    const journeyId = journey.id;
    const itemIds: string[] = [];

    // Create items
    if (journeyDef.items && journeyDef.items.length > 0) {
      const itemRecords = journeyDef.items.map((item: any) => ({
        journey_id: journeyId,
        item_type: item.item_type,
        item_id: item.item_id,
        title: item.title,
        description: item.description,
        order_index: item.order_index,
        is_published: item.is_published !== false, // default true
        is_required: item.is_required || false,
        estimated_duration_minutes: item.estimated_duration_minutes
      }));

      const { data: items, error: itemsError } = await supabase
        .from('journey_items')
        .insert(itemRecords)
        .select('id');

      if (itemsError) {
        throw new Error(`Failed to create journey items: ${itemsError.message}`);
      }

      itemIds.push(...(items?.map(i => i.id) || []));
    }

    return { journeyId, itemIds };
  }

  /**
   * Duplicate a container (export then import with new IDs)
   */
  static async duplicateContainer(
    sourceId: string,
    containerType: 'program' | 'course',
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    // Import the export service dynamically to avoid circular dependency
    const { ExportService } = await import('./exportService');
    
    // Export the source container
    const definition = await ExportService.exportContainer(sourceId, containerType);
    
    // Modify for duplication
    definition.metadata.title = `${definition.metadata.title} (Copy)`;
    if (definition.metadata.slug) {
      definition.metadata.slug = `${definition.metadata.slug}-copy`;
    }
    delete definition.id; // Remove ID to force creation of new container
    
    // Import as new
    return await this.importContainer(definition, {
      ...options,
      generateNewIds: true
    });
  }
}

// Export singleton
export const importService = ImportService;
