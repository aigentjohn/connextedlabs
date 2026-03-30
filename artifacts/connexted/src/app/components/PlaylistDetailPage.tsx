import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import AddEpisodeDialog from '@/app/components/playlist/AddEpisodeDialog';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';
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
  Trash2
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

  useEffect(() => {
    if (profile && slug) {
      fetchPlaylistData();
    }
  }, [profile, slug]);

  const fetchPlaylistData = async () => {
    try {
      // Check if slug is a UUID (id) or an actual slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '');
      
      // Fetch playlist by slug or id
      // Use .maybeSingle() instead of .single() to handle potential duplicates
      // Then limit to 1 and get first result if needed
      let query = supabase
        .from('playlists')
        .select('*');
      
      if (isUUID) {
        query = query.eq('id', slug).single();
      } else {
        // For slugs, get the first match (in case of duplicates)
        query = query.eq('slug', slug).limit(1);
      }
      
      const { data: playlistData, error: playlistError } = await query;

      if (playlistError) throw playlistError;
      
      // Handle array response for slug queries
      const playlist = isUUID ? playlistData : (Array.isArray(playlistData) ? playlistData[0] : playlistData);
      
      if (!playlist) {
        throw new Error('Playlist not found');
      }
      
      setPlaylist(playlist);

      // Fetch creator
      if (playlist.created_by) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', playlist.created_by)
          .single();
        
        if (creatorData) setCreator(creatorData);
      }

      // Fetch members
      if (playlist.member_ids && playlist.member_ids.length > 0) {
        const { data: membersData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .in('id', playlist.member_ids);
        
        if (membersData) setMembers(membersData);
      }

      // Fetch episodes if episode_ids exist
      const episodeIds = (playlist.episode_ids && playlist.episode_ids.length > 0) 
        ? playlist.episode_ids 
        : (playlist.video_ids || []);

      if (episodeIds.length > 0) {
        // Filter out any non-UUID values (e.g., slugs) from episode_ids
        const validEpisodeIds = episodeIds.filter((id: string) => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        
        if (validEpisodeIds.length > 0) {
          const { data: episodesData } = await supabase
            .from('episodes')
            .select('*')
            .in('id', validEpisodeIds);
          
          if (episodesData) setEpisodes(episodesData);
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
      toast.success('You\'ve joined this playlist!');
    } catch (error) {
      console.error('Error joining playlist:', error);
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
      setMembers(members.filter(m => m.id !== profile.id));
      toast.success('You\'ve left this playlist');
    } catch (error) {
      console.error('Error leaving playlist:', error);
      toast.error('Failed to leave playlist');
    }
  };

  const handleAddEpisode = async (episodeId: string) => {
    if (!playlist || !profile) return;

    try {
      const updatedEpisodeIds = [...(playlist.episode_ids || []), episodeId];
      
      const { error } = await supabase
        .from('playlists')
        .update({ episode_ids: updatedEpisodeIds })
        .eq('id', playlist.id);

      if (error) throw error;

      setPlaylist({ ...playlist, episode_ids: updatedEpisodeIds });
      setEpisodes([...episodes, { id: episodeId }]);
      toast.success('Episode added to playlist!');
    } catch (error) {
      console.error('Error adding episode to playlist:', error);
      toast.error('Failed to add episode to playlist');
    }
  };

  const handleRemoveEpisode = async (episodeId: string) => {
    if (!playlist || !profile) return;

    try {
      const updatedEpisodeIds = (playlist.episode_ids || []).filter((id: string) => id !== episodeId);
      
      const { error } = await supabase
        .from('playlists')
        .update({ episode_ids: updatedEpisodeIds })
        .eq('id', playlist.id);

      if (error) throw error;

      setPlaylist({ ...playlist, episode_ids: updatedEpisodeIds });
      setEpisodes(episodes.filter(e => e.id !== episodeId));
      toast.success('Episode removed from playlist');
    } catch (error) {
      console.error('Error removing episode from playlist:', error);
      toast.error('Failed to remove episode from playlist');
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading playlist...</p>
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

  const isMember = playlist.member_ids?.includes(profile.id);
  const isOwner = playlist.created_by === profile.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Playlists', href: '/playlists' },
          { label: playlist.name }
        ]} 
      />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
                {creator && (
                  <p className="text-sm text-gray-600">
                    Created by <Link to={`/users/${creator.id}`} className="text-indigo-600 hover:underline">{creator.name}</Link>
                  </p>
                )}
              </div>
            </div>

            {playlist.description && (
              <p className="text-gray-700 mb-4">{playlist.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
              <span className="flex items-center gap-1">
                {playlist.visibility === 'public' ? (
                  <>
                    <Globe className="w-4 h-4" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Members Only
                  </>
                )}
              </span>
            </div>

            {/* Tags */}
            {playlist.tags && playlist.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {playlist.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t">
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isOwner && (
              <Button asChild variant="outline">
                <Link to={`/playlists/${playlist.slug || playlist.id}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
            )}
            {!isMember && !isOwner && (
              <Button onClick={handleJoinPlaylist}>
                <UserPlus className="w-4 h-4 mr-2" />
                Join Playlist
              </Button>
            )}
            {isMember && !isOwner && (
              <Button onClick={handleLeavePlaylist} variant="outline">
                Leave Playlist
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Episodes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Episodes
            </CardTitle>
            {isOwner && (
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
              {isOwner && (
                <Button onClick={() => setIsAddEpisodeDialogOpen(true)} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Episode
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map((episode, index) => (
                <div key={episode.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{episode.title}</h3>
                    {episode.description && (
                      <p className="text-sm text-gray-600 mt-1">{episode.description}</p>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/episodes/${episode.id}`}>
                      Watch
                    </Link>
                  </Button>
                  {isOwner && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleRemoveEpisode(episode.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <p className="font-medium text-gray-900">{member.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

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