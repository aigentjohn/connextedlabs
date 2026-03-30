/**
 * JSON Schema Definitions for Courses and Programs
 * 
 * Enables export, import, and duplication of courses/programs as JSON files
 * Think "Infrastructure as Code" for learning content
 */

import type { ContainerType, ItemType } from '../services/journeyService';

/**
 * Journey Item Definition
 */
export interface JourneyItemDefinition {
  // Local ID (used for references within this JSON)
  local_id?: string;
  
  // Item details
  item_type: ItemType;
  item_id: string; // Reference to existing content (document, book, etc.)
  title: string;
  description?: string;
  
  // Ordering and visibility
  order_index: number;
  is_published: boolean;
  is_required?: boolean;
  
  // Optional metadata
  estimated_duration_minutes?: number;
  prerequisites?: string[]; // Array of local_ids
  metadata?: Record<string, any>;
}

/**
 * Journey Definition
 */
export interface JourneyDefinition {
  // Local ID (used for references within this JSON)
  local_id: string;
  
  // Journey details
  title: string;
  description?: string;
  
  // Ordering and visibility
  order_index: number;
  is_published: boolean;
  
  // Items in this journey
  items: JourneyItemDefinition[];
  
  // Optional metadata
  metadata?: Record<string, any>;
}

/**
 * Course/Program Metadata
 */
export interface ContainerMetadata {
  // Basic info
  title: string;
  slug?: string;
  description?: string;
  short_description?: string;
  
  // Categorization
  category?: string;
  tags?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // Instructor info
  instructor_name?: string;
  instructor_bio?: string;
  instructor_avatar_url?: string;
  
  // Media
  thumbnail_url?: string;
  featured_image_url?: string;
  video_trailer_url?: string;
  
  // Status
  status?: 'draft' | 'published' | 'archived';
  
  // Course-specific
  pricing_type?: 'free' | 'paid' | 'waitlist';
  price_cents?: number;
  currency?: string;
  
  // Estimates
  estimated_duration_hours?: number;
  total_lessons?: number;
  
  // SEO
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  
  // Custom metadata
  metadata?: Record<string, any>;
}

/**
 * Complete Container Definition (Course or Program)
 */
export interface ContainerDefinition {
  // Schema version (for future compatibility)
  version: string;
  
  // Type
  type: ContainerType;
  
  // Metadata
  metadata: ContainerMetadata;
  
  // Structure
  journeys: JourneyDefinition[];
  
  // Optional: existing container ID (for updates)
  id?: string;
  
  // Optional: created_by (for import)
  created_by?: string;
  
  // Timestamps (informational only, will be regenerated on import)
  exported_at?: string;
  exported_by?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Import options
 */
export interface ImportOptions {
  // If true, update existing container instead of creating new
  updateExisting?: boolean;
  
  // If true, generate new IDs for all entities (for duplication)
  generateNewIds?: boolean;
  
  // User ID to set as created_by
  createdBy?: string;
  
  // If true, skip validation (not recommended)
  skipValidation?: boolean;
  
  // If true, import even if some content items don't exist
  allowMissingContent?: boolean;
  
  // Community/Program ID to associate with (required for courses)
  communityId?: string;
  programId?: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  // If true, include unpublished journeys and items
  includeUnpublished?: boolean;
  
  // If true, include metadata timestamps
  includeTimestamps?: boolean;
  
  // If true, include user information
  includeUserInfo?: boolean;
  
  // Format output
  pretty?: boolean;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  containerId?: string;
  containerType: ContainerType;
  journeyIds: string[];
  itemIds: string[];
  errors: string[];
  warnings: string[];
  summary: {
    journeysCreated: number;
    itemsCreated: number;
    totalDuration?: number;
  };
}

/**
 * Standalone Journey Definition (reusable across containers)
 */
export interface StandaloneJourneyDefinition {
  version: string;
  
  // Journey details
  journey: JourneyDefinition;
  
  // Optional: metadata about the journey template
  template?: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    author?: string;
    created_at?: string;
  };
}

/**
 * Batch import/export
 */
export interface BatchDefinition {
  version: string;
  containers: ContainerDefinition[];
  journeys?: StandaloneJourneyDefinition[];
}

/**
 * Schema validator
 */
export class ContainerSchemaValidator {
  static CURRENT_VERSION = '1.0';
  
  static validate(definition: ContainerDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Version check
    if (!definition.version) {
      errors.push('Missing required field: version');
    } else if (definition.version !== this.CURRENT_VERSION) {
      warnings.push(`Schema version mismatch. Expected ${this.CURRENT_VERSION}, got ${definition.version}`);
    }
    
    // Type check
    if (!definition.type || !['course', 'program'].includes(definition.type)) {
      errors.push('Invalid or missing type. Must be "course" or "program"');
    }
    
    // Metadata validation
    if (!definition.metadata) {
      errors.push('Missing required field: metadata');
    } else {
      if (!definition.metadata.title || definition.metadata.title.trim() === '') {
        errors.push('Metadata must include a title');
      }
      
      if (definition.metadata.pricing_type === 'paid' && !definition.metadata.price_cents) {
        errors.push('Paid courses must have a price_cents value');
      }
    }
    
    // Journeys validation
    if (!definition.journeys || definition.journeys.length === 0) {
      warnings.push('No journeys defined. Container will be empty.');
    } else {
      const localIds = new Set<string>();
      
      definition.journeys.forEach((journey, journeyIndex) => {
        // Check for duplicate local_ids
        if (localIds.has(journey.local_id)) {
          errors.push(`Duplicate journey local_id: ${journey.local_id}`);
        }
        localIds.add(journey.local_id);
        
        // Validate journey fields
        if (!journey.title || journey.title.trim() === '') {
          errors.push(`Journey at index ${journeyIndex} must have a title`);
        }
        
        if (journey.order_index === undefined || journey.order_index === null) {
          errors.push(`Journey "${journey.title}" must have an order_index`);
        }
        
        // Validate items
        if (!journey.items || journey.items.length === 0) {
          warnings.push(`Journey "${journey.title}" has no items`);
        } else {
          journey.items.forEach((item, itemIndex) => {
            if (!item.item_type) {
              errors.push(`Item at journey "${journey.title}", index ${itemIndex} must have an item_type`);
            }
            
            if (!item.item_id) {
              errors.push(`Item at journey "${journey.title}", index ${itemIndex} must have an item_id`);
            }
            
            if (!item.title || item.title.trim() === '') {
              errors.push(`Item at journey "${journey.title}", index ${itemIndex} must have a title`);
            }
            
            if (item.order_index === undefined || item.order_index === null) {
              errors.push(`Item "${item.title}" in journey "${journey.title}" must have an order_index`);
            }
          });
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static validateJourney(definition: StandaloneJourneyDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!definition.version) {
      errors.push('Missing required field: version');
    }
    
    if (!definition.journey) {
      errors.push('Missing required field: journey');
      return { valid: false, errors, warnings };
    }
    
    // Create a mock container to validate the journey
    const mockContainer: ContainerDefinition = {
      version: definition.version,
      type: 'course',
      metadata: { title: 'Mock' },
      journeys: [definition.journey]
    };
    
    const result = this.validate(mockContainer);
    
    return result;
  }
}

// Export types and validator
export { ContainerSchemaValidator as Validator };
