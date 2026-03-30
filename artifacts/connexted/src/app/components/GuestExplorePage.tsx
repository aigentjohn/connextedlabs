import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  ArrowRight, 
  Search, 
  Calendar,
  MapPin,
  Globe,
  Lock,
  TrendingUp
} from 'lucide-react';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';

interface PublicCircle {
  id: string;
  name: string;
  description: string;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  tags?: string[];
  lifecycle_state?: string;
}

interface PublicProgram {
  id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  enrollment_status: 'open' | 'closed' | 'waitlist';
}

export default function GuestExplorePage() {
  const [circles, setCircles] = useState<PublicCircle[]>([]);
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicContent();
  }, []);

  const fetchPublicContent = async () => {
    setLoading(true);
    try {
      // Fetch public circles (open access only)
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name, description, image, access_type, member_ids, tags')
        .eq('access_type', 'open')
        .order('name')
        .limit(12);

      // Fetch open programs
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name, slug, description, start_date, end_date, enrollment_status')
        .eq('enrollment_status', 'open')
        .order('start_date', { ascending: true, nullsFirst: false })
        .limit(6);

      setCircles(circlesData || []);
      setPrograms(programsData || []);
    } catch (error) {
      console.error('Error fetching public content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCircles = circles.filter((circle) => {
    const query = searchQuery.toLowerCase();
    return (
      circle.name.toLowerCase().includes(query) ||
      circle.description.toLowerCase().includes(query) ||
      circle.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <PublicHeader />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Browsing as Guest</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Explore Connexted
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Discover circles and programs where innovators, entrepreneurs, and professionals connect and grow.
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search circles by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>
        </div>

        {/* Public Circles Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Public Circles</h2>
            <Badge variant="secondary">{filteredCircles.length} available</Badge>
          </div>

          {filteredCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No public circles found</p>
                <p className="text-sm text-gray-400 mt-2">Try a different search or create an account to see more</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCircles.map((circle) => (
                <Card key={circle.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-cyan-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Open
                      </Badge>
                    </div>
                    <CardTitle>{circle.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{circle.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{circle.member_ids.length} members</span>
                      </div>
                      
                      {circle.tags && circle.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {circle.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {circle.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{circle.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <Link to={`/circles/${circle.id}/landing`}>
                        <Button variant="outline" className="w-full">
                          Learn More
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Open Programs Section */}
        {programs.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Open Programs</h2>
              <Badge variant="secondary">{programs.length} enrolling now</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {programs.map((program) => (
                <Card key={program.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <Badge className="bg-green-600">Enrolling</Badge>
                    </div>
                    <CardTitle>{program.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {program.start_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Starts {new Date(program.start_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      <Link to={`/programs/${program.slug}/landing`}>
                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700">
                          View Program
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-indigo-600 to-cyan-600 border-0 text-white">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Join?
            </h3>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              Create a free account to join circles, participate in discussions, and unlock all features
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-gray-100"
                onClick={() => window.location.href = '/register'}
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
                onClick={() => window.location.href = '/login'}
              >
                I Have an Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}