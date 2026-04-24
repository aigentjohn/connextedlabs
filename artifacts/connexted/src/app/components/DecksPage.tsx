import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Layers, Trash2, Eye, ExternalLink, Heart, Star, Sparkles, Download, Edit2, User } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PrivacySelector } from '@/app/components/unified/PrivacySelector';
import { VisibilityBadge } from '@/app/components/unified/VisibilityBadge';
import { TagSelector } from '@/app/components/unified/TagSelector';

interface Deck {
  id: string;
  title: string;
  description: string;
  category?: string;
  cover_image?: string;
  tags?: string[];
  created_by: string;
  likes?: string[];
  favorites?: string[];
  views?: number;
  is_template?: boolean;
  visibility?: 'public' | 'member' | 'private' | 'unlisted';
  admin_ids?: string[];
  member_ids?: string[];
  created_at: string;
  updated_at: string;
  card_count?: number;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function DecksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ 
    title: '', 
    description: '',
    visibility: 'public' as 'public' | 'member' | 'private' | 'unlisted',
    tags: [] as string[],
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    visibility: 'public' as 'public' | 'member' | 'private' | 'unlisted',
    tags: [] as string[],
  });
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [likedDeckIds, setLikedDeckIds] = useState<Set<string>>(new Set());
  const [favoritedDeckIds, setFavoritedDeckIds] = useState<Set<string>>(new Set());
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [favoritesCountMap, setFavoritesCountMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [filterMyContent, setFilterMyContent] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      // Fetch decks from database via API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching decks:', errorData);
        
        // If tables don't exist, show setup message
        if (errorData?.code === 'PGRST205' || errorData?.message?.includes('Could not find the table')) {
          toast.error('Decks tables not set up. Please run the database migration.');
          setLoading(false);
          return;
        }
        
        throw new Error('Failed to fetch decks');
      }
      
      const data = await response.json();
      
      // Fetch author info for all decks
      if (data.decks && data.decks.length > 0) {
        const authorIds = [...new Set(data.decks.map((d: Deck) => d.created_by))];
        const { data: authors } = await supabase
          .from('users')
          .select('id, name, avatar')
          .in('id', authorIds);
        
        if (authors) {
          const authorMap = new Map(authors.map(a => [a.id, a]));
          data.decks.forEach((deck: Deck) => {
            deck.author = authorMap.get(deck.created_by);
          });
        }
      }
      
      setDecks(data.decks || []);

      // Fetch Era 3 engagement data for decks
      const deckIds = (data.decks || []).map((d: Deck) => d.id);
      if (deckIds.length > 0) {
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('content_type', 'deck')
          .in('content_id', deckIds);

        if (likesData) {
          const counts: Record<string, number> = {};
          likesData.forEach(l => { counts[l.content_id] = (counts[l.content_id] || 0) + 1; });
          setLikesCountMap(counts);
        }

        const { data: favsData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('content_type', 'deck')
          .in('content_id', deckIds);

        if (favsData) {
          const counts: Record<string, number> = {};
          favsData.forEach(f => { counts[f.content_id] = (counts[f.content_id] || 0) + 1; });
          setFavoritesCountMap(counts);
        }

        if (profile) {
          const { data: userLikes } = await supabase
            .from('content_likes')
            .select('content_id')
            .eq('content_type', 'deck')
            .eq('user_id', profile.id)
            .in('content_id', deckIds);

          if (userLikes) {
            setLikedDeckIds(new Set(userLikes.map(l => l.content_id)));
          }

          const { data: userFavs } = await supabase
            .from('content_favorites')
            .select('content_id')
            .eq('content_type', 'deck')
            .eq('user_id', profile.id)
            .in('content_id', deckIds);

          if (userFavs) {
            setFavoritedDeckIds(new Set(userFavs.map(f => f.content_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
      toast.error('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.title.trim() || !profile) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newDeck.title.trim(),
            description: newDeck.description.trim(),
            author_id: profile.id,
            visibility: newDeck.visibility,
            tags: newDeck.tags,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create deck');

      const data = await response.json();
      toast.success('Deck created!');
      
      setNewDeck({ title: '', description: '', visibility: 'public', tags: [] });
      setIsCreateDialogOpen(false);
      fetchDecks();
    } catch (error) {
      console.error('Error creating deck:', error);
      toast.error('Failed to create deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${deckId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete deck');

      toast.success('Deck deleted');
      fetchDecks();
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
    }
  };

  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setEditForm({
      title: deck.title,
      description: deck.description || '',
      visibility: deck.visibility || 'public',
      tags: deck.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDeck = async () => {
    if (!editingDeck || !editForm.title.trim() || !profile) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${editingDeck.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            visibility: editForm.visibility,
            tags: editForm.tags,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update deck');

      toast.success('Deck updated!');
      setIsEditDialogOpen(false);
      setEditingDeck(null);
      fetchDecks();
    } catch (error) {
      console.error('Error updating deck:', error);
      toast.error('Failed to update deck');
    }
  };

  const handleToggleLike = async (deckId: string) => {
    if (!profile) return;

    const isLiked = likedDeckIds.has(deckId);

    // Optimistic update
    setLikedDeckIds(prev => {
      const next = new Set(prev);
      if (isLiked) { next.delete(deckId); } else { next.add(deckId); }
      return next;
    });
    setLikesCountMap(prev => ({
      ...prev,
      [deckId]: Math.max(0, (prev[deckId] || 0) + (isLiked ? -1 : 1))
    }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_type', 'deck')
          .eq('content_id', deckId)
          .eq('user_id', profile.id);
        if (error) throw error;
        toast.success('Deck unliked');
      } else {
        const { error } = await supabase
          .from('content_likes')
          .insert({ content_type: 'deck', content_id: deckId, user_id: profile.id });
        if (error) throw error;
        toast.success('Deck liked!');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setLikedDeckIds(prev => {
        const next = new Set(prev);
        if (isLiked) { next.add(deckId); } else { next.delete(deckId); }
        return next;
      });
      setLikesCountMap(prev => ({
        ...prev,
        [deckId]: Math.max(0, (prev[deckId] || 0) + (isLiked ? 1 : -1))
      }));
      toast.error('Failed to toggle like');
    }
  };

  const handleToggleFavorite = async (deckId: string) => {
    if (!profile) return;

    const isFav = favoritedDeckIds.has(deckId);

    // Optimistic update
    setFavoritedDeckIds(prev => {
      const next = new Set(prev);
      if (isFav) { next.delete(deckId); } else { next.add(deckId); }
      return next;
    });
    setFavoritesCountMap(prev => ({
      ...prev,
      [deckId]: Math.max(0, (prev[deckId] || 0) + (isFav ? -1 : 1))
    }));

    try {
      if (isFav) {
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('content_type', 'deck')
          .eq('content_id', deckId)
          .eq('user_id', profile.id);
        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('content_favorites')
          .insert({ content_type: 'deck', content_id: deckId, user_id: profile.id });
        if (error) throw error;
        toast.success('Added to favorites!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setFavoritedDeckIds(prev => {
        const next = new Set(prev);
        if (isFav) { next.add(deckId); } else { next.delete(deckId); }
        return next;
      });
      setFavoritesCountMap(prev => ({
        ...prev,
        [deckId]: Math.max(0, (prev[deckId] || 0) + (isFav ? 1 : -1))
      }));
      toast.error('Failed to toggle favorite');
    }
  };

  if (!profile) return null;

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMine = !filterMyContent || deck.created_by === profile?.id;
    return matchesSearch && matchesMine;
  });

  const sortedDecks = [...filteredDecks].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'most-liked') return (likesCountMap[b.id] || 0) - (likesCountMap[a.id] || 0);
    return 0;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Decks', href: '/decks' }]}
        icon={Layers}
        iconBg="bg-purple-100"
        iconColor="text-purple-600"
        title="Decks"
        description="Create carousel-based content with cards"
        actions={
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create a New Deck</DialogTitle>
                  <DialogDescription>
                    Create a deck to share with your community.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3 mt-3">
                  <div>
                    <Label htmlFor="deck-title" className="text-sm">Title *</Label>
                    <Input
                      id="deck-title"
                      value={newDeck.title}
                      onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })}
                      placeholder="Enter deck title"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deck-description" className="text-sm">Description</Label>
                    <Textarea
                      id="deck-description"
                      value={newDeck.description}
                      onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                      placeholder="What is this deck about?"
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deck-visibility" className="text-sm">Visibility</Label>
                    <div className="mt-1">
                      <PrivacySelector
                        mode="content"
                        value={newDeck.visibility}
                        onChange={(value) => setNewDeck({ ...newDeck, visibility: value })}
                        contentType="deck"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deck-tags" className="text-sm">Tags (What/How)</Label>
                    <div className="mt-1">
                      <TagSelector
                        value={newDeck.tags}
                        onChange={(tags) => setNewDeck({ ...newDeck, tags })}
                        contentType="deck"
                        title={newDeck.title}
                        description={newDeck.description}
                        placeholder="Add tags..."
                        maxTags={10}
                        showSuggestions={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 pt-1">
                    Note: You can add cards after creating the deck.
                  </p>
                  <Button 
                    onClick={handleCreateDeck} 
                    className="w-full mt-2"
                    disabled={!newDeck.title.trim()}
                  >
                    Create Deck
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Edit Deck Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deck</DialogTitle>
            <DialogDescription>
              Update the deck's title, description, visibility, and tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-deck-title" className="text-sm">Title *</Label>
              <Input
                id="edit-deck-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Enter deck title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-deck-description" className="text-sm">Description</Label>
              <Textarea
                id="edit-deck-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="What is this deck about?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-deck-visibility" className="text-sm">Visibility</Label>
              <div className="mt-1">
                <PrivacySelector
                  mode="content"
                  value={editForm.visibility}
                  onChange={(value) => setEditForm({ ...editForm, visibility: value })}
                  contentType="deck"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-deck-tags" className="text-sm">Tags (What/How)</Label>
              <div className="mt-1">
                <TagSelector
                  value={editForm.tags}
                  onChange={(tags) => setEditForm({ ...editForm, tags })}
                  contentType="deck"
                  title={editForm.title}
                  description={editForm.description}
                  placeholder="Add tags..."
                  maxTags={10}
                  showSuggestions={true}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleUpdateDeck} 
                className="flex-1"
                disabled={!editForm.title.trim()}
              >
                Save Changes
              </Button>
              <Button 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDeck(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterMyContent ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMyContent(!filterMyContent)}
          >
            <User className="w-4 h-4 mr-1" />
            My Decks
          </Button>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'newest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'oldest' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Oldest
            </button>
            <button
              onClick={() => setSortBy('most-liked')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === 'most-liked' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Heart className="w-3 h-3 inline mr-1" />
              Most Liked
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {sortedDecks.length} {sortedDecks.length === 1 ? 'deck' : 'decks'}
        {filterMyContent && ' (my decks)'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Decks Grid */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Loading decks...
          </CardContent>
        </Card>
      ) : sortedDecks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No decks found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first deck to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Deck
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDecks.map((deck) => {
            const isOwner = deck.created_by === profile.id;
            const isAdmin = profile.role === 'super';
            const canEdit = isOwner || isAdmin;
            const isLiked = likedDeckIds.has(deck.id);
            const isFavorited = favoritedDeckIds.has(deck.id);

            return (
              <Card key={deck.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                        <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
                          <h3 className="font-medium text-lg hover:text-purple-600 transition-colors truncate">
                            {deck.title}
                          </h3>
                        </Link>
                      </div>
                      
                      {canEdit && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditDeck(deck);
                            }}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit deck"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteDeck(deck.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete deck"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Visibility Badge */}
                    {deck.visibility && deck.visibility !== 'public' && (
                      <div>
                        <VisibilityBadge visibility={deck.visibility} />
                      </div>
                    )}

                    {/* Tags */}
                    {deck.tags && deck.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deck.tags.slice(0, 3).map((tag) => (
                          <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors text-xs">
                              <span className="mr-1">#</span>
                              {tag}
                            </Badge>
                          </Link>
                        ))}
                        {deck.tags.length > 3 && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                            +{deck.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Description */}
                    <p className="text-sm text-gray-700 line-clamp-2 min-h-[2.5rem]">
                      {deck.description || 'No description'}
                    </p>

                    {/* Author */}
                    {deck.author && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={deck.author.avatar} />
                          <AvatarFallback>{deck.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">
                          {deck.author.name}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(deck.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                        {deck.card_count || 0} cards
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700">
                        {deck.views || 0} views
                      </Badge>
                      <Badge variant="outline" className="bg-pink-50 border-pink-300 text-pink-700">
                        {likesCountMap[deck.id] || 0} likes
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                        {favoritesCountMap[deck.id] || 0} favorites
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link to={`/decks/${deck.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant={isLiked ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleLike(deck.id);
                        }}
                        className={isLiked ? "bg-pink-600 hover:bg-pink-700" : ""}
                        title={isLiked ? "Unlike" : "Like"}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant={isFavorited ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFavorite(deck.id);
                        }}
                        className={isFavorited ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                        title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}