import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, PenTool, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { BlogCard } from '@/app/components/blogs/BlogCard';

// Reuse interface from BlogCard
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
  view_count: number;
  click_count: number;
  created_at: string;
  user?: {
    name: string;
    avatar: string | null;
  };
  topics?: Topic[];
}

export default function BlogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('blogs')
        .select(`
          *,
          user:users!blogs_user_id_fkey(name, avatar)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle case where table might not exist or other errors
        if (error.code === '42P01') {
           console.log('Blogs table not found');
           setBlogs([]);
           return;
        }
        throw error;
      }

      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.blog_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Blogs', href: '/blogs' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 text-pink-600 p-3 rounded-lg">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Blogs</h1>
            <p className="text-sm text-gray-600">Discover and read curated articles</p>
          </div>
        </div>
        
        {/* Placeholder for Create/Add Button if we had the form ready */}
        <Button onClick={() => navigate('/blogs/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Share Article
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="search"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Blogs Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading articles...</div>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenTool className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to share an article!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
}