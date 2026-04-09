/**
 * Create / Edit Survey Page
 *
 * Admin builder for surveys, quizzes, and assessments.
 * Three modes share the same form — extra fields appear based on survey_type.
 *
 * Survey   — questions only, no scoring
 * Quiz     — questions + mark correct answers + set points + passing score
 * Assessment — questions + weight answers toward conclusions
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  ClipboardList,
  Brain,
  BarChart3,
  CheckCircle2,
  X,
  GripVertical,
  Info,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type SurveyType = 'survey' | 'quiz' | 'assessment';
type QuestionType = 'multiple_choice' | 'multi_select' | 'text' | 'long_text' | 'rating' | 'yes_no';
type Visibility = 'public' | 'member' | 'unlisted' | 'private';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  order_index: number;
  question_type: QuestionType;
  text: string;
  description: string;
  is_required: boolean;
  options: Option[];
  // Quiz
  correct_option_ids: string[];
  points: number;
  explanation: string;
  // Assessment weights: { option_id: { conclusion_key: weight } }
  weights: Record<string, Record<string, number>>;
  // Rating
  rating_min: number;
  rating_max: number;
  rating_min_label: string;
  rating_max_label: string;
}

interface Conclusion {
  id: string;
  key: string;
  title: string;
  description: string;
  recommendation: string;
  color: string;
  order_index: number;
}

interface SurveyForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  survey_type: SurveyType;
  status: 'draft' | 'active' | 'closed';
  visibility: Visibility;
  closes_at: string;
  passing_score: string;
  show_results_after: 'submission' | 'close' | 'never';
  allow_anonymous: boolean;
  randomize_questions: boolean;
  tags: string[];
  questions: Question[];
  conclusions: Conclusion[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUESTION_TYPES: { value: QuestionType; label: string; hasOptions: boolean }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice (pick one)',   hasOptions: true  },
  { value: 'multi_select',    label: 'Multi-Select (pick many)',     hasOptions: true  },
  { value: 'yes_no',          label: 'Yes / No',                     hasOptions: false },
  { value: 'rating',          label: 'Rating Scale',                 hasOptions: false },
  { value: 'text',            label: 'Short Text',                   hasOptions: false },
  { value: 'long_text',       label: 'Long Text (paragraph)',        hasOptions: false },
];

const GRADIENT_OPTIONS = [
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo → Purple' },
  { value: 'from-rose-500 to-pink-600',     label: 'Rose → Pink'     },
  { value: 'from-amber-500 to-orange-600',  label: 'Amber → Orange'  },
  { value: 'from-green-500 to-emerald-600', label: 'Green → Emerald' },
  { value: 'from-blue-500 to-cyan-600',     label: 'Blue → Cyan'     },
  { value: 'from-violet-500 to-fuchsia-600',label: 'Violet → Fuchsia'},
];

function emptyQuestion(index: number): Question {
  return {
    id: crypto.randomUUID(),
    order_index: index,
    question_type: 'multiple_choice',
    text: '',
    description: '',
    is_required: true,
    options: [
      { id: crypto.randomUUID(), text: '' },
      { id: crypto.randomUUID(), text: '' },
    ],
    correct_option_ids: [],
    points: 1,
    explanation: '',
    weights: {},
    rating_min: 1,
    rating_max: 5,
    rating_min_label: '',
    rating_max_label: '',
  };
}

function emptyConclusion(index: number): Conclusion {
  return {
    id: crypto.randomUUID(),
    key: '',
    title: '',
    description: '',
    recommendation: '',
    color: GRADIENT_OPTIONS[index % GRADIENT_OPTIONS.length].value,
    order_index: index,
  };
}

function emptyForm(): SurveyForm {
  return {
    name: '',
    slug: '',
    description: '',
    short_description: '',
    survey_type: 'survey',
    status: 'draft',
    visibility: 'member',
    closes_at: '',
    passing_score: '',
    show_results_after: 'submission',
    allow_anonymous: false,
    randomize_questions: false,
    tags: [],
    questions: [emptyQuestion(0)],
    conclusions: [],
  };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateSurveyPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditing = !!editSlug;

  const [form, setForm] = useState<SurveyForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) loadSurvey();
  }, [editSlug]);

  async function loadSurvey() {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, survey_questions(*), survey_conclusions(*)')
      .eq('slug', editSlug!)
      .single();

    if (error || !data) { toast.error('Survey not found'); navigate('/surveys'); return; }

    const questions: Question[] = (data.survey_questions || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        id: q.id,
        order_index: q.order_index,
        question_type: q.question_type,
        text: q.text,
        description: q.description || '',
        is_required: q.is_required,
        options: q.options || [],
        correct_option_ids: q.correct_option_ids || [],
        points: q.points || 1,
        explanation: q.explanation || '',
        weights: q.weights || {},
        rating_min: q.rating_min || 1,
        rating_max: q.rating_max || 5,
        rating_min_label: q.rating_min_label || '',
        rating_max_label: q.rating_max_label || '',
      }));

    const conclusions: Conclusion[] = (data.survey_conclusions || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((c: any) => ({
        id: c.id,
        key: c.key,
        title: c.title,
        description: c.description,
        recommendation: c.recommendation || '',
        color: c.color,
        order_index: c.order_index,
      }));

    setForm({
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      short_description: data.short_description || '',
      survey_type: data.survey_type,
      status: data.status,
      visibility: data.visibility,
      closes_at: data.closes_at ? data.closes_at.slice(0, 16) : '',
      passing_score: data.passing_score ? String(data.passing_score) : '',
      show_results_after: data.show_results_after,
      allow_anonymous: data.allow_anonymous,
      randomize_questions: data.randomize_questions,
      tags: data.tags || [],
      questions,
      conclusions,
    });
  }

  if (!profile || !hasRoleLevel(profile.role, 'admin')) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  // ── Form helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof SurveyForm>(key: K, value: SurveyForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateQuestion(qId: string, patch: Partial<Question>) {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, ...patch } : q),
    }));
  }

  function addQuestion() {
    const newQ = emptyQuestion(form.questions.length);
    setForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setActiveQuestion(newQ.id);
  }

  function removeQuestion(qId: string) {
    setForm(prev => ({
      ...prev,
      questions: prev.questions
        .filter(q => q.id !== qId)
        .map((q, i) => ({ ...q, order_index: i })),
    }));
  }

  function moveQuestion(index: number, dir: 'up' | 'down') {
    const qs = [...form.questions];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= qs.length) return;
    [qs[index], qs[target]] = [qs[target], qs[index]];
    qs.forEach((q, i) => { q.order_index = i; });
    setForm(prev => ({ ...prev, questions: qs }));
  }

  function addOption(qId: string) {
    updateQuestion(qId, {
      options: [...(form.questions.find(q => q.id === qId)?.options || []),
        { id: crypto.randomUUID(), text: '' }],
    });
  }

  function removeOption(qId: string, optId: string) {
    const q = form.questions.find(q => q.id === qId);
    if (!q) return;
    updateQuestion(qId, {
      options: q.options.filter(o => o.id !== optId),
      correct_option_ids: q.correct_option_ids.filter(id => id !== optId),
    });
  }

  function updateOption(qId: string, optId: string, text: string) {
    const q = form.questions.find(q => q.id === qId);
    if (!q) return;
    updateQuestion(qId, {
      options: q.options.map(o => o.id === optId ? { ...o, text } : o),
    });
  }

  function toggleCorrect(qId: string, optId: string) {
    const q = form.questions.find(q => q.id === qId);
    if (!q) return;
    const isMulti = q.question_type === 'multi_select';
    const current = q.correct_option_ids;
    updateQuestion(qId, {
      correct_option_ids: current.includes(optId)
        ? current.filter(id => id !== optId)
        : isMulti ? [...current, optId] : [optId],
    });
  }

  function setWeight(qId: string, optId: string, conclusionKey: string, value: number) {
    const q = form.questions.find(q => q.id === qId);
    if (!q) return;
    const weights = { ...q.weights };
    if (!weights[optId]) weights[optId] = {};
    weights[optId] = { ...weights[optId], [conclusionKey]: value };
    updateQuestion(qId, { weights });
  }

  function addConclusion() {
    const c = emptyConclusion(form.conclusions.length);
    setForm(prev => ({ ...prev, conclusions: [...prev.conclusions, c] }));
  }

  function updateConclusion(cId: string, patch: Partial<Conclusion>) {
    setForm(prev => ({
      ...prev,
      conclusions: prev.conclusions.map(c => c.id === cId ? { ...c, ...patch } : c),
    }));
  }

  function removeConclusion(cId: string) {
    setForm(prev => ({
      ...prev,
      conclusions: prev.conclusions.filter(c => c.id !== cId),
    }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setField('tags', [...form.tags, t]);
    setTagInput('');
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.questions.length === 0) { toast.error('Add at least one question'); return; }
    if (form.survey_type === 'assessment' && form.conclusions.length < 2) {
      toast.error('Assessments need at least 2 conclusions'); return;
    }

    const slug = form.slug || slugify(form.name);

    setSaving(true);
    try {
      const surveyData = {
        name:                form.name,
        slug,
        description:         form.description,
        short_description:   form.short_description,
        survey_type:         form.survey_type,
        status:              form.status,
        visibility:          form.visibility,
        closes_at:           form.closes_at || null,
        passing_score:       form.passing_score ? Number(form.passing_score) : null,
        show_results_after:  form.show_results_after,
        allow_anonymous:     form.allow_anonymous,
        randomize_questions: form.randomize_questions,
        tags:                form.tags,
        created_by:          profile!.id,
      };

      let surveyId = form.id;

      if (surveyId) {
        const { error } = await supabase.from('surveys').update(surveyData).eq('id', surveyId);
        if (error) throw error;
        // Delete and re-insert questions + conclusions
        await supabase.from('survey_questions').delete().eq('survey_id', surveyId);
        await supabase.from('survey_conclusions').delete().eq('survey_id', surveyId);
      } else {
        const { data, error } = await supabase.from('surveys').insert(surveyData).select('id').single();
        if (error) throw error;
        surveyId = (data as any).id;
      }

      // Insert questions
      if (form.questions.length > 0) {
        const questionRows = form.questions.map((q, i) => ({
          survey_id:           surveyId,
          order_index:         i,
          question_type:       q.question_type,
          text:                q.text,
          description:         q.description || null,
          is_required:         q.is_required,
          options:             q.options,
          correct_option_ids:  q.correct_option_ids,
          points:              q.points,
          explanation:         q.explanation || null,
          weights:             q.weights,
          rating_min:          q.rating_min,
          rating_max:          q.rating_max,
          rating_min_label:    q.rating_min_label || null,
          rating_max_label:    q.rating_max_label || null,
        }));
        const { error } = await supabase.from('survey_questions').insert(questionRows);
        if (error) throw error;
      }

      // Insert conclusions (assessment only)
      if (form.survey_type === 'assessment' && form.conclusions.length > 0) {
        const conclusionRows = form.conclusions.map((c, i) => ({
          survey_id:      surveyId,
          key:            c.key || slugify(c.title),
          title:          c.title,
          description:    c.description,
          recommendation: c.recommendation || null,
          color:          c.color,
          order_index:    i,
        }));
        const { error } = await supabase.from('survey_conclusions').insert(conclusionRows);
        if (error) throw error;
      }

      toast.success(isEditing ? 'Survey updated!' : 'Survey created!');
      navigate(`/surveys/${slug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const typeIcon = form.survey_type === 'quiz' ? Brain :
                   form.survey_type === 'assessment' ? BarChart3 : ClipboardList;
  const TypeIcon = typeIcon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Surveys', path: '/surveys' },
        { label: isEditing ? 'Edit Survey' : 'New Survey' },
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TypeIcon className="w-6 h-6 text-rose-600" />
          {isEditing ? 'Edit Survey' : 'Create New Survey'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/surveys')}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Survey'}
          </Button>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Type selector */}
          <div>
            <Label>Type</Label>
            <div className="flex gap-2 mt-2">
              {([
                { value: 'survey',     label: 'Survey',     Icon: ClipboardList, desc: 'Collect responses'       },
                { value: 'quiz',       label: 'Quiz',       Icon: Brain,         desc: 'Test knowledge + score'  },
                { value: 'assessment', label: 'Assessment', Icon: BarChart3,      desc: 'Lead to a conclusion'    },
              ] as const).map(({ value, label, Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setField('survey_type', value)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                    form.survey_type === value
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${form.survey_type === value ? 'text-rose-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => {
                  setField('name', e.target.value);
                  if (!form.id) setField('slug', slugify(e.target.value));
                }}
                placeholder={`e.g., ${form.survey_type === 'quiz' ? 'Q2 Knowledge Check' : form.survey_type === 'assessment' ? 'Leadership Style Assessment' : 'Member Feedback Survey'}`}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="short_description">Short Description</Label>
              <Input
                id="short_description"
                value={form.short_description}
                onChange={e => setField('short_description', e.target.value)}
                placeholder="One-liner shown on the browse page"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Explain what this is about and why members should complete it..."
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={v => setField('visibility', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="member">Members only</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Closes At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.closes_at}
                onChange={e => setField('closes_at', e.target.value)}
              />
            </div>
            <div>
              <Label>Show Results After</Label>
              <Select value={form.show_results_after} onValueChange={v => setField('show_results_after', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="submission">Immediately after submission</SelectItem>
                  <SelectItem value="close">After survey closes</SelectItem>
                  <SelectItem value="never">Never (admin only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiz: passing score */}
          {form.survey_type === 'quiz' && (
            <div className="max-w-xs">
              <Label htmlFor="passing_score">Passing Score (optional)</Label>
              <Input
                id="passing_score"
                type="number"
                min={0}
                value={form.passing_score}
                onChange={e => setField('passing_score', e.target.value)}
                placeholder="e.g., 70 (points needed to pass)"
              />
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.allow_anonymous}
                onCheckedChange={v => setField('allow_anonymous', v)}
              />
              <Label>Anonymous responses</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.randomize_questions}
                onCheckedChange={v => setField('randomize_questions', v)}
              />
              <Label>Randomize question order</Label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag and press Enter"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button onClick={() => setField('tags', form.tags.filter(t => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Assessment Conclusions ── */}
      {form.survey_type === 'assessment' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conclusions</CardTitle>
            <p className="text-sm text-gray-500">
              Define the 2–4 possible outcomes. Each member will get the one their answers point to most strongly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.conclusions.map((c, i) => (
              <div key={c.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Conclusion {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeConclusion(c.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Internal Key</Label>
                    <Input
                      value={c.key}
                      onChange={e => updateConclusion(c.id, { key: slugify(e.target.value) })}
                      placeholder="e.g., analytical"
                    />
                    <p className="text-xs text-gray-400 mt-1">Used for weighting — lowercase, no spaces</p>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={c.title}
                      onChange={e => updateConclusion(c.id, { title: e.target.value })}
                      placeholder="e.g., The Analytical Leader"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={c.description}
                      onChange={e => updateConclusion(c.id, { description: e.target.value })}
                      placeholder="What this conclusion means for the member..."
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Recommendation (optional)</Label>
                    <Textarea
                      value={c.recommendation}
                      onChange={e => updateConclusion(c.id, { recommendation: e.target.value })}
                      placeholder="Suggested next steps, pathways, or resources..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Select value={c.color} onValueChange={v => updateConclusion(c.id, { color: v })}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-gradient-to-r ${c.color}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded bg-gradient-to-r ${opt.value}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            {form.conclusions.length < 4 && (
              <Button variant="outline" onClick={addConclusion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Conclusion
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Questions ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Questions</CardTitle>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.questions.map((q, index) => {
            const isExpanded = activeQuestion === q.id;
            const hasOptions = ['multiple_choice', 'multi_select', 'yes_no'].includes(q.question_type);
            const yesNoOptions: Option[] = [
              { id: 'yes', text: 'Yes' },
              { id: 'no',  text: 'No'  },
            ];
            const displayOptions = q.question_type === 'yes_no' ? yesNoOptions : q.options;

            return (
              <div key={q.id} className={`border rounded-lg transition-colors ${isExpanded ? 'border-rose-300 bg-rose-50/30' : 'border-gray-200'}`}>
                {/* Question header — always visible */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setActiveQuestion(isExpanded ? null : q.id)}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-400 w-5 flex-shrink-0">{index + 1}.</span>
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                    {q.text || <span className="text-gray-400 italic">Untitled question</span>}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                    {QUESTION_TYPES.find(t => t.value === q.question_type)?.label.split(' (')[0]}
                  </Badge>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); moveQuestion(index, 'up'); }} disabled={index === 0}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); moveQuestion(index, 'down'); }} disabled={index === form.questions.length - 1}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={e => { e.stopPropagation(); removeQuestion(q.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="border-t border-rose-200 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Question *</Label>
                        <Input
                          value={q.text}
                          onChange={e => updateQuestion(q.id, { text: e.target.value })}
                          placeholder="Enter your question..."
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Helper text (optional)</Label>
                        <Input
                          value={q.description}
                          onChange={e => updateQuestion(q.id, { description: e.target.value })}
                          placeholder="Additional context shown below the question"
                        />
                      </div>
                      <div>
                        <Label>Question Type</Label>
                        <Select
                          value={q.question_type}
                          onValueChange={v => updateQuestion(q.id, {
                            question_type: v as QuestionType,
                            options: v === 'yes_no' ? [] : (q.options.length >= 2 ? q.options : [
                              { id: crypto.randomUUID(), text: '' },
                              { id: crypto.randomUUID(), text: '' },
                            ]),
                          })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 mt-6">
                        <Switch
                          checked={q.is_required}
                          onCheckedChange={v => updateQuestion(q.id, { is_required: v })}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>

                    {/* Rating config */}
                    {q.question_type === 'rating' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Min value</Label>
                          <Input type="number" value={q.rating_min} onChange={e => updateQuestion(q.id, { rating_min: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Max value</Label>
                          <Input type="number" value={q.rating_max} onChange={e => updateQuestion(q.id, { rating_max: Number(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Min label (optional)</Label>
                          <Input value={q.rating_min_label} onChange={e => updateQuestion(q.id, { rating_min_label: e.target.value })} placeholder="e.g., Not at all" />
                        </div>
                        <div>
                          <Label>Max label (optional)</Label>
                          <Input value={q.rating_max_label} onChange={e => updateQuestion(q.id, { rating_max_label: e.target.value })} placeholder="e.g., Extremely" />
                        </div>
                      </div>
                    )}

                    {/* Options */}
                    {hasOptions && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {displayOptions.map((opt, oi) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            {/* Quiz: correct answer toggle */}
                            {form.survey_type === 'quiz' && (
                              <button
                                onClick={() => toggleCorrect(q.id, opt.id)}
                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                  q.correct_option_ids.includes(opt.id)
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-300'
                                }`}
                                title="Mark as correct answer"
                              >
                                {q.correct_option_ids.includes(opt.id) && (
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                              </button>
                            )}
                            <span className="text-xs text-gray-400 w-5">{String.fromCharCode(65 + oi)}.</span>
                            {q.question_type === 'yes_no' ? (
                              <span className="text-sm text-gray-700">{opt.text}</span>
                            ) : (
                              <Input
                                value={opt.text}
                                onChange={e => updateOption(q.id, opt.id, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="flex-1"
                              />
                            )}
                            {/* Assessment: weights per conclusion */}
                            {form.survey_type === 'assessment' && form.conclusions.length > 0 && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {form.conclusions.map(c => (
                                  <div key={c.id} className="flex flex-col items-center" title={c.title}>
                                    <span className="text-[9px] text-gray-400 truncate max-w-[40px]">{c.key || '?'}</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={10}
                                      value={q.weights[opt.id]?.[c.key] ?? 0}
                                      onChange={e => setWeight(q.id, opt.id, c.key, Number(e.target.value))}
                                      className="w-12 h-7 text-xs text-center p-1"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.question_type !== 'yes_no' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                                onClick={() => removeOption(q.id, opt.id)}
                                disabled={q.options.length <= 2}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {q.question_type !== 'yes_no' && (
                          <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => addOption(q.id)}>
                            <Plus className="w-3 h-3 mr-1" /> Add option
                          </Button>
                        )}
                        {form.survey_type === 'quiz' && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3" />
                            Click the circle next to an option to mark it as the correct answer.
                          </p>
                        )}
                        {form.survey_type === 'assessment' && form.conclusions.length > 0 && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3" />
                            Set the weight (0–10) each option contributes toward each conclusion.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quiz: points + explanation */}
                    {form.survey_type === 'quiz' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={e => updateQuestion(q.id, { points: Number(e.target.value) })}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Explanation (shown after submission)</Label>
                          <Textarea
                            value={q.explanation}
                            onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                            placeholder="Explain why the correct answer is correct..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <Button variant="outline" onClick={addQuestion} className="w-full border-dashed">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate('/surveys')}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Survey'}
        </Button>
      </div>
    </div>
  );
}
