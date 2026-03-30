/**
 * MEMBERSHIP STATUS CARD
 * 
 * Shows on user's home page - displays their current status in programs/circles
 * Updates passively when admin changes state (no emails/messages)
 * Links to next actions (e.g., complete payment, view program)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { MemberState, MEMBER_STATES, Participant } from '@/lib/funnel-system';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import * as Icons from 'lucide-react';

interface MembershipStatusCardProps {
  limit?: number; // Max number of statuses to show
}

export function MembershipStatusCard({ limit = 5 }: MembershipStatusCardProps) {
  const { user } = useAuth();
  const [participations, setParticipations] = useState<Array<Participant & {
    program?: { id: string; name: string; slug: string };
    circle?: { id: string; name: string; slug: string };
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMembershipStatuses();
    }
  }, [user]);

  async function loadMembershipStatuses() {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all participations for this user
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          program:programs (
            id,
            name,
            slug
          ),
          circle:circles (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id)
        .not('current_state', 'in', '(completed,not_completed)') // Hide finished ones
        .order('state_changed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setParticipations(data || []);
    } catch (error) {
      console.error('Error loading membership statuses:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">Loading your memberships...</div>
      </Card>
    );
  }

  if (participations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">You're not enrolled in any programs or circles yet.</p>
          <Link to="/programs">
            <Button>Browse Programs</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Your Memberships</h2>
      
      <div className="space-y-4">
        {participations.map((participation) => {
          const entity = participation.program || participation.circle;
          const entityType = participation.program ? 'program' : 'circle';
          const stateInfo = MEMBER_STATES[participation.current_state as MemberState];
          const Icon = Icons[stateInfo.icon as keyof typeof Icons] as any;

          return (
            <div
              key={participation.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{entity?.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {entityType}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium" style={{ color: `var(--${stateInfo.color}-600)` }}>
                      {stateInfo.label}
                    </span>
                  </div>

                  {/* State-specific messages */}
                  <StatusMessage participation={participation} />
                </div>

                {/* Action button */}
                <StatusAction participation={participation} entity={entity} entityType={entityType} />
              </div>

              {/* Additional info based on state */}
              {participation.current_state === 'enrolled' && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Attendance</div>
                    <div className="font-medium">
                      {participation.sessions_attended}/{participation.sessions_expected}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rate</div>
                    <div className={`font-medium ${
                      participation.attendance_rate >= 80 ? 'text-green-600' :
                      participation.attendance_rate >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(participation.attendance_rate)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Last Active</div>
                    <div className="font-medium">
                      {participation.last_activity_at
                        ? `${Math.floor((Date.now() - new Date(participation.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))}d ago`
                        : 'Never'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {participations.length >= limit && (
        <div className="mt-4 text-center">
          <Link to="/my-programs" className="text-sm text-blue-600 hover:underline">
            View all memberships →
          </Link>
        </div>
      )}
    </Card>
  );
}

// Helper component for status messages
function StatusMessage({ participation }: { participation: Participant }) {
  const state = participation.current_state as MemberState;

  const messages: Record<MemberState, string> = {
    invited: 'You have been invited! Check your email for details.',
    applied: 'Your application is under review. We\'ll notify you when there\'s an update.',
    approved: 'Congratulations! Your application was approved.',
    enrolled: 'You\'re an active member. Keep up the great work!',
    completed: 'You\'ve completed this program!',
    not_completed: 'Your participation has ended.',
  };

  return (
    <p className="text-sm text-gray-600">
      {messages[state]}
    </p>
  );
}

// Helper component for action buttons
function StatusAction({
  participation,
  entity,
  entityType,
}: {
  participation: Participant;
  entity: any;
  entityType: 'program' | 'circle';
}) {
  const state = participation.current_state as MemberState;

  // State-specific actions
  if (state === 'invited') {
    return (
      <Link to={`/${entityType}s/${entity?.slug}`}>
        <Button size="sm">View Invitation</Button>
      </Link>
    );
  }

  if (state === 'approved' && participation.payment_status === 'pending') {
    return (
      <Link to={`/${entityType}s/${entity?.slug}/payment`}>
        <Button size="sm">Complete Payment</Button>
      </Link>
    );
  }

  if (state === 'approved' && participation.payment_status === 'paid') {
    return (
      <div className="text-sm text-green-600 font-medium">
        ✓ Payment received
      </div>
    );
  }

  if (state === 'enrolled') {
    return (
      <Link to={`/${entityType}s/${entity?.slug}`}>
        <Button size="sm" variant="outline">
          View {entityType === 'program' ? 'Program' : 'Circle'}
        </Button>
      </Link>
    );
  }

  return null;
}
