import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
import AddEpisodeDialog from '@/app/components/playlist/AddEpisodeDialog';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { PrivacySelector } from '@/app/components/unified/PrivacySelector';
import {
  Settings,
  UserPlus,
  PlayCircle,
  Video,
  Users,
  Tag,
  Globe,
  Lock,
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  MessageSquare,
  Heart,
  Share2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlaylistDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddEpisodeDialogOpen, setIsAddEpisodeDialogOpen] = useState(false);

  // Manage form state
  const [mgmtName, setMgmtName] = useState('');
  const [mgmtDescription, setMgmtDescription] = useState('');
  const [mgmtSlug, setMgmtSlug] = useState('');
  const [mgmtCoverImage, setMgmtCoverImage] = useState('');
  const [mgmtVisibility, setMgmtVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [mgmtIsPublished, setMgmtIsPublished] = useState(true);
  const [mgmtAllowComments, setMgmtAllowComments] = useState(true);
  const [mgmtAllowReactions, setMgmtAllowReactions] = useState(true);
  const [mgmtAllowSharing, setMgmtAllowSharing] = useState(true);
  const [mgmtTags, setMgmtTags] = useState<string[]>([]);
  const [mgmtSelectedTopicIds, setMgmtSelectedTopicIds] = useState<string[]>([]);
  const [mgmtSaving, setMgmtSaving] = useState(false);
  const [mgmtDeleting, setMgmtDeleting] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPlaylistData();
    }
  }, [slug]);

  // Sync manage form state when playlist loads
  useEffect(() => {
    if (playlist) {
      setMgmtName(playlist.name || '');
      setMgmtDescription(playlist.description || '');
      setMgmtSlug(playlist.slug || '');
      setMgmtCoverImage(playlist.cover_image || '');
      setMgmtVisibility(playlist.visibility || 'public');
      setMgmtIsPublished(playlist.is_published ?? true);
      setMgmtAllowComments(playlist.allow_comments ?? true);
      setMgmtAllowReactions(playlist.allow_reactions ?? true);
      setMgmtAllowSharing(playlist.allow_sharing ?? true);
      setMgmtTags(playlist.tags || []);
      setMgmtSelectedTopicIds(playlist.topic_ids || []);
    }
  }, [playlist]);

  const fetchPlaylistData = async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '');

      let query = supabase.from('playlists').select('*');
      if (isUUID) {
        query = query.eq('id', slug).single();
      } else {
        query = query.eq('slug', slug).limit(1);
      }

      const { data: playlistResult, error: playlistError } = await query;
      if (playlistError) throw playlistError;

      const playlistData = isUUID
        ? playlistResult
        : Array.isArray(playlistResult)
        ? playlistResult[0]
        : playlistResult;

      if (!playlistData) throw new Error('Playlist not found');

      setPlaylist(playlistData);

      // Fetch creator
      if (playlistData.created_by) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', playlistData.created_by)
          .single();
        if (creatorData) setCreator(creatorData);
      }

      // Fetch members
      if (playlistData.member_ids && playlistData.member_ids.length > 0) {
        const { data: membersData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .in('id', playlistData.member_ids);
        if (membersData) setMembers(membersData);
      }

      // Fetch episodes
      const episodeIds = (playlistData.episode_ids && playlistData.episode_ids.length > 0)
        ? playlistData.episode_ids
        : (playlistData.video_ids || []);

      if (episodeIds.length > 0) {
        const validEpisodeIds = episodeIds.filter((id: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        if (validEpisodeIds.length > 0) {
          const { data: episodesData } = await supabase
            .from('episodes')
            .select('*')
            .in('id', validEpisodeIds);

          if (episodesData) {
            // Preserve the order from episode_ids
            const ordered = validEpisodeIds
              .map((id: string) => episodesData.find((ep: any) => ep.id === id))
              .filter(Boolean);
            setEpisodes(ordered);
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

  const handleJoinPlaylist = async () => {
    if (!playlist || !profile) return;
    try {
      const updatedMemberIds = [...(playlist.member_ids || []), profile.id];
      const { error } = await supabase
        .from('playlists')
        .update({ member_ids: updatedMemberIds })
        .eq('id', playlist.id);
      if (error) throw error;
      setPlaylist({ ...playlist, member_ids: updatedMemberIds });
      setMembers([...members, { id: profile.id, name: profile.name, avatar: profile.avatar }]);
      toast.success("You've joined this playlist!");
    } catch (error) {
      toast.error('Failed to join playlist');
    }
  };

  const handleLeavePlaylist = async () => {
    if (!playlist || !profile) return;
    try {
      const updatedMemberIds = (playlist.member_ids || []).filter((id: string) => id !== profile.id);
      const { error } = await supabase
        .from('playlists')
        .update({ member_ids: updatedMemberIds })
        .eq('id', playlist.id);
      if (error) throw error;
      setPlaylist({ ...playlist, member_ids: updatedMemberIds });
      setMembers(members.filter((m) => m.id !== profile.id));
      toast.success("You've left this playlist");
    } catch (error) {
      toast.error('Failed to leave playlist');
    }
  };

  const handleRemoveEpisode = async (episodeId: string) => {
    if (!playlist) return;
    try {
      const newEpisodeIds = (playlist.episode_ids || []).filter((id: string) => id !== episodeId);
      const { error } = await supabase
        .from('playlists')
        .update({ episode_ids: newEpisodeIds, updated_at: new Date().toISOString() })
        .eq('id', playlist.id);
      if (error) throw error;
      setEpisodes(episodes.filter((e) => e.id !== episodeId));
      setPlaylist({ ...playlist, episode_ids: newEpisodeIds });
      toast.success('Episode removed from playlist');
    } catch (error) {
      toast.error('Failed to remove episode');
    }
  };

  const handleReorderEpisode = async (fromIndex: number, toIndex: number) => {
    if (!playlist) return;
    try {
      const newEpisodeIds = [...(playlist.episode_ids || [])];
      const [movedId] = newEpisodeIds.splice(fromIndex, 1);
      newEpisodeIds.splice(toIndex, 0, movedId);
      const { error } = await supabase
        .from('playlists')
        .update({ episode_ids: newEpisodeIds, updated_at: new Date().toISOString() })
        .eq('id', playlist.id);
      if (error) throw error;
      const newEpisodes = [...episodes];
      const [movedEpisode] = newEpisodes.splice(fromIndex, 1);
      newEpisodes.splice(toIndex, 0, movedEpisode);
      setEpisodes(newEpisodes);
      setPlaylist({ ...playlist, episode_ids: newEpisodeIds });
      toast.success('Episode order updated');
    } catch (error) {
      toast.error('Failed to reorder episode');
    }
  };

  const handleSaveSettings = async () => {
    if (!playlist) return;
    if (!mgmtName.trim()) { toast.error('Playlist name is required'); return; }

    setMgmtSaving(true);
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          name: mgmtName.trim(),
          description: mgmtDescription.trim(),
          slug: mgmtSlug,
          cover_image: mgmtCoverImage || null,
          visibility: mgmtVisibility,
          is_published: mgmtIsPublished,
          tags: mgmtTags.length > 0 ? mgmtTags : null,
          allow_comments: mgmtAllowComments,
          allow_reactions: mgmtAllowReactions,
          allow_sharing: mgmtAllowSharing,
          topic_ids: mgmtSelectedTopicIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playlist.id);
      if (error) throw error;

      // If slug changed, navigate to new URL
      if (mgmtSlug !== slug && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '')) {
        navigate(`/playlists/${mgmtSlug}`);
      } else {
        await fetchPlaylistData();
      }
      toast.success('Playlist updated successfully');
    } catch (error) {
      toast.error('Failed to update playlist');
    } finally {
      setMgmtSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist) return;
    setMgmtDeleting(true);
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlist.id);
      if (error) throw error;
      toast.success('Playlist deleted successfully');
      navigate('/playlists');
    } catch (error) {
      toast.error('Failed to delete playlist');
      setMgmtDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Playlist not found</p>
        <Button asChild className="mt-4">
          <Link to="/playlists">Back to Playlists</Link>
        </Button>
      </div>
    );
  }

  const isMember = playlist.member_ids?.includes(profile?.id);
  const isOwner = playlist.created_by === profile?.id;
  const isAdmin = profile?.role === 'super' || profile?.role === 'admin';
  const canManage = isOwner || isAdmin;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Playlists', href: '/playlists' },
          { label: playlist.name },
        ]}
      />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
              {creator && (
                <p className="text-sm text-gray-600">
                  Created by{' '}
                  <Link to={`/users/${creator.id}`} className="text-indigo-600 hover:underline">
                    {creator.name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {!isMember && !isOwner && profile && (
              <Button onClick={handleJoinPlaylist}>
                <UserPlus className="w-4 h-4 mr-2" />
                Join
              </Button>
            )}
            {isMember && !isOwner && (
              <Button onClick={handleLeavePlaylist} variant="outline">
                Leave
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="episodes">
            Episodes {episodes.length > 0 && `(${episodes.length})`}
          </TabsTrigger>
          <TabsTrigger value="members">
            Members {members.length > 0 && `(${members.length})`}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage">
              <Settings className="w-4 h-4 mr-1.5" />
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── About Tab ── */}
        <TabsContent value="about" className="space-y-6 mt-6">
          {/* Engagement Bar */}
          <div className="flex flex-wrap items-center gap-3 py-4 border-b">
            <LikeButton
              contentType="playlist"
              contentId={playlist.id}
              userId={profile?.id}
              initialLikesCount={playlist.likes_count || 0}
              initialIsLiked={false}
            />
            <FavoriteButton
              contentType="playlist"
              contentId={playlist.id}
              userId={profile?.id}
              initialIsFavorited={false}
              initialCollections={[]}
            />
            <ShareInviteButton
              entityType="playlist"
              entityId={playlist.slug || playlist.id}
              entityName={playlist.name}
            />
            <RatingWidget
              contentType="playlist"
              contentId={playlist.id}
              userId={profile?.id}
              initialRating={playlist.rating || 0}
              initialRatingsCount={playlist.ratings_count || 0}
              onRatingComplete={(newRating, newRatingsCount) => {
                setPlaylist({ ...playlist, rating: newRating, ratings_count: newRatingsCount });
              }}
            />
            {!isOwner && playlist.created_by && (
              <PrivateCommentDialog
                containerType="playlist"
                containerId={playlist.id}
                containerTitle={playlist.name}
                recipientId={playlist.created_by}
                recipientName={creator?.name || 'the creator'}
                containerPath={`/playlists/${playlist.slug || playlist.id}`}
              />
            )}
          </div>

          {/* Description */}
          {playlist.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-700 leading-relaxed">{playlist.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {playlist.tags && playlist.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {playlist.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-purple-600">{episodes.length}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                    <Video className="w-4 h-4" />
                    Episodes
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-600">{members.length}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                    <Users className="w-4 h-4" />
                    Members
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-700 flex items-center justify-center gap-2">
                    {playlist.visibility === 'public' ? (
                      <><Globe className="w-5 h-5" /> Public</>
                    ) : playlist.visibility === 'private' ? (
                      <><Lock className="w-5 h-5" /> Private</>
                    ) : (
                      <><Users className="w-5 h-5" /> Members</>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Visibility</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Episodes Tab ── */}
        <TabsContent value="episodes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Episodes ({episodes.length})
                </CardTitle>
                {canManage && (
                  <Button size="sm" onClick={() => setIsAddEpisodeDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Episode
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {episodes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Video className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No episodes in this playlist yet</p>
                  {canManage && (
                    <Button
                      onClick={() => setIsAddEpisodeDialogOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Episode
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {episodes.map((episode, index) => (
                    <div
                      key={episode.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                        </div>
                      )}
                      {!canManage && (
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm shrink-0">
                          {index + 1}
                        </div>
                      )}

                      <Video className="w-4 h-4 text-purple-600 shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{episode.title}</p>
                        {episode.duration && (
                          <p className="text-xs text-gray-500">{episode.duration} min</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/episodes/${episode.slug || episode.id}`}>Watch</Link>
                        </Button>
                        {canManage && (
                          <>
                            {index > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReorderEpisode(index, index - 1)}
                                title="Move up"
                              >
                                ↑
                              </Button>
                            )}
                            {index < episodes.length - 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReorderEpisode(index, index + 1)}
                                title="Move down"
                              >
                                ↓
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveEpisode(episode.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No members yet</p>
                  {!isOwner && !isMember && profile && (
                    <Button onClick={handleJoinPlaylist} className="mt-4">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join this playlist
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <Link
                      key={member.id}
                      to={`/users/${member.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={member.avatar || 'https://via.placeholder.com/40'}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                        {member.id === playlist.created_by && (
                          <p className="text-xs text-indigo-600">Creator</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manage Tab (owner/admin only) ── */}
        {canManage && (
          <TabsContent value="manage" className="space-y-6 mt-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update playlist name, description, and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mgmt-name">Playlist Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="mgmt-name"
                    value={mgmtName}
                    onChange={(e) => setMgmtName(e.target.value)}
                    placeholder="Enter playlist name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mgmt-description">Description</Label>
                  <Textarea
                    id="mgmt-description"
                    value={mgmtDescription}
                    onChange={(e) => setMgmtDescription(e.target.value)}
                    placeholder="Describe this playlist..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mgmt-slug">URL Slug</Label>
                    <Input
                      id="mgmt-slug"
                      value={mgmtSlug}
                      onChange={(e) =>
                        setMgmtSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                      }
                      placeholder="playlist-url-slug"
                    />
                    <p className="text-xs text-gray-500">URL: /playlists/{mgmtSlug}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mgmt-cover">Cover Image URL</Label>
                    <Input
                      id="mgmt-cover"
                      value={mgmtCoverImage}
                      onChange={(e) => setMgmtCoverImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topics & Tags */}
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
                  <Label>Topics</Label>
                  <p className="text-sm text-muted-foreground">
                    Select up to 5 topics to help your target audience discover this playlist
                  </p>
                  <TopicSelector
                    value={mgmtSelectedTopicIds}
                    onChange={setMgmtSelectedTopicIds}
                    maxTopics={5}
                    placeholder="Select topics for this playlist..."
                    showSuggestions={true}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags (optional)</Label>
                  <TagSelector
                    value={mgmtTags}
                    onChange={setMgmtTags}
                    placeholder="Add tags..."
                    title={mgmtName}
                    description={mgmtDescription}
                    maxTags={10}
                  />
                  <p className="text-xs text-gray-500">
                    Topics are primary for discovery. Tags are optional for additional categorization.
                  </p>
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
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <PrivacySelector
                    value={mgmtVisibility}
                    onChange={setMgmtVisibility}
                    contentType="playlist"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Published</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {mgmtIsPublished
                        ? 'This playlist is live and visible to others'
                        : 'This playlist is saved as a draft'}
                    </p>
                  </div>
                  <Switch checked={mgmtIsPublished} onCheckedChange={setMgmtIsPublished} />
                </div>
              </CardContent>
            </Card>

            {/* Social Features */}
            <Card>
              <CardHeader>
                <CardTitle>Social Features</CardTitle>
                <CardDescription>Control how viewers can interact with this playlist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label className="text-base font-medium">Allow Comments</Label>
                      <p className="text-sm text-gray-600 mt-0.5">Let viewers comment on this playlist</p>
                    </div>
                  </div>
                  <Switch checked={mgmtAllowComments} onCheckedChange={setMgmtAllowComments} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label className="text-base font-medium">Allow Reactions</Label>
                      <p className="text-sm text-gray-600 mt-0.5">Let viewers react with likes and emojis</p>
                    </div>
                  </div>
                  <Switch checked={mgmtAllowReactions} onCheckedChange={setMgmtAllowReactions} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label className="text-base font-medium">Allow Sharing</Label>
                      <p className="text-sm text-gray-600 mt-0.5">Let viewers share this playlist</p>
                    </div>
                  </div>
                  <Switch checked={mgmtAllowSharing} onCheckedChange={setMgmtAllowSharing} />
                </div>
              </CardContent>
            </Card>

            {/* Save All Settings */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={mgmtSaving || mgmtDeleting} size="lg">
                {mgmtSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All Changes
              </Button>
            </div>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-1">Delete this playlist</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    Permanently deletes "{playlist.name}" and all its settings.
                    Episodes will not be deleted. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={mgmtDeleting || mgmtSaving}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Playlist
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{playlist.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the playlist and all its settings.
                          Episodes will not be deleted. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeletePlaylist}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Playlist
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Episode Dialog */}
      {isAddEpisodeDialogOpen && (
        <AddEpisodeDialog
          open={isAddEpisodeDialogOpen}
          onOpenChange={setIsAddEpisodeDialogOpen}
          playlistId={playlist.id}
          onEpisodeAdded={() => {
            fetchPlaylistData();
            setIsAddEpisodeDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
