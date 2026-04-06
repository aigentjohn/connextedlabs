import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useContentAuth } from '@/lib/content-auth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Video, ArrowLeft, Save, Globe, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateEpisodePage() {
  const navigate = useNavigate();
  const { userId, ownerFields, ready } = useContentAuth();

  const [saving, setSaving] = useState(false);

  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Video
  const [videoPlatform, setVideoPlatform] = useState('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | ''>('');

  // Publishing
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(true);

  // Discovery
  const [tags, setTags] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ready || !userId) {
      toast.error('You must be logged in to create an episode');
      return;
    }

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!videoUrl.trim()) {
      toast.error('Video URL is required');
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const slug = slugify(title);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl.trim(),
        video_platform: videoPlatform,
        video_id: videoId.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        duration: duration !== '' ? Number(duration) : null,
        visibility,
        is_published: isPublished,
        tags: tagsArray.length > 0 ? tagsArray : null,
        slug,
        ...ownerFields('episodes'),
      };

      const { data, error } = await supabase
        .from('episodes')
        .insert(payload)
        .select('id, slug')
        .single();

      if (error) throw error;

      toast.success('Episode created successfully!');
      navigate(`/episodes/${data.slug || data.id}`);
    } catch (err: any) {
      console.error('Error creating episode:', err);
      if (err?.code === '42501') {
        toast.error('Permission denied — your account does not have access to create episodes. Contact an admin.');
      } else if (err?.code === '23505') {
        toast.error('An episode with that title already exists. Try a slightly different title.');
      } else {
        toast.error(err?.message || 'Failed to create episode');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Episodes', href: '/episodes' },
            { label: 'New Episode' },
          ]}
        />

        <div className="flex items-center gap-3 mb-6">
          <Link to="/episodes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Episode</h1>
            <p className="text-sm text-gray-500">Add a new video episode to the platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="w-4 h-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Introduction to Goal Setting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will viewers learn from this episode?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="goal-setting, productivity, mindset (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <p className="text-xs text-gray-500">Separate tags with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* Video Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Settings</CardTitle>
              <CardDescription>Provide the video URL or platform details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={videoPlatform} onValueChange={setVideoPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="wistia">Wistia</SelectItem>
                      <SelectItem value="loom">Loom</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={0}
                    placeholder="e.g. 12"
                    value={duration}
                    onChange={(e) =>
                      setDuration(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">
                  Video URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="videoUrl"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoId">Video ID (optional)</Label>
                <Input
                  id="videoId"
                  placeholder="e.g. dQw4w9WgXcQ"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  The video's platform ID — used for embedding. Leave blank and we'll try to extract it from the URL.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL (optional)</Label>
                <Input
                  id="thumbnail"
                  type="url"
                  placeholder="https://..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visibility & Publishing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility & Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visibility">Who can see this episode?</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Public — anyone can view
                      </div>
                    </SelectItem>
                    <SelectItem value="members">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Members only
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Private — only you
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">Publish immediately</p>
                  <p className="text-xs text-gray-500">
                    Turn off to save as a draft and publish later
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link to="/episodes">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving || !ready}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Creating…' : 'Create Episode'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
