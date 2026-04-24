/**
 * PathwayDetailPage
 *
 * Dedicated page for working through a single enrolled pathway.
 * Shows all steps in order, highlights the current step, and
 * wires real completion state from course_enrollments / program_members.
 *
 * Route: /my-growth/pathway/:pathwayId
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Activity,
  ExternalLink,
  Send,
  AlertCircle,
  Trophy,
  Compass,
  ClipboardCheck,
  XCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  verification_method?: 'self_report' | 'admin_verify' | 'auto_detect';
  activity_instance_id?: string | null;
  activity_criteria?: { target_id?: string; target_title?: string; target_slug?: string } | null;
}

interface Pathway {
  id: string;
  name: string;
  slug: string;
  description: string;
  destination: string;
  color: string;
  steps: PathwayStep[];
}

interface Enrollment {
  status: string;
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACTIVITY_ROUTE_MAP: Record<string, string> = {
  join_circle:         '/circles',
  attend_meeting:      '/meetings',
  post_in_forum:       '/forums',
  create_document:     '/documents',
  complete_checklist:  '/checklists',
  read_book:           '/books',
  explore_deck:        '/decks',
  watch_episode:       '/episodes',
  attend_event:        '/events',
  create_build:        '/builds',
  give_pitch:          '/pitches',
  join_meetup:         '/meetups',
  participate_standup: '/standups',
  join_sprint:         '/sprints',
  use_table:           '/tables',
  use_playlist:        '/playlists',
  use_library:         '/libraries',
  use_elevator:        '/elevators',
};

function getStepLink(step: PathwayStep): string | null {
  if (step.step_type === 'course' && step.step_id) return `/courses/${step.step_id}`;
  if (step.step_type === 'program' && step.step_id) return `/programs/${step.step_id}`;
  if (step.step_type === 'activity' && step.activity_type) {
    const base = ACTIVITY_ROUTE_MAP[step.activity_type];
    if (base && step.activity_instance_id) return `${base}/${step.activity_instance_id}`;
    if (base) return base;
  }
  return null;
}

function getStepLinkedTitle(step: PathwayStep): string | null {
  return step.activity_criteria?.target_title || null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PathwayDetailPage() {
  const { pathwayId } = useParams<{ pathwayId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notEnrolled, setNotEnrolled] = useState(false);

  // Self-report state
  const [reportingStepId, setReportingStepId] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Skip state
  const [skipping, setSkipping] = useState<string | null>(null);

  useEffect(() => {
    if (user && pathwayId) load();
  }, [user, pathwayId]);

  async function load() {
    if (!user || !pathwayId) return;
    setLoading(true);
    try {
      // 1. Pathway + steps
      const { data: pw, error: pwError } = await supabase
        .from('pathways')
        .select('*, pathway_steps(*)')
        .eq('id', pathwayId)
        .single();
      if (pwError) throw pwError;

      const steps: PathwayStep[] = (pw.pathway_steps || [])
        .sort((a: any, b: any) => a.order_index - b.order_index);

      setPathway({ ...pw, steps });

      // 2. Enrollment
      const { data: enroll } = await supabase
        .from('pathway_enrollments')
        .select('status, progress_pct, enrolled_at, completed_at')
        .eq('pathway_id', pathwayId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!enroll) {
        setNotEnrolled(true);
        setLoading(false);
        return;
      }
      setEnrollment(enroll);

      // 3. Resolve which steps are complete
      const courseStepIds = steps
        .filter(s => s.step_type === 'course' && s.step_id)
        .map(s => s.step_id);
      const programStepIds = steps
        .filter(s => s.step_type === 'program' && s.step_id)
        .map(s => s.step_id);

      const completed = new Set<string>();

      if (courseStepIds.length > 0) {
        const { data: courseCompletions } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .in('course_id', courseStepIds)
          .not('completed_at', 'is', null);
        (courseCompletions || []).forEach((c: any) => completed.add(c.course_id));
      }

      if (programStepIds.length > 0) {
        const { data: programCompletions } = await supabase
          .from('program_members')
          .select('program_id')
          .eq('user_id', user.id)
          .in('program_id', programStepIds)
          .eq('status', 'completed');
        (programCompletions || []).forEach((p: any) => completed.add(p.program_id));
      }

      setCompletedStepIds(completed);
    } catch (err) {
      console.error('Failed to load pathway:', err);
      toast.error('Failed to load pathway');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelfReport(step: PathwayStep) {
    if (!user || !pathway) return;
    setSubmitting(true);
    try {
      // Update progress_pct on the enrollment
      const totalSteps = pathway.steps.length;
      const currentCompleted = completedStepIds.size + 1; // count this one
      const newPct = Math.min(100, Math.round((currentCompleted / totalSteps) * 100));
      const isComplete = newPct >= 100;

      await supabase
        .from('pathway_enrollments')
        .update({
          progress_pct: newPct,
          status: isComplete ? 'completed' : 'active',
          ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('pathway_id', pathway.id)
        .eq('user_id', user.id);

      // Mark step as complete locally for instant feedback
      setCompletedStepIds(prev => new Set([...prev, step.step_id || step.id]));
      setEnrollment(prev => prev ? {
        ...prev,
        progress_pct: newPct,
        status: isComplete ? 'completed' : 'active',
      } : prev);

      toast.success(
        step.verification_method === 'admin_verify'
          ? 'Report submitted — an admin will review it.'
          : 'Step marked as done!'
      );
      setReportingStepId(null);
      setEvidenceNote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip(step: PathwayStep) {
    if (!user || !pathway) return;
    setSkipping(step.id);
    try {
      setCompletedStepIds(prev => new Set([...prev, step.step_id || step.id]));
      toast.success('Step skipped');
    } finally {
      setSkipping(null);
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (notEnrolled || !pathway || !enrollment) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-16">
        <Compass className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Not enrolled in this pathway</h2>
        <Button variant="outline" asChild>
          <Link to="/browse-pathways">Browse Pathways</Link>
        </Button>
      </div>
    );
  }

  const steps = pathway.steps;
  const isPathwayComplete = enrollment.status === 'completed';

  // The current step = first step whose step_id is not in completedStepIds
  const currentStepIndex = steps.findIndex(
    s => !completedStepIds.has(s.step_id || s.id)
  );

  const completedCount = steps.filter(s => completedStepIds.has(s.step_id || s.id)).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">

      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/my-growth">
          <ArrowLeft className="w-4 h-4 mr-1" />
          My Growth
        </Link>
      </Button>

      {/* Pathway header */}
      <Card className="overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${pathway.color || 'from-indigo-500 to-purple-600'}`} />
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{pathway.name}</h1>
              {pathway.destination && (
                <p className="text-indigo-600 font-medium mt-1">→ {pathway.destination}</p>
              )}
              {pathway.description && (
                <p className="text-sm text-gray-500 mt-2">{pathway.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold text-indigo-600">{enrollment.progress_pct || 0}%</div>
              <div className="text-xs text-gray-400">progress</div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <Progress value={enrollment.progress_pct || 0} className="h-2.5" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{completedCount} of {steps.length} steps done</span>
              {isPathwayComplete && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Complete!
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pathway complete banner */}
      {isPathwayComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-5 text-center">
            <Trophy className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-green-800">Pathway Complete!</h2>
            <p className="text-sm text-green-700 mt-1">
              You finished all steps on{' '}
              {enrollment.completed_at
                ? new Date(enrollment.completed_at).toLocaleDateString()
                : 'this pathway'}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
          Steps
        </h2>

        {steps.map((step, index) => {
          const isCompleted = completedStepIds.has(step.step_id || step.id);
          const isCurrent = !isCompleted && index === currentStepIndex;
          const isUpcoming = !isCompleted && !isCurrent;
          const isActivity = step.step_type === 'activity';
          const isReporting = reportingStepId === step.id;
          const stepLink = getStepLink(step);
          const linkedTitle = getStepLinkedTitle(step);

          return (
            <div key={step.id}>
              <Card
                className={`overflow-hidden transition-shadow ${
                  isCurrent ? 'ring-2 ring-indigo-400 shadow-md' :
                  isCompleted ? 'opacity-75' : ''
                }`}
              >
                {/* Step type colour strip */}
                <div className={`h-0.5 ${
                  isCompleted ? 'bg-green-400' :
                  isCurrent ? 'bg-indigo-400' : 'bg-gray-200'
                }`} />

                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3">

                    {/* Step status icon */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Step number */}
                        <span className="text-xs text-gray-400 font-medium">
                          Step {index + 1}
                        </span>

                        {/* Current label */}
                        {isCurrent && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-0">
                            Up Next
                          </Badge>
                        )}

                        {/* Type badge */}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          step.step_type === 'course' ? 'text-blue-600 border-blue-200' :
                          step.step_type === 'program' ? 'text-purple-600 border-purple-200' :
                          'text-green-600 border-green-200'
                        }`}>
                          {step.step_type === 'course' ? <BookOpen className="w-2.5 h-2.5 mr-1 inline" /> :
                           step.step_type === 'program' ? <GraduationCap className="w-2.5 h-2.5 mr-1 inline" /> :
                           <Activity className="w-2.5 h-2.5 mr-1 inline" />}
                          {step.step_type}
                        </Badge>

                        {!step.is_required && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400">
                            optional
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <p className={`text-sm font-semibold mt-1 ${
                        isCompleted ? 'text-gray-400 line-through' :
                        isCurrent ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {step.title}
                      </p>

                      {/* Linked item */}
                      {linkedTitle && stepLink && (
                        <Link
                          to={stepLink}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {linkedTitle}
                        </Link>
                      )}

                      {/* Description */}
                      {step.description && (
                        <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                      )}

                      {/* Verification method note for activity steps */}
                      {isActivity && !isCompleted && step.verification_method === 'admin_verify' && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Requires admin approval after you report
                        </p>
                      )}
                    </div>

                    {/* Actions — right side */}
                    {!isCompleted && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Go button — opens in new tab so this pathway page stays open */}
                        {stepLink && (
                          <Button size="sm" asChild className={isCurrent ? '' : 'opacity-60'}>
                            <a href={stepLink} target="_blank" rel="noopener noreferrer">
                              {isCurrent ? (
                                <>Start <ArrowRight className="w-3 h-3 ml-1" /></>
                              ) : (
                                <>Go <ExternalLink className="w-3 h-3 ml-1" /></>
                              )}
                            </a>
                          </Button>
                        )}

                        {/* Self-report button for activity steps */}
                        {isActivity && (
                          <Button
                            size="sm"
                            variant={isReporting ? 'outline' : 'ghost'}
                            className="text-xs"
                            onClick={() => {
                              setReportingStepId(isReporting ? null : step.id);
                              setEvidenceNote('');
                            }}
                          >
                            {isReporting ? (
                              <><XCircle className="w-3 h-3 mr-1" />Cancel</>
                            ) : (
                              <><ClipboardCheck className="w-3 h-3 mr-1" />Done</>
                            )}
                          </Button>
                        )}

                        {/* Skip button */}
                        {step.allow_skip && !isActivity && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-gray-400 hover:text-amber-600"
                            disabled={skipping === step.id}
                            onClick={() => handleSkip(step)}
                          >
                            <SkipForward className="w-3 h-3 mr-1" />
                            Skip
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Self-report form — expands inline below */}
                  {isReporting && (
                    <div className="mt-3 ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <label className="text-xs font-medium text-gray-600 block">
                        What did you do? <span className="text-gray-400">(optional)</span>
                      </label>
                      <Textarea
                        value={evidenceNote}
                        onChange={e => setEvidenceNote(e.target.value)}
                        placeholder="e.g. Joined the Product Design circle on March 10..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSelfReport(step)}
                          disabled={submitting}
                          className="text-xs"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {submitting ? 'Submitting…' : 'Submit'}
                        </Button>
                        {step.verification_method === 'admin_verify' && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            An admin will review your submission
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="pt-2 pb-8">
        <Button variant="outline" size="sm" asChild>
          <Link to="/my-growth">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to My Growth
          </Link>
        </Button>
      </div>
    </div>
  );
}
