/**
 * My Learning - Unified Dashboard
 * 
 * ONE DASHBOARD FOR EVERYTHING!
 * 
 * This is the power of the unified access ticket system.
 * Instead of separate pages for courses, programs, circles, etc.,
 * we have ONE dashboard that shows ALL of a user's active content.
 * 
 * Platform Advantage:
 * ✅ Single source of truth
 * ✅ Consistent UX across all offerings
 * ✅ Easy to add new types
 * ✅ Unified progress tracking
 * ✅ Analytics across everything
 */

import { useUserActiveTickets, useUserReferralEarnings } from '@/hooks/useAccessTicket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  BookOpen, 
  Users, 
  Circle, 
  Package, 
  Calendar,
  TrendingUp,
  Award,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router';
import type { AccessTicket, ContainerType } from '@/services/accessTicketService';

export function MyLearningUnified() {
  const { tickets, isLoading } = useUserActiveTickets();
  const { totalEarnings, totalConversions, byType } = useUserReferralEarnings();

  if (isLoading) {
    return <div>Loading your learning...</div>;
  }

  // Group tickets by type
  const courses = tickets.filter(t => t.container_type === 'course');
  const programs = tickets.filter(t => t.container_type === 'program');
  const circles = tickets.filter(t => t.container_type === 'circle');
  const bundles = tickets.filter(t => t.container_type === 'bundle');
  const events = tickets.filter(t => t.container_type === 'event');

  const totalRevenue = tickets.reduce((sum, t) => sum + (t.price_paid_cents || 0), 0);
  const avgProgress = tickets.length > 0
    ? Math.round(tickets.reduce((sum, t) => sum + t.progress_percentage, 0) / tickets.length)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Learning</h1>
          <p className="text-gray-600">
            All your courses, programs, circles, and more in one place
          </p>
        </div>
        <Link to="/my-tickets">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-medium">
            <span>🎟️</span>
            My Tickets &amp; Waitlists
          </button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          title="Total Items"
          value={tickets.length}
          description="Active enrollments"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Avg Progress"
          value={`${avgProgress}%`}
          description="Across all items"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Investment"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          description="Total spent"
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          title="Referral Earnings"
          value={`$${((totalEarnings || 0) / 100).toFixed(2)}`}
          description={`${totalConversions || 0} conversions`}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
          <TabsTrigger value="programs">Programs ({programs.length})</TabsTrigger>
          <TabsTrigger value="circles">Circles ({circles.length})</TabsTrigger>
          <TabsTrigger value="bundles">Bundles ({bundles.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {tickets.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          {courses.length === 0 ? (
            <EmptyState type="course" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          {programs.length === 0 ? (
            <EmptyState type="program" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="circles" className="space-y-4">
          {circles.length === 0 ? (
            <EmptyState type="circle" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {circles.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4">
          {bundles.length === 0 ? (
            <EmptyState type="bundle" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map((ticket) => (
                <BundleTicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {events.length === 0 ? (
            <EmptyState type="event" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <ReferralDashboard
            totalEarnings={totalEarnings || 0}
            totalConversions={totalConversions || 0}
            byType={byType || {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({ icon, title, value, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function TicketCard({ ticket }: { ticket: AccessTicket }) {
  const icon = getContainerIcon(ticket.container_type);
  const basePath = getBasePath(ticket.container_type);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <Badge variant="outline">{ticket.container_type}</Badge>
          </div>
          {ticket.status === 'completed' && (
            <Badge variant="default">✓ Completed</Badge>
          )}
        </div>
        <CardTitle className="text-lg">{ticket.container_id}</CardTitle>
        <CardDescription>
          {getAcquisitionLabel(ticket.acquisition_source)}
          {ticket.referral_code && (
            <span className="ml-2 text-green-600">• Has referral code</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{ticket.progress_percentage}%</span>
          </div>
          <Progress value={ticket.progress_percentage} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Started</p>
            <p className="font-medium">
              {new Date(ticket.granted_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Last Active</p>
            <p className="font-medium">
              {ticket.last_accessed_at 
                ? new Date(ticket.last_accessed_at).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>

        {/* Referral Stats */}
        {ticket.referral_conversions > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
            <p className="text-green-700 dark:text-green-400 font-medium">
              🎉 {ticket.referral_conversions} referrals • ${(ticket.referral_earnings_cents / 100).toFixed(2)} earned
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button asChild className="w-full">
          <Link to={`${basePath}/${ticket.container_id}`}>
            {ticket.status === 'completed' ? 'Review' : 'Continue'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function BundleTicketCard({ ticket }: { ticket: AccessTicket }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <Badge variant="default">Bundle</Badge>
        </div>
        <CardTitle className="text-lg">Bundle Purchase</CardTitle>
        <CardDescription>
          {ticket.bundle_items?.length || 0} items included
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bundle Items */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Includes:</p>
          {ticket.bundle_items?.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {getContainerIcon(item.type)}
              <span className="capitalize">{item.type}</span>
            </div>
          ))}
        </div>

        {/* Value */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Bundle Value: ${(ticket.price_paid_cents / 100).toFixed(2)}
          </p>
        </div>

        <Button asChild className="w-full" variant="outline">
          <Link to="/my-learning">View All Items</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type?: string }) {
  const message = type 
    ? `You don't have any ${type}s yet.`
    : "You haven't enrolled in anything yet.";
  
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-gray-600 mb-4">{message}</p>
        <Button asChild>
          <Link to="/explore">Explore Content</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReferralDashboard({ totalEarnings, totalConversions, byType }: any) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${(totalEarnings / 100).toFixed(2)}</p>
            <p className="text-sm text-gray-600">Across all referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalConversions}</p>
            <p className="text-sm text-gray-600">Successful referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Per Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${totalConversions > 0 ? ((totalEarnings / totalConversions) / 100).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-gray-600">Per conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Type</CardTitle>
          <CardDescription>See which offerings earn you the most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(byType).map(([type, stats]: [string, any]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getContainerIcon(type as ContainerType)}
                  <span className="capitalize font-medium">{type}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">${(stats.earnings / 100).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{stats.conversions} sales</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getContainerIcon(type: ContainerType) {
  switch (type) {
    case 'course':
      return <BookOpen className="h-4 w-4" />;
    case 'program':
      return <Users className="h-4 w-4" />;
    case 'circle':
      return <Circle className="h-4 w-4" />;
    case 'bundle':
      return <Package className="h-4 w-4" />;
    case 'event':
      return <Calendar className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
}

function getBasePath(type: ContainerType): string {
  switch (type) {
    case 'course': return '/courses';
    case 'program': return '/programs';
    case 'circle': return '/circles';
    case 'event': return '/events';
    default: return '/';
  }
}

function getAcquisitionLabel(source: string): string {
  switch (source) {
    case 'marketplace_purchase': return 'Purchased via Marketplace';
    case 'direct_enrollment': return 'Direct Enrollment';
    case 'referral': return 'Via Referral';
    case 'invitation': return 'Invited';
    case 'scholarship': return 'Scholarship';
    case 'admin_grant': return 'Admin Granted';
    default: return source;
  }
}