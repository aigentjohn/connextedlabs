/**
 * Badge Admin Hub
 *
 * Consolidated admin interface for all badge management.
 * Four tabs:
 *   1. Badge Types  — create, edit, delete, toggle active
 *   2. Award Badge  — manually issue a badge to any user or company
 *   3. Recipients   — all issued badges with cross-badge filtering
 *   4. Progress     — pathway-linked funnel: Earned / In Progress / Not Started
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge as UIBadge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Progress } from '@/app/components/ui/progress';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Search,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { AdminBadgeAssignment } from '@/app/components/badges/AdminBadgeAssignment';
import { issueBadge, revokeBadge } from '@/services/badgeService';
import type { BadgeType, BadgeCategory, BadgeIssuerType } from '@/services/badgeService';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

type Tab = 'types' | 'award' | 'recipients' | 'progress';

interface RecipientRow {
  id: string;
  created_at: string;
  issuer_message: string | null;
  is_public: boolean;
  badge_type_id: string | null;
  badge_type_name: string;
  badge_type_color: string;
  badge_type_category: string;
  recipient_user_id: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_avatar: string | null;
  issuer_name: string | null;
}

interface ProgressEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  status: 'earned' | 'in_progress' | 'enrolled';
  progress_percentage: number;
  enrolled_at?: string;
}

const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

const categoryEmojis: Record<string, string> = {
  completion: '✅',
  endorsement: '⭐',
  skill: '🏆',
  verification: '✓',
  achievement: '🎖️',
  membership: '👥',
};

const categoryLabels: Record<string, string> = {
  completion: 'Completion',
  endorsement: 'Endorsement',
  skill: 'Skill',
  verification: 'Verification',
  achievement: 'Achievement',
  membership: 'Membership',
};

// ============================================================================
// MAIN HUB
// ============================================================================

export default function BadgeAdminHub() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('types');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'types', label: 'Badge Types', icon: <Award className="w-4 h-4" /> },
    { id: 'award', label: 'Award Badge', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'recipients', label: 'Recipients', icon: <Users className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Badge Admin', href: '/platform-admin/badge-admin' },
        ]}
      />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Award className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Badge Admin</h1>
        </div>
        <p className="text-gray-500">
          Manage badge types, award badges to members, view all recipients, and track progress.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'types' && <BadgeTypesTab />}
      {activeTab === 'award' && (
        <div className="max-w-2xl">
          <AdminBadgeAssignment onSuccess={() => toast.success('Badge awarded successfully!')} />
        </div>
      )}
      {activeTab === 'recipients' && <RecipientsTab />}
      {activeTab === 'progress' && <ProgressTab />}
    </div>
  );
}

// ============================================================================
// TAB 1 — BADGE TYPES
// ============================================================================

function BadgeTypesTab() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchBadgeTypes(); }, []);

  async function fetchBadgeTypes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('badge_types')
      .select('*')
      .order('category')
      .order('name');
    if (error) toast.error('Failed to load badge types');
    setBadgeTypes(data || []);
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('badge_types').update({ is_active: !current }).eq('id', id);
    if (error) return toast.error('Failed to update');
    toast.success(current ? 'Badge deactivated' : 'Badge activated');
    fetchBadgeTypes();
  }

  async function deleteBadgeType(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('badge_types').delete().eq('id', id);
    if (error) return toast.error('Failed to delete: ' + error.message);
    toast.success('Badge type deleted');
    fetchBadgeTypes();
  }

  const filtered = badgeTypes.filter(
    (b) =>
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = filtered.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {} as Record<string, BadgeType[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search badge types..."
            className="pl-9 w-64"
          />
        </div>
        <Button onClick={() => { setShowCreateForm(true); setEditingId(null); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Badge Type
        </Button>
      </div>

      {showCreateForm && (
        <div className="mb-8">
          <BadgeTypeForm
            onSuccess={() => { setShowCreateForm(false); fetchBadgeTypes(); }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No badge types found.</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(byCategory).map(([cat, badges]) => (
          <div key={cat}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>{categoryEmojis[cat] || '🏅'}</span>
              {categoryLabels[cat] || cat}
              <UIBadge variant="secondary">{badges.length}</UIBadge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <Card key={badge.id} className={!badge.is_active ? 'opacity-50' : ''}>
                  <CardContent className="p-5">
                    {editingId === badge.id ? (
                      <BadgeTypeForm
                        badgeType={badge}
                        onSuccess={() => { setEditingId(null); fetchBadgeTypes(); }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0"
                            style={{ backgroundColor: badge.badge_color }}
                          >
                            {categoryEmojis[badge.category] || '🏅'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold leading-tight">{badge.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{badge.slug}</p>
                          </div>
                        </div>
                        {badge.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{badge.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          <UIBadge variant="outline" className="text-xs">{badge.issuer_type}</UIBadge>
                          {!badge.is_active && <UIBadge variant="destructive" className="text-xs">Inactive</UIBadge>}
                          {badge.auto_issue && <UIBadge className="text-xs">Auto-issue</UIBadge>}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <Link to={`/platform-admin/badges/${badge.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              <Eye className="w-3 h-3 mr-1" /> Detail
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingId(badge.id)}>
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toggleActive(badge.id, badge.is_active)}>
                            {badge.is_active ? <><EyeOff className="w-3 h-3 mr-1" />Hide</> : <><Eye className="w-3 h-3 mr-1" />Show</>}
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => deleteBadgeType(badge.id, badge.name)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3 — RECIPIENTS
// ============================================================================

function RecipientsTab() {
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBadge, setFilterBadge] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);

    const [{ data: ubs }, { data: bts }] = await Promise.all([
      supabase
        .from('user_badges')
        .select('id, created_at, issuer_message, is_public, badge_type_id, recipient_user_id, issued_by_user_id')
        .not('recipient_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('badge_types').select('id, name, category, badge_color').order('name'),
    ]);

    setBadgeTypes(bts || []);

    const rawBadges = ubs || [];

    // Collect unique user IDs to fetch in bulk
    const recipientIds = [...new Set(rawBadges.map((r: any) => r.recipient_user_id).filter(Boolean))];
    const issuerIds = [...new Set(rawBadges.map((r: any) => r.issued_by_user_id).filter(Boolean))];

    const [{ data: recipients }, { data: issuers }] = await Promise.all([
      recipientIds.length
        ? supabase.from('users').select('id, name, email, avatar').in('id', recipientIds)
        : Promise.resolve({ data: [] }),
      issuerIds.length
        ? supabase.from('users').select('id, name').in('id', issuerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const recipientMap = Object.fromEntries((recipients || []).map((u: any) => [u.id, u]));
    const issuerMap = Object.fromEntries((issuers || []).map((u: any) => [u.id, u]));
    const badgeTypeMap = Object.fromEntries((bts || []).map((b: any) => [b.id, b]));

    const mapped: RecipientRow[] = rawBadges.map((r: any) => {
      const bt = badgeTypeMap[r.badge_type_id] || {};
      const rec = recipientMap[r.recipient_user_id] || {};
      const iss = issuerMap[r.issued_by_user_id] || {};
      return {
        id: r.id,
        created_at: r.created_at,
        issuer_message: r.issuer_message,
        is_public: r.is_public,
        badge_type_id: r.badge_type_id,
        badge_type_name: bt.name || 'Unknown',
        badge_type_color: bt.badge_color || '#6B7280',
        badge_type_category: bt.category || '',
        recipient_user_id: r.recipient_user_id,
        recipient_name: rec.name || 'Unknown',
        recipient_email: rec.email || '',
        recipient_avatar: rec.avatar || null,
        issuer_name: iss.name || null,
      };
    });

    setRows(mapped);
    setLoading(false);
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke badge from ${name}?`)) return;
    const { error } = await supabase.from('user_badges').delete().eq('id', id);
    if (error) return toast.error('Failed to revoke: ' + error.message);
    toast.success('Badge revoked');
    fetchData();
  }

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.recipient_email.toLowerCase().includes(search.toLowerCase());
    const matchBadge = !filterBadge || r.badge_type_id === filterBadge;
    return matchSearch && matchBadge;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 w-64"
          />
        </div>
        <select
          value={filterBadge}
          onChange={(e) => setFilterBadge(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All badge types</option>
          {badgeTypes.map((bt) => (
            <option key={bt.id} value={bt.id}>{bt.name}</option>
          ))}
        </select>
        {(search || filterBadge) && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterBadge(''); }}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        )}
        <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} award{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No badge awards found.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Badge</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Awarded</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Issued by</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={r.recipient_avatar || ''} />
                        <AvatarFallback className="text-xs">
                          {r.recipient_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">{r.recipient_name}</p>
                        <p className="text-xs text-gray-400">{r.recipient_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                        style={{ backgroundColor: r.badge_type_color }}
                      >
                        {categoryEmojis[r.badge_type_category] || '🏅'}
                      </div>
                      <span className="font-medium">{r.badge_type_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.issuer_name || 'System'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                      onClick={() => handleRevoke(r.id, r.recipient_name)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB 4 — PROGRESS
// ============================================================================

function ProgressTab() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [edgeFailed, setEdgeFailed] = useState(false);

  // Earned recipients (from user_badges)
  const [earnedUsers, setEarnedUsers] = useState<any[]>([]);
  // In-progress users (from edge function pathway enrollments)
  const [inProgressUsers, setInProgressUsers] = useState<ProgressEntry[]>([]);

  // Selected badge type metadata
  const selectedBadge = badgeTypes.find((b) => b.id === selectedBadgeId);

  useEffect(() => {
    supabase
      .from('badge_types')
      .select('id, name, category, badge_color, auto_issue_criteria')
      .order('name')
      .then(({ data }) => setBadgeTypes(data || []));
  }, []);

  useEffect(() => {
    if (!selectedBadgeId) return;
    loadProgress();
  }, [selectedBadgeId]);

  async function loadProgress() {
    setLoading(true);
    setEdgeFailed(false);
    setInProgressUsers([]);

    // 1. Earned: who already has this badge
    const { data: ubs } = await supabase
      .from('user_badges')
      .select('recipient_user_id, created_at')
      .eq('badge_type_id', selectedBadgeId)
      .not('recipient_user_id', 'is', null);

    const earnedRaw = ubs || [];
    const earnedUserIds = [...new Set(earnedRaw.map((r: any) => r.recipient_user_id).filter(Boolean))];
    const { data: earnedUserData } = earnedUserIds.length
      ? await supabase.from('users').select('id, name, email, avatar').in('id', earnedUserIds)
      : { data: [] };
    const earnedUserMap = Object.fromEntries((earnedUserData || []).map((u: any) => [u.id, u]));

    setEarnedUsers(
      earnedRaw.map((r: any) => {
        const u = earnedUserMap[r.recipient_user_id] || {};
        return {
          user_id: r.recipient_user_id,
          user_name: u.name || 'Unknown',
          user_email: u.email || '',
          user_avatar: u.avatar || null,
          earned_at: r.created_at,
        };
      })
    );

    const earnedIds = new Set((ubs || []).map((r: any) => r.recipient_user_id));

    // 2. Try edge function for in-progress enrollments
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session?.access_token || publicAnonKey}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch(`${EDGE_BASE}/pathways/admin/progress`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();

      // Filter to enrollments for pathways linked to this badge
      // (pathway_completion_badge_type_id = selectedBadgeId is stored in pathway data)
      const entries: ProgressEntry[] = (json.enrollments || [])
        .filter((e: any) =>
          e.pathway?.completion_badge_type_id === selectedBadgeId &&
          !earnedIds.has(e.enrollment?.user_id)
        )
        .map((e: any) => ({
          user_id: e.enrollment.user_id,
          user_name: e.user?.name || 'Unknown',
          user_email: e.user?.email || '',
          user_avatar: e.user?.avatar || null,
          status: (e.enrollment.progress_percentage >= 100 ? 'earned' : 'in_progress') as 'earned' | 'in_progress',
          progress_percentage: e.enrollment.progress_percentage || 0,
        }));

      setInProgressUsers(entries);
    } catch {
      setEdgeFailed(true);
    }

    setLoading(false);
  }

  const totalRecipients = earnedUsers.length;
  const totalInProgress = inProgressUsers.length;

  return (
    <div>
      {/* Badge selector */}
      <div className="mb-6 max-w-sm">
        <label className="block text-sm font-medium mb-1.5">Select Badge Type</label>
        <select
          value={selectedBadgeId}
          onChange={(e) => setSelectedBadgeId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Choose a badge...</option>
          {badgeTypes.map((b) => (
            <option key={b.id} value={b.id}>
              {categoryEmojis[b.category] || '🏅'} {b.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedBadgeId && (
        <div className="text-center py-16 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Select a badge type to see progress.</p>
        </div>
      )}

      {selectedBadgeId && loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {selectedBadgeId && !loading && (
        <div className="space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-5 flex items-center gap-4">
                <CheckCircle className="w-9 h-9 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{totalRecipients}</p>
                  <p className="text-sm text-green-600">Earned</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5 flex items-center gap-4">
                <Clock className="w-9 h-9 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{totalInProgress}</p>
                  <p className="text-sm text-blue-600">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="p-5 flex items-center gap-4">
                <Award className="w-9 h-9 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-gray-700">{totalRecipients + totalInProgress}</p>
                  <p className="text-sm text-gray-500">Total Engaged</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edge function notice */}
          {edgeFailed && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pathway progress data unavailable</p>
                <p className="text-amber-700 mt-0.5">
                  The pathway tracking service is not yet active. Earned recipients (below) are still accurate.
                  In-progress users will appear here once the pathway service is deployed.
                </p>
              </div>
            </div>
          )}

          {/* Earned users */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Earned ({totalRecipients})
            </h3>
            {earnedUsers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No one has earned this badge yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {earnedUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.user_avatar || ''} />
                      <AvatarFallback className="text-xs">
                        {u.user_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{u.user_name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.user_email}</p>
                    </div>
                    <UIBadge variant="outline" className="text-green-700 border-green-300 text-xs flex-shrink-0">
                      {new Date(u.earned_at).toLocaleDateString()}
                    </UIBadge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-progress users (only when edge function works) */}
          {!edgeFailed && inProgressUsers.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> In Progress ({totalInProgress})
              </h3>
              <div className="space-y-2">
                {inProgressUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.user_avatar || ''} />
                      <AvatarFallback className="text-xs">
                        {u.user_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{u.user_name}</p>
                      <p className="text-xs text-gray-400">{u.user_email}</p>
                    </div>
                    <div className="flex items-center gap-3 w-48 flex-shrink-0">
                      <Progress value={u.progress_percentage} className="h-2 flex-1" />
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {u.progress_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BADGE TYPE FORM (inline, used by Tab 1)
// ============================================================================

interface BadgeTypeFormProps {
  badgeType?: BadgeType;
  onSuccess: () => void;
  onCancel: () => void;
}

function BadgeTypeForm({ badgeType, onSuccess, onCancel }: BadgeTypeFormProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: badgeType?.name || '',
    slug: badgeType?.slug || '',
    description: badgeType?.description || '',
    category: badgeType?.category || ('achievement' as BadgeCategory),
    issuer_type: badgeType?.issuer_type || ('platform' as BadgeIssuerType),
    badge_color: badgeType?.badge_color || '#3B82F6',
    badge_image_url: badgeType?.badge_image_url || '',
    assignable_to: badgeType?.assignable_to || ['user', 'company'],
    auto_issue: badgeType?.auto_issue || false,
    is_active: badgeType?.is_active !== false,
  });

  function set(field: string, value: any) {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !badgeType) {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, badge_image_url: formData.badge_image_url || null };
    const query = badgeType
      ? supabase.from('badge_types').update(payload).eq('id', badgeType.id)
      : supabase.from('badge_types').insert([payload]);
    const { error } = await query;
    setSaving(false);
    if (error) return toast.error('Failed to save: ' + error.message);
    toast.success(badgeType ? 'Badge type updated' : 'Badge type created');
    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{badgeType ? 'Edit Badge Type' : 'Create New Badge Type'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input value={formData.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., AI Expert" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <Input value={formData.slug} onChange={(e) => set('slug', e.target.value)} placeholder="e.g., ai-expert" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="What does this badge represent?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select value={formData.category} onChange={(e) => set('category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="completion">Completion</option>
                <option value="endorsement">Endorsement</option>
                <option value="skill">Skill</option>
                <option value="verification">Verification</option>
                <option value="achievement">Achievement</option>
                <option value="membership">Membership</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Issuer Type *</label>
              <select value={formData.issuer_type} onChange={(e) => set('issuer_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                <option value="platform">Platform</option>
                <option value="admin">Admin</option>
                <option value="sponsor">Sponsor</option>
                <option value="program">Program</option>
                <option value="course">Course</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Badge Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={formData.badge_color} onChange={(e) => set('badge_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5" />
              <Input value={formData.badge_color} onChange={(e) => set('badge_color', e.target.value)} placeholder="#3B82F6" className="w-32" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Badge Image URL</label>
            <Input type="url" value={formData.badge_image_url} onChange={(e) => set('badge_image_url', e.target.value)} placeholder="https://example.com/badge.png" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Assignable To</label>
            <div className="flex gap-4">
              {['user', 'company'].map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assignable_to.includes(t)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...formData.assignable_to, t]
                        : formData.assignable_to.filter((x) => x !== t);
                      set('assignable_to', next);
                    }}
                  />
                  {t.charAt(0).toUpperCase() + t.slice(1)}s
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.auto_issue} onChange={(e) => set('auto_issue', e.target.checked)} />
              Auto-issue
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Active
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : badgeType ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
