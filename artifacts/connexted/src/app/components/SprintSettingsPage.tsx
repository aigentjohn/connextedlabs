import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
  ArrowLeft,
  Shield,
  FileJson,
  Settings,
  Save,
  X,
  Plus,
  Trash2,
  Calendar,
  Eye,
  Image,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

export default function SprintSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sprint, setSprint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchSprint = async () => {
      try {
        const { data, error } = await supabase
          .from('sprints')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setSprint(data);
      } catch (error) {
        console.error('Error fetching sprint:', error);
        toast.error('Failed to load sprint');
        navigate('/sprints');
      } finally {
        setLoading(false);
      }
    };

    fetchSprint();
  }, [slug, navigate]);

  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!sprint) return <div className="text-center py-12">Sprint not found</div>;

  const isAdmin =
    profile.role === 'super' ||
    sprint.admin_ids?.includes(profile.id) ||
    sprint.created_by === profile.id;

  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/sprints/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sprint
        </Button>
      </Link>

      <Breadcrumbs
        items={[
          { label: 'Sprints', href: '/sprints' },
          { label: sprint.name, href: `/sprints/${slug}` },
          { label: 'Settings', href: `/sprints/${slug}/settings` },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-1">Sprint Settings</h1>
        <p className="text-gray-600">Manage {sprint.name}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />Members
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="w-4 h-4 mr-2" />Moderate
          </TabsTrigger>
          <TabsTrigger value="export-import">
            <FileJson className="w-4 h-4 mr-2" />Export/Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTab
            sprint={sprint}
            onUpdate={(updated) => {
              setSprint(updated);
              if (updated.slug !== slug) {
                navigate(`/sprints/${updated.slug}/settings`, { replace: true });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MembersTab
            containerId={sprint.id}
            containerName={sprint.name}
            containerType="sprints"
            memberIds={sprint.member_ids || []}
            adminIds={sprint.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setSprint({ ...sprint, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab
            containerIdField="sprint_ids"
            containerId={sprint.id}
            containerName={sprint.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="mt-6">
          <ExportImportManager
            containerId={sprint.id}
            containerName={sprint.name}
            containerType="sprint"
            circleId={sprint.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab({ sprint, onUpdate }: { sprint: any; onUpdate: (s: any) => void }) {
  const [form, setForm] = useState({
    name: sprint.name || '',
    description: sprint.description || '',
    start_date: sprint.start_date || '',
    end_date: sprint.end_date || '',
    visibility: sprint.visibility || 'public',
    cover_image: sprint.cover_image || '',
    is_permanent: sprint.is_permanent ?? true,
    auto_archive_on_expiration: sprint.auto_archive_on_expiration ?? true,
    expiration_notes: sprint.expiration_notes || '',
  });
  const [tags, setTags] = useState<string[]>(sprint.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const newSlug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const updates: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        visibility: form.visibility,
        cover_image: form.cover_image.trim() || null,
        is_permanent: form.is_permanent,
        auto_archive_on_expiration: form.auto_archive_on_expiration,
        expiration_notes: form.expiration_notes.trim() || null,
        tags,
        slug: newSlug,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sprints')
        .update(updates)
        .eq('id', sprint.id);

      if (error) throw error;

      toast.success('Sprint settings saved');
      onUpdate({ ...sprint, ...updates });
    } catch (error: any) {
      console.error('Error saving sprint:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Sprint name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="What is this sprint about?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="cover_image"
                value={form.cover_image}
                onChange={e => updateField('cover_image', e.target.value)}
                placeholder="https://..."
              />
            </div>
            {form.cover_image && (
              <img
                src={form.cover_image}
                alt="Cover preview"
                className="mt-2 h-32 w-full object-cover rounded-lg border"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-4 h-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={e => updateField('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={e => updateField('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Permanent</Label>
              <p className="text-sm text-gray-500">Sprint runs indefinitely with no expiration</p>
            </div>
            <Switch
              checked={form.is_permanent}
              onCheckedChange={v => updateField('is_permanent', v)}
            />
          </div>

          {!form.is_permanent && (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Auto-archive on Expiration</Label>
                  <p className="text-sm text-gray-500">Automatically archive when the end date passes</p>
                </div>
                <Switch
                  checked={form.auto_archive_on_expiration}
                  onCheckedChange={v => updateField('auto_archive_on_expiration', v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration_notes">Expiration Notes</Label>
                <Textarea
                  id="expiration_notes"
                  value={form.expiration_notes}
                  onChange={e => updateField('expiration_notes', e.target.value)}
                  placeholder="Notes shown to members when sprint expires..."
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-4 h-4" />
            Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Who can see this sprint?</Label>
            <Select value={form.visibility} onValueChange={v => updateField('visibility', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — Anyone can see</SelectItem>
                <SelectItem value="members-only">Members Only — Only members can see</SelectItem>
                <SelectItem value="private">Private — Only admins can see</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            />
            <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
