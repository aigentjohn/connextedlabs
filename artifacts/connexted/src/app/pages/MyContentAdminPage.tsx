import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { 
  Clock, 
  Sparkles, 
  Flame, 
  Archive, 
  RefreshCw, 
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  SendHorizonal,
  X
} from 'lucide-react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ExpirationBadge } from '@/app/components/shared/ExpirationWarning';
import { EngagementIndicator } from '@/app/components/shared/EngagementImpact';

interface ContentItem {
  id: string;
  type: string;
  title: string;
  created_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  engagement_score: number;
  engagement_extends_count: number;
  last_engagement_extension_at: string | null;
  // Scheduling fields
  is_scheduled?: boolean;
  scheduled_publish_at?: string | null;
  is_published?: boolean;
  // Stats
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
}

export function MyContentAdminPage() {
  const [loading, setLoading] = useState(true);
  const [expiringSoon, setExpiringSoon] = useState<ContentItem[]>([]);
  const [activeContent, setActiveContent] = useState<ContentItem[]>([]);
  const [recentlyExpired, setRecentlyExpired] = useState<ContentItem[]>([]);
  const [scheduledContent, setScheduledContent] = useState<ContentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all user's content from different container types
      const containerTypes = ['builds', 'pitches', 'tables', 'elevators', 'journeys'];
      const allContent: ContentItem[] = [];

      for (const type of containerTypes) {
        const { data, error } = await supabase
          .from(type)
          .select('*')
          .eq('created_by', user.id);

        if (data) {
          allContent.push(...data.map(item => ({
            ...item,
            type: type.slice(0, -1) // Remove 's' from plural
          })));
        }
      }

      // Categorize content
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const expiring = allContent.filter(item => {
        if (item.is_permanent) return false;
        if (!item.expires_at) return false;
        if (item.is_scheduled && !item.is_published) return false; // Exclude scheduled
        const expiresAt = new Date(item.expires_at);
        return expiresAt > now && expiresAt <= thirtyDaysFromNow;
      });

      const active = allContent.filter(item => {
        if (item.is_scheduled && !item.is_published) return false; // Exclude scheduled
        if (item.is_permanent) return true;
        if (!item.expires_at) return true;
        const expiresAt = new Date(item.expires_at);
        return expiresAt > thirtyDaysFromNow;
      });

      const expired = allContent.filter(item => {
        if (item.is_permanent) return false;
        if (!item.expires_at) return false;
        if (item.is_scheduled && !item.is_published) return false; // Exclude scheduled
        const expiresAt = new Date(item.expires_at);
        return expiresAt <= now && expiresAt >= thirtyDaysAgo;
      });

      const scheduled = allContent.filter(item => {
        return item.is_scheduled && !item.is_published && item.scheduled_publish_at;
      });

      setExpiringSoon(expiring.sort((a, b) => 
        new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime()
      ));
      setActiveContent(active);
      setRecentlyExpired(expired);
      setScheduledContent(scheduled);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (itemId: string, itemType: string, months: number) => {
    setRenewing(true);
    try {
      const { error } = await supabase.rpc('extend_expiration', {
        p_container_type: itemType,
        p_container_id: itemId,
        p_extension_months: months
      });

      if (error) throw error;

      toast.success(`Renewed for ${months} month${months > 1 ? 's' : ''}!`);
      loadContent(); // Refresh
    } catch (error) {
      console.error('Error renewing:', error);
      toast.error('Failed to renew');
    } finally {
      setRenewing(false);
    }
  };

  const handleMakePermanent = async (itemId: string, itemType: string) => {
    setRenewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('make_content_permanent', {
        p_container_type: itemType,
        p_container_id: itemId,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Made permanent! 🎉');
        loadContent();
      } else if (data?.upgrade_required) {
        toast.error('Premium membership required', {
          description: 'Upgrade to make content permanent',
          action: {
            label: 'Upgrade',
            onClick: () => window.location.href = '/pricing'
          }
        });
      }
    } catch (error) {
      console.error('Error making permanent:', error);
      toast.error('Failed to make permanent');
    } finally {
      setRenewing(false);
    }
  };

  const handleBulkRenew = async (months: number) => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    setRenewing(true);
    let successCount = 0;

    for (const itemId of selectedItems) {
      const item = expiringSoon.find(i => i.id === itemId);
      if (!item) continue;

      try {
        await handleRenew(itemId, item.type, months);
        successCount++;
      } catch (error) {
        console.error('Error in bulk renew:', error);
      }
    }

    toast.success(`Renewed ${successCount} item${successCount > 1 ? 's' : ''}!`);
    setSelectedItems(new Set());
    setRenewing(false);
  };

  const handleRecover = async (itemId: string, itemType: string) => {
    // Recover = renew for default period
    await handleRenew(itemId, itemType, 3);
  };

  const toggleSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diff = expiration.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilPublish = (scheduledAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleCancelSchedule = async (itemId: string, itemType: string) => {
    setRenewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('cancel_scheduled_publish', {
        p_container_type: itemType,
        p_container_id: itemId,
        p_user_id: user.id,
        p_reason: 'User cancelled from My Content'
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Schedule cancelled! Content published immediately.');
        loadContent();
      } else {
        toast.error(data?.reason || 'Failed to cancel schedule');
      }
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast.error('Failed to cancel schedule');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Content</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content lifecycle and renewals
          </p>
        </div>
        <Button variant="outline" onClick={loadContent}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Content</CardDescription>
            <CardTitle className="text-3xl">{activeContent.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {expiringSoon.length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Recently Expired</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {recentlyExpired.length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Extensions</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {activeContent.reduce((sum, item) => sum + (item.engagement_extends_count || 0), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Needed</AlertTitle>
          <AlertDescription>
            You have {expiringSoon.length} item{expiringSoon.length > 1 ? 's' : ''} expiring in the next 30 days.
            Review and renew what you want to keep.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="expiring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expiring" className="relative">
            Expiring Soon
            {expiringSoon.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                {expiringSoon.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeContent.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Recently Expired ({recentlyExpired.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({scheduledContent.length})
          </TabsTrigger>
        </TabsList>

        {/* Expiring Soon Tab */}
        <TabsContent value="expiring" className="space-y-4">
          {expiringSoon.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground mt-1">
                  No content expiring in the next 30 days
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <Card className="border-primary">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBulkRenew(3)}
                          disabled={renewing}
                        >
                          Renew All (3 Months)
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBulkRenew(6)}
                          disabled={renewing}
                        >
                          Renew All (6 Months)
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedItems(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Items */}
              <div className="space-y-3">
                {expiringSoon.map(item => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    daysUntilExpiration={getDaysUntilExpiration(item.expires_at!)}
                    isSelected={selectedItems.has(item.id)}
                    onToggleSelect={() => toggleSelection(item.id)}
                    onRenew={(months) => handleRenew(item.id, item.type, months)}
                    onMakePermanent={() => handleMakePermanent(item.id, item.type)}
                    renewing={renewing}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Active Content Tab */}
        <TabsContent value="active" className="space-y-3">
          {activeContent.map(item => (
            <ContentItemCard
              key={item.id}
              item={item}
              variant="active"
              onRenew={(months) => handleRenew(item.id, item.type, months)}
              onMakePermanent={() => handleMakePermanent(item.id, item.type)}
              renewing={renewing}
            />
          ))}
        </TabsContent>

        {/* Recently Expired Tab */}
        <TabsContent value="expired" className="space-y-3">
          {recentlyExpired.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No recently expired content</p>
                <p className="text-muted-foreground mt-1">
                  Content that expires can be recovered here for 30 days
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Recoverable for 30 Days</AlertTitle>
                <AlertDescription>
                  These items have expired but can still be recovered and renewed.
                  After 30 days, they'll be permanently archived.
                </AlertDescription>
              </Alert>

              {recentlyExpired.map(item => (
                <ContentItemCard
                  key={item.id}
                  item={item}
                  variant="expired"
                  onRecover={() => handleRecover(item.id, item.type)}
                  renewing={renewing}
                />
              ))}
            </>
          )}
        </TabsContent>

        {/* Scheduled Content Tab */}
        <TabsContent value="scheduled" className="space-y-3">
          {scheduledContent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No scheduled content</p>
                <p className="text-muted-foreground mt-1">
                  Content that is scheduled to be published
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Scheduled for Publication</AlertTitle>
                <AlertDescription>
                  These items are scheduled to be published at a later date.
                </AlertDescription>
              </Alert>

              {scheduledContent.map(item => (
                <ContentItemCard
                  key={item.id}
                  item={item}
                  variant="scheduled"
                  daysUntilPublish={item.scheduled_publish_at ? getDaysUntilPublish(item.scheduled_publish_at) : undefined}
                  onScheduleCancel={() => handleCancelSchedule(item.id, item.type)}
                  renewing={renewing}
                />
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Premium Upsell */}
      <Card className="border-primary bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tired of Managing Renewals?
          </CardTitle>
          <CardDescription>
            Upgrade to Premium and make all your content permanent by default.
            Never worry about expiration again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/pricing">
              Upgrade to Premium
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Content Item Card Component
function ContentItemCard({
  item,
  daysUntilExpiration,
  daysUntilPublish,
  variant = 'expiring',
  isSelected = false,
  onToggleSelect,
  onRenew,
  onMakePermanent,
  onRecover,
  onScheduleCancel,
  renewing = false
}: {
  item: ContentItem;
  daysUntilExpiration?: number;
  daysUntilPublish?: number;
  variant?: 'expiring' | 'active' | 'expired' | 'scheduled';
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onRenew?: (months: number) => void;
  onMakePermanent?: () => void;
  onRecover?: () => void;
  onScheduleCancel?: () => void;
  renewing?: boolean;
}) {
  const getUrgencyColor = (days?: number) => {
    if (!days) return 'default';
    if (days <= 7) return 'destructive';
    if (days <= 14) return 'warning';
    return 'default';
  };

  return (
    <Card className={isSelected ? 'border-primary' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Checkbox for bulk selection (expiring only) */}
          {variant === 'expiring' && onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1"
            />
          )}

          {/* Content Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <Link 
                  to={`/${item.type}s/${item.id}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {item.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">
                    {item.type}
                  </Badge>
                  
                  {variant === 'expiring' && daysUntilExpiration && (
                    <Badge variant={getUrgencyColor(daysUntilExpiration)}>
                      <Clock className="w-3 h-3 mr-1" />
                      {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''} left
                    </Badge>
                  )}
                  
                  {variant === 'scheduled' && daysUntilPublish && (
                    <Badge variant="default" className="bg-blue-600">
                      <SendHorizonal className="w-3 h-3 mr-1" />
                      Publishing in {daysUntilPublish} day{daysUntilPublish !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  
                  {item.is_permanent && (
                    <Badge variant="secondary">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Permanent
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Engagement Stats */}
            {item.engagement_extends_count > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>{item.engagement_score} engagement</span>
                </div>
                <EngagementIndicator
                  engagementExtendsCount={item.engagement_extends_count}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {variant === 'expiring' && onRenew && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRenew(3)}
                    disabled={renewing}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Renew 3 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRenew(6)}
                    disabled={renewing}
                  >
                    Renew 6 Months
                  </Button>
                  {onMakePermanent && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onMakePermanent}
                      disabled={renewing}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Make Permanent
                    </Button>
                  )}
                </>
              )}

              {variant === 'active' && !item.is_permanent && onRenew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRenew(6)}
                  disabled={renewing}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Extend Now
                </Button>
              )}

              {variant === 'expired' && onRecover && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onRecover}
                  disabled={renewing}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recover & Renew
                </Button>
              )}

              {variant === 'scheduled' && onScheduleCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onScheduleCancel}
                  disabled={renewing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Schedule
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MyContentAdminPage;