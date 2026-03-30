import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { 
  FileText, 
  Star, 
  CheckSquare, 
  ExternalLink, 
  ThumbsUp,
  CheckCircle2,
  Circle,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Import the generic ContainerFeed component for posts
import ContainerFeed from '@/app/components/shared/ContainerFeed';

interface CircleFeedProps {
  circleId: string;
  isAdmin: boolean;
  isMember: boolean;
  guestAccess?: {
    feed: boolean;
    documents: boolean;
    reviews: boolean;
    checklists: boolean;
  };
}

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  circle_ids: string[];
  author_id: string;
  tags: string[];
  access_level: string;
  favorites: string[];
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  libraries?: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

interface Review {
  id: string;
  title: string;
  description: string;
  external_rating: number;
  link_url: string | null;
  circle_ids: string[];
  author_id: string;
  tags: string[];
  access_level: string;
  likes_count: number;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Checklist {
  id: string;
  name: string;
  description: string;
  category: string;
  is_template: boolean;
  circle_ids: string[];
  created_at: string;
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  is_complete: boolean;
  order_index: number;
}

interface Post {
  id: string;
  circle_ids: string[];
  author_id: string;
  content: string;
  image_url: string | null;
  likes: string[];
  pinned: boolean;
  created_at: string;
  metadata?: {
    type?: string;
    item_type?: string;
    item_id?: string;
    item_title?: string;
  };
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

type FeedItem = {
  type: 'post' | 'document' | 'review' | 'checklist';
  data: Post | Document | Review | Checklist;
  created_at: string;
};

type FilterType = 'all' | 'documents' | 'reviews' | 'checklists';

export default function CircleFeed({ circleId, isAdmin, isMember, guestAccess }: CircleFeedProps) {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ [checklistId: string]: ChecklistItem[] }>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());
  const [favoritedDocIds, setFavoritedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    fetchAllFeedItems();
  }, [circleId, profile]);

  const fetchAllFeedItems = async () => {
    try {
      setLoading(true);

      // Fetch documents shared to this circle with library associations
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          author:users!documents_author_id_fkey(id, name, avatar)
        `)
        .contains('circle_ids', [circleId])
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      
      // Fetch library associations for documents
      const documentIds = docsData?.map(d => d.id) || [];
      let libraryAssociations: Record<string, Array<{ id: string; name: string; icon: string }>> = {};
      
      if (documentIds.length > 0) {
        const { data: libDocs } = await supabase
          .from('library_documents')
          .select(`
            document_id,
            library:libraries(id, name, icon)
          `)
          .in('document_id', documentIds);
        
        if (libDocs) {
          libDocs.forEach((ld: any) => {
            if (!libraryAssociations[ld.document_id]) {
              libraryAssociations[ld.document_id] = [];
            }
            if (ld.library) {
              libraryAssociations[ld.document_id].push(ld.library);
            }
          });
        }
      }

      const documentsWithLibraries = docsData?.map(doc => ({
        ...doc,
        libraries: libraryAssociations[doc.id] || []
      })) || [];
      
      setDocuments(documentsWithLibraries);

      // Fetch user's favorited document IDs from content_favorites
      if (profile?.id && documentIds.length > 0) {
        const { data: favData } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('content_type', 'document')
          .eq('user_id', profile.id)
          .in('content_id', documentIds);

        if (favData) {
          setFavoritedDocIds(new Set(favData.map(f => f.content_id)));
        }
      }

      // Fetch reviews shared to this circle
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('endorsements')
        .select(`
          *,
          author:users!reviews_author_id_fkey(id, name, avatar)
        `)
        .contains('circle_ids', [circleId])
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Fetch user's liked review IDs
      const reviewIds = reviewsData?.map((r: any) => r.id) || [];
      if (reviewIds.length > 0 && profile) {
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'endorsement')
          .in('content_id', reviewIds);
        
        if (likesData) {
          setLikedReviewIds(new Set(likesData.map((l: any) => l.content_id)));
        }
      }

      // Fetch posts for this circle
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_author_id_fkey(id, name, avatar)
        `)
        .contains('circle_ids', [circleId])
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Note: Checklists are not directly shared to circles
      // They use junction tables like sprint_checklists for sprints
      // Remove checklist fetching from circle feed
    } catch (error) {
      console.error('Error fetching feed items:', error);
      toast.error('Failed to load feed items');
    } finally {
      setLoading(false);
    }
  };

  const canAccessContent = (accessLevel: string): boolean => {
    if (!profile) return false;
    if (accessLevel === 'public') return true;
    
    const userClass = profile.user_class || 1;
    const classLevels = {
      'class-1': 1, 'class-2': 2, 'class-3': 3, 'class-4': 4,
      'class-5': 5, 'class-6': 6, 'class-7': 7, 'class-8': 8,
      'class-9': 9, 'class-10': 10
    };
    
    const requiredLevel = classLevels[accessLevel as keyof typeof classLevels] || 1;
    return userClass >= requiredLevel;
  };

  const handleDocumentFavorite = async (docId: string) => {
    if (!profile) return;

    const isFav = favoritedDocIds.has(docId);

    // Optimistic update
    setFavoritedDocIds(prev => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });

    try {
      if (isFav) {
        // Remove from favorites
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_id', docId)
          .eq('content_type', 'document');

        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('content_favorites')
          .insert({
            user_id: profile.id,
            content_id: docId,
            content_type: 'document'
          });

        if (error) throw error;
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert
      setFavoritedDocIds(prev => {
        const next = new Set(prev);
        if (isFav) {
          next.add(docId);
        } else {
          next.delete(docId);
        }
        return next;
      });
      toast.error('Failed to update favorite');
    }
  };

  const handleUpvote = async (reviewId: string) => {
    if (!profile) return;
    
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const hasLiked = likedReviewIds.has(reviewId);

    try {
      if (hasLiked) {
        // Remove like
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_id', reviewId)
          .eq('content_type', 'endorsement');

        if (error) throw error;

        setLikedReviewIds(prev => {
          const next = new Set(prev);
          next.delete(reviewId);
          return next;
        });
        setReviews(reviews.map(r => 
          r.id === reviewId ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) - 1) } : r
        ));
      } else {
        // Add like
        const { error } = await supabase
          .from('content_likes')
          .insert({
            user_id: profile.id,
            content_id: reviewId,
            content_type: 'endorsement'
          });

        if (error) throw error;

        setLikedReviewIds(prev => new Set(prev).add(reviewId));
        setReviews(reviews.map(r => 
          r.id === reviewId ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const getCompletionStats = (checklistId: string) => {
    const items = checklistItems[checklistId] || [];
    const completed = items.filter(item => item.is_complete).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'article': '📄', 'video': '🎥', 'course': '📚', 'book': '📖',
      'podcast': '🎙️', 'tool': '🔧', 'template': '📋', 'guide': '📖',
      'research': '🔬', 'case-study': '📊', 'other': '📌'
    };
    return icons[category] || '📄';
  };

  const getUrlSource = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'External Link';
    }
  };

  // Filter library items based on guest access
  const visibleDocuments = isMember || (guestAccess?.documents !== false) ? documents : [];
  const visibleReviews = isMember || (guestAccess?.reviews !== false) ? reviews : [];
  const visibleChecklists = isMember || (guestAccess?.checklists !== false) ? checklists : [];

  // Create merged feed items for "All Activity" view
  const getAllFeedItems = (): FeedItem[] => {
    const items: FeedItem[] = [];

    // Add documents
    visibleDocuments.forEach(doc => {
      items.push({
        type: 'document',
        data: doc,
        created_at: doc.created_at
      });
    });

    // Add reviews
    visibleReviews.forEach(review => {
      items.push({
        type: 'review',
        data: review,
        created_at: review.created_at
      });
    });

    // Add checklists
    visibleChecklists.forEach(checklist => {
      items.push({
        type: 'checklist',
        data: checklist,
        created_at: checklist.created_at
      });
    });

    // Sort chronologically (newest first)
    return items.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const mergedFeedItems = getAllFeedItems();

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      {(visibleDocuments.length > 0 || visibleReviews.length > 0 || visibleChecklists.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Activity
          </Button>
          {visibleDocuments.length > 0 && (
            <Button
              variant={filter === 'documents' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('documents')}
            >
              <FileText className="w-4 h-4 mr-1" />
              Documents ({visibleDocuments.length})
            </Button>
          )}
          {visibleReviews.length > 0 && (
            <Button
              variant={filter === 'reviews' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('reviews')}
            >
              <Star className="w-4 h-4 mr-1" />
              Reviews ({visibleReviews.length})
            </Button>
          )}
          {visibleChecklists.length > 0 && (
            <Button
              variant={filter === 'checklists' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('checklists')}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Checklists ({visibleChecklists.length})
            </Button>
          )}
        </div>
      )}

      {/* Feed Posts (always shown unless filtering for specific library items) */}
      {filter === 'all' && (
        <>
          <ContainerFeed 
            containerType="circle" 
            containerId={circleId} 
            isAdmin={isAdmin} 
            isMember={isMember}
          />
          
          {/* Render merged library items chronologically */}
          {mergedFeedItems.map(item => {
            if (item.type === 'document') {
              const doc = item.data as Document;
              const accessible = canAccessContent(doc.access_level);
              const isFavorite = favoritedDocIds.has(doc.id);

              return (
                <Card key={`doc-${doc.id}`} className={!accessible ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                        {getCategoryIcon(doc.category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <Link to={`/documents/${doc.id}`}>
                              <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                                {doc.title}
                              </h3>
                            </Link>
                            {!accessible && (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          
                          {accessible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDocumentFavorite(doc.id)}
                              className="flex-shrink-0 h-8 w-8 p-0 hover:bg-yellow-50"
                            >
                              <Star 
                                className={`w-5 h-5 ${
                                  isFavorite 
                                    ? 'text-yellow-500 fill-yellow-500' 
                                    : 'text-gray-400 hover:text-yellow-500'
                                }`} 
                              />
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                          {doc.description}
                        </p>

                        <div className="flex items-center space-x-2 mb-3">
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {getUrlSource(doc.url)}
                          </span>
                        </div>

                        {doc.author && (
                          <div className="flex items-center space-x-2 mb-3">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={doc.author.avatar || undefined} />
                              <AvatarFallback>{doc.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600">
                              by {doc.author.name}
                            </span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {doc.category && (
                            <Badge variant="outline" className="capitalize">
                              {doc.category}
                            </Badge>
                          )}
                          {doc.libraries && doc.libraries.length > 0 && doc.libraries.map((library) => (
                            <Link key={library.id} to={`/libraries/${library.id}`}>
                              <Badge variant="outline" className="hover:bg-green-50 border-green-300 text-green-700">
                                <span className="mr-1">{library.icon || '📚'}</span>
                                {library.name}
                              </Badge>
                            </Link>
                          ))}
                          {doc.tags && doc.tags.length > 0 && doc.tags.slice(0, 3).map((tag) => (
                            <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                                <span className="mr-1">#</span>
                                {tag}
                              </Badge>
                            </Link>
                          ))}
                        </div>

                        {accessible && (
                          <Link to={`/documents/${doc.id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Document
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else if (item.type === 'review') {
              const review = item.data as Review;
              const accessible = canAccessContent(review.access_level);
              const hasLiked = likedReviewIds.has(review.id);

              return (
                <Card key={`review-${review.id}`} className={!accessible ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      {review.author && (
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={review.author.avatar || undefined} />
                          <AvatarFallback>{review.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Link to={`/reviews/${review.id}`}>
                                <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                                  {review.title}
                                </h3>
                              </Link>
                              {!accessible && (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mb-2">
                              {renderStars(review.external_rating)}
                              {review.author && (
                                <>
                                  <span className="text-sm text-gray-500">by {review.author.name}</span>
                                  <span className="text-sm text-gray-400">•</span>
                                  <span className="text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {review.description}
                        </p>

                        {review.link_url && accessible && (
                          <a
                            href={review.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 mb-3"
                          >
                            View Resource <ExternalLink className="w-4 h-4 ml-1" />
                          </a>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {review.tags?.map((tag) => (
                            <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                              <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer">
                                <span className="mr-1">#</span>
                                {tag}
                              </Badge>
                            </Link>
                          ))}
                        </div>

                        {accessible && (
                          <div className="flex items-center justify-between">
                            <Link to={`/reviews/${review.id}`}>
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                                View Details
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpvote(review.id)}
                              className={hasLiked ? 'bg-indigo-50 border-indigo-300' : ''}
                            >
                              <ThumbsUp className={`w-4 h-4 mr-1 ${hasLiked ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                              <span className={hasLiked ? 'text-indigo-600' : ''}>
                                {review.likes_count || 0}
                              </span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else if (item.type === 'checklist') {
              const checklist = item.data as Checklist;
              const { completed, total, percentage } = getCompletionStats(checklist.id);
              const items = checklistItems[checklist.id] || [];

              return (
                <Card key={`checklist-${checklist.id}`} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <CheckSquare className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1">{checklist.name}</CardTitle>
                        {checklist.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {checklist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {checklist.category && (
                        <Badge variant="outline" className="text-xs">
                          {checklist.category}
                        </Badge>
                      )}
                      {checklist.is_template && (
                        <Badge variant="secondary" className="text-xs">
                          Template
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>{completed} / {total} completed</span>
                          <span className="font-semibold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-start gap-2 text-sm mb-2">
                        {item.is_complete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={item.is_complete ? 'line-through text-gray-500' : 'text-gray-700'}>
                          {item.text}
                        </span>
                      </div>
                    ))}

                    {items.length > 3 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{items.length - 3} more items
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            }
            return null;
          })}
        </>
      )}

      {/* Documents Only Filter */}
      {filter === 'documents' && visibleDocuments.map(doc => {
        const accessible = canAccessContent(doc.access_level);
        const isFavorite = favoritedDocIds.has(doc.id);

        return (
          <Card key={`doc-${doc.id}`} className={!accessible ? 'opacity-60' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                  {getCategoryIcon(doc.category)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center space-x-2">
                      <Link to={`/documents/${doc.id}`}>
                        <h3 className="font-medium text-lg hover:text-indigo-600 transition-colors">
                          {doc.title}
                        </h3>
                      </Link>
                      {!accessible && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    
                    {accessible && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDocumentFavorite(doc.id)}
                        className="flex-shrink-0 h-8 w-8 p-0 hover:bg-yellow-50"
                      >
                        <Star 
                          className={`w-5 h-5 ${
                            isFavorite 
                              ? 'text-yellow-500 fill-yellow-500' 
                              : 'text-gray-400 hover:text-yellow-500'
                          }`} 
                        />
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {doc.description}
                  </p>

                  <div className="flex items-center space-x-2 mb-3">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {getUrlSource(doc.url)}
                    </span>
                  </div>

                  {doc.author && (
                    <div className="flex items-center space-x-2 mb-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={doc.author.avatar || undefined} />
                        <AvatarFallback>{doc.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        by {doc.author.name}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {doc.category && (
                      <Badge variant="outline" className="capitalize">
                        {doc.category}
                      </Badge>
                    )}
                    {doc.libraries && doc.libraries.length > 0 && doc.libraries.map((library) => (
                      <Link key={library.id} to={`/libraries/${library.id}`}>
                        <Badge variant="outline" className="hover:bg-green-50 border-green-300 text-green-700">
                          <span className="mr-1">{library.icon || '📚'}</span>
                          {library.name}
                        </Badge>
                      </Link>
                    ))}
                    {doc.tags && doc.tags.length > 0 && doc.tags.slice(0, 3).map((tag) => (
                      <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`}>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                          <span className="mr-1">#</span>
                          {tag}
                        </Badge>
                      </Link>
                    ))}
                  </div>

                  {accessible && (
                    <Link to={`/documents/${doc.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Document
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty State */}
      {filter !== 'all' && (
        (filter === 'documents' && visibleDocuments.length === 0) ||
        (filter === 'reviews' && visibleReviews.length === 0) ||
        (filter === 'checklists' && visibleChecklists.length === 0)
      ) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No {filter} shared to this circle yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}