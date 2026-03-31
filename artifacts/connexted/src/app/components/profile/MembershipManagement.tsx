import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { accessTicketService } from '@/services/accessTicketService';
import { templateApi } from '@/services/ticketSystemService';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { ProgressBar } from '@/app/components/profile/ProgressBar';
import { 
  Crown, 
  Activity, 
  TrendingUp, 
  Users,
  Shield,
  UserCheck,
  Info,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Tag,
  ExternalLink,
  Ticket,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { toast } from 'sonner';

interface MarketOffering {
  id: string;
  name: string;
  slug: string;
  description: string;
  purchase_type: string;
  external_url?: string;
}

interface RedeemableTicket {
  offeringId: string;
  offeringName: string;
  targetClass: number;
  targetClassName: string;
  alreadyActive: boolean;
}

interface MembershipManagementProps {
  userId: string;
}

interface UsageData {
  adminCircles: number;
  memberCircles: number;
  adminContainers: number;
  memberContainers: number;
}

const CLASS_NAMES: Record<number, string> = {
  1: 'Visitor', 2: 'Guest', 3: 'Basic User', 4: 'Attender',
  5: 'Regular User', 6: 'Regular User Plus', 7: 'Power User',
  8: 'Circle Leader', 9: 'Circle Leader Plus', 10: 'Platform Admin',
};

export function MembershipManagement({ userId }: MembershipManagementProps) {
  const { profile, refreshProfile } = useAuth();
  const [userClassInfo, setUserClassInfo] = useState<any>(null);
  const [usage, setUsage] = useState<UsageData>({
    adminCircles: 0,
    memberCircles: 0,
    adminContainers: 0,
    memberContainers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upgradeOfferings, setUpgradeOfferings] = useState<MarketOffering[]>([]);
  const [redeemableTickets, setRedeemableTickets] = useState<RedeemableTicket[]>([]);
  const [applyingUpgrade, setApplyingUpgrade] = useState<string | null>(null);

  useEffect(() => {
    fetchUserClassInfo();
    fetchUsage();
    fetchUpgradeOfferings();
    fetchRedeemableTickets();
  }, [userId]);

  const fetchUserClassInfo = async () => {
    try {
      const userClass = (profile as any).user_class || 1;
      const { data } = await supabase
        .from('user_classes')
        .select('*')
        .eq('class_number', userClass)
        .single();
      
      if (data) {
        setUserClassInfo(data);
      } else {
        // Set default if not found
        setUserClassInfo({
          class_number: userClass,
          display_name: `Class ${userClass}`,
          max_admin_circles: userClass === 10 ? -1 : Math.max(0, userClass - 2),
          max_admin_containers: userClass === 10 ? -1 : userClass * 5,
          max_member_containers: userClass === 10 ? -1 : userClass * 10,
        });
      }
    } catch (error) {
      console.error('Error fetching user class info:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      // Fetch circles
      const { data: hostedCircles } = await supabase
        .from('circles')
        .select('id')
        .eq('host_id', userId);
      
      const { data: moderatedCircles } = await supabase
        .from('circles')
        .select('id')
        .contains('moderators', [userId]);
      
      const { data: memberCircles } = await supabase
        .from('circles')
        .select('id')
        .contains('member_ids', [userId]);

      // Fetch containers
      const containerTypes = ['tables', 'elevators', 'meetings', 'pitches', 'builds', 'standups', 'meetups'];
      let adminContainersTotal = 0;
      let memberContainersTotal = 0;

      for (const containerType of containerTypes) {
        const { data: adminData } = await supabase
          .from(containerType)
          .select('id')
          .contains('admin_ids', [userId]);
        
        const { data: memberData } = await supabase
          .from(containerType)
          .select('id')
          .contains('member_ids', [userId]);

        adminContainersTotal += adminData?.length || 0;
        memberContainersTotal += memberData?.length || 0;
      }

      setUsage({
        adminCircles: (hostedCircles?.length || 0) + (moderatedCircles?.length || 0),
        memberCircles: memberCircles?.length || 0,
        adminContainers: adminContainersTotal,
        memberContainers: memberContainersTotal,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpgradeOfferings = async () => {
    try {
      // Fetch user's existing access tickets for marketplace offerings
      const tickets = await accessTicketService.getUserActiveTickets(userId);
      const claimedOfferingIds = new Set(
        tickets
          .filter(t => t.container_type === 'marketplace_offering' && t.container_id)
          .map(t => t.container_id as string)
      );

      // Fetch all active marketplace offerings
      const { data: offerings, error } = await supabase
        .from('market_offerings')
        .select('id, name, slug, description, purchase_type, external_url')
        .order('name');

      if (error) return;

      // Only show offerings the user doesn't already have
      const available = (offerings || []).filter(o => !claimedOfferingIds.has(o.id));
      setUpgradeOfferings(available);
    } catch (err) {
      // Non-blocking — upgrade suggestions are best-effort
    }
  };

  const fetchRedeemableTickets = async () => {
    try {
      const currentClass = (profile as any)?.user_class || 1;

      // Get all the user's active offering-level access tickets
      const tickets = await accessTicketService.getUserActiveTickets(userId);
      const offeringTickets = tickets.filter(
        t => t.container_type === 'marketplace_offering' && t.container_id
      );

      if (offeringTickets.length === 0) return;

      // For each offering ticket, look up what template unlocks it (via the edge function)
      // and check if that template grants a user_class upgrade.
      const results: RedeemableTicket[] = [];

      // Fetch offering names in one query
      const offeringIds = offeringTickets.map(t => t.container_id as string);
      const { data: offerings } = await supabase
        .from('market_offerings')
        .select('id, name')
        .in('id', offeringIds);

      const offeringNameMap: Record<string, string> = {};
      (offerings || []).forEach(o => { offeringNameMap[o.id] = o.name; });

      // Look up templates for each offering
      await Promise.all(
        offeringTickets.map(async (ticket) => {
          try {
            const { templates } = await templateApi.forOffering(ticket.container_id as string);
            const classTemplate = templates.find(
              t => t.unlocks?.type === 'user_class' && t.unlocks?.userClass
            );
            if (!classTemplate) return;

            const targetClass = classTemplate.unlocks.userClass!;
            results.push({
              offeringId: ticket.container_id as string,
              offeringName: offeringNameMap[ticket.container_id as string] || 'Membership Ticket',
              targetClass,
              targetClassName: CLASS_NAMES[targetClass] || `Class ${targetClass}`,
              alreadyActive: currentClass >= targetClass,
            });
          } catch (_) { /* skip this offering if template lookup fails */ }
        })
      );

      // Sort: actionable (not yet applied) first, then by class number desc
      results.sort((a, b) => {
        if (a.alreadyActive !== b.alreadyActive) return a.alreadyActive ? 1 : -1;
        return b.targetClass - a.targetClass;
      });

      setRedeemableTickets(results);
    } catch (err) {
      // Non-blocking
    }
  };

  const handleApplyUpgrade = async (ticket: RedeemableTicket) => {
    if (ticket.alreadyActive) return;
    setApplyingUpgrade(ticket.offeringId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_class: ticket.targetClass })
        .eq('id', userId);

      if (error) throw new Error(error.message);

      await refreshProfile();

      // Mark as applied locally
      setRedeemableTickets(prev =>
        prev.map(t =>
          t.offeringId === ticket.offeringId ? { ...t, alreadyActive: true } : t
        )
      );

      // Refresh class info panel
      fetchUserClassInfo();

      toast.success(`Upgraded to ${ticket.targetClassName} (Class ${ticket.targetClass})!`);
    } catch (err: any) {
      toast.error(`Failed to apply upgrade: ${err.message}`);
    } finally {
      setApplyingUpgrade(null);
    }
  };

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading membership information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Tier Overview */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-600" />
                Your Current Membership
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                You're on the <strong className="capitalize">{profile.membership_tier}</strong> plan (Class {(profile as any).user_class || 1})
              </p>
            </div>
            <Badge className="text-base px-4 py-2 bg-indigo-600 capitalize">
              {profile.membership_tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CurrentTierLimits userClassInfo={userClassInfo} />
        </CardContent>
      </Card>

      {/* Redeemable Upgrade Tickets */}
      {redeemableTickets.length > 0 && (
        <Card className="border-2 border-violet-200 bg-violet-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-violet-600" />
              Your Upgrade Tickets
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              You have tickets that can change your user class. Apply one below.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redeemableTickets.map((ticket) => {
                const isApplying = applyingUpgrade === ticket.offeringId;
                const currentClass = (profile as any).user_class || 1;

                return (
                  <div
                    key={ticket.offeringId}
                    className={cn(
                      'flex items-center justify-between gap-4 p-4 rounded-lg border',
                      ticket.alreadyActive
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-violet-200'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {ticket.offeringName}
                        </span>
                        {ticket.alreadyActive && (
                          <Badge variant="outline" className="text-xs border-green-300 text-green-700 shrink-0">
                            Applied
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Unlocks: <strong>{ticket.targetClassName}</strong> (Class {ticket.targetClass})
                        {!ticket.alreadyActive && currentClass < ticket.targetClass && (
                          <span className="text-violet-600 ml-1">
                            — upgrade from Class {currentClass}
                          </span>
                        )}
                      </p>
                    </div>

                    {ticket.alreadyActive ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApplyUpgrade(ticket)}
                        disabled={isApplying}
                        className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                      >
                        {isApplying ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Applying…</>
                        ) : (
                          'Apply Ticket'
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Your Current Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageBreakdown usage={usage} limits={userClassInfo} />
        </CardContent>
      </Card>

      {/* Upgrade Opportunities */}
      {upgradeOfferings.length > 0 && (
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Available for You
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Offerings you can access — you don't have any of these yet.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upgradeOfferings.map((offering) => (
                <OfferingUpgradeCard key={offering.id} offering={offering} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Compare Membership Tiers
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Choose the tier that best fits your needs
          </p>
        </CardHeader>
        <CardContent>
          <TierComparisonGrid 
            currentClass={(profile as any).user_class || 1}
          />
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Note:</strong> Membership tier changes are processed manually. Contact support to upgrade or downgrade your membership.
          The tier comparison shows what's available at each level.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function CurrentTierLimits({ userClassInfo }: { userClassInfo: any }) {
  if (!userClassInfo) return null;

  const limits = [
    {
      icon: Users,
      label: 'Admin Circles',
      current: userClassInfo.max_admin_circles,
      color: 'text-amber-600'
    },
    {
      icon: Shield,
      label: 'Admin Containers',
      current: userClassInfo.max_admin_containers,
      color: 'text-purple-600'
    },
    {
      icon: UserCheck,
      label: 'Member Containers',
      current: userClassInfo.max_member_containers,
      color: 'text-green-600'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {limits.map((limit) => (
        <div key={limit.label} className="flex items-center gap-3 p-4 bg-white rounded-lg border">
          <limit.icon className={cn('w-8 h-8', limit.color)} />
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {limit.current === -1 ? '∞' : limit.current}
            </div>
            <div className="text-sm text-gray-600">{limit.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageBreakdown({ usage, limits }: { usage: UsageData; limits: any }) {
  if (!limits) return null;

  const usageItems = [
    {
      label: 'Admin Circles',
      current: usage.adminCircles,
      max: limits.max_admin_circles,
      icon: Users,
      color: 'amber'
    },
    {
      label: 'Admin Containers',
      current: usage.adminContainers,
      max: limits.max_admin_containers,
      icon: Shield,
      color: 'purple'
    },
    {
      label: 'Member Containers',
      current: usage.memberContainers,
      max: limits.max_member_containers,
      icon: UserCheck,
      color: 'green'
    },
  ];

  return (
    <div className="space-y-4">
      {usageItems.map((item) => {
        const percentage = item.max === -1 ? 0 : (item.current / item.max) * 100;
        const isNearLimit = percentage >= 80;
        const isAtLimit = item.current >= item.max && item.max !== -1;

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className={cn('w-4 h-4', `text-${item.color}-600`)} />
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {item.current} / {item.max === -1 ? '∞' : item.max}
                </span>
                {isAtLimit && (
                  <Badge variant="destructive" className="text-xs">
                    At Limit
                  </Badge>
                )}
                {isNearLimit && !isAtLimit && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    Near Limit
                  </Badge>
                )}
              </div>
            </div>

            {item.max !== -1 && (
              <ProgressBar
                current={item.current}
                max={item.max}
                warningThreshold={0.8}
              />
            )}
          </div>
        );
      })}

      {/* Member circles (no limit) */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">Member Circles</span>
          </div>
          <span className="text-sm font-semibold">
            {usage.memberCircles} <span className="text-gray-500">(unlimited)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function TierComparisonGrid({ currentClass }: { currentClass: number }) {
  // Only show advertised tiers (classes 3, 4, 5, 7, 8)
  // Class 1: Visitor, Class 2: Guest (no profiles, not advertised)
  // Class 6: Regular User Plus (not advertised)
  // Class 9: Circle Leader Plus (not advertised)
  // Class 10: Platform Admin (not advertised)
  const tiers = [
    {
      name: 'Basic User',
      class: 3,
      features: {
        adminCircles: 0,
        adminContainers: 5,
        memberContainers: 15,
      },
      description: 'Essential membership',
      highlighted: currentClass === 3,
    },
    {
      name: 'Attender',
      class: 4,
      features: {
        adminCircles: 1,
        adminContainers: 10,
        memberContainers: 25,
      },
      description: 'Active participation',
      highlighted: currentClass === 4,
    },
    {
      name: 'Regular User',
      class: 5,
      features: {
        adminCircles: 2,
        adminContainers: 15,
        memberContainers: 40,
      },
      description: 'Full community member',
      highlighted: currentClass === 5,
      popular: true,
    },
    {
      name: 'Power User',
      class: 7,
      features: {
        adminCircles: 3,
        adminContainers: 25,
        memberContainers: 60,
      },
      description: 'Advanced capabilities',
      highlighted: currentClass === 7,
    },
    {
      name: 'Circle Leader',
      class: 8,
      features: {
        adminCircles: 5,
        adminContainers: 40,
        memberContainers: 80,
      },
      description: 'Lead your own circles',
      highlighted: currentClass === 8,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {tiers.map((tier) => (
        <Card
          key={tier.class}
          className={cn(
            'relative',
            tier.highlighted && 'border-2 border-indigo-500 shadow-lg',
            tier.popular && 'border-2 border-purple-500'
          )}
        >
          {tier.popular && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
              Most Popular
            </Badge>
          )}
          {tier.highlighted && (
            <Badge className="absolute -top-3 right-4 bg-indigo-600">
              Current
            </Badge>
          )}

          <CardHeader>
            <CardTitle className="text-xl">{tier.name}</CardTitle>
            <div className="text-sm text-gray-600 mt-1">Class {tier.class}</div>
            <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
          </CardHeader>

          <CardContent>
            <div className="space-y-3 mb-4">
              <FeatureItem
                icon={Users}
                label="Admin Circles"
                value={tier.features.adminCircles}
              />
              <FeatureItem
                icon={Shield}
                label="Admin Containers"
                value={tier.features.adminContainers}
              />
              <FeatureItem
                icon={UserCheck}
                label="Member Containers"
                value={tier.features.memberContainers}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OfferingUpgradeCard({ offering }: { offering: MarketOffering }) {
  const purchaseLabels: Record<string, { label: string; color: string }> = {
    free_claim:    { label: 'Free',          color: 'bg-green-100 text-green-700 border-green-200' },
    kit_commerce:  { label: 'Purchase',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
    external_link: { label: 'External',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
    contact_only:  { label: 'Contact Us',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  };
  const badge = purchaseLabels[offering.purchase_type] ?? { label: offering.purchase_type, color: 'bg-gray-100 text-gray-700 border-gray-200' };

  const isExternal = offering.purchase_type === 'external_link' && offering.external_url;

  const cardContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-gray-900 leading-tight">{offering.name}</span>
        <span className={cn('text-xs border rounded-full px-2 py-0.5 whitespace-nowrap shrink-0', badge.color)}>
          {badge.label}
        </span>
      </div>
      {offering.description && (
        <p className="text-sm text-gray-600 flex-1 line-clamp-2 mb-3">{offering.description}</p>
      )}
      <div className="flex items-center gap-1 text-sm font-medium text-emerald-700 mt-auto">
        {isExternal ? (
          <>View offering <ExternalLink className="w-3.5 h-3.5" /></>
        ) : (
          <>View offering <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </div>
    </div>
  );

  const cardClass = 'block p-4 rounded-lg border border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer h-full';

  if (isExternal) {
    return (
      <a href={offering.external_url} target="_blank" rel="noopener noreferrer" className={cardClass}>
        {cardContent}
      </a>
    );
  }

  return (
    <Link to={`/markets/offerings/${offering.slug}`} className={cardClass}>
      {cardContent}
    </Link>
  );
}

function FeatureItem({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-gray-900">
        {value === -1 ? '∞' : value}
      </span>
    </div>
  );
}