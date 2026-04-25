import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { fetchAllMarkets, type MarketInfo } from '@/lib/tier-permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Tier {
  tier_id: string;
  tier_name: string;
  tier_order: number;
  description: string;
  can_create_company: boolean;
  max_companies: number;
  max_offerings_per_company: number;
  accessible_market_ids: string[];
  can_feature_offerings: boolean;
  can_view_analytics: boolean;
}

const EMPTY_TIER: Tier = {
  tier_id: '',
  tier_name: '',
  tier_order: 1,
  description: '',
  can_create_company: false,
  max_companies: 0,
  max_offerings_per_company: 0,
  accessible_market_ids: [],
  can_feature_offerings: false,
  can_view_analytics: false,
};

export default function MembershipTierPermissionsPage() {
  const { profile } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchTiers();
      fetchAllMarkets().then(setMarkets);
    }
  }, [profile]);

  const fetchTiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('membership_tier_permissions')
      .select('*')
      .order('tier_order');
    if (error) {
      toast.error('Failed to load tiers');
    } else {
      setTiers(data || []);
    }
    setLoading(false);
  };

  const openEdit = (tier: Tier) => {
    setEditTier({ ...tier });
    setIsNew(false);
  };

  const openNew = () => {
    setEditTier({ ...EMPTY_TIER, tier_order: tiers.length + 1 });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editTier) return;
    if (!editTier.tier_id.trim() || !editTier.tier_name.trim()) {
      toast.error('Tier ID and name are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('membership_tier_permissions')
      .upsert(editTier, { onConflict: 'tier_id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isNew ? 'Tier created' : 'Tier updated');
      setEditTier(null);
      fetchTiers();
    }
  };

  const handleDelete = async (tierId: string) => {
    const { error } = await supabase
      .from('membership_tier_permissions')
      .delete()
      .eq('tier_id', tierId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Tier deleted');
      setTiers(tiers.filter(t => t.tier_id !== tierId));
    }
    setDeleteConfirm(null);
  };

  const toggleMarket = (marketId: string) => {
    if (!editTier) return;
    const ids = editTier.accessible_market_ids.includes(marketId)
      ? editTier.accessible_market_ids.filter(id => id !== marketId)
      : [...editTier.accessible_market_ids, marketId];
    setEditTier({ ...editTier, accessible_market_ids: ids });
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return <div className="p-8 text-red-600">Access denied</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Membership Tiers', href: '/platform-admin/membership-tiers' },
          { label: 'Tier Permissions' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-1">Membership Tier Permissions</h1>
          <p className="text-gray-600">Define what each tier means and what members can do</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          {tiers.map(tier => (
            <Card key={tier.tier_id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{tier.tier_name}</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">{tier.tier_id}</Badge>
                      <Badge variant="secondary" className="text-xs">Order {tier.tier_order}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{tier.description || <span className="italic text-gray-400">No description</span>}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(tier)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(tier.tier_id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-sm">
                  {tier.can_create_company && (
                    <Badge className="bg-green-100 text-green-800">
                      {tier.max_companies === -1 ? 'Unlimited' : tier.max_companies} {tier.max_companies === 1 ? 'company' : 'companies'}
                    </Badge>
                  )}
                  {tier.can_create_company && (
                    <Badge className="bg-blue-100 text-blue-800">
                      {tier.max_offerings_per_company === -1 ? 'Unlimited' : tier.max_offerings_per_company} offerings/company
                    </Badge>
                  )}
                  {tier.can_feature_offerings && <Badge className="bg-yellow-100 text-yellow-800">Featured listings</Badge>}
                  {tier.can_view_analytics && <Badge className="bg-purple-100 text-purple-800">Analytics</Badge>}
                  {!tier.can_create_company && <Badge variant="outline" className="text-gray-500">Browse only</Badge>}
                  {tier.accessible_market_ids.length > 0 && (
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {tier.accessible_market_ids.length} market{tier.accessible_market_ids.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {tier.accessible_market_ids.length > 0 && markets.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Markets: {tier.accessible_market_ids
                      .map(id => markets.find(m => m.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {tiers.length === 0 && (
            <p className="text-gray-500 text-sm">No tiers defined yet. Click "Add Tier" to create the first one.</p>
          )}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={!!editTier} onOpenChange={(open) => { if (!open) setEditTier(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New Tier' : `Edit: ${editTier?.tier_name}`}</DialogTitle>
          </DialogHeader>

          {editTier && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tier ID <span className="text-red-500">*</span></Label>
                  <Input
                    value={editTier.tier_id}
                    onChange={e => setEditTier({ ...editTier, tier_id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="free"
                    disabled={!isNew}
                  />
                  <p className="text-xs text-gray-400">Lowercase, no spaces. Cannot change after creation.</p>
                </div>
                <div className="space-y-1">
                  <Label>Order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editTier.tier_order}
                    onChange={e => setEditTier({ ...editTier, tier_order: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Display Name <span className="text-red-500">*</span></Label>
                <Input
                  value={editTier.tier_name}
                  onChange={e => setEditTier({ ...editTier, tier_name: e.target.value })}
                  placeholder="Free"
                />
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={editTier.description}
                  onChange={e => setEditTier({ ...editTier, description: e.target.value })}
                  placeholder="What does this tier include? What can members do?"
                  rows={3}
                />
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <p className="text-sm font-medium">Company & Offering Permissions</p>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can create a company</Label>
                  <Switch
                    checked={editTier.can_create_company}
                    onCheckedChange={v => setEditTier({ ...editTier, can_create_company: v })}
                  />
                </div>

                {editTier.can_create_company && (
                  <div className="grid grid-cols-2 gap-3 pl-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Max companies (-1 = unlimited)</Label>
                      <Input
                        type="number"
                        min={-1}
                        value={editTier.max_companies}
                        onChange={e => setEditTier({ ...editTier, max_companies: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Max offerings/company (-1 = unlimited)</Label>
                      <Input
                        type="number"
                        min={-1}
                        value={editTier.max_offerings_per_company}
                        onChange={e => setEditTier({ ...editTier, max_offerings_per_company: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can feature offerings</Label>
                  <Switch
                    checked={editTier.can_feature_offerings}
                    onCheckedChange={v => setEditTier({ ...editTier, can_feature_offerings: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can view analytics</Label>
                  <Switch
                    checked={editTier.can_view_analytics}
                    onCheckedChange={v => setEditTier({ ...editTier, can_view_analytics: v })}
                  />
                </div>
              </div>

              {markets.length > 0 && (
                <div className="space-y-2 border rounded-lg p-4">
                  <p className="text-sm font-medium">Market Access</p>
                  <p className="text-xs text-gray-500">Select which markets this tier can place offerings into</p>
                  <div className="space-y-2 mt-2">
                    {markets.map(market => (
                      <div key={market.id} className="flex items-center justify-between">
                        <Label className="font-normal flex items-center gap-2">
                          <span>{market.icon}</span>
                          {market.name}
                          {!market.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        </Label>
                        <Switch
                          checked={editTier.accessible_market_ids.includes(market.id)}
                          onCheckedChange={() => toggleMarket(market.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTier(null)}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tier "{deleteConfirm}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Users currently assigned this tier will keep the value but it will no longer appear in tier management dropdowns.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
