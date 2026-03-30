import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
import {
  Bell,
  Search,
  Filter,
  TrendingUp,
  Users,
  Send,
  Trash2,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  link_type?: string;
  link_id?: string;
  actor_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  created_by?: string;
  user?: {
    name: string;
    email: string;
  };
  actor?: {
    name: string;
  };
}

interface NotificationAnalytics {
  total_sent: number;
  total_read: number;
  total_unread: number;
  read_rate: number;
  recent_activity: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
  by_category: Record<string, {
    sent: number;
    read: number;
    unread: number;
    read_rate: number;
  }>;
  by_type: Record<string, {
    count: number;
    read: number;
    read_rate: number;
  }>;
  top_recipients: Array<{
    name: string;
    email: string;
    notification_count: number;
    read_count: number;
    read_rate: number;
  }>;
}

const NOTIFICATION_TYPES = [
  // Social
  { value: 'comment', label: 'Comment', category: 'social' },
  { value: 'comment_reply', label: 'Comment Reply', category: 'social' },
  { value: 'mention', label: 'Mention', category: 'social' },
  { value: 'like', label: 'Like', category: 'social' },
  { value: 'favorite', label: 'Favorite', category: 'social' },
  { value: 'follow', label: 'Follow', category: 'social' },
  { value: 'share', label: 'Share', category: 'social' },
  
  // Events
  { value: 'event', label: 'Event', category: 'events' },
  { value: 'event_created', label: 'Event Created', category: 'events' },
  { value: 'event_cancelled', label: 'Event Cancelled', category: 'events' },
  { value: 'event_rescheduled', label: 'Event Rescheduled', category: 'events' },
  { value: 'session_reminder', label: 'Session Reminder', category: 'events' },
  
  // Programs
  { value: 'application_received', label: 'Application Received', category: 'programs' },
  { value: 'application_approved', label: 'Application Approved', category: 'programs' },
  { value: 'application_rejected', label: 'Application Rejected', category: 'programs' },
  { value: 'membership.invited', label: 'Membership Invited', category: 'programs' },
  { value: 'membership_status_update', label: 'Membership Status Update', category: 'programs' },
  
  // System
  { value: 'system', label: 'System', category: 'system' },
  { value: 'announcement', label: 'Announcement', category: 'system' },
  { value: 'welcome', label: 'Welcome', category: 'system' },
];

export default function AdminNotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  
  // Bulk send
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<'all' | 'class' | 'specific'>('all');
  const [userClass, setUserClass] = useState('member');
  const [notificationType, setNotificationType] = useState('announcement');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationLink, setNotificationLink] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (profile?.role === 'super' || profile?.is_platform_admin) {
      fetchNotifications();
      fetchAnalytics();
    }
  }, [profile, dateRange]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch all notifications with user info (admin view)
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          user:users!user_id(name, email),
          actor:users!actor_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const { data, error } = await supabase.rpc('get_notification_analytics', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) throw error;

      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    try {
      setSending(true);
      
      let result;
      
      if (sendTarget === 'all') {
        const { data, error } = await supabase.rpc('send_notification_to_all_users', {
          p_type: notificationType,
          p_title: notificationTitle,
          p_message: notificationMessage,
          p_link_url: notificationLink || null
        });
        
        if (error) throw error;
        result = data;
      } else if (sendTarget === 'class') {
        const { data, error } = await supabase.rpc('send_notification_to_user_class', {
          p_user_class: userClass,
          p_type: notificationType,
          p_title: notificationTitle,
          p_message: notificationMessage,
          p_link_url: notificationLink || null
        });
        
        if (error) throw error;
        result = data;
      }

      toast.success(`Notification sent to ${result.sent_count} users!`);
      setSendDialogOpen(false);
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationLink('');
      fetchNotifications();
      fetchAnalytics();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleCleanupOld = async () => {
    if (!confirm('Delete all read notifications older than 90 days?')) return;

    try {
      const { data, error } = await supabase.rpc('cleanup_old_notifications', {
        days_old: 90
      });

      if (error) throw error;

      toast.success(`Deleted ${data.deleted_count} old notifications`);
      fetchNotifications();
      fetchAnalytics();
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Failed to cleanup notifications');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'User', 'Email', 'Type', 'Title', 'Message', 'Read', 'Read At'].join(','),
      ...filteredNotifications.map(n => [
        new Date(n.created_at).toISOString(),
        n.user?.name || 'Unknown',
        n.user?.email || '',
        n.type,
        `"${n.title}"`,
        `"${n.message}"`,
        n.is_read ? 'Yes' : 'No',
        n.read_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Exported to CSV');
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Platform admin required.</p>
      </div>
    );
  }

  // Apply filters
  const filteredNotifications = notifications.filter(n => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUser = n.user?.name?.toLowerCase().includes(query) || 
                          n.user?.email?.toLowerCase().includes(query);
      const matchesContent = n.title.toLowerCase().includes(query) || 
                             n.message.toLowerCase().includes(query);
      if (!matchesUser && !matchesContent) return false;
    }
    
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    if (readFilter === 'unread' && n.is_read) return false;
    
    return true;
  });

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Notifications' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl">Notification Management</h1>
          </div>
          <p className="text-gray-600">
            View, analyze, and send platform notifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Platform Notification</DialogTitle>
                <DialogDescription>
                  Send a notification to users on the platform
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Send To</Label>
                  <Select value={sendTarget} onValueChange={(v: any) => setSendTarget(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="class">Specific User Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sendTarget === 'class' && (
                  <div>
                    <Label>User Class</Label>
                    <Select value={userClass} onValueChange={setUserClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Type</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TYPES.filter(t => t.category === 'system').map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Notification title"
                  />
                </div>

                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Link (Optional)</Label>
                  <Input
                    value={notificationLink}
                    onChange={(e) => setNotificationLink(e.target.value)}
                    placeholder="/path/to/content"
                  />
                </div>

                <Button 
                  onClick={handleSendNotification} 
                  disabled={sending}
                  className="w-full"
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="all">
            <Bell className="w-4 h-4 mr-2" />
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          ) : analytics && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Sent</p>
                        <p className="text-2xl font-bold">{analytics.total_sent.toLocaleString()}</p>
                      </div>
                      <Send className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Read</p>
                        <p className="text-2xl font-bold">{analytics.total_read.toLocaleString()}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Unread</p>
                        <p className="text-2xl font-bold">{analytics.total_unread.toLocaleString()}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Read Rate</p>
                        <p className="text-2xl font-bold">{analytics.read_rate}%</p>
                      </div>
                      <Activity className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Last 24 Hours</p>
                      <p className="text-xl font-semibold">{analytics.recent_activity.last_24h}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last 7 Days</p>
                      <p className="text-xl font-semibold">{analytics.recent_activity.last_7d}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last 30 Days</p>
                      <p className="text-xl font-semibold">{analytics.recent_activity.last_30d}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.by_category).map(([category, stats]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{category}</span>
                          <span className="text-sm text-gray-600">
                            {stats.read} / {stats.sent} ({stats.read_rate}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${stats.read_rate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* All Notifications Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search user or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {NOTIFICATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={handleCleanupOld} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No notifications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <Card key={notification.id} className={notification.is_read ? 'bg-white' : 'bg-blue-50'}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                          {notification.is_read ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        
                        <h4 className="font-medium mb-1">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {notification.user?.name || 'Unknown User'}
                          </span>
                          <span>•</span>
                          <span>{notification.user?.email}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.read_at && (
                            <>
                              <span>•</span>
                              <span>Read {formatTimeAgo(notification.read_at)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          ) : analytics && (
            <>
              {/* Top Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Recipients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.top_recipients.map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{recipient.name}</p>
                          <p className="text-sm text-gray-600">{recipient.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{recipient.notification_count} notifications</p>
                          <p className="text-sm text-gray-600">
                            {recipient.read_count} read ({recipient.read_rate}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Notification Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Notification Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.by_type)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .slice(0, 10)
                      .map(([type, stats]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{type}</span>
                              <span className="text-sm text-gray-600">
                                {stats.count} sent ({stats.read_rate}% read)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${stats.read_rate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}