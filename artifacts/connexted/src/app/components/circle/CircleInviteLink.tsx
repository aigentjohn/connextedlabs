import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Link2, Copy, RefreshCw, Trash2, Loader2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CircleInvite {
  id: string;
  token: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

interface CircleInviteLinkProps {
  circleId: string;
  circleName: string;
  currentUserId: string;
}

export default function CircleInviteLink({ circleId, circleName, currentUserId }: CircleInviteLinkProps) {
  const [invite, setInvite] = useState<CircleInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiryDays, setExpiryDays] = useState('');

  const inviteUrl = invite
    ? `${window.location.origin}/join/${invite.token}`
    : null;

  useEffect(() => {
    loadInvite();
  }, [circleId]);

  async function loadInvite() {
    setLoading(true);
    const { data, error } = await supabase
      .from('circle_invites')
      .select('id, token, expires_at, max_uses, use_count, created_at')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading invite:', error);
    } else {
      setInvite(data);
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const payload: Record<string, unknown> = {
        circle_id: circleId,
        created_by: currentUserId,
      };

      if (expiryDays && parseInt(expiryDays) > 0) {
        const expires = new Date();
        expires.setDate(expires.getDate() + parseInt(expiryDays));
        payload.expires_at = expires.toISOString();
      }

      if (maxUses && parseInt(maxUses) > 0) {
        payload.max_uses = parseInt(maxUses);
      }

      const { data, error } = await supabase
        .from('circle_invites')
        .insert(payload)
        .select('id, token, expires_at, max_uses, use_count, created_at')
        .single();

      if (error) throw error;

      setInvite(data);
      setMaxUses('');
      setExpiryDays('');
      toast.success('Invite link generated');
    } catch (err) {
      console.error('Error generating invite:', err);
      toast.error('Failed to generate invite link');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!invite) return;
    setRevoking(true);
    try {
      const { error } = await supabase
        .from('circle_invites')
        .delete()
        .eq('id', invite.id);

      if (error) throw error;

      setInvite(null);
      toast.success('Invite link revoked');
    } catch (err) {
      console.error('Error revoking invite:', err);
      toast.error('Failed to revoke invite link');
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('Link copied to clipboard');
  }

  const isExpired =
    invite?.expires_at != null && new Date(invite.expires_at) < new Date();
  const isExhausted =
    invite?.max_uses != null && invite.use_count >= invite.max_uses;
  const isActive = invite && !isExpired && !isExhausted;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Shareable Invite Link
          </CardTitle>
          <CardDescription>
            Anyone with this link can join {circleName} directly — no application needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteUrl ?? ''}
                  className="font-mono text-sm bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!isActive}
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {isExhausted && (
                  <Badge variant="destructive">Max uses reached</Badge>
                )}
                {isActive && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                )}
                <span className="flex items-center gap-1">
                  <span>{invite.use_count} use{invite.use_count !== 1 ? 's' : ''}</span>
                  {invite.max_uses != null && (
                    <span>/ {invite.max_uses} max</span>
                  )}
                </span>
                {invite.expires_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isExpired
                      ? `Expired ${formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}`
                      : `Expires ${formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}`}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate new link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {revoking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Revoke
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">No active invite link. Generate one below.</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry-days" className="text-sm">
                    Expires after (days)
                  </Label>
                  <Input
                    id="expiry-days"
                    type="number"
                    min="1"
                    placeholder="Never"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-uses" className="text-sm">
                    Max uses
                  </Label>
                  <Input
                    id="max-uses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Generate invite link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
