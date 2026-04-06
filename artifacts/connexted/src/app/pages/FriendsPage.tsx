import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { Users2, Search, X, MessageCircle, Award } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  badgeCount: number;
  circleCount: number;
  since: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchFriends();
  }, [user]);

  useEffect(() => {
    filterFriends();
  }, [friends, searchQuery]);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch users I'm following
      const { data: followingData } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];

      // Fetch users following me (include created_at for "since" date)
      const { data: followersData } = await supabase
        .from('user_connections')
        .select('follower_id, created_at')
        .eq('following_id', user.id);

      const followerIds = followersData?.map(f => f.follower_id) || [];

      // Mutual = I follow them AND they follow me
      const mutualIds = followingIds.filter(id => followerIds.includes(id));

      if (mutualIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch friend profiles
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .in('id', mutualIds);

      // Fetch badge counts and circle counts in parallel for each friend
      const friendsData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [{ count: badgeCount }, { count: circleCount }] = await Promise.all([
            supabase
              .from('user_badges')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id),
            supabase
              .from('circles')
              .select('*', { count: 'exact', head: true })
              .contains('member_ids', [profile.id]),
          ]);

          // "Since" = when they followed you (the later event that completed the friendship)
          const followerRecord = followersData?.find(f => f.follower_id === profile.id);

          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            email: profile.email,
            avatar: profile.avatar,
            badgeCount: badgeCount || 0,
            circleCount: circleCount || 0,
            since: followerRecord?.created_at || new Date().toISOString(),
          };
        })
      );

      setFriends(friendsData);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFriends = () => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredFriends(
      friends.filter(
        f =>
          f.name.toLowerCase().includes(query) ||
          f.email.toLowerCase().includes(query)
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users2 className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
              <p className="text-gray-600 mt-1">
                {filteredFriends.length} mutual connection{filteredFriends.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Friends Grid */}
      {filteredFriends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-green-300 transition-all"
            >
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-4 relative">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    friend.name.charAt(0).toUpperCase()
                  )}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Users2 className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Name */}
                <Link
                  to={`/users/${friend.id}`}
                  className="font-semibold text-gray-900 hover:text-green-600 mb-1"
                >
                  {friend.name}
                </Link>
                <p className="text-sm text-gray-500 mb-3">{friend.email}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  {friend.badgeCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span>{friend.badgeCount}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users2 className="w-4 h-4 text-blue-500" />
                    <span>{friend.circleCount} circle{friend.circleCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Friends since {new Date(friend.since).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2 w-full">
                  <Link
                    to={`/users/${friend.id}`}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium text-center"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/messages/${friend.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No friends found' : 'No friends yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Follow members who follow you back to build your friends list'}
          </p>
          {!searchQuery && (
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users2 className="w-4 h-4" />
              Browse Members
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
