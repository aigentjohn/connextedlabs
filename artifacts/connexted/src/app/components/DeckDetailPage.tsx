import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Layers, Heart, Star, Eye, ChevronLeft, ChevronRight, Edit2, Trash2, Plus, GripVertical, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import '@/styles/slick-theme-safe.css';
import Breadcrumbs from './Breadcrumbs';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import { LikeButton } from '@/app/components/engagement/LikeButton';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';

// Helper function to validate UUID
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface Deck {
  id: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  created_by: string;
  likes?: string[];
  favorites?: string[];
  views?: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface DeckCard {
  id: string;
  deck_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}

export default function DeckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialIsLiked, setInitialIsLiked] = useState(false);
  const [initialIsFavorited, setInitialIsFavorited] = useState(false);
  const [initialLikesCount, setInitialLikesCount] = useState(0);
  const [topics, setTopics] = useState<any[]>([]);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const sliderRef = useRef<Slider>(null);

  // Card management state
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isEditCardDialogOpen, setIsEditCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DeckCard | null>(null);
  const [newCard, setNewCard] = useState({ title: '', content: '' });
  const [isManageMode, setIsManageMode] = useState(false);

  useEffect(() => {
    if (!id || !isValidUUID(id)) {
      setLoading(false);
      toast.error('Invalid deck ID');
      return;
    }

    fetchDeck();
    fetchCards();
    incrementView();
  }, [id]);

  const fetchDeck = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch deck');

      const data = await response.json();
      
      // Fetch author info
      if (data.deck && data.deck.created_by) {
        const { data: author } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', data.deck.created_by)
          .single();
        
        if (author) {
          data.deck.author = author;
        }
      }
      
      setDeck(data.deck);
      
      // Fetch topics for this deck
      try {
        const topicsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/content/deck/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (topicsResponse.ok) {
          const { topics: deckTopics } = await topicsResponse.json();
          setTopics(deckTopics || []);
        }
      } catch (error) {
        console.error('Error fetching topics:', error);
        // Non-fatal error, continue loading
      }
      
      // Check if current user has liked or favorited via Era 3 tables
      if (profile && data.deck) {
        const { data: likeData } = await supabase
          .from('content_likes')
          .select('id')
          .eq('content_type', 'deck')
          .eq('content_id', data.deck.id)
          .eq('user_id', profile.id)
          .maybeSingle();
        setInitialIsLiked(!!likeData);
        setInitialLikesCount(data.deck.likes?.length || 0);

        const { data: favData } = await supabase
          .from('content_favorites')
          .select('id')
          .eq('content_type', 'deck')
          .eq('content_id', data.deck.id)
          .eq('user_id', profile.id)
          .maybeSingle();
        setInitialIsFavorited(!!favData);
      }
    } catch (error) {
      console.error('Error fetching deck:', error);
      toast.error('Failed to load deck');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch cards');

      const data = await response.json();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      toast.error('Failed to load cards');
    }
  };

  const incrementView = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/view`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  };

  const handleDeleteDeck = async () => {
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete deck');

      toast.success('Deck deleted');
      navigate('/decks');
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
    }
  };

  // Card Management Functions
  const handleAddCard = async () => {
    if (!newCard.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newCard.title.trim(),
            content: newCard.content.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to add card');

      toast.success('Card added!');
      setNewCard({ title: '', content: '' });
      setIsAddCardDialogOpen(false);
      await fetchCards();
      
      // Navigate to the new card
      setTimeout(() => {
        if (sliderRef.current) {
          sliderRef.current.slickGoTo(cards.length);
        }
      }, 100);
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Failed to add card');
    }
  };

  const handleEditCard = async () => {
    if (!editingCard || !editingCard.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards/${editingCard.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editingCard.title.trim(),
            content: editingCard.content.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update card');

      toast.success('Card updated!');
      setIsEditCardDialogOpen(false);
      setEditingCard(null);
      await fetchCards();
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards/${cardId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete card');

      toast.success('Card deleted');
      await fetchCards();
      
      // Adjust current slide if needed
      if (currentSlide >= cards.length - 1 && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
        sliderRef.current?.slickGoTo(currentSlide - 1);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleMoveCard = async (cardId: string, direction: 'up' | 'down') => {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const newIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;

    // Create new array with swapped positions
    const newCards = [...cards];
    const [movedCard] = newCards.splice(cardIndex, 1);
    newCards.splice(newIndex, 0, movedCard);

    // Update local state immediately for smooth UX
    setCards(newCards);

    // Update order_index for both cards
    try {
      await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards/${cards[cardIndex].id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_index: newIndex }),
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/decks/${id}/cards/${cards[newIndex].id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_index: cardIndex }),
          }
        ),
      ]);

      toast.success('Card order updated');
    } catch (error) {
      console.error('Error reordering cards:', error);
      toast.error('Failed to reorder cards');
      // Revert on error
      await fetchCards();
    }
  };

  const openEditDialog = (card: DeckCard) => {
    setEditingCard({ ...card });
    setIsEditCardDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading deck...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Layers className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Deck not found</h2>
        <Link to="/decks">
          <Button>Back to Decks</Button>
        </Link>
      </div>
    );
  }

  const isOwner = profile?.id === deck.created_by;
  const isAdmin = profile?.role === 'super';
  const canDelete = isOwner || isAdmin;

  const sliderSettings = {
    dots: true,
    infinite: cards.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    afterChange: (current: number) => setCurrentSlide(current),
    arrows: false,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Decks', path: '/decks' },
          { label: deck.title, path: `/decks/${deck.id}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0 w-16 h-16 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{deck.title}</h1>
            {deck.description && (
              <p className="text-gray-600 mb-3">{deck.description}</p>
            )}
            
            {/* Author & Meta */}
            {deck.author && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={deck.author.avatar} />
                    <AvatarFallback>{deck.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>by {deck.author.name}</span>
                </div>
                <span>•</span>
                <span>{new Date(deck.created_at).toLocaleDateString()}</span>
              </div>
            )}
            
            {/* Topics and Tags */}
            {(topics.length > 0 || (deck.tags && deck.tags.length > 0)) && (
              <div className="flex flex-wrap gap-4">
                {/* Topics */}
                {topics.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-1">
                      {topics.map((topic) => (
                        <Link key={topic.id} to={`/topics/${topic.slug}`}>
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer transition-all hover:shadow-sm text-xs"
                            style={{ 
                              borderColor: topic.color || '#9333ea',
                              color: topic.color || '#9333ea',
                              backgroundColor: `${topic.color || '#9333ea'}10`
                            }}
                          >
                            <span className="mr-1">{topic.icon}</span>
                            {topic.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {deck.tags && deck.tags.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-1">
                      {deck.tags.map((tag) => (
                        <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors text-xs">
                            <span className="mr-1">#</span>
                            {tag}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {canDelete && (
          <div className="flex gap-2">
            <ShareInviteButton
              entityType="deck"
              entityId={deck.id}
              entityName={deck.title}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteDeck}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
        {!canDelete && (
          <ShareInviteButton
            entityType="deck"
            entityId={deck.id}
            entityName={deck.title}
          />
        )}
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
            {cards.length} cards
          </Badge>
          <Badge variant="outline" className="bg-gray-50 border-gray-300 text-gray-700">
            {deck.views || 0} views
          </Badge>
          <Badge variant="outline" className="bg-pink-50 border-pink-300 text-pink-700">
            {initialLikesCount} likes
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
            {deck.favorites?.length || 0} favorites
          </Badge>
        </div>

        <div className="flex gap-2">
          <LikeButton
            contentType="deck"
            contentId={deck.id}
            userId={profile?.id}
            initialLikesCount={initialLikesCount}
            initialIsLiked={initialIsLiked}
          />
          <FavoriteButton
            contentType="deck"
            contentId={deck.id}
            userId={profile?.id}
            initialIsFavorited={initialIsFavorited}
            showCollectionsDialog={false}
          />
        </div>
      </div>

      {/* Carousel */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No cards yet</h3>
            <p className="text-gray-500 mb-4">This deck doesn't have any cards yet.</p>
            {isOwner && (
              <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Card
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Card</DialogTitle>
                    <DialogDescription>
                      Create a new card for this deck. You can use markdown for formatting.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="card-title">Card Title *</Label>
                      <Input
                        id="card-title"
                        value={newCard.title}
                        onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                        placeholder="Enter card title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-content">Card Content</Label>
                      <Textarea
                        id="card-content"
                        value={newCard.content}
                        onChange={(e) => setNewCard({ ...newCard, content: e.target.value })}
                        placeholder="Enter card content (markdown supported)"
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supports markdown: **bold**, *italic*, lists, links, etc.
                      </p>
                    </div>
                    <Button 
                      onClick={handleAddCard} 
                      className="w-full"
                      disabled={!newCard.title.trim()}
                    >
                      Add Card
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Owner Card Management Bar */}
          {isOwner && (
            <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  {isManageMode ? 'Manage Mode' : 'View Mode'}
                </Badge>
                {isManageMode && (
                  <p className="text-sm text-gray-600">
                    Use the buttons on each card to edit, delete, or reorder
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManageMode(!isManageMode)}
                >
                  {isManageMode ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Done
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Manage Cards
                    </>
                  )}
                </Button>
                <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Card</DialogTitle>
                      <DialogDescription>
                        Create a new card for this deck. You can use markdown for formatting.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="card-title">Card Title *</Label>
                        <Input
                          id="card-title"
                          value={newCard.title}
                          onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                          placeholder="Enter card title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="card-content">Card Content</Label>
                        <Textarea
                          id="card-content"
                          value={newCard.content}
                          onChange={(e) => setNewCard({ ...newCard, content: e.target.value })}
                          placeholder="Enter card content (markdown supported)"
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supports markdown: **bold**, *italic*, lists, links, etc.
                        </p>
                      </div>
                      <Button 
                        onClick={handleAddCard} 
                        className="w-full"
                        disabled={!newCard.title.trim()}
                      >
                        Add Card
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          <div className="relative">
            {/* Navigation Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 z-10 flex justify-between pointer-events-none px-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => sliderRef.current?.slickPrev()}
                disabled={currentSlide === 0 && !sliderSettings.infinite}
                className="pointer-events-auto bg-white shadow-lg hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => sliderRef.current?.slickNext()}
                disabled={currentSlide === cards.length - 1 && !sliderSettings.infinite}
                className="pointer-events-auto bg-white shadow-lg hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Carousel */}
            <Slider ref={sliderRef} {...sliderSettings}>
              {cards.map((card, index) => (
                <div key={card.id} className="px-2">
                  <Card className="min-h-[400px] flex flex-col justify-center relative bg-white shadow-sm border-2 border-transparent hover:border-purple-100 transition-all">
                    <CardContent className="p-12 relative">
                      {/* Card Management Buttons (Owner Only in Manage Mode) */}
                      {isOwner && isManageMode && (
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(card)}
                            className="bg-white"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCard(card.id)}
                            className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}

                      {/* Card Reorder Buttons (Owner Only in Manage Mode) */}
                      {isOwner && isManageMode && cards.length > 1 && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveCard(card.id, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8 bg-white"
                            title="Move card earlier"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleMoveCard(card.id, 'down')}
                            disabled={index === cards.length - 1}
                            className="h-8 w-8 bg-white"
                            title="Move card later"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Card Counter */}
                      <div className="text-center mb-4">
                        <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                          Card {index + 1} of {cards.length}
                        </Badge>
                      </div>

                      {/* Card Title */}
                      <h2 className="text-2xl font-bold text-center mb-6 px-8">
                        {card.title}
                      </h2>

                      {/* Card Content */}
                      <div className="prose prose-sm max-w-none px-8">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {card.content || 'No content'}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </Slider>

            {/* Progress Indicator */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Swipe or use arrow buttons to navigate
              </p>
            </div>
          </div>
        </>
      )}

      {/* Edit Card Dialog */}
      <Dialog open={isEditCardDialogOpen} onOpenChange={setIsEditCardDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
            <DialogDescription>
              Update the card title and content. Markdown is supported.
            </DialogDescription>
          </DialogHeader>
          {editingCard && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-card-title">Card Title *</Label>
                <Input
                  id="edit-card-title"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  placeholder="Enter card title"
                />
              </div>
              <div>
                <Label htmlFor="edit-card-content">Card Content</Label>
                <Textarea
                  id="edit-card-content"
                  value={editingCard.content}
                  onChange={(e) => setEditingCard({ ...editingCard, content: e.target.value })}
                  placeholder="Enter card content (markdown supported)"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports markdown: **bold**, *italic*, lists, links, etc.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleEditCard} 
                  className="flex-1"
                  disabled={!editingCard.title.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsEditCardDialogOpen(false);
                    setEditingCard(null);
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}