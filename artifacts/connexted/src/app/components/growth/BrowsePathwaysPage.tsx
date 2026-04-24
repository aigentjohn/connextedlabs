/**
 * Browse Pathways Page
 *
 * Community-wide catalog of all published pathways.
 * Members can browse, filter by topic/tag, and enroll in any pathway.
 * Shows enrollment status and progress for pathways already started.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Compass,
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  Filter,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PathwayStep {
  id: string;
  step_type: 'course' | 'program' | 'activity';
  title: string;
  is_required: boolean;
}

interface Pathway {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  destination: string;
  steps: PathwayStep[];
  relevant_tags: string[];
  target_roles: string[];
  target_career_stages: string[];
  completion_badge_type_id: string | null;
  estimated_hours: number | null;
  color: string;
  is_featured: boolean;
  enrollment_count: number;
  completion_count: number;
  status: string;
  created_by: string;
}

interface EnrollmentMap {
  [pathwayId: string]: {
    status: string;
    progress_pct: number;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BrowsePathwaysPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentMap>({});
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: pathwaysData, error: pathwaysError } = await supabase
        .from('pathways')
        .select('*, pathway_steps(*)')
        .eq('status', 'published')
        .order('is_featured', { ascending: false });

      if (pathwaysError) throw pathwaysError;

      setPathways(
        (pathwaysData || []).map((p: any) => ({
          ...p,
          steps: (p.pathway_steps || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }))
      );

      if (profile?.id) {
        const { data: enrollData } = await supabase
          .from('pathway_enrollments')
          .select('pathway_id, status, progress_pct')
          .eq('user_id', profile.id);

        const map: EnrollmentMap = {};
        for (const e of (enrollData || [])) {
          map[e.pathway_id] = { status: e.status, progress_pct: e.progress_pct || 0 };
        }
        setEnrollments(map);
      }
    } catch (err) {
      console.error('Error loading pathways:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(pathwayId: string) {
    if (!profile) {
      toast.error('Sign in to enroll in a pathway');
      return;
    }
    setEnrolling(pathwayId);
    try {
      const { data: existing } = await supabase
        .from('pathway_enrollments')
        .select('id')
        .eq('pathway_id', pathwayId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('pathway_enrollments')
          .insert({ pathway_id: pathwayId, user_id: profile.id });
        if (error) throw error;
      }

      toast.success('Enrolled! Head to My Pathways to start.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  }

  async function handleUnenroll(pathwayId: string) {
    if (!profile) return;
    const pathway = pathways.find(p => p.id === pathwayId);
    if (pathway?.created_by === profile.id) {
      const confirmed = window.confirm(
        `You created "${pathway.name}". Unenrolling will remove your progress but the pathway stays published for others. Continue?`
      );
      if (!confirmed) return;
    }
    try {
      const { error } = await supabase
        .from('pathway_enrollments')
        .delete()
        .eq('pathway_id', pathwayId)
        .eq('user_id', profile.id);
      if (error) throw error;
      toast.success('Unenrolled from pathway.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unenroll');
    }
  }

  // Collect all unique tags and roles for filter chips
  const allTags = Array.from(new Set(pathways.flatMap(p => p.relevant_tags || []))).sort();
  const allRoles = Array.from(new Set(pathways.flatMap(p => p.target_roles || []))).sort();

  // Apply filters
  const filtered = pathways.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.destination || '').toLowerCase().includes(q) ||
      (p.short_description || '').toLowerCase().includes(q) ||
      (p.relevant_tags || []).some(t => t.toLowerCase().includes(q));
    const matchesTag = !activeTag || (p.relevant_tags || []).includes(activeTag);
    const matchesRole = !activeRole || (p.target_roles || []).includes(activeRole);
    return matchesSearch && matchesTag && matchesRole;
  });

  const featured = filtered.filter(p => p.is_featured);
  const rest = filtered.filter(p => !p.is_featured);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Browse Pathways' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Compass className="w-8 h-8 text-indigo-600" />
          Browse Pathways
        </h1>
        <p className="text-gray-600 mt-1">
          Structured growth journeys created for this community. Enroll in one to start tracking your progress.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pathways by name, goal, or tag..."
            className="pl-9"
          />
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {allTags.slice(0, 12).map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeTag === tag
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
            {allRoles.slice(0, 6).map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(activeRole === role ? null : role)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeRole === role
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {role}
              </button>
            ))}
            {(activeTag || activeRole) && (
              <button
                onClick={() => { setActiveTag(null); setActiveRole(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Compass className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-1">
              {pathways.length === 0 ? 'No pathways yet' : 'No matching pathways'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {pathways.length === 0
                ? 'The community admin hasn\'t published any pathways yet.'
                : 'Try adjusting your search or clearing the filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Featured */}
          {featured.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Featured
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {featured.map(p => (
                  <PathwayCard
                    key={p.id}
                    pathway={p}
                    enrollment={enrollments[p.id]}
                    enrolling={enrolling === p.id}
                    onEnroll={() => handleEnroll(p.id)}
                    onUnenroll={() => handleUnenroll(p.id)}
                    onViewProgress={() => navigate(`/my-growth/pathway/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All */}
          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  All Pathways
                </h2>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {rest.map(p => (
                  <PathwayCard
                    key={p.id}
                    pathway={p}
                    enrollment={enrollments[p.id]}
                    enrolling={enrolling === p.id}
                    onEnroll={() => handleEnroll(p.id)}
                    onUnenroll={() => handleUnenroll(p.id)}
                    onViewProgress={() => navigate(`/my-growth/pathway/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PATHWAY CARD
// ============================================================================

function PathwayCard({
  pathway,
  enrollment,
  enrolling,
  onEnroll,
  onUnenroll,
  onViewProgress,
}: {
  pathway: Pathway;
  enrollment?: EnrollmentMap[string];
  enrolling: boolean;
  onEnroll: () => void;
  onUnenroll: () => void;
  onViewProgress: () => void;
}) {
  const isEnrolled = !!enrollment;
  const isCompleted = enrollment?.status === 'completed';

  const courseSteps = pathway.steps.filter(s => s.step_type === 'course').length;
  const programSteps = pathway.steps.filter(s => s.step_type === 'program').length;
  const activitySteps = pathway.steps.filter(s => s.step_type === 'activity').length;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Color bar */}
      <div className={`h-1.5 bg-gradient-to-r ${pathway.color || 'from-indigo-500 to-purple-600'}`} />
      <CardContent className="p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${pathway.color || 'from-indigo-500 to-purple-600'} flex items-center justify-center flex-shrink-0`}>
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 leading-tight">{pathway.name}</h3>
              {pathway.is_featured && (
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-1.5 py-0">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />Featured
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 border-0">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Done
                </Badge>
              )}
            </div>
            {pathway.destination && (
              <p className="text-sm text-indigo-600 mt-0.5 font-medium leading-snug">
                → {pathway.destination}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {(pathway.short_description || pathway.description) && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {pathway.short_description || pathway.description}
          </p>
        )}

        {/* Step composition */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {courseSteps > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              {courseSteps} course{courseSteps !== 1 ? 's' : ''}
            </span>
          )}
          {programSteps > 0 && (
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              {programSteps} program{programSteps !== 1 ? 's' : ''}
            </span>
          )}
          {activitySteps > 0 && (
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              {activitySteps} activit{activitySteps !== 1 ? 'ies' : 'y'}
            </span>
          )}
          {pathway.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              ~{pathway.estimated_hours}h
            </span>
          )}
          {pathway.enrollment_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {pathway.enrollment_count} enrolled
            </span>
          )}
        </div>

        {/* Tags */}
        {pathway.relevant_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pathway.relevant_tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Progress bar (if enrolled) */}
        {isEnrolled && !isCompleted && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{Math.round(enrollment.progress_pct)}%</span>
            </div>
            <Progress value={enrollment.progress_pct} className="h-1.5" />
          </div>
        )}

        {/* Action */}
        <div className="pt-1 space-y-2">
          {isCompleted ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Pathway complete!
              </div>
              <button
                onClick={onUnenroll}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Unenroll
              </button>
            </div>
          ) : isEnrolled ? (
            <div className="space-y-1.5">
              <Button size="sm" variant="default" onClick={onViewProgress} className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Continue Pathway
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
              <div className="text-center">
                <button
                  onClick={onUnenroll}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Unenroll from this pathway
                </button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onEnroll}
              disabled={enrolling}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {enrolling ? 'Enrolling...' : 'Enroll in Pathway'}
              {!enrolling && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
