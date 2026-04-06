/**
 * Pathway Admin Page
 * 
 * Simple admin form for creating and editing pathways.
 * Not a drag-drop builder — just a clean form.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel } from '@/lib/constants/roles';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Search,
  BookOpen,
  GraduationCap,
  Compass,
  Pencil,
  Eye,
  Archive,
  X,
  Sparkles,
  Activity,
  Users,
  Video,
  MessageSquare,
  FileText,
  CheckSquare,
  Layers,
  Play,
  CalendarCheck,
  Hammer,
  Mic,
  MapPin,
  MessageCircle,
  Zap,
  Camera,
  Briefcase,
  Table2,
  ListMusic,
  Library,
  ArrowUpRight,
  Star,
  ClipboardCheck,
  BarChart3,
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
  // Activity-specific
  activity_type?: string;
  verification_method?: 'self_report' | 'admin_verify' | 'auto_detect';
  activity_criteria?: Record<string, any>;
}

interface PathwayForm {
  id?: string;
  name: string;
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
  status: 'draft' | 'published';
  is_featured: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  type: 'course' | 'program';
}

interface BadgeType {
  id: string;
  name: string;
  slug: string;
  category: string;
  badge_color: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRADIENT_OPTIONS = [
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo → Purple' },
  { value: 'from-blue-500 to-cyan-600', label: 'Blue → Cyan' },
  { value: 'from-green-500 to-emerald-600', label: 'Green → Emerald' },
  { value: 'from-orange-500 to-red-600', label: 'Orange → Red' },
  { value: 'from-pink-500 to-rose-600', label: 'Pink → Rose' },
  { value: 'from-violet-500 to-fuchsia-600', label: 'Violet → Fuchsia' },
  { value: 'from-teal-500 to-green-600', label: 'Teal → Green' },
  { value: 'from-amber-500 to-yellow-600', label: 'Amber → Yellow' },
];

const CAREER_STAGES = [
  'student',
  'early-career',
  'mid-career',
  'senior',
  'executive',
  'transition',
  'entrepreneur',
  'retired',
];

const COMMON_ROLES = [
  'Coach',
  'Consultant',
  'Facilitator',
  'Trainer',
  'Leader',
  'Manager',
  'Founder',
  'Executive',
  'Mentor',
  'Educator',
  'Therapist',
  'HR Professional',
  'Product Manager',
  'Designer',
  'Developer',
];

const ACTIVITY_TYPES: Record<string, { label: string; icon: string; category: string }> = {
  join_circle: { label: 'Join a Circle', icon: 'Users', category: 'Community' },
  attend_meeting: { label: 'Attend a Meeting', icon: 'Video', category: 'Events' },
  post_in_forum: { label: 'Post in a Forum', icon: 'MessageSquare', category: 'Community' },
  create_document: { label: 'Create a Document', icon: 'FileText', category: 'Content' },
  complete_checklist: { label: 'Complete a Checklist', icon: 'CheckSquare', category: 'Content' },
  read_book: { label: 'Read a Book', icon: 'BookOpen', category: 'Learning' },
  explore_deck: { label: 'Explore a Deck', icon: 'Layers', category: 'Learning' },
  watch_episode: { label: 'Watch an Episode', icon: 'Play', category: 'Learning' },
  attend_event: { label: 'Attend an Event', icon: 'CalendarCheck', category: 'Events' },
  create_build: { label: 'Create a Build', icon: 'Hammer', category: 'Creation' },
  give_pitch: { label: 'Give a Pitch', icon: 'Mic', category: 'Participation' },
  join_meetup: { label: 'Join a Meetup', icon: 'MapPin', category: 'Events' },
  participate_standup: { label: 'Do a Standup', icon: 'MessageCircle', category: 'Participation' },
  join_sprint: { label: 'Join a Sprint', icon: 'Zap', category: 'Participation' },
  post_moment: { label: 'Post a Moment', icon: 'Camera', category: 'Content' },
  add_portfolio_item: { label: 'Add to Portfolio', icon: 'Briefcase', category: 'Content' },
  use_table: { label: 'Use a Table', icon: 'Table2', category: 'Content' },
  use_playlist: { label: 'Use a Playlist', icon: 'ListMusic', category: 'Learning' },
  use_library: { label: 'Use a Library', icon: 'Library', category: 'Learning' },
  use_elevator: { label: 'Use an Elevator Pitch', icon: 'ArrowUpRight', category: 'Participation' },
  custom: { label: 'Custom Activity', icon: 'Star', category: 'Other' },
};

const ACTIVITY_ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users className="w-4 h-4 text-green-500" />,
  Video: <Video className="w-4 h-4 text-blue-500" />,
  MessageSquare: <MessageSquare className="w-4 h-4 text-purple-500" />,
  FileText: <FileText className="w-4 h-4 text-orange-500" />,
  CheckSquare: <CheckSquare className="w-4 h-4 text-green-600" />,
  BookOpen: <BookOpen className="w-4 h-4 text-blue-600" />,
  Layers: <Layers className="w-4 h-4 text-indigo-500" />,
  Play: <Play className="w-4 h-4 text-red-500" />,
  CalendarCheck: <CalendarCheck className="w-4 h-4 text-teal-500" />,
  Hammer: <Hammer className="w-4 h-4 text-amber-600" />,
  Mic: <Mic className="w-4 h-4 text-pink-500" />,
  MapPin: <MapPin className="w-4 h-4 text-green-500" />,
  MessageCircle: <MessageCircle className="w-4 h-4 text-blue-400" />,
  Zap: <Zap className="w-4 h-4 text-yellow-500" />,
  Camera: <Camera className="w-4 h-4 text-purple-400" />,
  Briefcase: <Briefcase className="w-4 h-4 text-gray-600" />,
  Table2: <Table2 className="w-4 h-4 text-blue-500" />,
  ListMusic: <ListMusic className="w-4 h-4 text-violet-500" />,
  Library: <Library className="w-4 h-4 text-emerald-500" />,
  ArrowUpRight: <ArrowUpRight className="w-4 h-4 text-cyan-500" />,
  Star: <Star className="w-4 h-4 text-yellow-500" />,
};

function getActivityIcon(activityType?: string) {
  if (!activityType || !ACTIVITY_TYPES[activityType]) return <Activity className="w-4 h-4 text-green-500" />;
  const iconName = ACTIVITY_TYPES[activityType].icon;
  return ACTIVITY_ICON_MAP[iconName] || <Activity className="w-4 h-4 text-green-500" />;
}

// Maps each activity type to the Supabase table where specific instances live.
// null = no specific instance selection (generic / open-ended)
const ACTIVITY_TABLE_MAP: Record<string, { table: string; titleField: string } | null> = {
  join_circle:         { table: 'circles',       titleField: 'name'  },
  attend_meeting:      { table: 'meetings',       titleField: 'title' },
  post_in_forum:       { table: 'forum_threads',  titleField: 'title' },
  create_document:     { table: 'documents',      titleField: 'title' },
  complete_checklist:  { table: 'checklists',     titleField: 'title' },
  read_book:           { table: 'books',          titleField: 'title' },
  explore_deck:        { table: 'decks',          titleField: 'title' },
  attend_event:        { table: 'events',         titleField: 'title' },
  create_build:        { table: 'builds',         titleField: 'title' },
  give_pitch:          { table: 'pitches',        titleField: 'title' },
  join_meetup:         { table: 'meetups',        titleField: 'title' },
  participate_standup: { table: 'standups',       titleField: 'title' },
  join_sprint:         { table: 'sprints',        titleField: 'title' },
  use_table:           { table: 'tables',         titleField: 'name'  },
  use_playlist:        { table: 'playlists',      titleField: 'title' },
  use_library:         { table: 'libraries',      titleField: 'name'  },
  use_elevator:        { table: 'elevators',      titleField: 'name'  },
  watch_episode:       null,
  post_moment:         null,
  add_portfolio_item:  null,
  custom:              null,
};

const VERIFICATION_METHODS = [
  { value: 'self_report', label: 'Self-Report', description: 'Member reports completion, no verification needed' },
  { value: 'admin_verify', label: 'Admin Verify', description: 'Member reports, admin must approve' },
  { value: 'auto_detect', label: 'Auto-Detect (future)', description: 'Platform detects completion automatically' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PathwayAdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // All pathways list
  const [pathways, setPathways] = useState<any[]>([]);
  const [loadingPathways, setLoadingPathways] = useState(true);

  // Form state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PathwayForm>(emptyForm());

  // Search state for adding steps
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Reference data
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Tag/role inputs
  const [tagInput, setTagInput] = useState('');
  const [roleInput, setRoleInput] = useState('');

  // Instance picker state (select a specific item when ADDING an activity step)
  const [pendingActivityType, setPendingActivityType] = useState<string | null>(null);
  const [instanceQuery, setInstanceQuery] = useState('');
  const [instanceResults, setInstanceResults] = useState<{ id: string; title: string }[]>([]);
  const [searchingInstances, setSearchingInstances] = useState(false);

  // Inline assignment state (assign/change a specific item on an EXISTING step)
  const [editingInstanceStepId, setEditingInstanceStepId] = useState<string | null>(null);
  const [editInstanceQuery, setEditInstanceQuery] = useState('');
  const [editInstanceResults, setEditInstanceResults] = useState<{ id: string; title: string }[]>([]);
  const [searchingEditInstances, setSearchingEditInstances] = useState(false);

  // Only load pathways once profile is available (auth session ready)
  useEffect(() => {
    if (profile && hasRoleLevel(profile.role, 'admin')) {
      loadPathways();
    } else {
      setLoadingPathways(false);
    }
    loadReferenceData();
  }, [profile]);

  async function loadPathways() {
    setLoadingPathways(true);
    try {
      const { data, error } = await supabase
        .from('pathways')
        .select('*, pathway_steps(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPathways(
        (data || []).map((p: any) => ({
          ...p,
          steps: (p.pathway_steps || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }))
      );
    } catch (error) {
      console.error('Error loading pathways:', error);
    } finally {
      setLoadingPathways(false);
    }
  }

  async function loadReferenceData() {
    try {
      // Load badge types
      const { data: badges } = await supabase
        .from('badge_types')
        .select('id, name, slug, category, badge_color')
        .eq('is_active', true)
        .order('name');
      if (badges) setBadgeTypes(badges);

      // Load topics
      const { data: topicData } = await supabase
        .from('topics')
        .select('id, name, slug')
        .order('name');
      if (topicData) setTopics(topicData);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  }

  async function searchContent() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Search courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, slug')
        .ilike('title', `%${searchQuery}%`)
        .limit(10);

      // Search programs
      const { data: programs } = await supabase
        .from('programs')
        .select('id, title, slug')
        .ilike('title', `%${searchQuery}%`)
        .limit(10);

      const results: SearchResult[] = [
        ...(courses || []).map(c => ({ id: c.id, title: c.title, slug: c.slug, type: 'course' as const })),
        ...(programs || []).map(p => ({ id: p.id, title: p.title, slug: p.slug, type: 'program' as const })),
      ];

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching content:', error);
    } finally {
      setSearching(false);
    }
  }

  function addStep(result: SearchResult) {
    // Don't add if already in steps
    if (form.steps.some(s => s.step_id === result.id && s.step_type === result.type)) {
      toast.error('This item is already in the pathway');
      return;
    }

    const newStep: PathwayStep = {
      id: crypto.randomUUID(),
      order_index: form.steps.length,
      step_type: result.type,
      step_id: result.id,
      title: result.title,
      description: null,
      is_required: true,
      allow_skip: true,
    };

    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));

    setSearchQuery('');
    setSearchResults([]);
  }

  async function searchInstances(query: string) {
    if (!pendingActivityType) return;
    const tableInfo = ACTIVITY_TABLE_MAP[pendingActivityType];
    if (!tableInfo) return;
    setSearchingInstances(true);
    try {
      const { data } = await supabase
        .from(tableInfo.table as any)
        .select(`id, ${tableInfo.titleField}`)
        .ilike(tableInfo.titleField, `%${query}%`)
        .limit(12);
      setInstanceResults(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row[tableInfo.titleField] || 'Untitled',
        }))
      );
    } catch (err) {
      console.error('Instance search error:', err);
    } finally {
      setSearchingInstances(false);
    }
  }

  function addActivityStep(activityType: string, targetId?: string, targetTitle?: string) {
    const activityDef = ACTIVITY_TYPES[activityType];
    if (!activityDef) return;

    const newStep: PathwayStep = {
      id: crypto.randomUUID(),
      order_index: form.steps.length,
      step_type: 'activity',
      step_id: targetId || '',
      title: activityDef.label,
      description: null,
      is_required: true,
      allow_skip: false,
      activity_type: activityType,
      verification_method: 'self_report',
      activity_criteria: targetId
        ? { target_id: targetId, target_title: targetTitle }
        : undefined,
    };

    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));

    // Close the picker
    setPendingActivityType(null);
    setInstanceQuery('');
    setInstanceResults([]);
  }

  async function searchEditInstances(activityType: string, query: string) {
    const tableInfo = ACTIVITY_TABLE_MAP[activityType];
    if (!tableInfo) return;
    setSearchingEditInstances(true);
    try {
      const { data } = await supabase
        .from(tableInfo.table as any)
        .select(`id, ${tableInfo.titleField}`)
        .ilike(tableInfo.titleField, `%${query}%`)
        .limit(12);
      setEditInstanceResults(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row[tableInfo.titleField] || 'Untitled',
        }))
      );
    } catch (err) {
      console.error('Edit instance search error:', err);
    } finally {
      setSearchingEditInstances(false);
    }
  }

  function updateStepInstance(stepId: string, targetId: string | null, targetTitle: string | null) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.id === stepId
          ? {
              ...s,
              step_id: targetId || '',
              activity_criteria: targetId
                ? { ...(s.activity_criteria || {}), target_id: targetId, target_title: targetTitle }
                : undefined,
            }
          : s
      ),
    }));
    setEditingInstanceStepId(null);
    setEditInstanceQuery('');
    setEditInstanceResults([]);
  }

  function openStepInstancePicker(stepId: string) {
    setEditingInstanceStepId(stepId);
    setEditInstanceQuery('');
    setEditInstanceResults([]);
  }

  function closeStepInstancePicker() {
    setEditingInstanceStepId(null);
    setEditInstanceQuery('');
    setEditInstanceResults([]);
  }

  function updateStepVerification(stepId: string, method: 'self_report' | 'admin_verify' | 'auto_detect') {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, verification_method: method } : s),
    }));
  }

  function removeStep(stepId: string) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps
        .filter(s => s.id !== stepId)
        .map((s, i) => ({ ...s, order_index: i })),
    }));
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const newSteps = [...form.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    newSteps.forEach((s, i) => s.order_index = i);

    setForm(prev => ({ ...prev, steps: newSteps }));
  }

  function addTag() {
    if (!tagInput.trim()) return;
    if (form.relevant_tags.includes(tagInput.trim())) return;
    setForm(prev => ({
      ...prev,
      relevant_tags: [...prev.relevant_tags, tagInput.trim()],
    }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm(prev => ({
      ...prev,
      relevant_tags: prev.relevant_tags.filter(t => t !== tag),
    }));
  }

  function addRole() {
    if (!roleInput.trim()) return;
    if (form.target_roles.includes(roleInput.trim())) return;
    setForm(prev => ({
      ...prev,
      target_roles: [...prev.target_roles, roleInput.trim()],
    }));
    setRoleInput('');
  }

  function removeRole(role: string) {
    setForm(prev => ({
      ...prev,
      target_roles: prev.target_roles.filter(r => r !== role),
    }));
  }

  function toggleTopic(topicId: string) {
    setForm(prev => ({
      ...prev,
      relevant_topics: prev.relevant_topics.includes(topicId)
        ? prev.relevant_topics.filter(id => id !== topicId)
        : [...prev.relevant_topics, topicId],
    }));
  }

  function toggleCareerStage(stage: string) {
    setForm(prev => ({
      ...prev,
      target_career_stages: prev.target_career_stages.includes(stage)
        ? prev.target_career_stages.filter(s => s !== stage)
        : [...prev.target_career_stages, stage],
    }));
  }

  async function savePathway() {
    if (!form.name.trim()) {
      toast.error('Pathway name is required');
      return;
    }
    if (form.steps.length === 0) {
      toast.error('Add at least one step to the pathway');
      return;
    }

    setSaving(true);
    try {
      const pathwayPayload = {
        name:                     form.name,
        description:              form.description,
        short_description:        form.short_description,
        destination:              form.destination,
        relevant_topics:          form.relevant_topics,
        relevant_tags:            form.relevant_tags,
        target_roles:             form.target_roles,
        target_career_stages:     form.target_career_stages,
        completion_badge_type_id: form.completion_badge_type_id,
        estimated_hours:          form.estimated_hours,
        icon:                     form.icon,
        color:                    form.color,
        status:                   form.status,
        is_published:             form.status === 'published',
        is_featured:              form.is_featured,
        created_by:               profile?.id,
      };

      let pathwayId = form.id;

      if (pathwayId) {
        const { error } = await supabase
          .from('pathways')
          .update(pathwayPayload)
          .eq('id', pathwayId);
        if (error) throw error;
      } else {
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { data, error } = await supabase
          .from('pathways')
          .insert({ ...pathwayPayload, slug })
          .select('id')
          .single();
        if (error) throw error;
        pathwayId = data.id;
      }

      // Replace steps: delete all then re-insert in order
      await supabase.from('pathway_steps').delete().eq('pathway_id', pathwayId);

      if (form.steps.length > 0) {
        const stepsPayload = form.steps.map((s, i) => ({
          pathway_id:           pathwayId,
          title:                s.title,
          description:          s.description,
          order_index:          i,
          sort_order:           i,
          step_type:            s.step_type,
          step_id:              s.step_id || null,
          activity_type:        s.activity_type || null,
          activity_instance_id: s.step_id ? s.step_id : null,
          is_required:          s.is_required,
          allow_skip:           s.allow_skip,
          verification_method:  s.verification_method || 'self_report',
          activity_criteria:    s.activity_criteria || null,
        }));
        const { error: stepsError } = await supabase.from('pathway_steps').insert(stepsPayload);
        if (stepsError) throw stepsError;
      }

      toast.success(form.id ? 'Pathway updated!' : 'Pathway created!');
      setEditing(false);
      setForm(emptyForm());
      loadPathways();
    } catch (error: any) {
      console.error('Error saving pathway:', error);
      toast.error(error.message || 'Failed to save pathway');
    } finally {
      setSaving(false);
    }
  }

  async function archivePathway(id: string) {
    try {
      const { error } = await supabase.from('pathways').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pathway deleted');
      loadPathways();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete pathway');
    }
  }

  function editPathway(pathway: any) {
    setForm({
      id: pathway.id,
      name: pathway.name,
      description: pathway.description || '',
      short_description: pathway.short_description || '',
      destination: pathway.destination || '',
      relevant_topics: pathway.relevant_topics || [],
      relevant_tags: pathway.relevant_tags || [],
      target_roles: pathway.target_roles || [],
      target_career_stages: pathway.target_career_stages || [],
      steps: pathway.steps || [],
      completion_badge_type_id: pathway.completion_badge_type_id || null,
      estimated_hours: pathway.estimated_hours || null,
      icon: pathway.icon || null,
      color: pathway.color || 'from-indigo-500 to-purple-600',
      status: pathway.status || 'draft',
      is_featured: pathway.is_featured || false,
    });
    setEditing(true);
  }

  if (!profile || !hasRoleLevel(profile.role, 'admin')) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  // ========== LIST VIEW ==========
  if (!editing) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Admin', path: '/platform-admin' },
            { label: 'Pathways', path: '/platform-admin/pathways' },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Compass className="w-8 h-8 text-indigo-600" />
              Pathways
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage growth pathways for your community.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/platform-admin/pathway-progress')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Progress Tracker
            </Button>
            <Button onClick={() => { setForm(emptyForm()); setEditing(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              New Pathway
            </Button>
          </div>
        </div>

        {loadingPathways ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : pathways.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Compass className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 mb-2">No Pathways Yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first pathway to give your community a clear direction for growth.
                Pathways connect courses and programs into a meaningful journey.
              </p>
              <Button onClick={() => { setForm(emptyForm()); setEditing(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Pathway
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pathways.map((pathway) => (
              <Card key={pathway.id} className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${pathway.color || 'from-indigo-500 to-purple-600'}`} />
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{pathway.name}</h3>
                        <Badge variant={pathway.status === 'published' ? 'default' : 'outline'}>
                          {pathway.status}
                        </Badge>
                        {pathway.is_featured && (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {pathway.destination || pathway.short_description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{pathway.steps?.length || 0} steps</span>
                        <span>{pathway.enrollment_count || 0} enrolled</span>
                        <span>{pathway.completion_count || 0} completed</span>
                        {pathway.relevant_tags?.length > 0 && (
                          <span>{pathway.relevant_tags.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editPathway(pathway)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => archivePathway(pathway.id)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ========== EDIT/CREATE FORM ==========
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Admin', path: '/platform-admin' },
          { label: 'Pathways', path: '/platform-admin/pathways' },
          { label: form.id ? 'Edit Pathway' : 'New Pathway', path: '#' },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {form.id ? 'Edit Pathway' : 'Create New Pathway'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setEditing(false); setForm(emptyForm()); }}>
            Cancel
          </Button>
          <Button onClick={savePathway} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Pathway'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Pathway Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Become an Executive Coach"
            />
          </div>

          <div>
            <Label htmlFor="destination">Destination (what you'll achieve) *</Label>
            <Input
              id="destination"
              value={form.destination}
              onChange={e => setForm(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="e.g., Confidently coach executives through career transitions"
            />
            <p className="text-xs text-gray-400 mt-1">
              This is the aspiration — where this pathway takes someone. It drives recommendations.
            </p>
          </div>

          <div>
            <Label htmlFor="short_description">Short Description</Label>
            <Input
              id="short_description"
              value={form.short_description}
              onChange={e => setForm(prev => ({ ...prev, short_description: e.target.value }))}
              placeholder="One-liner for pathway cards"
            />
          </div>

          <div>
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of what this pathway covers..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                value={form.estimated_hours || ''}
                onChange={e => setForm(prev => ({ ...prev, estimated_hours: e.target.value ? Number(e.target.value) : null }))}
                placeholder="e.g., 40"
              />
            </div>
            <div>
              <Label>Color Theme</Label>
              <Select
                value={form.color}
                onValueChange={v => setForm(prev => ({ ...prev, color: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.status === 'published'}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, status: checked ? 'published' : 'draft' }))}
                />
                <Label>Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={checked => setForm(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label>Featured</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matching Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matching Signals</CardTitle>
          <p className="text-sm text-gray-500">
            These fields determine which users see this pathway as a recommendation. Match against their interests, topics, roles, and career stage.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topics */}
          <div>
            <Label>Relevant Topics</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.relevant_topics.includes(topic.id)
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {topic.name}
                </button>
              ))}
              {topics.length === 0 && (
                <p className="text-xs text-gray-400">No topics found in the system.</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Relevant Tags (free-form, match user interests)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Type a tag and press Enter"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.relevant_tags.map(tag => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div>
            <Label>Target Roles</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={roleInput}
                onChange={e => setRoleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRole())}
                placeholder="Type a role and press Enter"
                className="flex-1"
                list="role-suggestions"
              />
              <datalist id="role-suggestions">
                {COMMON_ROLES.map(r => <option key={r} value={r} />)}
              </datalist>
              <Button variant="outline" size="sm" onClick={addRole}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.target_roles.map(role => (
                <Badge key={role} variant="outline" className="flex items-center gap-1">
                  {role}
                  <button onClick={() => removeRole(role)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Career Stages */}
          <div>
            <Label>Target Career Stages</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CAREER_STAGES.map(stage => (
                <button
                  key={stage}
                  onClick={() => toggleCareerStage(stage)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                    form.target_career_stages.includes(stage)
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {stage.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pathway Steps</CardTitle>
          <p className="text-sm text-gray-500">
            Add courses, programs, and platform activities in the order learners should complete them.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Course/Program — Search */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Add Course or Program</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchContent())}
                  placeholder="Search courses and programs..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={searchContent} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {searchResults.map(result => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => addStep(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {result.type === 'course' ? (
                    <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  )}
                  <span className="text-sm flex-1">{result.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {/* Add Activity Step */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Add Platform Activity</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(ACTIVITY_TYPES).map(([key, def]) => {
                const hasTable = !!ACTIVITY_TABLE_MAP[key];
                const isActive = pendingActivityType === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (hasTable) {
                        if (isActive) {
                          setPendingActivityType(null);
                          setInstanceQuery('');
                          setInstanceResults([]);
                        } else {
                          setPendingActivityType(key);
                          setInstanceQuery('');
                          setInstanceResults([]);
                        }
                      } else {
                        addActivityStep(key);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 text-left text-xs rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-green-100 border-green-400 ring-1 ring-green-400'
                        : 'border-gray-200 hover:bg-green-50 hover:border-green-300'
                    }`}
                  >
                    {getActivityIcon(key)}
                    <span className="truncate flex-1">{def.label}</span>
                    {hasTable && <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instance Picker — appears when an activity type with a table is selected */}
          {pendingActivityType && ACTIVITY_TABLE_MAP[pendingActivityType] && (
            <div className="border border-green-300 rounded-lg bg-green-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getActivityIcon(pendingActivityType)}
                  <span className="text-sm font-medium">
                    Select a specific {ACTIVITY_TYPES[pendingActivityType]?.label.toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPendingActivityType(null);
                    setInstanceQuery('');
                    setInstanceResults([]);
                  }}
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={instanceQuery}
                    onChange={e => {
                      setInstanceQuery(e.target.value);
                      if (e.target.value.length >= 2) searchInstances(e.target.value);
                      if (e.target.value === '') setInstanceResults([]);
                    }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchInstances(instanceQuery))}
                    placeholder={`Search for a specific ${ACTIVITY_TYPES[pendingActivityType]?.label.toLowerCase()}...`}
                    className="pl-9 bg-white"
                    autoFocus
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchInstances(instanceQuery)}
                  disabled={searchingInstances}
                >
                  {searchingInstances ? '...' : 'Search'}
                </Button>
              </div>

              {instanceResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-44 overflow-y-auto bg-white">
                  {instanceResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => addActivityStep(pendingActivityType, result.id, result.title)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-green-50 transition-colors text-left"
                    >
                      {getActivityIcon(pendingActivityType)}
                      <span className="text-sm flex-1 truncate">{result.title}</span>
                      <Plus className="w-4 h-4 text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {instanceQuery.length >= 2 && !searchingInstances && instanceResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-1">No results found</p>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-green-200">
                <span className="text-xs text-gray-400">Don't need a specific item?</span>
                <button
                  onClick={() => addActivityStep(pendingActivityType)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Add as generic activity →
                </button>
              </div>
            </div>
          )}

          {/* Current steps */}
          {form.steps.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg py-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No steps added yet. Search for courses/programs or pick an activity above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {form.steps
                .sort((a, b) => a.order_index - b.order_index)
                .map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg ${step.step_type === 'activity' ? 'bg-green-50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Order number */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        step.step_type === 'activity'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Icon */}
                      {step.step_type === 'course' ? (
                        <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : step.step_type === 'program' ? (
                        <GraduationCap className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      ) : (
                        <span className="flex-shrink-0">{getActivityIcon(step.activity_type)}</span>
                      )}

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{step.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            step.step_type === 'activity' ? 'text-green-600 border-green-300' : ''
                          }`}>
                            {step.step_type === 'activity' ? (ACTIVITY_TYPES[step.activity_type || '']?.category || 'Activity') : step.step_type}
                          </Badge>
                          {!step.is_required && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400">
                              optional
                            </Badge>
                          )}
                          {step.step_type === 'activity' && step.verification_method && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-500 border-blue-200">
                              {step.verification_method === 'self_report' ? 'Self-report' :
                               step.verification_method === 'admin_verify' ? 'Admin verify' : 'Auto'}
                            </Badge>
                          )}
                          {step.step_type !== 'activity' && step.allow_skip && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500">
                              skippable
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const newSteps = [...form.steps];
                            newSteps[index] = { ...step, is_required: !step.is_required };
                            setForm(prev => ({ ...prev, steps: newSteps }));
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            step.is_required ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                          }`}
                          title="Toggle required"
                        >
                          {step.is_required ? 'Required' : 'Optional'}
                        </button>
                        {step.step_type !== 'activity' && (
                          <button
                            onClick={() => {
                              const newSteps = [...form.steps];
                              newSteps[index] = { ...step, allow_skip: !step.allow_skip };
                              setForm(prev => ({ ...prev, steps: newSteps }));
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded ${
                              step.allow_skip ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
                            }`}
                            title="Toggle skip"
                          >
                            {step.allow_skip ? 'Skippable' : 'No skip'}
                          </button>
                        )}
                      </div>

                      {/* Move buttons */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === form.steps.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Activity verification method selector */}
                    {step.step_type === 'activity' && (
                      <div className="mt-2 ml-10 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Verification:</span>
                        {VERIFICATION_METHODS.map(vm => (
                          <button
                            key={vm.value}
                            onClick={() => updateStepVerification(step.id, vm.value as any)}
                            className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                              step.verification_method === vm.value
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={vm.description}
                          >
                            {vm.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline instance assignment — for activity steps that have a table */}
                    {step.step_type === 'activity' && ACTIVITY_TABLE_MAP[step.activity_type || ''] && (
                      <div className="mt-2 ml-10">
                        {editingInstanceStepId === step.id ? (
                          /* Picker open */
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input
                                  value={editInstanceQuery}
                                  onChange={e => {
                                    setEditInstanceQuery(e.target.value);
                                    if (e.target.value.length >= 2)
                                      searchEditInstances(step.activity_type!, e.target.value);
                                    if (e.target.value === '') setEditInstanceResults([]);
                                  }}
                                  onKeyDown={e =>
                                    e.key === 'Enter' &&
                                    (e.preventDefault(), searchEditInstances(step.activity_type!, editInstanceQuery))
                                  }
                                  placeholder={`Search ${ACTIVITY_TYPES[step.activity_type || '']?.label.toLowerCase()}s...`}
                                  className="pl-7 h-7 text-xs bg-white"
                                  autoFocus
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={closeStepInstancePicker}
                              >
                                Cancel
                              </Button>
                            </div>

                            {editInstanceResults.length > 0 && (
                              <div className="border rounded-md divide-y max-h-36 overflow-y-auto bg-white text-xs shadow-sm">
                                {editInstanceResults.map(result => (
                                  <button
                                    key={result.id}
                                    onClick={() => updateStepInstance(step.id, result.id, result.title)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-green-50 transition-colors text-left"
                                  >
                                    {getActivityIcon(step.activity_type)}
                                    <span className="flex-1 truncate">{result.title}</span>
                                    <Plus className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {editInstanceQuery.length >= 2 && !searchingEditInstances && editInstanceResults.length === 0 && (
                              <p className="text-[10px] text-gray-400 italic">No results found</p>
                            )}

                            {step.activity_criteria?.target_id && (
                              <button
                                onClick={() => updateStepInstance(step.id, null, null)}
                                className="text-[10px] text-red-400 hover:text-red-600"
                              >
                                Clear specific assignment
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Picker closed — show current assignment + action button */
                          <div className="flex items-center gap-2">
                            {step.activity_criteria?.target_title ? (
                              <>
                                <span className="text-xs text-green-700 font-medium">
                                  → {step.activity_criteria.target_title}
                                </span>
                                <button
                                  onClick={() => openStepInstancePicker(step.id)}
                                  className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline underline-offset-1"
                                >
                                  Change
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openStepInstancePicker(step.id)}
                                className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Assign specific item
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Reward */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Reward</CardTitle>
          <p className="text-sm text-gray-500">
            Select a badge to auto-issue when a user completes all required steps.
          </p>
        </CardHeader>
        <CardContent>
          <Select
            value={form.completion_badge_type_id || 'none'}
            onValueChange={v => setForm(prev => ({ ...prev, completion_badge_type_id: v === 'none' ? null : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a badge type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No badge</SelectItem>
              {badgeTypes.map(badge => (
                <SelectItem key={badge.id} value={badge.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: badge.badge_color }}
                    />
                    {badge.name} ({badge.category})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bottom save bar */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => { setEditing(false); setForm(emptyForm()); }}>
          Cancel
        </Button>
        <Button onClick={savePathway} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Pathway'}
        </Button>
      </div>
    </div>
  );
}

function emptyForm(): PathwayForm {
  return {
    name: '',
    description: '',
    short_description: '',
    destination: '',
    relevant_topics: [],
    relevant_tags: [],
    target_roles: [],
    target_career_stages: [],
    steps: [],
    completion_badge_type_id: null,
    estimated_hours: null,
    icon: null,
    color: 'from-indigo-500 to-purple-600',
    status: 'draft',
    is_featured: false,
  };
}