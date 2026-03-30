import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Check, X, User, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface PendingRequest {
  id: string;
  user_id: string;
  container_type: string;
  container_id: string;
  status: string;
  requested_at: string;
  request_message?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface Props {
  containerType: string;
  containerId: string;
  containerName: string;
  onRequestProcessed?: () => void;
}

export function PendingRequestsQueue({
  containerType,
  containerId,
  containerName,
  onRequestProcessed,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingRequests();
  }, [containerType, containerId]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('container_memberships')
        .select(`
          *,
          user:users!container_memberships_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            bio
          )
        `)
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (fetchError) throw fetchError;

      setRequests(data || []);
    } catch (err: any) {
      console.error('Error loading pending requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PendingRequest) => {
    try {
      setProcessing(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update membership status to 'active'
      const { error: updateError } = await supabase
        .from('container_memberships')
        .update({
          status: 'active',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Create notification for the user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        type: 'membership.approved',
        title: `Welcome to ${containerName}!`,
        message: `Your request to join has been approved.`,
        link: `/${containerType}s/${containerId}`,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });

      // Reload requests
      await loadPendingRequests();

      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete the membership request
      const { error: deleteError } = await supabase
        .from('container_memberships')
        .delete()
        .eq('id', selectedRequest.id);

      if (deleteError) throw deleteError;

      // Create notification for the user (optional)
      if (rejectionReason) {
        await supabase.from('notifications').insert({
          user_id: selectedRequest.user_id,
          type: 'membership.rejected',
          title: `Request to join ${containerName} was declined`,
          message: rejectionReason,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });
      }

      // Close dialog and reload
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await loadPendingRequests();

      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">Loading pending requests...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No pending requests</p>
            <p className="text-sm">New join requests will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Join Requests ({requests.length})</CardTitle>
          <CardDescription>
            Review and approve members who want to join {containerName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {requests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-4 space-y-3 hover:border-gray-400 transition-colors"
            >
              {/* User Info */}
              <div className="flex items-start gap-3">
                {request.user?.avatar_url ? (
                  <img
                    src={request.user.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">
                    {request.user?.full_name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-600">{request.user?.email}</p>
                  {request.user?.bio && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {request.user.bio}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(request.requested_at).toLocaleDateString()}
                </div>
              </div>

              {/* Request Message */}
              {request.request_message && (
                <div className="bg-gray-50 p-3 rounded-md border">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="w-4 h-4" />
                    Message:
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {request.request_message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(request)}
                  disabled={processing}
                  size="sm"
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => openRejectDialog(request)}
                  disabled={processing}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/users/${request.user_id}`, '_blank')}
                >
                  View Profile
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedRequest?.user?.full_name}'s request to join?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason (optional)
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="This will be sent to the user..."
                rows={3}
              />
              <p className="text-xs text-gray-500">
                If provided, the user will receive a notification with this message.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}