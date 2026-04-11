/**
 * CircleResources — curated resource kit for a circle
 *
 * Circle admins curate an ordered list of content items (documents,
 * episodes, checklists, etc.) that members see as a "start here" panel.
 * Uses the shared COMPANION_ITEM_TYPES registry so adding new content
 * types to the platform automatically makes them available here.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  Layers,
  Search,
} from 'lucide-react';
import { COMPANION_ITEM_TYPES, getCompanionItemType, RESOLVABLE_ITEM_TYPES } from '@/lib/companion-types';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';

interface CircleResourceItem {
  id: string;
  circle_id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

interface AddItemState {
  item_type: string;
  item_id: string;
  notes: string;
}

interface CircleResourcesProps {
  circleId: string;
  isAdmin: boolean;
  isMember: boolean;
}

export default function CircleResources({ circleId, isAdmin, isMember }: CircleResourcesProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<CircleResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addState, setAddState] = useState<AddItemState>({ item_type: '', item_id: '', notes: '' });
  const [availableContent, setAvailableContent] = useState<{ id: string; label: string }[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, [circleId]);

  async function loadItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('circle_companion_items')
        .select('*')
        .eq('circle_id', circleId)
        .order('order_index');

      if (error) throw error;

      const resolved = await resolveNames(data || []);
      setItems(resolved);
    } catch (err: any) {
      console.error('Error loading circle resources:', err);
      // Gracefully handle missing table during migration
      if (err.code === '42P01') {
        toast.error('Resources table not yet set up — run the migration first');
      } else {
        toast.error('Failed to load resources');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resolveNames(rawItems: CircleResourceItem[]): Promise<CircleResourceItem[]> {
    const resolved: CircleResourceItem[] = [];
    for (const item of rawItems) {
      const config = getCompanionItemType(item.item_type);
      if (!config || item.item_type === 'qr_code') {
        resolved.push(item);
        continue;
      }
      const { data } = await supabase
        .from(config.table)
        .select(`${config.nameField}, ${config.slugField}, description`)
        .eq('id', item.item_id)
        .maybeSingle();

      resolved.push({
        ...item,
        resolved_name: data?.[config.nameField] || 'Untitled',
        resolved_description: data?.description || null,
        resolved_slug: data?.[config.slugField] || item.item_id,
      });
    }
    return resolved;
  }

  async function handleTypeChange(type: string) {
    setAddState({ item_type: type, item_id: '', notes: '' });
    if (!type || type === 'qr_code') return;

    const config = getCompanionItemType(type);
    if (!config) return;

    setLoadingContent(true);
    try {
      const { data } = await supabase
        .from(config.table)
        .select(`id, ${config.nameField}`)
        .order(config.nameField)
        .limit(100);

      setAvailableContent(
        (data || []).map((row: any) => ({
          id: row.id,
          label: row[config.nameField] || 'Untitled',
        }))
      );
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoadingContent(false);
    }
  }

  async function handleAddItem() {
    if (!addState.item_type) return toast.error('Select a content type');
    if (addState.item_type !== 'qr_code' && !addState.item_id) return toast.error('Select an item');

    setSaving(true);
    try {
      const newIndex = items.length;
      const { error } = await supabase
        .from('circle_companion_items')
        .insert({
          circle_id: circleId,
          item_type: addState.item_type,
          item_id: addState.item_id || circleId, // qr_code uses circle id as reference
          order_index: newIndex,
          notes: addState.notes || null,
        });

      if (error) throw error;

      toast.success('Resource added');
      setShowAdd(false);
      setAddState({ item_type: '', item_id: '', notes: '' });
      setAvailableContent([]);
      await loadItems();
    } catch (err: any) {
      console.error('Error adding resource:', err);
      toast.error('Failed to add resource');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      const { error } = await supabase
        .from('circle_companion_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Resource removed');
    } catch (err) {
      console.error('Error removing resource:', err);
      toast.error('Failed to remove resource');
    }
  }

  async function handleMoveItem(itemId: string, direction: 'up' | 'down') {
    const idx = items.findIndex(i => i.id === itemId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === items.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...items];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    // Optimistic update
    setItems(reordered);

    // Persist new order_index values
    try {
      await Promise.all(
        reordered.map((item, i) =>
          supabase
            .from('circle_companion_items')
            .update({ order_index: i })
            .eq('id', item.id)
        )
      );
    } catch (err) {
      console.error('Error reordering:', err);
      toast.error('Failed to save order');
      await loadItems(); // revert
    }
  }

  const qrItems = items.filter(i => i.item_type === 'qr_code');
  const contentItems = items.filter(i => i.item_type !== 'qr_code');

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Resources
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Key content curated by circle admins
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
            variant={showAdd ? 'outline' : 'default'}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Add Resource Form */}
      {isAdmin && showAdd && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base">Add a Resource</CardTitle>
            <CardDescription>
              Choose a content type and select the item to pin here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type selector */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Content Type</label>
              <Select value={addState.item_type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPANION_ITEM_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Item selector — shown for all except qr_code */}
            {addState.item_type && addState.item_type !== 'qr_code' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Select Item</label>
                {loadingContent ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Search className="w-4 h-4 animate-pulse" />
                    Loading...
                  </div>
                ) : availableContent.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No {getCompanionItemType(addState.item_type)?.label.toLowerCase()}s found
                  </p>
                ) : (
                  <Select value={addState.item_id} onValueChange={id => setAddState(s => ({ ...s, item_id: id }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContent.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Optional note */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Start here, Required reading..."
                value={addState.notes}
                onChange={e => setAddState(s => ({ ...s, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleAddItem} disabled={saving} size="sm">
                {saving ? 'Adding...' : 'Add to Resources'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAdd(false);
                  setAddState({ item_type: '', item_id: '', notes: '' });
                  setAvailableContent([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code items */}
      {qrItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {qrItems.map(item => (
            <div key={item.id} className="relative">
              <CompanionQRCode
                url={`${window.location.origin}/circles/${circleId}`}
                title="Circle QR Code"
              />
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content items */}
      {contentItems.length === 0 && !showAdd ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No resources yet</p>
            {isAdmin && (
              <p className="text-sm text-gray-400 mt-1">
                Add documents, episodes, checklists, and more for members to find easily
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contentItems.map((item, idx) => {
            const config = getCompanionItemType(item.item_type);
            if (!config) return null;
            const Icon = config.icon;
            const href = config.route && item.resolved_slug
              ? `${config.route}/${item.resolved_slug}`
              : null;

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Reorder handle — admin only */}
                    {isAdmin && (
                      <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                        <button
                          onClick={() => handleMoveItem(item.id, 'up')}
                          disabled={idx === 0}
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Type icon */}
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {item.resolved_name || 'Untitled'}
                            </span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {config.label}
                            </Badge>
                            {item.notes && (
                              <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                                {item.notes}
                              </Badge>
                            )}
                          </div>
                          {item.resolved_description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                              {item.resolved_description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {href && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={href}>
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
