import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import {
  Crown,
  Save,
  RotateCcw,
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

interface SponsorTier {
  id: string;
  tier_name: string;
  tier_level: number;
  description: string;
}

interface TierPermission {
  id: string;
  tier_id: string;
  container_type: string;
  can_view: boolean;
  can_create: boolean;
  max_count: number;
}

export default function SponsorTierManagement() {
  const { profile } = useAuth();
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [permissions, setPermissions] = useState<TierPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('sponsor_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // Set first tier as selected if none selected
      if (tiersData && tiersData.length > 0 && !selectedTier) {
        setSelectedTier(tiersData[0].id);
      }

      // Fetch all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('sponsor_tier_permissions')
        .select('*');

      if (permsError) throw permsError;
      setPermissions(permsData || []);
    } catch (error) {
      console.error('Error fetching sponsor tiers:', error);
      toast.error('Failed to load sponsor tiers');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    tierId: string,
    containerType: string,
    field: 'can_view' | 'can_create' | 'max_count',
    value: boolean | number
  ) => {
    try {
      const existingPerm = permissions.find(
        (p) => p.tier_id === tierId && p.container_type === containerType
      );

      if (existingPerm) {
        // Update existing permission
        const { error } = await supabase
          .from('sponsor_tier_permissions')
          .update({ [field]: value })
          .eq('id', existingPerm.id);

        if (error) throw error;

        setPermissions((prev) =>
          prev.map((p) =>
            p.id === existingPerm.id ? { ...p, [field]: value } : p
          )
        );
      } else {
        // Create new permission
        const newPerm = {
          tier_id: tierId,
          container_type: containerType,
          can_view: field === 'can_view' ? value : false,
          can_create: field === 'can_create' ? value : false,
          max_count: field === 'max_count' ? value : 0,
        };

        const { data, error } = await supabase
          .from('sponsor_tier_permissions')
          .insert([newPerm])
          .select()
          .single();

        if (error) throw error;
        setPermissions((prev) => [...prev, data]);
      }

      toast.success('Permission updated');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const getPermission = (tierId: string, containerType: string): TierPermission | undefined => {
    return permissions.find(
      (p) => p.tier_id === tierId && p.container_type === containerType
    );
  };

  const getTierBadgeColor = (tierLevel: number) => {
    switch (tierLevel) {
      case 1: return 'bg-amber-700 text-white'; // Bronze
      case 2: return 'bg-gray-400 text-white'; // Silver
      case 3: return 'bg-yellow-600 text-white'; // Gold
      case 4: return 'bg-slate-700 text-white'; // Platinum
      default: return 'bg-blue-600 text-white';
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading sponsor tiers...</p>
      </div>
    );
  }

  const containerTypes = Object.keys(containerLabels);
  const currentTier = tiers.find((t) => t.id === selectedTier);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Sponsor Tier Management' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Sponsor Tier Management</h1>
        <p className="text-gray-600">
          Configure container access and limits for each sponsor tier
        </p>
      </div>

      {/* Tier Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tier to Configure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedTier === tier.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className={`w-5 h-5 ${selectedTier === tier.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="font-semibold text-gray-900">{tier.tier_name}</span>
                </div>
                <Badge className={getTierBadgeColor(tier.tier_level)}>
                  Level {tier.tier_level}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      {currentTier && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  {currentTier.tier_name} Tier Permissions
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">{currentTier.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-gray-600 pb-2 border-b">
                <div className="col-span-4">Container Type</div>
                <div className="col-span-2 text-center">Can View</div>
                <div className="col-span-2 text-center">Can Create</div>
                <div className="col-span-4 text-center">Max Count</div>
              </div>

              {containerTypes.map((containerType) => {
                const perm = getPermission(currentTier.id, containerType);
                const Icon = containerIcons[containerType];

                return (
                  <div
                    key={containerType}
                    className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 hover:bg-gray-50 rounded px-2"
                  >
                    {/* Container Name */}
                    <div className="col-span-4 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {containerLabels[containerType]}
                      </span>
                    </div>

                    {/* Can View Switch */}
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={perm?.can_view || false}
                        onCheckedChange={(checked) =>
                          updatePermission(currentTier.id, containerType, 'can_view', checked)
                        }
                      />
                    </div>

                    {/* Can Create Switch */}
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={perm?.can_create || false}
                        onCheckedChange={(checked) =>
                          updatePermission(currentTier.id, containerType, 'can_create', checked)
                        }
                        disabled={!perm?.can_view}
                      />
                    </div>

                    {/* Max Count Input */}
                    <div className="col-span-4 flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={perm?.max_count || 0}
                        onChange={(e) =>
                          updatePermission(
                            currentTier.id,
                            containerType,
                            'max_count',
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={!perm?.can_create}
                        className="w-24"
                      />
                      <span className="text-xs text-gray-500">
                        ({perm?.max_count === 999999 ? 'Unlimited' : perm?.max_count || 0})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Helper Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Use 999999 for unlimited access. Can Create requires Can View to be enabled.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}