/**
 * Template Service
 * 
 * Handles duplication, templates, and quick-start definitions
 * Makes it easy to create, share, and reuse course/program structures
 */

import { supabase } from '@/lib/supabase';
import { ImportService } from './importService';
import { ExportService } from './exportService';
import {
  ContainerDefinition,
  StandaloneJourneyDefinition,
  ImportOptions,
  ImportResult
} from '../schemas/containerSchema';

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  author?: string;
  type: 'course' | 'program' | 'journey';
  thumbnail_url?: string;
  is_public: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export class TemplateService {
  /**
   * Duplicate an existing course or program
   */
  static async duplicate(
    sourceId: string,
    type: 'program' | 'course',
    options: {
      newTitle?: string;
      newSlug?: string;
      createdBy?: string;
      copyEnrollments?: boolean;
    } = {}
  ): Promise<ImportResult> {
    // Export the source
    const definition = await ExportService.exportContainer(sourceId, type);

    // Modify for duplication
    definition.metadata.title = options.newTitle || `${definition.metadata.title} (Copy)`;
    
    if (options.newSlug) {
      definition.metadata.slug = options.newSlug;
    } else if (definition.metadata.slug) {
      definition.metadata.slug = `${definition.metadata.slug}-copy-${Date.now()}`;
    }

    // Remove ID to force creation
    delete definition.id;

    // Import as new
    return await ImportService.importContainer(definition, {
      createdBy: options.createdBy,
      generateNewIds: true
    });
  }

  /**
   * Save a container as a reusable template
   */
  static async saveAsTemplate(
    sourceId: string,
    type: 'program' | 'course',
    metadata: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      isPublic?: boolean;
    },
    userId: string
  ): Promise<{ templateId: string; definition: ContainerDefinition }> {
    // Export the container
    const definition = await ExportService.exportContainer(sourceId, type, {
      includeUnpublished: false
    });

    // Store as template
    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags || [],
        type: type,
        definition: definition,
        author_id: userId,
        is_public: metadata.isPublic || false,
        use_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return {
      templateId: template.id,
      definition
    };
  }

  /**
   * Create a new container from a template
   */
  static async createFromTemplate(
    templateId: string,
    options: {
      title?: string;
      slug?: string;
      createdBy: string;
    }
  ): Promise<ImportResult> {
    // Get template
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Increment use count
    await supabase
      .from('templates')
      .update({ use_count: template.use_count + 1 })
      .eq('id', templateId);

    // Get definition
    const definition = template.definition as ContainerDefinition;

    // Customize
    if (options.title) {
      definition.metadata.title = options.title;
    }
    if (options.slug) {
      definition.metadata.slug = options.slug;
    }

    // Import
    return await ImportService.importContainer(definition, {
      createdBy: options.createdBy,
      generateNewIds: true
    });
  }

  /**
   * List available templates
   */
  static async listTemplates(
    filters: {
      type?: 'course' | 'program' | 'journey';
      category?: string;
      tags?: string[];
      isPublic?: boolean;
      authorId?: string;
    } = {}
  ): Promise<TemplateMetadata[]> {
    let query = supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }

    if (filters.authorId) {
      query = query.eq('author_id', filters.authorId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }

    return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      author: t.author_id,
      type: t.type,
      thumbnail_url: t.thumbnail_url,
      is_public: t.is_public,
      use_count: t.use_count,
      created_at: t.created_at,
      updated_at: t.updated_at
    }));
  }

  /**
   * Clone a journey into another container
   */
  static async cloneJourney(
    sourceJourneyId: string,
    targetContainerId: string,
    targetType: 'program' | 'course',
    options: {
      newTitle?: string;
      orderIndex?: number;
    } = {}
  ): Promise<{ journeyId: string; itemIds: string[] }> {
    // Export the journey
    const definition = await ExportService.exportJourney(sourceJourneyId);

    // Customize
    if (options.newTitle) {
      definition.journey.title = options.newTitle;
    }
    if (options.orderIndex !== undefined) {
      definition.journey.order_index = options.orderIndex;
    }

    // Import into target container
    return await ImportService.importStandaloneJourney(
      definition,
      targetContainerId,
      targetType
    );
  }

  /**
   * Quick-start: Create from predefined JSON
   */
  static async quickStart(
    definition: ContainerDefinition,
    userId: string
  ): Promise<ImportResult> {
    return await ImportService.importContainer(definition, {
      createdBy: userId,
      allowMissingContent: true // Quick starts might reference placeholder content
    });
  }

  /**
   * Merge journeys from one container to another
   */
  static async mergeJourneys(
    sourceId: string,
    sourceType: 'program' | 'course',
    targetId: string,
    targetType: 'program' | 'course',
    journeyIds?: string[] // If not provided, merge all
  ): Promise<{ journeysCreated: number; itemsCreated: number }> {
    // Export source
    const sourceDefinition = await ExportService.exportContainer(sourceId, sourceType);

    // Filter journeys if specific IDs provided
    let journeysToMerge = sourceDefinition.journeys;
    if (journeyIds && journeyIds.length > 0) {
      journeysToMerge = sourceDefinition.journeys.filter(j =>
        journeyIds.includes(j.local_id)
      );
    }

    // Get the highest order_index in target
    const { data: existingJourneys } = await supabase
      .from('program_journeys')
      .select('order_index')
      .eq(targetType === 'program' ? 'program_id' : 'course_id', targetId)
      .order('order_index', { ascending: false })
      .limit(1);

    const startOrderIndex = existingJourneys && existingJourneys.length > 0
      ? existingJourneys[0].order_index + 1
      : 0;

    // Import journeys into target
    let journeysCreated = 0;
    let itemsCreated = 0;

    for (let i = 0; i < journeysToMerge.length; i++) {
      const journey = journeysToMerge[i];
      journey.order_index = startOrderIndex + i;

      const result = await ImportService.importStandaloneJourney(
        { version: '1.0', journey },
        targetId,
        targetType
      );

      journeysCreated++;
      itemsCreated += result.itemIds.length;
    }

    return { journeysCreated, itemsCreated };
  }

  /**
   * Create a course/program from a JSON file upload
   */
  static async importFromFile(
    file: File,
    userId: string
  ): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          const definition = JSON.parse(json) as ContainerDefinition;

          const result = await ImportService.importContainer(definition, {
            createdBy: userId
          });

          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to import file: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Batch import multiple containers from JSON
   */
  static async batchImport(
    definitions: ContainerDefinition[],
    userId: string
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const definition of definitions) {
      try {
        const result = await ImportService.importContainer(definition, {
          createdBy: userId
        });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          containerType: definition.type,
          journeyIds: [],
          itemIds: [],
          errors: [error.message],
          warnings: [],
          summary: {
            journeysCreated: 0,
            itemsCreated: 0
          }
        });
      }
    }

    return results;
  }
}

// Export singleton
export const templateService = TemplateService;
