import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock, Check, X, Mail, UserCheck, Send,
  ChevronRight, Users, Loader2, Inbox
} from 'lucide-react';

interface MembershipRecord {
  id: string;
  user_id: string;
  container_type: string;
  container_id: string;
  status: 'pending' | 'active' | 'rejected' | 'invited' | 'accepted' | 'expired';
  applied_at?: string;
  request_message?: string;
  created_at: string;
  updated_at: string;
}

interface EnrichedRecord extends MembershipRecord {
  container_name: string;
  container_image?: string;
}

interface MyApplicationsWidgetProps {
  userId: string;
}

export default function MyApplicationsWidget({ userId }: MyApplicationsWidgetProps) {
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRecords();
    }
  }, [userId]);

  async function fetchRecords() {
    try {
      setLoading(true);

      // Fetch all membership records for this user (applications + invitations)
      const { data, error } = await supabase
        .from('container_memberships')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'invited', 'rejected', 'accepted', 'expired'])
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching membership records:', error);
        setRecords([]);
        return;
      }

      if (!data || data.length === 0) {
        setRecords([]);
        return;
      }

      // Enrich with container names
      const enriched = await enrichRecords(data);
      setRecords(enriched);
    } catch (error) {
      console.error('Error in fetchRecords:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function enrichRecords(rawRecords: MembershipRecord[]): Promise<EnrichedRecord[]> {
    // Group by container type for batch fetching
    const circleIds = rawRecords
      .filter((r) => r.container_type === 'circle')
      .map((r) => r.container_id);
    const programIds = rawRecords
      .filter((r) => r.container_type === 'program')
      .map((r) => r.container_id);

    const [circlesResult, programsResult] = await Promise.all([
      circleIds.length > 0
        ? supabase.from('circles').select('id, name, image').in('id', circleIds)
        : { data: [] },
      programIds.length > 0
        ? supabase.from('market_programs').select('id, name, image').in('id', programIds)
        : { data: [] },
    ]);

    const circleMap = new Map(
      (circlesResult.data || []).map((c: any) => [c.id, { name: c.name, image: c.image }])
    );
    const programMap = new Map(
      (programsResult.data || []).map((p: any) => [p.id, { name: p.name, image: p.image }])
    );

    return rawRecords.map((record) => {
      let container: { name: string; image?: string } | undefined;

      if (record.container_type === 'circle') {
        container = circleMap.get(record.container_id);
      } else if (record.container_type === 'program') {
        container = programMap.get(record.container_id);
      }

      return {
        ...record,
        container_name: container?.name || 'Unknown',
        container_image: container?.image,
      };
    });
  }

  async function handleAcceptInvitation(record: EnrichedRecord) {
    try {
      // 1. Update container_memberships status
      const { error: membershipError } = await supabase
        .from('container_memberships')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (membershipError) throw membershipError;

      // 2. Add to member_ids[] for the container
      if (record.container_type === 'circle') {
        const { data: circle, error: fetchError } = await supabase
          .from('circles')
          .select('member_ids')
          .eq('id', record.container_id)
          .single();

        if (fetchError) throw fetchError;

        if (circle && !circle.member_ids.includes(userId)) {
          const updatedMemberIds = [...circle.member_ids, userId];
          const { error: updateError } = await supabase
            .from('circles')
            .update({ member_ids: updatedMemberIds })
            .eq('id', record.container_id);

          if (updateError) throw updateError;
        }

        // 3. Upsert into participants table
        await supabase.from('participants').upsert(
          {
            circle_id: record.container_id,
            user_id: userId,
            current_state: 'enrolled',
            state_changed_at: new Date().toISOString(),
            state_change_reason: 'Invitation accepted',
            state_change_auto: false,
            state_history: [
              {
                from_state: 'invited',
                to_state: 'enrolled',
                changed_at: new Date().toISOString(),
                reason: 'Invitation accepted by user',
                auto: false,
              },
            ],
            last_activity_at: new Date().toISOString(),
            total_sessions_expected: 0,
            total_sessions_attended: 0,
            attendance_rate: 0,
            consecutive_absences: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'circle_id,user_id', ignoreDuplicates: false }
        );
      }

      // Refresh
      fetchRecords();
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  }

  async function handleDeclineInvitation(record: EnrichedRecord) {
    try {
      const { error } = await supabase
        .from('container_memberships')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;
      fetchRecords();
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  }

  // Split into actionable and history
  const actionable = records.filter(
    (r) => r.status === 'pending' || r.status === 'invited'
  );
  const history = records.filter(
    (r) => r.status !== 'pending' && r.status !== 'invited'
  );

  // Don't render if nothing to show
  if (!loading && records.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-indigo-600" />
          My Applications & Invitations
        </CardTitle>
        <CardDescription>
          Track the status of your group applications and invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Actionable items */}
            {actionable.length > 0 && (
              <div className="space-y-2">
                {actionable.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ContainerIcon type={record.container_type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {record.container_name}
                          </p>
                          <StatusBadge status={record.status} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {record.status === 'pending'
                            ? `Applied ${formatDistanceToNow(
                                new Date(record.applied_at || record.created_at),
                                { addSuffix: true }
                              )}`
                            : `Invited ${formatDistanceToNow(
                                new Date(record.created_at),
                                { addSuffix: true }
                              )}`}
                          {' · '}
                          <span className="capitalize">{record.container_type}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {record.status === 'invited' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptInvitation(record)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDeclineInvitation(record)}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {record.status === 'pending' && (
                        <Link to={getContainerLink(record)}>
                          <Button size="sm" variant="outline">
                            View
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-1">
                {actionable.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1">
                    History
                  </p>
                )}
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ContainerIcon type={record.container_type} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm truncate">
                            {record.container_name}
                          </p>
                          <StatusBadge status={record.status} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(record.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// HELPERS
// =====================================================

function ContainerIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const bgColor =
    type === 'circle'
      ? 'bg-blue-100 text-blue-600'
      : type === 'program'
      ? 'bg-indigo-100 text-indigo-600'
      : 'bg-gray-100 text-gray-600';

  return (
    <div className={`${sizeClass} rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Users className={iconSize} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case 'active':
    case 'accepted':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          <Check className="w-3 h-3 mr-1" />
          {status === 'active' ? 'Approved' : 'Accepted'}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          <X className="w-3 h-3 mr-1" />
          Not Accepted
        </Badge>
      );
    case 'invited':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          <Mail className="w-3 h-3 mr-1" />
          Invited
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-xs">
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getContainerLink(record: MembershipRecord): string {
  switch (record.container_type) {
    case 'circle':
      return `/circles/${record.container_id}/landing`;
    case 'program':
      return `/programs/${record.container_id}`;
    default:
      return '/home';
  }
}
