import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Sparkles, Save, ArrowLeft } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { Link } from 'react-router';

interface MomentsData {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  is_public: boolean;
  allow_comments: boolean;
  allow_reactions: boolean;
  visibility_window: string;
}

export default function MomentsSettingsPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [moments, setMoments] = useState<MomentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [visibilityWindow, setVisibilityWindow] = useState('30');

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      // Check ownership
      if (!isOwner) {
        toast.error('You can only edit your own moments');
        navigate(`/moments/${userId}`);
        return;
      }
      fetchMoments();
    }
  }, [userId, isOwner]);

  const fetchMoments = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setMoments(data);
      setName(data.name);
      setDescription(data.description || '');
      setIsPublic(data.is_public);
      setAllowComments(data.allow_comments);
      setAllowReactions(data.allow_reactions);
      setVisibilityWindow(data.visibility_window);
    } catch (error) {
      console.error('Error fetching moments:', error);
      toast.error('Failed to load moments settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!moments || !name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('moments')
        .update({
          name: name.trim(),
          description: description.trim(),
          is_public: isPublic,
          allow_comments: allowComments,
          allow_reactions: allowReactions,
          updated_at: new Date().toISOString(),
          visibility_window: visibilityWindow,
        })
        .eq('id', moments.id);

      if (error) throw error;

      toast.success('Moments settings updated!');
      navigate(`/moments/${userId}`);
    } catch (error: any) {
      console.error('Error updating moments:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (!moments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Moments not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'My Profile', path: '/profile' },
        { label: 'Moments', path: `/moments/${userId}` },
        { label: 'Settings' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold">Moments Settings</h1>
            <p className="text-gray-600">Manage your personal work-in-progress feed</p>
          </div>
        </div>
        <Link to={`/moments/${userId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Moments
          </Button>
        </Link>
      </div>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Customize how your moments feed appears to others
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Feed Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., David's Moments"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what they'll find in your moments feed..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Interactions</CardTitle>
          <CardDescription>
            Control who can see and interact with your moments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Feed</Label>
              <p className="text-sm text-gray-600">
                Allow anyone to view your moments feed
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reactions">Allow Reactions</Label>
              <p className="text-sm text-gray-600">
                Let others react to your moments with emoji
              </p>
            </div>
            <Switch
              id="reactions"
              checked={allowReactions}
              onCheckedChange={setAllowReactions}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comments">Allow Comments</Label>
              <p className="text-sm text-gray-600">
                Enable commenting on your moments
              </p>
            </div>
            <Switch
              id="comments"
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility Window</Label>
            <Select value={visibilityWindow} onValueChange={setVisibilityWindow}>
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              Control how far back visitors can see your moments
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link to={`/moments/${userId}`}>
          <Button variant="outline">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}