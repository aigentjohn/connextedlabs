/**
 * Simple Offering Import
 * 
 * For companies to provide their product/offering data as JSON,
 * then admin can paste and import. No complex UI needed.
 */

import { createClient } from '@supabase/supabase-js';

// ================================================================
// SIMPLE IMPORT FORMAT
// ================================================================

/**
 * Simple format companies fill out
 */
export interface SimpleOfferingImport {
  // Basic Info (required)
  name: string;
  description: string;
  
  // Pricing (optional)
  price?: number;
  priceDisplay?: string; // e.g., "Contact for pricing"
  
  // Images (optional)
  image?: string;
  additionalImages?: string[];
  
  // Details (optional)
  category?: string; // e.g., "SaaS", "Service", "Product"
  targetAudience?: string[]; // e.g., ["startups", "enterprises"]
  tags?: string[]; // e.g., ["ai", "automation"]
  
  // Purchase (optional)
  purchaseLink?: string;
  kitProductId?: string; // If using Kit Commerce
  
  // Program Linking (optional - admin sets this)
  linkedProgramId?: string;
  enrollmentBehavior?: 'auto_enroll' | 'auto_waitlist' | 'manual_review' | 'none';
  marketingLevel?: 'featured' | 'premium' | 'standard' | 'unlisted';
}

// ================================================================
// IMPORT FUNCTION
// ================================================================

export async function importCompanyOfferings(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  offerings: SimpleOfferingImport[]
): Promise<{
  success: boolean;
  imported: number;
  errors: Array<{ offering: string; error: string }>;
}> {
  const errors: Array<{ offering: string; error: string }> = [];
  let imported = 0;
  
  for (const offering of offerings) {
    try {
      // Validate required fields
      if (!offering.name) {
        errors.push({ offering: offering.name || 'Unknown', error: 'Missing name' });
        continue;
      }
      
      if (!offering.description) {
        errors.push({ offering: offering.name, error: 'Missing description' });
        continue;
      }
      
      // Generate slug from name
      const slug = offering.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if slug already exists for this company
      const { data: existing } = await supabase
        .from('market_offerings')
        .select('id')
        .eq('company_id', companyId)
        .eq('slug', slug)
        .single();
      
      if (existing) {
        errors.push({ 
          offering: offering.name, 
          error: `Offering "${offering.name}" already exists for this company` 
        });
        continue;
      }
      
      // Determine purchase type
      let purchaseType: 'kit_commerce' | 'custom_link' | 'contact_only' = 'contact_only';
      if (offering.kitProductId) {
        purchaseType = 'kit_commerce';
      } else if (offering.purchaseLink) {
        purchaseType = 'custom_link';
      }
      
      // Insert offering
      const { error } = await supabase
        .from('market_offerings')
        .insert({
          company_id: companyId,
          name: offering.name,
          slug,
          tagline: offering.description.split('.')[0].substring(0, 150), // First sentence as tagline
          description: offering.description.substring(0, 300), // Short version
          long_description: offering.description,
          featured_image_url: offering.image,
          additional_images: offering.additionalImages,
          price: offering.price,
          price_display: offering.priceDisplay || (offering.price ? `$${offering.price}` : null),
          purchase_type: purchaseType,
          purchase_link: offering.purchaseLink,
          kit_product_id: offering.kitProductId,
          category: offering.category,
          target_audience: offering.targetAudience,
          tags: offering.tags,
          linked_program_id: offering.linkedProgramId,
          enrollment_behavior: offering.enrollmentBehavior,
          marketing_level: offering.marketingLevel || 'standard',
          is_active: true,
        });
      
      if (error) {
        errors.push({ offering: offering.name, error: error.message });
      } else {
        imported++;
      }
    } catch (err) {
      errors.push({ 
        offering: offering.name || 'Unknown', 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }
  
  return {
    success: imported > 0,
    imported,
    errors,
  };
}

// ================================================================
// VALIDATION (Preview before import)
// ================================================================

export function validateOfferingImport(offerings: SimpleOfferingImport[]): {
  valid: boolean;
  errors: Array<{ offering: string; error: string }>;
  warnings: Array<{ offering: string; warning: string }>;
} {
  const errors: Array<{ offering: string; error: string }> = [];
  const warnings: Array<{ offering: string; warning: string }> = [];
  
  offerings.forEach((offering) => {
    const name = offering.name || 'Unknown';
    
    // Required fields
    if (!offering.name) {
      errors.push({ offering: name, error: 'Missing required field: name' });
    }
    
    if (!offering.description) {
      errors.push({ offering: name, error: 'Missing required field: description' });
    }
    
    // Warnings for missing optional but recommended fields
    if (!offering.price && !offering.priceDisplay) {
      warnings.push({ offering: name, warning: 'No price information provided' });
    }
    
    if (!offering.image) {
      warnings.push({ offering: name, warning: 'No image provided' });
    }
    
    if (!offering.category) {
      warnings.push({ offering: name, warning: 'No category specified' });
    }
    
    // Validate price
    if (offering.price !== undefined && offering.price < 0) {
      errors.push({ offering: name, error: 'Price cannot be negative' });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ================================================================
// TEMPLATE GENERATOR
// ================================================================

/**
 * Generate a template JSON for companies to fill out
 */
export function generateImportTemplate(): SimpleOfferingImport[] {
  return [
    {
      name: "Your Product or Service Name",
      description: "A detailed description of what you're offering. This will be shown to potential customers.",
      price: 99.00,
      priceDisplay: "$99", // Or "Contact for pricing", "Free", etc.
      image: "https://example.com/image.jpg",
      additionalImages: [
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg"
      ],
      category: "SaaS", // Options: SaaS, Service, Product, Course, Consulting, etc.
      targetAudience: ["startups", "small-business"],
      tags: ["productivity", "automation"],
      purchaseLink: "https://yoursite.com/buy",
      kitProductId: "", // Leave empty if not using Kit Commerce
    }
  ];
}

/**
 * Generate instructions for companies
 */
export function generateInstructions(): string {
  return `
# How to Submit Your Product Listings

## Step 1: Copy this template

\`\`\`json
${JSON.stringify(generateImportTemplate(), null, 2)}
\`\`\`

## Step 2: Fill out your product information

**Required fields:**
- \`name\` - Your product/service name
- \`description\` - Detailed description (will be shown to customers)

**Recommended fields:**
- \`price\` - Numeric price (e.g., 99.00)
- \`priceDisplay\` - How price displays (e.g., "$99/month", "Contact for pricing")
- \`image\` - Main product image URL
- \`category\` - Product category (SaaS, Service, Product, Course, etc.)

**Optional fields:**
- \`additionalImages\` - Array of additional image URLs
- \`targetAudience\` - Array of audience types
- \`tags\` - Array of tags for filtering
- \`purchaseLink\` - Where customers can purchase
- \`kitProductId\` - Only if using Kit Commerce

## Step 3: Add multiple products

You can add multiple products in the array:

\`\`\`json
[
  {
    "name": "Product 1",
    "description": "...",
    ...
  },
  {
    "name": "Product 2",
    "description": "...",
    ...
  }
]
\`\`\`

## Step 4: Send the completed JSON back to us

We'll import it into your company profile on the platform.

## Example:

\`\`\`json
[
  {
    "name": "AI Content Generator",
    "description": "Generate high-quality blog posts, social media content, and marketing copy in seconds using advanced AI. Perfect for content marketers and social media managers.",
    "price": 49.00,
    "priceDisplay": "$49/month",
    "image": "https://example.com/ai-generator.jpg",
    "category": "SaaS",
    "targetAudience": ["marketers", "small-business"],
    "tags": ["ai", "content", "marketing"],
    "purchaseLink": "https://example.com/buy"
  }
]
\`\`\`
`;
}
