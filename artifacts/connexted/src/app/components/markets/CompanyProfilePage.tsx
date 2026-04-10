import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Separator } from '@/app/components/ui/separator';
import {
  Building2,
  Package,
  Newspaper,
  Globe,
  ExternalLink,
  Edit,
  Settings,
  User,
  Users,
  Award,
  Target,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';
import { useCompanyBadges } from '@/hooks/useBadges';
import { BadgeDisplay, BadgeList } from '@/app/components/badges';
import { useBadgeTypes } from '@/hooks/useBadges';

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  website_url: string;
  industry: string;
  stage: string;
  location: string;
  employee_count: string;
  founded_year: number;
  owner_user_id: string;
  is_public: boolean;
  created_at: string;
}

interface Offering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string;
  offering_type: string;
  pricing_model: string;
  is_active: boolean;
  created_at: string;
}

interface NewsPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  reactions: any;
}

interface OwnerData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
}

export default function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { badges: companyBadges, loading: badgesLoading } = useCompanyBadges(company?.id || null);
  const { badgeTypes } = useBadgeTypes();

  useEffect(() => {
    if (slug) {
      fetchCompany();
    }
  }, [slug]);

  const fetchCompany = async () => {
    try {
      setLoading(true);

      // Get company
      const { data: companyData, error } = await supabase
        .from('market_companies')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !companyData) {
        toast.error('Company not found');
        navigate('/markets/all-companies');
        return;
      }

      setCompany(companyData);

      // Get owner
      const { data: ownerData } = await supabase
        .from('users')
        .select('id, name, email, avatar, bio')
        .eq('id', companyData.owner_user_id)
        .single();
      setOwner(ownerData);

      // Get offerings
      const { data: offeringsData } = await supabase
        .from('market_offerings')
        .select('id, name, slug, tagline, logo_url, offering_type, pricing_model, is_active, created_at')
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });
      setOfferings(offeringsData || []);

      // Get company news posts
      const { data: newsData } = await supabase
        .from('company_news')
        .select('id')
        .eq('company_id', companyData.id)
        .single();

      if (newsData) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content, author_id, created_at, reactions')
          .eq('company_news_id', newsData.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setNewsPosts(postsData || []);
      }

    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-600">Loading company...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-600">Company not found.</p>
      </div>
    );
  }

  const isOwner = profile?.id === company.owner_user_id;
  const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';
  const canManage = isOwner || isPlatformAdmin;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Markets', path: '/markets' },
          { label: 'Companies', path: '/markets/all-companies' },
          { label: company.name },
        ]}
      />

      {/* Header with Cover Image */}
      <Card className="mb-6">
        {company.cover_image_url && (
          <div className="h-48 overflow-hidden rounded-t-lg">
            <img
              src={company.cover_image_url}
              alt={`${company.name} cover`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg -mt-12"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg -mt-12">
                  {company.name.charAt(0)}
                </div>
              )}
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{company.name}</CardTitle>
                  <Badge variant="outline">{company.stage}</Badge>
                </div>
                <p className="text-lg text-gray-600 mt-1">{company.tagline}</p>
                {/* Inline badge icons in header */}
                {companyBadges.length > 0 && (
                  <div className="mt-2">
                    <BadgeDisplay badges={companyBadges} maxDisplay={5} size="sm" showIssuer={false} />
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {company.industry}
                  </span>
                  {company.location && (
                    <span>{company.location}</span>
                  )}
                  {company.founded_year && (
                    <span>Founded {company.founded_year}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {company.website_url && (
                <Button
                  variant="outline"
                  onClick={() => window.open(company.website_url, '_blank')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to={`/markets/companies/${company.slug}/companion`}>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Companion
                </Link>
              </Button>
              {canManage && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/markets/edit-company/${company.id}`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
          </div>

          {/* Owner Info */}
          {owner && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={owner.avatar || undefined} />
                  <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-gray-600">Founded by</p>
                  <Link
                    to={`/users/${owner.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {owner.name}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="offerings" className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            Offerings ({offerings.length})
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center">
            <Newspaper className="w-4 h-4 mr-2" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {company.description || 'No description available'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Industry</p>
                    <p className="font-medium">{company.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stage</p>
                    <p className="font-medium">{company.stage}</p>
                  </div>
                  {company.location && (
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{company.location}</p>
                    </div>
                  )}
                  {company.employee_count && (
                    <div>
                      <p className="text-sm text-gray-600">Company Size</p>
                      <p className="font-medium">{company.employee_count}</p>
                    </div>
                  )}
                  {company.founded_year && (
                    <div>
                      <p className="text-sm text-gray-600">Founded</p>
                      <p className="font-medium">{company.founded_year}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Badges & Achievements
                  {companyBadges.length > 0 && (
                    <Badge variant="secondary">{companyBadges.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badgesLoading ? (
                  <p className="text-sm text-gray-500">Loading badges...</p>
                ) : companyBadges.length === 0 && !isOwner ? (
                  <div className="text-center py-6">
                    <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No badges earned yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Earned badges */}
                    {companyBadges.length > 0 && (
                      <BadgeList badges={companyBadges} groupByCategory={true} />
                    )}

                    {/* Available badges — only for company owner */}
                    {isOwner && (() => {
                      const earnedTypeIds = new Set(companyBadges.map(b => b.badge_type_id));
                      const available = badgeTypes.filter(
                        bt => bt.assignable_to.includes('company') && bt.is_active && !earnedTypeIds.has(bt.id)
                      );
                      if (available.length === 0) return null;

                      const issuerDescriptions: Record<string, string> = {
                        admin: 'Awarded by platform administrators',
                        sponsor: 'Awarded by sponsors or mentors',
                        platform: 'Earned through platform milestones',
                        program: 'Earned by completing a program',
                        course: 'Earned through course completion',
                      };

                      return (
                        <div>
                          <Separator className="my-4" />
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-gray-400" />
                            Available to Earn ({available.length})
                          </h4>
                          <div className="space-y-2">
                            {available.map(bt => (
                              <div key={bt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 opacity-70"
                                  style={{ backgroundColor: bt.badge_color || '#9CA3AF' }}
                                >
                                  <Award className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{bt.name}</p>
                                  {bt.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{bt.description}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {issuerDescriptions[bt.issuer_type] || 'Earned through platform activity'}
                                    {bt.auto_issue ? ' · Auto-awarded' : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Empty state for owners with no badges */}
                    {companyBadges.length === 0 && isOwner && (
                      <div className="text-center py-4">
                        <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No badges earned yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Badges are awarded as your company progresses through programs, receives endorsements, and reaches milestones.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Offerings Tab */}
        <TabsContent value="offerings" className="mt-6">
          <div className="space-y-4">
            {isOwner && (
              <div className="flex justify-end">
                <Button
                  onClick={() => navigate(`/markets/create-offering?companyId=${company.id}`)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Add Offering
                </Button>
              </div>
            )}

            {offerings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No offerings yet</p>
                  {isOwner && (
                    <Button
                      className="mt-4"
                      onClick={() => navigate(`/markets/create-offering?companyId=${company.id}`)}
                    >
                      Create First Offering
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offerings.map((offering) => (
                  <Card key={offering.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {offering.logo_url ? (
                            <img
                              src={offering.logo_url}
                              alt={offering.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                              {offering.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">{offering.name}</CardTitle>
                            {offering.tagline && (
                              <p className="text-sm text-gray-600 mt-1">{offering.tagline}</p>
                            )}
                          </div>
                        </div>
                        {!offering.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <Badge variant="outline">{offering.offering_type}</Badge>
                        {offering.pricing_model && (
                          <Badge variant="outline">{offering.pricing_model}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/markets/offerings/${offering.slug}`)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/markets/edit-offering/${offering.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Latest Updates</h3>
              <Button
                variant="outline"
                onClick={() => navigate(`/markets/companies/${slug}/news`)}
              >
                <Newspaper className="w-4 h-4 mr-2" />
                View All News
              </Button>
            </div>

            {newsPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No news updates yet</p>
                  {isOwner && (
                    <p className="text-sm text-gray-500 mt-2">
                      Share your first company update on the news page
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {newsPosts.map((post) => {
                  const likes = post.reactions?.likes || [];
                  return (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={owner?.avatar || undefined} />
                            <AvatarFallback>
                              {owner?.name?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{owner?.name || company.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-900 whitespace-pre-wrap line-clamp-3">
                          {post.content}
                        </p>
                        {likes.length > 0 && (
                          <p className="text-sm text-gray-500 mt-2">
                            {likes.length} {likes.length === 1 ? 'like' : 'likes'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/markets/companies/${slug}/news`)}
                  >
                    View All News Posts
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}