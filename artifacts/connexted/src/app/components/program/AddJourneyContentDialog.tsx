// Split candidate: ~556 lines — consider extracting ContentTypeTabList, ContentSearchResults, and ContentPreviewCard into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { FileText, Calendar, MessageSquare, Box, ExternalLink, BookOpen, Presentation, Library, Video, CheckSquare } from 'lucide-react';

interface AddJourneyContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyId: string;
  programId: string;
  onContentAdded?: () => void;
}

interface ContentItem {
  id: string;
  title: string;
  description?: string;
}

type ItemType = 
  | 'document' | 'book' | 'deck' | 'shelf' | 'playlist' | 'magazine' | 'episode'  // Content types
  | 'table' | 'elevator' | 'pitch' | 'build' | 'standup' | 'meetup' | 'sprint' | 'checklist'  // Container types
  | 'event' | 'discussion' | 'resource';  // Other types

export function AddJourneyContentDialog({
  open,
  onOpenChange,
  journeyId,
  programId,
  onContentAdded,
}: AddJourneyContentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<ItemType>('document');
  const [availableItems, setAvailableItems] = useState<ContentItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [fetchingItems, setFetchingItems] = useState(false);

  // Fetch available items when item type changes
  useEffect(() => {
    if (open && itemType) {
      fetchAvailableItems();
    }
  }, [itemType, open]);

  // Auto-fill title when item is selected
  useEffect(() => {
    if (selectedItemId) {
      const item = availableItems.find(i => i.id === selectedItemId);
      if (item) {
        setTitle(item.title);
        setDescription(item.description || '');
      }
    }
  }, [selectedItemId, availableItems]);

  const fetchAvailableItems = async () => {
    try {
      setFetchingItems(true);
      setAvailableItems([]);
      setSelectedItemId('');

      let data: ContentItem[] = [];

      switch (itemType) {
        case 'document':
          const { data: docs } = await supabase
            .from('documents')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = docs || [];
          break;

        case 'book':
          const { data: books } = await supabase
            .from('books')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = books || [];
          break;

        case 'magazine':
          const { data: magazines } = await supabase
            .from('magazines')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (magazines || []).map(m => ({ id: m.id, title: m.name, description: m.description }));
          break;

        case 'episode':
          const { data: episodes } = await supabase
            .from('episodes')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = episodes || [];
          break;

        case 'deck':
          const { data: decks } = await supabase
            .from('decks')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = decks || [];
          break;

        case 'shelf':
          const { data: libraries } = await supabase
            .from('libraries')
            .select('id, name, description')
            .eq('library_type', 'manual') // Only show manual libraries
            .order('created_at', { ascending: false })
            .limit(100);
          data = (libraries || []).map(l => ({ id: l.id, title: l.name, description: l.description }));
          break;

        case 'playlist':
          const { data: playlists } = await supabase
            .from('playlists')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (playlists || []).map(p => ({ id: p.id, title: p.name, description: p.description }));
          break;

        case 'event':
          const { data: events } = await supabase
            .from('events')
            .select('id, title, description')
            .order('start_time', { ascending: false })
            .limit(100);
          data = events || [];
          break;

        case 'discussion':
          const { data: threads } = await supabase
            .from('forum_threads')
            .select('id, title, content')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (threads || []).map(t => ({ id: t.id, title: t.title, description: t.content }));
          break;

        // Specific container types
        case 'table':
          const { data: tables } = await supabase
            .from('tables')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (tables || []).map(t => ({ id: t.id, title: t.name, description: t.description }));
          break;

        case 'elevator':
          const { data: elevators } = await supabase
            .from('elevators')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (elevators || []).map(e => ({ id: e.id, title: e.name, description: e.description }));
          break;

        case 'pitch':
          const { data: pitches } = await supabase
            .from('pitches')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = pitches || [];
          break;

        case 'build':
          const { data: builds } = await supabase
            .from('builds')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = builds || [];
          break;

        case 'standup':
          const { data: standups } = await supabase
            .from('standups')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (standups || []).map(s => ({ id: s.id, title: s.name, description: s.description }));
          break;

        case 'meetup':
          const { data: meetups } = await supabase
            .from('meetups')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (meetups || []).map(m => ({ id: m.id, title: m.name, description: m.description }));
          break;

        case 'sprint':
          const { data: sprints } = await supabase
            .from('sprints')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (sprints || []).map(s => ({ id: s.id, title: s.name, description: s.description }));
          break;

        case 'checklist':
          const { data: checklists } = await supabase
            .from('checklists')
            .select('id, name, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = (checklists || []).map(c => ({ id: c.id, title: c.name, description: c.description }));
          break;

        case 'resource':
          // Resources could be external links or content items
          // For now, use documents as resources
          const { data: resources } = await supabase
            .from('documents')
            .select('id, title, description')
            .order('created_at', { ascending: false })
            .limit(100);
          data = resources || [];
          break;
      }

      setAvailableItems(data);
    } catch (error) {
      console.error('Error fetching available items:', error);
      toast.error('Failed to load available content');
    } finally {
      setFetchingItems(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error('Please select an item to add');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setLoading(true);

      // Get current max order_index
      const { data: existingItems } = await supabase
        .from('journey_items')
        .select('order_index')
        .eq('journey_id', journeyId)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingItems && existingItems.length > 0 ? existingItems[0].order_index : 0;

      // Insert new journey item
      const { error } = await supabase
        .from('journey_items')
        .insert({
          journey_id: journeyId,
          item_type: itemType,
          item_id: selectedItemId,
          title: title.trim(),
          description: description.trim() || null,
          order_index: maxOrder + 1,
          is_published: isPublished,
        });

      if (error) throw error;

      toast.success('Content added to journey');
      
      // Reset form
      setSelectedItemId('');
      setTitle('');
      setDescription('');
      
      onContentAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding content to journey:', error);
      toast.error('Failed to add content');
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
      case 'resource':
        return <FileText className="w-4 h-4" />;
      case 'book':
      case 'magazine':
        return <BookOpen className="w-4 h-4" />;
      case 'deck':
      case 'playlist':
        return <Presentation className="w-4 h-4" />;
      case 'episode':
        return <Video className="w-4 h-4" />;
      case 'shelf':
        return <Library className="w-4 h-4" />;
      case 'checklist':
        return <CheckSquare className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      case 'discussion':
        return <MessageSquare className="w-4 h-4" />;
      case 'container':
      case 'table':
      case 'elevator':
      case 'pitch':
      case 'build':
      case 'standup':
      case 'meetup':
      case 'sprint':
        return <Box className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content to Journey</DialogTitle>
          <DialogDescription>
            Add existing content from your platform to this journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content Type Selector */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={itemType} onValueChange={(value: any) => setItemType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document
                  </div>
                </SelectItem>
                <SelectItem value="book">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Book
                  </div>
                </SelectItem>
                <SelectItem value="magazine">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Magazine
                  </div>
                </SelectItem>
                <SelectItem value="episode">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Episode
                  </div>
                </SelectItem>
                <SelectItem value="deck">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4" />
                    Deck
                  </div>
                </SelectItem>
                <SelectItem value="shelf">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4" />
                    Library
                  </div>
                </SelectItem>
                <SelectItem value="playlist">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4" />
                    Playlist
                  </div>
                </SelectItem>
                <SelectItem value="event">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Event
                  </div>
                </SelectItem>
                <SelectItem value="table">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Table
                  </div>
                </SelectItem>
                <SelectItem value="elevator">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Elevator
                  </div>
                </SelectItem>
                <SelectItem value="pitch">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Pitch
                  </div>
                </SelectItem>
                <SelectItem value="build">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Build
                  </div>
                </SelectItem>
                <SelectItem value="standup">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Standup
                  </div>
                </SelectItem>
                <SelectItem value="meetup">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Meetup
                  </div>
                </SelectItem>
                <SelectItem value="sprint">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Sprint
                  </div>
                </SelectItem>
                <SelectItem value="checklist">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    List
                  </div>
                </SelectItem>
                <SelectItem value="discussion">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Discussion Thread
                  </div>
                </SelectItem>
                <SelectItem value="resource">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Resource
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Selector */}
          <div className="space-y-2">
            <Label>Select {itemType.charAt(0).toUpperCase() + itemType.slice(1)}</Label>
            {fetchingItems ? (
              <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                Loading available items...
              </div>
            ) : availableItems.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-gray-500">
                No {itemType}s available. Create some first, then add them to journeys.
              </div>
            ) : (
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${itemType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Title (editable) */}
          <div className="space-y-2">
            <Label>Title (shown in journey)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this content"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description or learning objectives"
              rows={3}
            />
          </div>

          {/* Published Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-0.5">
              <Label>Publish Now</Label>
              <div className="text-sm text-gray-500">
                Make this content visible to program members immediately
              </div>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedItemId}>
            {loading ? 'Adding...' : 'Add to Journey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}