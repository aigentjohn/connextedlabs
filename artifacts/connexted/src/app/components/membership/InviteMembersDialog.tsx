import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { X, UserPlus, Search, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerType: string;
  containerId: string;
  containerName: string;
  onSuccess?: () => void;
}

export function InviteMembersDialog({
  open,
  onOpenChange,
  containerType,
  containerId,
  containerName,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [cohort, setCohort] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already members
      const { data: existingMembers } = await supabase
        .from('container_memberships')
        .select('user_id')
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .in('status', ['invited', 'pending', 'active']);

      const existingMemberIds = new Set(existingMembers?.map(m => m.user_id) || []);
      const filteredData = data?.filter(user => !existingMemberIds.has(user.id)) || [];

      setSearchResults(filteredData);
    } catch (err: any) {
      console.error('Error searching users:', err);
    }
  };

  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to invite');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Create invitations
      const invitations = selectedUsers.map(selectedUser => ({
        user_id: selectedUser.id,
        container_type: containerType,
        container_id: containerId,
        status: 'invited',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        invite_message: inviteMessage || null,
        invite_expires_at: expiresAt.toISOString(),
        cohort: cohort || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: inviteError } = await supabase
        .from('container_memberships')
        .insert(invitations);

      if (inviteError) throw inviteError;

      // Create notifications
      const notifications = selectedUsers.map(selectedUser => ({
        user_id: selectedUser.id,
        type: 'membership.invited',
        title: `You've been invited to ${containerName}`,
        message: inviteMessage || `You've been invited to join ${containerName}`,
        link: `/${containerType}s/${containerId}/accept-invite`,
        created_by: user.id,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('notifications').insert(notifications);

      if (onSuccess) {
        onSuccess();
      }

      onOpenChange(false);
      
      // Reset form
      setSelectedUsers([]);
      setInviteMessage('');
      setCohort('');
      setExpiresInDays(14);
    } catch (err: any) {
      console.error('Error sending invitations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Members to {containerName}</DialogTitle>
          <DialogDescription>
            Search for users and send them invitations to join this {containerType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Search */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addUser(user)}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 text-left"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name}</div>
                      <div className="text-sm text-gray-500 truncate">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Users ({selectedUsers.length})</Label>
              <div className="border rounded-md p-3 space-y-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-md"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name}</div>
                      <div className="text-sm text-gray-500 truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invitation Message */}
          <div className="space-y-2">
            <Label>Invitation Message (optional)</Label>
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Welcome to our community! We're excited to have you join..."
              rows={4}
            />
          </div>

          {/* Cohort Assignment */}
          <div className="space-y-2">
            <Label>Cohort (optional)</Label>
            <Input
              type="text"
              placeholder="e.g., Fall 2025, Cohort 12"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Group invitees into a cohort for easier management
            </p>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Invitation Expires In
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 14)}
                className="w-24"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
            <p className="text-xs text-gray-500">
              Invitations will expire on {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading || selectedUsers.length === 0}>
            <UserPlus className="w-4 h-4 mr-2" />
            {loading ? 'Sending...' : `Send ${selectedUsers.length} Invitation${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}