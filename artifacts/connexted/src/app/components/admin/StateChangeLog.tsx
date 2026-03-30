/**
 * StateChangeLog Component
 * 
 * Shows admins a log of state changes they've made and what notifications
 * were sent to members. This helps admins:
 * 1. Track what actions they've taken
 * 2. See exactly what notifications members received
 * 3. Understand the member experience from admin perspective
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Clock, User, Bell, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface StateChangeLogProps {
  programId?: string;
  circleId?: string;
  limit?: number;
}

interface StateChangeEntry {
  id: string;
  participant_id: string;
  from_state: string | null;
  to_state: string;
  changed_at: string;
  changed_by: string;
  reason: string;
  auto: boolean;
  member_name: string;
  member_email: string;
  state_name: string;
  state_color: string;
  notification_sent?: {
    title: string;
    message: string;
    link?: string;
  };
}

export function StateChangeLog({ programId, circleId, limit = 10 }: StateChangeLogProps) {
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<StateChangeEntry[]>([]);

  useEffect(() => {
    fetchStateChanges();
  }, [programId, circleId]);

  const fetchStateChanges = async () => {
    try {
      // Build query to get participants with their state history
      let query = supabase
        .from('participants')
        .select(`
          id,
          current_state,
          state_history,
          user:users!participants_user_id_fkey(id, name, email)
        `);

      if (programId) {
        query = query.eq('program_id', programId);
      } else if (circleId) {
        query = query.eq('circle_id', circleId);
      }

      const { data: participants, error } = await query;

      if (error) throw error;

      // Flatten state history and get notifications
      const allChanges: StateChangeEntry[] = [];
      
      for (const participant of participants || []) {
        const history = participant.state_history as any[] || [];
        
        for (const entry of history) {
          // Only include manual changes (not auto)
          if (!entry.auto) {
            // Try to fetch the notification that was sent
            const { data: notification } = await supabase
              .from('notifications')
              .select('title, message, link')
              .eq('user_id', participant.user.id)
              .eq('type', 'state_change')
              .gte('created_at', new Date(new Date(entry.changed_at).getTime() - 1000).toISOString())
              .lte('created_at', new Date(new Date(entry.changed_at).getTime() + 1000).toISOString())
              .maybeSingle();

            allChanges.push({
              id: `${participant.id}-${entry.changed_at}`,
              participant_id: participant.id,
              from_state: entry.from_state,
              to_state: entry.to_state,
              changed_at: entry.changed_at,
              changed_by: entry.changed_by,
              reason: entry.reason,
              auto: entry.auto,
              member_name: participant.user.name,
              member_email: participant.user.email,
              state_name: participant.current_state?.name || entry.to_state,
              state_color: participant.current_state?.color || '#6B7280',
              notification_sent: notification ? {
                title: notification.title,
                message: notification.message,
                link: notification.link
              } : undefined
            });
          }
        }
      }

      // Sort by date descending
      allChanges.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

      // Limit results
      setChanges(allChanges.slice(0, limit));
    } catch (error) {
      console.error('Error fetching state changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-indigo-600" />
            State Changes & Notifications
          </CardTitle>
          <CardDescription>
            Track state changes and notifications sent to members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-600">
            Loading recent changes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-600" />
          State Changes & Notifications
        </CardTitle>
        <CardDescription>
          Recent state changes and what notifications members received
        </CardDescription>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="text-center py-8">
            <Info className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No state changes recorded yet</p>
            <p className="text-sm text-gray-500 mt-2">
              When you change member states, they'll appear here along with the notifications sent
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <div
                key={change.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Change Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">
                      {change.member_name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge 
                      style={{ 
                        backgroundColor: change.state_color,
                        color: 'white'
                      }}
                    >
                      {change.state_name}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(change.changed_at)}
                  </span>
                </div>

                {/* Change Details */}
                {change.from_state && (
                  <p className="text-sm text-gray-600 mb-2">
                    Changed from <span className="font-medium">{change.from_state}</span> to{' '}
                    <span className="font-medium">{change.to_state}</span>
                  </p>
                )}

                {change.reason && (
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Reason:</span> {change.reason}
                  </p>
                )}

                {/* Notification Sent */}
                {change.notification_sent && (
                  <div className="mt-3 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                    <div className="flex items-start gap-2 mb-2">
                      <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Notification sent to member:
                        </p>
                        <p className="text-sm font-semibold text-blue-900 mt-1">
                          "{change.notification_sent.title}"
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {change.notification_sent.message}
                        </p>
                        {change.notification_sent.link && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-medium">Action link:</span>{' '}
                            {change.notification_sent.link}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Notification Info */}
                {!change.notification_sent && (
                  <div className="mt-3 pl-4 border-l-2 border-gray-200 bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">
                      <Info className="w-3 h-3 inline mr-1" />
                      No notification was sent for this change
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {changes.length > 0 && changes.length >= limit && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing {limit} most recent changes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}