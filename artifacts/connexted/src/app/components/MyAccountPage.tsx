/**
 * MyAccountPage - Membership + GDPR data export + account deletion
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { MembershipManagement } from '@/app/components/profile/MembershipManagement';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '@/utils/supabase/info';
import { formatDistanceToNow } from 'date-fns';

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1`;

export default function MyAccountPage() {
  const { profile, refreshProfile } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  if (!profile) return null;

  const scheduledForDeletion = !!profile.deleted_at;

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const session = await getSession();
      if (!session) { toast.error('Not signed in'); return; }

      const res = await fetch(`${EDGE_BASE}/account-export`, {
        headers: { 'X-User-Token': session.access_token },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connexted-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleScheduleDelete() {
    setDeletePending(true);
    try {
      const session = await getSession();
      if (!session) { toast.error('Not signed in'); return; }

      const res = await fetch(`${EDGE_BASE}/account-delete`, {
        method: 'POST',
        headers: { 'X-User-Token': session.access_token },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      toast.success('Account scheduled for deletion in 30 days');
      setDeleteDialogOpen(false);
      await refreshProfile?.();
    } catch (err) {
      console.error('Delete schedule error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to schedule deletion');
    } finally {
      setDeletePending(false);
    }
  }

  async function handleCancelDelete() {
    setDeletePending(true);
    try {
      const session = await getSession();
      if (!session) { toast.error('Not signed in'); return; }

      const res = await fetch(`${EDGE_BASE}/account-delete`, {
        method: 'DELETE',
        headers: { 'X-User-Token': session.access_token },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      toast.success('Account deletion cancelled');
      await refreshProfile?.();
    } catch (err) {
      console.error('Cancel delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel deletion');
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <ProfilePageShell sectionLabel="My Account">
      <MembershipManagement userId={profile.id} />

      <div className="mt-8 border-t pt-6 space-y-6">
        {/* Data export */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Data & Privacy</h2>
          <p className="text-xs text-gray-500 mb-3">
            Download a copy of all your content and account data (GDPR Article 20).
          </p>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {exporting ? 'Preparing export…' : 'Export my data'}
          </Button>
        </div>

        {/* Account deletion */}
        <div className="border-t pt-6">
          <h2 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
          {scheduledForDeletion ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700 font-medium mb-1">Account scheduled for deletion</p>
              <p className="text-xs text-red-600 mb-3">
                Your account will be permanently deleted{' '}
                {formatDistanceToNow(new Date(profile.deleted_at!), { addSuffix: true })}.
                Cancel before then to keep your account.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDelete}
                disabled={deletePending}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                {deletePending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancel deletion
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Permanently delete your account and all associated data. You'll have 30 days to cancel.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete my account
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule account deletion?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Your account and all content will be permanently deleted after a 30-day grace period.
              </span>
              <span className="block">
                A copy of your data will be prepared automatically. You can cancel at any time within the 30 days.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my account</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleScheduleDelete}
              disabled={deletePending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfilePageShell>
  );
}
