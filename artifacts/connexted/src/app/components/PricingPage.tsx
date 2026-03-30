import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Check, Star, ArrowRight, Zap, X, Eye, Users, MessageSquare, CircleDot, Grid, Sparkles, Crown } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface MembershipTier {
  id: string;
  tier_number: number;
  tier_name: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  description: string;
  features_list: string[];
  highlight_features: string[];
  is_popular: boolean;
  max_circles: number;
  max_containers: number;
  can_purchase_programs: boolean;
  can_host_containers: boolean;
  can_create_circles: boolean;
}

// User access capabilities by class
const USER_ACCESS_CAPABILITIES = {
  // Visitor (Class 1) - No account required
  1: {
    displayName: 'Visitor',
    icon: Eye,
    accountRequired: false,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: false,
    viewCircles: false,
    readPosts: false,
    postComment: false,
    participateMeetings: false,
    joinPrograms: false,
    joinCircles: false,
    createLightweight: false,
    createSubstantial: false,
    createAdvanced: false,
    createCircles: false,
    createPrograms: false,
  },
  // Guest (Class 2) - No account required
  2: {
    displayName: 'Guest',
    icon: Eye,
    accountRequired: false,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: false,
    participateMeetings: false,
    joinPrograms: false,
    joinCircles: false,
    createLightweight: false,
    createSubstantial: false,
    createAdvanced: false,
    createCircles: false,
    createPrograms: false,
  },
  // Basic User (Class 3) - Account required, PAID
  3: {
    displayName: 'Basic User',
    icon: MessageSquare,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: false,
    joinCircles: false,
    createLightweight: false,
    createSubstantial: false,
    createAdvanced: false,
    createCircles: false,
    createPrograms: false,
  },
  // Attender (Class 4) - Account required, PAID
  4: {
    displayName: 'Attender',
    icon: Users,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: true,
    joinCircles: true,
    createLightweight: false,
    createSubstantial: false,
    createAdvanced: false,
    createCircles: false,
    createPrograms: false,
  },
  // Regular User (Class 5) - Account required, PAID
  5: {
    displayName: 'Regular User',
    icon: Grid,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: true,
    joinCircles: true,
    createLightweight: true, // tables, elevators, pitches, builds, events
    createSubstantial: false,
    createAdvanced: false,
    createCircles: false,
    createPrograms: false,
  },
  // Power User (Class 6) - Account required, PAID
  6: {
    displayName: 'Power User',
    icon: Sparkles,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: true,
    joinCircles: true,
    createLightweight: true,
    createSubstantial: true, // meetings, meetups
    createAdvanced: true, // standups, sprints
    createCircles: false,
    createPrograms: false,
  },
  // Circle Leader (Class 7) - Account required, PAID
  7: {
    displayName: 'Circle Leader',
    icon: CircleDot,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: true,
    joinCircles: true,
    createLightweight: true,
    createSubstantial: true,
    createAdvanced: true,
    createCircles: true,
    createPrograms: false,
  },
  // Program Leader (Class 8) - Account required, PAID
  8: {
    displayName: 'Program Leader',
    icon: Crown,
    accountRequired: true,
    viewMarkets: true,
    viewMarketplace: true,
    viewPrograms: true,
    viewCircles: true,
    readPosts: true,
    postComment: true,
    participateMeetings: true,
    joinPrograms: true,
    joinCircles: true,
    createLightweight: true,
    createSubstantial: true,
    createAdvanced: true,
    createCircles: true,
    createPrograms: true,
  },
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentTier, setCurrentTier] = useState<MembershipTier | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);

      // Fetch all active tiers (user classes)
      const { data: tiersData, error: tiersError } = await supabase
        .from('user_classes')
        .select('*')
        .order('class_number');

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // Fetch user's current tier
      if (profile?.id) {
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select(`
            tier_id,
            user_classes (*)
          `)
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single();

        if (subData) {
          setCurrentTier(subData.user_classes as any);
        }
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast.error('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const getYearlySavings = (monthly: number, yearly: number) => {
    const monthlyCost = monthly * 12;
    const savings = monthlyCost - yearly;
    if (savings > 0) {
      return `Save $${(savings / 100).toFixed(0)}/year`;
    }
    return null;
  };

  const handleSelectTier = (tier: MembershipTier) => {
    if (!profile) {
      toast.error('Please log in to upgrade your subscription');
      navigate('/login');
      return;
    }

    // Navigate to subscription upgrade page (we'll create this next)
    navigate('/my-account', { state: { selectedTier: tier } });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading pricing...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Pricing' },
          ]}
        />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Membership Tier</h1>
          <p className="text-xl text-gray-600 mb-8">
            Select the plan that fits your needs. Upgrade or downgrade anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              className={`px-6 py-2 rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-md transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <Badge variant="secondary" className="ml-2">Save up to 17%</Badge>
            </button>
          </div>
        </div>

        {/* Current Tier Badge */}
        {currentTier && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-900">
              You're currently on the <strong>{currentTier.tier_name}</strong> plan
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {tiers.map((tier) => {
            const price = billingCycle === 'monthly' ? tier.monthly_price_cents : tier.yearly_price_cents;
            const displayPrice = formatPrice(price);
            const pricePerMonth = billingCycle === 'yearly' && price > 0 
              ? formatPrice(Math.round(price / 12))
              : displayPrice;
            const savings = billingCycle === 'yearly' 
              ? getYearlySavings(tier.monthly_price_cents, tier.yearly_price_cents)
              : null;
            const isCurrentTier = currentTier?.id === tier.id;
            const isFreeTier = tier.monthly_price_cents === 0;

            return (
              <Card
                key={tier.id}
                className={`relative ${
                  tier.is_popular
                    ? 'border-2 border-blue-500 shadow-lg'
                    : isCurrentTier
                    ? 'border-2 border-green-500'
                    : ''
                }`}
              >
                {tier.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentTier && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500">
                      <Check className="w-3 h-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{tier.tier_name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {billingCycle === 'yearly' && price > 0 ? pricePerMonth : displayPrice}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-600">
                          /month
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        Billed {displayPrice} annually
                      </div>
                    )}
                    {savings && (
                      <div className="text-sm text-green-600 font-semibold mt-1">
                        {savings}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {(tier.highlight_features.length > 0 ? tier.highlight_features : tier.features_list.slice(0, 5)).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits Summary */}
                  <div className="pt-4 border-t space-y-1 text-sm text-gray-600">
                    <div>• {formatLimit(tier.max_circles)} {tier.max_circles === 1 ? 'circle' : 'circles'}</div>
                    <div>• {formatLimit(tier.max_containers)} {tier.max_containers === 1 ? 'container' : 'containers'}</div>
                    {tier.can_purchase_programs && <div>• Purchase programs</div>}
                    {tier.can_host_containers && <div>• Host containers</div>}
                    {tier.can_create_circles && <div>• Create circles</div>}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full"
                    variant={tier.is_popular ? 'default' : 'outline'}
                    onClick={() => handleSelectTier(tier)}
                    disabled={isCurrentTier}
                  >
                    {isCurrentTier ? (
                      'Current Plan'
                    ) : isFreeTier ? (
                      'Get Started Free'
                    ) : currentTier && tier.tier_number > currentTier.tier_number ? (
                      <>
                        Upgrade
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : currentTier && tier.tier_number < currentTier.tier_number ? (
                      'Downgrade'
                    ) : (
                      'Select Plan'
                    )}
                  </Button>

                  {/* View all features */}
                  {tier.features_list.length > 5 && (
                    <button className="text-sm text-blue-600 hover:underline w-full text-center">
                      View all {tier.features_list.length} features
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="max-w-3xl mx-auto mt-16 space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do I upgrade my subscription?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Click "Upgrade" on any tier above. An admin will contact you to process your payment 
                and activate your new subscription. Your upgrade will be effective immediately after payment confirmation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We accept wire transfers, checks, invoicing, and other payment methods. 
                Our admin team will work with you to find the most convenient payment option.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change my plan later?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Contact our admin team 
                to make changes to your subscription.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens to my content if I downgrade?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your existing content is preserved, but you'll need to leave circles/containers 
                to match your new tier's limits before you can join new ones.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
          <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-2xl font-bold mb-2">Need a custom plan?</h3>
          <p className="text-gray-600 mb-6">
            Contact us for enterprise pricing and custom solutions tailored to your organization
          </p>
          <Button size="lg" asChild>
            <Link to="/contact">
              Contact Sales
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}