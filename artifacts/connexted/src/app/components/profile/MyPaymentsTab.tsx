/**
 * MyPaymentsTab Component
 *
 * Embedded version of MyPaymentsPage for use inside ProfilePage tabs.
 * Shows current plan, upgrade options, payment method, and payment history.
 *
 * Update frequency: Tier 2 (engagement) - changes with billing cycle.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  Crown,
  Star,
  ArrowUpRight,
  Download,
} from 'lucide-react';

interface MyPaymentsTabProps {
  profile: any;
}

export function MyPaymentsTab({ profile }: MyPaymentsTabProps) {
  if (!profile) return null;

  const validTier = profile.membership_tier || 'free';

  // Mock subscription data - in real app would come from payment provider
  const subscriptionInfo = {
    tier: validTier,
    status: 'active',
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    startDate: new Date(profile.created_at) || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    price: validTier === 'premium' ? 29.99 : validTier === 'member' ? 9.99 : 0,
    billingCycle: 'monthly',
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryDate: '12/2025',
    },
  };

  // Mock payment history
  const paymentHistory = validTier !== 'free' ? [
    { id: 1, date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: subscriptionInfo.price, status: 'paid' },
    { id: 2, date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: subscriptionInfo.price, status: 'paid' },
    { id: 3, date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), amount: subscriptionInfo.price, status: 'paid' },
  ] : [];

  const tierBenefits = {
    free: [
      'Access to Open circles',
      'View public content',
      'Basic profile',
    ],
    member: [
      'All Free features',
      'Join member-only circles',
      'Access premium content',
      'Enhanced profile',
      'Priority support',
    ],
    premium: [
      'All Member features',
      'Join premium circles',
      'Unlimited document uploads',
      'Advanced analytics',
      'Early access to new features',
      'Premium badge',
    ],
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <Crown className="w-6 h-6 text-yellow-600" />;
      case 'member':
        return <Star className="w-6 h-6 text-indigo-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'from-yellow-500 to-orange-600';
      case 'member':
        return 'from-indigo-500 to-purple-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const canUpgrade = validTier !== 'premium';
  const canDowngrade = validTier !== 'free';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${getTierColor(subscriptionInfo.tier)} opacity-10 rounded-full -mr-32 -mt-32`} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTierIcon(subscriptionInfo.tier)}
              <div>
                <CardTitle className="text-2xl capitalize">{subscriptionInfo.tier} Plan</CardTitle>
                <Badge variant={subscriptionInfo.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                  {subscriptionInfo.status}
                </Badge>
              </div>
            </div>
            {canUpgrade && (
              <Button>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              ${subscriptionInfo.price}
            </span>
            <span className="text-gray-600">/ {subscriptionInfo.billingCycle}</span>
          </div>

          <Separator />

          {subscriptionInfo.tier !== 'free' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">Next billing date</p>
                  <p className="font-medium">{subscriptionInfo.renewalDate.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500">Member since</p>
                  <p className="font-medium">{subscriptionInfo.startDate.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {subscriptionInfo.tier !== 'free' && <Separator />}

          <div>
            <h4 className="font-semibold mb-3">Your plan includes:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tierBenefits[subscriptionInfo.tier as keyof typeof tierBenefits].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {subscriptionInfo.tier !== 'free' && (
            <div className="flex gap-2 pt-4">
              {canUpgrade && (
                <Button variant="outline">
                  Upgrade to Premium
                </Button>
              )}
              <Button variant="outline">
                Update Payment Method
              </Button>
              {canDowngrade && (
                <Button variant="ghost" className="text-gray-600">
                  Cancel Subscription
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans Comparison */}
      {canUpgrade && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={validTier === 'free' ? 'border-2 border-indigo-600' : ''}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getTierIcon('free')}
                  <CardTitle>Free</CardTitle>
                </div>
                <div className="text-3xl font-bold">$0</div>
                <p className="text-sm text-gray-600">Forever</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {tierBenefits.free.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {validTier === 'free' && (
                  <Badge className="mt-4 w-full justify-center">Current Plan</Badge>
                )}
              </CardContent>
            </Card>

            <Card className={validTier === 'member' ? 'border-2 border-indigo-600' : ''}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getTierIcon('member')}
                  <CardTitle>Member</CardTitle>
                </div>
                <div className="text-3xl font-bold">$9.99</div>
                <p className="text-sm text-gray-600">per month</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {tierBenefits.member.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {validTier === 'member' ? (
                  <Badge className="mt-4 w-full justify-center">Current Plan</Badge>
                ) : (
                  <Button className="mt-4 w-full">
                    {validTier === 'free' ? 'Upgrade' : 'Downgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className={validTier === 'premium' ? 'border-2 border-yellow-600' : 'border-2 border-yellow-200'}>
              <CardHeader className="relative">
                <Badge className="absolute top-4 right-4 bg-yellow-600">Popular</Badge>
                <div className="flex items-center gap-2 mb-2">
                  {getTierIcon('premium')}
                  <CardTitle>Premium</CardTitle>
                </div>
                <div className="text-3xl font-bold">$29.99</div>
                <p className="text-sm text-gray-600">per month</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {tierBenefits.premium.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-600" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                {validTier === 'premium' ? (
                  <Badge className="mt-4 w-full justify-center bg-yellow-600">Current Plan</Badge>
                ) : (
                  <Button className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700">
                    Upgrade to Premium
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Payment Method */}
      {subscriptionInfo.tier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded flex items-center justify-center text-white font-bold text-xs">
                  {subscriptionInfo.paymentMethod.brand}
                </div>
                <div>
                  <p className="font-medium">
                    &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {subscriptionInfo.paymentMethod.last4}
                  </p>
                  <p className="text-sm text-gray-500">
                    Expires {subscriptionInfo.paymentMethod.expiryDate}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {subscriptionInfo.tier !== 'free' && paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${payment.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium">${payment.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {payment.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                      {payment.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free Plan CTA */}
      {subscriptionInfo.tier === 'free' && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Unlock Premium Features</h3>
                <p className="text-indigo-100 mb-4">
                  Upgrade to access exclusive circles, premium content, and more
                </p>
                <Button className="bg-white text-indigo-600 hover:bg-indigo-50">
                  View Plans
                </Button>
              </div>
              <Crown className="w-24 h-24 text-white/20" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
