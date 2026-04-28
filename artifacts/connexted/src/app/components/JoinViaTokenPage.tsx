import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface CircleInvite {
  id: string;
  token: string;
  circle_id: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  admin_ids: string[];
  image: string | null;
  access_type: string;
}

type PageState = 'loading' | 'invalid' | 'expired' | 'exhausted' | 'already_member' | 'ready' | 'joined';

export default function JoinViaTokenPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<CircleInvite | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        // Not logged in — redirect to login and come back
        navigate(`/login?next=/join/${token}`, { replace: true });
      } else {
        loadInvite();
      }
    }
  }, [authLoading, profile, token]);

  async function loadInvite() {
    if (!token) {
      setState('invalid');
      return;
    }

    const { data: inviteData, error: inviteError } = await supabase
      .from('circle_invites')
      .select('id, token, circle_id, expires_at, max_uses, use_count')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !inviteData) {
      setState('invalid');
      return;
    }

    // Check expiry
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      setState('expired');
      return;
    }

    // Check max uses
    if (inviteData.max_uses != null && inviteData.use_count >= inviteData.max_uses) {
      setState('exhausted');
      return;
    }

    // Load circle info
    const { data: circleData, error: circleError } = await supabase
      .from('circles')
      .select('id, name, description, member_ids, admin_ids, image, access_type')
      .eq('id', inviteData.circle_id)
      .maybeSingle();

    if (circleError || !circleData) {
      setState('invalid');
      return;
    }

    setInvite(inviteData);
    setCircle(circleData);

    // Already a member?
    if (profile && circleData.member_ids.includes(profile.id)) {
      setState('already_member');
    } else {
      setState('ready');
    }
  }

  async function handleJoin() {
    if (!invite || !circle || !profile) return;
    setJoining(true);

    try {
      // 1. Add to member_ids[]
      const updatedMemberIds = [...circle.member_ids, profile.id];
      const { error: updateError } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (updateError) throw updateError;

      // 2. Container memberships audit trail
      await supabase
        .from('container_memberships')
        .upsert(
          {
            user_id: profile.id,
            container_type: 'circle',
            container_id: circle.id,
            status: 'active',
            applied_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,container_type,container_id', ignoreDuplicates: true }
        );

      // 3. Increment use_count on the invite
      await supabase
        .from('circle_invites')
        .update({ use_count: invite.use_count + 1 })
        .eq('id', invite.id);

      // 4. Funnel tracking (best-effort)
      supabase
        .from('participants')
        .upsert(
          {
            circle_id: circle.id,
            user_id: profile.id,
            current_state: 'enrolled',
            state_changed_at: new Date().toISOString(),
            state_change_reason: 'Joined via invite link',
            state_change_auto: false,
            state_history: [
              {
                from_state: null,
                to_state: 'enrolled',
                changed_at: new Date().toISOString(),
                reason: 'Joined via invite link',
                auto: false,
              },
            ],
            last_activity_at: new Date().toISOString(),
            total_sessions_expected: 0,
            total_sessions_attended: 0,
            attendance_rate: 0,
            consecutive_absences: 0,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'circle_id,user_id', ignoreDuplicates: true }
        )
        .then(() => {});

      setState('joined');
      toast.success(`You've joined ${circle.name}!`);

      setTimeout(() => navigate(`/circles/${circle.id}`), 1500);
    } catch (err) {
      console.error('Error joining circle:', err);
      toast.error('Failed to join. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  if (state === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (state === 'invalid') {
    return <StatusCard icon={<AlertCircle className="w-10 h-10 text-red-400" />} title="Invalid invite link" description="This invite link doesn't exist or has been removed." />;
  }

  if (state === 'expired') {
    return <StatusCard icon={<AlertCircle className="w-10 h-10 text-amber-400" />} title="Invite link expired" description="This invite link is no longer valid. Ask an admin to generate a new one." />;
  }

  if (state === 'exhausted') {
    return <StatusCard icon={<AlertCircle className="w-10 h-10 text-amber-400" />} title="Invite limit reached" description="This invite link has reached its maximum number of uses." />;
  }

  if (state === 'already_member') {
    return (
      <StatusCard
        icon={<CheckCircle className="w-10 h-10 text-green-400" />}
        title={`You're already in ${circle?.name}`}
        description="You're already a member of this group."
      >
        <Button onClick={() => navigate(`/circles/${circle?.id}`)}>
          Go to circle
        </Button>
      </StatusCard>
    );
  }

  if (state === 'joined') {
    return (
      <StatusCard
        icon={<CheckCircle className="w-10 h-10 text-green-400" />}
        title={`Welcome to ${circle?.name}!`}
        description="You've joined successfully. Redirecting…"
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          {circle?.image ? (
            <img
              src={circle.image}
              alt={circle.name}
              className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <CardTitle className="text-xl">{circle?.name}</CardTitle>
          {circle?.description && (
            <CardDescription className="mt-1">{circle.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {circle?.member_ids.length} member{circle?.member_ids.length !== 1 ? 's' : ''}
            </span>
            <Badge variant="outline">{circle?.access_type}</Badge>
          </div>

          <p className="text-center text-sm text-gray-600">
            You've been invited to join this group.
          </p>

          <Button className="w-full" onClick={handleJoin} disabled={joining}>
            {joining ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            Join {circle?.name}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <div className="flex justify-center">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
