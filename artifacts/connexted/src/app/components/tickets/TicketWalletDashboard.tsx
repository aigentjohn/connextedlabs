/**
 * Ticket Wallet Dashboard
 *
 * User-facing view showing:
 *  - Inventory tickets assigned to this user (rich receipt cards)
 *  - Waitlist positions (with live queue count)
 *  - Link through to actual content access
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Ticket, Clock, DollarSign, ShieldCheck, Calendar, Hash,
  Loader2, ChevronRight, Users, TrendingUp, AlertCircle, X,
  ExternalLink, Award, Copy, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  inventoryApi, waitlistApi, templateApi,
  type InventoryItem, type WaitlistEntry, type TicketTemplate,
  formatCents, templateColor,
} from '@/services/ticketSystemService';
import { supabase } from '@/lib/supabase';

// ─── Container route helper ───────────────────────────────────────────────────

function containerPath(type: string, id: string): string {
  const map: Record<string, string> = {
    program: `/programs/${id}`,
    course: `/courses/${id}`,
    marketplace_offering: `/market/offering/${id}`,
  };
  return map[type] || `/${type}s/${id}`;
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

interface TicketCardProps {
  item: InventoryItem;
  accessTicket?: any;
  template?: TicketTemplate | null;
  currentUserClass?: number;
}

function TicketCard({ item, accessTicket, template, currentUserClass = 1 }: TicketCardProps) {
  const [copied, setCopied] = useState(false);

  // Try to infer a color from something unique to the template
  const colorNames = ['indigo', 'blue', 'green', 'amber', 'rose', 'purple', 'teal', 'orange'];
  const colorIdx = item.templateId.charCodeAt(0) % colorNames.length;
  const colors = templateColor(colorNames[colorIdx]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const unlockInfo = accessTicket ? {
    containerType: accessTicket.container_type,
    containerId: accessTicket.container_id,
    expiresAt: accessTicket.expires_at,
    progress: accessTicket.progress_percentage,
    status: accessTicket.status,
    referralCode: accessTicket.referral_code,
  } : null;

  return (
    <Card className={`border-2 ${colors.border} overflow-hidden`}>
      {/* Color stripe */}
      <div className={`h-1.5 ${colors.bg.replace('bg-', 'bg-').replace('-50', '-400')}`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Ticket className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="text-right">
            <div className={`text-xs font-mono font-bold ${colors.text}`}>{item.serialNumber}</div>
            <Badge
              variant="outline"
              className={`mt-0.5 text-xs ${colors.text} ${colors.border}`}
            >
              {unlockInfo?.status === 'active' ? 'Active' : 'Assigned'}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{item.templateName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Financial receipt */}
        <div className={`rounded-lg ${colors.bg} p-3 space-y-1.5 text-sm`}>
          <div className="flex justify-between">
            <span className="text-gray-600">Face value</span>
            <span className="font-medium">
              {accessTicket?.original_price_cents
                ? formatCents(accessTicket.original_price_cents)
                : '—'}
            </span>
          </div>
          {accessTicket?.discount_applied_cents > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Discount</span>
              <span className="text-green-700 font-medium">
                −{formatCents(accessTicket.discount_applied_cents)}
              </span>
            </div>
          )}
          <div className={`flex justify-between font-bold border-t ${colors.border} pt-1.5`}>
            <span className={colors.text}>You paid</span>
            <span className={colors.text}>
              {item.pricePaidCents != null
                ? item.pricePaidCents === 0 ? 'Free / Comp' : formatCents(item.pricePaidCents)
                : '—'}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {item.assignedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Issued {new Date(item.assignedAt).toLocaleDateString()}
            </div>
          )}
          {unlockInfo?.expiresAt ? (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expires {new Date(unlockInfo.expiresAt).toLocaleDateString()}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              No expiry
            </div>
          )}
        </div>

        {/* Progress bar */}
        {unlockInfo && unlockInfo.progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{unlockInfo.progress}%</span>
            </div>
            <Progress value={unlockInfo.progress} className="h-1.5" />
          </div>
        )}

        {/* Referral code */}
        {unlockInfo?.referralCode && (
          <div className="flex items-center gap-2 text-xs border rounded px-2 py-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-gray-700 flex-1 truncate">{unlockInfo.referralCode}</span>
            <button
              onClick={() => handleCopy(unlockInfo.referralCode)}
              className="text-gray-400 hover:text-gray-700"
            >
              <Copy className="w-3 h-3" />
            </button>
            {copied && <span className="text-green-600">Copied!</span>}
          </div>
        )}

        {/* Payment reference (if set) */}
        {item.paymentReference && (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Ref: {item.paymentReference}
          </div>
        )}

        {/* Status for user_class upgrade templates — admin applies the upgrade */}
        {template?.unlocks?.type === 'user_class' && (() => {
          const targetClass = template.unlocks.userClass ?? 0;
          const alreadyUpgraded = currentUserClass >= targetClass;
          return alreadyUpgraded ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Upgrade applied</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Waiting on admin</span>
            </div>
          );
        })()}

        {/* CTA */}
        {unlockInfo?.containerId && unlockInfo.containerType !== 'marketplace_offering' && (
          <Link to={containerPath(unlockInfo.containerType, unlockInfo.containerId)}>
            <Button className="w-full mt-1" variant="default" size="sm">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {unlockInfo.progress > 0 ? 'Continue' : 'Access Content'}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Waitlist card ────────────────────────────────────────────────────────────

function WaitlistCard({ entry, onLeave }: { entry: WaitlistEntry; onLeave: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleLeave = async () => {
    try {
      setLeaving(true);
      await waitlistApi.leave(entry.containerType, entry.containerId);
      toast.success('Removed from waitlist');
      onLeave();
    } catch (err: any) {
      toast.error(`Failed to leave: ${err.message}`);
    } finally {
      setLeaving(false);
      setConfirm(false);
    }
  };

  // Progress as a fraction of total queue
  const queueProgress = entry.total > 0 ? Math.round(((entry.total - entry.position + 1) / entry.total) * 100) : 100;

  return (
    <>
      <Card className="border-amber-200 border-2">
        <div className="h-1.5 bg-amber-400" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">
              Waitlisted
            </Badge>
          </div>
          <CardTitle className="text-base mt-2">
            {entry.containerName || `${entry.containerType} access`}
          </CardTitle>
          <CardDescription className="text-xs capitalize">{entry.containerType}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Queue position */}
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-amber-800 font-medium">Queue Position</span>
              <span className="font-bold text-amber-900">#{entry.position} of {entry.total}</span>
            </div>
            <Progress value={queueProgress} className="h-2" />
            <p className="text-xs text-amber-700 mt-1.5">
              {entry.position === 1
                ? "🎉 You're first in line!"
                : `${entry.position - 1} person${entry.position > 2 ? 's' : ''} ahead of you`}
            </p>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Joined {new Date(entry.joinedAt).toLocaleDateString()}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            You'll be notified when a ticket becomes available for you.
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-red-500 hover:text-red-600 hover:border-red-300"
            onClick={() => setConfirm(true)}
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Leave Waitlist
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose your position #{entry.position} for <strong>{entry.containerName}</strong>.
              You'd have to rejoin and go to the back of the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep My Spot</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="bg-red-600 hover:bg-red-700" disabled={leaving}>
              {leaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Leave Waitlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TicketWalletDashboard() {
  const { profile } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [accessTickets, setAccessTickets] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<Record<string, TicketTemplate>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [{ items }, { waitlists: wl }] = await Promise.all([
        inventoryApi.listForUser(profile.id),
        waitlistApi.getMyWaitlists(),
      ]);
      setInventoryItems(items);
      setWaitlists(wl);

      // For each inventory item with an accessTicketId, fetch the access_ticket row
      const ticketIds = items.filter(i => i.accessTicketId).map(i => i.accessTicketId!);
      if (ticketIds.length > 0) {
        const { data: tickets } = await supabase
          .from('access_tickets')
          .select('*')
          .in('id', ticketIds);
        const map: Record<string, any> = {};
        (tickets || []).forEach((t: any) => { map[t.id] = t; });
        setAccessTickets(map);
      }

      // Show tickets immediately — don't block on template fetches
      setLoading(false);

      // Fetch templates in the background sequentially to avoid concurrent
      // supabase.auth.getSession() calls fighting over the browser Web Lock.
      const uniqueTemplateIds = [...new Set(items.map(i => i.templateId).filter(Boolean))];
      for (const id of uniqueTemplateIds) {
        try {
          const { template } = await templateApi.get(id);
          if (template) {
            setTemplates(prev => ({ ...prev, [id]: template }));
          }
        } catch {
          // skip — best effort
        }
      }
    } catch (err: any) {
      console.error('TicketWalletDashboard load error:', err);
      setLoading(false);
      if (!err.message?.includes('Authentication required')) {
        toast.error('Failed to load your tickets');
      }
    }
  }, [profile?.id]);


  useEffect(() => { load(); }, [load]);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your tickets.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const total = inventoryItems.length + waitlists.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="w-6 h-6 text-indigo-600" />
          My Tickets
        </h2>
        <p className="text-gray-600 mt-1">
          Your access passes, membership tickets, and waitlist positions.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="text-xl font-bold">{inventoryItems.length}</div>
              <div className="text-xs text-gray-500">Active Tickets</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-xl font-bold">{waitlists.length}</div>
              <div className="text-xs text-gray-500">Waitlists</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-xl font-bold">
                {formatCents(inventoryItems.reduce((s, i) => s + (i.pricePaidCents || 0), 0))}
              </div>
              <div className="text-xs text-gray-500">Total Invested</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No tickets yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Tickets appear here when an admin assigns one to you, or when you join a waitlist
              for upcoming content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={inventoryItems.length === 0 && waitlists.length > 0 ? 'waitlists' : 'tickets'}>
          <TabsList>
            <TabsTrigger value="tickets">
              Tickets ({inventoryItems.length})
            </TabsTrigger>
            <TabsTrigger value="waitlists">
              Waitlists ({waitlists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="mt-4">
            {inventoryItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No tickets assigned yet. Join a waitlist to get in line!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryItems.map(item => {
                  const tmpl = templates[item.templateId] ?? null;
                  return (
                    <TicketCard
                      key={item.id}
                      item={item}
                      accessTicket={item.accessTicketId ? accessTickets[item.accessTicketId] : undefined}
                      template={tmpl}
                      currentUserClass={(profile as any)?.user_class ?? 1}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waitlists" className="mt-4">
            {waitlists.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                You're not on any waitlists.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waitlists.map((entry, i) => (
                  <WaitlistCard
                    key={`${entry.containerType}-${entry.containerId}`}
                    entry={entry}
                    onLeave={load}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default TicketWalletDashboard;