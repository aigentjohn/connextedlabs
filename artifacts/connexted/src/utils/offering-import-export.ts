/**
 * Market Offering Import/Export Utilities
 * 
 * Handles bulk import/export of market offerings with Schema.org support
 */

import { createClient } from '@supabase/supabase-js';
import {
  offeringsToSchemaOrg,
  schemaOrgToOfferings,
  exportAsJsonLd,
  exportAsCsv,
  parseJsonLdImport,
  parseCsvImport,
  validateSchemaOrgProduct,
  type MarketOffering,
  type SchemaOrgProduct,
} from './schema-org';

// ================================================================
// EXPORT FUNCTIONS
// ================================================================

/**
 * Export offerings from database
 */
export async function exportOfferings(
  supabase: ReturnType<typeof createClient>,
  options: {
    companyId?: string;
    includeInactive?: boolean;
    format?: 'json-ld' | 'csv' | 'json';
    baseUrl?: string;
  } = {}
): Promise<{ success: boolean; data?: string; error?: string; filename?: string }> {
  try {
    const { companyId, includeInactive = false, format = 'json-ld', baseUrl } = options;
    
    // Build query
    let query = supabase
      .from('market_offerings')
      .select(`
        *,
        market_companies (
          name,
          logo_url
        )
      `);
    
    // Filter by company
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    // Filter active only
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    // Execute query
    const { data: offerings, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!offerings || offerings.length === 0) {
      return { success: false, error: 'No offerings found' };
    }
    
    // Map offerings to standard format
    const mappedOfferings: MarketOffering[] = offerings.map(o => ({
      ...o,
      company_name: o.market_companies?.name,
    }));
    
    // Generate export based on format
    let exportData: string;
    let filename: string;
    
    switch (format) {
      case 'json-ld':
        exportData = exportAsJsonLd(mappedOfferings, { baseUrl });
        filename = `offerings-${Date.now()}.jsonld`;
        break;
      
      case 'csv':
        exportData = exportAsCsv(mappedOfferings);
        filename = `offerings-${Date.now()}.csv`;
        break;
      
      case 'json':
        exportData = JSON.stringify(mappedOfferings, null, 2);
        filename = `offerings-${Date.now()}.json`;
        break;
      
      default:
        return { success: false, error: 'Invalid format' };
    }
    
    return {
      success: true,
      data: exportData,
      filename,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Download export as file
 */
export function downloadExport(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ================================================================
// IMPORT FUNCTIONS
// ================================================================

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
  preview?: Partial<MarketOffering>[];
}

/**
 * Parse import file
 */
export async function parseImportFile(
  file: File,
  format: 'json-ld' | 'csv' | 'json'
): Promise<{ success: boolean; offerings?: Partial<MarketOffering>[]; error?: string }> {
  try {
    const text = await file.text();
    
    let offerings: Partial<MarketOffering>[];
    
    switch (format) {
      case 'json-ld': {
        const products = parseJsonLdImport(text);
        offerings = schemaOrgToOfferings(products);
        break;
      }
      
      case 'csv': {
        offerings = parseCsvImport(text);
        break;
      }
      
      case 'json': {
        const data = JSON.parse(text);
        offerings = Array.isArray(data) ? data : [data];
        break;
      }
      
      default:
        return { success: false, error: 'Invalid format' };
    }
    
    return { success: true, offerings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse file',
    };
  }
}

/**
 * Validate import data
 */
export function validateImportData(
  offerings: Partial<MarketOffering>[]
): {
  valid: boolean;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; warning: string }>;
} {
  const errors: Array<{ row: number; error: string }> = [];
  const warnings: Array<{ row: number; warning: string }> = [];
  
  offerings.forEach((offering, index) => {
    const row = index + 1;
    
    // Required fields
    if (!offering.name) {
      errors.push({ row, error: 'Missing required field: name' });
    }
    
    if (!offering.slug) {
      warnings.push({ row, warning: 'Missing slug - will be auto-generated' });
    }
    
    // Validate price
    if (offering.price !== undefined && offering.price < 0) {
      errors.push({ row, error: 'Price cannot be negative' });
    }
    
    // Validate URLs
    if (offering.featured_image_url && !isValidUrl(offering.featured_image_url)) {
      warnings.push({ row, warning: 'Invalid image URL' });
    }
    
    if (offering.purchase_link && !isValidUrl(offering.purchase_link)) {
      warnings.push({ row, warning: 'Invalid purchase link' });
    }
    
    // Validate purchase type
    if (offering.purchase_type && 
        !['kit_commerce', 'custom_link', 'contact_only'].includes(offering.purchase_type)) {
      errors.push({ row, error: 'Invalid purchase_type' });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Import offerings to database (preview mode)
 */
export async function previewImport(
  file: File,
  format: 'json-ld' | 'csv' | 'json'
): Promise<ImportResult> {
  // Parse file
  const parseResult = await parseImportFile(file, format);
  
  if (!parseResult.success || !parseResult.offerings) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, error: parseResult.error || 'Failed to parse file' }],
      warnings: [],
    };
  }
  
  // Validate data
  const validation = validateImportData(parseResult.offerings);
  
  return {
    success: validation.valid,
    imported: 0,
    skipped: 0,
    errors: validation.errors,
    warnings: validation.warnings,
    preview: parseResult.offerings,
  };
}

/**
 * Import offerings to database (execute)
 */
export async function importOfferings(
  supabase: ReturnType<typeof createClient>,
  offerings: Partial<MarketOffering>[],
  options: {
    companyId: string;
    updateExisting?: boolean;
    skipInvalid?: boolean;
  }
): Promise<ImportResult> {
  const { companyId, updateExisting = false, skipInvalid = true } = options;
  
  // Validate first
  const validation = validateImportData(offerings);
  
  if (!validation.valid && !skipInvalid) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }
  
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [...validation.errors];
  const warnings: Array<{ row: number; warning: string }> = [...validation.warnings];
  
  // Process each offering
  for (let i = 0; i < offerings.length; i++) {
    const offering = offerings[i];
    const row = i + 1;
    
    // Skip if has errors
    if (validation.errors.some(e => e.row === row)) {
      skipped++;
      continue;
    }
    
    try {
      // Generate slug if missing
      if (!offering.slug && offering.name) {
        offering.slug = offering.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      // Set company_id
      const offeringData = {
        ...offering,
        company_id: companyId,
      };
      
      // Check if exists (by slug)
      if (updateExisting && offering.slug) {
        const { data: existing } = await supabase
          .from('market_offerings')
          .select('id')
          .eq('slug', offering.slug)
          .eq('company_id', companyId)
          .single();
        
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('market_offerings')
            .update(offeringData)
            .eq('id', existing.id);
          
          if (error) {
            errors.push({ row, error: error.message });
            skipped++;
          } else {
            imported++;
          }
          continue;
        }
      }
      
      // Insert new
      const { error } = await supabase
        .from('market_offerings')
        .insert(offeringData);
      
      if (error) {
        if (error.code === '23505') {
          // Duplicate slug
          errors.push({ row, error: 'Duplicate slug - offering already exists' });
        } else {
          errors.push({ row, error: error.message });
        }
        skipped++;
      } else {
        imported++;
      }
    } catch (err) {
      errors.push({
        row,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      skipped++;
    }
  }
  
  return {
    success: imported > 0,
    imported,
    skipped,
    errors,
    warnings,
  };
}

// ================================================================
// HELPERS
// ================================================================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Estimate import time
 */
export function estimateImportTime(count: number): string {
  const seconds = Math.ceil(count * 0.5); // ~0.5s per item
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
