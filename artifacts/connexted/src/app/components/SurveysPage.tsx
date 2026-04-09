/**
 * Surveys / Quizzes / Assessments Browse Page
 *
 * Single component registered under three routes:
 *   /surveys     → shows surveys only
 *   /quizzes     → shows quizzes only
 *   /assessments → shows assessments only
 *
 * Detects context from useLocation — no props needed.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
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
  passing_score: number | null;
  created_at: string;
  question_count?: number;
  response_count?: number;
  is_completed?: boolean;
}

type SurveyType = 'survey' | 'quiz' | 'assessment';

// ============================================================================
// CONFIG
// ============================================================================

const TYPE_CONFIG: Record<SurveyType, {
  label: string;
  labelPlural: string;
  icon: typeof ClipboardList;
  color: string;
  iconColor: string;
  bg: string;
  cta: string;
  emptyTitle: string;
  emptyAdmin: string;
  emptyMember: string;
}> = {
  survey: {
    label: 'Survey',
    labelPlural: 'Surveys',
    icon: ClipboardList,
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    iconColor: 'text-rose-600',
    bg: 'from-rose-500 to-pink-600',
    cta: 'Take Survey',
    emptyTitle: 'No surveys yet',
    emptyAdmin: 'Create your first survey to start collecting responses.',
    emptyMember: 'No surveys have been published yet.',
  },
  quiz: {
    label: 'Quiz',
    labelPlural: 'Quizzes',
    icon: Brain,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
    bg: 'from-indigo-500 to-violet-600',
    cta: 'Take Quiz',
    emptyTitle: 'No quizzes yet',
    emptyAdmin: 'Create your first quiz to start testing knowledge.',
    emptyMember: 'No quizzes have been published yet.',
  },
  assessment: {
    label: 'Assessment',
    labelPlural: 'Assessments',
    icon: BarChart3,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    bg: 'from-amber-500 to-orange-600',
    cta: 'Start Assessment',
    emptyTitle: 'No assessments yet',
    emptyAdmin: 'Create your first assessment to guide members to an outcome.',
    emptyMember: 'No assessments have been published yet.',
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

function useTypeContext(): { type: SurveyType; basePath: string } {
  const location = useLocation();
  if (location.pathname.startsWith('/quizzes')) return { type: 'quiz', basePath: '/quizzes' };
  if (location.pathname.startsWith('/assessments')) return { type: 'assessment', basePath: '/assessments' };
  return { type: 'survey', basePath: '/surveys' };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SurveysPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { type, basePath } = useTypeContext();
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const [items, setItems] = useState<Survey[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = profile && hasRoleLevel(profile.role, 'admin');

  useEffect(() => {
    setItems([]);
    setLoading(true);
    loadData();
  }, [type, profile?.id]);

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*, survey_questions(count), survey_responses(count)')
        .eq('survey_type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const surveysData: Survey[] = (data || []).map((s: any) => ({
        ...s,
        question_count: s.survey_questions?.[0]?.count ?? 0,
        response_count: s.survey_responses?.[0]?.count ?? 0,
      }));

      setItems(surveysData);

      if (profile?.id && surveysData.length > 0) {
        const { data: responses } = await supabase
          .from('survey_responses')
          .select('survey_id')
          .eq('user_id', profile.id)
          .in('survey_id', surveysData.map(s => s.id));

        setCompletedIds(new Set((responses || []).map((r: any) => r.survey_id)));
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to load ${config.labelPlural.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.short_description || '').toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: config.labelPlural }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
            {config.labelPlural}
          </h1>
          <p className="text-gray-600 mt-1">
            {type === 'survey' && 'Collect feedback and opinions from your community.'}
            {type === 'quiz' && 'Test knowledge and track scores across your community.'}
            {type === 'assessment' && 'Guide members to discover their profile or outcome.'}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => navigate(`${basePath}/create`)}
            className="text-white"
            style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New {config.label}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${config.labelPlural.toLowerCase()}…`}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Icon className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-1">
              {items.length === 0 ? config.emptyTitle : `No matching ${config.labelPlural.toLowerCase()}`}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {items.length === 0
                ? isAdmin ? config.emptyAdmin : config.emptyMember
                : 'Try adjusting your search.'}
            </p>
            {items.length === 0 && isAdmin && (
              <Button
                className="mt-4 text-white"
                onClick={() => navigate(`${basePath}/create`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First {config.label}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(item => (
            <SurveyCard
              key={item.id}
              survey={item}
              config={config}
              isCompleted={completedIds.has(item.id)}
              isAdmin={!!isAdmin}
              onClick={() => navigate(`${basePath}/${item.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CARD
// ============================================================================

function SurveyCard({
  survey,
  config,
  isCompleted,
  isAdmin,
  onClick,
}: {
  survey: Survey;
  config: typeof TYPE_CONFIG[SurveyType];
  isCompleted: boolean;
  isAdmin: boolean;
  onClick: () => void;
}) {
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
                <Badge variant="outline" className="text-gray-500 text-[10px] px-1.5 py-0">Closed</Badge>
              )}
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-1 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
        </div>

        {survey.short_description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{survey.short_description}</p>
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

        {survey.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {survey.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">{tag}</Badge>
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
              {config.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
