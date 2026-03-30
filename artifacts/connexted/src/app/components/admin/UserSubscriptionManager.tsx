// Split candidate: ~519 lines — consider extracting SubscriptionCard, TierUpgradeDialog, and PaymentHistoryTable into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import { Edit, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface UserSubscriptionManagerProps {
  userId: string;
  userName?: string;
}

interface MembershipTier {
  id: string;
  class_number: number;
  display_name: string;
  max_admin_circles: number;
  max_admin_containers: number;
  max_member_containers: number;
  description: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  payment_status: string;
  payment_method: string;
  billing_cycle: string;
  is_active: boolean;
  admin_override: boolean;
  current_period_start: string;
  current_period_end: string;
  payment_notes: string;
  internal_notes: string;
  created_at: string;
  user_classes: MembershipTier;
}

export function UserSubscriptionManager({ userId, userName }: UserSubscriptionManagerProps) {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    tier_id: '',
    payment_status: 'paid',
    payment_method: 'manual',
    billing_cycle: 'monthly',
    admin_override: false,
    current_period_start: new Date().toISOString().split('T')[0],
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_notes: '',
    internal_notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user classes (tiers)
      const { data: tiersData, error: tiersError } = await supabase
        .from('user_classes')
        .select('*')
        .order('class_number');

      if (tiersError) {
        console.error('Error fetching tiers:', tiersError);
      }

      setTiers(tiersData || []);

      // Fetch user's current subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          user_classes (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (subData) {
        setSubscription(subData as any);
        setFormData({
          tier_id: subData.tier_id,
          payment_status: subData.payment_status,
          payment_method: subData.payment_method,
          billing_cycle: subData.billing_cycle,
          admin_override: subData.admin_override,
          current_period_start: subData.current_period_start?.split('T')[0] || '',
          current_period_end: subData.current_period_end?.split('T')[0] || '',
          payment_notes: subData.payment_notes || '',
          internal_notes: subData.internal_notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (subscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            tier_id: formData.tier_id,
            payment_status: formData.payment_status,
            payment_method: formData.payment_method,
            billing_cycle: formData.billing_cycle,
            admin_override: formData.admin_override,
            current_period_start: formData.current_period_start,
            current_period_end: formData.current_period_end,
            payment_notes: formData.payment_notes,
            internal_notes: formData.internal_notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (error) throw error;

        // Update user's user_class to match class_number
        const selectedTier = tiers.find(t => t.id === formData.tier_id);
        if (selectedTier) {
          await supabase
            .from('users')
            .update({ user_class: selectedTier.class_number })
            .eq('id', userId);
        }

        toast.success('Subscription updated successfully');
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier_id: formData.tier_id,
            payment_status: formData.payment_status,
            payment_method: formData.payment_method,
            billing_cycle: formData.billing_cycle,
            admin_override: formData.admin_override,
            current_period_start: formData.current_period_start,
            current_period_end: formData.current_period_end,
            payment_notes: formData.payment_notes,
            internal_notes: formData.internal_notes,
            is_active: true,
            created_by: profile?.id,
          });

        if (error) throw error;

        // Update user's user_class
        const selectedTier = tiers.find(t => t.id === formData.tier_id);
        if (selectedTier) {
          await supabase
            .from('users')
            .update({ user_class: selectedTier.class_number })
            .eq('id', userId);
        }

        toast.success('Subscription created successfully');
      }

      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Failed to save subscription');
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatLimit = (value: number) => {
    return value === -1 ? '∞' : value.toString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      paid: { variant: 'default', icon: CheckCircle },
      unpaid: { variant: 'destructive', icon: XCircle },
      trial: { variant: 'secondary', icon: Calendar },
      overdue: { variant: 'destructive', icon: AlertCircle },
      cancelled: { variant: 'outline', icon: XCircle },
    };

    const config = variants[status] || variants.unpaid;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading subscription data...</div>;
  }

  return (
    <div className="space-y-4">
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  Manage {userName ? `${userName}'s` : "user's"} subscription tier and payment status
                </CardDescription>
              </div>
              <Button onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Subscription
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tier Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Tier Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Class:</span>
                    <span className="font-semibold">{subscription.user_classes.display_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Billing:</span>
                    <span className="font-semibold capitalize">
                      {subscription.billing_cycle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Admin Circles Limit:</span>
                    <span className="font-semibold">{formatLimit(subscription.user_classes.max_admin_circles)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Admin Containers Limit:</span>
                    <span className="font-semibold">{formatLimit(subscription.user_classes.max_admin_containers)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Member Containers Limit:</span>
                    <span className="font-semibold">{formatLimit(subscription.user_classes.max_member_containers)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Payment Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getStatusBadge(subscription.payment_status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="font-semibold capitalize">{subscription.payment_method}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Period Start:</span>
                    <span className="font-semibold">
                      {subscription.current_period_start 
                        ? new Date(subscription.current_period_start).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Period End:</span>
                    <span className="font-semibold">
                      {subscription.current_period_end 
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  {subscription.admin_override && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-purple-50 rounded border border-purple-200">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-900">Admin Override (Free Access)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {(subscription.payment_notes || subscription.internal_notes) && (
              <div className="mt-6 pt-6 border-t">
                {subscription.payment_notes && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold mb-1">Payment Notes:</h4>
                    <p className="text-sm text-gray-600">{subscription.payment_notes}</p>
                  </div>
                )}
                {subscription.internal_notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Internal Notes:</h4>
                    <p className="text-sm text-gray-600">{subscription.internal_notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>
              This user doesn't have an active subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setEditDialogOpen(true)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Create Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {subscription ? 'Edit Subscription' : 'Create Subscription'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Tier Selection */}
            <div>
              <Label htmlFor="tier">Membership Tier</Label>
              <Select
                value={formData.tier_id}
                onValueChange={(value) => setFormData({ ...formData, tier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.display_name} (Class {tier.class_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Payment Status */}
              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Billing Cycle */}
            <div>
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period_start">Period Start</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.current_period_start}
                  onChange={(e) => setFormData({ ...formData, current_period_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="period_end">Period End</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.current_period_end}
                  onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
                />
              </div>
            </div>

            {/* Admin Override */}
            <div className="flex items-center space-x-2">
              <Switch
                id="admin_override"
                checked={formData.admin_override}
                onCheckedChange={(checked) => setFormData({ ...formData, admin_override: checked })}
              />
              <Label htmlFor="admin_override">
                Admin Override (Grant free access regardless of payment)
              </Label>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="payment_notes">Payment Notes (Visible to user)</Label>
              <Textarea
                id="payment_notes"
                value={formData.payment_notes}
                onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                placeholder="e.g., Paid via wire transfer confirmation #1234"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="internal_notes">Internal Notes (Admin only)</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                placeholder="Internal notes for admin tracking"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {subscription ? 'Update Subscription' : 'Create Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}