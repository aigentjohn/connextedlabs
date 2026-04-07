/**
 * My Growth Page
 * 
 * Unified surface for growth pathways, badges, and completion history.
 * Replaces the old MyBadgesPage as the "progression" view.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useUserBadges } from '@/hooks/useBadges';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import {
  Compass,
  Trophy,
  Award,
  BookOpen,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  Circle,
  SkipForward,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Target,
  Rocket,
  Activity,
  ClipboardCheck,
  Send,
  AlertCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PathwayStep {
  id: string;
  order_index: number;
  step_type: 'course' | 'program' | 'activity';
  step_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  allow_skip: boolean;
  activity_type?: string;
  verification_method?: string;
  activity_instance_id?: string | null;
  activity_criteria?: { target_id?: string; target_title?: string; target_slug?: string } | null;
}

interface Pathway {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  destination: string;
  relevant_topics: string[];
  relevant_tags: string[];
  target_roles: string[];
  target_career_stages: string[];
  steps: PathwayStep[];
  completion_badge_type_id: string | null;
  estimated_hours: number | null;
  icon: string | null;
  color: string;
  created_by: string;
  status: string;
  is_featured: boolean;
  enrollment_count: number;
  completion_count: number;
}

interface PathwayEnrollment {
  pathway_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_pct: number;
  status: string;
}

interface EnrolledPathway {
  enrollment: PathwayEnrollment;
  pathway: Pathway;
}

interface PathwayMatch {
  pathway: Pathway;
  match_score: number;
  match_reasons: string[];
}

interface CompletedCourse {
  id: string;
  course_id: string;
  completed_at: string;
  progress_percentage: number;
  courses: {
    id: string;
    title: string;
    slug: string;
    cover_image_url: string | null;
  };
}

// ============================================================================
// ACTIVITY ROUTE MAP
// ============================================================================

const ACTIVITY_ROUTE_MAP: Record<string, string> = {
  join_circle: '/circles',
  attend_meeting: '/meetings',
  post_in_forum: '/forums',
  create_document: '/documents',
  complete_checklist: '/lists',
  read_book: '/books',
  explore_deck: '/decks',
  watch_episode: '/episodes',
  attend_event: '/events',
  create_build: '/builds',
  give_pitch: '/pitches',
  join_meetup: '/meetups',
  participate_standup: '/standups',
  join_sprint: '/sprints',
  use_table: '/tables',
  use_playlist: '/playlists',
  use_library: '/libraries',
  use_elevator: '/elevators',
};

function getStepLink(step: PathwayStep): string | null {
  if (step.step_type === 'course' && step.step_id) return `/courses/${step.step_id}`;
  if (step.step_type === 'program' && step.step_id) return `/programs/${step.step_id}`;
  if (step.step_type === 'activity' && step.activity_type) {
    const basePath = ACTIVITY_ROUTE_MAP[step.activity_type];
    const slug = step.activity_criteria?.target_slug;
    if (basePath && slug) return `${basePath}/${slug}`;
    if (basePath && step.activity_instance_id) return `${basePath}/${step.activity_instance_id}`;
    if (basePath) return basePath;
  }
  return null;
}

function getStepItemLabel(step: PathwayStep): string | null {
  if (step.activity_criteria?.target_title) return step.activity_criteria.target_title;
  return null;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function fetchAPI(path: string, options?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    method: options?.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(options?.body ? { body: options.body } : {}),
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch { /* ignore parse errors */ }
    console.error(`Growth API ${path} error:`, errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    const msg = data.error || data.message || 'API error';
    console.error(`Growth API ${path} error:`, msg, data);
    throw new Error(msg);
  }

  return data;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MyGrowthPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { badges, loading: badgesLoading } = useUserBadges(profile?.id || null, true);

  const [enrolledPathways, setEnrolledPathways] = useState<EnrolledPathway[]>([]);
  const [recommendations, setRecommendations] = useState<PathwayMatch[]>([]);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadGrowthData();
    }
  }, [profile?.id]);

  async function loadGrowthData() {
    setLoading(true);
    try {
      const [enrollmentsRes, recommendationsRes] = await Promise.allSettled([
        fetchAPI(`/pathways/user/enrollments?user_id=${profile!.id}`),
        fetchAPI(`/pathways/user/recommended?user_id=${profile!.id}`),
      ]);

      if (enrollmentsRes.status === 'fulfilled') {
        setEnrolledPathways(enrollmentsRes.value.enrollments || []);
      }

      if (recommendationsRes.status === 'fulfilled') {
        setRecommendations(recommendationsRes.value.recommendations || []);
      }

      // Load completed courses from Supabase directly
      const { data: completed } = await supabase
        .from('course_enrollments')
        .select(`
          id, course_id, completed_at, progress_percentage,
          courses(id, title, slug, cover_image_url)
        `)
        .eq('user_id', profile!.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (completed) {
        setCompletedCourses(completed as unknown as CompletedCourse[]);
      }
    } catch (error) {
      console.error('Error loading growth data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(pathwayId: string) {
    setEnrolling(pathwayId);
    try {
      await fetchAPI(`/pathways/${pathwayId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ user_id: profile!.id }),
      });
      toast.success('Enrolled in pathway!');
      loadGrowthData();
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast.error(error.message || 'Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  }

  async function handleSkipStep(pathwayId: string, stepId: string) {
    try {
      await fetchAPI(`/pathways/${pathwayId}/skip-step`, {
        method: 'POST',
        body: JSON.stringify({ user_id: profile!.id, step_id: stepId }),
      });
      toast.success('Step marked as known — moving ahead!');
      loadGrowthData();
    } catch (error: any) {
      console.error('Error skipping step:', error);
      toast.error(error.message || 'Failed to skip step');
    }
  }

  async function handleSelfReport(pathwayId: string, stepId: string, evidenceNote: string) {
    try {
      await fetchAPI(`/pathways/${pathwayId}/self-report`, {
        method: 'POST',
        body: JSON.stringify({ user_id: profile!.id, step_id: stepId, evidence_note: evidenceNote }),
      });
      toast.success('Activity reported! Waiting for verification.');
      loadGrowthData();
    } catch (error: any) {
      console.error('Error self-reporting step:', error);
      toast.error(error.message || 'Failed to report activity');
    }
  }

  if (!profile) return null;

  const activePathways = enrolledPathways.filter(ep => ep.enrollment.status !== 'completed');
  const completedPathways = enrolledPathways.filter(ep => ep.enrollment.status === 'completed');

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'My Growth' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            My Growth
          </h1>
          <p className="text-gray-600 mt-1">
            Your pathways, progress, and achievements in one place.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Compass className="w-5 h-5 text-indigo-600" />}
          label="Active Pathways"
          value={loading ? '...' : String(activePathways.length)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Completed"
          value={loading ? '...' : String(completedCourses.length)}
          sublabel="courses"
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-yellow-600" />}
          label="Badges Earned"
          value={badgesLoading ? '...' : String(badges.length)}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-purple-600" />}
          label="Pathways Done"
          value={loading ? '...' : String(completedPathways.length)}
        />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Section 1: Active Pathways */}
          <section>
            <SectionHeader
              icon={<Compass className="w-5 h-5" />}
              title="Active Pathways"
              subtitle="Your enrolled pathways and current progress"
            />
            {activePathways.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Compass className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    You haven't enrolled in any pathways yet.
                  </p>
                  {recommendations.length > 0 && (
                    <p className="text-sm text-gray-400">
                      Check out the recommendations below to find a pathway that matches your interests.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activePathways.map(({ enrollment, pathway }) => (
                  <PathwayProgressCard
                    key={pathway.id}
                    pathway={pathway}
                    enrollment={enrollment}
                    onSkipStep={handleSkipStep}
                    onSelfReport={handleSelfReport}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Recommended For You */}
          {recommendations.length > 0 && (
            <section>
              <SectionHeader
                icon={<Sparkles className="w-5 h-5" />}
                title="Recommended For You"
                subtitle="Pathways that match your interests, topics, and goals"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.slice(0, 6).map(({ pathway, match_score, match_reasons }) => (
                  <RecommendedPathwayCard
                    key={pathway.id}
                    pathway={pathway}
                    matchScore={match_score}
                    matchReasons={match_reasons}
                    enrolling={enrolling === pathway.id}
                    onEnroll={() => handleEnroll(pathway.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Earned Badges */}
          <section>
            <SectionHeader
              icon={<Award className="w-5 h-5" />}
              title="Earned Badges"
              subtitle="Your achievements and recognitions"
            />
            {badgesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No badges earned yet. Complete courses and pathways to earn badges.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <BadgeEarnedCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Completion History */}
          <section>
            <SectionHeader
              icon={<BookOpen className="w-5 h-5" />}
              title="Completion History"
              subtitle="Courses and programs you've finished"
            />
            {completedCourses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No completions yet. Start a course to begin your journey.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/courses')}
                  >
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {completedCourses.map((enrollment) => (
                  <CompletionHistoryItem
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
                {completedCourses.length >= 10 && (
                  <p className="text-sm text-gray-400 text-center pt-2">
                    Showing most recent 10 completions
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Section 5: Completed Pathways */}
          {completedPathways.length > 0 && (
            <section>
              <SectionHeader
                icon={<Trophy className="w-5 h-5" />}
                title="Completed Pathways"
                subtitle="Pathways you've finished"
              />
              <div className="space-y-3">
                {completedPathways.map(({ enrollment, pathway }) => (
                  <Card key={pathway.id} className="border-green-200 bg-green-50/30">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pathway.color || 'from-green-500 to-emerald-600'} flex items-center justify-center`}>
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{pathway.name}</h3>
                            <p className="text-sm text-gray-500">
                              Completed {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : ''}
                              {' '}&middot; {pathway.steps.length} steps
                            </p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, sublabel }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500">
              {label}{sublabel ? ` ${sublabel}` : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon, title, subtitle }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function PathwayProgressCard({ pathway, enrollment, onSkipStep, onSelfReport }: {
  pathway: Pathway;
  enrollment: PathwayEnrollment;
  onSkipStep: (pathwayId: string, stepId: string) => void;
  onSelfReport: (pathwayId: string, stepId: string, evidenceNote: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reportingStepId, setReportingStepId] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReport(stepId: string) {
    setSubmitting(true);
    try {
      await onSelfReport(pathway.id, stepId, evidenceNote);
      setReportingStepId(null);
      setEvidenceNote('');
    } catch {
      // Error already toasted by parent handler
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Header bar with gradient */}
      <div className={`h-1.5 bg-gradient-to-r ${pathway.color || 'from-indigo-500 to-purple-600'}`} />

      <CardContent className="pt-4 pb-4">
        {/* Pathway info + progress */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{pathway.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {pathway.destination}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-indigo-600">
              {enrollment.progress_pct || 0}%
            </div>
            <div className="text-xs text-gray-400">progress</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <Progress value={enrollment.progress_pct || 0} className="h-2.5" />
        </div>

        {/* Step summary */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {pathway.steps.length} total steps
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Steps' : 'Show Steps'}
            <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {/* Expanded step list */}
        {expanded && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {pathway.steps
              .sort((a, b) => a.order_index - b.order_index)
              .map((step) => {
                const isCompleted = false;
                const isSkipped = false;
                const isPending = false;
                const isCurrent = false;
                const isActivity = step.step_type === 'activity';
                const isReporting = reportingStepId === step.id;
                const canSelfReport = isActivity && !isCompleted;

                return (
                  <div key={step.id}>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isCompleted ? 'bg-green-50' :
                        isPending ? 'bg-blue-50 ring-1 ring-blue-200' :
                        isSkipped ? 'bg-amber-50/50' :
                        isCurrent ? 'bg-indigo-50 ring-1 ring-indigo-200' :
                        'bg-gray-50'
                      }`}
                    >
                      {/* Step icon */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : isPending ? (
                          <Clock className="w-5 h-5 text-blue-500" />
                        ) : isSkipped ? (
                          <SkipForward className="w-5 h-5 text-amber-500" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* Step info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${
                            isCompleted ? 'text-green-700' :
                            isPending ? 'text-blue-700' :
                            isSkipped ? 'text-amber-700 line-through' :
                            isCurrent ? 'text-indigo-700' :
                            'text-gray-600'
                          }`}>
                            {step.title}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            isActivity ? 'text-green-600 border-green-200' : ''
                          }`}>
                            {step.step_type}
                          </Badge>
                          {!step.is_required && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400">
                              optional
                            </Badge>
                          )}
                          {isPending && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                              <Clock className="w-2.5 h-2.5 mr-0.5" />
                              Awaiting review
                            </Badge>
                          )}
                        </div>
                        {(() => {
                          const itemLabel = getStepItemLabel(step);
                          const stepLink = getStepLink(step);
                          if (itemLabel && stepLink) {
                            return (
                              <Link to={stepLink} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-0.5">
                                <ExternalLink className="w-3 h-3" />
                                {itemLabel}
                              </Link>
                            );
                          }
                          if (itemLabel) {
                            return <p className="text-xs text-gray-500 mt-0.5">{itemLabel}</p>;
                          }
                          return null;
                        })()}
                        {step.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {step.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Go link for any step with a target */}
                        {!isCompleted && getStepLink(step) && (
                          <Link to={getStepLink(step)!}>
                            <Button size="sm" variant="default" className="text-xs">
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Go
                            </Button>
                          </Link>
                        )}
                        {/* Self-report button for activity steps */}
                        {canSelfReport && (
                          <Button
                            size="sm"
                            variant={isReporting ? 'outline' : 'default'}
                            className="text-xs"
                            onClick={() => {
                              if (isReporting) {
                                setReportingStepId(null);
                                setEvidenceNote('');
                              } else {
                                setReportingStepId(step.id);
                                setEvidenceNote('');
                              }
                            }}
                          >
                            {isReporting ? (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel
                              </>
                            ) : (
                              <>
                                <ClipboardCheck className="w-3 h-3 mr-1" />
                                Report Done
                              </>
                            )}
                          </Button>
                        )}
                        {/* Skip button */}
                        {!isCompleted && !isSkipped && !isPending && step.allow_skip && !isActivity && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-amber-600 hover:text-amber-700"
                            onClick={() => onSkipStep(pathway.id, step.id)}
                          >
                            <SkipForward className="w-3 h-3 mr-1" />
                            I know this
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Self-report evidence form (shown inline below the step) */}
                    {isReporting && (
                      <div className="ml-8 mt-2 p-3 bg-white border border-blue-200 rounded-lg shadow-sm">
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          What did you do? (optional evidence note)
                        </label>
                        <Textarea
                          value={evidenceNote}
                          onChange={(e) => setEvidenceNote(e.target.value)}
                          placeholder="e.g., Joined the Product Design circle on Feb 10..."
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => submitReport(step.id)}
                            disabled={submitting}
                            className="text-xs"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {submitting ? 'Submitting...' : 'Submit Report'}
                          </Button>
                          {step.verification_method === 'admin_verify' && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              An admin will review your report
                            </span>
                          )}
                          {step.verification_method === 'self_report' && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Self-reported — no review needed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedPathwayCard({ pathway, matchScore, matchReasons, enrolling, onEnroll }: {
  pathway: Pathway;
  matchScore: number;
  matchReasons: string[];
  enrolling: boolean;
  onEnroll: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      {/* Color bar */}
      <div className={`h-1.5 bg-gradient-to-r ${pathway.color || 'from-indigo-500 to-purple-600'}`} />

      <CardContent className="pt-4 pb-4 flex-1 flex flex-col">
        {/* Match score badge */}
        {matchScore > 0 && (
          <div className="mb-2">
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              <Star className="w-3 h-3 mr-1" />
              {matchScore}% match
            </Badge>
          </div>
        )}

        <h3 className="font-semibold text-base">{pathway.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">
          {pathway.destination || pathway.short_description || pathway.description}
        </p>

        {/* Match reasons */}
        {matchReasons.length > 0 && (
          <div className="mt-3 space-y-1">
            {matchReasons.slice(0, 2).map((reason, i) => (
              <p key={i} className="text-xs text-indigo-600 flex items-start gap-1">
                <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {reason}
              </p>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          <span>{pathway.steps?.length || 0} steps</span>
          {pathway.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pathway.estimated_hours}h
            </span>
          )}
          {pathway.enrollment_count > 0 && (
            <span>{pathway.enrollment_count} enrolled</span>
          )}
        </div>

        {/* Enroll button */}
        <Button
          size="sm"
          className="w-full mt-4"
          onClick={onEnroll}
          disabled={enrolling}
        >
          {enrolling ? 'Enrolling...' : 'Start This Pathway'}
          <Rocket className="w-3.5 h-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function BadgeEarnedCard({ badge }: { badge: any }) {
  const badgeType = badge.badge_type;
  const color = badgeType?.badge_color || '#6366f1';

  const categoryIcon: Record<string, React.ReactNode> = {
    completion: <GraduationCap className="w-5 h-5 text-white" />,
    endorsement: <Star className="w-5 h-5 text-white" />,
    skill: <Trophy className="w-5 h-5 text-white" />,
    verification: <CheckCircle2 className="w-5 h-5 text-white" />,
    achievement: <Target className="w-5 h-5 text-white" />,
    membership: <Award className="w-5 h-5 text-white" />,
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {categoryIcon[badgeType?.category] || <Award className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{badgeType?.name || 'Badge'}</h3>
            {badgeType?.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {badgeType.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                Earned
              </Badge>
              <span className="text-[10px] text-gray-400">
                {new Date(badge.created_at).toLocaleDateString()}
              </span>
            </div>
            {badge.issuer_message && (
              <p className="text-xs text-gray-400 mt-1 italic">
                "{badge.issuer_message}"
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionHistoryItem({ enrollment }: { enrollment: CompletedCourse }) {
  const course = enrollment.courses;

  return (
    <Link to={`/courses/${course.slug}`} className="block">
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{course.title}</p>
          <p className="text-xs text-gray-400">
            Completed {enrollment.completed_at
              ? new Date(enrollment.completed_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })
              : ''}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          course
        </Badge>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}