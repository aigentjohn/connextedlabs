import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Star,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  Sparkles,
  Newspaper,
  Save,
  Globe,
  Lock,
  Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Magazine {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon?: string;
  cover_image_url?: string;
  curator_id: string;
  owner_type: string;
  owner_id?: string;
  curation_type: 'auto' | 'curated' | 'hybrid';
  publishing_frequency?: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  is_featured: boolean;
  status: string;
  subscriber_count: number;
  blog_count: number;
}

export default function MagazineSettingsPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [magazine, setMagazine] = useState<Magazine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && profile) {
      fetchMagazine();
    }
  }, [id, profile]);

  const fetchMagazine = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('magazines')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const isOwner = data.curator_id === profile?.id;
      const isAdmin = profile?.role === 'super' || profile?.role === 'admin';

      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to edit this magazine');
        navigate(`/magazines/${id}`);
        return;
      }

      setMagazine(data);
    } catch (error: any) {
      console.error('Error fetching magazine:', error);
      toast.error('Failed to load magazine');
      navigate('/magazines');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="text-center py-12">Please log in</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!magazine) {
    return <div className="text-center py-12">Magazine not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/magazines/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Magazine
          </Button>
        </Link>
      </div>

      <Breadcrumbs
        items={[
          { label: 'Magazines', href: '/magazines' },
          { label: magazine.name, href: `/magazines/${id}` },
          { label: 'Settings' }
        ]}
      />

      <div>
        <h1 className="text-3xl mb-2">Magazine Settings</h1>
        <p className="text-gray-600">Manage {magazine.name}</p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="info">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Info</span>
          </TabsTrigger>
          <TabsTrigger value="curation">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Curation</span>
          </TabsTrigger>
          <TabsTrigger value="visibility">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Visibility</span>
          </TabsTrigger>
          <TabsTrigger value="social">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Subscribers</span>
          </TabsTrigger>
          <TabsTrigger value="danger">
            <Trash2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4 mt-6">
          <InfoTab magazine={magazine} setMagazine={setMagazine} />
        </TabsContent>

        {/* Curation Tab */}
        <TabsContent value="curation" className="space-y-4 mt-6">
          <CurationTab magazine={magazine} setMagazine={setMagazine} />
        </TabsContent>

        {/* Visibility Tab */}
        <TabsContent value="visibility" className="space-y-4 mt-6">
          <VisibilityTab magazine={magazine} setMagazine={setMagazine} />
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-4 mt-6">
          <SocialTab magazine={magazine} setMagazine={setMagazine} />
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4 mt-6">
          <SubscribersTab magazineId={magazine.id} />
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-4 mt-6">
          <DangerTab magazine={magazine} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Info Tab Component
function InfoTab({ magazine, setMagazine }: { magazine: Magazine; setMagazine: (m: Magazine) => void }) {
  const [name, setName] = useState(magazine.name);
  const [tagline, setTagline] = useState(magazine.tagline);
  const [description, setDescription] = useState(magazine.description);
  const [icon, setIcon] = useState(magazine.icon || '');
  const [coverImageUrl, setCoverImageUrl] = useState(magazine.cover_image_url || '');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch topics when component mounts
  useEffect(() => {
    fetchTopics();
  }, [magazine.id]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('content_topics')
        .select('topic_id')
        .eq('content_type', 'magazine')
        .eq('content_id', magazine.id);
      
      if (error) throw error;
      if (data) {
        setSelectedTopicIds(data.map((t: any) => t.topic_id));
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const saveTopics = async () => {
    try {
      // Delete existing topics
      await supabase
        .from('content_topics')
        .delete()
        .eq('content_type', 'magazine')
        .eq('content_id', magazine.id);

      // Insert new topics
      if (selectedTopicIds.length > 0) {
        const { error } = await supabase
          .from('content_topics')
          .insert(
            selectedTopicIds.map(topicId => ({
              content_type: 'magazine',
              content_id: magazine.id,
              topic_id: topicId
            }))
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving topics:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a magazine name');
      return;
    }

    if (!tagline.trim()) {
      toast.error('Please enter a tagline');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .update({
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          tagline: tagline.trim(),
          description: description.trim(),
          icon: icon.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magazine.id)
        .select()
        .single();

      if (error) throw error;

      // Save topics
      await saveTopics();

      setMagazine(data);
      toast.success('Magazine info updated successfully');
    } catch (error: any) {
      console.error('Error updating magazine:', error);
      toast.error('Failed to update magazine info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update magazine name, tagline, and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Magazine Name*</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Startup Founders Weekly"
            />
          </div>

          <div>
            <Label htmlFor="tagline">Tagline*</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short, catchy description"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{tagline.length}/100 characters</p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this magazine about?"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="icon">Icon (emoji)</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📰"
              maxLength={2}
            />
          </div>

          <div>
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <Input
              id="coverImageUrl"
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <Label>Topics (Who is this magazine FOR?)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Select up to 5 topics to help your target audience discover this collection
            </p>
            <TopicSelector
              value={selectedTopicIds}
              onChange={setSelectedTopicIds}
              maxTopics={5}
              placeholder="Select topics for this magazine..."
              showSuggestions={true}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </>
  );
}

// Curation Tab Component
function CurationTab({ magazine, setMagazine }: { magazine: Magazine; setMagazine: (m: Magazine) => void }) {
  const [curationType, setCurationType] = useState(magazine.curation_type);
  const [publishingFrequency, setPublishingFrequency] = useState(magazine.publishing_frequency || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .update({
          curation_type: curationType,
          publishing_frequency: publishingFrequency || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magazine.id)
        .select()
        .single();

      if (error) throw error;

      setMagazine(data);
      toast.success('Curation settings updated successfully');
    } catch (error: any) {
      console.error('Error updating curation settings:', error);
      toast.error('Failed to update curation settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Curation Strategy</CardTitle>
          <CardDescription>Configure how blogs are added to this magazine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="curationType">Curation Type</Label>
            <Select value={curationType} onValueChange={(value: any) => setCurationType(value)}>
              <SelectTrigger id="curationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div>
                    <div className="font-medium">Auto-Curated</div>
                    <div className="text-sm text-gray-500">Blogs automatically added by topic/audience filters</div>
                  </div>
                </SelectItem>
                <SelectItem value="curated">
                  <div>
                    <div className="font-medium">Manual Curation</div>
                    <div className="text-sm text-gray-500">You manually select which blogs to include</div>
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div>
                    <div className="font-medium">Hybrid</div>
                    <div className="text-sm text-gray-500">Auto-include blogs + manually feature favorites</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="publishingFrequency">Publishing Frequency</Label>
            <Select value={publishingFrequency} onValueChange={setPublishingFrequency}>
              <SelectTrigger id="publishingFrequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="continuous">Continuous - Always updating</SelectItem>
                <SelectItem value="daily">Daily - New edition each day</SelectItem>
                <SelectItem value="weekly">Weekly - New edition each week</SelectItem>
                <SelectItem value="monthly">Monthly - New edition each month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </>
  );
}

// Visibility Tab Component
function VisibilityTab({ magazine, setMagazine }: { magazine: Magazine; setMagazine: (m: Magazine) => void }) {
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>(magazine.visibility);
  const [isFeatured, setIsFeatured] = useState(magazine.is_featured);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('magazines')
        .update({
          visibility,
          is_featured: isFeatured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magazine.id)
        .select()
        .single();

      if (error) throw error;

      setMagazine(data);
      toast.success('Visibility settings updated successfully');
    } catch (error: any) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility settings');
    } finally {
      setSaving(false);
    }
  };

  const visibilityOptions = [
    {
      value: 'public' as const,
      label: 'Public',
      description: 'Anyone can discover and view this magazine',
      icon: <Globe className="w-5 h-5 text-green-600" />,
    },
    {
      value: 'member' as const,
      label: 'Members Only',
      description: 'Only platform members can view this magazine',
      icon: <Users className="w-5 h-5 text-blue-600" />,
    },
    {
      value: 'unlisted' as const,
      label: 'Unlisted',
      description: 'Not listed publicly — only accessible via direct link',
      icon: <EyeOff className="w-5 h-5 text-yellow-600" />,
    },
    {
      value: 'private' as const,
      label: 'Private',
      description: 'Only you and invited editors can view this magazine',
      icon: <Lock className="w-5 h-5 text-red-600" />,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Visibility Settings
          </CardTitle>
          <CardDescription>Control who can discover and view this magazine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibilityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-colors ${
                visibility === option.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="shrink-0">{option.icon}</div>
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                visibility === option.value
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-gray-300'
              }`} />
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </>
  );
}

// Social Tab Component
function SocialTab({ magazine, setMagazine }: { magazine: Magazine; setMagazine: (m: Magazine) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Social Features
        </CardTitle>
        <CardDescription>Configure social interactions for this magazine</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Social features for magazines coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Subscribers Tab Component
function SubscribersTab({ magazineId }: { magazineId: string }) {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, [magazineId]);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('magazine_subscribers')
        .select('user_id, subscribed_at, users(name, email, avatar)')
        .eq('magazine_id', magazineId)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Subscribers ({subscribers.length})
        </CardTitle>
        <CardDescription>View and manage magazine subscribers</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-600">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-gray-600">No subscribers yet</p>
        ) : (
          <div className="space-y-2">
            {subscribers.map((sub: any) => (
              <div key={sub.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{sub.users?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">{sub.users?.email}</p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(sub.subscribed_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Danger Zone Tab Component
function DangerTab({ magazine }: { magazine: Magazine }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleArchive = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('magazines')
        .update({ status: 'archived' })
        .eq('id', magazine.id);

      if (error) throw error;

      toast.success('Magazine archived successfully');
      navigate('/magazines');
    } catch (error: any) {
      console.error('Error archiving magazine:', error);
      toast.error('Failed to archive magazine');
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Irreversible and destructive actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-red-200">
          <h4 className="font-medium text-red-900 mb-2">Archive this magazine</h4>
          <p className="text-sm text-gray-700 mb-4">
            Archiving will hide this magazine from public view. You can restore it later from your archived magazines.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Archive Magazine
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {magazine.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive the magazine and hide it from public view. 
                  All blogs and subscribers will remain, but the magazine won't be discoverable.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchive} className="bg-red-600 hover:bg-red-700">
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}