import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { Users, ArrowLeft, Shield, Eye, Globe, Lock, Sparkles, Link2, Video } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

export default function PitchSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [pitch, setPitch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchPitch = async () => {
      try {
        const { data, error } = await supabase
          .from('pitches')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setPitch(data);
      } catch (error) {
        console.error('Error fetching pitch:', error);
        toast.error('Failed to load pitch');
        navigate('/pitches');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitch();
  }, [slug, navigate]);
  
  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!pitch) return <div className="text-center py-12">Pitch not found</div>;
  
  const isAdmin = profile.role === 'super' || pitch.admin_ids?.includes(profile.id) || pitch.created_by === profile.id;
  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/pitches/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pitch
        </Button>
      </Link>

      <Breadcrumbs 
        items={[
          { label: 'Pitches', href: '/pitches' },
          { label: pitch.name, href: `/pitches/${slug}` },
          { label: 'Settings', href: `/pitches/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Pitch Settings</h1>
        <p className="text-gray-600">Manage {pitch.name}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><Sparkles className="w-4 h-4 mr-2" />Info</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="visibility"><Eye className="w-4 h-4 mr-2" />Visibility</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderate</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <BasicInfoTab pitch={pitch} setPitch={setPitch} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MembersTab 
            containerId={pitch.id}
            containerName={pitch.name}
            containerType="pitches"
            memberIds={pitch.member_ids || []}
            adminIds={pitch.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setPitch({ ...pitch, ...updates })}
          />
        </TabsContent>

        <TabsContent value="visibility" className="mt-6">
          <VisibilityTab pitch={pitch} setPitch={setPitch} />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab 
            containerIdField="pitch_ids"
            containerId={pitch.id}
            containerName={pitch.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Basic Info Tab Component
function BasicInfoTab({ pitch, setPitch }: { pitch: any; setPitch: (pitch: any) => void }) {
  const [category, setCategory] = useState(pitch.category || '');
  const [tagline, setTagline] = useState(pitch.tagline || '');
  const [pitchUrl, setPitchUrl] = useState(pitch.url || '');
  const [videoUrl, setVideoUrl] = useState(pitch.video_url || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('pitches')
        .update({
          category,
          tagline,
          url: pitchUrl.trim() || null,
          video_url: videoUrl.trim() || null,
        })
        .eq('id', pitch.id);

      if (error) throw error;

      setPitch({ ...pitch, category, tagline, url: pitchUrl.trim() || null, video_url: videoUrl.trim() || null });
      toast.success('Pitch info updated');
    } catch (error) {
      console.error('Error updating pitch info:', error);
      toast.error('Failed to update pitch info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Pitch Identity
        </CardTitle>
        <CardDescription>
          Set the category, tagline, and links that will appear on your pitch. This helps members quickly understand what your pitch is about.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Technology, Business, Health & Wellness, Creative Arts"
            className="mt-1"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            Main topic/focus area. This appears as a prominent badge on the pitch card.
          </p>
        </div>

        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Revolutionary AI-powered analytics platform"
            className="mt-1"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            Short, compelling description (shown under pitch name on cards)
          </p>
        </div>

        <div className="pt-2 border-t">
          <Label htmlFor="pitchUrl" className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Pitch URL
          </Label>
          <Input
            id="pitchUrl"
            type="url"
            value={pitchUrl}
            onChange={(e) => setPitchUrl(e.target.value)}
            placeholder="https://example.com/my-pitch"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Link to your pitch's website, landing page, slide deck, or demo
          </p>
        </div>

        <div>
          <Label htmlFor="videoUrl" className="flex items-center gap-2">
            <Video className="w-4 h-4 text-red-600" />
            Video URL
          </Label>
          <Input
            id="videoUrl"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            YouTube video URL for your pitch presentation (will be embedded on the detail page)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Info'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Visibility Tab Component
function VisibilityTab({ pitch, setPitch }: { pitch: any; setPitch: (pitch: any) => void }) {
  const [isPublic, setIsPublic] = useState(pitch.visibility === 'public');
  const [saving, setSaving] = useState(false);

  const handleTogglePublic = async () => {
    setSaving(true);
    const newValue = !isPublic;
    // pitches_visibility_check constraint only allows 'public' | 'private'
    const newVisibility = newValue ? 'public' : 'private';

    try {
      const { error } = await supabase
        .from('pitches')
        .update({ visibility: newVisibility })
        .eq('id', pitch.id);

      if (error) throw error;

      setIsPublic(newValue);
      setPitch({ ...pitch, visibility: newVisibility });
      toast.success(`Pitch is now ${newValue ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pitch Visibility</CardTitle>
        <CardDescription>
          Control who can view this pitch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="flex items-start gap-3 flex-1">
            {isPublic ? (
              <Globe className="w-5 h-5 text-green-600 mt-1" />
            ) : (
              <Lock className="w-5 h-5 text-gray-600 mt-1" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">Public Pitch</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isPublic
                  ? 'Anyone can view this pitch, even if they are not members'
                  : 'Only members can view this pitch'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={saving}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">When to Make Public</h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Public:</strong> Crowdfunding campaigns, product launches, recruiting team members</li>
            <li>• <strong>Private:</strong> Investor pitches with confidential information, stealth mode projects</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}