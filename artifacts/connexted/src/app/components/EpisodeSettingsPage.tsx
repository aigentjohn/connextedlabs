import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import Breadcrumbs from '@/app/components/Breadcrumbs';
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
import {
  Save,
  Trash2,
  ArrowLeft,
  Globe,
  Lock,
  Users,
  Video,
  MessageSquare,
  Heart,
  Share2,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

export default function EpisodeSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state - Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tutorial');
  
  // Video Settings
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [videoPlatform, setVideoPlatform] = useState('youtube');
  const [videoId, setVideoId] = useState('');
  
  // Visibility & Publishing
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(true);
  
  // Tags & Discovery
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (profile && id) {
      fetchEpisode();
    }
  }, [profile, id]);

  const fetchEpisode = async () => {
    try {
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', id)
        .single();

      if (episodeError) throw episodeError;

      // Check if user is owner or admin
      const isOwner = episodeData.author_id === profile?.id;
      const isAdmin = profile?.role === 'super' || profile?.role === 'admin';

      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to edit this episode');
        navigate(`/episodes/${id}`);
        return;
      }

      setEpisode(episodeData);
      setTitle(episodeData.title || '');
      setDescription(episodeData.description || '');
      setVideoUrl(episodeData.video_url || '');
      setThumbnailUrl(episodeData.thumbnail_url || '');
      setDurationMinutes(episodeData.duration_minutes || '');
      setVideoPlatform(episodeData.video_platform || 'youtube');
      setVideoId(episodeData.video_id || '');
      setCategory(episodeData.category || 'tutorial');
      setVisibility(episodeData.visibility || 'public');
      setIsPublished(episodeData.is_published ?? true);
      setTags(episodeData.tags?.join(', ') || '');
    } catch (error) {
      console.error('Error fetching episode:', error);
      toast.error('Failed to load episode');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!episode) return;

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
        .map(t => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('episodes')
        .update({
          title,
          description,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          duration_minutes: durationMinutes || null,
          video_platform: videoPlatform,
          video_id: videoId || null,
          category,
          visibility,
          is_published: isPublished,
          tags: tagsArray,
          updated_at: new Date().toISOString()
        })
        .eq('id', episode.id);

      if (error) throw error;

      toast.success('Episode updated successfully');
      navigate(`/episodes/${id}`);
    } catch (error) {
      console.error('Error updating episode:', error);
      toast.error('Failed to update episode');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!episode) return;

    setDeleting(true);
    try {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from('episodes')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', episode.id);

      if (error) throw error;

      toast.success('Episode deleted successfully');
      navigate('/episodes');
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error('Failed to delete episode');
      setDeleting(false);
    }
  };

  const extractVideoId = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      setVideoPlatform('youtube');
      setVideoId(youtubeMatch[1]);
      return;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      setVideoPlatform('vimeo');
      setVideoId(vimeoMatch[1]);
      return;
    }

    // Wistia
    const wistiaMatch = url.match(/wistia\.com\/medias\/([^?\s]+)/);
    if (wistiaMatch) {
      setVideoPlatform('wistia');
      setVideoId(wistiaMatch[1]);
      return;
    }

    setVideoPlatform('custom');
    setVideoId('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Episode not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: 'Episodes', href: '/episodes' },
          { label: episode.title, href: `/episodes/${id}` },
          { label: 'Settings' }
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{episode.title}</h1>
          <p className="text-gray-600 mt-1">Edit episode settings and metadata</p>
        </div>
        <Link to={`/episodes/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Episode
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update episode title, description, and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Episode Title*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter episode title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this episode..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tutorial, beginner, python"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Video Settings</CardTitle>
            <CardDescription>Configure video source and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">Video URL*</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  extractVideoId(e.target.value);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="videoPlatform">Platform</Label>
                <Select value={videoPlatform} onValueChange={setVideoPlatform}>
                  <SelectTrigger id="videoPlatform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="wistia">Wistia</SelectItem>
                    <SelectItem value="custom">Custom/Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="videoId">Video ID</Label>
                <Input
                  id="videoId"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="Auto-detected from URL"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="15"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Access & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Access & Visibility</CardTitle>
            <CardDescription>Control who can view this episode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>Public - Anyone can view</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="members-only">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Members Only - Authenticated users</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Private - Only you and admins</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-gray-500">Make this episode visible to others</p>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Episode
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Episode?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{episode.title}".
                  The episode will be removed from all playlists. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Episode
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}