import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, BookCopy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import MagazineCard from '@/app/components/magazines/MagazineCard';

// Reuse interface from MagazineCard
interface Topic {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface Magazine {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  cover_image_url?: string;
  curator_id: string;
  curator_name?: string;
  curator_avatar?: string;
  blog_count: number;
  subscriber_count: number;
  // TODO: update to use visibility field once normalize-magazines-visibility.sql migration has run
  is_public: boolean;
  curation_type: 'auto' | 'curated' | 'hybrid';
  publishing_frequency?: string;
  created_at: string;
  updated_at: string;
  topics?: Topic[];
  is_subscribed?: boolean;
}

export default function MagazinesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked' | 'most-subscribed'>('newest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMagazines();
  }, [profile]);

  const fetchMagazines = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('magazines')
        .select(`
          *
          // Join topics if possible, or fetch separately. Assuming simpler query for now.
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle case where table might not exist or other errors
        if (error.code === '42P01') {
           console.log('Magazines table not found');
           setMagazines([]);
           return;
        }
        throw error;
      }
      
      // Since we can't easily join deep relations in one simple query without exact schema knowledge,
      // we'll rely on what's returned.
      // We might need to fetch subscriptions status separately.
      
      let magazinesData = data || [];
      
      if (profile) {
        // Fetch subscriptions
        const { data: subs } = await supabase
          .from('magazine_subscriptions')
          .select('magazine_id')
          .eq('user_id', profile.id);
          
        const subscribedIds = new Set(subs?.map(s => s.magazine_id));
        
        magazinesData = magazinesData.map((m: any) => ({
          ...m,
          is_subscribed: subscribedIds.has(m.id)
        }));
      }

      setMagazines(magazinesData);

      // Fetch likes for all magazines
      if (magazinesData.length > 0) {
        const ids = magazinesData.map((m: any) => m.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'magazine')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        (likesData || []).forEach((like: { content_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
        });
        setLikeCountsMap(counts);
      }
    } catch (error) {
      console.error('Error fetching magazines:', error);
      toast.error('Failed to load magazines');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubscribe = async (magazineId: string) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('magazine_subscriptions')
        .insert({ user_id: profile.id, magazine_id: magazineId });
        
      if (error) throw error;
      
      setMagazines(prev => prev.map(m => 
        m.id === magazineId 
          ? { ...m, is_subscribed: true, subscriber_count: (m.subscriber_count || 0) + 1 } 
          : m
      ));
      
      toast.success('Subscribed to magazine');
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to subscribe');
    }
  };

  const handleUnsubscribe = async (magazineId: string) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('magazine_subscriptions')
        .delete()
        .eq('user_id', profile.id)
        .eq('magazine_id', magazineId);
        
      if (error) throw error;
      
      setMagazines(prev => prev.map(m => 
        m.id === magazineId 
          ? { ...m, is_subscribed: false, subscriber_count: Math.max(0, (m.subscriber_count || 0) - 1) } 
          : m
      ));
      
      toast.success('Unsubscribed from magazine');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  const filteredMagazines = magazines.filter(magazine =>
    magazine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    magazine.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    magazine.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedMagazines = [...filteredMagazines].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0);
    if (sortBy === 'most-subscribed') return (b.subscriber_count || 0) - (a.subscriber_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Magazines', href: '/magazines' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
            <BookCopy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Magazines</h1>
            <p className="text-sm text-gray-600">Curated collections of articles and resources</p>
          </div>
        </div>
        
        <Button onClick={() => navigate('/magazines/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Magazine
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="search"
          placeholder="Search magazines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Sort:</span>
        <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
        <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
        <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
        <Button variant={sortBy === 'most-subscribed' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-subscribed')}>Most Subscribed</Button>
      </div>

      {/* Magazines Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading magazines...</div>
        </div>
      ) : sortedMagazines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookCopy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No magazines found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to create a magazine!'}
            </p>
            <Button onClick={() => navigate('/magazines/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Magazine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedMagazines.map((magazine) => (
            <div key={magazine.id} className="h-full">
              <MagazineCard 
                magazine={magazine} 
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}