/**
 * FriendCompanionsListPage
 *
 * Lists all friend companions the current user is a participant in,
 * ordered by most recently updated (newest activity first).
 *
 * Route: /members/friends/companions
 *
 * Efficient loading strategy:
 *   1. Single query to friend_companions filtered by user (OR clause)
 *   2. One batched query for all friend profiles
 *   3. One batched count query for item counts per companion
 *   — avoids N+1 patterns from the individual companion/friends pages
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { MessageCircle, Users2, ArrowRight, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CompanionRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  updated_at: string;
  created_at: string;
  itemCount: number;
  friend: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

export default function FriendCompanionsListPage() {
  const { user } = useAuth();
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch all companions for this user, with item count via embed
      const { data: rows, error } = await supabase
        .from('friend_companions')
        .select(`
          id,
          user_a_id,
          user_b_id,
          updated_at,
          created_at,
          friend_companion_items(count)
        `)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('friend_companions query error:', error);
        throw error;
      }

      if (!rows || rows.length === 0) {
        setCompanions([]);
        setLoading(false);
        return;
      }

      // 2. Collect friend IDs (the other participant)
      const friendIds = Array.from(new Set(
        rows.map(r => r.user_a_id === user.id ? r.user_b_id : r.user_a_id)
      ));

      // 3. Single batched profile fetch for all friends
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', friendIds);

      if (profilesError) console.error('profiles fetch error:', profilesError);

      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.id, p])
      );

      // 4. Assemble
      const assembled: CompanionRow[] = rows.map(r => {
        const friendId = r.user_a_id === user.id ? r.user_b_id : r.user_a_id;
        const itemCountArr = (r as any).friend_companion_items;
        const itemCount =
          Array.isArray(itemCountArr) && itemCountArr[0]?.count != null
            ? Number(itemCountArr[0].count)
            : 0;
        return {
          id: r.id,
          user_a_id: r.user_a_id,
          user_b_id: r.user_b_id,
          updated_at: r.updated_at,
          created_at: r.created_at,
          itemCount,
          friend: profileMap[friendId] ?? null,
        };
      });

      setCompanions(assembled);
    } catch (err) {
      console.error('Failed to load friend companions:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-3">
        <Skeleton className="h-8 w-48 mb-6" />
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friend Companions</h1>
          <p className="text-sm text-gray-500">
            {companions.length} shared space{companions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* List */}
      {companions.length > 0 ? (
        <div className="space-y-2">
          {companions.map(c => {
            const friendId = c.user_a_id === user?.id ? c.user_b_id : c.user_a_id;
            const name = c.friend?.name ?? 'Unknown member';
            const initial = name.charAt(0).toUpperCase();
            const timeAgo = formatDistanceToNow(new Date(c.updated_at), { addSuffix: true });

            return (
              <Link
                key={c.id}
                to={`/members/friends/${friendId}/companion`}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-sm transition-all group"
              >
                {/* Avatar */}
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage src={c.friend?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Package className="w-3 h-3" />
                      {c.itemCount} item{c.itemCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{timeAgo}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Users2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">No companions yet</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Open a shared companion from your Friends list to create one.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/members/friends">
              <Users2 className="w-4 h-4 mr-1.5" />
              Go to Friends
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
