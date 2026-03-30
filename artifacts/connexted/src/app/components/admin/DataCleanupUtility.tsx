import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  AlertCircle,
  Database,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  AlertTriangle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/app/components/ui/alert';

interface TableStats {
  table: string;
  count: number;
  sample?: any[];
}

const CONTAINER_TABLES = [
  'programs',
  'journeys', 
  'circles',
  'tables',
  'builds',
  'pitches',
  'elevators',
  'meetups',
  'meetings',
  'standups',
  'sprints',
  'checklists',
  'libraries'
];

const CONTENT_TABLES = [
  'posts',
  'documents',
  'reviews',
  'comments',
  'forum_threads'
];

const ADMIN_TABLES = [
  'sponsors',
  'sponsor_tiers',
  'sponsor_members'
];

export default function DataCleanupUtility() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TableStats[]>([]);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [deletingTable, setDeletingTable] = useState<string | null>(null);
  const [diagnosticCopied, setDiagnosticCopied] = useState(false);
  const [lastBlockerCopied, setLastBlockerCopied] = useState(false);

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    setLoading(true);
    const allTables = [...CONTAINER_TABLES, ...CONTENT_TABLES, ...ADMIN_TABLES, 'users'];
    
    try {
      const statsPromises = allTables.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          return { table, count: 0 };
        }
        
        return { table, count: count || 0 };
      });

      const results = await Promise.all(statsPromises);
      setStats(results);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch database statistics');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllFromTable = async (tableName: string) => {
    if (!confirm(`⚠️ DELETE ALL DATA from ${tableName}?\n\nThis will permanently delete ${stats.find(s => s.table === tableName)?.count || 0} records.\n\nThis cannot be undone!`)) {
      return;
    }

    setDeletingTable(tableName);

    try {
      // For large tables, delete in batches
      const batchSize = 100;
      let totalDeleted = 0;
      let attempts = 0;
      const maxAttempts = 1000; // Prevent infinite loops
      
      while (attempts < maxAttempts) {
        attempts++;
        
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(batchSize);

        if (error) {
          console.error(`Error fetching records from ${tableName}:`, error);
          throw new Error(`Failed to fetch records: ${error.message}`);
        }
        
        if (!data || data.length === 0) break;

        const ids = data.map(row => row.id);
        
        console.log(`Attempting to delete ${ids.length} records from ${tableName}...`);
        
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error(`DELETION FAILED for ${tableName}:`, deleteError);
          throw new Error(`Deletion blocked: ${deleteError.message}\n\nHint: There may be foreign key constraints blocking this deletion. Check the console for details.`);
        }
        
        // ✅ VERIFY deletion by checking if records still exist
        const { data: remainingRecords, error: verifyError } = await supabase
          .from(tableName)
          .select('id', { count: 'exact' })
          .in('id', ids);
        
        if (verifyError) {
          console.error(`Error verifying deletion from ${tableName}:`, verifyError);
          throw new Error(`Failed to verify deletion: ${verifyError.message}`);
        }
        
        const actuallyDeleted = ids.length - (remainingRecords?.length || 0);
        
        if (actuallyDeleted === 0 && ids.length > 0) {
          console.error(`❌ SILENT DELETION FAILURE: ${ids.length} records from ${tableName} were NOT deleted (foreign key constraints blocking)`);
          throw new Error(`Deletion failed silently! ${ids.length} records were NOT deleted.\n\nForeign key constraints are blocking this deletion.\n\nRun the migration: /supabase/migrations/20240205000000_fix_container_cascade_deletes.sql`);
        }
        
        if (actuallyDeleted < ids.length) {
          console.warn(`⚠️ PARTIAL DELETION: Only ${actuallyDeleted} of ${ids.length} records deleted from ${tableName}`);
        }
        
        totalDeleted += actuallyDeleted;
        
        // Update progress
        toast.info(`Deleted ${totalDeleted} records from ${tableName}...`);
        
        if (data.length < batchSize) break;
      }

      if (totalDeleted === 0) {
        toast.info(`No records found in ${tableName}`);
      } else {
        toast.success(`Successfully deleted ${totalDeleted} records from ${tableName}`);
      }
      
      await fetchStats();
    } catch (error: any) {
      console.error(`Error deleting from ${tableName}:`, error);
      toast.error(`Failed to delete from ${tableName}: ${error.message || 'Unknown error'}`, {
        duration: 10000, // Show error for 10 seconds
      });
    } finally {
      setDeletingTable(null);
    }
  };

  const copySQLFix = () => {
    const sqlElement = document.querySelector('#sql-fix-code');
    const sql = sqlElement?.textContent || '';
    
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(sql)
        .then(() => {
          setSqlCopied(true);
          toast.success('SQL copied to clipboard!');
          setTimeout(() => setSqlCopied(false), 2000);
        })
        .catch(() => {
          // Fallback if Clipboard API fails
          fallbackCopyTextToClipboard(sql, sqlElement);
        });
    } else {
      // Use fallback for non-secure contexts or when Clipboard API is blocked
      fallbackCopyTextToClipboard(sql, sqlElement);
    }
  };

  const copySQLFixExact = () => {
    const exactSQL = `-- EXACT FIX FOR YOUR DATABASE (23 NO ACTION foreign keys)
BEGIN;

-- Fix bookmarks
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix build_reviews
ALTER TABLE build_reviews DROP CONSTRAINT IF EXISTS build_reviews_added_by_fkey;
ALTER TABLE build_reviews ADD CONSTRAINT build_reviews_added_by_fkey 
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE;

-- Fix schedule_cancelled_by columns (SET NULL to preserve history)
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_schedule_cancelled_by_fkey;
ALTER TABLE builds ADD CONSTRAINT builds_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE elevators DROP CONSTRAINT IF EXISTS elevators_schedule_cancelled_by_fkey;
ALTER TABLE elevators ADD CONSTRAINT elevators_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE moments DROP CONSTRAINT IF EXISTS moments_schedule_cancelled_by_fkey;
ALTER TABLE moments ADD CONSTRAINT moments_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE pitches DROP CONSTRAINT IF EXISTS pitches_schedule_cancelled_by_fkey;
ALTER TABLE pitches ADD CONSTRAINT pitches_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_schedule_cancelled_by_fkey;
ALTER TABLE programs ADD CONSTRAINT programs_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE standups DROP CONSTRAINT IF EXISTS standups_schedule_cancelled_by_fkey;
ALTER TABLE standups ADD CONSTRAINT standups_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_schedule_cancelled_by_fkey;
ALTER TABLE tables ADD CONSTRAINT tables_schedule_cancelled_by_fkey 
  FOREIGN KEY (schedule_cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

-- Fix sponsor_id columns (SET NULL to preserve data)
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_sponsor_id_fkey;
ALTER TABLE builds ADD CONSTRAINT builds_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

ALTER TABLE elevators DROP CONSTRAINT IF EXISTS elevators_sponsor_id_fkey;
ALTER TABLE elevators ADD CONSTRAINT elevators_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_sponsor_id_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

ALTER TABLE meetups DROP CONSTRAINT IF EXISTS meetups_sponsor_id_fkey;
ALTER TABLE meetups ADD CONSTRAINT meetups_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

ALTER TABLE pitches DROP CONSTRAINT IF EXISTS pitches_sponsor_id_fkey;
ALTER TABLE pitches ADD CONSTRAINT pitches_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_sponsor_id_fkey;
ALTER TABLE tables ADD CONSTRAINT tables_sponsor_id_fkey 
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE SET NULL;

-- Fix container_memberships audit columns
ALTER TABLE container_memberships DROP CONSTRAINT IF EXISTS container_memberships_approved_by_fkey;
ALTER TABLE container_memberships ADD CONSTRAINT container_memberships_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE container_memberships DROP CONSTRAINT IF EXISTS container_memberships_invited_by_fkey;
ALTER TABLE container_memberships ADD CONSTRAINT container_memberships_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE container_memberships DROP CONSTRAINT IF EXISTS container_memberships_rejected_by_fkey;
ALTER TABLE container_memberships ADD CONSTRAINT container_memberships_rejected_by_fkey 
  FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Fix other audit/history columns
ALTER TABLE container_states DROP CONSTRAINT IF EXISTS container_states_state_changed_by_fkey;
ALTER TABLE container_states ADD CONSTRAINT container_states_state_changed_by_fkey 
  FOREIGN KEY (state_changed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE scheduled_publish_log DROP CONSTRAINT IF EXISTS scheduled_publish_log_cancelled_by_fkey;
ALTER TABLE scheduled_publish_log ADD CONSTRAINT scheduled_publish_log_cancelled_by_fkey 
  FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE session_attendance DROP CONSTRAINT IF EXISTS session_attendance_marked_by_fkey;
ALTER TABLE session_attendance ADD CONSTRAINT session_attendance_marked_by_fkey 
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sponsor_members DROP CONSTRAINT IF EXISTS sponsor_members_invited_by_fkey;
ALTER TABLE sponsor_members ADD CONSTRAINT sponsor_members_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Fix sponsors.tier_id
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_tier_id_fkey;
ALTER TABLE sponsors ADD CONSTRAINT sponsors_tier_id_fkey 
  FOREIGN KEY (tier_id) REFERENCES sponsor_tiers(id) ON DELETE SET NULL;

COMMIT;

SELECT 'Fixed 23 foreign keys! Deletions should work now.' as result;`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(exactSQL)
        .then(() => {
          setSqlCopied(true);
          toast.success('Exact SQL fix copied!');
          setTimeout(() => setSqlCopied(false), 2000);
        })
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = exactSQL;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setSqlCopied(true);
          toast.success('Exact SQL fix copied!');
          setTimeout(() => setSqlCopied(false), 2000);
        });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = exactSQL;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSqlCopied(true);
      toast.success('Exact SQL fix copied!');
      setTimeout(() => setSqlCopied(false), 2000);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, element: Element | null) => {
    // Create a temporary textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setSqlCopied(true);
        toast.success('SQL copied to clipboard!');
        setTimeout(() => setSqlCopied(false), 2000);
      } else {
        // If execCommand also fails, select the text visually
        selectTextInElement(element);
        toast.info('Please manually copy the selected text (Ctrl+C or Cmd+C)');
      }
    } catch (err) {
      // Last resort: select the text visually
      selectTextInElement(element);
      toast.info('Text selected - press Ctrl+C (or Cmd+C) to copy');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const selectTextInElement = (element: Element | null) => {
    if (!element) return;
    
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const copyDiagnosticSQL = () => {
    const diagnosticSQL = `-- DIAGNOSTIC: Show all foreign key constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name as references_table,
  ccu.column_name as references_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(diagnosticSQL)
        .then(() => {
          setDiagnosticCopied(true);
          toast.success('Diagnostic SQL copied!');
          setTimeout(() => setDiagnosticCopied(false), 2000);
        })
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = diagnosticSQL;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success('Diagnostic SQL copied!');
        });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = diagnosticSQL;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Diagnostic SQL copied!');
    }
  };

  const copyLastBlockerSQL = () => {
    const lastBlockerSQL = `-- FIX LAST BLOCKER: session_attendance.marked_by (duplicate constraints)
BEGIN;

-- Drop ALL constraints on session_attendance.marked_by
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN 
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'session_attendance'
      AND kcu.column_name = 'marked_by'
  LOOP
    EXECUTE format('ALTER TABLE session_attendance DROP CONSTRAINT IF EXISTS %I;', constraint_rec.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
  END LOOP;
END $$;

-- Add ONE clean constraint
ALTER TABLE session_attendance 
  ADD CONSTRAINT session_attendance_marked_by_fkey 
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;

-- Verify (should show only ONE row with SET NULL)
SELECT 
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'session_attendance'
  AND kcu.column_name = 'marked_by';`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(lastBlockerSQL)
        .then(() => {
          setLastBlockerCopied(true);
          toast.success('Last blocker SQL copied!');
          setTimeout(() => setLastBlockerCopied(false), 2000);
        })
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = lastBlockerSQL;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setLastBlockerCopied(true);
          toast.success('Last blocker SQL copied!');
          setTimeout(() => setLastBlockerCopied(false), 2000);
        });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = lastBlockerSQL;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLastBlockerCopied(true);
      toast.success('Last blocker SQL copied!');
      setTimeout(() => setLastBlockerCopied(false), 2000);
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Data Cleanup' }
        ]} />
        
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600">Platform admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Data Cleanup Utility' }
      ]} />

      <div>
        <h1 className="text-3xl mb-2">Data Cleanup Utility</h1>
        <p className="text-gray-600">Complete database cleanup tools for removing test data</p>
      </div>

      {/* CRITICAL: SQL FIX INSTRUCTIONS */}
      <Alert className="border-red-500 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-900 font-bold">⚠️ REQUIRED: Run SQL Fix First</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 mt-2">
            <p className="text-red-800">
              Before you can delete data, you MUST run this SQL in Supabase to fix foreign key constraints:
            </p>
            
            <div className="bg-white border border-red-300 rounded p-3 font-mono text-xs overflow-x-auto">
              <pre id="sql-fix-code" className="text-gray-900">{`-- Run this in Supabase SQL Editor (DYNAMIC - AUTO-DETECTS COLUMNS)
BEGIN;

-- Fix ALL foreign keys dynamically (checks for column existence)
DO $$
DECLARE
  table_rec RECORD;
BEGIN
  -- Loop through all tables that have created_by or author_id
  FOR table_rec IN 
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('created_by', 'author_id')
      AND table_name NOT IN ('users', 'communities')
  LOOP
    -- Check if table has created_by column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_rec.table_name 
        AND column_name = 'created_by'
    ) THEN
      EXECUTE format('
        ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;
        ALTER TABLE %I ADD CONSTRAINT %I 
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
      ', 
        table_rec.table_name,
        table_rec.table_name || '_created_by_fkey',
        table_rec.table_name,
        table_rec.table_name || '_created_by_fkey'
      );
      RAISE NOTICE 'Fixed %.created_by', table_rec.table_name;
    END IF;

    -- Check if table has author_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_rec.table_name 
        AND column_name = 'author_id'
    ) THEN
      EXECUTE format('
        ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;
        ALTER TABLE %I ADD CONSTRAINT %I 
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
      ', 
        table_rec.table_name,
        table_rec.table_name || '_author_id_fkey',
        table_rec.table_name,
        table_rec.table_name || '_author_id_fkey'
      );
      RAISE NOTICE 'Fixed %.author_id', table_rec.table_name;
    END IF;
  END LOOP;
END $$;

COMMIT;

SELECT 'Done! All foreign keys fixed automatically.' as result;`}</pre>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={copySQLFix}
                className="bg-red-600 hover:bg-red-700"
              >
                {sqlCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy SQL
                  </>
                )}
              </Button>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID || '_'}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  Open Supabase SQL Editor →
                </Button>
              </a>
            </div>

            <p className="text-sm text-red-700">
              📋 <strong>Steps:</strong>
            </p>
            <ol className="text-sm text-red-700 list-decimal list-inside space-y-1 ml-2">
              <li>Click "Copy SQL" above</li>
              <li>Open Supabase SQL Editor in new tab</li>
              <li>Paste and run the SQL</li>
              <li>Return here and use deletion tools below</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      {/* EXACT FIX: If deletion still fails */}
      <Alert className="border-blue-500 bg-blue-50">
        <Search className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 font-bold">🔍 Still Having Problems? Run Exact Fix</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 mt-2">
            <p className="text-blue-800">
              If deletion STILL fails after running the SQL above, copy this exact fix to see exactly what foreign keys exist in YOUR database:
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={copySQLFixExact}
                variant="outline"
                className="border-blue-600 text-blue-700 hover:bg-blue-100"
              >
                {sqlCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Exact Fix Copied!
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Copy Exact Fix SQL
                  </>
                )}
              </Button>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID || '_'}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  Open Supabase SQL Editor →
                </Button>
              </a>
            </div>

            <p className="text-sm text-blue-700">
              This will show all your foreign key constraints and which ones are blocking deletions. Share the results and we can create a custom fix for YOUR exact database schema.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* DIAGNOSTIC: If deletion still fails */}
      <Alert className="border-blue-500 bg-blue-50">
        <Search className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 font-bold">🔍 Still Having Problems? Run Diagnostic</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 mt-2">
            <p className="text-blue-800">
              If deletion STILL fails after running the SQL above, copy this diagnostic query to see exactly what foreign keys exist in YOUR database:
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={copyDiagnosticSQL}
                variant="outline"
                className="border-blue-600 text-blue-700 hover:bg-blue-100"
              >
                {diagnosticCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Diagnostic Copied!
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Copy Diagnostic SQL
                  </>
                )}
              </Button>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID || '_'}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  Open Supabase SQL Editor →
                </Button>
              </a>
            </div>

            <p className="text-sm text-blue-700">
              This will show all your foreign key constraints and which ones are blocking deletions. Share the results and we can create a custom fix for YOUR exact database schema.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* LAST BLOCKER: If deletion still fails */}
      <Alert className="border-blue-500 bg-blue-50">
        <Search className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 font-bold">🔍 Still Having Problems? Find Last Blocker</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 mt-2">
            <p className="text-blue-800">
              If deletion STILL fails after running the SQL above, copy this query to find the last foreign key constraint that blocked deletion:
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={copyLastBlockerSQL}
                variant="outline"
                className="border-blue-600 text-blue-700 hover:bg-blue-100"
              >
                {lastBlockerCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Last Blocker Copied!
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Copy Last Blocker SQL
                  </>
                )}
              </Button>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID || '_'}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">
                  Open Supabase SQL Editor →
                </Button>
              </a>
            </div>

            <p className="text-sm text-blue-700">
              This will show the last foreign key constraint that blocked deletion. Share the results and we can create a custom fix for YOUR exact database schema.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current record counts across all tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading database statistics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{totalRecords.toLocaleString()}</div>
                <div className="text-sm text-blue-700">Total Records</div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Container Tables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.filter(s => CONTAINER_TABLES.includes(s.table)).map(stat => (
                    <div key={stat.table} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{stat.table}</span>
                        <Badge variant={stat.count > 0 ? 'default' : 'outline'}>
                          {stat.count}
                        </Badge>
                      </div>
                      {stat.count > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => deleteAllFromTable(stat.table)}
                          disabled={deletingTable !== null}
                        >
                          {deletingTable === stat.table ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete All
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Content Tables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.filter(s => CONTENT_TABLES.includes(s.table)).map(stat => (
                    <div key={stat.table} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{stat.table}</span>
                        <Badge variant={stat.count > 0 ? 'default' : 'outline'}>
                          {stat.count}
                        </Badge>
                      </div>
                      {stat.count > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => deleteAllFromTable(stat.table)}
                          disabled={deletingTable !== null}
                        >
                          {deletingTable === stat.table ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete All
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Admin Tables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.filter(s => ADMIN_TABLES.includes(s.table)).map(stat => (
                    <div key={stat.table} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{stat.table}</span>
                        <Badge variant={stat.count > 0 ? 'default' : 'outline'}>
                          {stat.count}
                        </Badge>
                      </div>
                      {stat.count > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => deleteAllFromTable(stat.table)}
                          disabled={deletingTable !== null}
                        >
                          {deletingTable === stat.table ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete All
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Users</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.filter(s => s.table === 'users').map(stat => (
                    <div key={stat.table} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{stat.table}</span>
                        <Badge variant={stat.count > 0 ? 'default' : 'outline'}>
                          {stat.count}
                        </Badge>
                      </div>
                      {stat.count > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => deleteAllFromTable(stat.table)}
                          disabled={deletingTable !== null}
                        >
                          {deletingTable === stat.table ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete All Users
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={fetchStats}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                Refresh Statistics
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Deletion Safety</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
            <li>Each deletion requires confirmation</li>
            <li>Deletions are permanent and cannot be undone</li>
            <li>Foreign keys must be fixed (see red alert above) before deletion works</li>
            <li>Large tables are deleted in batches to avoid timeouts</li>
            <li>Deleting users will cascade delete all their content (if foreign keys are fixed)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}