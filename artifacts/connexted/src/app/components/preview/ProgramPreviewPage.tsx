import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/app/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle, ArrowRight, Lock, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface Program {
  id: string;
  name: string;
  description: string;
  slug: string;
  status: 'not-started' | 'in-progress' | 'completed';
  circle_id: string | null;
}

interface Journey {
  id: string;
  title: string;
  description: string;
  order_index: number;
  status: string;
}

interface ProgramStats {
  memberCount: number;
  journeyCount: number;
  containerCount: number;
}

export default function ProgramPreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [stats, setStats] = useState<ProgramStats>({ memberCount: 0, journeyCount: 0, containerCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchPreviewData = async () => {
      try {
        // Fetch program data
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('id, name, description, slug, status, circle_id')
          .eq('slug', slug)
          .single();

        if (programError) throw programError;
        setProgram(programData);

        // Fetch journeys
        const { data: journeysData, error: journeysError } = await supabase
          .from('program_journeys')
          .select('id, title, description, order_index, status')
          .eq('program_id', programData.id)
          .order('order_index');

        if (journeysError) throw journeysError;
        setJourneys(journeysData || []);

        // Fetch program stats
        const { count: memberCount } = await supabase
          .from('program_members')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', programData.id);

        // Count total containers
        let totalContainers = 0;
        for (const journey of journeysData || []) {
          const { count } = await supabase
            .from('journey_containers')
            .select('*', { count: 'exact', head: true })
            .eq('journey_id', journey.id);
          totalContainers += count || 0;
        }

        setStats({
          memberCount: memberCount || 0,
          journeyCount: journeysData?.length || 0,
          containerCount: totalContainers,
        });
      } catch (error) {
        console.error('Error fetching preview data:', error);
        toast.error('Failed to load program preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading preview...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Program Not Found</h2>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

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
            <Badge variant="secondary" className="mb-4">
              Program
            </Badge>
            <h1 className="text-5xl font-bold mb-6">{program.name}</h1>
            <p className="text-xl text-gray-700 mb-8">{program.description}</p>
            
            <div className="flex items-center gap-6 mb-8 text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">{stats.memberCount} {stats.memberCount === 1 ? 'participant' : 'participants'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <span className="font-medium">{stats.journeyCount} {stats.journeyCount === 1 ? 'journey' : 'journeys'}</span>
              </div>
              <Badge variant={program.status === 'in-progress' ? 'default' : 'secondary'}>
                {program.status === 'not-started' ? 'Starting Soon' : program.status === 'in-progress' ? 'Active' : 'Completed'}
              </Badge>
            </div>

            <Button size="lg" className="gap-2" onClick={() => navigate('/login')}>
              Enroll in Program
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-6">Program Journey</h2>
              
              {journeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Journey details coming soon</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {journeys.map((journey, index) => (
                    <Card key={journey.id}>
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{journey.title}</CardTitle>
                            {journey.description && (
                              <p className="text-sm text-gray-600 mt-2">{journey.description}</p>
                            )}
                          </div>
                          <CheckCircle className="w-5 h-5 text-gray-300" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}

                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white flex items-end justify-center pb-8 backdrop-blur-sm -mt-20 pt-20">
                      <Button onClick={() => navigate('/login')} className="gap-2">
                        <Lock className="w-4 h-4" />
                        Enroll to access full journey
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-4">What You'll Experience</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Structured learning path with {stats.journeyCount} guided {stats.journeyCount === 1 ? 'journey' : 'journeys'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Access to {stats.containerCount} specialized {stats.containerCount === 1 ? 'workspace' : 'workspaces'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Connect with {stats.memberCount} fellow {stats.memberCount === 1 ? 'participant' : 'participants'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-indigo-600 text-white rounded-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-3">Ready to Begin?</h3>
              <p className="mb-4 opacity-90">
                Join {stats.memberCount} {stats.memberCount === 1 ? 'participant' : 'participants'} on this journey.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>{stats.journeyCount} Structured {stats.journeyCount === 1 ? 'Journey' : 'Journeys'}</span>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-white text-indigo-600 hover:bg-gray-100"
              >
                Enroll Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Journey</h2>
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