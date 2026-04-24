/**
 * FriendCompanionsListPage
 *
 * Lists all mutual friends alongside their companion status.
 * Friends with an existing companion show item count + open date.
 * Friends without a companion yet show a "Start" button.
 *
 * Route: /members/friends/companions
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { MessageCircle, Users2, ArrowRight, Package, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FriendRow {
  id: string;
  name: string;
  avatar: string | null;
  companionId: string | null;
  itemCount: number;
  companionCreatedAt: string | null;
}

export default function FriendCompanionsListPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get mutual friend IDs
      const [{ data: followingData }, { data: followersData }] = await Promise.all([
        supabase.from('user_connections').select('following_id').eq('follower_id', user.id),
        supabase.from('user_connections').select('follower_id').eq('following_id', user.id),
      ]);

      const followingIds = new Set((followingData || []).map(f => f.following_id));
      const mutualIds = (followersData || [])
        .map(f => f.follower_id)
        .filter(id => followingIds.has(id));

      if (mutualIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // 2. Fetch friend profiles
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', mutualIds);

      // 3. Fetch existing companions for this user (use created_at for ordering)
      const { data: companionRows, error: compError } = await supabase
        .from('friend_companions')
        .select('id, user_a_id, user_b_id, created_at')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (compError) console.error('friend_companions query error:', compError);

      // 4. Fetch item counts for existing companions
      const companionIds = (companionRows || []).map(r => r.id);
      let itemCountMap: Record<string, number> = {};
      if (companionIds.length > 0) {
        const { data: itemRows } = await supabase
          .from('friend_companion_items')
          .select('companion_id')
          .in('companion_id', companionIds);
        (itemRows || []).forEach(r => {
          itemCountMap[r.companion_id] = (itemCountMap[r.companion_id] || 0) + 1;
        });
      }

      // Build a map: friendId → companion row
      const companionByFriend: Record<string, { id: string; created_at: string }> = {};
      (companionRows || []).forEach(r => {
        const friendId = r.user_a_id === user.id ? r.user_b_id : r.user_a_id;
        companionByFriend[friendId] = { id: r.id, created_at: r.created_at };
      });

      // 5. Assemble — all mutual friends, companion data merged in
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const assembled: FriendRow[] = mutualIds
        .map(friendId => {
          const profile = profileMap[friendId];
          if (!profile) return null;
          const comp = companionByFriend[friendId] ?? null;
          return {
            id: friendId,
            name: profile.name ?? 'Unknown member',
            avatar: profile.avatar ?? null,
            companionId: comp?.id ?? null,
            itemCount: comp ? (itemCountMap[comp.id] ?? 0) : 0,
            companionCreatedAt: comp?.created_at ?? null,
          } satisfies FriendRow;
        })
        .filter((r): r is FriendRow => r !== null)
        // Companions with items first, then companions without items, then no companion
        .sort((a, b) => {
          if (a.companionId && !b.companionId) return -1;
          if (!a.companionId && b.companionId) return 1;
          return (b.itemCount - a.itemCount) || a.name.localeCompare(b.name);
        });

      setFriends(assembled);
    } catch (err) {
      console.error('Failed to load friend companions:', err);
    } finally {
      setLoading(false);
    }
  }

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

  const withCompanion = friends.filter(f => f.companionId);
  const withoutCompanion = friends.filter(f => !f.companionId);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friend Companions</h1>
          <p className="text-sm text-gray-500">
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
            {withCompanion.length > 0 && ` · ${withCompanion.length} companion${withCompanion.length !== 1 ? 's' : ''} active`}
          </p>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <Users2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">No mutual friends yet</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Follow someone back who follows you to become friends and unlock a shared companion.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/members/all">
              <Users2 className="w-4 h-4 mr-1.5" />
              Browse Members
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active companions */}
          {withCompanion.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Active</p>
              <div className="space-y-2">
                {withCompanion.map(f => (
                  <Link
                    key={f.id}
                    to={`/members/friends/${f.id}/companion`}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-sm transition-all group"
                  >
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={f.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white font-semibold">
                        {f.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{f.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Package className="w-3 h-3" />
                          {f.itemCount} item{f.itemCount !== 1 ? 's' : ''}
                        </span>
                        {f.companionCreatedAt && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">
                              opened {formatDistanceToNow(new Date(f.companionCreatedAt), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Friends without a companion yet */}
          {withoutCompanion.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Not started yet</p>
              <div className="space-y-2">
                {withoutCompanion.map(f => (
                  <div
                    key={f.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={f.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 text-white font-semibold">
                        {f.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">No companion started</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/members/friends/${f.id}/companion`}>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                        Start
                      </Link>
                    </Button>
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
