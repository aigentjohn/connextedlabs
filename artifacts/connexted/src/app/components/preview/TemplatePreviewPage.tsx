import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Users, ArrowRight, Package, MessageSquare, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  requires_passcode: boolean;
}

interface TemplateCircle {
  id: string;
  circle_name: string;
  circle_description: string;
  auto_join: boolean;
  post_count: number;
}

export default function TemplatePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [circles, setCircles] = useState<TemplateCircle[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPreviewData = async () => {
      try {
        // Fetch template data
        const { data: templateData, error: templateError } = await supabase
          .from('community_templates')
          .select('id, name, description, is_active, requires_passcode')
          .eq('id', id)
          .single();

        if (templateError) throw templateError;
        setTemplate(templateData);

        // Fetch template circles
        const { data: circlesData, error: circlesError } = await supabase
          .from('community_template_circles')
          .select('id, circle_name, circle_description, auto_join')
          .eq('template_id', id)
          .order('order_index');

        if (circlesError) throw circlesError;

        // Fetch post counts
        const circlesWithCounts = await Promise.all(
          (circlesData || []).map(async (circle) => {
            const { count } = await supabase
              .from('community_template_posts')
              .select('*', { count: 'exact', head: true })
              .eq('template_circle_id', circle.id);

            return {
              ...circle,
              post_count: count || 0,
            };
          })
        );

        setCircles(circlesWithCounts);
        setTotalPosts(circlesWithCounts.reduce((sum, c) => sum + c.post_count, 0));
      } catch (error) {
        console.error('Error fetching preview data:', error);
        toast.error('Failed to load template preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [id]);

  const handleJoinWithTemplate = () => {
    navigate(`/login?template=${id}${passcode ? `&passcode=${passcode}` : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading preview...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Template Not Found</h2>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const autoJoinCircles = circles.filter(c => c.auto_join);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              CONNEXTED LABS
            </Link>
            <Badge variant="outline">Template Preview</Badge>
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
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Package className="w-3 h-3 mr-1" />
              Starter Pack
            </Badge>
            <h1 className="text-5xl font-bold mb-6">{template.name}</h1>
            <p className="text-xl text-gray-700 mb-8">{template.description}</p>
            
            <div className="flex items-center gap-6 mb-8 text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">{autoJoinCircles.length} {autoJoinCircles.length === 1 ? 'circle' : 'circles'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">{totalPosts} {totalPosts === 1 ? 'post' : 'posts'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-4">What You'll Get Instantly</h2>
              <div className="space-y-4">
                {autoJoinCircles.map((circle) => (
                  <Card key={circle.id} className="border-2 border-indigo-100">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{circle.circle_name}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{circle.circle_description}</p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-3">Join with This Template</h3>
              
              {template.requires_passcode && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    <KeyRound className="w-4 h-4 inline mr-1" />
                    Access Code
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              )}

              <Button 
                onClick={handleJoinWithTemplate} 
                className="w-full bg-white text-indigo-600 hover:bg-gray-100"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Skip the Setup</h2>
          <Button 
            onClick={handleJoinWithTemplate} 
            size="lg" 
            className="bg-white text-emerald-600 hover:bg-gray-100"
          >
            Get Started with Template
          </Button>
        </div>
      </div>
    </div>
  );
}