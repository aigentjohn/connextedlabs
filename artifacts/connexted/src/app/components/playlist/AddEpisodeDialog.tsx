import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Video, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AddEpisodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  onEpisodeAdded: () => void;
}

export default function AddEpisodeDialog({
  open,
  onOpenChange,
  playlistId,
  onEpisodeAdded
}: AddEpisodeDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchEpisodes();
    }
  }, [open, searchQuery]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('episodes')
        .select('id, title, description, thumbnail_url, duration')
        .order('created_at', { ascending: false })
        .limit(10);

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEpisodes(data || []);
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!selectedEpisodeId) return;

    try {
      // First fetch the current playlist to get existing episodes
      const { data: playlist, error: fetchError } = await supabase
        .from('playlists')
        .select('episode_ids')
        .eq('id', playlistId)
        .single();

      if (fetchError) throw fetchError;

      const currentEpisodeIds = playlist.episode_ids || [];
      
      // Check if episode is already in playlist
      if (currentEpisodeIds.includes(selectedEpisodeId)) {
        toast.error('This episode is already in the playlist');
        return;
      }

      const updatedEpisodeIds = [...currentEpisodeIds, selectedEpisodeId];

      const { error: updateError } = await supabase
        .from('playlists')
        .update({ episode_ids: updatedEpisodeIds })
        .eq('id', playlistId);

      if (updateError) throw updateError;

      // Also create a record in playlist_episodes table if needed
      // This is often better for many-to-many relationships than array columns
      // But we'll stick to the array update as primary for now to match the existing pattern
      
      toast.success('Episode added to playlist');
      onEpisodeAdded();
      onOpenChange(false);
      setSelectedEpisodeId(null);
    } catch (error) {
      console.error('Error adding episode:', error);
      toast.error('Failed to add episode');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Episode to Playlist</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search episodes..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-sm text-gray-500 py-4">Loading episodes...</p>
            ) : episodes.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No episodes found</p>
            ) : (
              episodes.map((episode) => (
                <div
                  key={episode.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEpisodeId === episode.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50 border-gray-100'
                  }`}
                  onClick={() => setSelectedEpisodeId(episode.id)}
                >
                  <div className="h-16 w-24 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                    {episode.thumbnail_url ? (
                      <img 
                        src={episode.thumbnail_url} 
                        alt={episode.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-100">
                        <Video className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">{episode.title}</h4>
                    {episode.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{episode.description}</p>
                    )}
                    {selectedEpisodeId === episode.id && (
                      <div className="flex items-center gap-1 text-blue-600 text-xs mt-2 font-medium">
                        <Check className="h-3 w-3" />
                        Selected
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddEpisode} disabled={!selectedEpisodeId}>
            Add Episode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
