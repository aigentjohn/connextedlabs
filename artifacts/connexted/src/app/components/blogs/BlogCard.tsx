import { Link } from 'react-router';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { ExternalLink, Calendar, Clock, Heart, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Topic {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
}

interface Blog {
  id: string;
  title: string;
  tagline: string;
  blog_summary: string;
  external_url: string;
  domain: string | null;
  published_date: string | null;
  reading_time_minutes: number | null;
  featured_image_url: string | null;
  created_at: string;
  likes_count?: number;
  avg_rating?: number;
  user?: {
    name: string;
    avatar: string | null;
  };
  topics?: Topic[];
}

interface BlogCardProps {
  blog: Blog;
  showAuthor?: boolean;
}

export function BlogCard({ blog, showAuthor = true }: BlogCardProps) {
  const summaryPreview = blog.blog_summary.length > 150 
    ? blog.blog_summary.substring(0, 150) + '...' 
    : blog.blog_summary;

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-6 space-y-4">
        {/* Topics */}
        {blog.topics && blog.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {blog.topics.slice(0, 3).map((topic) => (
              <Link key={topic.id} to={`/topics/${topic.slug}`}>
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer hover:shadow-sm transition-all"
                  style={{
                    borderColor: topic.color || '#9333ea',
                    color: topic.color || '#9333ea',
                  }}
                >
                  {topic.icon && <span className="mr-1">{topic.icon}</span>}
                  {topic.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Featured Image */}
        {blog.featured_image_url && (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title */}
        <Link to={`/blogs/${blog.id}`}>
          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {blog.title}
          </h3>
        </Link>

        {/* Tagline */}
        <p className="text-sm text-muted-foreground font-medium">
          {blog.tagline}
        </p>

        {/* Summary Preview */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {summaryPreview}
        </p>

        {/* Read More Button */}
        <Link to={`/blogs/${blog.id}`}>
          <button className="text-sm text-primary hover:underline font-medium">
            Read More →
          </button>
        </Link>

        {/* Divider */}
        <div className="border-t pt-4 mt-4" />

        {/* Metadata Footer */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {/* Author */}
          {showAuthor && blog.user && (
            <div className="flex items-center gap-2">
              {blog.user.avatar ? (
                <img
                  src={blog.user.avatar}
                  alt={blog.user.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                  {blog.user.name.charAt(0)}
                </div>
              )}
              <span className="font-medium">{blog.user.name}</span>
            </div>
          )}

          {/* Published Date */}
          {blog.published_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(blog.published_date), { addSuffix: true })}</span>
            </div>
          )}

          {/* Reading Time */}
          {blog.reading_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{blog.reading_time_minutes} min read</span>
            </div>
          )}
        </div>

        {/* Domain + engagement */}
        <div className="flex items-center justify-between">
          {blog.domain ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>{blog.domain}</span>
            </div>
          ) : <span />}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(blog.likes_count ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                <span>{blog.likes_count}</span>
              </div>
            )}
            {(blog.avg_rating ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{blog.avg_rating!.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
