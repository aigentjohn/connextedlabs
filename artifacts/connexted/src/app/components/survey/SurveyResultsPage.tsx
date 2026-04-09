/**
 * Survey Results Page
 *
 * Admin sees aggregated results across all responses.
 * - Survey:     per-question option counts with percentages; text responses listed
 * - Quiz:       average score, pass rate, per-question correct-answer rate
 * - Assessment: conclusion distribution
 * All modes:    total responses, response list with user info
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ClipboardList,
  Brain,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Download,
  Star,
  Award,
  TrendingUp,
  MessageSquare,
  Hash,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Option { id: string; text: string; }

interface Question {
  id: string;
  order_index: number;
  question_type: 'multiple_choice' | 'multi_select' | 'text' | 'long_text' | 'rating' | 'yes_no';
  text: string;
  description: string | null;
  options: Option[];
  correct_option_ids: string[];
  points: number;
  explanation: string | null;
  weights: Record<string, Record<string, number>>;
  rating_min: number;
  rating_max: number;
  rating_min_label: string | null;
  rating_max_label: string | null;
}

interface Conclusion {
  id: string;
  key: string;
  title: string;
  description: string;
  recommendation: string | null;
  color: string;
  order_index: number;
}

interface Survey {
  id: string;
  name: string;
  slug: string;
  survey_type: 'survey' | 'quiz' | 'assessment';
  status: 'draft' | 'active' | 'closed';
  passing_score: number | null;
  questions: Question[];
  conclusions: Conclusion[];
}

interface Response {
  id: string;
  user_id: string | null;
  answers: Record<string, any>;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  conclusion_key: string | null;
  submitted_at: string;
  user?: { name: string; email: string } | null;
}

// ============================================================================
// HELPERS
// ============================================================================

const TYPE_CONFIG = {
  survey:     { label: 'Survey',     Icon: ClipboardList, bg: 'from-rose-500 to-pink-600',    iconColor: 'text-rose-600'   },
  quiz:       { label: 'Quiz',       Icon: Brain,         bg: 'from-indigo-500 to-violet-600', iconColor: 'text-indigo-600' },
  assessment: { label: 'Assessment', Icon: BarChart3,      bg: 'from-amber-500 to-orange-600', iconColor: 'text-amber-600'  },
};

const CONCLUSION_GRADIENTS: Record<string, string> = {
  'from-rose-400 to-pink-500':     'bg-gradient-to-r from-rose-400 to-pink-500',
  'from-indigo-400 to-violet-500': 'bg-gradient-to-r from-indigo-400 to-violet-500',
  'from-amber-400 to-orange-500':  'bg-gradient-to-r from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500':  'bg-gradient-to-r from-emerald-400 to-teal-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================================
// AGGREGATE HELPERS
// ============================================================================

function getOptionCounts(questionId: string, options: Option[], responses: Response[]): { option: Option; count: number; pct: number }[] {
  const total = responses.length;
  return options.map(opt => {
    const count = responses.filter(r => {
      const ans = r.answers[questionId];
      if (!ans) return false;
      return Array.isArray(ans) ? ans.includes(opt.id) : ans === opt.id;
    }).length;
    return { option: opt, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

function getRatingDistribution(questionId: string, min: number, max: number, responses: Response[]) {
  const total = responses.length;
  const dist: { value: number; count: number; pct: number }[] = [];
  for (let v = min; v <= max; v++) {
    const count = responses.filter(r => Number(r.answers[questionId]) === v).length;
    dist.push({ value: v, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 });
  }
  const answered = responses.filter(r => r.answers[questionId] != null).length;
  const avg = answered > 0
    ? responses.reduce((sum, r) => sum + (Number(r.answers[questionId]) || 0), 0) / answered
    : null;
  return { dist, avg };
}

function getTextResponses(questionId: string, responses: Response[]): string[] {
  return responses
    .map(r => r.answers[questionId])
    .filter(Boolean)
    .map(String)
    .filter(s => s.trim().length > 0);
}

function getQuizQuestionCorrectRate(question: Question, responses: Response[]) {
  const answered = responses.filter(r => r.answers[question.id] != null);
  if (answered.length === 0) return { correct: 0, total: 0, rate: 0 };
  const correct = answered.filter(r => {
    const ans = r.answers[question.id];
    const ansArr = Array.isArray(ans) ? ans : [ans];
    const corrArr = question.correct_option_ids;
    return ansArr.length === corrArr.length &&
      ansArr.every((a: string) => corrArr.includes(a)) &&
      corrArr.every(c => ansArr.includes(c));
  }).length;
  return { correct, total: answered.length, rate: Math.round((correct / answered.length) * 100) };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SurveyResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'responses'>('questions');

  const isAdmin = profile && hasRoleLevel(profile.role, 'admin');

  useEffect(() => {
    if (!isAdmin) { navigate('/surveys'); return; }
    loadData();
  }, [slug, isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      // Load survey
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*, survey_questions(*), survey_conclusions(*)')
        .eq('slug', slug)
        .single();
      if (surveyError) throw surveyError;

      const questions: Question[] = (surveyData.survey_questions || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((q: any) => ({
          ...q,
          options: q.options || [],
          correct_option_ids: q.correct_option_ids || [],
          weights: q.weights || {},
        }));

      const conclusions: Conclusion[] = (surveyData.survey_conclusions || [])
        .sort((a: any, b: any) => a.order_index - b.order_index);

      setSurvey({ ...surveyData, questions, conclusions });

      // Load responses with user info
      const { data: respData, error: respError } = await supabase
        .from('survey_responses')
        .select('*, users(name, email)')
        .eq('survey_id', surveyData.id)
        .order('submitted_at', { ascending: false });
      if (respError) throw respError;

      setResponses((respData || []).map((r: any) => ({
        ...r,
        user: r.users || null,
      })));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!survey || responses.length === 0) return;
    const headers = ['submitted_at', 'user_name', 'user_email',
      ...survey.questions.map(q => `q_${q.order_index + 1}_${q.text.slice(0, 30).replace(/,/g, '')}`),
      ...(survey.survey_type === 'quiz' ? ['score', 'max_score', 'passed'] : []),
      ...(survey.survey_type === 'assessment' ? ['conclusion'] : []),
    ];

    const rows = responses.map(r => {
      const answers = survey.questions.map(q => {
        const ans = r.answers[q.id];
        if (!ans) return '';
        if (Array.isArray(ans)) {
          return ans.map(id => {
            const opt = q.options.find(o => o.id === id);
            return opt ? opt.text : id;
          }).join('; ');
        }
        const opt = q.options.find(o => o.id === ans);
        return opt ? opt.text : String(ans);
      });

      return [
        formatDate(r.submitted_at),
        r.user?.name || 'Anonymous',
        r.user?.email || '',
        ...answers,
        ...(survey.survey_type === 'quiz' ? [r.score ?? '', r.max_score ?? '', r.passed ? 'Yes' : 'No'] : []),
        ...(survey.survey_type === 'assessment' ? [r.conclusion_key ?? ''] : []),
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey.slug}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <ResultsSkeleton />;
  if (!survey) return null;

  const config = TYPE_CONFIG[survey.survey_type];
  const Icon = config.Icon;
  const total = responses.length;

  // Quiz aggregates
  const quizAvg = survey.survey_type === 'quiz' && total > 0
    ? responses.reduce((s, r) => s + (r.score ?? 0), 0) / total
    : null;
  const quizMaxAvg = survey.survey_type === 'quiz' && total > 0
    ? responses.reduce((s, r) => s + (r.max_score ?? 0), 0) / total
    : null;
  const passCount = responses.filter(r => r.passed === true).length;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Surveys', href: '/surveys' }, { label: survey.name, href: `/surveys/${survey.slug}` }, { label: 'Results' }]} />

      {/* Header */}
      <div className={`rounded-xl bg-gradient-to-r ${config.bg} p-5 text-white`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{survey.name}</h1>
              <p className="text-white/80 text-sm mt-0.5">{config.label} Results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => navigate(`/surveys/${survey.slug}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Survey
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={exportCsv}
              disabled={total === 0}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-gray-500" />} label="Total Responses" value={total} />
        {survey.survey_type === 'quiz' && (
          <>
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
              label="Avg Score"
              value={quizAvg !== null && quizMaxAvg ? `${Math.round(quizAvg)}/${Math.round(quizMaxAvg)}` : '—'}
            />
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              label="Pass Rate"
              value={total > 0 ? `${passRate}%` : '—'}
              sub={`${passCount} of ${total} passed`}
            />
            <StatCard
              icon={<Award className="w-5 h-5 text-amber-500" />}
              label="Passing Score"
              value={survey.passing_score != null ? `${survey.passing_score}%` : 'None set'}
            />
          </>
        )}
        {survey.survey_type === 'assessment' && (
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-amber-500" />}
            label="Conclusions"
            value={survey.conclusions.length}
            sub="outcome categories"
          />
        )}
        {survey.survey_type === 'survey' && (
          <StatCard
            icon={<ClipboardList className="w-5 h-5 text-rose-500" />}
            label="Questions"
            value={survey.questions.length}
          />
        )}
      </div>

      {/* Assessment: conclusion distribution */}
      {survey.survey_type === 'assessment' && total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Conclusion Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {survey.conclusions.map(c => {
              const count = responses.filter(r => r.conclusion_key === c.key).length;
              const pct = Math.round((count / total) * 100);
              const grad = CONCLUSION_GRADIENTS[c.color] || 'bg-gradient-to-r from-gray-400 to-gray-500';
              return (
                <div key={c.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{c.title}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${grad}`}
                      style={{ width: `${pct}%`, transition: 'width 0.4s ease' }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['questions', 'responses'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'questions' ? 'Question Breakdown' : `Responses (${total})`}
          </button>
        ))}
      </div>

      {/* Questions tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {survey.questions.length === 0 && (
            <Card><CardContent className="py-12 text-center text-gray-400 text-sm">No questions found.</CardContent></Card>
          )}
          {survey.questions.map((q, idx) => (
            <QuestionResultCard
              key={q.id}
              question={q}
              index={idx}
              responses={responses}
              surveyType={survey.survey_type}
            />
          ))}
        </div>
      )}

      {/* Responses tab */}
      {activeTab === 'responses' && (
        <div className="space-y-3">
          {total === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400 text-sm">No responses yet.</CardContent></Card>
          ) : (
            responses.map(r => (
              <ResponseRow
                key={r.id}
                response={r}
                survey={survey}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QUESTION RESULT CARD
// ============================================================================

function QuestionResultCard({
  question,
  index,
  responses,
  surveyType,
}: {
  question: Question;
  index: number;
  responses: Response[];
  surveyType: 'survey' | 'quiz' | 'assessment';
}) {
  const answered = responses.filter(r => {
    const ans = r.answers[question.id];
    if (ans == null) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    return String(ans).trim().length > 0;
  }).length;
  const skipped = responses.length - answered;

  const isChoice = ['multiple_choice', 'multi_select', 'yes_no'].includes(question.question_type);
  const isText = ['text', 'long_text'].includes(question.question_type);
  const isRating = question.question_type === 'rating';

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Question header */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{question.text}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize text-gray-500">
                {question.question_type.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-gray-400">{answered} answered · {skipped} skipped</span>
              {surveyType === 'quiz' && isChoice && (() => {
                const { correct, total: tot, rate } = getQuizQuestionCorrectRate(question, responses);
                return (
                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    {correct}/{tot} correct ({rate}%)
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Choice results */}
        {isChoice && answered > 0 && (
          <div className="space-y-2 pl-10">
            {getOptionCounts(question.id, question.options, responses).map(({ option, count, pct }) => {
              const isCorrect = question.correct_option_ids.includes(option.id);
              return (
                <div key={option.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      {surveyType === 'quiz' && (
                        isCorrect
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`${surveyType === 'quiz' && isCorrect ? 'font-medium text-emerald-700' : 'text-gray-700'}`}>
                        {option.text}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        surveyType === 'quiz' && isCorrect
                          ? 'bg-emerald-400'
                          : 'bg-rose-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rating results */}
        {isRating && answered > 0 && (() => {
          const { dist, avg } = getRatingDistribution(question.id, question.rating_min, question.rating_max, responses);
          const maxCount = Math.max(...dist.map(d => d.count), 1);
          return (
            <div className="pl-10 space-y-3">
              {avg !== null && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-amber-400" />
                  Average: <span className="font-semibold">{avg.toFixed(1)}</span>
                  <span className="text-gray-400">/ {question.rating_max}</span>
                </div>
              )}
              <div className="flex items-end gap-1.5">
                {dist.map(d => (
                  <div key={d.value} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{d.count > 0 ? d.count : ''}</span>
                    <div className="w-full bg-gray-100 rounded-sm overflow-hidden" style={{ height: 48 }}>
                      <div
                        className="w-full bg-indigo-300 rounded-sm transition-all duration-300"
                        style={{ height: `${(d.count / maxCount) * 100}%`, marginTop: `${100 - (d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-600">{d.value}</span>
                  </div>
                ))}
              </div>
              {(question.rating_min_label || question.rating_max_label) && (
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{question.rating_min_label}</span>
                  <span>{question.rating_max_label}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Text responses */}
        {isText && (() => {
          const texts = getTextResponses(question.id, responses);
          if (texts.length === 0) return <p className="text-sm text-gray-400 pl-10">No text responses yet.</p>;
          return (
            <div className="pl-10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MessageSquare className="w-3.5 h-3.5" />
                {texts.length} response{texts.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {texts.map((t, i) => (
                  <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Quiz explanation */}
        {surveyType === 'quiz' && question.explanation && (
          <div className="pl-10 bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800 border border-indigo-100">
            <span className="font-medium">Explanation:</span> {question.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RESPONSE ROW
// ============================================================================

function ResponseRow({ response, survey }: { response: Response; survey: Survey }) {
  const [expanded, setExpanded] = useState(false);

  const conclusion = survey.survey_type === 'assessment'
    ? survey.conclusions.find(c => c.key === response.conclusion_key)
    : null;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
              {(response.user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{response.user?.name || 'Anonymous'}</div>
              {response.user?.email && (
                <div className="text-xs text-gray-400">{response.user.email}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {survey.survey_type === 'quiz' && (
              <>
                <span className="text-sm text-gray-600">
                  <Hash className="w-3.5 h-3.5 inline mr-0.5" />
                  {response.score ?? 0}/{response.max_score ?? 0}
                </span>
                <Badge
                  className={`text-xs ${
                    response.passed
                      ? 'bg-emerald-100 text-emerald-700 border-0'
                      : 'bg-red-100 text-red-700 border-0'
                  }`}
                >
                  {response.passed ? 'Passed' : 'Failed'}
                </Badge>
              </>
            )}
            {survey.survey_type === 'assessment' && conclusion && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                {conclusion.title}
              </Badge>
            )}
            <span className="text-xs text-gray-400">{formatDate(response.submitted_at)}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-gray-50 space-y-2">
          {survey.questions.map(q => {
            const ans = response.answers[q.id];
            if (!ans) return null;
            const display = Array.isArray(ans)
              ? ans.map(id => q.options.find(o => o.id === id)?.text || id).join(', ')
              : q.options.find(o => o.id === ans)?.text || String(ans);
            return (
              <div key={q.id} className="text-sm">
                <span className="text-gray-500">{q.text}: </span>
                <span className="text-gray-900">{display}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function ResultsSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  );
}
