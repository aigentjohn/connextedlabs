import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import { UserPlus, Trash2, Loader2, Users } from 'lucide-react';

interface CompanyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

interface Props {
  companyId: string;
  companyName: string;
  ownerUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CompanyMemberDialog({ companyId, companyName, ownerUserId, open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open && companyId) loadMembers();
  }, [open, companyId]);

  async function loadMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_members')
      .select('*, user:users!company_members_user_id_fkey(id, name, email, avatar)')
      .eq('company_id', companyId)
      .order('created_at');
    if (error) { console.error(error); toast.error('Failed to load members'); }
    setMembers(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!email.trim() || !profile) return;
    setAdding(true);
    try {
      // Look up user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .ilike('email', email.trim())
        .single();

      if (userError || !user) {
        toast.error('No user found with that email');
        return;
      }

      if (user.id === ownerUserId) {
        toast.error('Owner is already a member');
        return;
      }

      if (members.find(m => m.user_id === user.id)) {
        toast.error(`${user.name} is already a member`);
        return;
      }

      const { error } = await supabase.from('company_members').insert({
        company_id: companyId,
        user_id: user.id,
        role: 'member',
      });

      if (error) throw error;
      toast.success(`${user.name} added as member`);
      setEmail('');
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from ${companyName}?`)) return;
    const { error } = await supabase.from('company_members').delete().eq('id', memberId);
    if (error) { toast.error('Failed to remove member'); return; }
    toast.success(`${memberName} removed`);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super';
  const isOwner = profile?.id === ownerUserId || isPlatformAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {companyName} — Members
          </DialogTitle>
          <DialogDescription>
            Members can edit company settings and manage companion content.
          </DialogDescription>
        </DialogHeader>

        {/* Add member */}
        {isOwner && (
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {/* Owner (always shown) */}
          <OwnerRow ownerUserId={ownerUserId} />

          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No additional members yet.</p>
          ) : (
            members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={m.user?.avatar || undefined} />
                  <AvatarFallback>{m.user?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Member</Badge>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(m.id, m.user?.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-400">
          Members can edit company info and manage companion content. Only the owner can add/remove members.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function OwnerRow({ ownerUserId }: { ownerUserId: string }) {
  const [owner, setOwner] = useState<{ name: string; email: string; avatar: string | null } | null>(null);

  useEffect(() => {
    supabase
      .from('users')
      .select('name, email, avatar')
      .eq('id', ownerUserId)
      .single()
      .then(({ data }) => setOwner(data));
  }, [ownerUserId]);

  if (!owner) return null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border bg-gray-50">
      <Avatar className="w-8 h-8">
        <AvatarImage src={owner.avatar || undefined} />
        <AvatarFallback>{owner.name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{owner.name}</p>
        <p className="text-xs text-gray-500 truncate">{owner.email}</p>
      </div>
      <Badge className="text-xs bg-indigo-600 text-white">Owner</Badge>
    </div>
  );
}
