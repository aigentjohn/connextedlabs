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
import { Users, ArrowLeft, Shield, Eye, Globe, Lock, Sparkles } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ContainerManagementActions } from '@/app/components/shared/ContainerManagementActions';
import { ExportImportManager } from '@/app/components/ExportImportManager';

export default function BuildSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [build, setBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchBuild = async () => {
      try {
        const { data, error } = await supabase
          .from('builds')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setBuild(data);
      } catch (error) {
        console.error('Error fetching build:', error);
        toast.error('Failed to load build');
        navigate('/builds');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBuild();
  }, [slug, navigate]);
  
  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!build) return <div className="text-center py-12">Build not found</div>;
  
  const isAdmin = profile.role === 'super' || build.admin_ids?.includes(profile.id) || build.created_by === profile.id;
  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/builds/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Build
        </Button>
      </Link>

      <Breadcrumbs 
        items={[
          { label: 'Builds', href: '/builds' },
          { label: build.name, href: `/builds/${slug}` },
          { label: 'Settings', href: `/builds/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Build Settings</h1>
        <p className="text-gray-600">Manage {build.name}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><Sparkles className="w-4 h-4 mr-2" />Info</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="visibility"><Eye className="w-4 h-4 mr-2" />Visibility</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderate</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <BasicInfoTab build={build} setBuild={setBuild} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MembersTab 
            containerId={build.id}
            containerName={build.name}
            containerType="builds"
            memberIds={build.member_ids || []}
            adminIds={build.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setBuild({ ...build, ...updates })}
          />
        </TabsContent>

        <TabsContent value="visibility" className="mt-6">
          <VisibilityTab build={build} setBuild={setBuild} />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab 
            containerIdField="build_ids"
            containerId={build.id}
            containerName={build.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Basic Info Tab Component
function BasicInfoTab({ build, setBuild }: { build: any; setBuild: (build: any) => void }) {
  const [category, setCategory] = useState(build.category || '');
  const [tagline, setTagline] = useState(build.tagline || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('builds')
        .update({ category, tagline })
        .eq('id', build.id);

      if (error) throw error;

      setBuild({ ...build, category, tagline });
      toast.success('Build info updated');
    } catch (error) {
      console.error('Error updating build info:', error);
      toast.error('Failed to update build info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Build Identity
          </CardTitle>
          <CardDescription>
            Set the category and tagline that will appear on build cards. This helps members quickly understand what your build is about.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Web App, Mobile App, API, Design System"
              className="mt-1"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              Main project type/focus area. This appears as a prominent badge on the build card.
            </p>
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Real-time collaboration platform for remote teams"
              className="mt-1"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Short, compelling description (shown under build name on cards)
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Info'}
          </Button>
        </CardContent>
      </Card>

      {/* Reusable Pause/Resume and Delete Sections */}
      <ContainerManagementActions
        containerId={build.id}
        containerName={build.name}
        containerType="builds"
        state={build.state}
        redirectPath="/builds"
        onUpdate={(updates) => setBuild({ ...build, ...updates })}
        createdBy={build.created_by}
      />
    </div>
  );
}

// Visibility Tab Component
function VisibilityTab({ build, setBuild }: { build: any; setBuild: (build: any) => void }) {
  const [isPublic, setIsPublic] = useState(build.visibility === 'public');
  const [saving, setSaving] = useState(false);

  const handleTogglePublic = async () => {
    setSaving(true);
    const newValue = !isPublic;
    const newVisibility = newValue ? 'public' : 'member';

    try {
      const { error } = await supabase
        .from('builds')
        .update({ visibility: newVisibility })
        .eq('id', build.id);

      if (error) throw error;

      setIsPublic(newValue);
      setBuild({ ...build, visibility: newVisibility });
      toast.success(`Build is now ${newValue ? 'public' : 'members only'}`);
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
        <CardTitle>Build Visibility</CardTitle>
        <CardDescription>
          Control who can view this build
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
                <h4 className="font-medium text-gray-900">Public Build</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isPublic
                  ? 'Anyone can view this build, even if they are not members'
                  : 'Only members can view this build'}
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
          <h4 className="font-medium text-blue-900 mb-2">Showcase Your Work</h4>
          <p className="text-sm text-blue-800">
            Making your build public allows potential clients, employers, and collaborators to discover your work. 
            Public builds can help attract opportunities and demonstrate your capabilities.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}