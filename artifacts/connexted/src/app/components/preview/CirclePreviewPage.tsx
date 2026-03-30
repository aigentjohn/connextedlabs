import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, FileText, MessageSquare, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { isValidUUID } from '@/lib/uuid-utils';

interface Circle {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  community_id: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  users: {
    name: string;
    avatar_url: string | null;
  };
}

interface Community {
  name: string;
}

export default function CirclePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [samplePosts, setSamplePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !isValidUUID(id)) {
      setLoading(false);
      toast.error('Invalid circle ID');
      return;
    }

    const fetchPreviewData = async () => {
      try {
        // Fetch circle data
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('id, name, description, long_description, image, access_type, member_ids, community_id')
          .eq('id', id)
          .single();

        if (circleError) throw circleError;
        setCircle(circleData);

        // Fetch community data
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('name')
          .eq('id', circleData.community_id)
          .single();

        if (communityError) throw communityError;
        setCommunity(communityData);

        // Fetch sample posts (limit to 5 most recent)
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            author_id,
            users:author_id (name, avatar_url)
          `)
          .contains('circle_ids', [id])
          .order('created_at', { ascending: false })
          .limit(5);

        if (postsError) throw postsError;
        setSamplePosts(postsData || []);
      } catch (error) {
        console.error('Error fetching preview data:', error);
        toast.error('Failed to load circle preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading preview...</div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Circle Not Found</h2>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const memberCount = circle.member_ids.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              CONNEXTED LABS
            </Link>
            <Badge variant="outline">Preview</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button>Join Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl">
            {community && (
              <div className="mb-4">
                <Badge variant="secondary" className="mb-2">
                  {community.name}
                </Badge>
              </div>
            )}
            <h1 className="text-5xl font-bold mb-6">{circle.name}</h1>
            <p className="text-xl text-gray-700 mb-8">{circle.description}</p>
            
            <div className="flex items-center gap-6 mb-8 text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
              </div>
              <Badge variant={circle.access_type === 'open' ? 'default' : 'secondary'}>
                {circle.access_type === 'open' ? 'Open to Join' : circle.access_type === 'request' ? 'Request to Join' : 'Invite Only'}
              </Badge>
            </div>

            <Button size="lg" className="gap-2" onClick={() => navigate('/login')}>
              Join This Circle
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - About */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            {circle.long_description && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-2xl font-bold mb-4">About This Circle</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{circle.long_description}</p>
              </div>
            )}

            {/* Sample Posts */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <Badge variant="secondary">{samplePosts.length} posts</Badge>
              </div>

              {samplePosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No posts yet. Be the first to start a conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {samplePosts.map((post) => (
                    <div key={post.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          {post.users?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium">{post.users?.name || 'Member'}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700">{post.content}</p>
                    </div>
                  ))}
                  
                  {/* Blur overlay on last post */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white flex items-end justify-center pb-8 backdrop-blur-sm">
                      <Button onClick={() => navigate('/login')} className="gap-2">
                        <Lock className="w-4 h-4" />
                        Sign up to see more
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Features & CTA */}
          <div className="space-y-6">
            {/* Join CTA */}
            <div className="bg-indigo-600 text-white rounded-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-3">Ready to Join?</h3>
              <p className="mb-4 opacity-90">
                Connect with {memberCount} {memberCount === 1 ? 'member' : 'members'} and start participating in the conversation.
              </p>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-white text-indigo-600 hover:bg-gray-100"
              >
                Create Free Account
              </Button>
              <p className="text-sm text-center mt-3 opacity-75">
                Already a member? <Link to="/login" className="underline font-medium">Sign in</Link>
              </p>
            </div>

            {/* What You'll Get */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-bold mb-4">What You'll Get</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Group Feed</div>
                    <div className="text-sm text-gray-600">Share updates and engage</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Member Directory</div>
                    <div className="text-sm text-gray-600">Connect with others</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Resources</div>
                    <div className="text-sm text-gray-600">Access shared documents</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Events</div>
                    <div className="text-sm text-gray-600">Join meetups & activities</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join {circle.name} Today</h2>
          <p className="text-xl mb-8 opacity-90">
            Connect, learn, and grow with {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            size="lg" 
            className="bg-white text-indigo-600 hover:bg-gray-100"
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
}