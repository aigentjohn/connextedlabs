import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useContentAuth } from '@/lib/content-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Zap, Save, X, CheckSquare, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  assignment: string;
  notes: string;
  priority: number;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export default function CreateSprintPage() {
  const { profile } = useAuth();
  const { userId, ownerFields } = useContentAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchTemplates();
      fetchUsers();
      // Auto-select current user as admin/member
      setSelectedMemberIds(new Set([profile.id]));
    }
  }, [profile]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('checklists')
        .select('*')
        .eq('is_template', true)
        .order('category');

      if (templatesError) throw templatesError;

      // Fetch items for each template
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .order('priority');

      if (itemsError) throw itemsError;

      const templatesWithItems = templatesData.map((template) => ({
        ...template,
        items: itemsData.filter((item) => item.checklist_id === template.id),
      }));

      setTemplates(templatesWithItems);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      // Check if tables don't exist
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        navigate('/checklists/setup');
        return;
      }
      toast.error('Failed to load checklist templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar, email')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const toggleTemplate = (templateId: string) => {
    const newSet = new Set(selectedTemplateIds);
    if (newSet.has(templateId)) {
      newSet.delete(templateId);
    } else {
      newSet.add(templateId);
    }
    setSelectedTemplateIds(newSet);
  };

  const toggleMember = (memberId: string) => {
    const newSet = new Set(selectedMemberIds);
    if (newSet.has(memberId)) {
      // Prevent removing self if you're the only admin
      if (memberId === profile?.id && selectedMemberIds.size === 1) {
        toast.error('You must have at least one admin');
        return;
      }
      newSet.delete(memberId);
    } else {
      newSet.add(memberId);
    }
    setSelectedMemberIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;
    if (!name.trim() || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Generate slug from name
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create sprint
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          slug: slug,
          start_date: startDate,
          end_date: endDate,
          admin_ids: [userId], // Creator is admin
          member_ids: Array.from(selectedMemberIds),
          ...ownerFields('sprints'),
        })
        .select()
        .single();

      if (sprintError) throw sprintError;

      // Create checklist instances from templates
      if (selectedTemplateIds.size > 0) {
        const selectedTemplates = templates.filter((t) => selectedTemplateIds.has(t.id));

        for (const template of selectedTemplates) {
          // Create checklist instance
          const { data: checklistData, error: checklistError } = await supabase
            .from('checklists')
            .insert({
              name: `${template.name} (${name})`,
              description: template.description,
              category: template.category,
              is_template: false,
              ...ownerFields('checklists'),
            })
            .select()
            .single();

          if (checklistError) throw checklistError;

          // Copy items from template to new checklist
          if (template.items && template.items.length > 0) {
            const newItems = template.items.map((item) => ({
              checklist_id: checklistData.id,
              text: item.text,
              assignment: item.assignment,
              notes: item.notes,
              priority: item.priority,
              is_complete: false,
            }));

            const { error: itemsError } = await supabase
              .from('checklist_items')
              .insert(newItems);

            if (itemsError) throw itemsError;
          }

          // Add checklist to sprint
          const { error: sprintChecklistError } = await supabase
            .from('sprint_checklists')
            .insert({
              sprint_id: sprintData.id,
              checklist_id: checklistData.id,
              display_order: 0,
            });

          if (sprintChecklistError) throw sprintChecklistError;
        }
      }

      toast.success('Sprint created');
      navigate(`/sprints/${sprintData.slug}`);
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast.error('Failed to create sprint');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ChecklistTemplate[]>);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sprints', path: '/sprints' },
          { label: 'Create Sprint' },
        ]}
      />

      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Sprint</h1>
            <p className="text-gray-600">Create a new sprint with checklists and team members</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

            <div>
              <Label htmlFor="name">
                Sprint Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Launch Sprint, Feature Development Sprint #3"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are the goals of this sprint?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            </div>
            <p className="text-sm text-gray-600">
              Select team members who will participate in this sprint. You'll be set as admin automatically.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.has(user.id)}
                    onChange={() => toggleMember(user.id)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                        {user.id === profile?.id && (
                          <span className="text-indigo-600 ml-1">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Select Checklist Templates</h2>
            </div>
            <p className="text-sm text-gray-600">
              Choose checklist templates to include in this sprint. Each template will be copied
              into a new checklist instance.
            </p>

            {loadingTemplates ? (
              <p className="text-center py-8 text-gray-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-2">No checklist templates available</p>
                <p className="text-sm text-gray-500">
                  Create checklist templates first, then add them to sprints
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{category}</h3>
                    <div className="space-y-2">
                      {categoryTemplates.map((template) => (
                        <label
                          key={template.id}
                          className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTemplateIds.has(template.id)}
                            onChange={() => toggleTemplate(template.id)}
                            className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{template.name}</div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {template.description}
                              </p>
                            )}
                            {template.items && template.items.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {template.items.length} items
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !startDate || !endDate}
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Creating Sprint...' : 'Create Sprint'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/sprints')}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* JSON Import/Export */}
    </div>
  );
}