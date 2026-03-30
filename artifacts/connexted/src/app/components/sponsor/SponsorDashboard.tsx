import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useSponsor } from '@/lib/sponsor-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Building2,
  Star,
  Users,
  Table,
  TrendingUp,
  Video,
  Presentation,
  Hammer,
  MessageSquare,
  Users2,
  BookOpen,
  CheckSquare,
  Zap,
  Plus,
  Crown,
  Eye,
  PlusCircle,
} from 'lucide-react';

const containerIcons: Record<string, any> = {
  tables: Table,
  elevators: TrendingUp,
  meetings: Video,
  pitches: Presentation,
  builds: Hammer,
  standups: MessageSquare,
  meetups: Users2,
  libraries: BookOpen,
  checklists: CheckSquare,
  sprints: Zap,
};

const containerLabels: Record<string, string> = {
  tables: 'Tables',
  elevators: 'Elevators',
  meetings: 'Meetings',
  pitches: 'Pitches',
  builds: 'Builds',
  standups: 'Standups',
  meetups: 'Meetups',
  libraries: 'Libraries',
  checklists: 'Checklists',
  sprints: 'Sprints',
};

export default function SponsorDashboard() {
  const { profile } = useAuth();
  const { memberships, permissions, loading, isSponsorMember, canManageSponsor } = useSponsor();

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading sponsor dashboard...</p>
      </div>
    );
  }

  if (!isSponsorMember) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Sponsor Dashboard' }]} />
        
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl mb-2">No Sponsor Memberships</h2>
            <p className="text-gray-600 mb-6">
              You are not currently a member of any sponsor organizations.
            </p>
            <Button asChild>
              <Link to="/sponsors">Browse Sponsors</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Sponsor Dashboard' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Sponsor Dashboard</h1>
        <p className="text-gray-600">
          Manage your sponsor organizations and create containers
        </p>
      </div>

      {/* Sponsor Organizations */}
      <div className="space-y-6">
        {memberships.map((membership) => {
          const sponsorPerms = permissions.find((p) => p.sponsor_id === membership.sponsor_id);
          const isManager = canManageSponsor(membership.sponsor_id);

          return (
            <Card key={membership.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                      {membership.sponsor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{membership.sponsor.name}</CardTitle>
                        {membership.sponsor.tier && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                            <Crown className="w-3 h-3 mr-1" />
                            {sponsorPerms?.tier_name || 'Unknown'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {membership.role === 'owner' && '👑 Owner'}
                          {membership.role === 'admin' && '⚙️ Admin'}
                          {membership.role === 'member' && '👤 Member'}
                          {membership.role === 'viewer' && '👁️ Viewer'}
                        </Badge>
                        <Link
                          to={`/sponsors/${membership.sponsor.slug}`}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Container Permissions & Usage */}
                {sponsorPerms && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Container Limits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sponsorPerms.permissions
                        .filter((perm) => perm.can_view)
                        .map((perm) => {
                          const Icon = containerIcons[perm.container_type] || Table;
                          const count = sponsorPerms.current_counts.find(
                            (c) => c.container_type === perm.container_type
                          )?.count || 0;
                          const maxCount = perm.max_count;
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          const canCreate = perm.can_create && count < maxCount;

                          return (
                            <div
                              key={perm.container_type}
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {containerLabels[perm.container_type] || perm.container_type}
                                  </span>
                                </div>
                                {perm.can_create ? (
                                  <Badge variant="outline" className="text-xs">
                                    <PlusCircle className="w-3 h-3 mr-1" />
                                    Create
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-baseline justify-between text-sm">
                                  <span className="text-gray-600">Usage</span>
                                  <span className="font-semibold text-gray-900">
                                    {count} / {maxCount === 999999 ? '∞' : maxCount}
                                  </span>
                                </div>
                                {maxCount < 999999 && (
                                  <Progress 
                                    value={percentage} 
                                    className={`h-2 ${percentage >= 100 ? 'bg-red-100' : ''}`}
                                  />
                                )}
                              </div>

                              {canCreate && (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-3"
                                >
                                  <Link to={`/${perm.container_type}/create?sponsor=${membership.sponsor_id}`}>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Create New
                                  </Link>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Management Actions */}
                {isManager && (
                  <div className="mt-6 pt-6 border-t flex gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/sponsors/${membership.sponsor.slug}/members`}>
                        <Users className="w-4 h-4 mr-2" />
                        Manage Members
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/sponsors/${membership.sponsor.slug}/settings`}>
                        Settings
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
