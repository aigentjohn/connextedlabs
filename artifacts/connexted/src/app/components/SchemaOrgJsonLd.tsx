/**
 * Schema.org JSON-LD Component
 * 
 * Renders Schema.org structured data as JSON-LD in the page head
 * for SEO and rich search results.
 * 
 * Usage:
 * <SchemaOrgJsonLd offering={offering} />
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { offeringToSchemaOrg, type MarketOffering } from '@/utils/schema-org';

interface SchemaOrgJsonLdProps {
  offering: MarketOffering;
  baseUrl?: string;
  additionalData?: {
    brandUrl?: string;
    brandLogo?: string;
    ratings?: {
      average: number;
      count: number;
    };
    reviews?: Array<{
      author: string;
      rating: number;
      body: string;
    }>;
  };
}

export function SchemaOrgJsonLd({ 
  offering, 
  baseUrl,
  additionalData 
}: SchemaOrgJsonLdProps) {
  // Convert offering to Schema.org format
  const schemaOrg = offeringToSchemaOrg(offering, {
    baseUrl: baseUrl || window.location.origin,
    includeCustomFields: false, // Don't expose internal fields for SEO
    additionalData,
  });
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaOrg, null, 2)}
      </script>
    </Helmet>
  );
}

// ================================================================
// BREADCRUMB SCHEMA
// ================================================================

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

// ================================================================
// ORGANIZATION SCHEMA
// ================================================================

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactPoint?: {
    telephone?: string;
    email?: string;
    contactType?: string;
  };
  sameAs?: string[]; // Social media URLs
}

export function OrganizationJsonLd({
  name,
  url,
  logo,
  description,
  contactPoint,
  sameAs,
}: OrganizationJsonLdProps) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  };
  
  if (logo) {
    schema.logo = logo;
  }
  
  if (description) {
    schema.description = description;
  }
  
  if (contactPoint) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...contactPoint,
    };
  }
  
  if (sameAs && sameAs.length > 0) {
    schema.sameAs = sameAs;
  }
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

// ================================================================
// COURSE SCHEMA (for program offerings)
// ================================================================

interface CourseJsonLdProps {
  name: string;
  description: string;
  provider: {
    name: string;
    url?: string;
  };
  url?: string;
  image?: string;
  offers?: {
    price: number;
    currency: string;
    url?: string;
  };
  hasCourseInstance?: Array<{
    courseMode: string; // "online", "onsite", "blended"
    startDate?: string;
    endDate?: string;
    instructor?: {
      name: string;
    };
  }>;
}

export function CourseJsonLd({
  name,
  description,
  provider,
  url,
  image,
  offers,
  hasCourseInstance,
}: CourseJsonLdProps) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: provider.name,
      url: provider.url,
    },
  };
  
  if (url) {
    schema.url = url;
  }
  
  if (image) {
    schema.image = image;
  }
  
  if (offers) {
    schema.offers = {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.currency,
      url: offers.url,
    };
  }
  
  if (hasCourseInstance && hasCourseInstance.length > 0) {
    schema.hasCourseInstance = hasCourseInstance.map(instance => ({
      '@type': 'CourseInstance',
      courseMode: instance.courseMode,
      startDate: instance.startDate,
      endDate: instance.endDate,
      instructor: instance.instructor ? {
        '@type': 'Person',
        name: instance.instructor.name,
      } : undefined,
    }));
  }
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

// ================================================================
// ITEMLIST SCHEMA (for market browse pages)
// ================================================================

interface ItemListJsonLdProps {
  items: Array<{
    name: string;
    url: string;
    image?: string;
  }>;
  title?: string;
}

export function ItemListJsonLd({ items, title }: ItemListJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(title && { name: title }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: item.url,
        ...(item.image && { image: item.image }),
      },
    })),
  };
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema, null, 2)}
      </script>
    </Helmet>
  );
}

// ================================================================
// COMPOSITE: Offering Page (Product + Breadcrumbs)
// ================================================================

interface OfferingPageSchemaProps {
  offering: MarketOffering;
  breadcrumbs?: BreadcrumbItem[];
  additionalData?: SchemaOrgJsonLdProps['additionalData'];
}

export function OfferingPageSchema({
  offering,
  breadcrumbs,
  additionalData,
}: OfferingPageSchemaProps) {
  return (
    <>
      <SchemaOrgJsonLd 
        offering={offering} 
        additionalData={additionalData}
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbJsonLd items={breadcrumbs} />
      )}
    </>
  );
}
