import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { accessTicketService } from '@/services/accessTicketService';
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

interface MembershipManagementProps {
  userId: string;
}

interface UsageData {
  adminCircles: number;
  memberCircles: number;
  adminContainers: number;
  memberContainers: number;
}

export function MembershipManagement({ userId }: MembershipManagementProps) {
  const { profile } = useAuth();
  const [userClassInfo, setUserClassInfo] = useState<any>(null);
  const [usage, setUsage] = useState<UsageData>({
    adminCircles: 0,
    memberCircles: 0,
    adminContainers: 0,
    memberContainers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upgradeOfferings, setUpgradeOfferings] = useState<MarketOffering[]>([]);

  useEffect(() => {
    fetchUserClassInfo();
    fetchUsage();
    fetchUpgradeOfferings();
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


  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading membership information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Class Overview */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-600" />
                Your Access Level
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                You are <strong>{userClassInfo?.display_name ?? `Class ${profile.user_class || 1}`}</strong> — this controls how many circles and containers you can create and join.
              </p>
            </div>
            <Badge className="text-base px-4 py-2 bg-indigo-600">
              Class {profile.user_class || 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CurrentTierLimits userClassInfo={userClassInfo} />
        </CardContent>
      </Card>

      {/* My Tickets link */}
      <Card className="border-2 border-violet-200 bg-violet-50/30">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Have upgrade tickets?</p>
              <p className="text-sm text-gray-500">Go to My Tickets to redeem them and apply your user class upgrade.</p>
            </div>
          </div>
          <Link to="/my-tickets">
            <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-100 shrink-0">
              My Tickets
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

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

      {/* Class Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Compare User Classes
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            See what each user class unlocks in terms of circles and containers
          </p>
        </CardHeader>
        <CardContent>
          <TierComparisonGrid
            currentClass={profile.user_class || 1}
          />
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Note:</strong> User class upgrades are applied via tickets. Use a ticket from My Tickets to move to a higher class, or contact support for assistance.
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
  const [allClasses, setAllClasses] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('user_classes')
      .select('class_number, display_name, description, max_admin_circles, max_admin_containers, max_member_containers')
      .order('class_number', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Show classes 3–9 as the advertised range; skip 1–2 (Visitor/Guest) and 10 (Platform Admin)
          setAllClasses(data.filter((c: any) => c.class_number >= 3 && c.class_number <= 9));
        }
      });
  }, []);

  if (allClasses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {allClasses.map((uc: any) => {
        const isCurrentClass = uc.class_number === currentClass;
        return (
          <Card
            key={uc.class_number}
            className={cn(
              'relative',
              isCurrentClass && 'border-2 border-indigo-500 shadow-lg',
            )}
          >
            {isCurrentClass && (
              <Badge className="absolute -top-3 right-4 bg-indigo-600">
                Current
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-lg">{uc.display_name}</CardTitle>
              <div className="text-xs text-gray-500 mt-0.5">Class {uc.class_number}</div>
              {uc.description && (
                <p className="text-sm text-gray-600 mt-1">{uc.description}</p>
              )}
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <FeatureItem
                  icon={Users}
                  label="Admin Circles"
                  value={uc.max_admin_circles}
                />
                <FeatureItem
                  icon={Shield}
                  label="Admin Containers"
                  value={uc.max_admin_containers}
                />
                <FeatureItem
                  icon={UserCheck}
                  label="Member Containers"
                  value={uc.max_member_containers}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
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