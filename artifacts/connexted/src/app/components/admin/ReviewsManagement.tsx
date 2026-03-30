// Split candidate: ~403 lines — consider extracting ReviewRow, ReviewFilters, and ReviewModerationActions into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Star, Search, Trash2, Download, ExternalLink, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
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
import { format } from 'date-fns';

interface Review {
  id: string;
  title: string;
  description: string;
  link_url: string;
  author_id: string;
  circle_ids: string[];
  table_ids: string[];
  external_rating: number;
  tags: string[];
  likes_count: number;
  access_level: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

export default function ReviewsManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  
  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all reviews with author info using JOIN (matching Content Moderation approach)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('endorsements')
          .select(`
            *,
            author:users!reviews_author_id_fkey(id, name, email, avatar)
          `)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;
        setReviews(reviewsData || []);
        
        // Fetch circles for display
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name');
        setCircles(circlesData || []);
        
        // Fetch users for additional lookups if needed
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, avatar');
        setUsers(usersData || []);
        
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const highRatedReviews = reviews.filter(r => r.external_rating >= 4);
  const lowRatedReviews = reviews.filter(r => r.external_rating <= 2);
  
  const filteredReviews = reviews
    .filter(review => {
      const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRating = ratingFilter === null || review.external_rating === ratingFilter;
      return matchesSearch && matchesRating;
    });

  const displayReviews = activeTab === 'high-rated' ? highRatedReviews.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === null || r.external_rating === ratingFilter;
    return matchesSearch && matchesRating;
  }) : activeTab === 'low-rated' ? lowRatedReviews.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === null || r.external_rating === ratingFilter;
    return matchesSearch && matchesRating;
  }) : filteredReviews;

  const handleDeleteReview = async (reviewId: string, reviewTitle: string) => {
    try {
      const { error } = await supabase
        .from('endorsements')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== reviewId));
      toast.success(`Review "${reviewTitle}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(reviews, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `reviews-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Reviews exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Reviews Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  const getAuthorName = (authorId: string) => {
    const author = users.find(u => u.id === authorId);
    return author ? author.name : 'Unknown';
  };

  const getCircleNames = (circleIds: string[]) => {
    return circleIds
      .map(id => circles.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Platform-wide';
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.external_rating, 0) / reviews.length).toFixed(1)
    : 0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Reviews Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Reviews Management</h1>
          <p className="text-gray-600">Manage all reviews across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{avgRating} ★</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">High Rated (4-5★)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{highRatedReviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Low Rated (1-2★)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowRatedReviews.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Rating Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={ratingFilter === null ? 'default' : 'outline'}
            onClick={() => setRatingFilter(null)}
            size="sm"
          >
            All Ratings
          </Button>
          {[5, 4, 3, 2, 1].map(rating => (
            <Button
              key={rating}
              variant={ratingFilter === rating ? 'default' : 'outline'}
              onClick={() => setRatingFilter(rating)}
              size="sm"
            >
              {rating}★
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="high-rated">
            High Rated ({highRatedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="low-rated">
            Low Rated ({lowRatedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {displayReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No reviews found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayReviews.map(review => {
                return (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{review.title}</h3>
                            {renderStars(review.external_rating)}
                          </div>
                          
                          <p className="text-gray-700 mb-3">{review.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                            <div>Author: {getAuthorName(review.author_id)}</div>
                            <div>Circles: {getCircleNames(review.circle_ids || [])}</div>
                            <div className="flex items-center">
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              {review.likes_count || 0} upvotes
                            </div>
                            <div>{format(new Date(review.created_at), 'PPp')}</div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {review.tags?.map(tag => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                            {review.access_level !== 'public' && (
                              <Badge variant="secondary" className="capitalize">
                                {review.access_level}
                              </Badge>
                            )}
                          </div>
                          
                          {review.link_url && (
                            <a 
                              href={review.link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline text-sm inline-flex items-center"
                            >
                              View Resource <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Link to={`/reviews/${review.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{review.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteReview(review.id, review.title)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}