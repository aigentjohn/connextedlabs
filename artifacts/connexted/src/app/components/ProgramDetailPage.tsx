import { useState,useEffect,useRef } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/app/components/ui/breadcrumb';
import { toast } from 'sonner';
import { useIsProgramMember, useJoinProgram, useLeaveProgram, useProgramMembers } from '@/hooks/useProgramMembership';
import { ProgramSecondLevelNav } from './program/ProgramSecondLevelNav';
import { ProgramFeed } from './program/ProgramFeed';
import { ProgramForum } from './program/ProgramForum';
import ProgramEvents from './program/ProgramEvents';
import { ProgramMembers } from './program/ProgramMembers';
import { ProgramPrompts } from './program/ProgramPrompts';
import { JourneyCardsView } from './program/JourneyCardsView';
import { JourneyDetailView } from './program/JourneyDetailView';
import { AddJourneyContentDialog } from './program/AddJourneyContentDialog';
import { exportProgram, downloadTemplate } from '@/lib/template-engine';
import { getParticipantLabel, formatParticipantCount } from '@/utils/terminology';
import { PROGRAM_TEMPLATES } from '@/data/program-templates';
import { Home, Users as UsersIcon, Map, UserPlus, UserMinus, Download, Settings, Loader2, BookOpen, Calendar, Trophy } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { issueProgramCompletionBadge } from '@/services/badgeService';

interface ProgramInstance {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  circle_id: string | null;
}

interface ProgramJourney {
  id: string;
  program_id: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
  start_date: string | null;
  finish_date: string | null;
  containers_template: any[];
  created_at: string;
}

interface JourneyProgress {
  journey_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export default function ProgramDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [program, setProgram] = useState<ProgramInstance | null>(null);
  const [programCircle, setProgramCircle] = useState<any | null>(null);
  const [journeys, setJourneys] = useState<ProgramJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [journeyProgress, setJourneyProgress] = useState<Record<string, JourneyProgress>>({});
  const [loading, setLoading] = useState(true);
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false);
  
  // Main tab state: 'community', 'sessions', or 'journeys'
  const [mainTab, setMainTab] = useState<'community' | 'sessions' | 'journeys'>('community');
  
  // Community section state (feed, forum, members, prompts only)
  const [activeSection, setActiveSection] = useState<'feed' | 'forum' | 'members' | 'prompts'>('feed');
  
  // Journey view state: 'cards' (overview) or 'detail' (specific journey)
  const [journeyView, setJourneyView] = useState<'cards' | 'detail'>('cards');
  
  // Program membership hooks
  const { isMember, membership, isLoading: membershipLoading } = useIsProgramMember(program?.id);
  const { joinProgram, isLoading: isJoining } = useJoinProgram();
  const { leaveProgram, isLoading: isLeaving } = useLeaveProgram();
  const { members, refetch: refetchMembers } = useProgramMembers(program?.id);

  // Guard: prevent firing program completion callbacks more than once per session
  const completionFiredRef = useRef(false);

  // Fetch program data
  useEffect(() => {
    if (slug) {
      fetchProgram();
    }
  }, [slug]);

  // Fetch journey progress when user logs in or journeys change
  useEffect(() => {
    if (profile && program && journeys.length > 0) {
      fetchJourneyProgress();
    }
  }, [profile, program, journeys]);

  // Auto-select first journey when journeys load
  useEffect(() => {
    if (journeys.length > 0 && !selectedJourneyId) {
      // Select first in-progress or not-started journey
      const activeJourney = journeys.find(j => j.status !== 'completed') || journeys[0];
      setSelectedJourneyId(activeJourney.id);
    }
  }, [journeys]);

  // -------------------------------------------------------------------------
  // Program completion: fire pathway hook + badge when all journeys are done
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!program || !profile || !isMember || journeys.length === 0 || completionFiredRef.current) return;

    // Derive completion from state — avoids referencing render-scope variables
    const completedCount = journeys.filter(j => {
      const progress = journeyProgress[j.id];
      return progress?.status === 'completed' || j.status === 'completed';
    }).length;

    if (completedCount < journeys.length) return;

    completionFiredRef.current = true;

    (async () => {
      toast.success('Program completed! Incredible work! 🎓', { duration: 5000 });

      // 1. Advance any enrolled pathways that include this program as a step
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token || publicAnonKey;

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/pathways/completion-hook`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content_type: 'program', content_id: program.id }),
          }
        );
        const data = await res.json();
        if (data.success && data.pathways_advanced > 0) {
          const completed = data.results?.filter((r: any) => r.pathwayCompleted) || [];
          if (completed.length > 0) {
            toast.success('Pathway completed! Check My Growth for your achievement.', { duration: 6000 });
          } else {
            toast.info(`Pathway progress updated — ${data.pathways_advanced} pathway${data.pathways_advanced > 1 ? 's' : ''} advanced.`, { duration: 4000 });
          }
        }
      } catch (hookError) {
        console.error('Error calling pathway completion hook:', hookError);
      }

      // 2. Issue program-completion badge (non-blocking)
      try {
        await issueProgramCompletionBadge(profile.id, program.id);
      } catch (badgeError) {
        console.error('Error issuing program completion badge:', badgeError);
      }
    })();
  }, [journeys, journeyProgress, program, profile, isMember]);

  const fetchProgram = async () => {
    try {
      setLoading(true);

      // Fetch program instance
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (programError) throw programError;
      if (!programData) {
        setProgram(null);
        setLoading(false);
        return;
      }

      setProgram(programData);

      // Fetch program's circle if it has one
      if (programData.circle_id) {
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('*')
          .eq('id', programData.circle_id)
          .single();

        if (!circleError && circleData) {
          setProgramCircle(circleData);
        }
      }

      // Fetch journeys
      const { data: journeyData, error: journeyError } = await supabase
        .from('program_journeys')
        .select('*')
        .eq('program_id', programData.id)
        .order('order_index', { ascending: true });

      if (journeyError) throw journeyError;
      setJourneys(journeyData || []);

    } catch (error) {
      console.error('Error fetching program:', error);
      toast.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const fetchJourneyProgress = async () => {
    if (!profile || !program) return;

    try {
      const { data, error } = await supabase
        .from('journey_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('program_id', program.id);

      if (error) {
        // Gracefully handle missing table (migration not yet applied)
        if (error.code === 'PGRST205') {
          console.warn('Journey progress tracking tables not yet created. Please run migration: 20260202000200_create_journey_progress_tracking.sql');
          setJourneyProgress({});
          return;
        }
        throw error;
      }

      const progressMap: Record<string, JourneyProgress> = {};
      (data || []).forEach((p) => {
        progressMap[p.journey_id] = p;
      });
      setJourneyProgress(progressMap);
    } catch (error) {
      console.error('Error fetching journey progress:', error);
    }
  };

  const handleJoinProgram = async () => {
    if (!program) return;
    const result = await joinProgram(program.id);
    if (result.success) {
      if (result.alreadyMember) {
        toast.info('You are already a member of this program');
      } else {
        toast.success('Successfully joined program!');
      }
      refetchMembers();
      // Refresh program data to update member_ids
      fetchProgram();
    } else if (result.error) {
      // Show user-friendly error message
      toast.error(result.error.message || 'Failed to join program');
    }
  };

  const handleLeaveProgram = async () => {
    if (!program) return;
    const result = await leaveProgram(program.id);
    if (result.success) {
      toast.success('You have left the program');
      refetchMembers();
      fetchProgram();
    } else if (result.error) {
      toast.error(result.error.message || 'Failed to leave program');
    }
  };

  const handleExportProgram = async () => {
    if (!program) return;

    toast.loading('Exporting program...');

    try {
      const template = await exportProgram(program.id, {
        includeContainers: true,
        includeCircle: true,
        includeMetadata: true,
      });

      if (template) {
        const filename = `${program.slug}-export.json`;
        downloadTemplate(template, filename);
        toast.success('Program exported successfully!');
      } else {
        toast.error('Failed to export program');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export program');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading program...
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Program Not Found</CardTitle>
            <CardDescription>
              The program you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/programs')}>
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate: only members, admins, or program creator can access the dashboard
  const isCreatorOrAdmin = profile && (
    program.created_by === profile.id ||
    (program.admin_ids && program.admin_ids.includes(profile.id)) ||
    profile.role === 'super' || profile.role === 'admin'
  );

  if (!membershipLoading && !isMember && !isCreatorOrAdmin) {
    // Non-member tried to access dashboard directly — send them to the landing page
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Enrollment Required</CardTitle>
            <CardDescription>
              You need to be enrolled in this program to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => navigate(`/programs/${slug}`)}>
              View Program
            </Button>
            <Button variant="outline" onClick={() => navigate('/programs/discover')}>
              Browse Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get template for styling/icons
  const template = PROGRAM_TEMPLATES.find(t => t.id === program.template_id);

  // Check if user is program admin
  const isAdmin = profile && program && (
    program.created_by === profile.id || 
    (program.admin_ids && program.admin_ids.includes(profile.id))
  );

  // Calculate overall progress
  const completedJourneys = journeys.filter(j => {
    const progress = journeyProgress[j.id];
    return progress?.status === 'completed' || j.status === 'completed';
  }).length;
  const totalJourneys = journeys.length;
  const overallProgress = totalJourneys > 0 ? Math.round((completedJourneys / totalJourneys) * 100) : 0;

  // Get current journey progress
  const currentProgress = selectedJourneyId ? journeyProgress[selectedJourneyId] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/programs">
                  Programs
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{program.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Program Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {template && (
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-3xl flex-shrink-0`}>
                  {template.icon}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{program.name}</h1>
                <p className="text-gray-600 mt-1 max-w-2xl">
                  {program.description}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary">
                    {totalJourneys} {totalJourneys === 1 ? 'Journey' : 'Journeys'}
                  </Badge>
                  <Badge variant="outline">
                    {formatParticipantCount('program', members.length, true)}
                  </Badge>
                  {template?.duration && (
                    <Badge variant="outline">
                      {template.duration}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isMember && !membershipLoading && (
                <Button onClick={handleJoinProgram} disabled={isJoining}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isJoining ? 'Joining...' : 'Join Program'}
                </Button>
              )}
              
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={handleLeaveProgram} disabled={isLeaving}>
                  <UserMinus className="w-4 h-4 mr-2" />
                  {isLeaving ? 'Leaving...' : 'Leave'}
                </Button>
              )}

              {isAdmin && (
                <>
                  <Button onClick={() => navigate(`/program-admin/${program.id}/setup`)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Program
                  </Button>
                  <Button variant="outline" onClick={handleExportProgram}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/programs/${program.slug}/settings`)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Overall Progress Bar (for members only) */}
          {isMember && totalJourneys > 0 && (
            overallProgress === 100 ? (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">Program Complete!</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      You've finished all {totalJourneys} journeys. Check{' '}
                      <button
                        className="underline font-medium"
                        onClick={() => navigate('/growth')}
                      >
                        My Growth
                      </button>{' '}
                      to see your badge.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-700">100%</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-indigo-900">
                    Overall Progress
                  </span>
                  <span className="text-sm font-semibold text-indigo-700">
                    {completedJourneys} / {totalJourneys} Journeys • {overallProgress}%
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )
          )}

          {/* Non-Member Banner */}
          {!isMember && !membershipLoading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Preview Mode</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Join this program to track progress and access all resources
                  </p>
                </div>
                <Button size="sm" onClick={handleJoinProgram} disabled={isJoining}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isMember ? (
          <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'community' | 'sessions' | 'journeys')} className="py-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-3">
              <TabsTrigger value="community" className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Community
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="journeys" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                Journeys
              </TabsTrigger>
            </TabsList>

            {/* Community Tab Content */}
            <TabsContent value="community" className="mt-6">
              <ProgramSecondLevelNav
                programId={program.id}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isAdmin={!!isAdmin}
                isMember={!!isMember}
              />

              <div className="mt-6">
                {activeSection === 'feed' && (
                  <ProgramFeed circleId={programCircle?.id} programId={program.id} />
                )}
                {activeSection === 'forum' && (
                  <ProgramForum circleId={programCircle?.id} programId={program.id} isAdmin={!!isAdmin} />
                )}
                {activeSection === 'members' && (
                  <ProgramMembers 
                    programId={program.id}
                    members={members}
                    isAdmin={!!isAdmin}
                  />
                )}
                {activeSection === 'prompts' && (
                  <ProgramPrompts
                    programId={program.id}
                    isAdmin={!!isAdmin}
                    isMember={!!isMember}
                  />
                )}
              </div>
            </TabsContent>

            {/* Sessions Tab Content */}
            <TabsContent value="sessions" className="mt-6">
              <ProgramEvents 
                programId={program.id} 
                isAdmin={!!isAdmin}
              />
            </TabsContent>

            {/* Journeys Tab Content */}
            <TabsContent value="journeys" className="mt-6">
              {journeyView === 'cards' ? (
                <JourneyCardsView
                  journeys={journeys}
                  journeyProgress={journeyProgress}
                  onSelectJourney={(journeyId) => {
                    setSelectedJourneyId(journeyId);
                    setJourneyView('detail');
                  }}
                  overallProgress={overallProgress}
                  completedJourneys={completedJourneys}
                  totalJourneys={totalJourneys}
                />
              ) : (
                selectedJourneyId && (
                  <JourneyDetailView
                    journey={journeys.find(j => j.id === selectedJourneyId)!}
                    journeyProgress={journeyProgress[selectedJourneyId]}
                    onBack={() => setJourneyView('cards')}
                    isAdmin={!!isAdmin}
                    onAddContent={() => setAddContentDialogOpen(true)}
                  />
                )
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-Member View: Show Overview Only */
          <div className="py-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Program Overview
                </CardTitle>
                <CardDescription>
                  Join this program to access all journeys and resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {journeys.map((journey, index) => (
                    <div key={journey.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{journey.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{journey.description}</p>
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-6">
                    <Button onClick={handleJoinProgram} disabled={isJoining} size="lg">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Program to Get Started
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Journey Content Dialog */}
      {addContentDialogOpen && selectedJourneyId && program && (
        <AddJourneyContentDialog
          open={addContentDialogOpen}
          onOpenChange={setAddContentDialogOpen}
          journeyId={selectedJourneyId}
          programId={program.id}
          onContentAdded={() => {
            // Refresh journey content grid by triggering a re-render
            // The JourneyContentGrid component will fetch fresh data automatically
            setAddContentDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}