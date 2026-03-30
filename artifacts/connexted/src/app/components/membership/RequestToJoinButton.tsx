import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface Props {
  containerType: string;
  containerId: string;
  containerName: string;
  onSuccess?: () => void;
  buttonText?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function RequestToJoinButton({
  containerType,
  containerId,
  containerName,
  onSuccess,
  buttonText = 'Request to Join',
  variant = 'default',
  size = 'default',
}: Props) {
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user already has a membership record
      const { data: existing } = await supabase
        .from('container_memberships')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          throw new Error('You already have a pending request to join this container');
        } else if (existing.status === 'active') {
          throw new Error('You are already a member of this container');
        }
      }

      // Create join request
      const { error: insertError } = await supabase
        .from('container_memberships')
        .insert({
          user_id: user.id,
          container_type: containerType,
          container_id: containerId,
          status: 'pending',
          requested_at: new Date().toISOString(),
          request_message: requestMessage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Get container admins to notify
      const { data: admins } = await supabase
        .from('container_admins')
        .select('user_id')
        .eq('container_type', containerType)
        .eq('container_id', containerId);

      // Create notifications for admins
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.user_id,
          type: 'admin.join_request',
          title: 'New join request',
          message: `${user.user_metadata.full_name || 'A user'} wants to join ${containerName}`,
          link: `/${containerType}s/${containerId}/members?tab=pending`,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setDialogOpen(false);
      setRequestMessage('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error submitting join request:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant={variant}
        size={size}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join {containerName}</DialogTitle>
            <DialogDescription>
              Your request will be reviewed by the administrators. You'll receive a notification when it's approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Why do you want to join? (optional)
              </label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Tell the admins why you'd like to join this community..."
                rows={4}
              />
              <p className="text-xs text-gray-500">
                This message will be sent to the administrators along with your request.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}