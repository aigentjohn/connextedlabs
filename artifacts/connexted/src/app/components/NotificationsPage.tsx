import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Switch } from '@/app/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2,
  Users,
  MessageSquare,
  Calendar,
  UserPlus,
  Mail,
  Heart,
  Share2,
  Sparkles,
  ExternalLink,
  Settings,
  Filter,
  Target,
  Layers,
  Zap,
  GraduationCap,
  Ticket,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { formatDistanceToNow } from 'date-fns';

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
  created_at: string;
  read_at?: string;
  category?: string; // Derived from type
  actor?: {
    name: string;
    avatar?: string;
  };
}

interface NotificationPreference {
  id?: string;
  user_id: string;
  category: 'social' | 'events' | 'circles' | 'programs' | 'system';
  enabled: boolean;
}

// Category mapping for notification types
const NOTIFICATION_CATEGORIES: Record<string, string> = {
  // Social
  'comment': 'social',
  'comment_reply': 'social',
  'mention': 'social',
  'like': 'social',
  'favorite': 'social',
  'follow': 'social',
  'share': 'social',
  
  // Events
  'event': 'events',
  'event_created': 'events',
  'event_cancelled': 'events',
  'event_rescheduled': 'events',
  'session_reminder': 'events',
  'session_attendance': 'events',
  'rsvp': 'events',
  'rsvp_confirmation': 'events',
  
  // Circles (group-level)
  'circle.member_joined': 'circles',
  'circle.member_left': 'circles',
  'circle.role_changed': 'circles',
  'circle.invitation': 'circles',
  'circle_invite': 'circles',
  'join_request': 'circles',
  'container.state_changed': 'circles',
  
  // Programs (structured programs, applications, enrollment)
  'application_received': 'programs',
  'application_approved': 'programs',
  'application_rejected': 'programs',
  'application_waitlisted': 'programs',
  'application_submitted': 'programs',
  'enrollment_complete': 'programs',
  'program.member_joined': 'programs',
  'program.member_left': 'programs',
  'program.role_changed': 'programs',
  'membership.invited': 'programs',
  'membership_status_update': 'programs',
  'invitation_received': 'programs',
  'payment_update': 'programs',
  'engagement_at_risk': 'programs',
  // Ticket system
  'ticket_assigned': 'programs',
  'waitlist_joined': 'programs',
  'waitlist_fulfilled': 'programs',
  'purchase_confirmed': 'programs',
  'course_enrolled': 'programs',
  
  // System
  'system': 'system',
  'welcome': 'system',
  'announcement': 'system',
  'content_flagged': 'system',
  'content_approved': 'system',
  'content_rejected': 'system',
};

type FilterTab = 'all' | 'unread' | 'social' | 'events' | 'circles' | 'programs' | 'system';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Fetch notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Add category to each notification
      const notificationsWithCategories = (data || []).map(notif => ({
        ...notif,
        category: NOTIFICATION_CATEGORIES[notif.type] || 'system'
      }));

      setNotifications(notificationsWithCategories);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    if (!profile?.id) return;

    try {
      // Fetch user notification preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', profile.id);

      if (error) {
        // Table doesn't exist yet - that's OK, preferences are optional
        if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          console.log('User notification preferences table not yet available');
          setPreferences([]);
          return;
        }
        console.error('Error fetching preferences:', error);
      }

      setPreferences(data || []);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setPreferences([]);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .rpc('mark_notification_read', { p_notification_id: notificationId });

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString()
      })));

      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to the link if available (support both link_url and action_url column names)
    const target = notification.link_url || (notification as any).action_url;
    if (target) {
      navigate(target);
    }
  };

  const handleTogglePreference = async (category: 'social' | 'events' | 'circles' | 'programs' | 'system') => {
    if (!profile?.id) return;

    try {
      // Find existing preference
      const existing = preferences.find(p => p.category === category);
      
      if (existing) {
        // Update existing
        const updated = { ...existing, enabled: !existing.enabled };
        
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({ enabled: updated.enabled })
          .eq('id', existing.id);

        if (error) throw error;

        setPreferences(preferences.map(p => 
          p.category === category ? updated : p
        ));
      } else {
        // Create new
        const newPref = {
          user_id: profile.id,
          category: category,
          enabled: true,
        };

        const { data, error } = await supabase
          .from('user_notification_preferences')
          .insert([newPref])
          .select()
          .single();

        if (error) throw error;

        setPreferences([...preferences, data]);
      }

      toast.success('Preference updated');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post':
      case 'comment':
      case 'comment_reply':
        return MessageSquare;
      case 'mention':
        return Mail;
      case 'event':
      case 'event_created':
      case 'event_cancelled':
      case 'event_rescheduled':
      case 'session_reminder':
      case 'session_attendance':
      case 'rsvp':
      case 'rsvp_confirmation':
        return Calendar;
      case 'join_request':
      case 'circle_invite':
      case 'follow':
        return UserPlus;
      case 'like':
      case 'favorite':
        return Heart;
      case 'share':
        return Share2;
      case 'circle.member_joined':
      case 'circle.member_left':
      case 'circle.role_changed':
      case 'circle.invitation':
        return Users;
      case 'ticket_assigned':
      case 'waitlist_fulfilled':
      case 'purchase_confirmed':
      case 'course_enrolled':
        return Ticket;
      case 'waitlist_joined':
        return Clock;
      default:
        return Bell;
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading notifications...</p>
      </div>
    );
  }

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    return n.category === activeTab;
  });

  // Count by category
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const socialCount = notifications.filter(n => n.category === 'social' && !n.is_read).length;
  const eventsCount = notifications.filter(n => n.category === 'events' && !n.is_read).length;
  const circlesCount = notifications.filter(n => n.category === 'circles' && !n.is_read).length;
  const programsCount = notifications.filter(n => n.category === 'programs' && !n.is_read).length;
  const systemCount = notifications.filter(n => n.category === 'system' && !n.is_read).length;

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const tabs: Array<{
    id: FilterTab;
    label: string;
    icon: any;
    count: number;
    color?: string;
  }> = [
    { id: 'all', label: 'All', icon: Layers, count: notifications.length },
    { id: 'unread', label: 'Unread', icon: Bell, count: unreadCount, color: 'text-red-600' },
    { id: 'social', label: 'Social', icon: Heart, count: socialCount },
    { id: 'events', label: 'Events', icon: Calendar, count: eventsCount },
    { id: 'circles', label: 'Circles', icon: Target, count: circlesCount },
    { id: 'programs', label: 'Programs', icon: GraduationCap, count: programsCount },
    { id: 'system', label: 'System', icon: Zap, count: systemCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Notifications' }]}
        icon={Bell}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        title="Notifications"
        badge={
          unreadCount > 0 ? (
            <Badge variant="default" className="bg-red-600">
              {unreadCount} unread
            </Badge>
          ) : undefined
        }
        description="Stay updated with your activity and mentions"
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            )}
            
            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                  <DialogDescription>
                    Choose which notifications you want to receive
                  </DialogDescription>
                </DialogHeader>
                
                <NotificationPreferencesContent
                  preferences={preferences}
                  onToggle={handleTogglePreference}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Tabbed Filter */}
      <Card>
        <CardContent className="p-0">
          <div className="flex gap-1 border-b overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color || ''}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge 
                      variant={isActive ? 'default' : 'secondary'} 
                      className={`${isActive ? 'bg-indigo-600' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gray-100 rounded-full p-6">
              <Bell className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {activeTab === 'unread' ? 'No Unread Notifications' : `No ${tabs.find(t => t.id === activeTab)?.label} Notifications`}
              </h3>
              <p className="text-gray-600">
                {activeTab === 'unread' 
                  ? "You're all caught up! Check back later for new updates."
                  : `When you get ${activeTab === 'all' ? '' : activeTab + ' '}notifications, they'll appear here.`}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const isUnread = !notification.is_read;

            return (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  isUnread ? 'bg-indigo-50/50 border-indigo-200' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isUnread ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isUnread ? 'text-indigo-600' : 'text-gray-600'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${
                              isUnread ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className="text-xs capitalize">
                              {notification.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{formatTimeAgo(notification.created_at)}</span>
                            {(notification.link_url || (notification as any).action_url) && (
                              <span className="flex items-center gap-1 text-indigo-600">
                                <ExternalLink className="w-3 h-3" />
                                Click to view
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNotification(notification.id)}
                            title="Delete notification"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Load More (future enhancement) */}
      {filteredNotifications.length >= 100 && (
        <div className="text-center py-4">
          <Button variant="outline">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

// Notification Preferences Component
interface NotificationPreferencesContentProps {
  preferences: NotificationPreference[];
  onToggle: (category: 'social' | 'events' | 'circles' | 'programs' | 'system') => void;
}

function NotificationPreferencesContent({ preferences, onToggle }: NotificationPreferencesContentProps) {
  const categories = [
    { 
      id: 'social' as const,
      name: 'Social',
      description: 'Comments, mentions, likes, follows, and shares',
      icon: Heart,
      examples: ['Comments on your posts', 'When someone mentions you', 'New followers', 'Likes on your content']
    },
    { 
      id: 'events' as const,
      name: 'Events & Sessions',
      description: 'Event updates, session reminders, and RSVPs',
      icon: Calendar,
      examples: ['New events in your circles', 'Session reminders', 'Event cancellations', 'RSVP confirmations']
    },
    { 
      id: 'circles' as const,
      name: 'Circles',
      description: 'Circle memberships, invitations, and group activity',
      icon: Target,
      examples: ['New members joined', 'Circle invitations', 'Role changes', 'Join requests']
    },
    { 
      id: 'programs' as const,
      name: 'Programs',
      description: 'Program applications, enrollment, and structured cohort activity',
      icon: GraduationCap,
      examples: ['Application approved/rejected', 'Enrollment complete', 'Payment updates', 'Engagement reminders']
    },
    { 
      id: 'system' as const,
      name: 'System',
      description: 'Platform announcements and important updates',
      icon: Zap,
      examples: ['Platform announcements', 'Welcome messages', 'Content moderation updates']
    },
  ];

  const getPreference = (category: 'social' | 'events' | 'circles' | 'programs' | 'system'): boolean => {
    const pref = preferences.find(p => p.category === category);
    return pref?.enabled ?? true; // Default to enabled if not set
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>How it works:</strong> Toggle each category to control all notifications within that group. 
          Categories are enabled by default.
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const enabled = getPreference(category.id);

          return (
            <Card key={category.id} className={!enabled ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {category.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {category.description}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => onToggle(category.id)}
                      />
                    </div>
                    
                    {enabled && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 font-medium mb-2">Includes:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {category.examples.map((example, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}