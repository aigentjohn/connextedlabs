/**
 * Sidebar Component
 *
 * Main navigation sidebar. Composes purpose-built section components.
 * Owns expand/collapse state and accordion coordination.
 *
 * Decomposed from ~1,974 lines to ~210 lines (89% reduction).
 * Sections extracted to /sidebar/ directory.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Separator } from '@/app/components/ui/separator';
import { Menu, X } from 'lucide-react';
import { hasRoleLevel } from '@/lib/constants/roles';
import type { Role } from '@/lib/constants/roles';
import { useSidebarData } from '@/app/hooks/useSidebarData';
import { accessTicketService } from '@/services/accessTicketService';

// Section components
import { UserSection } from './sidebar/UserSection';
import { MyContentSection } from './sidebar/MyContentSection';
import { MyGrowthSection } from './sidebar/MyGrowthSection';
import { MembersSection } from './sidebar/MembersSection';
import { SponsorsSection, CirclesSection, ContentSection } from './sidebar/MinorSections';
import { ActivitiesSection } from './sidebar/ActivitiesSection';
import { SetupSection } from './sidebar/SetupSection';

interface SidebarProps {
  currentUserId: string;
}

export default function Sidebar({ currentUserId }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    user: false,
    myContent: false,
    myGrowth: false,
    members: false,
    sponsors: false,
    activities: false,
    circles: false,
    content: false,
    setup: false,
    myAdmin: false,
    tableAdmin: false,
    elevatorAdmin: false,
    meetingAdmin: false,
    pitchAdmin: false,
    buildAdmin: false,
    standupAdmin: false,
    meetupAdmin: false,
    sprintAdmin: false,
  });

  const {
    circles, tables, elevators, meetings, pitches, builds, prompts,
    standups, meetups, sprints, magazines, playlists, episodes,
    checklists, moments, allUsers, sponsors, community, events,
    programs, loading, documentCounts, eventCounts, reviewCounts,
  } = useSidebarData(currentUserId);

  // Fetch user's active ticket count
  const [ticketCount, setTicketCount] = useState<number>(0);

  useEffect(() => {
    const fetchTicketCount = async () => {
      try {
        const tickets = await accessTicketService.getUserActiveTickets(currentUserId);
        setTicketCount(tickets.length);
      } catch (error) {
        console.error('Error fetching ticket count:', error);
      }
    };
    fetchTicketCount();
  }, [currentUserId]);

  // Early return if profile not loaded yet
  if (!profile) {
    return <div className="h-screen bg-white border-r border-gray-200" />;
  }

  // ─── Computed values ─────────────────────────────────────────────────────────

  const allUserContainers = [
    ...circles, ...tables, ...elevators, ...meetings, ...pitches,
    ...builds, ...standups, ...meetups, ...sprints, ...episodes, ...checklists,
  ];

  // Filter out program-owned circles from the "Common Circles" sidebar section.
  // Programs have a circle_id FK; those circles belong to the program context,
  // not the general community, so we exclude them.
  const programCircleIds = new Set(
    programs.filter((p: any) => p.circle_id).map((p: any) => p.circle_id)
  );
  const commonCircles = circles.filter((c: any) => !programCircleIds.has(c.id));

  const hasRole = (requiredRole: string): boolean =>
    !!profile && hasRoleLevel(profile.role as Role, requiredRole as Role);

  const isAdminOrSuper = profile?.role === 'admin' || profile?.role === 'super';

  const filterAdmin = (items: any[]) =>
    isAdminOrSuper ? items : items.filter((i: any) => i.admin_ids?.includes(currentUserId));

  const adminCounts = {
    circles: filterAdmin(circles).length,
    programs: isAdminOrSuper ? programs.length : programs.filter((p: any) => p.facilitator_id === currentUserId).length,
    tables: filterAdmin(tables).length,
    elevators: filterAdmin(elevators).length,
    meetings: filterAdmin(meetings).length,
    pitches: filterAdmin(pitches).length,
    builds: filterAdmin(builds).length,
    standups: filterAdmin(standups).length,
    meetups: filterAdmin(meetups).length,
    sprints: filterAdmin(sprints).length,
  };

  // Container items map for ActivitiesSection.
  // All container types — including playlists (→ episodes) and magazines (→ blogs).
  const containerItems: Record<string, any[]> = {
    elevators, tables, builds, prompts, pitches, standups,
    sprints, magazines, playlists, checklists, meetings, meetups,
  };

  const getActivityCount = (activityType: string): number => {
    if (activityType === 'documents') return documentCounts.total;
    if (activityType === 'reviews')   return reviewCounts.total;
    if (activityType === 'episodes')  return episodes.length;
    return 0;
  };

  // ─── Accordion coordination ──────────────────────────────────────────────────

  // Auto-expand COMMON CONTENT section when navigating to a content-type page
  useEffect(() => {
    const contentPaths = ['/blogs', '/episodes', '/documents', '/books', '/decks', '/reviews'];
    if (contentPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
      setExpandedSections((prev) => ({ ...prev, content: true }));
    }
  }, [location.pathname]);

  // Auto-expand MY GROWTH section when viewing any of its child routes
  useEffect(() => {
    const growthPaths = ['/my-courses', '/my-programs', '/my-pathways', '/my-growth', '/browse-pathways', '/profile/badges', '/moments', '/portfolio', '/discovery', '/explore'];
    const isGrowthRoute = growthPaths.some((p) =>
      location.pathname === p || location.pathname.startsWith(p + '/')
    );
    if (isGrowthRoute) {
      setExpandedSections((prev) => ({ ...prev, myGrowth: true }));
    }
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    const mainSections = ['user', 'myContent', 'myGrowth', 'members', 'sponsors', 'activities', 'circles', 'content', 'setup'];
    const adminSections = ['myAdmin'];
    const containerAdminSections = ['tableAdmin', 'elevatorAdmin', 'meetingAdmin', 'pitchAdmin', 'buildAdmin', 'standupAdmin', 'meetupAdmin', 'sprintAdmin'];

    setExpandedSections((prev) => {
      const next = { ...prev };

      // Determine which group this key belongs to and close siblings
      const closeGroup = (members: string[]) => {
        members.forEach((s) => { if (s !== key) next[s] = false; });
      };
      const closePrefixGroup = (prefix: string, excludePrefix?: string) => {
        Object.keys(prev).forEach((s) => {
          if (s.startsWith(prefix) && (!excludePrefix || !s.startsWith(excludePrefix)) && s !== key) {
            next[s] = false;
          }
        });
      };

      if (mainSections.includes(key)) closeGroup(mainSections);
      else if (adminSections.includes(key)) closeGroup(adminSections);
      else if (containerAdminSections.includes(key)) closeGroup(containerAdminSections);
      else if (key.startsWith('circle-')) closePrefixGroup('circle-');
      else if (key.startsWith('activity-container-')) closePrefixGroup('activity-container-');
      else if (key.startsWith('activity-')) closePrefixGroup('activity-', 'activity-container-');

      next[key] = !prev[key];
      return next;
    });
  };

  // ─── Collapsed state ─────────────────────────────────────────────────────────

  if (isCollapsed) {
    return (
      <div className="h-full w-16 border-r border-gray-200 bg-white flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} className="mb-4">
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  // ─── Full sidebar ────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-64 border-r border-gray-200 bg-white flex flex-col">
      {/* Header - Community Branding */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {community?.logo ? (
              <img src={community.logo} alt={community.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {community?.name.charAt(0) || 'C'}
              </div>
            )}
            <span className="font-semibold text-gray-900">{community?.name || 'Connexted'}</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <ScrollArea className="flex-1 min-h-0 px-2 py-1.5">
        <div className="space-y-1.5">
          <UserSection
            profile={profile}
            isExpanded={expandedSections['user']}
            onToggle={() => toggleSection('user')}
            ticketCount={ticketCount}
          />
          <Separator className="my-1.5" />
          <MyContentSection
            isExpanded={expandedSections['myContent']}
            onToggle={() => toggleSection('myContent')}
            myReviewCount={reviewCounts.myReviews}
            allUserContainersCount={allUserContainers.length}
          />
          <Separator className="my-1.5" />
          <MyGrowthSection
            isExpanded={expandedSections['myGrowth']}
            onToggle={() => toggleSection('myGrowth')}
            profileId={profile?.id}
          />
          <Separator className="my-1.5" />
          <MembersSection
            isExpanded={expandedSections['members']}
            onToggle={() => toggleSection('members')}
            userCount={allUsers.length}
          />
          <Separator className="my-1.5" />
          <SponsorsSection
            isExpanded={expandedSections['sponsors']}
            onToggle={() => toggleSection('sponsors')}
            sponsorCount={sponsors.length}
          />
          <Separator className="my-1.5" />
          <CirclesSection
            isExpanded={expandedSections['circles']}
            onToggle={() => toggleSection('circles')}
            circles={commonCircles}
          />
          <Separator className="my-1.5" />
          <ContentSection
            isExpanded={expandedSections['content']}
            onToggle={() => toggleSection('content')}
            getActivityCount={getActivityCount}
          />
          <Separator className="my-1.5" />
          <ActivitiesSection
            isExpanded={expandedSections['activities']}
            onToggle={() => toggleSection('activities')}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            containerItems={containerItems}
          />
          <Separator className="my-1.5" />
          <SetupSection
            isExpanded={expandedSections['setup']}
            onToggle={() => toggleSection('setup')}
            profile={profile}
            hasRole={hasRole}
            adminCounts={adminCounts}
          />
        </div>
      </ScrollArea>
    </div>
  );
}