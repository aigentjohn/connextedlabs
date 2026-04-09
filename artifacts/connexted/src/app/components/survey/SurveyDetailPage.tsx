/**
 * Survey Detail Page
 *
 * Member takes the survey / quiz / assessment.
 * After submission shows results based on show_results_after setting:
 *   - survey:     thank you + optional aggregate results
 *   - quiz:       score, pass/fail, per-question breakdown with explanations
 *   - assessment: the member's conclusion with description + recommendation
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ClipboardList,
  Brain,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ArrowRight,
  Pencil,
  Star,
  ChevronLeft,
  ChevronRight,
  Award,
  Lightbulb,
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
  is_required: boolean;
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
}

interface Survey {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  survey_type: 'survey' | 'quiz' | 'assessment';
  status: 'draft' | 'active' | 'closed';
  closes_at: string | null;
  passing_score: number | null;
  show_results_after: 'submission' | 'close' | 'never';
  allow_anonymous: boolean;
  response_count?: number;
  questions: Question[];
  conclusions: Conclusion[];
}

interface ExistingResponse {
  id: string;
  answers: Record<string, any>;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  conclusion_key: string | null;
  submitted_at: string;
}

type Answers = Record<string, any>; // question_id → value

// ============================================================================
// HELPERS
// ============================================================================

const TYPE_CONFIG = {
  survey:     { label: 'Survey',     Icon: ClipboardList, bg: 'from-rose-500 to-pink-600',     iconColor: 'text-rose-600'   },
  quiz:       { label: 'Quiz',       Icon: Brain,         bg: 'from-indigo-500 to-violet-600',  iconColor: 'text-indigo-600' },
  assessment: { label: 'Assessment', Icon: BarChart3,      bg: 'from-amber-500 to-orange-600',  iconColor: 'text-amber-600'  },
};

function calculateQuizScore(questions: Question[], answers: Answers) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    if (!['multiple_choice', 'multi_select', 'yes_no'].includes(q.question_type)) continue;
    maxScore += q.points;
    const answer = answers[q.id];
    if (!answer) continue;
    const answerArr = Array.isArray(answer) ? answer : [answer];
    const correctArr = q.correct_option_ids;
    const isCorrect = answerArr.length === correctArr.length &&
      answerArr.every(a => correctArr.includes(a)) &&
      correctArr.every(c => answerArr.includes(c));
    if (isCorrect) score += q.points;
  }
  return { score, maxScore };
}

function calculateAssessmentConclusion(questions: Question[], conclusions: Conclusion[], answers: Answers): string | null {
  const totals: Record<string, number> = {};
  for (const c of conclusions) totals[c.key] = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer || !q.weights) continue;
    const answerArr = Array.isArray(answer) ? answer : [answer];
    for (const optId of answerArr) {
      const optWeights = q.weights[optId];
      if (!optWeights) continue;
      for (const [cKey, weight] of Object.entries(optWeights)) {
        if (totals[cKey] !== undefined) totals[cKey] += weight;
      }
    }
  }

  let winner: string | null = null;
  let best = -1;
  for (const [key, total] of Object.entries(totals)) {
    if (total > best) { best = total; winner = key; }
  }
  return winner;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SurveyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [existingResponse, setExistingResponse] = useState<ExistingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score?: number;
    maxScore?: number;
    passed?: boolean;
    conclusionKey?: string;
  } | null>(null);

  const isAdmin = profile && hasRoleLevel(profile.role, 'admin');

  useEffect(() => {
    if (profile) loadSurvey();
  }, [profile, slug]);

  async function loadSurvey() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*, survey_questions(*), survey_conclusions(*), survey_responses(count)')
        .eq('slug', slug!)
        .single();

      if (error || !data) { toast.error('Survey not found'); navigate('/surveys'); return; }

      const questions: Question[] = (data.survey_questions || [])
        .sort((a: any, b: any) => a.order_index - b.order_index);

      const conclusions: Conclusion[] = (data.survey_conclusions || [])
        .sort((a: any, b: any) => a.order_index - b.order_index);

      setSurvey({
        ...data,
        response_count: data.survey_responses?.[0]?.count ?? 0,
        questions,
        conclusions,
      });

      // Check if current user has already responded
      if (profile?.id) {
        const { data: resp } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', data.id)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (resp) {
          setExistingResponse(resp);
          setSubmitted(true);
          setSubmissionResult({
            score: resp.score,
            maxScore: resp.max_score,
            passed: resp.passed,
            conclusionKey: resp.conclusion_key,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId: string, value: any) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiSelect(questionId: string, optionId: string) {
    setAnswers(prev => {
      const current: string[] = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  async function handleSubmit() {
    if (!survey || !profile) return;

    // Validate required questions
    for (const q of survey.questions) {
      if (!q.is_required) continue;
      const answer = answers[q.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0) ||
          (typeof answer === 'string' && !answer.trim())) {
        toast.error(`Please answer: "${q.text}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      let score: number | null = null;
      let maxScore: number | null = null;
      let passed: boolean | null = null;
      let conclusionKey: string | null = null;

      if (survey.survey_type === 'quiz') {
        const result = calculateQuizScore(survey.questions, answers);
        score = result.score;
        maxScore = result.maxScore;
        passed = survey.passing_score !== null ? score >= survey.passing_score : null;
      }

      if (survey.survey_type === 'assessment') {
        conclusionKey = calculateAssessmentConclusion(survey.questions, survey.conclusions, answers);
      }

      const { error } = await supabase.from('survey_responses').insert({
        survey_id:      survey.id,
        user_id:        profile.id,
        answers,
        score,
        max_score:      maxScore,
        passed,
        conclusion_key: conclusionKey,
      });

      if (error) throw error;

      setSubmitted(true);
      setSubmissionResult({ score: score ?? undefined, maxScore: maxScore ?? undefined, passed: passed ?? undefined, conclusionKey: conclusionKey ?? undefined });
      toast.success('Response submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!survey) return null;

  const config = TYPE_CONFIG[survey.survey_type];
  const Icon = config.Icon;
  const showResults = submitted && (
    survey.show_results_after === 'submission' ||
    (survey.show_results_after === 'close' && survey.status === 'closed')
  );

  // ── Submitted state ─────────────────────────────────────────────────────────
  if (submitted && showResults) {
    return (
      <SubmissionResult
        survey={survey}
        result={submissionResult}
        answers={existingResponse?.answers || answers}
        isAdmin={!!isAdmin}
        onViewResults={() => navigate(`/surveys/${slug}/results`)}
      />
    );
  }

  if (submitted && !showResults) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Thank you!</h2>
            <p className="text-gray-600">Your response has been recorded.</p>
            {survey.show_results_after === 'close' && (
              <p className="text-sm text-gray-400">Results will be available once the {config.label.toLowerCase()} closes.</p>
            )}
            <Button onClick={() => navigate('/surveys')} variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Closed state ─────────────────────────────────────────────────────────────
  if (survey.status === 'closed' && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ClipboardList className="w-14 h-14 text-gray-200 mx-auto" />
            <h2 className="text-xl font-bold text-gray-500">This {config.label.toLowerCase()} is closed</h2>
            <p className="text-gray-400 text-sm">Responses are no longer being accepted.</p>
            <Button onClick={() => navigate('/surveys')} variant="outline">Back to Surveys</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Take the survey ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${config.bg}`} />
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{survey.name}</h1>
                <Badge variant="outline" className="text-xs">{config.label}</Badge>
                {survey.status === 'closed' && (
                  <Badge variant="outline" className="text-gray-500 text-xs">Closed</Badge>
                )}
              </div>
              {survey.description && (
                <p className="text-gray-600 mt-2 leading-relaxed">{survey.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-4 h-4" />
                  {survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}
                </span>
                {survey.response_count !== undefined && isAdmin && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {survey.response_count} response{survey.response_count !== 1 ? 's' : ''}
                  </span>
                )}
                {survey.closes_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Closes {new Date(survey.closes_at).toLocaleDateString()}
                  </span>
                )}
                {survey.survey_type === 'quiz' && survey.passing_score && (
                  <span className="flex items-center gap-1 text-indigo-600">
                    <Award className="w-4 h-4" />
                    Pass: {survey.passing_score} pts
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/surveys/${slug}/edit`)}>
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {survey.questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={index}
            answer={answers[q.id]}
            onAnswer={value => setAnswer(q.id, value)}
            onToggleMulti={optId => toggleMultiSelect(q.id, optId)}
          />
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={() => navigate('/surveys')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || survey.status === 'closed'}
          className={`bg-gradient-to-r ${config.bg} text-white`}
        >
          {submitting ? 'Submitting...' : `Submit ${config.label}`}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// QUESTION CARD
// ============================================================================

function QuestionCard({
  question: q,
  index,
  answer,
  onAnswer,
  onToggleMulti,
}: {
  question: Question;
  index: number;
  answer: any;
  onAnswer: (value: any) => void;
  onToggleMulti: (optId: string) => void;
}) {
  const yesNoOptions: Option[] = [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }];
  const displayOptions = q.question_type === 'yes_no' ? yesNoOptions : q.options;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-gray-400 mt-0.5 flex-shrink-0">{index + 1}.</span>
            <div>
              <p className="font-medium text-gray-900 leading-snug">
                {q.text}
                {q.is_required && <span className="text-red-500 ml-1">*</span>}
              </p>
              {q.description && (
                <p className="text-sm text-gray-500 mt-1">{q.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Multiple choice / Yes-No */}
        {(q.question_type === 'multiple_choice' || q.question_type === 'yes_no') && (
          <div className="space-y-2">
            {displayOptions.map(opt => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  answer === opt.id
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  answer === opt.id ? 'border-rose-500 bg-rose-500' : 'border-gray-300'
                }`}>
                  {answer === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <input
                  type="radio"
                  className="sr-only"
                  checked={answer === opt.id}
                  onChange={() => onAnswer(opt.id)}
                />
                <span className="text-sm">{opt.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* Multi-select */}
        {q.question_type === 'multi_select' && (
          <div className="space-y-2">
            {q.options.map(opt => {
              const selected = (answer as string[] || []).includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    selected ? 'border-rose-500 bg-rose-500' : 'border-gray-300'
                  }`}>
                    {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={selected} onChange={() => onToggleMulti(opt.id)} />
                  <span className="text-sm">{opt.text}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Rating */}
        {q.question_type === 'rating' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: q.rating_max - q.rating_min + 1 }, (_, i) => i + q.rating_min).map(val => (
                <button
                  key={val}
                  onClick={() => onAnswer(val)}
                  className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
                    answer === val
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            {(q.rating_min_label || q.rating_max_label) && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>{q.rating_min_label || q.rating_min}</span>
                <span>{q.rating_max_label || q.rating_max}</span>
              </div>
            )}
          </div>
        )}

        {/* Short text */}
        {q.question_type === 'text' && (
          <input
            type="text"
            value={answer || ''}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Your answer..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        )}

        {/* Long text */}
        {q.question_type === 'long_text' && (
          <Textarea
            value={answer || ''}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={4}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUBMISSION RESULT
// ============================================================================

function SubmissionResult({
  survey,
  result,
  answers,
  isAdmin,
  onViewResults,
}: {
  survey: Survey;
  result: { score?: number; maxScore?: number; passed?: boolean; conclusionKey?: string; } | null;
  answers: Answers;
  isAdmin: boolean;
  onViewResults: () => void;
}) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[survey.survey_type];

  // Assessment result
  if (survey.survey_type === 'assessment' && result?.conclusionKey) {
    const conclusion = survey.conclusions.find(c => c.key === result.conclusionKey);
    if (conclusion) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />
          <Card className="overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${conclusion.color}`} />
            <CardContent className="p-8 text-center space-y-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${conclusion.color} flex items-center justify-center mx-auto`}>
                <Star className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-1">Your Result</p>
                <h2 className="text-3xl font-bold">{conclusion.title}</h2>
              </div>
              <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">{conclusion.description}</p>
              {conclusion.recommendation && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-lg mx-auto">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Recommended next steps</p>
                      <p className="text-sm text-amber-700">{conclusion.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate('/surveys')}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Surveys
                </Button>
                {isAdmin && (
                  <Button variant="outline" onClick={onViewResults}>
                    View All Results
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Quiz result
  if (survey.survey_type === 'quiz' && result?.score !== undefined) {
    const pct = result.maxScore ? Math.round((result.score! / result.maxScore) * 100) : 0;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />

        <Card className="overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${config.bg}`} />
          <CardContent className="p-8 text-center space-y-4">
            {result.passed === true ? (
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            ) : result.passed === false ? (
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
            ) : (
              <Award className="w-16 h-16 text-indigo-500 mx-auto" />
            )}
            <div>
              <p className="text-5xl font-bold">{result.score}<span className="text-2xl text-gray-400">/{result.maxScore}</span></p>
              <p className="text-gray-500 mt-1">{pct}% correct</p>
            </div>
            {result.passed !== null && result.passed !== undefined && (
              <Badge className={result.passed ? 'bg-green-100 text-green-700 text-sm px-3 py-1' : 'bg-red-100 text-red-700 text-sm px-3 py-1'}>
                {result.passed ? 'Passed' : 'Not passed'}
              </Badge>
            )}
            <Progress value={pct} className="max-w-xs mx-auto h-2" />
          </CardContent>
        </Card>

        {/* Per-question breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Question Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {survey.questions.filter(q => q.correct_option_ids.length > 0).map((q, i) => {
              const userAnswer = answers[q.id];
              const userArr = userAnswer ? (Array.isArray(userAnswer) ? userAnswer : [userAnswer]) : [];
              const correctArr = q.correct_option_ids;
              const isCorrect = userArr.length === correctArr.length &&
                userArr.every(a => correctArr.includes(a));

              return (
                <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your answer: {userArr.map(id => q.options.find(o => o.id === id)?.text || id).join(', ') || '—'}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-green-700 mt-0.5">
                          Correct: {correctArr.map(id => q.options.find(o => o.id === id)?.text || id).join(', ')}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-gray-600 mt-1 italic">{q.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium flex-shrink-0 ml-2">
                      {isCorrect ? `+${q.points}` : '0'}/{q.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pb-8">
          <Button variant="outline" onClick={() => navigate('/surveys')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Surveys
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={onViewResults}>
              View All Results
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Survey: simple thank you + option to see aggregate results
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Surveys', path: '/surveys' }, { label: survey.name }]} />
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Thank you!</h2>
          <p className="text-gray-600">Your response has been recorded.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/surveys')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Surveys
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={onViewResults}>
                View All Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
