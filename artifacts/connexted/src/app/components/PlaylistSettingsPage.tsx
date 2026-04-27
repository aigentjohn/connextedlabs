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
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { PrivacySelector } from '@/app/components/unified/PrivacySelector';
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
  Video,
  X,
  Globe,
  Lock,
  Users,
  MessageSquare,
  Heart,
  Share2,
  Tag,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import AddEpisodeDialog from '@/app/components/playlist/AddEpisodeDialog';

export default function PlaylistSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAddEpisodeDialogOpen, setIsAddEpisodeDialogOpen] = useState(false);

  // Form state - Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [coverImage, setCoverImage] = useState('');

  // Visibility & Publishing
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [isPublished, setIsPublished] = useState(true);

  // Social Features
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);

  // Tags & Discovery
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  useEffect(() => {
    if (profile && slug) {
      fetchPlaylist();
    }
  }, [profile, slug]);

  const fetchPlaylist = async () => {
    try {
      // Check if slug is a UUID (id) or an actual slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '');
      
      let query = supabase.from('playlists').select('*');
      
      if (isUUID) {
        query = query.eq('id', slug).single();
      } else {
        // For slugs, get the first match (in case of duplicates)
        query = query.eq('slug', slug).limit(1);
      }
      
      const { data: playlistResult, error: playlistError } = await query;

      if (playlistError) throw playlistError;

      // Handle array response for slug queries
      const playlistData = isUUID ? playlistResult : (Array.isArray(playlistResult) ? playlistResult[0] : playlistResult);

      if (!playlistData) {
        throw new Error('Playlist not found');
      }

      // Check if user is owner or admin
      const isOwner = playlistData.created_by === profile?.id;
      const isAdmin = profile?.role === 'super' || profile?.role === 'admin';

      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to edit this playlist');
        navigate(`/playlists/${slug}`);
        return;
      }

      setPlaylist(playlistData);
      setName(playlistData.name || '');
      setDescription(playlistData.description || '');
      setNewSlug(playlistData.slug || '');
      setCoverImage(playlistData.cover_image || '');
      setVisibility((playlistData.visibility as any) || 'public');
      setIsPublished(playlistData.is_published ?? true);
      setTags(playlistData.tags || []);
      setAllowComments(playlistData.allow_comments ?? true);
      setAllowReactions(playlistData.allow_reactions ?? true);
      setAllowSharing(playlistData.allow_sharing ?? true);
      setSelectedTopicIds(playlistData.topic_ids || []);

      // Fetch episodes
      if (playlistData.episode_ids && playlistData.episode_ids.length > 0) {
        const validEpisodeIds = playlistData.episode_ids.filter((id: string) => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        
        if (validEpisodeIds.length > 0) {
          const { data: episodesData } = await supabase
            .from('episodes')
            .select('*')
            .in('id', validEpisodeIds);
          
          if (episodesData) {
            // Order episodes according to the episode_ids array
            const orderedEpisodes = validEpisodeIds
              .map(id => episodesData.find(ep => ep.id === id))
              .filter(Boolean);
            setEpisodes(orderedEpisodes);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!playlist) return;

    if (!name.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          name,
          description,
          slug: newSlug,
          cover_image: coverImage || null,
          visibility,
          is_published: isPublished,
          tags,
          allow_comments: allowComments,
          allow_reactions: allowReactions,
          allow_sharing: allowSharing,
          topic_ids: selectedTopicIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id);

      if (error) throw error;

      toast.success('Playlist updated successfully');
      
      // If slug changed, navigate to new URL
      if (newSlug !== slug && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '')) {
         // Only redirect if we were using the old slug in the URL
        navigate(`/playlists/${newSlug}/settings`);
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEpisode = async (episodeId: string) => {
    if (!playlist) return;

    try {
      const newEpisodeIds = playlist.episode_ids.filter((id: string) => id !== episodeId);

      const { error } = await supabase
        .from('playlists')
        .update({
          episode_ids: newEpisodeIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id);

      if (error) throw error;

      setEpisodes(episodes.filter(ep => ep.id !== episodeId));
      setPlaylist({ ...playlist, episode_ids: newEpisodeIds });
      toast.success('Episode removed from playlist');
    } catch (error) {
      console.error('Error removing episode:', error);
      toast.error('Failed to remove episode');
    }
  };

  const handleReorderEpisode = async (fromIndex: number, toIndex: number) => {
    if (!playlist) return;

    try {
      const newEpisodeIds = [...playlist.episode_ids];
      const [movedId] = newEpisodeIds.splice(fromIndex, 1);
      newEpisodeIds.splice(toIndex, 0, movedId);

      const { error } = await supabase
        .from('playlists')
        .update({
          episode_ids: newEpisodeIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id);

      if (error) throw error;

      const newEpisodes = [...episodes];
      const [movedEpisode] = newEpisodes.splice(fromIndex, 1);
      newEpisodes.splice(toIndex, 0, movedEpisode);
      
      setEpisodes(newEpisodes);
      setPlaylist({ ...playlist, episode_ids: newEpisodeIds });
      toast.success('Episode order updated');
    } catch (error) {
      console.error('Error reordering episode:', error);
      toast.error('Failed to reorder episode');
    }
  };

  const handleDelete = async () => {
    if (!playlist) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlist.id);

      if (error) throw error;

      toast.success('Playlist deleted successfully');
      navigate('/playlists');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: 'Playlists', href: '/playlists' },
          { label: playlist.name, href: `/playlists/${slug}` },
          { label: 'Settings' }
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{playlist.name}</h1>
          <p className="text-gray-600 mt-1">Edit playlist settings and manage episodes</p>
        </div>
        <Link to={`/playlists/${slug}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Playlist
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update playlist name, description, and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Playlist Name*</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this playlist..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="playlist-url-slug"
              />
              <p className="text-sm text-gray-500 mt-1">
                URL: /playlists/{newSlug}
              </p>
            </div>

            <div>
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility & Publishing */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility & Publishing</CardTitle>
            <CardDescription>Control who can see and access this playlist</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="visibility" className="mb-2 block">Visibility</Label>
              <PrivacySelector
                value={visibility}
                onChange={setVisibility}
                contentType="playlist"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="published" className="text-base font-medium">
                  Published Status
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {isPublished ? 'This playlist is live and visible to others' : 'This playlist is hidden as a draft'}
                </p>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Features */}
        <Card>
          <CardHeader>
            <CardTitle>Social Features</CardTitle>
            <CardDescription>Control how viewers can interact with this playlist</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowComments" className="text-base font-medium">
                    Allow Comments
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let viewers comment on this playlist
                  </p>
                </div>
              </div>
              <Switch
                id="allowComments"
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowReactions" className="text-base font-medium">
                    Allow Reactions
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let viewers react with likes and emojis
                  </p>
                </div>
              </div>
              <Switch
                id="allowReactions"
                checked={allowReactions}
                onCheckedChange={setAllowReactions}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-gray-600" />
                <div>
                  <Label htmlFor="allowSharing" className="text-base font-medium">
                    Allow Sharing
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Let viewers share this playlist on social media
                  </p>
                </div>
              </div>
              <Switch
                id="allowSharing"
                checked={allowSharing}
                onCheckedChange={setAllowSharing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags & Discovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Topics & Discovery
            </CardTitle>
            <CardDescription>
              Help people find this playlist by selecting topics that describe who it's for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Topics (Who is this playlist FOR?)</Label>
              <p className="text-sm text-muted-foreground">
                Select up to 5 topics to help your target audience discover this collection
              </p>
              <TopicSelector
                value={selectedTopicIds}
                onChange={setSelectedTopicIds}
                maxTopics={5}
                placeholder="Select topics for this playlist..."
                showSuggestions={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional fallback)</Label>
              <TagSelector
                value={tags}
                onChange={setTags}
                placeholder="Add tags..."
                title={name}
                description={description}
                maxTags={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Topics are primary for discovery. Tags are optional for additional categorization.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Episodes Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Episodes ({episodes.length})</CardTitle>
                <CardDescription>Manage episodes in this playlist</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddEpisodeDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Episode
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {episodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No episodes in this playlist yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddEpisodeDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Episode
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {episodes.map((episode, index) => (
                  <div
                    key={episode.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Badge variant="outline">{index + 1}</Badge>
                    
                    <Video className="w-4 h-4 text-purple-600" />
                    
                    <div className="flex-1">
                      <Link
                        to={`/episodes/${episode.id}`}
                        className="font-medium hover:text-purple-600"
                      >
                        {episode.title}
                      </Link>
                      {episode.duration_minutes && (
                        <p className="text-sm text-gray-500">{episode.duration_minutes} min</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReorderEpisode(index, index - 1)}
                        >
                          ↑
                        </Button>
                      )}
                      {index < episodes.length - 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReorderEpisode(index, index + 1)}
                        >
                          ↓
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveEpisode(episode.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting || saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Playlist
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{playlist.name}" and all its settings.
                  Episodes will not be deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Playlist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={saving || deleting}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Add Episode Dialog */}
        {isAddEpisodeDialogOpen && playlist && (
          <AddEpisodeDialog
            open={isAddEpisodeDialogOpen}
            onOpenChange={setIsAddEpisodeDialogOpen}
            playlistId={playlist.id}
            onEpisodeAdded={fetchPlaylist}
          />
        )}
      </div>
    </div>
  );
}