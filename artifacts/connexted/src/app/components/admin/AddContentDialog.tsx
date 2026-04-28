// COMPREHENSIVE Add Content Dialog Component
// Supports all journey item types organized by category + interactive types (created inline).
import { useState, useEffect } from 'react';
import { Plus, FileText, BookOpen, Presentation, Library, PlayCircle, Calendar, MessageSquare, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CONTAINER_TYPES, ContainerType } from '@/lib/container-types';
import { JOURNEY_ITEM_TYPES, JourneyItemType, getItemTypesByCategory } from '@/lib/journey-item-types';

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJourney: { id: string; title: string; circle_id?: string | null } | null;
  onSuccess: () => void;
  profileId?: string;
  programCircleId?: string | null;  // NEW: Pass the program's circle_id to filter
  communityId?: string | null;      // NEW: Pass the community_id to filter
}

export function AddContentDialog({ open, onOpenChange, selectedJourney, onSuccess, profileId, programCircleId, communityId }: AddContentDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<'content' | 'container' | 'other' | 'interactive'>('content');
  const [selectedType, setSelectedType] = useState<JourneyItemType>('document');
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [form, setForm] = useState({
    existing_item_id: '',
    title: '',
    description: '',
    is_published: true
  });

  // Interactive creation form state
  const [interactive, setInteractive] = useState({
    title: '',
    description: '',
    // poll
    pollQuestion: '',
    pollOptions: ['', ''],
    // reflection
    reflectionPrompt: '',
    // assignment
    assignmentDueAt: '',
    assignmentSubmissionType: 'text' as 'text' | 'link' | 'both',
    assignmentRubric: '',
    // faq
    faqFirstQuestion: '',
    faqFirstAnswer: '',
    // schedule_picker
    scheduleSlots: ['', ''],
  });
  const [submittingInteractive, setSubmittingInteractive] = useState(false);

  // Fetch items when type changes (only for non-interactive categories)
  useEffect(() => {
    if (open && selectedType !== 'container' && selectedCategory !== 'interactive') {
      fetchItemsForType(selectedType);
    }
  }, [open, selectedType]);

  // Update selected type when category changes
  useEffect(() => {
    const typesInCategory = getItemTypesByCategory(selectedCategory);
    if (typesInCategory.length > 0) {
      setSelectedType(typesInCategory[0]);
    }
  }, [selectedCategory]);

  const fetchItemsForType = async (type: JourneyItemType) => {
    setLoadingItems(true);
    try {
      const config = JOURNEY_ITEM_TYPES[type];
      if (!config.tableName) {
        setAvailableItems([]);
        return;
      }

      // Determine which fields to select based on table
      let selectFields = 'id, name, description';
      
      // Some tables use different field names
      if (type === 'document' || type === 'book' || type === 'deck' || type === 'episode') {
        selectFields = 'id, title, description';
      } else if (type === 'shelf') {
        selectFields = 'id, name, description';
      } else if (type === 'event') {
        selectFields = 'id, title, description';
      } else if (type === 'playlist') {
        selectFields = 'id, name, description';
      }

      const { data, error } = await supabase
        .from(config.tableName)
        .select(selectFields)
        .order(type === 'document' || type === 'book' || type === 'deck' || type === 'event' || type === 'episode' ? 'title' : 'name');

      if (error) {
        console.warn(`Error fetching ${type}:`, error);
        setAvailableItems([]);
        return;
      }

      // Normalize the data to always have 'name' field
      const normalized = (data || []).map((item: any) => ({
        ...item,
        name: item.name || item.title
      }));

      setAvailableItems(normalized);
    } catch (error: any) {
      console.error(`Error fetching ${type}:`, error);
      setAvailableItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedJourney) {
      toast.error('No journey selected');
      return;
    }

    if (!form.existing_item_id) {
      toast.error('Please select an item');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      // Get current max order
      const { data: existingItems } = await supabase
        .from('journey_items')
        .select('order_index')
        .eq('journey_id', selectedJourney.id);

      const maxOrder = Math.max(...(existingItems || []).map(i => i.order_index), -1);

      const { error } = await supabase
        .from('journey_items')
        .insert({
          journey_id: selectedJourney.id,
          item_type: selectedType,
          item_id: form.existing_item_id,
          title: form.title,
          description: form.description || null,
          order_index: maxOrder + 1,
          is_published: form.is_published,
        });

      if (error) throw error;

      toast.success('Content added to journey!');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding content:', error);
      toast.error('Failed to add content');
    }
  };

  const resetForm = () => {
    setForm({ existing_item_id: '', title: '', description: '', is_published: true });
    setInteractive({
      title: '', description: '',
      pollQuestion: '', pollOptions: ['', ''],
      reflectionPrompt: '',
      assignmentDueAt: '', assignmentSubmissionType: 'text', assignmentRubric: '',
      faqFirstQuestion: '', faqFirstAnswer: '',
      scheduleSlots: ['', ''],
    });
  };

  const handleInteractiveSubmit = async () => {
    if (!selectedJourney || !profileId) return;
    if (!interactive.title.trim()) { toast.error('Title is required'); return; }
    setSubmittingInteractive(true);
    try {
      let newItemId: string | null = null;

      if (selectedType === 'poll') {
        if (!interactive.pollQuestion.trim()) { toast.error('Poll question is required'); return; }
        const filledOptions = interactive.pollOptions.filter(o => o.trim());
        if (filledOptions.length < 2) { toast.error('At least 2 options are required'); return; }
        const slug = interactive.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        const { data: survey, error: sErr } = await supabase
          .from('surveys')
          .insert({ name: interactive.title.trim(), slug, description: interactive.description || null, survey_type: 'poll', status: 'active', created_by: profileId })
          .select('id').single();
        if (sErr || !survey) throw sErr;
        const options = filledOptions.map(text => ({ id: crypto.randomUUID(), text }));
        const { error: qErr } = await supabase.from('survey_questions').insert({
          survey_id: survey.id, order_index: 0, question_type: 'multiple_choice',
          text: interactive.pollQuestion.trim(), options, is_required: true,
        });
        if (qErr) throw qErr;
        newItemId = survey.id;

      } else if (selectedType === 'reflection') {
        if (!interactive.reflectionPrompt.trim()) { toast.error('Reflection prompt is required'); return; }
        const { data: r, error } = await supabase
          .from('reflections')
          .insert({ title: interactive.title.trim(), prompt: interactive.reflectionPrompt.trim(), description: interactive.description || null, created_by: profileId })
          .select('id').single();
        if (error || !r) throw error;
        newItemId = r.id;

      } else if (selectedType === 'assignment') {
        const { data: a, error } = await supabase
          .from('assignments')
          .insert({
            title: interactive.title.trim(),
            description: interactive.description || null,
            rubric: interactive.assignmentRubric || null,
            due_at: interactive.assignmentDueAt || null,
            submission_type: interactive.assignmentSubmissionType,
            created_by: profileId,
          })
          .select('id').single();
        if (error || !a) throw error;
        newItemId = a.id;

      } else if (selectedType === 'faq') {
        const { data: f, error } = await supabase
          .from('faqs')
          .insert({ title: interactive.title.trim(), description: interactive.description || null, created_by: profileId })
          .select('id').single();
        if (error || !f) throw error;
        if (interactive.faqFirstQuestion.trim() && interactive.faqFirstAnswer.trim()) {
          await supabase.from('faq_items').insert({ faq_id: f.id, question: interactive.faqFirstQuestion.trim(), answer: interactive.faqFirstAnswer.trim(), order_index: 0 });
        }
        newItemId = f.id;

      } else if (selectedType === 'schedule_picker') {
        const filledSlots = interactive.scheduleSlots.filter(s => s.trim());
        if (filledSlots.length < 2) { toast.error('At least 2 time slots are required'); return; }
        const { data: sp, error } = await supabase
          .from('schedule_polls')
          .insert({ title: interactive.title.trim(), description: interactive.description || null, created_by: profileId })
          .select('id').single();
        if (error || !sp) throw error;
        await supabase.from('schedule_slots').insert(
          filledSlots.map((label, i) => ({ schedule_poll_id: sp.id, label, order_index: i }))
        );
        newItemId = sp.id;
      }

      if (!newItemId) throw new Error('No item created');

      // Get current max order
      const { data: existingItems } = await supabase.from('journey_items').select('order_index').eq('journey_id', selectedJourney.id);
      const maxOrder = Math.max(...(existingItems || []).map(i => i.order_index), -1);

      const { error: jiErr } = await supabase.from('journey_items').insert({
        journey_id: selectedJourney.id,
        item_type: selectedType,
        item_id: newItemId,
        title: interactive.title.trim(),
        description: interactive.description || null,
        order_index: maxOrder + 1,
        is_published: true,
      });
      if (jiErr) throw jiErr;

      toast.success(`${JOURNEY_ITEM_TYPES[selectedType].label} added to journey!`);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (err: any) {
      console.error('Error creating interactive item:', err);
      toast.error('Failed to create item');
    } finally {
      setSubmittingInteractive(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const item = availableItems.find(i => i.id === itemId);
    setForm({
      ...form,
      existing_item_id: itemId,
      title: item?.name || item?.title || '',
      description: item?.description || ''
    });
  };

  const typesInCategory = getItemTypesByCategory(selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content to Journey</DialogTitle>
          <DialogDescription>
            Add existing content items to "{selectedJourney?.title}"
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as typeof selectedCategory)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="container">
              <Presentation className="w-4 h-4 mr-1" />
              Containers
            </TabsTrigger>
            <TabsTrigger value="other">
              <Calendar className="w-4 h-4 mr-1" />
              Other
            </TabsTrigger>
            <TabsTrigger value="interactive">
              <Zap className="w-4 h-4 mr-1" />
              Interactive
            </TabsTrigger>
          </TabsList>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select {JOURNEY_ITEM_TYPES[selectedType].label}
              </label>
              <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${JOURNEY_ITEM_TYPES[selectedType].label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {loadingItems ? (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  ) : availableItems.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No {JOURNEY_ITEM_TYPES[selectedType].labelPlural.toLowerCase()} available
                    </div>
                  ) : (
                    availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="How this appears in the journey"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What learners will do..."
                rows={2}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </TabsContent>

          {/* CONTAINER TAB */}
          <TabsContent value="container" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Container Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select {JOURNEY_ITEM_TYPES[selectedType].label}
              </label>
              <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${JOURNEY_ITEM_TYPES[selectedType].label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {loadingItems ? (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  ) : availableItems.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No {JOURNEY_ITEM_TYPES[selectedType].labelPlural.toLowerCase()} available
                    </div>
                  ) : (
                    availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="How this appears in the journey"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What learners will do..."
                rows={2}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </TabsContent>

          {/* OTHER TAB */}
          <TabsContent value="other" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedType === 'event' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Event</label>
                  <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingItems ? (
                        <div className="p-2 text-sm text-gray-500">Loading...</div>
                      ) : availableItems.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No events available</div>
                      ) : (
                        availableItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name || item.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="How this appears in the journey"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What learners will do..."
                    rows={2}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">Published</span>
                  </label>
                </div>
              </>
            )}

            {(selectedType === 'discussion' || selectedType === 'resource') && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  {selectedType === 'discussion' 
                    ? 'Discussions linking coming soon - use Forums to create discussions first'
                    : 'Resources allow you to link external URLs and files'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* INTERACTIVE TAB */}
          <TabsContent value="interactive" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Interactive Type</label>
              <div className="grid grid-cols-2 gap-2">
                {getItemTypesByCategory('interactive').map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shared fields */}
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={interactive.title} onChange={e => setInteractive(p => ({ ...p, title: e.target.value }))} placeholder="How this step appears in the journey" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <Textarea value={interactive.description} onChange={e => setInteractive(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Brief context shown to learners" />
            </div>

            {/* Type-specific fields */}
            {selectedType === 'poll' && (
              <div className="space-y-3 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-1 block">Poll Question</label>
                  <Input value={interactive.pollQuestion} onChange={e => setInteractive(p => ({ ...p, pollQuestion: e.target.value }))} placeholder="e.g. Which topic should we cover next?" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Options</label>
                  <div className="space-y-2">
                    {interactive.pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={opt} onChange={e => { const o = [...interactive.pollOptions]; o[i] = e.target.value; setInteractive(p => ({ ...p, pollOptions: o })); }} placeholder={`Option ${i + 1}`} />
                        {interactive.pollOptions.length > 2 && (
                          <Button variant="ghost" size="sm" onClick={() => setInteractive(p => ({ ...p, pollOptions: p.pollOptions.filter((_, j) => j !== i) }))}>×</Button>
                        )}
                      </div>
                    ))}
                    {interactive.pollOptions.length < 6 && (
                      <Button variant="outline" size="sm" onClick={() => setInteractive(p => ({ ...p, pollOptions: [...p.pollOptions, ''] }))}>
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'reflection' && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <label className="text-sm font-medium mb-1 block">Reflection Prompt</label>
                <Textarea value={interactive.reflectionPrompt} onChange={e => setInteractive(p => ({ ...p, reflectionPrompt: e.target.value }))} rows={3} placeholder="e.g. What's your biggest insight from this module?" />
              </div>
            )}

            {selectedType === 'assignment' && (
              <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-1 block">Submission Type</label>
                  <Select value={interactive.assignmentSubmissionType} onValueChange={v => setInteractive(p => ({ ...p, assignmentSubmissionType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text write-up</SelectItem>
                      <SelectItem value="link">Link (URL)</SelectItem>
                      <SelectItem value="both">Text or Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <Input type="datetime-local" value={interactive.assignmentDueAt} onChange={e => setInteractive(p => ({ ...p, assignmentDueAt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Rubric / Grading Criteria <span className="text-gray-400 font-normal">(optional)</span></label>
                  <Textarea value={interactive.assignmentRubric} onChange={e => setInteractive(p => ({ ...p, assignmentRubric: e.target.value }))} rows={3} placeholder="How submissions will be evaluated..." />
                </div>
              </div>
            )}

            {selectedType === 'faq' && (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">You can add more Q&A pairs after creating this step by opening it from the journey.</p>
                <div>
                  <label className="text-sm font-medium mb-1 block">First Question <span className="text-gray-400 font-normal">(optional)</span></label>
                  <Input value={interactive.faqFirstQuestion} onChange={e => setInteractive(p => ({ ...p, faqFirstQuestion: e.target.value }))} placeholder="e.g. What do I need to complete this module?" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Answer</label>
                  <Textarea value={interactive.faqFirstAnswer} onChange={e => setInteractive(p => ({ ...p, faqFirstAnswer: e.target.value }))} rows={2} placeholder="Answer text..." />
                </div>
              </div>
            )}

            {selectedType === 'schedule_picker' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <label className="text-sm font-medium block">Time Slots</label>
                {interactive.scheduleSlots.map((slot, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={slot} onChange={e => { const s = [...interactive.scheduleSlots]; s[i] = e.target.value; setInteractive(p => ({ ...p, scheduleSlots: s })); }} placeholder={`e.g. Tue May 6 at 2pm EST`} />
                    {interactive.scheduleSlots.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => setInteractive(p => ({ ...p, scheduleSlots: p.scheduleSlots.filter((_, j) => j !== i) }))}>×</Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setInteractive(p => ({ ...p, scheduleSlots: [...p.scheduleSlots, ''] }))}>
                  <Plus className="w-3 h-3 mr-1" /> Add Slot
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedCategory === 'interactive' ? (
            <Button onClick={handleInteractiveSubmit} disabled={submittingInteractive || !interactive.title.trim()}>
              {submittingInteractive && <span className="mr-2 animate-spin">⏳</span>}
              <Plus className="w-4 h-4 mr-2" />
              Create & Add to Journey
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!form.existing_item_id || !form.title.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add to Journey
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}