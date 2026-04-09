/**
 * Surveys Page
 *
 * Browse all active surveys, quizzes, and assessments.
 * Filterable by type. Members can see which ones they've completed.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { hasRoleLevel } from '@/lib/constants/roles';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  Brain,
  BarChart3,
  ArrowRight,
  Filter,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Survey {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  survey_type: 'survey' | 'quiz' | 'assessment';
  status: 'draft' | 'active' | 'closed';
  closes_at: string | null;
  tags: string[];
  allow_anonymous: boolean;
  passing_score: number | null;
  created_by: string;
  created_at: string;
  // computed
  question_count?: number;
  response_count?: number;
  is_completed?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const TYPE_CONFIG = {
  survey: {
    label: 'Survey',
    icon: ClipboardList,
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    iconColor: 'text-rose-600',
    bg: 'from-rose-500 to-pink-600',
    description: 'Share your thoughts',
  },
  quiz: {
    label: 'Quiz',
    icon: Brain,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
    bg: 'from-indigo-500 to-violet-600',
    description: 'Test your knowledge',
  },
  assessment: {
    label: 'Assessment',
    icon: BarChart3,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    bg: 'from-amber-500 to-orange-600',
    description: 'Discover your profile',
  },
};

function timeRemaining(closesAt: string | null): string | null {
  if (!closesAt) return null;
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h left`;
  return 'Closing soon';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SurveysPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'survey' | 'quiz' | 'assessment'>('all');

  const isAdmin = profile && hasRoleLevel(profile.role, 'admin');

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const query = supabase
        .from('surveys')
        .select('*, survey_questions(count), survey_responses(count)')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const surveysData: Survey[] = (data || []).map((s: any) => ({
        ...s,
        question_count: s.survey_questions?.[0]?.count ?? 0,
        response_count: s.survey_responses?.[0]?.count ?? 0,
      }));

      setSurveys(surveysData);

      // Check which ones the current user has completed
      if (profile?.id && surveysData.length > 0) {
        const { data: responses } = await supabase
          .from('survey_responses')
          .select('survey_id')
          .eq('user_id', profile.id)
          .in('survey_id', surveysData.map(s => s.id));

        setCompletedIds(new Set((responses || []).map((r: any) => r.survey_id)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }

  const filtered = surveys.filter(s => {
    if (typeFilter !== 'all' && s.survey_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.short_description || '').toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Surveys' }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-rose-600" />
            Surveys
          </h1>
          <p className="text-gray-600 mt-1">
            Surveys, quizzes, and assessments for this community.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/surveys/create')} className="bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Survey
          </Button>
        )}
      </div>

      {/* Search + Type Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search surveys..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {(['all', 'survey', 'quiz', 'assessment'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                typeFilter === t
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-1">
              {surveys.length === 0 ? 'No surveys yet' : 'No matching surveys'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {surveys.length === 0
                ? isAdmin
                  ? 'Create your first survey to get started.'
                  : 'No surveys have been published yet.'
                : 'Try adjusting your search or filters.'}
            </p>
            {surveys.length === 0 && isAdmin && (
              <Button
                className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => navigate('/surveys/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Survey
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(survey => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              isCompleted={completedIds.has(survey.id)}
              isAdmin={!!isAdmin}
              onClick={() => navigate(`/surveys/${survey.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SURVEY CARD
// ============================================================================

function SurveyCard({
  survey,
  isCompleted,
  isAdmin,
  onClick,
}: {
  survey: Survey;
  isCompleted: boolean;
  isAdmin: boolean;
  onClick: () => void;
}) {
  const config = TYPE_CONFIG[survey.survey_type];
  const Icon = config.icon;
  const remaining = timeRemaining(survey.closes_at);

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className={`h-1.5 bg-gradient-to-r ${config.bg}`} />
      <CardContent className="p-5 space-y-3">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 leading-tight">{survey.name}</h3>
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 border-0">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Done
                </Badge>
              )}
              {survey.status === 'closed' && (
                <Badge variant="outline" className="text-gray-500 text-[10px] px-1.5 py-0">
                  Closed
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {survey.short_description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {survey.short_description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {(survey.question_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {survey.question_count} question{survey.question_count !== 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && (survey.response_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {survey.response_count} response{survey.response_count !== 1 ? 's' : ''}
            </span>
          )}
          {remaining && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {remaining}
            </span>
          )}
        </div>

        {/* Tags */}
        {survey.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {survey.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-1">
          {isCompleted ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {survey.survey_type === 'quiz' ? 'Quiz complete — view your score' : 'Completed — view results'}
            </div>
          ) : survey.status === 'closed' ? (
            <div className="text-sm text-gray-400">This {config.label.toLowerCase()} is closed.</div>
          ) : (
            <Button size="sm" className={`w-full text-white bg-gradient-to-r ${config.bg}`}>
              {survey.survey_type === 'quiz' ? 'Take Quiz' :
               survey.survey_type === 'assessment' ? 'Start Assessment' : 'Take Survey'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
