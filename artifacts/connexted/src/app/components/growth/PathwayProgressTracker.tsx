/**
 * Pathway Progress Tracker (Admin Dashboard)
 *
 * Shows all enrolled members across pathways, their step-by-step progress,
 * pending self-reports for activity steps, and admin actions to verify/reject
 * or directly complete steps.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Compass,
  BookOpen,
  GraduationCap,
  Activity,
  ClipboardCheck,
  XCircle,
  Check,
  X,
  BarChart3,
  TrendingUp,
  Eye,
  UserCheck,
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
  activity_criteria?: { target_id?: string; target_title?: string } | null;
}

interface EnrollmentEntry {
  enrollment: {
    pathway_id: string;
    user_id: string;
    enrolled_at: string;
    completed_at: string | null;
    progress_pct: number;
    status: string;
  };
  pathway: {
    id: string;
    name: string;
    color: string;
    steps: PathwayStep[];
  };
  user: {
    name: string;
    email: string;
  };
  reports: StepReport[];
}

interface StepReport {
  pathway_id: string;
  step_id: string;
  user_id: string;
  reported_at: string;
  status: 'pending' | 'verified' | 'rejected';
  evidence_note: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PathwayProgressTracker() {
  const { profile } = useAuth();

  const [enrollments, setEnrollments] = useState<EnrollmentEntry[]>([]);
  const [pendingReports, setPendingReports] = useState<StepReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPathway, setFilterPathway] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Verification dialog
  const [verifyingReport, setVerifyingReport] = useState<{
    pathwayId: string;
    userId: string;
    stepId: string;
    userName: string;
    stepTitle: string;
    evidenceNote: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile && hasRoleLevel(profile.role, 'admin')) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pathway_enrollments')
        .select('*, pathways(*, pathway_steps(*)), users(id, name, email)');

      if (error) throw error;

      const entries: EnrollmentEntry[] = (data || []).map((e: any) => ({
        enrollment: {
          pathway_id: e.pathway_id,
          user_id: e.user_id,
          enrolled_at: e.enrolled_at,
          completed_at: e.completed_at,
          progress_pct: e.progress_pct || 0,
          status: e.status,
        },
        pathway: {
          id: e.pathways?.id,
          name: e.pathways?.name,
          color: e.pathways?.color,
          steps: (e.pathways?.pathway_steps || []).sort(
            (a: any, b: any) => a.order_index - b.order_index
          ),
        },
        user: {
          name: e.users?.name || 'Unknown',
          email: e.users?.email || '',
        },
        reports: [],
      }));

      setEnrollments(entries);
      setPendingReports([]);
    } catch (error) {
      console.error('Error loading progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(_approved: boolean) {
    // Self-report verification requires a pathway_step_reports table not yet created.
    toast.error('Self-report verification is not yet available.');
    setVerifyingReport(null);
    setRejectionReason('');
  }

  async function handleAdminComplete(pathwayId: string, userId: string, _stepId: string) {
    setActionLoading(true);
    try {
      const { data: pathwayData } = await supabase
        .from('pathways')
        .select('pathway_steps(id)')
        .eq('id', pathwayId)
        .single();

      const totalSteps = (pathwayData as any)?.pathway_steps?.length ?? 1;

      const { data: enrollment } = await supabase
        .from('pathway_enrollments')
        .select('progress_pct')
        .eq('pathway_id', pathwayId)
        .eq('user_id', userId)
        .single();

      if (!enrollment) throw new Error('Enrollment not found');

      const currentPct = (enrollment as any).progress_pct ?? 0;
      const stepPct = Math.round(100 / totalSteps);
      const newPct = Math.min(100, currentPct + stepPct);
      const isComplete = newPct >= 100;

      const { error } = await supabase
        .from('pathway_enrollments')
        .update({
          progress_pct: newPct,
          status: isComplete ? 'completed' : 'active',
          ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('pathway_id', pathwayId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Step marked as complete');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete step');
    } finally {
      setActionLoading(false);
    }
  }

  function toggleExpanded(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!profile || !hasRoleLevel(profile.role, 'admin')) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  // Get unique pathways for filter
  const pathwayOptions = Array.from(
    new Map(enrollments.map(e => [e.pathway.id, e.pathway])).values()
  );

  // Filter
  let filtered = enrollments;
  if (filterPathway !== 'all') {
    filtered = filtered.filter(e => e.pathway.id === filterPathway);
  }
  if (filterStatus !== 'all') {
    filtered = filtered.filter(e => e.enrollment.status === filterStatus);
  }
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(
      e => e.user.name.toLowerCase().includes(q) || e.user.email.toLowerCase().includes(q)
    );
  }

  // Stats
  const totalEnrolled = enrollments.length;
  const totalActive = enrollments.filter(e => e.enrollment.status === 'active').length;
  const totalCompleted = enrollments.filter(e => e.enrollment.status === 'completed').length;
  const totalPending = pendingReports.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Admin', path: '/platform-admin' },
          { label: 'Pathways', path: '/platform-admin/pathways' },
          { label: 'Progress Tracker', path: '/platform-admin/pathway-progress' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-indigo-600" />
          Pathway Progress Tracker
        </h1>
        <p className="text-gray-600 mt-1">
          Monitor member progress, review self-reports, and manage pathway completions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Total Enrolled" value={loading ? '...' : String(totalEnrolled)} />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-green-600" />} label="Active" value={loading ? '...' : String(totalActive)} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} label="Completed" value={loading ? '...' : String(totalCompleted)} />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          label="Pending Reports"
          value={loading ? '...' : String(totalPending)}
          highlight={totalPending > 0}
        />
      </div>

      {/* Pending Reports Alert */}
      {totalPending > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">
                  {totalPending} pending self-report{totalPending !== 1 ? 's' : ''} need review
                </h3>
                <p className="text-sm text-amber-700 mt-0.5">
                  Members have reported completing activity steps. Review their evidence and approve or reject below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select value={filterPathway} onValueChange={setFilterPathway}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Pathways" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pathways</SelectItem>
            {pathwayOptions.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enrollments Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No Enrollments Found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {enrollments.length === 0
                ? 'No members have enrolled in any pathways yet.'
                : 'No enrollments match the current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const key = `${entry.enrollment.pathway_id}:${entry.enrollment.user_id}`;
            const isExpanded = expandedRows.has(key);
            const hasPending = false;

            return (
              <Card key={key} className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${entry.pathway.color || 'from-indigo-500 to-purple-600'}`} />
                <CardContent className="py-3">
                  {/* Main row */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleExpanded(key)}
                      className="flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* User info */}
                    <div className="min-w-[160px]">
                      <div className="font-medium text-sm">{entry.user.name}</div>
                      <div className="text-xs text-gray-400">{entry.user.email}</div>
                    </div>

                    {/* Pathway name */}
                    <div className="min-w-[140px]">
                      <Badge variant="outline" className="text-xs">
                        <Compass className="w-3 h-3 mr-1" />
                        {entry.pathway.name}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div className="flex-1 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={entry.enrollment.progress_pct || 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">
                          {entry.enrollment.progress_pct || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <Badge
                      variant={entry.enrollment.status === 'completed' ? 'default' : 'outline'}
                      className={`text-xs ${
                        entry.enrollment.status === 'completed' ? 'bg-green-600' :
                        entry.enrollment.status === 'active' ? 'text-blue-600 border-blue-200' :
                        'text-gray-500'
                      }`}
                    >
                      {entry.enrollment.status}
                    </Badge>

                    {/* Pending indicator */}
                    {hasPending && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200" variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}

                    {/* Steps summary */}
                    <div className="text-xs text-gray-400 min-w-[80px] text-right">
                      {entry.pathway.steps.length} steps
                    </div>
                  </div>

                  {/* Expanded: step details */}
                  {isExpanded && (
                    <div className="mt-4 ml-8 space-y-1.5 border-t pt-3">
                      {entry.pathway.steps
                        .sort((a: PathwayStep, b: PathwayStep) => a.order_index - b.order_index)
                        .map((step: PathwayStep) => {
                          const isCompleted = false;
                          const isSkipped = false;
                          const isPending = false;

                          return (
                            <div
                              key={step.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
                                isCompleted ? 'bg-green-50' :
                                isPending ? 'bg-amber-50' :
                                isSkipped ? 'bg-gray-50' : 'bg-white'
                              }`}
                            >
                              {/* Status icon */}
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : isPending ? (
                                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              )}

                              {/* Step type icon */}
                              {step.step_type === 'course' ? (
                                <BookOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              ) : step.step_type === 'program' ? (
                                <GraduationCap className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                              ) : (
                                <Activity className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              )}

                              {/* Title + assigned item */}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${isCompleted ? 'text-green-700' : isPending ? 'text-amber-700' : 'text-gray-600'}`}>
                                  {step.title}
                                </span>
                                {step.activity_criteria?.target_title && (
                                  <span className="block text-[11px] text-indigo-500 truncate">
                                    {step.activity_criteria.target_title}
                                  </span>
                                )}
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {step.step_type}
                                </Badge>
                                {step.step_type === 'activity' && step.verification_method && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-500">
                                    {step.verification_method === 'self_report' ? 'self-report' :
                                     step.verification_method === 'admin_verify' ? 'admin-verify' : 'auto'}
                                  </Badge>
                                )}
                              </div>

                              {/* Admin complete button for incomplete activity steps */}
                              {!isCompleted && !isPending && !isSkipped && step.step_type === 'activity' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-6 px-2"
                                  onClick={() => handleAdminComplete(entry.pathway.id, entry.enrollment.user_id, step.id)}
                                  disabled={actionLoading}
                                >
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Complete
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verification Dialog (inline modal) */}
      {verifyingReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                Review Self-Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Member</div>
                <div className="font-medium">{verifyingReport.userName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Step</div>
                <div className="font-medium">{verifyingReport.stepTitle}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Evidence / Notes</div>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                  {verifyingReport.evidenceNote || <span className="text-gray-400 italic">No notes provided</span>}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Rejection Reason (optional)</div>
                <Textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="If rejecting, explain why..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setVerifyingReport(null); setRejectionReason(''); }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleVerify(false)}
                  disabled={actionLoading}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleVerify(true)}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {actionLoading ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'ring-1 ring-amber-200 bg-amber-50/30' : ''}>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}