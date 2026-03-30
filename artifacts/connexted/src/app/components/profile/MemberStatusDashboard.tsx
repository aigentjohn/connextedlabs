/**
 * MemberStatusDashboard Component
 * 
 * Unified "command center" for members showing:
 * 1. Recent notifications
 * 2. Programs & Circles with action items
 * 3. What they need to do next
 * 
 * Only visible on member's own profile page.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Bell, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Users, 
  Star,
  Info,
  ArrowRight,
  Briefcase,
  Circle as CircleIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { 
  stateToMemberAction, 
  sortMemberActions,
  MemberAction 
} from '@/lib/member-actions';
import { getMemberStateForUser } from '@/lib/participant-states';
import { clearNotificationFlag } from '@/lib/notifications';

interface MemberStatusDashboardProps {
  userId: string;
}

interface ActionItemWithContainer extends MemberAction {
  containerName: string;
  containerType: 'program' | 'circle';
  containerSlug: string;
}

export function MemberStatusDashboard({ userId }: MemberStatusDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemWithContainer[]>([]);

  useEffect(() => {
    fetchMemberData();
    // Clear notification flag when member visits this page
    clearNotificationFlag(userId);
  }, [userId]);

  const fetchMemberData = async () => {
    try {
      // Fetch recent notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setNotifications(notificationsData || []);

      // Fetch member's programs
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name, slug, member_ids, metadata')
        .contains('member_ids', [userId]);

      // Fetch member's circles
      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name, member_ids, metadata')
        .contains('member_ids', [userId]);

      // Generate action items for programs
      const programActions: ActionItemWithContainer[] = [];
      for (const program of programsData || []) {
        const memberState = await getMemberStateForUser(program.id, userId, 'program');
        if (memberState) {
          const action = stateToMemberAction(
            memberState.state,
            'program',
            program.name,
            program.slug
          );
          programActions.push({
            ...action,
            containerName: program.name,
            containerType: 'program',
            containerSlug: program.slug
          });
        }
      }

      // Generate action items for circles
      const circleActions: ActionItemWithContainer[] = [];
      for (const circle of circlesData || []) {
        const memberState = await getMemberStateForUser(circle.id, userId, 'circle');
        if (memberState) {
          const action = stateToMemberAction(
            memberState.state,
            'circle',
            circle.name,
            circle.id // circles use id in URL, not slug
          );
          circleActions.push({
            ...action,
            containerName: circle.name,
            containerType: 'circle',
            containerSlug: circle.id
          });
        }
      }

      // Combine and sort all actions
      const allActions = [...programActions, ...circleActions];
      const sortedActions = sortMemberActions(allActions);
      setActionItems(sortedActions);

    } catch (error) {
      console.error('Error fetching member status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForAction = (icon: MemberAction['icon']) => {
    switch (icon) {
      case 'alert': return AlertCircle;
      case 'clock': return Clock;
      case 'check': return CheckCircle;
      case 'calendar': return Calendar;
      case 'users': return Users;
      case 'star': return Star;
      case 'info': return Info;
      default: return Info;
    }
  };

  const getPriorityColor = (priority: MemberAction['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'normal': return 'border-blue-200 bg-blue-50';
      case 'low': return 'border-gray-200 bg-gray-50';
      case 'info': return 'border-gray-200 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: MemberAction['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'normal': return 'bg-blue-600';
      case 'low': return 'bg-gray-600';
      case 'info': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoryLabel = (category: MemberAction['category']) => {
    switch (category) {
      case 'action_required': return 'Action Required';
      case 'pending': return 'Pending';
      case 'active': return 'Active';
      case 'upcoming': return 'Upcoming';
      case 'completed': return 'Completed';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading your status...</div>
      </div>
    );
  }

  // Group actions by category
  const actionsByCategory = actionItems.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<MemberAction['category'], ActionItemWithContainer[]>);

  const categories: MemberAction['category'][] = [
    'action_required',
    'upcoming',
    'active',
    'pending',
    'completed'
  ];

  return (
    <div className="space-y-6">
      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            Updates and status changes for your programs and circles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No recent notifications</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {notification.link && (
                    <Link to={notification.link}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link to="/notifications">
              <Button variant="outline" size="sm" className="w-full">
                View All Notifications
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* My Programs & Circles */}
      <Card>
        <CardHeader>
          <CardTitle>My Programs & Circles</CardTitle>
          <CardDescription>
            Your participation status and next actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 mb-2">You're not in any programs or circles yet</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link to="/programs">
                  <Button variant="outline" size="sm">
                    Browse Programs
                  </Button>
                </Link>
                <Link to="/circles">
                  <Button variant="outline" size="sm">
                    Browse Circles
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const items = actionsByCategory[category] || [];
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                      {getCategoryLabel(category)}
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, index) => {
                        const Icon = getIconForAction(item.icon);
                        return (
                          <div
                            key={`${item.containerSlug}-${index}`}
                            className={`p-4 border-2 rounded-lg ${getPriorityColor(item.priority)}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${item.priority === 'urgent' ? 'bg-red-100' : 'bg-white'}`}>
                                <Icon className={`w-5 h-5 ${item.priority === 'urgent' ? 'text-red-600' : 'text-gray-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.containerType === 'program' ? (
                                    <Briefcase className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  ) : (
                                    <CircleIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  )}
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {item.title}
                                  </h4>
                                  {item.priority === 'urgent' && (
                                    <Badge className={getPriorityBadgeColor(item.priority)}>
                                      Urgent
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                                {item.actionLabel && item.actionUrl && (
                                  <div className="mt-3">
                                    <Link to={item.actionUrl}>
                                      <Button 
                                        size="sm" 
                                        variant={item.priority === 'urgent' ? 'default' : 'outline'}
                                        className="group"
                                      >
                                        {item.actionLabel}
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                      </Button>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Action Required</p>
                <p className="text-2xl font-bold mt-1">
                  {actionsByCategory.action_required?.length || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold mt-1">
                  {actionsByCategory.active?.length || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold mt-1">
                  {actionItems.length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}