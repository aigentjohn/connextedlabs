import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { Activity, Search, X, Award, Users, Clock } from 'lucide-react';
import { getUserDisplayName, getUserFullName, getUserInitials, hasCustomDisplayName } from '@/lib/user-utils';

interface ActiveMember {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  last_active_at: string;
  badges: string[];
  circles: number;
  activity_score: number; // Calculated based on recent activity
}

export default function ActiveMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<ActiveMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<ActiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (user) {
      fetchActiveMembers();
    }
  }, [user, timeRange]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery]);

  const fetchActiveMembers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate the cutoff date based on time range
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (timeRange) {
        case 'day':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Fetch members active since cutoff date
      const { data: profiles } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id)
        .not('last_active_at', 'is', null)
        .gte('last_active_at', cutoffDate.toISOString())
        .order('last_active_at', { ascending: false });

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch additional data for each member
      const membersData = await Promise.all(
        profiles.map(async (profile) => {
          // Count circles
          const { count: circleCount } = await supabase
            .from('circle_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'active');

          // Count badges
          const { data: badgeData } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', profile.id);

          // Calculate activity score (simplified - could be enhanced)
          // Score based on how recently they were active
          const lastActive = new Date(profile.last_active_at);
          const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
          
          // Higher score for more recent activity
          let activityScore = 100;
          if (hoursSinceActive < 1) activityScore = 100;
          else if (hoursSinceActive < 24) activityScore = 90;
          else if (hoursSinceActive < 72) activityScore = 70;
          else if (hoursSinceActive < 168) activityScore = 50;
          else activityScore = 30;

          return {
            id: profile.id,
            full_name: profile.full_name || profile.name || 'Unknown',
            display_name: profile.display_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            last_active_at: profile.last_active_at,
            badges: badgeData?.map(b => b.badge_id) || [],
            circles: circleCount || 0,
            activity_score: activityScore,
          };
        })
      );

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching active members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.full_name.toLowerCase().includes(query) ||
        member.display_name?.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
    );

    setFilteredMembers(filtered);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading active members...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Active Members</h1>
              <p className="text-gray-600 mt-1">
                {filteredMembers.length} active in the last {timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search active members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('day')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'day'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-orange-300 transition-all"
            >
              <div className="flex flex-col items-center text-center">
                {/* Avatar with Activity Indicator */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Active indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Activity className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* Name */}
                <Link
                  to={`/users/${member.id}`}
                  className="font-semibold text-gray-900 hover:text-orange-600 mb-1"
                >
                  {member.display_name || member.full_name}
                </Link>
                {member.display_name && (
                  <p className="text-sm text-gray-500 mb-2">{member.full_name}</p>
                )}

                {/* Last Active */}
                <div className="flex items-center gap-1 text-sm text-orange-600 mb-3">
                  <Clock className="w-4 h-4" />
                  <span>Active {getTimeAgo(member.last_active_at)}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {member.badges.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span>{member.badges.length}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{member.circles} circles</span>
                  </div>
                </div>

                {/* Activity Score Indicator */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${member.activity_score}%` }}
                  />
                </div>

                {/* Action */}
                <Link
                  to={`/users/${member.id}`}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium text-center"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No members found' : 'No active members'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search query'
              : `No members have been active in the last ${timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}`}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                if (timeRange === 'day') setTimeRange('week');
                else if (timeRange === 'week') setTimeRange('month');
              }}
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Expand Time Range
            </button>
          )}
        </div>
      )}
    </div>
  );
}