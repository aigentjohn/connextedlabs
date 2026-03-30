/**
 * Ticket Inventory Admin
 *
 * Create batches of inventory items from templates, view their status
 * (available / assigned / voided), and assign them to specific users.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Package, Plus, UserPlus, XCircle, Search, Filter, Loader2,
  Ticket, ArrowLeft, CheckCircle, Clock, Ban, ChevronDown,
  DollarSign, Hash, FileText, User, Users, ArrowRight, ListOrdered,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  templateApi, inventoryApi, waitlistApi,
  type TicketTemplate, type InventoryItem, type WaitlistEntry,
  formatCents, templateColor,
} from '@/services/ticketSystemService';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    available: { label: 'Available', icon: <CheckCircle className="w-3 h-3" />, cls: 'bg-green-100 text-green-800 border-green-200' },
    assigned:  { label: 'Assigned',  icon: <User className="w-3 h-3" />,        cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    voided:    { label: 'Voided',    icon: <Ban className="w-3 h-3" />,          cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }[status] || { label: status, icon: null, cls: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── User search ──────────────────────────────────────────────────────────────

interface UserSearchResult { id: string; name: string; email: string; avatar?: string }

function UserSearch({ onSelect }: { onSelect: (u: UserSearchResult) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const { data } = await supabase.from('users').select('id, name, email, avatar')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(8);
      setResults(data || []);
      setLoading(false);
    }, 300);
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-gray-400" />}
      </div>
      {results.length > 0 && (
        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); setQ(''); setResults([]); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
            >
              <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                {u.name?.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketInventoryAdmin() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedTemplateId = searchParams.get('template');

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId || '');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Waitlist state
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  // Track which panel is active: 'inventory' | 'waitlist'
  const [activePanel, setActivePanel] = useState<'inventory' | 'waitlist'>('inventory');
  // Waitlist entry being fulfilled (pre-fills the assign dialog)
  const [fulfillEntry, setFulfillEntry] = useState<WaitlistEntry | null>(null);
  // Bulk fulfillment state
  const [bulkFulfilling, setBulkFulfilling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Batch create dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchQty, setBatchQty] = useState(10);
  const [batchNotes, setBatchNotes] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  // Assign dialog
  const [assignTarget, setAssignTarget] = useState<InventoryItem | null>(null);
  const [assignUser, setAssignUser] = useState<UserSearchResult | null>(null);
  const [assignPrice, setAssignPrice] = useState<string>('');
  const [assignRef, setAssignRef] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  // True when assign was triggered from waitlist panel
  const [assignFromWaitlist, setAssignFromWaitlist] = useState(false);

  // Void confirm
  const [voidTarget, setVoidTarget] = useState<InventoryItem | null>(null);

  // ── Load templates ────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const { templates: data } = await templateApi.list();
      const active = data.filter(t => t.status !== 'archived');
      setTemplates(active);
      if (!selectedTemplateId && active.length > 0) {
        setSelectedTemplateId(active[0].id);
      }
    } catch (err: any) {
      toast.error(`Failed to load templates: ${err.message}`);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ── Load items for selected template ─────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!selectedTemplateId) return;
    try {
      setLoadingItems(true);
      const { items: data } = await inventoryApi.listByTemplate(selectedTemplateId);
      setItems(data.sort((a, b) => a.serialNumber.localeCompare(b.serialNumber)));
    } catch (err: any) {
      toast.error(`Failed to load inventory: ${err.message}`);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedTemplateId]);

  // ── Load waitlist for selected template ───────────────────────────────────
  const loadWaitlist = useCallback(async () => {
    if (!selectedTemplateId) return;
    try {
      setLoadingWaitlist(true);
      const { list } = await waitlistApi.getForTemplate(selectedTemplateId);
      setWaitlist(list);
    } catch (err: any) {
      // Non-fatal: waitlist may not exist yet
      setWaitlist([]);
    } finally {
      setLoadingWaitlist(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadItems(); loadWaitlist(); }, [loadItems, loadWaitlist]);

  // ── Batch create ──────────────────────────────────────────────────────────
  const handleBatchCreate = async () => {
    if (!selectedTemplateId) return;
    try {
      setBatchSaving(true);
      const { count } = await inventoryApi.createBatch({
        templateId: selectedTemplateId,
        quantity: batchQty,
        notes: batchNotes || undefined,
      });
      toast.success(`Created ${count} inventory tickets`);
      setBatchOpen(false);
      setBatchQty(10);
      setBatchNotes('');
      loadItems();
      loadTemplates();
    } catch (err: any) {
      toast.error(`Batch create failed: ${err.message}`);
    } finally {
      setBatchSaving(false);
    }
  };

  // ── Open assign dialog (manual) ───────────────────────────────────────────
  const openAssign = (item: InventoryItem) => {
    const tmpl = templates.find(t => t.id === item.templateId);
    setAssignTarget(item);
    setAssignUser(null);
    setAssignPrice(tmpl ? String(tmpl.faceValueCents) : '0');
    setAssignRef('');
    setAssignNotes('');
    setAssignFromWaitlist(false);
    setFulfillEntry(null);
  };

  // ── Open assign dialog pre-filled from waitlist ───────────────────────────
  const openFulfill = (entry: WaitlistEntry) => {
    // Find the first available ticket
    const available = items.find(i => i.status === 'available');
    if (!available) {
      toast.error('No available tickets to assign. Create a batch first.');
      return;
    }
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    setAssignTarget(available);
    setAssignUser({ id: entry.userId, name: entry.name, email: entry.email });
    setAssignPrice(tmpl ? String(tmpl.faceValueCents) : '0');
    setAssignRef('');
    setAssignNotes(`Fulfilled from waitlist (joined ${new Date(entry.joinedAt).toLocaleDateString()})`);
    setAssignFromWaitlist(true);
    setFulfillEntry(entry);
  };

  // ── Bulk fulfill: assigns the next N available tickets to the top N waitlisted users ──
  const handleBulkFulfill = async () => {
    const canFulfill = Math.min(stats.available, waitlist.length);
    if (canFulfill === 0) return;
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    const availableItems = items.filter(i => i.status === 'available').slice(0, canFulfill);
    const topWaiters = waitlist.slice(0, canFulfill);

    try {
      setBulkFulfilling(true);
      setBulkProgress({ done: 0, total: canFulfill });

      for (let i = 0; i < canFulfill; i++) {
        const item = availableItems[i];
        const entry = topWaiters[i];
        await inventoryApi.assign(item.id, {
          userId: entry.userId,
          pricePaidCents: tmpl?.faceValueCents ?? 0,
          notes: `Bulk fulfilled from waitlist (position ${entry.position})`,
          removeFromWaitlist: true,
        });
        setBulkProgress({ done: i + 1, total: canFulfill });
      }

      toast.success(`Fulfilled ${canFulfill} waitlist entr${canFulfill === 1 ? 'y' : 'ies'} — tickets assigned and notifications sent.`);
      loadItems();
      loadTemplates();
      loadWaitlist();
    } catch (err: any) {
      toast.error(`Bulk fulfillment failed at step ${bulkProgress?.done ?? 0 + 1}: ${err.message}`);
      loadItems();
      loadWaitlist();
    } finally {
      setBulkFulfilling(false);
      setBulkProgress(null);
    }
  };

  // ── Assign ────────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!assignTarget || !assignUser) { toast.error('Select a user first'); return; }
    try {
      setAssigning(true);
      await inventoryApi.assign(assignTarget.id, {
        userId: assignUser.id,
        pricePaidCents: assignPrice !== '' ? Number(assignPrice) : undefined,
        paymentReference: assignRef || undefined,
        notes: assignNotes || undefined,
        removeFromWaitlist: assignFromWaitlist,
      });
      toast.success(`Ticket ${assignTarget.serialNumber} assigned to ${assignUser.name}${assignFromWaitlist ? ' — removed from waitlist' : ''}`);
      setAssignTarget(null);
      setFulfillEntry(null);
      setAssignFromWaitlist(false);
      loadItems();
      loadTemplates();
      loadWaitlist();
    } catch (err: any) {
      toast.error(`Assign failed: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  // ── Void ──────────────────────────────────────────────────────────────────
  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await inventoryApi.void(voidTarget.id);
      toast.success(`Ticket ${voidTarget.serialNumber} voided`);
      setVoidTarget(null);
      loadItems();
    } catch (err: any) {
      toast.error(`Void failed: ${err.message}`);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const colors = selectedTemplate ? templateColor(selectedTemplate.color) : templateColor('indigo');

  // Filter items
  const filtered = items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!item.serialNumber.toLowerCase().includes(s) &&
        !item.assignedToName?.toLowerCase().includes(s) &&
        !item.assignedToEmail?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'available').length,
    assigned: items.filter(i => i.status === 'assigned').length,
    voided: items.filter(i => i.status === 'voided').length,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/platform-admin/ticket-templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </Link>
      </div>
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Ticket Templates', path: '/platform-admin/ticket-templates' },
        { label: 'Inventory' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Ticket Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            Create batches of individual ticket units. Sell offline, then assign to a user.
          </p>
        </div>
        <Button onClick={() => setBatchOpen(true)} disabled={!selectedTemplateId}>
          <Plus className="w-4 h-4 mr-2" />
          Create Batch
        </Button>
      </div>

      {/* Template selector */}
      {loadingTemplates ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading templates…
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-3">No ticket templates yet.</p>
            <Link to="/platform-admin/ticket-templates">
              <Button variant="outline">
                <Ticket className="w-4 h-4 mr-2" />
                Create a Template First
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {templates.map(t => {
            const c = templateColor(t.color);
            const isSelected = t.id === selectedTemplateId;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  isSelected ? `${c.bg} ${c.text} ${c.border} border-2` : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {t.name}
                {' '}
                <span className={`text-xs ${isSelected ? c.text : 'text-gray-400'}`}>
                  ({(t.inventoryCount || 0) - (t.assignedCount || 0)} avail.)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedTemplate && (
        <>
          {/* Stats row — also shows waitlist demand */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'gray' },
              { label: 'Available', value: stats.available, color: 'green' },
              { label: 'Assigned', value: stats.assigned, color: 'blue' },
              { label: 'Voided', value: stats.voided, color: 'gray' },
              { label: 'Waitlisted', value: waitlist.length, color: 'amber' },
            ].map(s => (
              <Card key={s.label} className={`text-center cursor-pointer transition-all ${
                s.label === 'Waitlisted' && waitlist.length > 0 ? 'border-amber-300 bg-amber-50/40' : ''
              }`}
                onClick={() => s.label === 'Waitlisted' && setActivePanel(activePanel === 'waitlist' ? 'inventory' : 'waitlist')}
              >
                <CardContent className="py-3">
                  <div className={`text-2xl font-bold ${s.label === 'Waitlisted' && waitlist.length > 0 ? 'text-amber-700' : ''}`}>
                    {s.value}
                  </div>
                  <div className={`text-xs ${s.label === 'Waitlisted' && waitlist.length > 0 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                    {s.label}
                    {s.label === 'Waitlisted' && waitlist.length > 0 && ' ↑'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Panel toggle tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActivePanel('inventory')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activePanel === 'inventory'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Inventory ({stats.total})
            </button>
            <button
              onClick={() => setActivePanel('waitlist')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activePanel === 'waitlist'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListOrdered className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Waitlist ({waitlist.length})
              {waitlist.length > 0 && stats.available === 0 && (
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">needs stock</span>
              )}
              {waitlist.length > 0 && stats.available > 0 && (
                <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">ready to fulfill</span>
              )}
            </button>
          </div>

          {/* ── INVENTORY PANEL ── */}
          {activePanel === 'inventory' && (
            <>
              {/* Filters */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search serial or user…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({stats.total})</SelectItem>
                    <SelectItem value="available">Available ({stats.available})</SelectItem>
                    <SelectItem value="assigned">Assigned ({stats.assigned})</SelectItem>
                    <SelectItem value="voided">Voided ({stats.voided})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingItems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">
                      {items.length === 0 ? 'No inventory yet. Create a batch to get started.' : 'No tickets match your filter.'}
                    </p>
                    {items.length === 0 && (
                      <Button onClick={() => setBatchOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Batch
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Serial</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Assigned To</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Price Paid</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ref / Notes</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {item.serialNumber}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-2.5">
                            {item.assignedToName ? (
                              <div>
                                <div className="font-medium">{item.assignedToName}</div>
                                <div className="text-xs text-gray-500">{item.assignedToEmail}</div>
                                {item.assignedAt && (
                                  <div className="text-xs text-gray-400">
                                    {new Date(item.assignedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {item.pricePaidCents != null
                              ? <span className="font-medium">{formatCents(item.pricePaidCents)}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 max-w-[160px]">
                            {item.paymentReference && (
                              <div className="text-xs text-gray-600 truncate">{item.paymentReference}</div>
                            )}
                            {item.notes && (
                              <div className="text-xs text-gray-400 truncate">{item.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex gap-1 justify-end">
                              {item.status === 'available' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => openAssign(item)}
                                >
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  Assign
                                </Button>
                              )}
                              {item.status !== 'voided' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => setVoidTarget(item)}
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── WAITLIST PANEL ── */}
          {activePanel === 'waitlist' && (
            <div className="space-y-3">
              {/* Fulfillment context banner */}
              {waitlist.length > 0 && (
                <div className={`rounded-lg border p-3 text-sm flex items-start gap-3 ${
                  stats.available > 0
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="mt-0.5">
                    {stats.available > 0
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <Clock className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    {stats.available > 0 ? (
                      <>
                        <strong>{stats.available} ticket{stats.available !== 1 ? 's' : ''} available</strong> to assign.
                        Fulfill individually below, or use{' '}
                        <strong>Fulfill Next {Math.min(stats.available, waitlist.length)}</strong> to batch-assign in queue order.
                      </>
                    ) : (
                      <>
                        <strong>No inventory available.</strong>{' '}
                        <button
                          onClick={() => { setActivePanel('inventory'); setBatchOpen(true); }}
                          className="underline font-medium"
                        >
                          Create a batch
                        </button>
                        {' '}first, then come back to fulfill.
                      </>
                    )}
                  </div>
                  {stats.available > 0 && (
                    <Button
                      size="sm"
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                      onClick={handleBulkFulfill}
                      disabled={bulkFulfilling}
                    >
                      {bulkFulfilling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : '...'}
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 mr-1.5" />
                          Fulfill Next {Math.min(stats.available, waitlist.length)}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {loadingWaitlist ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : waitlist.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No one is waiting</p>
                    <p className="text-gray-400 text-sm mt-1">
                      When users join the waitlist for this template's linked container,<br />
                      they'll appear here in queue order.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 border-b border-amber-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-amber-800 w-12">#</th>
                        <th className="text-left px-4 py-2.5 font-medium text-amber-800">User</th>
                        <th className="text-left px-4 py-2.5 font-medium text-amber-800">Joined</th>
                        <th className="text-left px-4 py-2.5 font-medium text-amber-800">Container</th>
                        <th className="text-right px-4 py-2.5 font-medium text-amber-800">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {waitlist.map((entry, idx) => (
                        <tr key={entry.userId} className={`hover:bg-amber-50/40 ${idx === 0 ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              idx === 0 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {entry.position}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {entry.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="font-medium">{entry.name}</div>
                                <div className="text-xs text-gray-500">{entry.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(entry.joinedAt).toLocaleDateString()}<br />
                            <span className="text-gray-400">
                              {Math.floor((Date.now() - new Date(entry.joinedAt).getTime()) / 86400000)}d ago
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {entry.containerName ? (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {entry.containerName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{entry.containerType}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              className={`h-7 text-xs ${
                                stats.available > 0
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : ''
                              }`}
                              variant={stats.available > 0 ? 'default' : 'outline'}
                              disabled={stats.available === 0}
                              onClick={() => openFulfill(entry)}
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Fulfill
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Batch Create Dialog ── */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Inventory Batch</DialogTitle>
            <DialogDescription>
              Generate new ticket units from <strong>{selectedTemplate?.name}</strong>.
              Each unit gets a unique serial number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Quantity (1–500)</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={batchQty}
                onChange={e => setBatchQty(Number(e.target.value))}
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Serials: {selectedTemplate?.serialPrefix}-{new Date().getFullYear()}-
                {String((selectedTemplate?.inventoryCount || 0) + 1).padStart(4, '0')} →
                {String((selectedTemplate?.inventoryCount || 0) + batchQty).padStart(4, '0')}
              </p>
            </div>
            <div>
              <Label>Batch Notes (optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Spring 2026 cohort batch, Event pre-sale"
                value={batchNotes}
                onChange={e => setBatchNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button onClick={handleBatchCreate} disabled={batchSaving}>
              {batchSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create {batchQty} Tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={!!assignTarget} onOpenChange={o => { if (!o) { setAssignTarget(null); setFulfillEntry(null); setAssignFromWaitlist(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {assignFromWaitlist ? 'Fulfill Waitlist Entry' : 'Assign Ticket'}
            </DialogTitle>
            <DialogDescription>
              {assignFromWaitlist ? (
                <>
                  Assigning <strong className="font-mono">{assignTarget?.serialNumber}</strong> to the next person in the queue.
                  They will be automatically removed from the waitlist.
                </>
              ) : (
                <>
                  Assign <strong className="font-mono">{assignTarget?.serialNumber}</strong> to a user.
                  This creates their access ticket immediately.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Waitlist fulfillment banner */}
          {assignFromWaitlist && fulfillEntry && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Queue position <strong>#{fulfillEntry.position}</strong> · waiting since{' '}
                <strong>{new Date(fulfillEntry.joinedAt).toLocaleDateString()}</strong>
              </span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* User */}
            <div>
              <Label>Recipient *</Label>
              {assignUser ? (
                <div className="flex items-center gap-2 mt-1 p-2 border rounded-lg">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {assignUser.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{assignUser.name}</div>
                    <div className="text-xs text-gray-500">{assignUser.email}</div>
                  </div>
                  {!assignFromWaitlist && (
                    <button onClick={() => setAssignUser(null)} className="text-gray-400 hover:text-gray-600">×</button>
                  )}
                </div>
              ) : (
                <div className="mt-1">
                  <UserSearch onSelect={setAssignUser} />
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <Label>Price Paid (cents)</Label>
              <Input
                type="number"
                min={0}
                value={assignPrice}
                onChange={e => setAssignPrice(e.target.value)}
                placeholder={selectedTemplate ? String(selectedTemplate.faceValueCents) : '0'}
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Face value: {selectedTemplate ? formatCents(selectedTemplate.faceValueCents) : '—'}
                {assignPrice !== '' && Number(assignPrice) !== selectedTemplate?.faceValueCents && (
                  <span className="ml-2 text-amber-600">
                    ({Number(assignPrice) === 0 ? 'Free / comp' : formatCents(Number(assignPrice))})
                  </span>
                )}
              </p>
            </div>

            {/* Payment reference */}
            <div>
              <Label>Payment Reference</Label>
              <Input
                placeholder="Invoice INV-2026-042, PayPal txn #123, Bank transfer Mar 9…"
                value={assignRef}
                onChange={e => setAssignRef(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (internal)</Label>
              <Textarea
                rows={2}
                placeholder="Any context about this assignment"
                value={assignNotes}
                onChange={e => setAssignNotes(e.target.value)}
              />
            </div>

            {/* Summary */}
            {assignUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium text-blue-900">On confirm:</div>
                <ul className="text-blue-800 space-y-0.5 text-xs">
                  <li>• Ticket <span className="font-mono">{assignTarget?.serialNumber}</span> marked as assigned</li>
                  <li>• Access ticket created for <strong>{assignUser.name}</strong></li>
                  <li>• They can immediately access the unlocked content</li>
                  {assignFromWaitlist && (
                    <li>• <strong>{assignUser.name}</strong> removed from the waitlist queue</li>
                  )}
                  {selectedTemplate?.unlocks?.userClass && (
                    <li>• User class upgraded to {selectedTemplate.unlocks.userClass}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignTarget(null); setFulfillEntry(null); setAssignFromWaitlist(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning || !assignUser}>
              {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {assignFromWaitlist ? (
                <><ArrowRight className="w-4 h-4 mr-2" />Fulfill & Remove from Queue</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Assign Ticket</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Void Confirm ── */}
      <AlertDialog open={!!voidTarget} onOpenChange={o => { if (!o) setVoidTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-mono">{voidTarget?.serialNumber}</strong>
              {voidTarget?.status === 'assigned' && ` is currently assigned to ${voidTarget.assignedToName}.`}
              {' '}This will revoke their access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-red-600 hover:bg-red-700">
              Void Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}