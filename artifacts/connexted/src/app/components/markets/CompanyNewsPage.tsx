import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import {
  Newspaper,
  Lock,
  Globe,
  Edit2,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  Settings,
  Clock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CompanyNewsData {
  id: string;
  company_id: string;
  name: string;
  description: string;
  is_public: boolean;
  allow_comments: boolean;
  allow_reactions: boolean;
  visibility_window: string;
  created_at: string;
  updated_at: string;
}

interface NewsPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  reactions: any;
}

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string | null;
  owner_user_id: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function CompanyNewsPage() {
  const { slug } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [companyNews, setCompanyNews] = useState<CompanyNewsData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [timeWindow, setTimeWindow] = useState<string>('all');

  const isOwner = currentUser?.id === company?.owner_user_id;

  useEffect(() => {
    if (slug) {
      fetchCompanyNewsData();
    }
  }, [slug]);

  const fetchCompanyNewsData = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('market_companies')
        .select('id, name, slug, tagline, logo_url, owner_user_id')
        .eq('slug', slug)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch owner data
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .eq('id', companyData.owner_user_id)
        .single();

      if (ownerError) throw ownerError;
      setOwner(ownerData);

      // Fetch company news container
      const { data: newsData, error: newsError } = await supabase
        .from('company_news')
        .select('*')
        .eq('company_id', companyData.id)
        .single();

      if (newsError) {
        // If no news container exists, create one
        const { data: newNewsData, error: createError } = await supabase
          .from('company_news')
          .insert({
            company_id: companyData.id,
            name: `${companyData.name} News`,
            description: `Company updates and news from ${companyData.name}`,
            is_public: true,
            allow_comments: true,
            allow_reactions: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        setCompanyNews(newNewsData);
        setPosts([]);
      } else {
        setCompanyNews(newsData);
        // Fetch posts
        await fetchPosts(newsData.id);
      }
    } catch (error) {
      console.error('Error fetching company news data:', error);
      toast.error('Failed to load company news');
      navigate('/markets');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (newsId: string) => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('company_news_id', newsId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || !companyNews || !currentUser) return;

    setIsPosting(true);
    try {
      // posts_belongs_to_one_feed: exactly one feed column must be non-null.
      // Array columns default to {} (non-null) so they must be explicitly nulled.
      const feedNulls = {
        circle_ids: null, table_ids: null, elevator_ids: null, standup_ids: null,
        meeting_ids: null, build_ids: null, pitch_ids: null, meetup_ids: null,
        playlist_ids: null, program_ids: null, blog_ids: null, magazine_ids: null,
      };
      const { data, error } = await supabase
        .from('posts')
        .insert({
          content: postContent.trim(),
          author_id: currentUser.id,
          company_news_id: companyNews.id,
          access_level: 'public',
          ...feedNulls,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setPostContent('');
      toast.success('Post created successfully');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, content: editContent.trim(), updated_at: new Date().toISOString() }
          : p
      ));
      setEditingPostId(null);
      setEditContent('');
      toast.success('Post updated successfully');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleReaction = async (postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const reactions = post.reactions || {};
      const likes = reactions.likes || [];
      const hasLiked = likes.includes(currentUser.id);

      const updatedLikes = hasLiked
        ? likes.filter((id: string) => id !== currentUser.id)
        : [...likes, currentUser.id];

      const { error } = await supabase
        .from('posts')
        .update({ reactions: { ...reactions, likes: updatedLikes } })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, likes: updatedLikes } }
          : p
      ));
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  // Filter posts by visibility window (owner's setting)
  const getFilteredPosts = () => {
    if (!companyNews) return posts;
    
    // Owner can see all posts regardless of visibility window
    if (isOwner) return posts;
    
    // For visitors, apply the visibility window setting
    const visibilityWindow = companyNews.visibility_window || 'all';
    if (visibilityWindow === 'all') return posts;
    
    const now = new Date();
    let cutoffDate: Date | null = null;

    switch (visibilityWindow) {
      case '3':
        cutoffDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return posts;
    }

    return posts.filter(post => new Date(post.created_at) >= cutoffDate!);
  };

  const filteredPosts = getFilteredPosts();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Loading company news...</p>
      </div>
    );
  }

  if (!company || !companyNews || !owner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Company news not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Markets', path: '/markets' },
          { label: 'Companies', path: '/markets/all-companies' },
          { label: company.name, path: `/markets/companies/${company.slug}` },
          { label: 'News' },
        ]}
      />

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                  {company.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-2xl">{company.name} News</CardTitle>
                </div>
                <p className="text-gray-600 mt-1">{company.tagline}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={owner.avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {owner.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">
                    By <span className="font-medium">{owner.name}</span>
                  </span>
                </div>
              </div>
            </div>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/markets/companies/${company.slug}/news/settings`)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              {companyNews.is_public ? (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Private</span>
                </>
              )}
            </div>
            {companyNews.allow_comments && (
              <Badge variant="secondary">Comments Enabled</Badge>
            )}
            {companyNews.allow_reactions && (
              <Badge variant="secondary">Reactions Enabled</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Post Section - Only for company owner */}
      {isOwner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Share an Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What's new with your company?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCreatePost}
                disabled={!postContent.trim() || isPosting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isPosting ? 'Posting...' : 'Post Update'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {/* Time Window Filter */}
        {posts.length > 0 && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {timeWindow === 'all' ? 'All Updates' : `Recent Updates`}
            </h2>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {posts.length === 0 ? 'No news updates yet' : 'No updates in this time period'}
              </p>
              {posts.length === 0 && isOwner && (
                <p className="text-sm text-gray-500 mt-2">
                  Be the first to share an update about your company!
                </p>
              )}
              {posts.length > 0 && filteredPosts.length === 0 && timeWindow !== 'all' && (
                <p className="text-sm text-gray-500 mt-2">
                  Try selecting a different time period
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => {
            const isPostOwner = currentUser?.id === post.author_id;
            const likes = post.reactions?.likes || [];
            const hasLiked = currentUser ? likes.includes(currentUser.id) : false;

            return (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  {editingPostId === post.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPostId(null);
                            setEditContent('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdatePost(post.id)}
                          disabled={!editContent.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={owner.avatar || undefined} />
                            <AvatarFallback>
                              {owner.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{owner.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                              })}
                              {post.updated_at !== post.created_at && ' (edited)'}
                            </p>
                          </div>
                        </div>
                        {isPostOwner && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditContent(post.content);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap mb-4">
                        {post.content}
                      </p>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-6">
                        {companyNews.allow_reactions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReaction(post.id)}
                            className={hasLiked ? 'text-red-600' : ''}
                          >
                            <Heart
                              className={`w-4 h-4 mr-2 ${hasLiked ? 'fill-current' : ''}`}
                            />
                            {likes.length > 0 && <span>{likes.length}</span>}
                          </Button>
                        )}
                        {companyNews.allow_comments && (
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Comment
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}