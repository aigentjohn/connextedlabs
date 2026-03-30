/**
 * WaitlistBlock
 *
 * Drop-in component for any public landing page that has a linked ticket template.
 * Handles the full join / position / leave flow in one self-contained card.
 *
 * Usage:
 *   <WaitlistBlock template={linkedTemplate} profile={profile} displayName="Cohort 3" />
 *
 * The template's `unlocks.containerType` and `unlocks.containerId` are used as the
 * actual waitlist target.  Pass `displayName` to override what's shown to the user.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Clock, Users, Ticket, Loader2, Bell, X, LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { waitlistApi, type TicketTemplate } from '@/services/ticketSystemService';

// ─── Types ────────────────────────────────────────────────────────────────────

type WaitlistStatus = 'loading' | 'on_waitlist' | 'not_on_waitlist' | 'unauthenticated';

interface WaitlistBlockProps {
  template: TicketTemplate;
  /** Current user profile — null/undefined when logged out */
  profile: any;
  /** Override the container name shown to the user (e.g. offering name) */
  displayName?: string;
  /** Extra Tailwind classes for the outer wrapper */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaitlistBlock({ template, profile, displayName, className = '' }: WaitlistBlockProps) {
  const navigate = useNavigate();

  const [status, setStatus]               = useState<WaitlistStatus>('loading');
  const [position, setPosition]           = useState<number | null>(null);
  const [total, setTotal]                 = useState(0);
  const [joining, setJoining]             = useState(false);
  const [leaving, setLeaving]             = useState(false);
  const [leaveConfirm, setLeaveConfirm]   = useState(false);

  // Derived from template
  const unlocks       = template.unlocks;
  const containerType = unlocks?.containerType ?? '';
  const containerId   = unlocks?.containerId   ?? '';
  const containerName = displayName || unlocks?.containerName || template.name;
  const isValid       = unlocks?.type === 'container' && !!containerType && !!containerId;

  const available = Math.max(0, (template.inventoryCount || 0) - (template.assignedCount || 0));

  // ── Check position on mount ──────────────────────────────────────────────────
  const checkPosition = useCallback(async () => {
    if (!isValid) { setStatus('not_on_waitlist'); return; }
    if (!profile) { setStatus('unauthenticated'); return; }
    try {
      const data = await waitlistApi.getPosition(containerType, containerId);
      if (data.onWaitlist) {
        setStatus('on_waitlist');
        setPosition(data.position);
        setTotal(data.total);
      } else {
        setStatus('not_on_waitlist');
        setTotal(data.total);
      }
    } catch {
      setStatus('not_on_waitlist');
    }
  }, [isValid, profile, containerType, containerId]);

  useEffect(() => { checkPosition(); }, [checkPosition]);

  // Don't render if template doesn't unlock a container
  if (!isValid) return null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!profile) { navigate('/login'); return; }
    try {
      setJoining(true);
      const result = await waitlistApi.join(containerType, containerId, containerName, template.id);
      if (result.alreadyOnWaitlist) {
        toast.info("You're already on this waitlist");
      } else {
        toast.success(`You're #${result.position} in line! We'll notify you when a ticket is ready.`);
      }
      setPosition(result.position);
      setTotal(result.total);
      setStatus('on_waitlist');
    } catch (err: any) {
      toast.error(`Failed to join waitlist: ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      setLeaving(true);
      await waitlistApi.leave(containerType, containerId);
      toast.success('Removed from waitlist');
      setStatus('not_on_waitlist');
      setPosition(null);
      setLeaveConfirm(false);
    } catch (err: any) {
      toast.error(`Failed to leave: ${err.message}`);
    } finally {
      setLeaving(false);
    }
  };

  // ── Loading spinner ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
      </div>
    );
  }

  const queueProgress =
    total > 0 && position !== null
      ? Math.round(((total - position + 1) / total) * 100)
      : 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Card className={`border-2 border-amber-200 bg-amber-50/40 ${className}`}>
        <CardContent className="pt-4 pb-4 space-y-3">
          {status === 'on_waitlist' ? (
            /* ─ On Waitlist View ─ */
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 text-sm leading-tight">You're on the Waitlist</p>
                  <p className="text-xs text-amber-700 truncate max-w-[200px]">{containerName}</p>
                </div>
              </div>

              {/* Queue position */}
              <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-amber-800 font-medium">Queue Position</span>
                  <span className="font-bold text-amber-900">#{position} of {total}</span>
                </div>
                <Progress value={queueProgress} className="h-2" />
                <p className="text-xs text-amber-700">
                  {position === 1
                    ? '🎉 You\'re first in line!'
                    : `${position! - 1} person${position! > 2 ? 's' : ''} ahead of you`}
                </p>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-amber-700">
                <Bell className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>You'll get a notification the moment a ticket is assigned to you.</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs"
                onClick={() => setLeaveConfirm(true)}
                disabled={leaving}
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Leave Waitlist
              </Button>
            </>
          ) : (
            /* ─ Join View ─ */
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 text-sm leading-tight">
                    {available > 0 ? 'Limited Spots Available' : 'Join the Waitlist'}
                  </p>
                  <p className="text-xs text-amber-700">
                    {available > 0
                      ? `${available} ticket${available !== 1 ? 's' : ''} available — grab yours`
                      : total > 0
                        ? `${total} already waiting — be next`
                        : 'Be the first in line'}
                  </p>
                </div>
              </div>

              {available === 0 && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  We'll send you an in-app notification the moment a spot opens up — no need to keep checking back.
                </p>
              )}

              {status === 'unauthenticated' ? (
                <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => navigate('/login')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Join Waitlist
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
                    : available > 0
                      ? '🎟️ Reserve My Spot'
                      : 'Join Waitlist — Notify Me'}
                </Button>
              )}

              {total > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 justify-center">
                  <Users className="w-3.5 h-3.5" />
                  <span>{total} {total === 1 ? 'person' : 'people'} in queue</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Leave confirmation */}
      <AlertDialog open={leaveConfirm} onOpenChange={setLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose your position <strong>#{position}</strong> for{' '}
              <strong>{containerName}</strong>. If you rejoin later, you'll go to the back of the queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep My Spot</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {leaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Leave Waitlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
