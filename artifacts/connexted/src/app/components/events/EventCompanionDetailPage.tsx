import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CalendarDays,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Edit2,
  Save,
  X,
  ExternalLink,
  FileText,
  Search,
} from 'lucide-react';
import { CompanionQRCode } from './CompanionQRCode';
import { CompanionAttendees } from './CompanionAttendees';
import { getTypesForContext, getCompanionItemType } from '@/lib/companion-types';

interface CompanionItem {
  id: string;
  companion_id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

interface EventCompanion {
  id: string;
  name: string;
  event_id: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  event?: { id: string; title: string; start_time: string } | null;
}

export default function EventCompanionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [companion, setCompanion] = useState<EventCompanion | null>(null);
  const [items, setItems] = useState<CompanionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [addingType, setAddingType] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  // QR code entry form state
  const [qrUrl, setQrUrl] = useState('');
  const [qrLabel, setQrLabel] = useState('');

  const fetchCompanion = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('event_companions')
        .select(`
          *,
          event:events!event_companions_event_id_fkey(id, title, start_time)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCompanion(data);
      setEditName(data.name);
      setEditNotes(data.notes || '');

      const { data: itemsData, error: itemsError } = await supabase
        .from('event_companion_items')
        .select('*')
        .eq('companion_id', id)
        .order('order_index');

      if (itemsError) throw itemsError;

      const resolved = await resolveItemNames(itemsData || []);
      setItems(resolved);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error('Failed to load companion');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompanion();
  }, [fetchCompanion]);

  async function resolveItemNames(rawItems: CompanionItem[]): Promise<CompanionItem[]> {
    const resolved: CompanionItem[] = [];
    for (const item of rawItems) {
      const typeConfig = getCompanionItemType(item.item_type);
      // Built-in types don't need DB lookups
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

  async function handleSaveEdit() {
    if (!id || !editName.trim()) return;
    try {
      const { error } = await supabase
        .from('event_companions')
        .update({ name: editName.trim(), notes: editNotes.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setCompanion((prev) => prev ? { ...prev, name: editName.trim(), notes: editNotes.trim() || null } : prev);
      setEditing(false);
      toast.success('Updated');
    } catch (err: any) {
      toast.error('Failed to update');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this event companion and all its items?')) return;
    try {
      const { error } = await supabase.from('event_companions').delete().eq('id', id!);
      if (error) throw error;
      toast.success('Deleted');
      navigate('/event-companions');
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  }

  async function loadAvailableItems(type: string) {
    const config = getCompanionItemType(type);
    if (!config) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from(config.table)
        .select(`id, ${config.nameField}, ${config.slugField}`)
        .order(config.nameField);
      if (error) throw error;
      setAvailableItems(data || []);
    } catch (err: any) {
      toast.error('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  }

  function startAddItem(type: string) {
    const config = getCompanionItemType(type);
    if (config?.builtin) {
      if (type === 'qr_code') {
        // QR codes need a URL — show entry form
        setQrUrl('');
        setQrLabel('');
        setAddingType('qr_code');
      } else {
        // Other builtins (attendees): add immediately
        addItem(companion!.id, type);
      }
      return;
    }
    setAddingType(type);
    setItemSearch('');
    loadAvailableItems(type);
  }

  async function addQRCodeItem() {
    if (!id || !qrUrl.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    try {
      const { data, error } = await supabase
        .from('event_companion_items')
        .insert({
          companion_id: id,
          item_type: 'qr_code',
          item_id: id, // self-reference; actual data is in notes
          order_index: maxOrder,
          notes: JSON.stringify({ url: qrUrl.trim(), label: qrLabel.trim() || null }),
        })
        .select()
        .single();

      if (error) throw error;
      setAddingType(null);
      setQrUrl('');
      setQrLabel('');
      const resolved = await resolveItemNames([data]);
      setItems((prev) => [...prev, ...resolved]);
      toast.success('QR code added');
    } catch (err: any) {
      toast.error('Failed to add QR code');
    }
  }

  async function addItem(itemId: string, typeOverride?: string) {
    if (!id) return;
    const type = typeOverride || addingType;
    if (!type) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    try {
      const { data, error } = await supabase
        .from('event_companion_items')
        .insert({
          companion_id: id,
          item_type: type,
          item_id: itemId,
          order_index: maxOrder,
        })
        .select()
        .single();

      if (error) throw error;
      setAddingType(null);
      setAvailableItems([]);
      const resolved = await resolveItemNames([data]);
      setItems((prev) => [...prev, ...resolved]);
      toast.success('Item added');
    } catch (err: any) {
      toast.error('Failed to add item');
    }
  }

  async function removeItem(itemId: string) {
    try {
      const { error } = await supabase.from('event_companion_items').delete().eq('id', itemId);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success('Item removed');
    } catch (err: any) {
      toast.error('Failed to remove');
    }
  }

  function getItemRoute(item: CompanionItem) {
    const config = getCompanionItemType(item.item_type);
    if (!config) return '#';
    return `${config.route}/${item.resolved_slug || item.item_id}`;
  }

  function getItemIcon(type: string) {
    const config = getCompanionItemType(type);
    return config?.icon || FileText;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Companion not found</p>
        <Button asChild className="mt-4" size="sm">
          <Link to="/event-companions">Back to list</Link>
        </Button>
      </div>
    );
  }

  const typeConfig = addingType ? getCompanionItemType(addingType) : null;
  const filteredAvailable = availableItems.filter((item) => {
    if (!itemSearch) return true;
    const nameField = typeConfig?.nameField || 'name';
    return item[nameField]?.toLowerCase().includes(itemSearch.toLowerCase());
  });

  const alreadyAddedIds = items.map((i) => i.item_id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Event Companions', href: '/event-companions' },
          { label: companion.name },
        ]}
      />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/event-companions">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>

        {editing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xl font-bold"
            />
            <Input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{companion.name}</h1>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {companion.notes && (
              <p className="text-gray-500 mt-1">{companion.notes}</p>
            )}
          </div>
        )}
      </div>

      {companion.event && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">{companion.event.title}</p>
                {companion.event.start_time && (
                  <p className="text-sm text-gray-500">
                    {new Date(companion.event.start_time).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Companion Items ({items.length})</CardTitle>
            {!addingType && (
              <div className="flex flex-wrap gap-2">
                {getTypesForContext('event').map((type) => {
                  const Icon = type.icon;
                  // Only restrict attendees to one instance
                  const alreadyAdded = type.value === 'attendees' && items.some(i => i.item_type === 'attendees');
                  if (alreadyAdded) return null;
                  return (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      onClick={() => startAddItem(type.value)}
                    >
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
          {addingType && typeConfig && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Add {typeConfig.label}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setAddingType(null); setAvailableItems([]); setQrUrl(''); setQrLabel(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* QR Code entry form */}
              {addingType === 'qr_code' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">URL *</label>
                    <Input
                      value={qrUrl}
                      onChange={e => setQrUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Label (optional)</label>
                    <Input
                      value={qrLabel}
                      onChange={e => setQrLabel(e.target.value)}
                      placeholder="e.g. Slides, Registration, WiFi..."
                      className="mt-1"
                    />
                  </div>
                  <Button size="sm" onClick={addQRCodeItem} disabled={!qrUrl.trim()}>
                    Add QR Code
                  </Button>
                </div>
              )}
              {addingType !== 'qr_code' && (
                <div className="space-y-2">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${typeConfig.label.toLowerCase()}s...`}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {loadingItems ? (
                    <Skeleton className="h-20" />
                  ) : filteredAvailable.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No {typeConfig.label.toLowerCase()}s found</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredAvailable.map((item) => {
                        const alreadyAdded = alreadyAddedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            disabled={alreadyAdded}
                            onClick={() => addItem(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${alreadyAdded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-indigo-50 hover:text-indigo-700'}`}
                          >
                            {item[typeConfig.nameField]}
                            {alreadyAdded && <span className="ml-2 text-xs">(already added)</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8">
              <Plus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No items yet</p>
              <p className="text-sm text-gray-400 mt-1">Use the buttons above to add tables, elevators, pitches, and more</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const typeConfig = getCompanionItemType(item.item_type);
                const Icon = getItemIcon(item.item_type);
                const typeLabel = typeConfig?.label || item.item_type;
                const isBuiltin = typeConfig?.builtin ?? false;
                const isHost = companion?.created_by === profile?.id;

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    {/* Item header */}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500 h-7 w-7 p-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Item body */}
                    <div className="px-3 py-3">
                      {isBuiltin && item.item_type === 'qr_code' && (() => {
                        let qrData = { url: '', label: '' };
                        try { qrData = JSON.parse(item.notes || '{}'); } catch {}
                        return qrData.url
                          ? <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                          : <p className="text-sm text-gray-400 py-2">No URL set for this QR code.</p>;
                      })()}
                      {isBuiltin && item.item_type === 'attendees' && companion?.event?.id && (
                        <CompanionAttendees
                          eventId={companion.event.id}
                          isHost={isHost}
                        />
                      )}
                      {!isBuiltin && (
                        <Link to={getItemRoute(item)} className="group flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 group-hover:text-indigo-600 truncate">
                              {item.resolved_name}
                              <ExternalLink className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {item.resolved_description && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.resolved_description}</p>
                            )}
                          </div>
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
    </div>
  );
}
