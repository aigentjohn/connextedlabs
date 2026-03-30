/**
 * Schema.org Product Mapping Utility
 * 
 * Bidirectional conversion between CONNEXTED LABS market_offerings
 * and Schema.org Product structured data format.
 * 
 * Use cases:
 * - SEO: Generate JSON-LD for offering pages
 * - Import: Parse Schema.org data into database
 * - Export: Convert offerings to portable format
 * - Integration: Exchange data with external systems
 */

// ================================================================
// TYPES
// ================================================================

/**
 * Standard Schema.org Product structure
 * Based on: https://schema.org/Product
 */
export interface SchemaOrgProduct {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string | string[];
  url?: string;
  
  // Identifiers
  sku?: string;
  gtin?: string;
  mpn?: string;
  productID?: string;
  
  // Brand/Organization
  brand?: {
    '@type': 'Brand' | 'Organization';
    name: string;
    url?: string;
    logo?: string;
  };
  
  // Offers (Pricing & Availability)
  offers?: SchemaOrgOffer | SchemaOrgOffer[];
  
  // Categories & Classification
  category?: string;
  audience?: {
    '@type': 'Audience' | 'PeopleAudience';
    audienceType?: string;
  };
  
  // Additional Details
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
  
  review?: Array<{
    '@type': 'Review';
    author: string;
    reviewRating: {
      '@type': 'Rating';
      ratingValue: number;
    };
    reviewBody: string;
  }>;
  
  // Educational/Course specific (for programs)
  courseMode?: string;
  timeRequired?: string;
  
  // Custom extensions (using additionalProperty)
  additionalProperty?: Array<{
    '@type': 'PropertyValue';
    name: string;
    value: any;
  }>;
}

export interface SchemaOrgOffer {
  '@type': 'Offer';
  price: string | number;
  priceCurrency: string;
  availability: string; // https://schema.org/InStock, etc.
  url?: string;
  validFrom?: string;
  validThrough?: string;
  priceValidUntil?: string;
  
  // Payment options
  acceptedPaymentMethod?: string;
  
  // Seller
  seller?: {
    '@type': 'Organization' | 'Person';
    name: string;
  };
}

/**
 * Our internal offering type (subset of what's in DB)
 */
export interface MarketOffering {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  long_description?: string;
  featured_image_url?: string;
  additional_images?: string[];
  
  // Pricing
  price?: number;
  price_display?: string;
  purchase_type?: 'kit_commerce' | 'custom_link' | 'contact_only';
  kit_product_id?: string;
  purchase_link?: string;
  
  // Classification
  category?: string;
  target_audience?: string[];
  tags?: string[];
  
  // Program Integration
  linked_program_id?: string;
  enrollment_behavior?: string;
  marketing_level?: string;
  
  // Company/Brand
  company_id?: string;
  company_name?: string;
  
  // Status
  is_active?: boolean;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  metadata?: any;
}

// ================================================================
// CONVERSION: DB → SCHEMA.ORG
// ================================================================

/**
 * Convert market offering to Schema.org Product format
 */
export function offeringToSchemaOrg(
  offering: MarketOffering,
  options: {
    baseUrl?: string;
    includeCustomFields?: boolean;
    additionalData?: {
      brandUrl?: string;
      brandLogo?: string;
      ratings?: { average: number; count: number };
      reviews?: any[];
    };
  } = {}
): SchemaOrgProduct {
  const { baseUrl = '', includeCustomFields = true, additionalData = {} } = options;
  
  // Build product URL
  const productUrl = baseUrl 
    ? `${baseUrl}/market/${offering.slug}`
    : undefined;
  
  // Base product structure
  const product: SchemaOrgProduct = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: offering.name,
  };
  
  // Description (prefer long, fallback to short)
  if (offering.long_description) {
    product.description = offering.long_description;
  } else if (offering.description || offering.tagline) {
    product.description = offering.description || offering.tagline;
  }
  
  // Images
  if (offering.featured_image_url) {
    const images = [offering.featured_image_url];
    if (offering.additional_images) {
      images.push(...offering.additional_images);
    }
    product.image = images.length === 1 ? images[0] : images;
  }
  
  // URL
  if (productUrl) {
    product.url = productUrl;
  }
  
  // Identifiers
  product.sku = offering.slug;
  product.productID = offering.id;
  if (offering.kit_product_id) {
    product.gtin = offering.kit_product_id; // Use kit_product_id as GTIN
  }
  
  // Brand/Company
  if (offering.company_name) {
    product.brand = {
      '@type': 'Organization',
      name: offering.company_name,
      url: additionalData.brandUrl,
      logo: additionalData.brandLogo,
    };
  }
  
  // Offer (Pricing)
  if (offering.price !== undefined && offering.price !== null) {
    const availability = offering.is_active
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
    
    product.offers = {
      '@type': 'Offer',
      price: offering.price,
      priceCurrency: 'USD',
      availability,
      url: offering.purchase_link || productUrl,
    };
    
    // Add payment method if Kit Commerce
    if (offering.purchase_type === 'kit_commerce') {
      (product.offers as SchemaOrgOffer).acceptedPaymentMethod = 'http://purl.org/goodrelations/v1#PaymentMethodCreditCard';
    }
    
    // Seller
    if (offering.company_name) {
      (product.offers as SchemaOrgOffer).seller = {
        '@type': 'Organization',
        name: offering.company_name,
      };
    }
  } else if (offering.price_display) {
    // Handle custom pricing display
    product.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/PreOrder',
      url: offering.purchase_link || productUrl,
    };
  }
  
  // Category
  if (offering.category) {
    product.category = offering.category;
  }
  
  // Audience
  if (offering.target_audience && offering.target_audience.length > 0) {
    product.audience = {
      '@type': 'PeopleAudience',
      audienceType: offering.target_audience.join(', '),
    };
  }
  
  // Ratings (if provided)
  if (additionalData.ratings) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: additionalData.ratings.average,
      reviewCount: additionalData.ratings.count,
    };
  }
  
  // Reviews (if provided)
  if (additionalData.reviews && additionalData.reviews.length > 0) {
    product.review = additionalData.reviews.map(r => ({
      '@type': 'Review' as const,
      author: r.author,
      reviewRating: {
        '@type': 'Rating' as const,
        ratingValue: r.rating,
      },
      reviewBody: r.body,
    }));
  }
  
  // Custom fields as additionalProperty
  if (includeCustomFields) {
    const additionalProps: Array<{ '@type': 'PropertyValue'; name: string; value: any }> = [];
    
    if (offering.linked_program_id) {
      additionalProps.push({
        '@type': 'PropertyValue',
        name: 'linkedProgramId',
        value: offering.linked_program_id,
      });
    }
    
    if (offering.enrollment_behavior) {
      additionalProps.push({
        '@type': 'PropertyValue',
        name: 'enrollmentBehavior',
        value: offering.enrollment_behavior,
      });
    }
    
    if (offering.marketing_level) {
      additionalProps.push({
        '@type': 'PropertyValue',
        name: 'marketingLevel',
        value: offering.marketing_level,
      });
    }
    
    if (offering.tags && offering.tags.length > 0) {
      additionalProps.push({
        '@type': 'PropertyValue',
        name: 'tags',
        value: offering.tags.join(', '),
      });
    }
    
    if (offering.metadata) {
      Object.entries(offering.metadata).forEach(([key, value]) => {
        additionalProps.push({
          '@type': 'PropertyValue',
          name: key,
          value: value,
        });
      });
    }
    
    if (additionalProps.length > 0) {
      product.additionalProperty = additionalProps;
    }
  }
  
  return product;
}

// ================================================================
// CONVERSION: SCHEMA.ORG → DB
// ================================================================

/**
 * Convert Schema.org Product to market offering format
 */
export function schemaOrgToOffering(
  product: SchemaOrgProduct,
  options: {
    preserveIds?: boolean;
    defaultCompanyId?: string;
  } = {}
): Partial<MarketOffering> {
  const { preserveIds = false, defaultCompanyId } = options;
  
  const offering: Partial<MarketOffering> = {
    name: product.name,
  };
  
  // Description
  if (product.description) {
    offering.long_description = product.description;
    // Extract tagline from first sentence if possible
    const firstSentence = product.description.split('.')[0];
    if (firstSentence.length < 150) {
      offering.tagline = firstSentence;
    }
  }
  
  // Images
  if (product.image) {
    if (typeof product.image === 'string') {
      offering.featured_image_url = product.image;
    } else if (Array.isArray(product.image)) {
      offering.featured_image_url = product.image[0];
      if (product.image.length > 1) {
        offering.additional_images = product.image.slice(1);
      }
    }
  }
  
  // Identifiers
  if (product.sku) {
    offering.slug = product.sku;
  }
  if (preserveIds && product.productID) {
    offering.id = product.productID;
  }
  if (product.gtin) {
    offering.kit_product_id = product.gtin;
  }
  
  // Brand/Company
  if (product.brand) {
    offering.company_name = product.brand.name;
    if (defaultCompanyId) {
      offering.company_id = defaultCompanyId;
    }
  }
  
  // Offer (Pricing)
  if (product.offers) {
    const offer = Array.isArray(product.offers) 
      ? product.offers[0] 
      : product.offers;
    
    if (offer) {
      // Parse price
      const price = typeof offer.price === 'string' 
        ? parseFloat(offer.price) 
        : offer.price;
      
      if (price > 0) {
        offering.price = price;
        offering.price_display = `$${price}`;
      }
      
      // Purchase link
      if (offer.url) {
        offering.purchase_link = offer.url;
      }
      
      // Determine purchase type
      if (offering.kit_product_id) {
        offering.purchase_type = 'kit_commerce';
      } else if (offer.url) {
        offering.purchase_type = 'custom_link';
      } else {
        offering.purchase_type = 'contact_only';
      }
      
      // Status from availability
      if (offer.availability) {
        offering.is_active = offer.availability.includes('InStock');
      }
    }
  }
  
  // Category
  if (product.category) {
    offering.category = product.category;
  }
  
  // Audience
  if (product.audience && product.audience.audienceType) {
    offering.target_audience = product.audience.audienceType
      .split(',')
      .map(a => a.trim());
  }
  
  // Parse custom fields from additionalProperty
  if (product.additionalProperty) {
    const customData: any = {};
    
    product.additionalProperty.forEach(prop => {
      switch (prop.name) {
        case 'linkedProgramId':
          offering.linked_program_id = prop.value;
          break;
        case 'enrollmentBehavior':
          offering.enrollment_behavior = prop.value;
          break;
        case 'marketingLevel':
          offering.marketing_level = prop.value;
          break;
        case 'tags':
          offering.tags = typeof prop.value === 'string'
            ? prop.value.split(',').map(t => t.trim())
            : prop.value;
          break;
        default:
          customData[prop.name] = prop.value;
      }
    });
    
    if (Object.keys(customData).length > 0) {
      offering.metadata = customData;
    }
  }
  
  return offering;
}

// ================================================================
// BULK OPERATIONS
// ================================================================

/**
 * Convert multiple offerings to Schema.org format
 */
export function offeringsToSchemaOrg(
  offerings: MarketOffering[],
  options?: Parameters<typeof offeringToSchemaOrg>[1]
): SchemaOrgProduct[] {
  return offerings.map(o => offeringToSchemaOrg(o, options));
}

/**
 * Convert multiple Schema.org products to offerings
 */
export function schemaOrgToOfferings(
  products: SchemaOrgProduct[],
  options?: Parameters<typeof schemaOrgToOffering>[1]
): Partial<MarketOffering>[] {
  return products.map(p => schemaOrgToOffering(p, options));
}

// ================================================================
// JSON-LD GENERATION
// ================================================================

/**
 * Generate JSON-LD script tag for embedding in HTML
 */
export function generateJsonLd(product: SchemaOrgProduct): string {
  return JSON.stringify(product, null, 2);
}

/**
 * Generate JSON-LD script tag HTML
 */
export function generateJsonLdScriptTag(product: SchemaOrgProduct): string {
  return `<script type="application/ld+json">\n${generateJsonLd(product)}\n</script>`;
}

// ================================================================
// VALIDATION
// ================================================================

/**
 * Validate Schema.org product structure
 */
export function validateSchemaOrgProduct(product: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!product['@context']) {
    errors.push('Missing @context (should be "https://schema.org")');
  }
  if (!product['@type']) {
    errors.push('Missing @type (should be "Product")');
  }
  if (!product.name) {
    errors.push('Missing required field: name');
  }
  
  // Recommended fields
  if (!product.description) {
    warnings.push('Missing recommended field: description');
  }
  if (!product.image) {
    warnings.push('Missing recommended field: image');
  }
  if (!product.offers) {
    warnings.push('Missing recommended field: offers (pricing)');
  }
  
  // Validate offers structure
  if (product.offers) {
    const offers = Array.isArray(product.offers) 
      ? product.offers 
      : [product.offers];
    
    offers.forEach((offer, i) => {
      if (!offer['@type']) {
        errors.push(`Offer ${i}: Missing @type`);
      }
      if (offer.price === undefined) {
        errors.push(`Offer ${i}: Missing price`);
      }
      if (!offer.priceCurrency) {
        warnings.push(`Offer ${i}: Missing priceCurrency (recommended: USD, EUR, etc.)`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ================================================================
// EXPORT FORMATS
// ================================================================

/**
 * Export offerings as JSON-LD file
 */
export function exportAsJsonLd(offerings: MarketOffering[], options?: any): string {
  const products = offeringsToSchemaOrg(offerings, options);
  
  if (products.length === 1) {
    return generateJsonLd(products[0]);
  }
  
  // Multiple products as ItemList
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: product,
    })),
  }, null, 2);
}

/**
 * Export offerings as CSV
 */
export function exportAsCsv(offerings: MarketOffering[]): string {
  const headers = [
    'SKU',
    'Name',
    'Description',
    'Price',
    'Currency',
    'Image URL',
    'Category',
    'Brand',
    'Availability',
    'Product URL',
  ];
  
  const rows = offerings.map(o => [
    o.slug || '',
    o.name || '',
    o.description || o.tagline || '',
    o.price?.toString() || '',
    'USD',
    o.featured_image_url || '',
    o.category || '',
    o.company_name || '',
    o.is_active ? 'InStock' : 'OutOfStock',
    o.purchase_link || '',
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

// ================================================================
// IMPORT PARSING
// ================================================================

/**
 * Parse JSON-LD import
 */
export function parseJsonLdImport(jsonString: string): SchemaOrgProduct[] {
  const data = JSON.parse(jsonString);
  
  // Single product
  if (data['@type'] === 'Product') {
    return [data as SchemaOrgProduct];
  }
  
  // ItemList
  if (data['@type'] === 'ItemList' && data.itemListElement) {
    return data.itemListElement.map((item: any) => item.item as SchemaOrgProduct);
  }
  
  // Array of products
  if (Array.isArray(data)) {
    return data as SchemaOrgProduct[];
  }
  
  throw new Error('Invalid JSON-LD format');
}

/**
 * Parse CSV import (basic implementation)
 */
export function parseCsvImport(csvString: string): Partial<MarketOffering>[] {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const offering: Partial<MarketOffering> = {};
    
    headers.forEach((header, i) => {
      const value = values[i];
      if (!value) return;
      
      switch (header.toLowerCase()) {
        case 'sku':
          offering.slug = value;
          break;
        case 'name':
          offering.name = value;
          break;
        case 'description':
          offering.description = value;
          break;
        case 'price':
          offering.price = parseFloat(value);
          break;
        case 'image url':
          offering.featured_image_url = value;
          break;
        case 'category':
          offering.category = value;
          break;
        case 'brand':
          offering.company_name = value;
          break;
        case 'availability':
          offering.is_active = value.toLowerCase().includes('instock');
          break;
        case 'product url':
          offering.purchase_link = value;
          break;
      }
    });
    
    return offering;
  });
}
