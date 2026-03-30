/**
 * SEO Component - Dynamic Meta Tags for React App
 * 
 * PURPOSE:
 * - Sets page-specific <title>, meta description, and Open Graph tags
 * - Enables rich social sharing
 * - Improves Google search visibility
 * - Uses react-helmet-async for SSR compatibility
 * 
 * USAGE:
 * <SEO 
 *   title="Course Title - CONNEXTED LABS"
 *   description="Learn XYZ in this comprehensive course..."
 *   image="https://connexted.app/course-image.jpg"
 *   type="article"
 * />
 */

import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  schema?: object; // Structured data (schema.org)
}

const DEFAULT_SEO = {
  title: 'CONNEXTED LABS - Community for Innovators, Entrepreneurs & Job Seekers',
  description: 'Join the premier learning community for innovators and entrepreneurs. Access courses, cohort programs, and connect with thousands of professionals building the future.',
  image: 'https://connexted.app/og-image.jpg',
  url: 'https://connexted.app',
  type: 'website' as const,
  siteName: 'CONNEXTED LABS'
};

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  tags,
  canonicalUrl,
  noindex = false,
  schema
}: SEOProps) {
  // Build full title with site name
  const fullTitle = title || DEFAULT_SEO.title;
  const finalTitle = title && !title.includes('CONNEXTED') 
    ? `${title} - CONNEXTED LABS` 
    : fullTitle;

  // Use defaults if not provided
  const finalDescription = description || DEFAULT_SEO.description;
  const finalImage = image || DEFAULT_SEO.image;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : DEFAULT_SEO.url);
  const finalCanonical = canonicalUrl || finalUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content={DEFAULT_SEO.siteName} />
      
      {/* Article-specific tags */}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && tags && tags.length > 0 && 
        tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))
      }
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      
      {/* Keywords (if tags provided) */}
      {tags && tags.length > 0 && (
        <meta name="keywords" content={tags.join(', ')} />
      )}
      
      {/* Structured Data (Schema.org) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}

// ============================================================================
// HELPER: Generate Schema for Courses
// ============================================================================

export function generateCourseSchema(course: {
  title: string;
  description: string;
  instructor: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": "CONNEXTED LABS",
      "sameAs": "https://connexted.app"
    },
    "instructor": {
      "@type": "Person",
      "name": course.instructor
    },
    "offers": {
      "@type": "Offer",
      "price": course.price,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    ...(course.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": course.rating,
        "reviewCount": course.reviewCount || 0
      }
    }),
    ...(course.imageUrl && { "image": course.imageUrl }),
    "url": course.url
  };
}

// ============================================================================
// HELPER: Generate Schema for Programs
// ============================================================================

export function generateProgramSchema(program: {
  title: string;
  description: string;
  price: number;
  startDate?: string;
  duration?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    "name": program.title,
    "description": program.description,
    "provider": {
      "@type": "Organization",
      "name": "CONNEXTED LABS",
      "sameAs": "https://connexted.app"
    },
    "offers": {
      "@type": "Offer",
      "price": program.price,
      "priceCurrency": "USD"
    },
    ...(program.startDate && { "startDate": program.startDate }),
    ...(program.duration && { "timeToComplete": program.duration }),
    "url": program.url
  };
}

// ============================================================================
// HELPER: Generate Schema for Organization
// ============================================================================

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "CONNEXTED LABS",
    "description": "Premier learning community for innovators, entrepreneurs, and job seekers",
    "url": "https://connexted.app",
    "logo": "https://connexted.app/logo.png",
    "sameAs": [
      "https://twitter.com/connexted",
      "https://linkedin.com/company/connexted"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "support@connexted.app"
    }
  };
}
