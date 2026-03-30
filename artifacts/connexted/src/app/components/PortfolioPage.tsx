// Split candidate: ~481 lines — consider extracting PortfolioProjectCard, PortfolioAddDialog, and PortfolioEmptyState into sub-components.
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import {
  Briefcase,
  Plus,
  Settings,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Star,
  Grid3x3,
  List,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { useUserBadges } from '@/hooks/useBadges';
import { BadgeDisplay } from '@/app/components/badges';

interface PortfolioData {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string;
  is_public: boolean;
  layout_style: string;
  show_categories: boolean;
  created_at: string;
  updated_at: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];
  display_order: number;
  is_featured: boolean;
  document_id: string | null;
  created_at: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
}

export default function PortfolioPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = currentUser?.id === userId;

  // User badges for this portfolio owner
  const { badges: userBadges } = useUserBadges(userId || null);

  useEffect(() => {
    if (userId) {
      fetchPortfolioData();
    }
  }, [userId]);

  const fetchPortfolioData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, avatar, bio')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Fetch portfolio container
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (portfolioError) {
        console.error('Error fetching portfolio:', portfolioError);
        toast.error('Portfolio not found');
        return;
      }

      setPortfolio(portfolioData);

      // Check if user can view this portfolio
      if (!portfolioData.is_public && currentUser?.id !== userId) {
        toast.error('This portfolio is private');
        navigate('/');
        return;
      }

      // Fetch portfolio items
      const { data: itemsData, error: itemsError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('portfolio_id', portfolioData.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(itemsData?.map(item => item.category).filter(Boolean) || [])
      ) as string[];
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this item from your portfolio?')) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(item => item.id !== itemId));
      toast.success('Item removed from portfolio');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const filteredItems = selectedCategory
    ? items.filter(item => item.category === selectedCategory)
    : items;

  const featuredItems = items.filter(item => item.is_featured);

  const getLayoutIcon = () => {
    switch (portfolio?.layout_style) {
      case 'grid': return <Grid3x3 className="w-4 h-4" />;
      case 'list': return <List className="w-4 h-4" />;
      case 'masonry': return <LayoutGrid className="w-4 h-4" />;
      default: return <Grid3x3 className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading portfolio...</div>
      </div>
    );
  }

  if (!portfolio || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Portfolio not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Members', path: '/members' },
        { label: user.name, path: `/users/${user.id}` },
        { label: 'Portfolio' }
      ]} />

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                  <h1 className="text-3xl font-bold">{portfolio.name}</h1>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Link to={`/portfolio/${userId}/add-item`}>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </Link>
                    <Link to={`/portfolio/${userId}/settings`}>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge variant={portfolio.is_public ? 'default' : 'secondary'} className="gap-1">
                  {portfolio.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {portfolio.is_public ? 'Public' : 'Private'}
                </Badge>
                <span className="text-sm text-gray-600">{items.length} items</span>
                <Badge variant="outline" className="gap-1">
                  {getLayoutIcon()}
                  {portfolio.layout_style}
                </Badge>
                <Link to={`/moments/${userId}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-gray-100">
                    <Zap className="w-3 h-3" />
                    View Moments
                  </Badge>
                </Link>
              </div>

              {portfolio.tagline && (
                <p className="text-lg text-gray-800 italic mb-2">{portfolio.tagline}</p>
              )}

              {portfolio.description && (
                <p className="text-gray-700">{portfolio.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges & Achievements */}
      {userBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Badges & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeDisplay badges={userBadges} maxDisplay={12} size="md" showIssuer={false} />
            <p className="text-xs text-gray-500 mt-2">
              {userBadges.length} badge{userBadges.length !== 1 ? 's' : ''} earned
            </p>
          </CardContent>
        </Card>
      )}

      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Featured Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      {item.category && (
                        <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                      )}
                      {item.description && (
                        <p className="text-gray-600 mb-3">{item.description}</p>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, idx) => (
                            <Link key={idx} to={`/tags/${encodeURIComponent(tag)}`}>
                              <Badge variant="outline" className="text-xs hover:bg-gray-100 cursor-pointer transition-colors">
                                <span className="mr-1">#</span>
                                {tag}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </a>
                    )}
                    {item.document_id && (
                      <Link to={`/documents/${item.document_id}`}>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          View Document
                        </Button>
                      </Link>
                    )}
                    {isOwner && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      {portfolio.show_categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All ({items.length})
          </Button>
          {categories.map((category) => {
            const count = items.filter(item => item.category === category).length;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Portfolio Items */}
      {filteredItems.filter(item => !item.is_featured).length > 0 ? (
        <div className={
          portfolio.layout_style === 'list' 
            ? 'space-y-3'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          {filteredItems.filter(item => !item.is_featured).map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    {item.category && (
                      <Badge variant="secondary" className="text-xs mb-2">{item.category}</Badge>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
                    )}
                  </div>
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </a>
                    )}
                    {item.document_id && (
                      <Link to={`/documents/${item.document_id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <FileText className="w-4 h-4 mr-2" />
                          Document
                        </Button>
                      </Link>
                    )}
                    {isOwner && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !loading && filteredItems.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-semibold mb-2">
                {selectedCategory ? 'No items in this category' : 'No portfolio items yet'}
              </p>
              <p className="text-sm">
                {isOwner && !selectedCategory
                  ? 'Start building your portfolio by adding your best work!' 
                  : selectedCategory
                  ? 'Try selecting a different category'
                  : `${user.name} hasn't added any items to their portfolio yet.`}
              </p>
              {isOwner && !selectedCategory && (
                <Link to={`/portfolio/${userId}/add-item`}>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Item
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}