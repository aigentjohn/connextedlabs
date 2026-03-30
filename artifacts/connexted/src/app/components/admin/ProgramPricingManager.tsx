// Split candidate: ~562 lines — consider extracting PricingTierRow, KitProductLinker, and PricingPreviewCard into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { DollarSign, Users, CheckCircle, XCircle, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ProgramPricingManagerProps {
  programId: string;
  programName?: string;
}

interface ProgramPurchase {
  id: string;
  user_id: string;
  amount_paid_cents: number;
  payment_status: string;
  payment_method: string;
  payment_date: string;
  access_granted: boolean;
  admin_override: boolean;
  payment_notes: string;
  users: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  };
}

export function ProgramPricingManager({ programId, programName }: ProgramPricingManagerProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Program pricing settings
  const [isPaid, setIsPaid] = useState(false);
  const [priceCents, setPriceCents] = useState(0);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [allowFreeEnrollment, setAllowFreeEnrollment] = useState(true);
  const [revenueSharePercentage, setRevenueSharePercentage] = useState(70);

  // Purchases
  const [purchases, setPurchases] = useState<ProgramPurchase[]>([]);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Enrollment form
  const [enrollFormData, setEnrollFormData] = useState({
    user_id: '',
    payment_status: 'paid',
    payment_method: 'manual',
    amount_paid_cents: 0,
    payment_date: new Date().toISOString().split('T')[0],
    access_granted: true,
    admin_override: false,
    payment_notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [programId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch program pricing settings
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('is_paid, price_cents, payment_required, allow_free_enrollment, revenue_share_percentage')
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      if (programData) {
        setIsPaid(programData.is_paid || false);
        setPriceCents(programData.price_cents || 0);
        setPaymentRequired(programData.payment_required || false);
        setAllowFreeEnrollment(programData.allow_free_enrollment !== false);
        setRevenueSharePercentage(programData.revenue_share_percentage || 70);
        setEnrollFormData(prev => ({ ...prev, amount_paid_cents: programData.price_cents || 0 }));
      }

      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('program_purchases')
        .select(`
          *,
          users:user_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData as any || []);

      // Fetch all users for enrollment
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .order('name');

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching program pricing data:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePricing = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('programs')
        .update({
          is_paid: isPaid,
          price_cents: priceCents,
          payment_required: paymentRequired,
          allow_free_enrollment: allowFreeEnrollment,
          revenue_share_percentage: revenueSharePercentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', programId);

      if (error) throw error;

      toast.success('Pricing settings saved successfully');
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollUser = async () => {
    try {
      if (!enrollFormData.user_id) {
        toast.error('Please select a user');
        return;
      }

      // Check if user already has a purchase record
      const { data: existing } = await supabase
        .from('program_purchases')
        .select('id')
        .eq('user_id', enrollFormData.user_id)
        .eq('program_id', programId)
        .single();

      if (existing) {
        toast.error('User already has a purchase record for this program');
        return;
      }

      const { error } = await supabase
        .from('program_purchases')
        .insert({
          user_id: enrollFormData.user_id,
          program_id: programId,
          amount_paid_cents: enrollFormData.amount_paid_cents,
          payment_status: enrollFormData.payment_status,
          payment_method: enrollFormData.payment_method,
          payment_date: enrollFormData.payment_date,
          access_granted: enrollFormData.access_granted,
          admin_override: enrollFormData.admin_override,
          payment_notes: enrollFormData.payment_notes,
          created_by: profile?.id,
          enrolled_at: enrollFormData.access_granted ? new Date().toISOString() : null,
        });

      if (error) throw error;

      toast.success('User enrolled successfully');
      setEnrollDialogOpen(false);
      fetchData();

      // Reset form
      setEnrollFormData({
        user_id: '',
        payment_status: 'paid',
        payment_method: 'manual',
        amount_paid_cents: priceCents,
        payment_date: new Date().toISOString().split('T')[0],
        access_granted: true,
        admin_override: false,
        payment_notes: '',
      });
    } catch (error) {
      console.error('Error enrolling user:', error);
      toast.error('Failed to enroll user');
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      paid: { variant: 'default', icon: CheckCircle },
      unpaid: { variant: 'destructive', icon: XCircle },
      refunded: { variant: 'secondary', icon: XCircle },
      partial: { variant: 'outline', icon: CheckCircle },
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
    return <div>Loading pricing settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Program Pricing</CardTitle>
          <CardDescription>
            Configure pricing and payment settings for {programName || 'this program'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Paid Program */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_paid" className="text-base">
                This is a paid program
              </Label>
              <div className="text-sm text-gray-500">
                Users must purchase access to this program
              </div>
            </div>
            <Switch
              id="is_paid"
              checked={isPaid}
              onCheckedChange={setIsPaid}
            />
          </div>

          {isPaid && (
            <>
              {/* Price */}
              <div>
                <Label htmlFor="price">Program Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={(priceCents / 100).toFixed(2)}
                  onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value) * 100))}
                  placeholder="99.00"
                />
                <div className="text-sm text-gray-500 mt-1">
                  One-time payment for lifetime access
                </div>
              </div>

              {/* Revenue Share */}
              <div>
                <Label htmlFor="revenue_share">Revenue Share Percentage (%)</Label>
                <Input
                  id="revenue_share"
                  type="number"
                  min="0"
                  max="100"
                  value={revenueSharePercentage}
                  onChange={(e) => setRevenueSharePercentage(parseInt(e.target.value))}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Creator receives {revenueSharePercentage}%, platform receives {100 - revenueSharePercentage}%
                </div>
              </div>

              {/* Payment Required */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="payment_required" className="text-base">
                    Require payment before enrollment
                  </Label>
                  <div className="text-sm text-gray-500">
                    Users cannot access program until payment is confirmed
                  </div>
                </div>
                <Switch
                  id="payment_required"
                  checked={paymentRequired}
                  onCheckedChange={setPaymentRequired}
                />
              </div>

              {/* Allow Free Enrollment */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_free" className="text-base">
                    Allow admin to grant free access
                  </Label>
                  <div className="text-sm text-gray-500">
                    Admins can manually enroll users without payment
                  </div>
                </div>
                <Switch
                  id="allow_free"
                  checked={allowFreeEnrollment}
                  onCheckedChange={setAllowFreeEnrollment}
                />
              </div>
            </>
          )}

          <Button onClick={handleSavePricing} disabled={saving}>
            {saving ? 'Saving...' : 'Save Pricing Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Purchases/Enrollments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enrollments & Purchases</CardTitle>
              <CardDescription>
                Manage user enrollments and track payments
              </CardDescription>
            </div>
            <Button onClick={() => setEnrollDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Enroll User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No enrollments yet
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{purchase.users.name}</div>
                      <div className="text-sm text-gray-500">{purchase.users.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{formatPrice(purchase.amount_paid_cents)}</div>
                      <div className="text-sm text-gray-500 capitalize">{purchase.payment_method}</div>
                    </div>
                    {getStatusBadge(purchase.payment_status)}
                    {purchase.access_granted ? (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Access Granted
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {purchase.admin_override && (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll User Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enroll User in Program</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {/* User Selection */}
            <div>
              <Label htmlFor="user">Select User</Label>
              <Select
                value={enrollFormData.user_id}
                onValueChange={(value) => setEnrollFormData({ ...enrollFormData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
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
                  value={enrollFormData.payment_status}
                  onValueChange={(value) => setEnrollFormData({ ...enrollFormData, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={enrollFormData.payment_method}
                  onValueChange={(value) => setEnrollFormData({ ...enrollFormData, payment_method: value })}
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

            {/* Amount Paid */}
            <div>
              <Label htmlFor="amount_paid">Amount Paid ($)</Label>
              <Input
                id="amount_paid"
                type="number"
                min="0"
                step="0.01"
                value={(enrollFormData.amount_paid_cents / 100).toFixed(2)}
                onChange={(e) => setEnrollFormData({ 
                  ...enrollFormData, 
                  amount_paid_cents: Math.round(parseFloat(e.target.value) * 100) 
                })}
              />
            </div>

            {/* Payment Date */}
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={enrollFormData.payment_date}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, payment_date: e.target.value })}
              />
            </div>

            {/* Access Granted */}
            <div className="flex items-center space-x-2">
              <Switch
                id="access_granted"
                checked={enrollFormData.access_granted}
                onCheckedChange={(checked) => setEnrollFormData({ ...enrollFormData, access_granted: checked })}
              />
              <Label htmlFor="access_granted">Grant immediate access to program</Label>
            </div>

            {/* Admin Override */}
            <div className="flex items-center space-x-2">
              <Switch
                id="admin_override"
                checked={enrollFormData.admin_override}
                onCheckedChange={(checked) => setEnrollFormData({ ...enrollFormData, admin_override: checked })}
              />
              <Label htmlFor="admin_override">Free enrollment (admin override)</Label>
            </div>

            {/* Payment Notes */}
            <div>
              <Label htmlFor="payment_notes">Payment Notes</Label>
              <Textarea
                id="payment_notes"
                value={enrollFormData.payment_notes}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, payment_notes: e.target.value })}
                placeholder="e.g., Paid via wire transfer confirmation #1234"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnrollUser}>
              Enroll User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
