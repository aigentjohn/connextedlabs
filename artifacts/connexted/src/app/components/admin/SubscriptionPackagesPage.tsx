// Split candidate: ~600 lines — consider extracting PackageTierCard, PackagePricingTable, and PackageEditDialog into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Edit,
  Save,
  X,
  Check,
  Crown,
  Users,
  Package,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  user_class_number: number;
  monthly_price: number | null;
  yearly_price: number | null;
  features: string[];
  is_visible: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function SubscriptionPackagesPage() {
  const { profile } = useAuth();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    user_class_number: 0,
    monthly_price: 0,
    yearly_price: 0,
    features: '',
    is_visible: true,
    is_default: false,
    sort_order: 0,
  });

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchTiers();
    }
  }, [profile]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      
      // Fetch from the server API
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/subscription-tiers`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Error fetching subscription tiers:', result.error);
        
        // Try to initialize default tiers if none exist
        await initializeDefaultTiers();
        return;
      }
      
      setTiers(result.tiers || []);
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTiers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/subscription-tiers/initialize`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Default subscription tiers initialized');
        setTiers(result.tiers || []);
      }
    } catch (error) {
      console.error('Error initializing tiers:', error);
    }
  };

  const handleOpenDialog = (tier?: SubscriptionTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || '',
        user_class_number: tier.user_class_number,
        monthly_price: tier.monthly_price || 0,
        yearly_price: tier.yearly_price || 0,
        features: tier.features.join('\n'),
        is_visible: tier.is_visible,
        is_default: tier.is_default,
        sort_order: tier.sort_order,
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: '',
        description: '',
        user_class_number: 0,
        monthly_price: 0,
        yearly_price: 0,
        features: '',
        is_visible: true,
        is_default: false,
        sort_order: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveTier = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      const tierData = {
        ...(editingTier || {}),
        id: editingTier?.id || `tier_${formData.user_class_number}`,
        name: formData.name,
        description: formData.description || null,
        user_class_number: formData.user_class_number,
        monthly_price: formData.monthly_price || null,
        yearly_price: formData.yearly_price || null,
        features: formData.features.split('\n').filter(f => f.trim()),
        is_visible: formData.is_visible,
        is_default: formData.is_default,
        sort_order: formData.sort_order,
        created_at: editingTier?.created_at || new Date().toISOString(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/subscription-tiers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tierData),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save tier');
      }

      toast.success(editingTier ? 'Subscription tier updated' : 'Subscription tier created');
      setDialogOpen(false);
      fetchTiers();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save subscription tier');
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/subscription-tiers/${tierId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete tier');
      }

      toast.success('Subscription tier deleted');
      fetchTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Failed to delete subscription tier');
    }
  };

  const toggleVisibility = async (tier: SubscriptionTier) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      
      const updatedTier = {
        ...tier,
        is_visible: !tier.is_visible,
      };
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/subscription-tiers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTier),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update tier');
      }

      toast.success(`Tier ${tier.is_visible ? 'hidden' : 'made visible'}`);
      fetchTiers();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update tier visibility');
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Super admin access required. This page manages subscription packages that are sold to customers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Subscription Packages' }
        ]} 
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Subscription Packages</h1>
          <p className="text-gray-600">Manage commercial subscription tiers and pricing for marketing</p>
        </div>
        <Link to="/platform-admin/user-classes">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Manage User Classes
          </Button>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Commercial Subscription Tiers</h3>
              <p className="text-sm text-blue-800 mb-2">
                Subscription tiers are <strong>commercial offerings</strong> that map to user classes. 
                Configure pricing, features, and visibility for what you want to sell.
              </p>
              <p className="text-sm text-blue-800">
                User classes define technical capabilities. Subscription tiers define what's available for purchase. 
                You can hide tiers or adjust pricing without changing the underlying user class structure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={!tier.is_visible ? 'border-gray-300 opacity-60' : tier.is_default ? 'border-blue-500 border-2' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {tier.is_visible ? <Eye className="w-5 h-5 text-green-500" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                    {tier.name}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    {tier.is_default && <Badge variant="default">Default</Badge>}
                    {!tier.is_visible && <Badge variant="secondary">Hidden</Badge>}
                    <Badge variant="outline">Class {tier.user_class_number}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(tier)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              {tier.description && (
                <p className="text-sm text-gray-600">{tier.description}</p>
              )}

              {/* Pricing */}
              <div className="bg-gray-50 rounded p-3 border border-gray-200">
                {tier.monthly_price || tier.yearly_price ? (
                  <div className="space-y-1">
                    {tier.monthly_price && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-semibold">${tier.monthly_price.toFixed(2)}</span>
                      </div>
                    )}
                    {tier.yearly_price && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Yearly:</span>
                        <span className="font-semibold">${tier.yearly_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center">No pricing set</p>
                )}
              </div>

              {/* Features */}
              {tier.features && tier.features.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <p className="text-sm font-medium">Features:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => toggleVisibility(tier)}
                >
                  {tier.is_visible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {tier.is_visible ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTier(tier.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No user classes configured yet.</p>
            <Link to="/platform-admin/user-classes">
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Go to User Class Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Subscription Tier' : 'Create Subscription Tier'}
            </DialogTitle>
            <DialogDescription>
              Define container limits and pricing for this membership tier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tier Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Bronze, Silver, Gold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Basic, Standard, Premium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_class_number">
                User Class Number
              </Label>
              <Input
                id="user_class_number"
                type="number"
                value={formData.user_class_number}
                onChange={(e) => setFormData({ ...formData, user_class_number: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">
                Corresponding user class number (1-10)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_price">Monthly Price ($) - Optional</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  step="0.01"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearly_price">Yearly Price ($) - Optional</Label>
                <Input
                  id="yearly_price"
                  type="number"
                  step="0.01"
                  value={formData.yearly_price}
                  onChange={(e) => setFormData({ ...formData, yearly_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                className="w-full min-h-[120px] px-3 py-2 border rounded-md"
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_visible"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_visible" className="cursor-pointer">
                Make tier visible
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Set as default tier for new users
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">
                Determines the order of tiers in the list
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              <Save className="w-4 h-4 mr-2" />
              {editingTier ? 'Update' : 'Create'} Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}