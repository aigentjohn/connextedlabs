/**
 * Badged Members Page
 * 
 * Shows all members who have earned badges, with filtering by badge type.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Award, Search, Filter, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { BadgeDisplay } from '@/app/components/badges';
import type { BadgeType } from '@/services/badgeService';

interface UserWithBadges {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  company_name: string | null;
  badge_count: number;
  badges: any[];
}

export default function BadgedMembersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserWithBadges[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch badge types
      const { data: badgeTypesData } = await supabase
        .from('badge_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setBadgeTypes(badgeTypesData || []);

      // Fetch users with badges
      const { data: usersData } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          job_title,
          company_name,
          badge_count
        `)
        .gt('badge_count', 0)
        .order('badge_count', { ascending: false });

      if (!usersData) {
        setLoading(false);
        return;
      }

      // Fetch badges for each user
      const usersWithBadges = await Promise.all(
        usersData.map(async (user) => {
          const { data: badges } = await supabase
            .from('user_badges')
            .select(`
              *,
              badge_type:badge_types(*)
            `)
            .eq('recipient_user_id', user.id)
            .eq('is_public', true);

          return {
            ...user,
            badges: badges || [],
          };
        })
      );

      setUsers(usersWithBadges);
    } catch (error) {
      console.error('Error fetching badged members:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleBadgeFilter(slug: string) {
    const newSelected = new Set(selectedBadges);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedBadges(newSelected);
  }

  function clearFilters() {
    setSelectedBadges(new Set());
    setSearchQuery('');
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = 
      !searchQuery ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Badge type filter
    if (selectedBadges.size > 0) {
      const userBadgeSlugs = user.badges
        .map(b => b.badge_type?.slug)
        .filter(Boolean);
      
      // User must have at least one of the selected badges
      const hasSelectedBadge = Array.from(selectedBadges).some(slug =>
        userBadgeSlugs.includes(slug)
      );
      
      if (!hasSelectedBadge) return false;
    }

    return true;
  });

  // Group badges by category for filter UI
  const badgesByCategory = badgeTypes.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, BadgeType[]>);

  const categoryLabels: Record<string, string> = {
    completion: 'Completion',
    endorsement: 'Endorsement',
    skill: 'Skills',
    verification: 'Verification',
    achievement: 'Achievement',
    membership: 'Membership',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Members', href: '/members' },
          { label: 'Badged Members', href: '/members/badges' },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Badged Members</h1>
        </div>
        <p className="text-gray-600">
          Members who have earned badges for their achievements and contributions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, email, job title, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter by Badges
            {selectedBadges.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedBadges.size}
              </Badge>
            )}
          </Button>
          {(searchQuery || selectedBadges.size > 0) && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Badge Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Filter by Badge Type</h3>
              <div className="space-y-4">
                {Object.entries(badgesByCategory).map(([category, badges]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {categoryLabels[category] || category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <button
                          key={badge.slug}
                          onClick={() => toggleBadgeFilter(badge.slug)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            selectedBadges.has(badge.slug)
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {badge.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
        {selectedBadges.size > 0 && ` with selected badges`}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading badged members...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-gray-600 mb-4">
              {selectedBadges.size > 0 || searchQuery
                ? 'Try adjusting your filters'
                : 'No members have earned badges yet'}
            </p>
            {(selectedBadges.size > 0 || searchQuery) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members Grid */}
      {!loading && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Link to={`/users/${user.id}`} className="block">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {user.full_name || user.email}
                      </h3>
                      {user.job_title && (
                        <p className="text-sm text-gray-600 truncate">
                          {user.job_title}
                        </p>
                      )}
                      {user.company_name && (
                        <p className="text-sm text-gray-500 truncate">
                          {user.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Badges */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {user.badge_count} {user.badge_count === 1 ? 'Badge' : 'Badges'}
                    </span>
                  </div>
                  <BadgeDisplay badges={user.badges} maxDisplay={6} size="sm" />
                </div>

                {/* View Profile Button */}
                <Link to={`/users/${user.id}`}>
                  <Button variant="outline" className="w-full">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
