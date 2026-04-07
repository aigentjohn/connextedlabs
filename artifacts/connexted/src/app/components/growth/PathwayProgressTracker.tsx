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
}

interface EnrollmentEntry {
  enrollment: {
    pathway_id: string;
    user_id: string;
    enrolled_at: string;
    started_at: string | null;
    completed_at: string | null;
    current_step_index: number;
    completed_step_ids: string[];
    skipped_step_ids: string[];
    pending_step_ids: string[];
    progress_percentage: number;
    status: string;
    last_activity_at: string;
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
// API HELPER
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
    console.error(`Progress Tracker API ${path} error:`, errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    const msg = data.error || data.message || 'API error';
    throw new Error(msg);
  }

  return data;
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
      const data = await fetchAPI('/pathways/admin/progress');
      setEnrollments(data.enrollments || []);
      setPendingReports(data.pending_reports || []);
    } catch (error) {
      console.error('Error loading progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(approved: boolean) {
    if (!verifyingReport) return;
    setActionLoading(true);
    try {
      await fetchAPI(`/pathways/${verifyingReport.pathwayId}/verify-report`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: verifyingReport.userId,
          step_id: verifyingReport.stepId,
          approved,
          rejection_reason: !approved ? rejectionReason : undefined,
        }),
      });
      toast.success(approved ? 'Step verified!' : 'Report rejected');
      setVerifyingReport(null);
      setRejectionReason('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminComplete(pathwayId: string, userId: string, stepId: string) {
    setActionLoading(true);
    try {
      await fetchAPI(`/pathways/${pathwayId}/admin-complete`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, step_id: stepId }),
      });
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
            const hasPending = entry.reports.some(r => r.status === 'pending');

            return (
              <Card key={key} className={`overflow-hidden ${hasPending ? 'ring-1 ring-amber-200' : ''}`}>
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
                        <Progress value={entry.enrollment.progress_percentage} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">
                          {entry.enrollment.progress_percentage}%
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
                      {entry.enrollment.completed_step_ids.length}/{entry.pathway.steps.length} steps
                    </div>
                  </div>

                  {/* Expanded: step details */}
                  {isExpanded && (
                    <div className="mt-4 ml-8 space-y-1.5 border-t pt-3">
                      {entry.pathway.steps
                        .sort((a: PathwayStep, b: PathwayStep) => a.order_index - b.order_index)
                        .map((step: PathwayStep) => {
                          const isCompleted = entry.enrollment.completed_step_ids.includes(step.id);
                          const isSkipped = (entry.enrollment.skipped_step_ids || []).includes(step.id);
                          const isPending = (entry.enrollment.pending_step_ids || []).includes(step.id);
                          const report = entry.reports.find(r => r.step_id === step.id);

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

                              {/* Title */}
                              <span className={`flex-1 ${isCompleted ? 'text-green-700' : isPending ? 'text-amber-700' : 'text-gray-600'}`}>
                                {step.title}
                              </span>

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

                              {/* Report evidence & actions */}
                              {report && report.status === 'pending' && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setVerifyingReport({
                                      pathwayId: entry.pathway.id,
                                      userId: entry.enrollment.user_id,
                                      stepId: step.id,
                                      userName: entry.user.name,
                                      stepTitle: step.title,
                                      evidenceNote: report.evidence_note,
                                    })}
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> Review
                                  </button>
                                </div>
                              )}

                              {report && report.status === 'verified' && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200" variant="outline">
                                  <Check className="w-2.5 h-2.5 mr-0.5" /> Verified
                                </Badge>
                              )}

                              {report && report.status === 'rejected' && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200" variant="outline">
                                  <X className="w-2.5 h-2.5 mr-0.5" /> Rejected
                                </Badge>
                              )}

                              {/* Admin complete button for incomplete activity steps without pending */}
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