/**
 * Badge Management Page (Admin)
 * 
 * Complete admin interface for managing badges.
 */

import React, { useState } from 'react';
import { AdminBadgeAssignment } from './AdminBadgeAssignment';
import { BadgeList } from './BadgeDisplay';
import { useBadgeTypes, useUserBadges } from '@/hooks/useBadges';
import { Award, Plus, Users, Building2 } from 'lucide-react';

export function BadgeManagementPage() {
  const [activeTab, setActiveTab] = useState<'assign' | 'types' | 'recent'>('assign');
  const { badgeTypes, loading: typesLoading } = useBadgeTypes();
  const [showSuccess, setShowSuccess] = useState(false);

  function handleBadgeIssued() {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Award className="w-8 h-8 text-blue-600" />
          Badge Management
        </h1>
        <p className="text-gray-600 mt-2">
          Issue badges to users and companies, manage badge types, and view badge analytics.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ✅ Badge successfully issued!
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('assign')}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'assign'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Assign Badge
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'types'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Badge Types ({badgeTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'recent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Activity
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'assign' && (
          <AdminBadgeAssignment onSuccess={handleBadgeIssued} />
        )}

        {activeTab === 'types' && (
          <BadgeTypesTab badgeTypes={badgeTypes} loading={typesLoading} />
        )}

        {activeTab === 'recent' && (
          <RecentActivityTab />
        )}
      </div>
    </div>
  );
}

export default BadgeManagementPage;

/**
 * Badge Types Tab
 */
function BadgeTypesTab({ badgeTypes, loading }: { badgeTypes: any[], loading: boolean }) {
  if (loading) {
    return <div className="text-center py-12">Loading badge types...</div>;
  }

  // Group by category
  const grouped = badgeTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryLabels: Record<string, string> = {
    completion: 'Completion Badges',
    endorsement: 'Endorsement Badges',
    skill: 'Skill Badges',
    verification: 'Verification Badges',
    achievement: 'Achievement Badges',
    membership: 'Membership Badges',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    completion: '✅',
    endorsement: '⭐',
    skill: '🏆',
    verification: '✓',
    achievement: '🎖️',
    membership: '👥',
  };

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, types]) => (
        <div key={category}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">{categoryIcons[category]}</span>
            {categoryLabels[category] || category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => (
              <div
                key={type.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0"
                    style={{ backgroundColor: type.badge_color }}
                  >
                    {categoryIcons[category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{type.name}</h3>
                    {type.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {type.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {type.issuer_type}
                      </span>
                      {type.assignable_to.includes('user') && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                          <Users className="w-3 h-3" /> User
                        </span>
                      )}
                      {type.assignable_to.includes('company') && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Company
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Recent Activity Tab
 */
function RecentActivityTab() {
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadRecentActivity();
  }, []);

  async function loadRecentActivity() {
    try {
      setLoading(true);

      // Import supabase here to avoid circular deps at module level
      const { supabase } = await import('@/lib/supabase');

      // Fetch recent user badges
      const { data: userBadges, error: userError } = await supabase
        .from('user_badges')
        .select(`
          id,
          created_at,
          issuer_message,
          is_public,
          issued_by_system,
          badge_type:badge_types(id, name, slug, category, badge_color),
          recipient:users!user_badges_recipient_user_id_fkey(id, full_name, avatar_url),
          issuer:users!user_badges_issued_by_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (userError) {
        console.error('Error fetching user badges:', userError);
      }

      // Fetch recent company badges
      const { data: companyBadges, error: companyError } = await supabase
        .from('company_badges')
        .select(`
          id,
          issued_at,
          issuer_message,
          is_public,
          issued_by_system,
          badge_type:badge_types(id, name, slug, category, badge_color),
          company:market_companies(id, name, logo_url),
          issuer:users!company_badges_issued_by_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('issued_at', { ascending: false })
        .limit(30);

      if (companyError) {
        console.error('Error fetching company badges:', companyError);
      }

      // Merge and sort by date
      const merged = [
        ...(userBadges || []).map((b: any) => ({
          id: b.id,
          type: 'user' as const,
          date: b.created_at,
          badge_type: b.badge_type,
          recipient_name: b.recipient?.full_name || 'Unknown User',
          recipient_avatar: b.recipient?.avatar_url,
          issuer_name: b.issued_by_system ? 'System' : (b.issuer?.full_name || 'Unknown'),
          issuer_message: b.issuer_message,
          is_public: b.is_public,
        })),
        ...(companyBadges || []).map((b: any) => ({
          id: b.id,
          type: 'company' as const,
          date: b.issued_at,
          badge_type: b.badge_type,
          recipient_name: b.company?.name || 'Unknown Company',
          recipient_avatar: b.company?.logo_url,
          issuer_name: b.issued_by_system ? 'System' : (b.issuer?.full_name || 'Unknown'),
          issuer_message: b.issuer_message,
          is_public: b.is_public,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivities(merged);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Badge Activity</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Badge Activity</h2>
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No badge activity yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Badges will appear here as they are issued to users and companies.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Badge color dot */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                style={{ backgroundColor: activity.badge_type?.badge_color || '#3B82F6' }}
              >
                {activity.type === 'user' ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
              </div>

              {/* Activity details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{activity.badge_type?.name || 'Badge'}</span>
                  {' awarded to '}
                  <span className="font-medium">{activity.recipient_name}</span>
                  {activity.type === 'company' && (
                    <span className="text-purple-600 text-xs ml-1">(Company)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>
                    {activity.issuer_name === 'System' ? 'Auto-issued' : `By ${activity.issuer_name}`}
                  </span>
                  <span>&middot;</span>
                  <span>
                    {new Date(activity.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {!activity.is_public && (
                    <>
                      <span>&middot;</span>
                      <span className="text-amber-600">Private</span>
                    </>
                  )}
                </div>
                {activity.issuer_message && (
                  <p className="text-xs text-gray-400 mt-1 italic truncate">
                    "{activity.issuer_message}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}