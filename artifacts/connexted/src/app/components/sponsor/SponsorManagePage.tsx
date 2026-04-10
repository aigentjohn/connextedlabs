import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import SponsorMemberDialog from '@/app/components/admin/SponsorMemberDialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Trash2, GripVertical, Plus, Search, X,
  LayoutGrid, Mic, Presentation, FileText, Headphones,
  CheckSquare, BookOpen, QrCode, ExternalLink, Users,
} from 'lucide-react';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';

// ── Item types (same pattern as EventCompanionDetailPage, minus attendees) ──

const ITEM_TYPES = [
  { value: 'elevator',  label: 'Elevator',  icon: Mic,         table: 'elevators',  nameField: 'name',  slugField: 'slug', route: '/elevators',  builtin: false },
  { value: 'pitch',     label: 'Pitch',     icon: Presentation,table: 'pitches',    nameField: 'name',  slugField: 'slug', route: '/pitches',    builtin: false },
  { value: 'document',  label: 'Document',  icon: FileText,    table: 'documents',  nameField: 'title', slugField: 'id',   route: '/documents',  builtin: false },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare, table: 'checklists', nameField: 'name',  slugField: 'slug', route: '/checklists', builtin: false },
  { value: 'episode',   label: 'Episode',   icon: Headphones,  table: 'episodes',   nameField: 'title', slugField: 'id',   route: '/episodes',   builtin: false },
  { value: 'book',      label: 'Book',      icon: BookOpen,    table: 'books',      nameField: 'title', slugField: 'slug', route: '/books',      builtin: false },
  { value: 'qr_code',   label: 'QR Code',   icon: QrCode,      table: '',           nameField: '',      slugField: '',     route: '',            builtin: true  },
] as const;

interface SponsorItem {
  id: string;
  sponsor_id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  location_city: string | null;
  location_state: string | null;
  tier_id: string | null;
}

export default function SponsorManagePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [items, setItems] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  // Settings edit state
  const [editForm, setEditForm] = useState({
    name: '', tagline: '', description: '', logo_url: '',
    website_url: '', contact_email: '', location_city: '', location_state: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Item add state
  const [addingType, setAddingType] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrLabel, setQrLabel] = useState('');

  // Member dialog
  const [showMembers, setShowMembers] = useState(false);

  const checkAccess = useCallback(async (sponsorId: string) => {
    if (!profile) return false;
    if (profile.role === 'admin' || profile.role === 'super') return true;
    const { data } = await supabase
      .from('sponsor_members')
      .select('role')
      .eq('sponsor_id', sponsorId)
      .eq('user_id', profile.id)
      .maybeSingle();
    return data?.role != null && ['owner', 'admin', 'director'].includes(data.role);
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    try {
      const { data: sponsorData, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;

      const allowed = await checkAccess(sponsorData.id);
      if (!allowed) {
        toast.error('You do not have permission to manage this sponsor');
        navigate(`/sponsors/${slug}`);
        return;
      }

      setSponsor(sponsorData);
      setCanManage(true);
      setEditForm({
        name: sponsorData.name || '',
        tagline: sponsorData.tagline || '',
        description: sponsorData.description || '',
        logo_url: sponsorData.logo_url || '',
        website_url: sponsorData.website_url || '',
        contact_email: sponsorData.contact_email || '',
        location_city: sponsorData.location_city || '',
        location_state: sponsorData.location_state || '',
      });

      const { data: itemsData } = await supabase
        .from('sponsor_companion_items')
        .select('*')
        .eq('sponsor_id', sponsorData.id)
        .order('order_index');

      const resolved = await resolveItemNames(itemsData || []);
      setItems(resolved);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sponsor');
    } finally {
      setLoading(false);
    }
  }, [slug, checkAccess, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function resolveItemNames(rawItems: SponsorItem[]): Promise<SponsorItem[]> {
    const resolved: SponsorItem[] = [];
    for (const item of rawItems) {
      const typeConfig = ITEM_TYPES.find(t => t.value === item.item_type);
      if (typeConfig?.builtin) {
        resolved.push({ ...item, resolved_name: typeConfig.label });
        continue;
      }
      if (!typeConfig) {
        resolved.push({ ...item, resolved_name: `Unknown (${item.item_type})` });
        continue;
      }
      const { data } = await supabase
        .from(typeConfig.table)
        .select(`${typeConfig.nameField}, ${typeConfig.slugField}, description`)
        .eq('id', item.item_id)
        .single();
      resolved.push({
        ...item,
        resolved_name: data?.[typeConfig.nameField] || 'Unknown',
        resolved_description: data?.description || null,
        resolved_slug: data?.[typeConfig.slugField] || item.item_id,
      });
    }
    return resolved;
  }

  async function saveSettings() {
    if (!sponsor) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from('sponsors')
      .update({
        name: editForm.name.trim(),
        tagline: editForm.tagline.trim() || null,
        description: editForm.description.trim() || null,
        logo_url: editForm.logo_url.trim() || null,
        website_url: editForm.website_url.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        location_city: editForm.location_city.trim() || null,
        location_state: editForm.location_state.trim() || null,
      })
      .eq('id', sponsor.id);
    setSavingSettings(false);
    if (error) { toast.error('Failed to save'); return; }
    setSponsor(prev => prev ? { ...prev, ...editForm } : prev);
    toast.success('Settings saved');
  }

  function startAddItem(type: string) {
    const config = ITEM_TYPES.find(t => t.value === type);
    if (config?.builtin) {
      if (type === 'qr_code') {
        setQrUrl(''); setQrLabel(''); setAddingType('qr_code');
      }
      return;
    }
    setAddingType(type);
    setItemSearch('');
    loadAvailableItems(type);
  }

  async function loadAvailableItems(type: string) {
    const config = ITEM_TYPES.find(t => t.value === type);
    if (!config || config.builtin) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from(config.table)
      .select(`id, ${config.nameField}, ${config.slugField}`)
      .order(config.nameField);
    setAvailableItems(data || []);
    setLoadingItems(false);
  }

  async function addQRCodeItem() {
    if (!sponsor || !qrUrl.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    const { data, error } = await supabase
      .from('sponsor_companion_items')
      .insert({
        sponsor_id: sponsor.id,
        item_type: 'qr_code',
        item_id: sponsor.id,
        order_index: maxOrder,
        notes: JSON.stringify({ url: qrUrl.trim(), label: qrLabel.trim() || null }),
      })
      .select().single();
    if (error) { toast.error('Failed to add QR code'); return; }
    setAddingType(null); setQrUrl(''); setQrLabel('');
    const resolved = await resolveItemNames([data]);
    setItems(prev => [...prev, ...resolved]);
    toast.success('QR code added');
  }

  async function addItem(itemId: string) {
    if (!sponsor || !addingType) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    const { data, error } = await supabase
      .from('sponsor_companion_items')
      .insert({
        sponsor_id: sponsor.id,
        item_type: addingType,
        item_id: itemId,
        order_index: maxOrder,
      })
      .select().single();
    if (error) { toast.error('Failed to add item'); return; }
    setAddingType(null); setAvailableItems([]);
    const resolved = await resolveItemNames([data]);
    setItems(prev => [...prev, ...resolved]);
    toast.success('Item added');
  }

  async function removeItem(itemId: string) {
    const { error } = await supabase.from('sponsor_companion_items').delete().eq('id', itemId);
    if (error) { toast.error('Failed to remove'); return; }
    setItems(prev => prev.filter(i => i.id !== itemId));
    toast.success('Item removed');
  }

  function getItemRoute(item: SponsorItem) {
    const config = ITEM_TYPES.find(t => t.value === item.item_type);
    if (!config || config.builtin) return '#';
    return `${config.route}/${item.resolved_slug || item.item_id}`;
  }

  const alreadyAddedIds = items.map(i => i.item_id);
  const typeConfig = addingType ? ITEM_TYPES.find(t => t.value === addingType) : null;
  const filteredAvailable = availableItems.filter(item => {
    if (!itemSearch) return true;
    const nameField = (typeConfig as any)?.nameField || 'name';
    return item[nameField]?.toLowerCase().includes(itemSearch.toLowerCase());
  });

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
    </div>
  );

  if (!canManage || !sponsor) return null;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Sponsors', href: '/sponsors' },
        { label: sponsor.name, href: `/sponsors/${sponsor.slug}` },
        { label: 'Manage' },
      ]} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/sponsors/${sponsor.slug}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{sponsor.name} — Manage</h1>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowMembers(true)}>
          <Users className="w-4 h-4 mr-2" />
          Members
        </Button>
      </div>

      {/* ── Sponsor Content Items ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Sponsor Content</CardTitle>
            {!addingType && (
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button key={type.value} variant="outline" size="sm" onClick={() => startAddItem(type.value)}>
                      <Icon className="w-4 h-4 mr-1" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add item panel */}
          {addingType && typeConfig && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Add {typeConfig.label}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setAddingType(null); setAvailableItems([]); setQrUrl(''); setQrLabel(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {addingType === 'qr_code' ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">URL *</Label>
                    <Input value={qrUrl} onChange={e => setQrUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Label (optional)</Label>
                    <Input value={qrLabel} onChange={e => setQrLabel(e.target.value)} placeholder="e.g. Website, LinkedIn, Brochure..." className="mt-1" />
                  </div>
                  <Button size="sm" onClick={addQRCodeItem} disabled={!qrUrl.trim()}>Add QR Code</Button>
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${typeConfig.label.toLowerCase()}s...`}
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {loadingItems ? (
                    <Skeleton className="h-20" />
                  ) : filteredAvailable.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No {typeConfig.label.toLowerCase()}s found</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredAvailable.map(item => {
                        const already = alreadyAddedIds.includes(item.id);
                        const nameField = (typeConfig as any).nameField;
                        return (
                          <button
                            key={item.id}
                            disabled={already}
                            onClick={() => addItem(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              already ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            {item[nameField]}
                            {already && <span className="ml-2 text-xs">(already added)</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No content yet</p>
              <p className="text-sm text-gray-400 mt-1">Add pitches, documents, QR codes and more</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const typeConfig = ITEM_TYPES.find(t => t.value === item.item_type);
                const Icon = typeConfig?.icon || FileText;
                const typeLabel = typeConfig?.label || item.item_type;
                const isBuiltin = typeConfig?.builtin ?? false;

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <Icon className="w-4 h-4 text-indigo-500" />
                      <span className="flex-1 text-sm font-medium text-gray-700">
                        {typeLabel}
                        {item.item_type === 'qr_code' && (() => {
                          try {
                            const d = JSON.parse(item.notes || '{}');
                            return d.label ? <span className="ml-2 font-normal text-gray-500">— {d.label}</span> : null;
                          } catch { return null; }
                        })()}
                      </span>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500 h-7 w-7 p-0" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="px-3 py-3">
                      {isBuiltin && item.item_type === 'qr_code' && (() => {
                        let qrData = { url: '', label: '' };
                        try { qrData = JSON.parse(item.notes || '{}'); } catch {}
                        return qrData.url
                          ? <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                          : <p className="text-sm text-gray-400 py-2">No URL set.</p>;
                      })()}
                      {!isBuiltin && (
                        <Link to={getItemRoute(item)} className="group flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-900 group-hover:text-indigo-600">
                            {item.resolved_name}
                            <ExternalLink className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          {item.resolved_description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.resolved_description}</p>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sponsor Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle>Sponsor Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={editForm.tagline} onChange={e => setEditForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Short description" className="mt-1" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input value={editForm.contact_email} onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={editForm.website_url} onChange={e => setEditForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={editForm.logo_url} onChange={e => setEditForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Input value={editForm.location_city} onChange={e => setEditForm(f => ({ ...f, location_city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={editForm.location_state} onChange={e => setEditForm(f => ({ ...f, location_state: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="mt-1" />
          </div>
          <Button onClick={saveSettings} disabled={savingSettings}>
            <Save className="w-4 h-4 mr-2" />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Member dialog */}
      {sponsor && (
        <SponsorMemberDialog
          sponsorId={sponsor.id}
          sponsorName={sponsor.name}
          open={showMembers}
          onOpenChange={setShowMembers}
        />
      )}
    </div>
  );
}
