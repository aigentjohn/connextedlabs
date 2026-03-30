import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import { Users, Trash2, UserPlus, Crown, Shield, Eye } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface SponsorMember {
  id: string;
  user_id: string;
  role: 'owner' | 'director' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user: User;
}

interface SponsorMemberDialogProps {
  sponsorId: string;
  sponsorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SponsorMemberDialog({
  sponsorId,
  sponsorName,
  open,
  onOpenChange,
}: SponsorMemberDialogProps) {
  const [members, setMembers] = useState<SponsorMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'director' | 'admin' | 'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, sponsorId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch current members
      const { data: membersData, error: membersError } = await supabase
        .from('sponsor_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          user:users!sponsor_members_user_id_fkey (
            id,
            name,
            email,
            avatar
          )
        `)
        .eq('sponsor_id', sponsorId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch all users (for adding new members)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .order('name', { ascending: true });

      if (usersError) throw usersError;
      setAllUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching sponsor members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      // Check if user is already a member
      const existingMember = members.find(m => m.user_id === selectedUserId);
      if (existingMember) {
        toast.error('This user is already a member');
        return;
      }

      const { error } = await supabase.from('sponsor_members').insert([
        {
          sponsor_id: sponsorId,
          user_id: selectedUserId,
          role: selectedRole,
        },
      ]);

      if (error) throw error;

      toast.success('Member added successfully');
      setSelectedUserId('');
      setSelectedRole('member');
      fetchData();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('sponsor_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this sponsor?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sponsor_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'director':
        return <Crown className="w-4 h-4 text-indigo-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'director':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const availableUsers = allUsers.filter(
    (user) => !members.some((m) => m.user_id === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Sponsor Members</DialogTitle>
          <DialogDescription>
            Add or remove members for {sponsorName}. Directors can edit sponsor branding and create containers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Member */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add New Member
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddMember} disabled={!selectedUserId} className="w-full">
                  Add Member
                </Button>
              </div>
            </div>
          </div>

          {/* Current Members */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Current Members ({members.length})
            </h3>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-gray-500 text-sm">No members yet. Add the first member above.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.user.avatar || undefined} />
                        <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-sm text-gray-600">{member.user.email}</p>
                      </div>
                      <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.user.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role Descriptions */}
          <div className="border-t pt-4 text-sm text-gray-600">
            <p className="font-semibold mb-2">Role Descriptions:</p>
            <ul className="space-y-1 ml-4">
              <li><strong>Owner:</strong> Full control over sponsor and all containers</li>
              <li><strong>Director:</strong> Can edit sponsor branding and create containers with first admin assignment</li>
              <li><strong>Admin:</strong> Can help manage sponsor members</li>
              <li><strong>Member:</strong> General member with basic access</li>
              <li><strong>Viewer:</strong> Read-only access</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}