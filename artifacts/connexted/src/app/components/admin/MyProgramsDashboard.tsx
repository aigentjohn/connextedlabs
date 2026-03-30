// Split candidate: ~548 lines — consider extracting ProgramSummaryCard, ProgramActionsMenu, and ProgramFilterBar into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { FolderKanban, TrendingUp, Users, Calendar, UserPlus, Mail, Link2, Settings, Eye, Plus, Filter, ChevronDown, ChevronRight, CalendarCheck, Database, Store } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import ProgramOfferingCard from '@/app/components/program/ProgramOfferingCard';
import ProgramTemplateManager from '@/app/components/admin/ProgramTemplateManager';

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string;
  template_id: string;
  cover_image: string;
  visibility: string;
  admin_ids: string[];
  member_ids: string[];
  status: string;
  created_at: string;
}

interface Journey {
  id: string;
  program_id: string;
  name: string;
  description: string;
  order_index: number;
  circle_id: string;
  container_ids: string[];
  container_types: string[];
  status: string;
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  admin_ids: string[];
  member_ids: string[];
  access_type: string;
  is_open_circle: boolean;
  created_at: string;
}

export default function MyProgramsDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<{ [key: string]: boolean }>({});
  const [circleFilter, setCircleFilter] = useState<'all' | 'standalone' | 'program'>('all');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const isPlatformAdmin = profile.role === 'super';

      // Fetch programs where user is admin
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;

      const filteredPrograms = isPlatformAdmin
        ? programsData || []
        : (programsData || []).filter((p: Program) => p.admin_ids?.includes(profile.id));

      setPrograms(filteredPrograms);

      // Fetch journeys for those programs
      if (filteredPrograms.length > 0) {
        const programIds = filteredPrograms.map(p => p.id);
        const { data: journeysData, error: journeysError } = await supabase
          .from('program_journeys')
          .select('*')
          .in('program_id', programIds)
          .order('order_index', { ascending: true });

        if (journeysError) throw journeysError;
        setJourneys(journeysData || []);
      }

      // Fetch circles where user is admin
      const { data: circlesData, error: circlesError } = await supabase
        .from('circles')
        .select('*')
        .order('created_at', { ascending: false });

      if (circlesError) throw circlesError;

      const filteredCircles = isPlatformAdmin
        ? circlesData || []
        : (circlesData || []).filter((c: Circle) => c.admin_ids?.includes(profile.id));

      setCircles(filteredCircles);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleProgramExpansion = (programId: string) => {
    setExpandedPrograms(prev => ({
      ...prev,
      [programId]: !prev[programId]
    }));
  };

  const getJourneysForProgram = (programId: string) => {
    return journeys.filter(j => j.program_id === programId);
  };

  const getCircleById = (circleId: string) => {
    return circles.find(c => c.id === circleId);
  };

  const getCircleIdsInJourneys = () => {
    return new Set(journeys.map(j => j.circle_id).filter(Boolean));
  };

  const getFilteredCircles = () => {
    const circleIdsInJourneys = getCircleIdsInJourneys();
    
    if (circleFilter === 'all') return circles;
    if (circleFilter === 'program') return circles.filter(c => circleIdsInJourneys.has(c.id));
    if (circleFilter === 'standalone') return circles.filter(c => !circleIdsInJourneys.has(c.id));
    return circles;
  };

  const filteredCircles = getFilteredCircles();
  const circleIdsInJourneys = getCircleIdsInJourneys();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/' },
          { label: 'My Programs', path: '/my-programs' }
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Programs</h1>
        <p className="text-gray-600">
          Strategic management of your programs, journeys, and circles
        </p>
      </div>

      {/* Overview Card */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <FolderKanban className="w-6 h-6 mr-2" />
            Strategic Overview
          </CardTitle>
          <CardDescription>
            You administer {programs.length} program{programs.length !== 1 ? 's' : ''} and {circles.length} circle{circles.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{programs.length}</div>
              <div className="text-sm text-gray-600">Programs</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-cyan-600">{journeys.length}</div>
              <div className="text-sm text-gray-600">Journeys</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-indigo-600">{circles.length}</div>
              <div className="text-sm text-gray-600">Circles</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Funnel Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Strategic Funnel Management</h2>
        <p className="text-sm text-gray-600 mb-4">
          Application-based enrollment and session management for your programs
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
            <Link to="/programs">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link2 className="w-5 h-5 mr-2 text-green-600" />
                  Program Landing Pages
                  <Badge variant="default" className="ml-2 bg-green-600">Active</Badge>
                </CardTitle>
                <CardDescription>
                  Shareable landing pages and application forms for your programs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">✓ Public landing pages</p>
                <p className="text-sm text-gray-600">✓ Application forms</p>
                <p className="text-sm text-gray-600">✓ Visit tracking</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Program Analytics
                <Badge variant="default" className="ml-2 bg-green-600">Active</Badge>
              </CardTitle>
              <CardDescription>
                Track visits, applications, and conversion rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">✓ Landing page visits</p>
              <p className="text-sm text-gray-600">✓ Application submissions</p>
              <p className="text-sm text-gray-600">✓ Conversion tracking</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/30">
            <Link to="/program-admin/applications">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-green-600" />
                  Application Review
                  <Badge variant="default" className="ml-2 bg-green-600">Active</Badge>
                </CardTitle>
                <CardDescription>
                  Review and process program applications in a dedicated dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">✓ Application queue</p>
                <p className="text-sm text-gray-600">✓ Approve/reject workflow</p>
                <p className="text-sm text-gray-600">✓ Review history tracking</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-blue-50/30">
            <Link to="/program-admin/communications">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  Applicant Communications
                  <Badge variant="default" className="ml-2 bg-blue-600">Active</Badge>
                </CardTitle>
                <CardDescription>
                  Email templates and notification tracking for applicants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">✓ Professional email templates</p>
                <p className="text-sm text-gray-600">✓ Action-based messaging</p>
                <p className="text-sm text-gray-600">✓ Notification tracking</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 bg-purple-50/30">
            <Link to="/platform-admin/account-management">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2 text-purple-600" />
                  Account Backup
                </CardTitle>
                <CardDescription>
                  Export your account data as JSON for backup purposes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">✓ Download account backup</p>
                <p className="text-sm text-gray-600">✓ Export as JSON file</p>
                <p className="text-sm text-gray-600">✓ Secure data archival</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      {/* Programs & Journeys Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Programs & Journeys</h2>
            <p className="text-sm text-gray-600">
              Programs you administer, organized by journeys
            </p>
          </div>
        </div>

        {programs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">You don't administer any programs yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {programs.map((program) => {
              const programJourneys = getJourneysForProgram(program.id);
              const isExpanded = expandedPrograms[program.id];

              return (
                <div key={program.id} className="space-y-4">
                  <Card className="border-2 border-blue-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{program.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {program.status}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {program.member_ids?.length || 0} members
                            </Badge>
                          </div>
                          <CardDescription>{program.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`/programs/${program.slug}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link to={`/program-admin/${program.id}/setup`}>
                            <Button variant="outline" size="sm">
                              <Database className="w-4 h-4 mr-1" />
                              Setup
                            </Button>
                          </Link>
                          <Link to={`/admin/programs/${program.id}/sessions`}>
                            <Button variant="outline" size="sm">
                              <CalendarCheck className="w-4 h-4 mr-1" />
                              Sessions
                            </Button>
                          </Link>
                          <Link to={`/programs/${program.slug}/settings`}>
                            <Button variant="outline" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>

                    {programJourneys.length > 0 && (
                      <CardContent>
                        <button
                          onClick={() => toggleProgramExpansion(program.id)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          {programJourneys.length} Journey{programJourneys.length !== 1 ? 's' : ''}
                        </button>

                        {isExpanded && (
                          <div className="ml-6 space-y-3 mt-3">
                            {programJourneys.map((journey, index) => {
                              const journeyCircle = journey.circle_id ? getCircleById(journey.circle_id) : null;

                              return (
                                <div key={journey.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-500">
                                          Journey {index + 1}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {journey.status}
                                        </Badge>
                                      </div>
                                      <h4 className="font-medium text-gray-900 mb-1">{journey.name}</h4>
                                      <p className="text-sm text-gray-600 mb-2">{journey.description}</p>
                                      
                                      {journeyCircle && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="text-gray-500">Circle:</span>
                                          <Link to={`/circles/${journeyCircle.id}`} className="text-blue-600 hover:underline">
                                            {journeyCircle.name}
                                          </Link>
                                        </div>
                                      )}

                                      {journey.container_ids && journey.container_ids.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-500">
                                          {journey.container_ids.length} container{journey.container_ids.length !== 1 ? 's' : ''} attached
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                  
                  {/* Program Offering Card */}
                  <ProgramOfferingCard 
                    program={program} 
                    onRefresh={fetchData}
                    showActions={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Circles Section with Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Circles You Administer</h2>
            <p className="text-sm text-gray-600">
              All circles where you have admin access
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={circleFilter}
              onChange={(e) => setCircleFilter(e.target.value as 'all' | 'standalone' | 'program')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Circles ({circles.length})</option>
              <option value="program">In Programs ({Array.from(circleIdsInJourneys).length})</option>
              <option value="standalone">Standalone ({circles.length - Array.from(circleIdsInJourneys).length})</option>
            </select>
          </div>
        </div>

        {filteredCircles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                {circleFilter === 'all' 
                  ? "You don't administer any circles yet"
                  : circleFilter === 'program'
                  ? "No circles are part of your programs"
                  : "No standalone circles found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCircles.map((circle) => {
              const isInProgram = circleIdsInJourneys.has(circle.id);

              return (
                <Card key={circle.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-base">{circle.name}</CardTitle>
                      {isInProgram && (
                        <Badge variant="secondary" className="text-xs">
                          In Program
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {circle.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {circle.member_ids?.length || 0} members
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/circles/${circle.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/circles/${circle.id}/settings`}>
                          <Button variant="ghost" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Program Template Manager */}
      {profile && (
        <div className="mt-8">
          <ProgramTemplateManager
            userId={profile.id}
            mode="inline"
          />
        </div>
      )}
    </div>
  );
}