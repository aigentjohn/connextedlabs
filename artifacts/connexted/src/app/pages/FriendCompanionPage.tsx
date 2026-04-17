/**
 * FriendCompanionPage
 *
 * A persistent shared space between two mutual friends.
 * Accessible via the MessageCircle button on the Friends page.
 *
 * Route: /members/friends/:friendId/companion
 *
 * On first visit the companion row is auto-created.
 * Both participants can add and remove items.
 * user_a_id is always the lexicographically smaller UUID
 * (matches the CHECK constraint in the DB).
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';
import { toast } from 'sonner';
import {
  Users2, ExternalLink, ArrowLeft, FileText, Plus, Trash2, X,
} from 'lucide-react';
import { getTypesForContext, getCompanionItemType } from '@/lib/companion-types';

// ── Types ──────────────────────────────────────────────────────────────────

interface FriendProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface CompanionItem {
  id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  added_by: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

interface ContentSearchResult {
  id: string;
  display_name: string;
  slug_or_id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns [user_a_id, user_b_id] with the smaller UUID first */
function orderedPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FriendCompanionPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user, profile } = useAuth();

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [items, setItems] = useState<CompanionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFriend, setNotFriend] = useState(false);

  // Add-item panel
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const friendTypes = getTypesForContext('friend').filter(t => !t.builtin && t.value !== 'qr_code');

  useEffect(() => {
    if (user && friendId) loadData();
  }, [user, friendId]);

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadData() {
    if (!user || !friendId) return;
    try {
      setLoading(true);

      // 1. Fetch friend's profile
      const { data: friendProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .eq('id', friendId)
        .single();
      if (profileError) throw profileError;
      setFriend(friendProfile);

      // 2. Verify mutual friendship
      const { data: iFollow } = await supabase
        .from('user_connections')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', friendId)
        .maybeSingle();

      const { data: theyFollow } = await supabase
        .from('user_connections')
        .select('id')
        .eq('follower_id', friendId)
        .eq('following_id', user.id)
        .maybeSingle();

      if (!iFollow || !theyFollow) {
        setNotFriend(true);
        setLoading(false);
        return;
      }

      // 3. Find or create companion
      const [userA, userB] = orderedPair(user.id, friendId);

      let { data: companion } = await supabase
        .from('friend_companions')
        .select('id')
        .eq('user_a_id', userA)
        .eq('user_b_id', userB)
        .maybeSingle();

      if (!companion) {
        const { data: created, error: createError } = await supabase
          .from('friend_companions')
          .insert({ user_a_id: userA, user_b_id: userB })
          .select('id')
          .single();
        if (createError) throw createError;
        companion = created;
      }

      setCompanionId(companion.id);

      // 4. Load items
      await loadItems(companion.id);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load companion');
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(cId: string) {
    const { data: rawItems, error } = await supabase
      .from('friend_companion_items')
      .select('*')
      .eq('companion_id', cId)
      .order('order_index');
    if (error) throw error;

    const resolved = await resolveNames(rawItems || []);
    setItems(resolved);
  }

  async function resolveNames(rawItems: any[]): Promise<CompanionItem[]> {
    const resolved: CompanionItem[] = [];
    for (const item of rawItems) {
      const config = getCompanionItemType(item.item_type);
      if (!config || !config.table) { resolved.push(item); continue; }
      const { data } = await supabase
        .from(config.table)
        .select(`${config.nameField}, ${config.slugField}, description`)
        .eq('id', item.item_id)
        .single();
      resolved.push({
        ...item,
        resolved_name: data?.[config.nameField] || 'Untitled',
        resolved_description: data?.description || null,
        resolved_slug: data?.[config.slugField] || item.item_id,
      });
    }
    return resolved;
  }

  // ── Search ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedType || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => runSearch(), 350);
    return () => clearTimeout(t);
  }, [selectedType, searchQuery]);

  async function runSearch() {
    const config = getCompanionItemType(selectedType);
    if (!config || !config.table) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from(config.table)
        .select(`id, ${config.nameField}, ${config.slugField}`)
        .ilike(config.nameField, `%${searchQuery}%`)
        .limit(10);
      setSearchResults(
        (data || []).map((row: any) => ({
          id: row.id,
          display_name: row[config.nameField] || 'Untitled',
          slug_or_id: row[config.slugField] || row.id,
        }))
      );
    } finally {
      setSearching(false);
    }
  }

  // ── Add / Remove ──────────────────────────────────────────────────────────

  async function addItem(result: ContentSearchResult) {
    if (!companionId || !user) return;
    setAdding(true);
    try {
      const nextIndex = items.length;
      const { error } = await supabase.from('friend_companion_items').insert({
        companion_id: companionId,
        item_type: selectedType,
        item_id: result.id,
        order_index: nextIndex,
        added_by: user.id,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('That item is already in your companion.');
        } else {
          throw error;
        }
        return;
      }
      toast.success('Item added');
      setShowAddPanel(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedType('');
      await loadItems(companionId);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!companionId) return;
    try {
      const { error } = await supabase
        .from('friend_companion_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      toast.success('Item removed');
      await loadItems(companionId);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to remove item');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (notFriend || !friend) {
    return (
      <div className="text-center py-16">
        <Users2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium mb-2">
          {notFriend ? 'You are not mutual friends' : 'Friend not found'}
        </h2>
        <Button variant="outline" asChild>
          <Link to="/members/friends">Back to Friends</Link>
        </Button>
      </div>
    );
  }

  const qrItems = items.filter(i => i.item_type === 'qr_code');
  const contentItems = items.filter(i => i.item_type !== 'qr_code');

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/members/friends">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Friends
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddPanel(v => !v)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Header card: both avatars */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-center gap-4">
            {/* Me */}
            <div className="flex flex-col items-center gap-1">
              <Avatar className="w-14 h-14">
                <AvatarImage src={(profile as any)?.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-600 text-white text-lg">
                  {profile?.name?.charAt(0) ?? 'M'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500 max-w-[80px] truncate text-center">
                {profile?.name ?? 'Me'}
              </span>
            </div>

            {/* Connector */}
            <div className="flex flex-col items-center gap-1">
              <Users2 className="w-6 h-6 text-green-500" />
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                Companion
              </span>
            </div>

            {/* Friend */}
            <div className="flex flex-col items-center gap-1">
              <Avatar className="w-14 h-14">
                <AvatarImage src={friend.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-lg">
                  {friend.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500 max-w-[80px] truncate text-center">
                {friend.name}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add-item panel */}
      {showAddPanel && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="pt-4 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Add shared content</h3>
              <button
                onClick={() => { setShowAddPanel(false); setSearchQuery(''); setSearchResults([]); setSelectedType(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div className="flex flex-wrap gap-2">
              {friendTypes.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setSelectedType(t.value); setSearchQuery(''); setSearchResults([]); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${selectedType === t.value
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Search box */}
            {selectedType && (
              <input
                type="text"
                placeholder={`Search ${getCompanionItemType(selectedType)?.label ?? selectedType}s…`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            )}

            {/* Results */}
            {searching && (
              <p className="text-xs text-gray-400 text-center py-1">Searching…</p>
            )}
            {!searching && searchResults.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => addItem(r)}
                    disabled={adding}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
            {!searching && searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">No results found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Codes */}
      {qrItems.length > 0 && (
        <div className="space-y-4">
          {qrItems.map(item => {
            let qrData = { url: '', label: '' };
            try { qrData = JSON.parse(item.notes || '{}'); } catch {}
            if (!qrData.url) return null;
            return (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content items */}
      {contentItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Shared with {friend.name}
          </h2>
          {contentItems.map(item => {
            const config = getCompanionItemType(item.item_type);
            const Icon = config?.icon || FileText;
            const href = config?.route
              ? `${config.route}/${item.resolved_slug || item.item_id}`
              : null;
            const addedByMe = item.added_by === user?.id;
            return (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-green-50">
                      <Icon className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {config?.label || item.item_type}
                      </span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                        {item.resolved_name || 'View item'}
                      </p>
                      {item.resolved_description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {item.resolved_description}
                        </p>
                      )}
                      {!addedByMe && (
                        <span className="text-[10px] text-gray-400">
                          shared by {friend.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {href && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={href}><ExternalLink className="w-4 h-4" /></Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAddPanel && (
        <div className="text-center py-16 text-gray-400">
          <Users2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nothing shared yet.</p>
          <p className="text-xs mt-1 mb-4">
            Add elevators, pitches, documents, episodes, books, blogs, or playlists
            to keep shared resources in one place.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddPanel(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add something
          </Button>
        </div>
      )}

    </div>
  );
}
