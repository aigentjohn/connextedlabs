/**
 * Sitemap Generator API
 * 
 * PURPOSE:
 * - Generates XML sitemap for Google/Bing
 * - Lists all public URLs (courses, programs, blog posts, etc.)
 * - Updates dynamically based on database content
 * 
 * USAGE:
 * - Access at: https://connexted.app/api/sitemap
 * - Returns XML sitemap
 * - Submit to Google Search Console
 * 
 * CRON (Optional):
 * - Regenerate daily to keep fresh
 * - Or regenerate when content changes
 */

import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const baseUrl = 'https://connexted.app';
    
    // ====================================================================
    // FETCH PUBLIC CONTENT
    // ====================================================================

    // 1. Fetch published courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
    }

    // 2. Fetch published programs (if you have them)
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (programsError) {
      console.error('Error fetching programs:', programsError);
    }

    // 3. Fetch blog posts (if you have them)
    // const { data: posts } = await supabase
    //   .from('blog_posts')
    //   .select('slug, updated_at')
    //   .eq('published', true);

    // ====================================================================
    // BUILD SITEMAP XML
    // ====================================================================

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages (high priority, high frequency)
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/courses', priority: '0.9', changefreq: 'daily' },
      { url: '/programs', priority: '0.9', changefreq: 'daily' },
      { url: '/pricing', priority: '0.8', changefreq: 'weekly' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`;
    });

    // Course pages (dynamic, high value)
    if (courses && courses.length > 0) {
      courses.forEach(course => {
        const lastmod = course.updated_at || new Date().toISOString();
        sitemap += `
  <url>
    <loc>${baseUrl}/courses/${course.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      });
    }

    // Program pages (dynamic, high value)
    if (programs && programs.length > 0) {
      programs.forEach(program => {
        const lastmod = program.updated_at || new Date().toISOString();
        sitemap += `
  <url>
    <loc>${baseUrl}/programs/${program.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      });
    }

    // Blog posts (if you have them)
    // if (posts && posts.length > 0) {
    //   posts.forEach(post => {
    //     sitemap += `
    //   <url>
    //     <loc>${baseUrl}/blog/${post.slug}</loc>
    //     <changefreq>monthly</changefreq>
    //     <priority>0.6</priority>
    //     <lastmod>${post.updated_at}</lastmod>
    //   </url>`;
    //   });
    // }

    sitemap += `
</urlset>`;

    // ====================================================================
    // RETURN XML RESPONSE
    // ====================================================================

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Sitemap generation failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// ============================================================================
// HELPER: Generate Image Sitemap (Optional)
// ============================================================================
// If you want to index course images for Google Images search

export async function generateImageSitemap() {
  // Fetch courses with images
  const { data: courses } = await supabase
    .from('courses')
    .select('slug, title, thumbnail_url')
    .eq('is_published', true)
    .not('thumbnail_url', 'is', null);

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  courses?.forEach(course => {
    sitemap += `
  <url>
    <loc>https://connexted.app/courses/${course.slug}</loc>
    <image:image>
      <image:loc>${course.thumbnail_url}</image:loc>
      <image:title>${course.title}</image:title>
    </image:image>
  </url>`;
  });

  sitemap += `
</urlset>`;

  return sitemap;
}
