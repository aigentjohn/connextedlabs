/**
 * MyAccountPage - Membership + GDPR data export
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { MembershipManagement } from '@/app/components/profile/MembershipManagement';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';
import { Button } from '@/app/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '@/utils/supabase/info';

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1`;

export default function MyAccountPage() {
  const { profile } = useAuth();
  const [exporting, setExporting] = useState(false);

  if (!profile) return null;

  async function handleExport() {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

  return (
    <ProfilePageShell sectionLabel="My Account">
      <MembershipManagement userId={profile.id} />

      <div className="mt-8 border-t pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Data & Privacy</h2>
        <p className="text-xs text-gray-500 mb-3">
          Download a copy of all your content and account data (GDPR Article 20).
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          {exporting ? 'Preparing export…' : 'Export my data'}
        </Button>
      </div>
    </ProfilePageShell>
  );
}
