import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { VideoPlayer } from '@/app/components/coaching/VideoPlayer';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import {
  Video, Clock, User, Tag, PlayCircle, Target, Users, Lightbulb,
  Save, Trash2, Globe, Lock, Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // ── Data state ──
  const [episode, setEpisode] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [userLike, setUserLike] = useState<any>(null);
  const [userFavorite, setUserFavorite] = useState<any>(null);
  const [userRating, setUserRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Manage tab form state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tutorial');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [videoPlatform, setVideoPlatform] = useState('youtube');
  const [videoId, setVideoId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile && id) fetchEpisodeData();
  }, [profile, id]);

  const fetchEpisodeData = async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      let query = supabase.from('episodes').select('*');
      if (isUUID) {
        query = query.eq('id', id).single();
      } else {
        query = query.eq('slug', id).limit(1);
      }
      const { data: episodeData, error: episodeError } = await query;
      if (episodeError) throw episodeError;

      const ep = isUUID ? episodeData : (Array.isArray(episodeData) ? episodeData[0] : episodeData);
      if (!ep) throw new Error('Episode not found');
      setEpisode(ep);

      // Populate manage form
      setTitle(ep.title || '');
      setDescription(ep.description || '');
      setCategory(ep.category || 'tutorial');
      setVideoUrl(ep.video_url || '');
      setThumbnailUrl(ep.thumbnail_url || '');
      setDurationMinutes(ep.duration_minutes || '');
      setVideoPlatform(ep.video_platform || 'youtube');
      setVideoId(ep.video_id || '');
      setVisibility(ep.visibility || 'public');
      setIsPublished(ep.is_published ?? true);
      setTags(ep.tags || []);
      setAllowComments(ep.allow_comments ?? true);
      setAllowReactions(ep.allow_reactions ?? true);
      setAllowSharing(ep.allow_sharing ?? true);

      const episodeId = ep.id;

      // Author
      if (ep.author_id) {
        const { data: authorData } = await supabase.from('users').select('id, name, avatar').eq('id', ep.author_id).single();
        if (authorData) setAuthor(authorData);
      }

      // Playlists
      const { data: playlistsData } = await supabase.from('playlists').select('id, name, slug, description, cover_image').contains('episode_ids', [episodeId]);
      if (playlistsData) setPlaylists(playlistsData);

      // Topics
      const { data: topicLinksData } = await supabase.from('topic_links').select('topics(*)').eq('entity_type', 'episode').eq('entity_id', episodeId);
      if (topicLinksData) {
        const topicsArray = topicLinksData.map((l: any) => l.topics).filter(Boolean);
        setTopics(topicsArray);
        setSelectedTopicIds(topicsArray.map((t: any) => t.id));
      }

      // Ratings
      const { data: ratingsData } = await supabase.from('content_ratings').select('*, users(id, name, avatar)').eq('content_type', 'episode').eq('content_id', episodeId).order('created_at', { ascending: false });
      if (ratingsData) setRatings(ratingsData);

      // Engagement state
      if (profile) {
        const [likeRes, favRes, ratingRes] = await Promise.allSettled([
          supabase.from('content_likes').select('id').eq('content_type', 'episode').eq('content_id', episodeId).eq('user_id', profile.id).maybeSingle(),
          supabase.from('content_favorites').select('*').eq('content_type', 'episode').eq('content_id', episodeId).eq('user_id', profile.id).maybeSingle(),
          supabase.from('content_ratings').select('*').eq('content_type', 'episode').eq('content_id', episodeId).eq('user_id', profile.id).maybeSingle(),
        ]);
        if (likeRes.status === 'fulfilled') setUserLike(likeRes.value.data);
        if (favRes.status === 'fulfilled') setUserFavorite(favRes.value.data);
        if (ratingRes.status === 'fulfilled') setUserRating(ratingRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching episode:', error);
      toast.error('Failed to load episode');
    } finally {
      setLoading(false);
    }
  };

  const extractVideoId = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) { setVideoPlatform('youtube'); setVideoId(youtubeMatch[1]); return; }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) { setVideoPlatform('vimeo'); setVideoId(vimeoMatch[1]); return; }
    const wistiaMatch = url.match(/wistia\.com\/medias\/([^?\s]+)/);
    if (wistiaMatch) { setVideoPlatform('wistia'); setVideoId(wistiaMatch[1]); return; }
    setVideoPlatform('custom'); setVideoId('');
  };

  const handleSave = async () => {
    if (!episode) return;
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!videoUrl.trim()) { toast.error('Video URL is required'); return; }

    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from('episodes')
        .update({
          title, description, video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          duration_minutes: durationMinutes || null,
          video_platform: videoPlatform, video_id: videoId || null,
          category, visibility, is_published: isPublished,
          tags, allow_comments: allowComments,
          allow_reactions: allowReactions, allow_sharing: allowSharing,
          updated_at: new Date().toISOString(),
        })
        .eq('id', episode.id)
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error('Your changes could not be saved. You may not have edit access to this episode.');

      // Save topics
      await supabase.from('topic_links').delete().eq('entity_type', 'episode').eq('entity_id', episode.id);
      if (selectedTopicIds.length > 0) {
        await supabase.from('topic_links').insert(
          selectedTopicIds.map(topicId => ({ topic_id: topicId, entity_type: 'episode', entity_id: episode.id, added_by: profile?.id }))
        );
      }

      toast.success('Episode updated successfully');
      fetchEpisodeData();
    } catch (error) {
      console.error('Error saving episode:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update episode');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!episode) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('episodes').update({ deleted_at: new Date().toISOString() }).eq('id', episode.id);
      if (error) throw error;
      toast.success('Episode deleted successfully');
      navigate('/episodes');
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error('Failed to delete episode');
      setDeleting(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoProvider = (url: string, platform: string | null) => {
    if (platform && ['youtube', 'vimeo', 'loom', 'wistia'].includes(platform.toLowerCase()))
      return platform.toLowerCase() as 'youtube' | 'vimeo' | 'loom' | 'wistia';
    if (url?.includes('youtube') || url?.includes('youtu.be')) return 'youtube';
    if (url?.includes('vimeo')) return 'vimeo';
    if (url?.includes('loom')) return 'loom';
    if (url?.includes('wistia')) return 'wistia';
    return 'direct';
  };

  if (!profile) return null;
  if (loading) return <div className="text-center py-12"><p className="text-gray-600">Loading episode...</p></div>;
  if (!episode) return (
    <div className="text-center py-12">
      <p className="text-gray-600">Episode not found</p>
      <Button asChild className="mt-4"><Link to="/episodes">Back to Episodes</Link></Button>
    </div>
  );

  const isAuthor = episode.author_id === profile.id;
  const isAdmin = profile.role === 'super' || profile.role === 'admin';
  const canManage = isAuthor || isAdmin;
  const videoProvider = getVideoProvider(episode.video_url, episode.video_platform);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Episodes', href: '/episodes' }, { label: episode.title }]} />

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">{episode.title}</h1>
        {author && (
          <Link to={`/users/${author.id}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
            <User className="w-4 h-4" /><span>{author.name}</span>
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(episode.duration)}</span>
          {episode.category && <Badge variant="secondary">{episode.category}</Badge>}
        </div>
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tag: string) => (
              <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="outline" className="gap-1 hover:bg-gray-100 cursor-pointer">
                  <Tag className="w-3 h-3" />{tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="watch">Watch</TabsTrigger>
          <TabsTrigger value="in-playlists">
            In Playlists {playlists.length > 0 && `(${playlists.length})`}
          </TabsTrigger>
          {canManage && <TabsTrigger value="manage"><Settings className="w-3.5 h-3.5 mr-1" />Manage</TabsTrigger>}
        </TabsList>

        {/* ── About tab ─────────────────────────────────────────────── */}
        <TabsContent value="about" className="space-y-6 mt-6">

          {/* Engagement bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
            <LikeButton
              contentType="episode" contentId={episode.id} userId={profile?.id}
              initialLikesCount={episode.likes_count || 0} initialIsLiked={!!userLike}
              onLikeChange={fetchEpisodeData}
            />
            <FavoriteButton
              contentType="episode" contentId={episode.id} userId={profile?.id}
              initialIsFavorited={!!userFavorite} initialCollections={userFavorite?.collections || []}
              onFavoriteChange={fetchEpisodeData}
            />
            <ShareInviteButton entityType="episode" entityId={episode.id} entityName={episode.title} />
            <RatingWidget
              contentType="episode" contentId={episode.id} userId={profile?.id}
              initialRating={userRating?.rating || 0} initialReview={userRating?.review_text || ''}
              avgRating={episode.avg_rating || 0} ratingsCount={episode.ratings_count || 0}
              onRatingSubmit={fetchEpisodeData}
            />
            {!isAuthor && episode.author_id && (
              <PrivateCommentDialog
                containerType="episode" containerId={episode.id} containerTitle={episode.title}
                recipientId={episode.author_id} recipientName={author?.name || 'the author'}
              />
            )}
          </div>

          {/* Description */}
          {episode.description && (
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent><p className="text-gray-700 whitespace-pre-wrap">{episode.description}</p></CardContent>
            </Card>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5" />Topics</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['WHO', 'WHY', 'Theme'].map(cat => {
                    const filtered = topics.filter((t: any) => t.category === cat);
                    if (!filtered.length) return null;
                    const icons: any = { WHO: { icon: Users, color: 'text-blue-600', label: 'Audience', bg: 'bg-blue-50 text-blue-700' }, WHY: { icon: Target, color: 'text-purple-600', label: 'Purpose', bg: 'bg-purple-50 text-purple-700' }, Theme: { icon: Lightbulb, color: 'text-amber-600', label: 'Themes', bg: 'bg-amber-50 text-amber-700' } };
                    const { icon: Icon, color, label, bg } = icons[cat];
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${color}`} /><span className="text-sm font-semibold text-gray-700">{label}</span></div>
                        <div className="flex flex-wrap gap-2">
                          {filtered.map((topic: any) => (
                            <Link key={topic.id} to={`/browse?topic=${topic.slug}`} className={`inline-flex items-center gap-1 px-3 py-1.5 ${bg} rounded-full text-sm hover:opacity-80 transition-opacity`}>{topic.name}</Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ratings */}
          <Card>
            <CardHeader><CardTitle>Reviews & Ratings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <RatingWidget
                contentType="episode" contentId={episode.id} userId={profile?.id}
                initialRating={userRating?.rating || 0} initialReview={userRating?.review_text || ''}
                avgRating={episode.avg_rating || 0} ratingsCount={episode.ratings_count || 0}
                onRatingSubmit={fetchEpisodeData}
              />
              {ratings.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">All Reviews ({ratings.length})</h4>
                  <div className="space-y-4">
                    {ratings.map((rating: any) => (
                      <div key={rating.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {rating.users?.avatar && <img src={rating.users.avatar} alt={rating.users.name} className="w-10 h-10 rounded-full" />}
                            <div>
                              <p className="font-medium text-gray-900">{rating.users?.name || 'Anonymous'}</p>
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map(star => <span key={star} className={`text-sm ${star <= rating.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>)}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{new Date(rating.created_at).toLocaleDateString()}</span>
                        </div>
                        {rating.review_text && <p className="text-gray-700 mb-3">{rating.review_text}</p>}
                        <div className="flex flex-wrap gap-2">
                          {rating.was_helpful && <Badge variant="secondary" className="text-xs">✓ Helpful</Badge>}
                          {rating.would_recommend && <Badge variant="secondary" className="text-xs">👍 Recommends</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ratings.length === 0 && !userRating && (
                <div className="text-center py-8 text-gray-500"><p>No reviews yet. Be the first to review this episode!</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Watch tab ─────────────────────────────────────────────── */}
        <TabsContent value="watch" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PlayCircle className="w-5 h-5" />Video</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-6">
              {episode.video_url ? (
                <VideoPlayer
                  videoId={episode.id} videoUrl={episode.video_url} videoProvider={videoProvider}
                  title={episode.title} durationMinutes={episode.duration_minutes || undefined}
                  userId={profile.id} embedCode={episode.embed_code}
                />
              ) : (
                <div className="p-6 text-center text-gray-600">No video URL available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── In Playlists tab ──────────────────────────────────────── */}
        <TabsContent value="in-playlists" className="mt-6">
          {playlists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PlayCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">This episode hasn't been added to any playlists yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playlists.map(playlist => (
                <Link key={playlist.id} to={`/playlists/${playlist.slug || playlist.id}`}>
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4 flex gap-4">
                      {playlist.cover_image
                        ? <img src={playlist.cover_image} alt={playlist.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        : <div className="w-16 h-16 rounded-lg bg-red-100 flex items-center justify-center shrink-0"><PlayCircle className="w-6 h-6 text-red-500" /></div>
                      }
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{playlist.name}</p>
                        {playlist.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{playlist.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Manage tab (owner/admin) ───────────────────────────────── */}
        {canManage && (
          <TabsContent value="manage" className="mt-6 space-y-6">

            {/* Basic Information */}
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="m-title">Episode Title *</Label>
                  <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Episode title" />
                </div>
                <div>
                  <Label htmlFor="m-description">Description</Label>
                  <Textarea id="m-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this episode..." rows={4} />
                </div>
                <div>
                  <Label htmlFor="m-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="m-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['tutorial','interview','webinar','lecture','demo','other'].map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Video Settings */}
            <Card>
              <CardHeader><CardTitle>Video Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="m-videoUrl">Video URL *</Label>
                  <Input id="m-videoUrl" value={videoUrl} onChange={e => { setVideoUrl(e.target.value); extractVideoId(e.target.value); }} placeholder="https://www.youtube.com/watch?v=..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="m-platform">Platform</Label>
                    <Select value={videoPlatform} onValueChange={setVideoPlatform}>
                      <SelectTrigger id="m-platform"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                        <SelectItem value="wistia">Wistia</SelectItem>
                        <SelectItem value="custom">Custom/Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="m-videoId">Video ID</Label>
                    <Input id="m-videoId" value={videoId} onChange={e => setVideoId(e.target.value)} placeholder="Auto-detected from URL" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="m-thumbnail">Thumbnail URL</Label>
                  <Input id="m-thumbnail" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="m-duration">Duration (minutes)</Label>
                  <Input id="m-duration" type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value ? parseInt(e.target.value) : '')} placeholder="15" min="0" />
                </div>
              </CardContent>
            </Card>

            {/* Topics & Tags */}
            <Card>
              <CardHeader><CardTitle>Topics & Tags</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Topics</Label>
                  <p className="text-sm text-muted-foreground mb-2">Select topics to help your audience discover this episode</p>
                  <TopicSelector value={selectedTopicIds} onChange={setSelectedTopicIds} maxTopics={5} showSuggestions />
                </div>
                <div>
                  <Label>Tags</Label>
                  <p className="text-sm text-muted-foreground mb-2">Add tags for additional discoverability</p>
                  <TagSelector value={tags} onChange={setTags} placeholder="Add tags..." title={title} description={description} maxTags={10} />
                </div>
              </CardContent>
            </Card>

            {/* Access & Visibility */}
            <Card>
              <CardHeader><CardTitle>Access & Visibility</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="w-4 h-4" />Public — Anyone can view</div></SelectItem>
                      <SelectItem value="members-only"><div className="flex items-center gap-2"><Users className="w-4 h-4" />Members Only</div></SelectItem>
                      <SelectItem value="private"><div className="flex items-center gap-2"><Lock className="w-4 h-4" />Private — Only you and admins</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Published Status</p>
                    <p className="text-sm text-gray-500">{isPublished ? 'Live and visible to others' : 'Hidden as a draft'}</p>
                  </div>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
              </CardContent>
            </Card>

            {/* Social Features */}
            <Card>
              <CardHeader><CardTitle>Social Features</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Allow Comments',  desc: 'Let viewers comment on this episode', val: allowComments,  set: setAllowComments  },
                  { label: 'Allow Reactions', desc: 'Let viewers like and react',           val: allowReactions, set: setAllowReactions },
                  { label: 'Allow Sharing',   desc: 'Let viewers share this episode',       val: allowSharing,   set: setAllowSharing   },
                ].map(({ label, desc, val, set }) => (
                  <div key={label} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                    <Switch checked={val} onCheckedChange={set} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting || saving}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete Episode
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Episode?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{episode.title}" and remove it from all playlists. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete Episode</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleSave} disabled={saving || deleting}>
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
