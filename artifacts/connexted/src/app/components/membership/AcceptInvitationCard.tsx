import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Calendar, User, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface Invitation {
  id: string;
  container_type: string;
  container_id: string;
  invited_by: string;
  invited_at: string;
  invite_message?: string;
  invite_expires_at: string;
  cohort?: string;
  inviter?: {
    full_name: string;
    avatar_url?: string;
  };
  container?: {
    name: string;
    slug: string;
    description?: string;
  };
}

interface Props {
  invitation: Invitation;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function AcceptInvitationCard({ invitation, onAccept, onDecline }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysUntilExpiry = Math.ceil(
    (new Date(invitation.invite_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isExpired = daysUntilExpiry < 0;

  const handleAccept = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update membership status to 'pending' (awaiting admin approval)
      // Or 'active' if auto-approve is enabled
      const { error: updateError } = await supabase
        .from('container_memberships')
        .update({
          status: 'pending', // Admin will still need to approve
          requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: invitation.invited_by,
        type: 'admin.invite_accepted',
        title: `${user.user_metadata.full_name || 'A user'} accepted your invitation`,
        message: `They accepted the invitation to ${invitation.container?.name}`,
        link: `/${invitation.container_type}s/${invitation.container_id}/members`,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });

      if (onAccept) {
        onAccept();
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setLoading(true);
      setError(null);

      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('container_memberships')
        .delete()
        .eq('id', invitation.id);

      if (deleteError) throw deleteError;

      if (onDecline) {
        onDecline();
      }
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={isExpired ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              🎉 You've Been Invited!
            </CardTitle>
            <CardDescription>
              {invitation.inviter?.full_name} invited you to join
            </CardDescription>
          </div>
          {isExpired && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              Expired
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Container Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-lg mb-1">
            {invitation.container?.name || 'Untitled Container'}
          </h3>
          {invitation.container?.description && (
            <p className="text-sm text-gray-600 mb-2">
              {invitation.container.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="capitalize">{invitation.container_type}</span>
            {invitation.cohort && (
              <>
                <span>•</span>
                <span>{invitation.cohort}</span>
              </>
            )}
          </div>
        </div>

        {/* Invitation Message */}
        {invitation.invite_message && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-gray-700 mb-1">Message from {invitation.inviter?.full_name}:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {invitation.invite_message}
            </p>
          </div>
        )}

        {/* Inviter Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {invitation.inviter?.avatar_url ? (
            <img
              src={invitation.inviter.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-medium">{invitation.inviter?.full_name}</p>
            <p className="text-sm text-gray-500">
              Invited {new Date(invitation.invited_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Expiration Warning */}
        {!isExpired && daysUntilExpiry <= 3 && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              This invitation expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        )}

        {isExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invitation expired on {new Date(invitation.invite_expires_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        {!isExpired ? (
          <>
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Accept Invitation'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={loading}
            >
              Decline
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={handleDecline} className="w-full">
            Remove
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}