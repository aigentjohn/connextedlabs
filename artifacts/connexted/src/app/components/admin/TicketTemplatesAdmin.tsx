/**
 * Ticket Templates Admin
 *
 * Manage ticket template "product definitions" — the preconfigured blueprints
 * from which inventory batches are generated and sold.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
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
  Ticket, Plus, Edit2, Archive, Package, DollarSign, Clock, Users,
  Layers, ChevronRight, ArrowLeft, Loader2, Tag, ShieldCheck, Store,
  Search, CheckCircle2, X, Link2, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  templateApi, type TicketTemplate, type TicketTemplateUnlocks,
  formatCents, expiryLabel, templateColor,
} from '@/services/ticketSystemService';

// ─── Container type config ────────────────────────────────────────────────────

const CONTAINER_TYPES = [
  { value: 'program',               label: 'Program',               table: 'programs',         nameField: 'name',  idField: 'id' },
  { value: 'course',                label: 'Course',                table: 'courses',           nameField: 'title', idField: 'id' },
  { value: 'marketplace_offering',  label: 'Marketplace Offering',  table: 'market_offerings',  nameField: 'name',  idField: 'id' },
];

// ─── Container Search ─────────────────────────────────────────────────────────

interface ContainerResult { id: string; name: string }

interface ContainerSearchProps {
  containerType: string;
  selectedId: string;
  selectedName: string;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}

function ContainerSearch({ containerType, selectedId, selectedName, onSelect, onClear }: ContainerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContainerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const cfg = CONTAINER_TYPES.find(t => t.value === containerType);

  useEffect(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  }, [containerType]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!cfg || query.trim().length < 2) { setResults([]); setShowResults(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from(cfg.table)
          .select(`${cfg.idField}, ${cfg.nameField}`)
          .ilike(cfg.nameField, `%${query.trim()}%`)
          .limit(8);
        setResults((data || []).map((r: any) => ({ id: r[cfg.idField], name: r[cfg.nameField] })));
        setShowResults(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, cfg]);

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 mt-1 p-2 border border-green-200 bg-green-50 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-green-900 truncate">{selectedName}</div>
          <div className="font-mono text-xs text-green-700 truncate">{selectedId}</div>
        </div>
        <button onClick={onClear} className="text-green-600 hover:text-green-800 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <Input
          className="pl-9"
          placeholder={`Search ${cfg?.label || containerType} by name…`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-2.5 animate-spin text-gray-400" />}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm transition-colors"
              onClick={() => {
                onSelect(r.id, r.name);
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
            >
              <div className="font-medium truncate">{r.name}</div>
              <div className="font-mono text-xs text-gray-400 truncate">{r.id}</div>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && !loading && query.trim().length >= 2 && (
        <p className="text-xs text-gray-400 px-1">No results found for "{query}"</p>
      )}
      {!showResults && (
        <p className="text-xs text-gray-400 px-1">Type at least 2 characters to search</p>
      )}
    </div>
  );
}

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyForm(): Partial<TicketTemplate> {
  return {
    name: '',
    description: '',
    color: 'indigo',
    unlocks: { type: 'container', containerType: 'program', containerId: '', containerName: '' },
    faceValueCents: 0,
    currency: 'USD',
    expiryType: 'never',
    expiryDate: null,
    expiryMonths: null,
    ticketType: 'paid',
    acquisitionSource: 'admin_grant',
    serialPrefix: 'CONN',
    capabilities: {},
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TicketTemplatesAdmin() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TicketTemplate | null>(null);
  const [form, setForm] = useState<Partial<TicketTemplate>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<TicketTemplate | null>(null);

  // Marketplace offerings
  const [offerings, setOfferings] = useState<Array<{ id: string; name: string; slug: string; kit_product_id?: string | null }>>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { templates: data } = await templateApi.list();
      setTemplates(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      console.error('Failed to load templates - full error:', err);
      toast.error(`Failed to load templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
    loadOfferings();
  };

  const openEdit = (t: TicketTemplate) => {
    setEditing(t);
    setForm({ ...t });
    setFormOpen(true);
    loadOfferings();
  };

  const loadOfferings = async () => {
    try {
      setLoadingOfferings(true);
      const { data, error } = await supabase
        .from('market_offerings')
        .select('id, name, slug, kit_product_id')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setOfferings(data || []);
    } catch (err: any) {
      console.warn('Could not load offerings:', err);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const setUnlocks = (patch: Partial<TicketTemplateUnlocks>) => {
    setForm(f => ({ ...f, unlocks: { ...f.unlocks!, ...patch } as TicketTemplateUnlocks }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Template name is required'); return; }
    try {
      setSaving(true);
      if (editing) {
        await templateApi.update(editing.id, form);
        toast.success('Template updated');
      } else {
        await templateApi.create(form);
        toast.success('Template created');
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await templateApi.archive(archiveTarget.id);
      toast.success('Template archived');
      setArchiveTarget(null);
      load();
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return <div className="p-8 text-center text-gray-500">Admin access required.</div>;
  }

  const visible = templates.filter(t => showArchived || t.status !== 'archived');

  // ── Stats ─────────────────────────────────────────────────────────────────
  const active = templates.filter(t => t.status === 'active');
  const totalInventory = active.reduce((s, t) => s + (t.inventoryCount || 0), 0);
  const totalAssigned = active.reduce((s, t) => s + (t.assignedCount || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Admin
          </Button>
        </Link>
      </div>
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Ticket Templates' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" />
            Ticket Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Preconfigure access passes and membership upgrades for courses and programs.
            Create inventory batches from templates and assign them to buyers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/platform-admin/ticket-inventory">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </Button>
          </Link>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Layers className="w-5 h-5 text-indigo-500" />, label: 'Active Templates', value: active.length },
          { icon: <Package className="w-5 h-5 text-blue-500" />, label: 'Total Inventory', value: totalInventory },
          { icon: <Users className="w-5 h-5 text-green-500" />, label: 'Assigned', value: totalAssigned },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5 flex items-center gap-3">
              {s.icon}
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{visible.length} template{visible.length !== 1 ? 's' : ''}</span>
        <button
          className="text-sm text-indigo-600 hover:underline"
          onClick={() => setShowArchived(s => !s)}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No ticket templates yet.</p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(t => {
            const colors = templateColor(t.color);
            const available = (t.inventoryCount || 0) - (t.assignedCount || 0);
            return (
              <Card key={t.id} className={`border-2 ${colors.border} ${t.status === 'archived' ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Ticket className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex gap-1">
                      {t.status === 'archived' && <Badge variant="outline">Archived</Badge>}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {t.status !== 'archived' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setArchiveTarget(t)}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{t.name}</CardTitle>
                  {t.description && <CardDescription className="text-xs line-clamp-2">{t.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Unlock info */}
                  <div className={`text-xs rounded px-2 py-1.5 ${colors.bg} ${colors.text} font-medium flex items-center gap-1.5`}>
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    {t.unlocks?.type === 'user_class'
                      ? `Upgrades to Class ${t.unlocks.userClass}`
                      : t.unlocks?.containerName || `${t.unlocks?.containerType} access`}
                  </div>

                  {/* Marketplace offering link */}
                  {t.offeringName && (
                    <div className="text-xs rounded px-2 py-1.5 bg-blue-50 text-blue-700 font-medium flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t.offeringName}</span>
                    </div>
                  )}

                  {/* Pricing & expiry */}
                  <div className="flex gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {t.faceValueCents ? formatCents(t.faceValueCents) : 'Free'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expiryLabel(t)}
                    </span>
                  </div>

                  {/* Inventory status */}
                  <div className="flex justify-between items-center text-xs border-t pt-2">
                    <span className="text-gray-500">
                      <span className="font-medium text-gray-800">{available}</span> available
                      {' · '}
                      <span className="font-medium text-gray-800">{t.assignedCount || 0}</span> assigned
                    </span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs py-0">{t.serialPrefix}-****</Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <Link to={`/platform-admin/ticket-inventory?template=${t.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                      Manage Inventory
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Ticket Template'}</DialogTitle>
            <DialogDescription>
              Define a reusable access pass. Create inventory batches from this template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g. Spring Cohort Pass, All-Access Founder Ticket"
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What does this ticket grant? Who is it for?"
                  rows={2}
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* What it unlocks */}
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                What This Ticket Unlocks
              </h4>
              <div>
                <Label>Unlock Type</Label>
                <Select
                  value={form.unlocks?.type || 'container'}
                  onValueChange={v => setUnlocks({ type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="container">Specific Container (course or program)</SelectItem>
                    <SelectItem value="user_class">User Class Upgrade (platform-wide access level)</SelectItem>
                    <SelectItem value="bundle">Bundle (multiple items)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.unlocks?.type === 'container' && (
                <div className="space-y-3">
                  <div>
                    <Label>Container Type</Label>
                    <Select
                      value={form.unlocks?.containerType || 'program'}
                      onValueChange={v => setUnlocks({ containerType: v, containerId: '', containerName: '' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTAINER_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Search & Select Container</Label>
                    <ContainerSearch
                      containerType={form.unlocks?.containerType || 'program'}
                      selectedId={form.unlocks?.containerId || ''}
                      selectedName={form.unlocks?.containerName || ''}
                      onSelect={(id, name) => setUnlocks({ containerId: id, containerName: name })}
                      onClear={() => setUnlocks({ containerId: '', containerName: '' })}
                    />
                  </div>
                  <div>
                    <Label>Display Name Override <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input
                      placeholder="Leave blank to use the container's own name"
                      value={form.unlocks?.containerName || ''}
                      onChange={e => setUnlocks({ containerName: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-0.5">
                      Override the label shown to users on the waitlist block and ticket card.
                    </p>
                  </div>
                </div>
              )}

              {form.unlocks?.type === 'user_class' && (
                <div>
                  <Label>Target User Class (1–10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.unlocks?.userClass || ''}
                    onChange={e => setUnlocks({ userClass: Number(e.target.value) })}
                    placeholder="e.g. 5"
                  />
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
              <h4 className="col-span-2 font-medium text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Pricing
              </h4>
              <div>
                <Label>Face Value (cents)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.faceValueCents ?? 0}
                  onChange={e => setForm(f => ({ ...f, faceValueCents: Number(e.target.value) }))}
                  placeholder="29900 = $299.00"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  {form.faceValueCents ? formatCents(form.faceValueCents) : 'Free'}
                </p>
              </div>
              <div>
                <Label>Ticket Type</Label>
                <Select
                  value={form.ticketType || 'paid'}
                  onValueChange={v => setForm(f => ({ ...f, ticketType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="scholarship">Scholarship</SelectItem>
                    <SelectItem value="gifted">Gifted</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="membership_included">Membership Included</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expiry */}
            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
              <h4 className="col-span-2 font-medium text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Expiry
              </h4>
              <div className="col-span-2">
                <Label>Expiry Type</Label>
                <Select
                  value={form.expiryType || 'never'}
                  onValueChange={v => setForm(f => ({ ...f, expiryType: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="months_from_assignment">X months from assignment date</SelectItem>
                    <SelectItem value="fixed_date">Fixed calendar date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.expiryType === 'months_from_assignment' && (
                <div>
                  <Label>Months</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.expiryMonths || ''}
                    onChange={e => setForm(f => ({ ...f, expiryMonths: Number(e.target.value) }))}
                    placeholder="12"
                  />
                </div>
              )}
              {form.expiryType === 'fixed_date' && (
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={form.expiryDate?.substring(0, 10) || ''}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  />
                </div>
              )}
            </div>

            {/* Appearance & serial */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial Prefix</Label>
                <Input
                  maxLength={8}
                  placeholder="CONN"
                  value={form.serialPrefix || ''}
                  onChange={e => setForm(f => ({ ...f, serialPrefix: e.target.value.toUpperCase() }))}
                />
                <p className="text-xs text-gray-400 mt-0.5">e.g. CONN → CONN-2026-0001</p>
              </div>
              <div>
                <Label>Color Theme</Label>
                <Select value={form.color || 'indigo'} onValueChange={v => setForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['indigo', 'blue', 'green', 'amber', 'rose', 'purple', 'teal', 'orange'].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Marketplace Offering Correlation (Optional) */}
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                Marketplace Offering (Optional)
              </h4>
              <p className="text-xs text-gray-600">
                Link this ticket template to a marketplace offering to create a purchase → access flow.
                When an offering is selected, its Kit Product ID is auto-copied to this template
                so the purchase webhook can route to the correct inventory in a single scan.
              </p>
              <div>
                <Label>Select Offering</Label>
                {loadingOfferings ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading offerings...
                  </div>
                ) : (
                  <Select
                    value={form.offeringId || 'none'}
                    onValueChange={v => {
                      if (v === 'none') {
                        setForm(f => ({ ...f, offeringId: null, offeringName: null, kitProductId: null }));
                      } else {
                        const offering = offerings.find(o => o.id === v);
                        // Auto-copy the offering's Kit Product ID onto the template
                        // so the webhook can do a single KV scan without a Supabase round-trip.
                        setForm(f => ({
                          ...f,
                          offeringId: v,
                          offeringName: offering?.name || null,
                          kitProductId: offering?.kit_product_id || f.kitProductId || null,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an offering…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-500">No offering linked</span>
                      </SelectItem>
                      {offerings.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          <span className="text-gray-400 text-xs">No active offerings found</span>
                        </SelectItem>
                      ) : (
                        offerings.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            <div className="flex items-center gap-2">
                              <span>{o.name}</span>
                              {o.kit_product_id && (
                                <span className="text-xs font-mono text-green-700 bg-green-100 px-1 rounded">
                                  Kit #{o.kit_product_id}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {form.offeringId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Linked to: <span className="font-medium text-gray-700">{form.offeringName}</span>
                  </p>
                )}
              </div>

              {/* Kit Product ID — editable, auto-filled from offering */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Kit Product ID
                  <span className="text-xs font-normal text-gray-400 ml-1">(for fast webhook routing)</span>
                </Label>
                <Input
                  className="font-mono mt-1"
                  placeholder="e.g. 456789 — auto-filled from offering"
                  value={(form as any).kitProductId || ''}
                  onChange={e => setForm(f => ({ ...f, kitProductId: e.target.value || null } as any))}
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  When a Kit purchase webhook arrives with this product ID, an inventory ticket
                  from this template is auto-assigned. Auto-copied from the offering's Kit Product ID
                  — only edit manually if linking a different Kit product.
                </p>
                {(form as any).kitProductId && !(form.offeringId) && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    <Link2 className="w-3 h-3" />
                    No offering linked. Consider linking an offering so the public WaitlistBlock appears on the offering profile.
                  </div>
                )}
                {(form as any).kitProductId && form.offeringId && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Full chain connected: Kit product → offering → template → inventory
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirm */}
      <AlertDialog open={!!archiveTarget} onOpenChange={o => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveTarget?.name}" will be archived. Existing inventory and access tickets are unaffected.
              You can still view assigned tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-red-600 hover:bg-red-700">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}