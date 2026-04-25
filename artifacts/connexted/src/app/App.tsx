import { useEffect, useState, startTransition, lazy as reactLazy, Suspense, ComponentType, Component, ReactNode } from 'react';
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SponsorProvider } from '@/lib/sponsor-context';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { handleAsyncError } from '@/lib/error-handler';
import { Toaster } from 'sonner';
import { useFixEngagementConstraints } from '@/lib/useFixEngagementConstraints';

// ---------------------------------------------------------------------------
// Resilient lazy loader — retries with exponential backoff (up to 3 retries),
// then forces a full page reload with a sessionStorage guard to prevent loops.
// ---------------------------------------------------------------------------
const RELOAD_KEY = '__connexted_lazy_reload__';

function lazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return reactLazy(() => retryImport(factory));
}

async function retryImport<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  maxRetries = 3
): Promise<{ default: T }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await factory();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const delay = Math.min(1000 * 2 ** attempt, 8000); // 1s, 2s, 4s, 8s

      if (isLastAttempt) {
        console.error(
          `[lazy-retry] All ${maxRetries + 1} attempts failed. Checking for force-reload…`,
          err
        );
        forceReloadOnce();
        // If we reach here, we already reloaded recently — rethrow to ErrorBoundary
        throw err;
      }

      console.warn(
        `[lazy-retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms…`,
        err
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('[lazy-retry] Unexpected end of retry loop');
}

function forceReloadOnce() {
  const lastReload = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();
  if (lastReload && now - parseInt(lastReload, 10) < 60_000) {
    console.warn('[lazy-retry] Skipping force-reload — already reloaded within 60s.');
    return;
  }
  console.warn('[lazy-retry] Force-reloading page to recover from chunk failure…');
  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
}

// ---------------------------------------------------------------------------
// ChunkErrorBoundary — catches chunk-load errors inside Suspense boundaries
// and shows a user-friendly reload prompt instead of a blank screen.
// ---------------------------------------------------------------------------
interface ChunkEBState { hasError: boolean; error: Error | null }
class ChunkErrorBoundary extends Component<{ children: ReactNode }, ChunkEBState> {
  state: ChunkEBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ChunkEBState {
    // React 18 throws this as a real Error (not just a warning) when a
    // non-transition setState causes a lazy component to suspend. Don't show
    // the broken-UI fallback — the nearest <Suspense> boundary handles it.
    if (error.message?.includes('suspended while responding to synchronous input')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    if (error.message?.includes('suspended while responding to synchronous input')) return;
    console.error('[ChunkErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-gray-600 text-sm text-center max-w-md">
            This page couldn't be loaded. This is usually temporary — click below to retry.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Eager imports — ONLY what is needed before auth resolves on the very first
// render.  Everything else must be lazy to keep the initial JS chunk small.
//   DashboardLayout  = the authenticated shell (sidebar + header); sync avoids
//                      a flash of unstyled content on every navigation.
//   HomePage         = first page a logged-in user lands on.
//   LoginPage        = shown immediately for unauthenticated visits.
//   MarketingLandingPage = the "/" root for guests.
// ---------------------------------------------------------------------------
import DashboardLayout from '@/app/components/DashboardLayout';
import HomePage from '@/app/components/HomePage';
import LoginPage from '@/app/components/LoginPage';
import MarketingLandingPage from '@/app/components/MarketingLandingPage';

// ---------------------------------------------------------------------------
// Lazy-loaded route components
// ---------------------------------------------------------------------------

// Public pages (DemosPage, GuestExplorePage, NewsPage are lazy — loaded on demand)
const DemosPage = lazy(() => import('@/app/components/DemosPage'));
const GuestExplorePage = lazy(() => import('@/app/components/GuestExplorePage'));
const NewsPage = lazy(() => import('@/app/components/NewsPage'));
const ProgramLandingPage = lazy(() => import('@/app/components/ProgramLandingPage'));
const CircleLandingPage = lazy(() => import('@/app/components/CircleLandingPage'));
const CirclePreviewPage = lazy(() => import('@/app/components/preview/CirclePreviewPage'));
const ProgramPreviewPage = lazy(() => import('@/app/components/preview/ProgramPreviewPage'));
const TemplatePreviewPage = lazy(() => import('@/app/components/preview/TemplatePreviewPage'));
const LinkLibraryBrowser = lazy(() => import('@/app/pages/LinkLibraryBrowser'));
const LinkDetailPage = lazy(() => import('@/app/pages/LinkDetailPage'));
const ClaimProfilePage = lazy(() => import('@/app/components/ClaimProfilePage'));
const ConnectivityTestPage = lazy(() => import('@/app/components/ConnectivityTestPage'));
const ProspectSignup = lazy(() => import('@/app/components/ProspectSignup'));
const KitCommerceDemo = lazy(() => import('@/app/components/KitCommerceDemo'));
const JoinOurCommunityPageFlexible = lazy(() => import('@/app/components/JoinOurCommunityPageFlexible'));
const ClaimProfileConfirmPage = lazy(() => import('@/app/components/ClaimProfileConfirmPage'));

// Circles
const CirclesPage = lazy(() => import('@/app/components/CirclesPage'));
const CircleDetailPage = lazy(() => import('@/app/components/CircleDetailPage'));
const MyCirclesPage = lazy(() => import('@/app/components/MyCirclesPage'));
const MyCirclesSummaryPage = lazy(() => import('@/app/components/MyCirclesSummaryPage'));
const CircleRequestPage = lazy(() => import('@/app/components/CircleRequestPage'));
const CircleSettingsPage = lazy(() => import('@/app/components/circle/CircleSettingsPage'));

// Profile & Growth
const ProfilePage = lazy(() => import('@/app/components/ProfilePage'));
const MyBasicsPage = lazy(() => import('@/app/components/MyBasicsPage'));
const MyProfessionalPage = lazy(() => import('@/app/components/MyProfessionalPage'));
const MyEngagementPage = lazy(() => import('@/app/components/MyEngagementPage'));
const MyAccountPage = lazy(() => import('@/app/components/MyAccountPage'));
const MyBadgesPage = lazy(() => import('@/app/components/MyBadgesPage'));
const MyGrowthPage = lazy(() => import('@/app/components/growth/MyGrowthPage'));
const BrowsePathwaysPage = lazy(() => import('@/app/components/growth/BrowsePathwaysPage'));
const PathwayAdminPage = lazy(() => import('@/app/components/growth/PathwayAdminPage'));
const PathwayProgressTracker = lazy(() => import('@/app/components/growth/PathwayProgressTracker'));
const PathwayDetailPage = lazy(() => import('@/app/pages/PathwayDetailPage'));
const FollowersPage = lazy(() => import('@/app/components/FollowersPage'));
const FollowingPage = lazy(() => import('@/app/components/FollowingPage'));
const VenuesPage = lazy(() => import('@/app/components/VenuesPage'));
const CalendarPage = lazy(() => import('@/app/components/CalendarPage'));
const MyCalendarAdminPage = lazy(() => import('@/app/components/calendar/MyCalendarAdminPage'));
const EventAdminDetailPage = lazy(() => import('@/app/components/calendar/EventAdminDetailPage'));
const UserProfilePage = lazy(() => import('@/app/components/UserProfilePage'));
const MomentsPage = lazy(() => import('@/app/components/MomentsPage'));
const MomentsSettingsPage = lazy(() => import('@/app/components/MomentsSettingsPage'));
const PortfolioPage = lazy(() => import('@/app/components/PortfolioPage'));
const PortfolioSettingsPage = lazy(() => import('@/app/components/PortfolioSettingsPage'));
const AddPortfolioItemPage = lazy(() => import('@/app/components/AddPortfolioItemPage'));

// Discovery & Navigation
const DiscoveryPage = lazy(() => import('@/app/components/DiscoveryPage'));
const DiscoveryFeedPage = lazy(() => import('@/app/pages/DiscoveryFeedPage'));
const DiscoveryFollowingPage = lazy(() => import('@/app/pages/DiscoveryFollowingPage'));
const DiscoveryFollowersPage = lazy(() => import('@/app/pages/DiscoveryFollowersPage'));
const DiscoveryFriendsPage = lazy(() => import('@/app/pages/DiscoveryFriendsPage'));
const MostLikedPage = lazy(() => import('@/app/pages/MostLikedPage'));
const ExploreContentPage = lazy(() => import('@/app/pages/ExploreContentPage'));
const ExplorePage = lazy(() => import('@/app/components/ExplorePage'));
const TagDetailPage = lazy(() => import('@/app/components/TagDetailPage'));
const NotificationsPage = lazy(() => import('@/app/components/NotificationsPage'));
const HelpViewer = lazy(() => import('@/app/components/HelpViewer'));
const SearchPage = lazy(() => import('@/app/components/SearchPage'));
const RankingsPage = lazy(() => import('@/app/pages/RankingsPage'));

// Content
const FeedPage = lazy(() => import('@/app/components/FeedPage'));
const ForumsPage = lazy(() => import('@/app/components/ForumsPage'));
const ThreadDetailPage = lazy(() => import('@/app/components/ThreadDetailPage'));
const EventsPage = lazy(() => import('@/app/components/EventsPage'));
const TicketedEventsPage = lazy(() => import('@/app/components/TicketedEventsPage'));
const EventCompanionsPage = lazy(() => import('@/app/components/events/EventCompanionsPage'));
const EventCompanionDetailPage = lazy(() => import('@/app/components/events/EventCompanionDetailPage'));
const EventCompanionCreatePage = lazy(() => import('@/app/components/events/EventCompanionCreatePage'));
const DocumentsPage = lazy(() => import('@/app/components/DocumentsPage'));
const AddDocumentForm = lazy(() => import('@/app/components/AddDocumentForm'));
const DocumentDetailPage = lazy(() => import('@/app/components/DocumentDetailPage'));
const MyDocumentsPage = lazy(() => import('@/app/components/MyDocumentsPage'));
const ReviewsPage = lazy(() => import('@/app/components/ReviewsPage'));
const AddReviewForm = lazy(() => import('@/app/components/AddReviewForm'));
const ReviewDetailPage = lazy(() => import('@/app/components/ReviewDetailPage'));
const MyReviewsPage = lazy(() => import('@/app/components/MyReviewsPage'));
const EngagementLeaderboardPage = lazy(() => import('@/app/components/EngagementLeaderboardPage'));
const CollectionsPage = lazy(() => import('@/app/components/CollectionsPage'));
const MembersPage = lazy(() => import('@/app/components/MembersPage'));
const MyContentPage = lazy(() => import('@/app/components/MyContentPage'));
const MyContentAuditPage = lazy(() => import('@/app/pages/MyContentAuditPage'));
const TrashPage = lazy(() => import('@/app/pages/TrashPage'));
const MyPagesPage = lazy(() => import('@/app/pages/MyPagesPage'));
const RecentActivitiesPage = lazy(() => import('@/app/components/RecentActivitiesPage'));
const PricingPage = lazy(() => import('@/app/components/PricingPage'));

// Books & Decks
const BooksPage = lazy(() => import('@/app/components/BooksPage'));
const BookDetailPage = lazy(() => import('@/app/components/BookDetailPage'));
const BooksSetupPage = lazy(() => import('@/app/components/BooksSetupPage'));
const AddBookForm = lazy(() => import('@/app/components/AddBookForm'));
const DecksPage = lazy(() => import('@/app/components/DecksPage'));
const DeckDetailPage = lazy(() => import('@/app/components/DeckDetailPage'));

// Topics
const TopicsPage = lazy(() => import('@/app/pages/TopicsPage'));
const TopicDetailPage = lazy(() => import('@/app/pages/TopicDetailPage'));

// Tags
const TagsPage = lazy(() => import('@/app/pages/TagsPage'));

// Episodes & Playlists
const EpisodesPage = lazy(() => import('@/app/components/EpisodesPage'));
const CreateEpisodePage = lazy(() => import('@/app/components/CreateEpisodePage'));
const EpisodeDetailPage = lazy(() => import('@/app/components/EpisodeDetailPage'));
const PlaylistsPage = lazy(() => import('@/app/components/PlaylistsPage'));
const PlaylistDetailPage = lazy(() => import('@/app/components/PlaylistDetailPage'));
const CreatePlaylistPage = lazy(() => import('@/app/components/CreatePlaylistPage'));

// Blogs & Magazines
const BlogsPage = lazy(() => import('@/app/components/BlogsPage'));
const BlogDetailPage = lazy(() => import('@/app/components/blogs/BlogDetailPage'));
const ShareBlogForm = lazy(() => import('@/app/components/blogs/ShareBlogForm'));
const MagazinesPage = lazy(() => import('@/app/components/MagazinesPage'));
const CreateMagazineForm = lazy(() => import('@/app/components/magazines/CreateMagazineForm'));
const MagazineDetailPage = lazy(() => import('@/app/components/magazines/MagazineDetailPage'));

// Courses
const CoursesPage = lazy(() => import('@/app/components/CoursesPage'));
const CourseLandingPage = lazy(() => import('@/app/components/CourseLandingPage'));
const CoursePlayerPage = lazy(() => import('@/app/components/CoursePlayerPage'));
const MyCoursesPage = lazy(() => import('@/app/components/MyCoursesPage'));
const MyLearningUnified = lazy(() => import('@/app/components/MyLearningUnified').then(m => ({ default: m.MyLearningUnified })));
const RedeemPage = lazy(() => import('@/app/components/RedeemPage'));
const InstructorDashboard = lazy(() => import('@/app/components/instructor/InstructorDashboard'));
const InstructorCourseManagement = lazy(() => import('@/app/components/instructor/InstructorCourseManagement'));
const CreateCoursePage = lazy(() => import('@/app/components/course/CreateCoursePage'));

// Programs
const MyProgramsPage = lazy(() => import('@/app/components/MyProgramsPage'));
const MySessionsPage = lazy(() => import('@/app/components/MySessionsPage'));
const ProgramsBrowsePage = lazy(() => import('@/app/components/ProgramsBrowsePage'));
const ProgramsDiscoverPage = lazy(() => import('@/app/components/program/ProgramsDiscoverPage'));
const ProgramPageRouter = lazy(() => import('@/app/components/program/ProgramPageRouter'));
const ProgramDetailPage = lazy(() => import('@/app/components/ProgramDetailPage'));
const ProgramApplicationPage = lazy(() => import('@/app/components/ProgramApplicationPage'));
const ProgramSettingsPage = lazy(() => import('@/app/components/program/ProgramSettingsPage'));
const CreateProgramPage = lazy(() => import('@/app/components/program/CreateProgramPage'));
const ProgramAnalyticsDashboard = lazy(() => import('@/app/components/ProgramAnalyticsDashboard'));

// Tables
const TablesPage = lazy(() => import('@/app/components/TablesPage'));
const CreateTablePage = lazy(() => import('@/app/components/table/CreateTablePage'));
const TableDetailPage = lazy(() => import('@/app/components/TableDetailPage'));
const TableSettingsPage = lazy(() => import('@/app/components/table/TableSettingsPage'));

// Elevators
const ElevatorsPage = lazy(() => import('@/app/components/ElevatorsPage'));
const CreateElevatorPage = lazy(() => import('@/app/components/elevator/CreateElevatorPage'));
const ElevatorDetailPage = lazy(() => import('@/app/components/elevator/ElevatorDetailPage'));
const ElevatorSettingsPage = lazy(() => import('@/app/components/elevator/ElevatorSettingsPage'));

// Meetings
const MeetingsPage = lazy(() => import('@/app/components/MeetingsPage'));
const CreateMeetingPage = lazy(() => import('@/app/components/meeting/CreateMeetingPage'));
const MeetingDetailPage = lazy(() => import('@/app/components/meeting/MeetingDetailPage'));
const MeetingSettingsPage = lazy(() => import('@/app/components/meeting/MeetingSettingsPage'));

// Pitches
const PitchesPage = lazy(() => import('@/app/components/PitchesPage'));
const CreatePitchPage = lazy(() => import('@/app/components/pitch/CreatePitchPage'));
const PitchDetailPage = lazy(() => import('@/app/components/PitchDetailPage'));
const PitchSettingsPage = lazy(() => import('@/app/components/pitch/PitchSettingsPage'));

// Builds
const BuildsPage = lazy(() => import('@/app/components/BuildsPage'));
const CreateBuildPage = lazy(() => import('@/app/components/build/CreateBuildPage'));
const BuildDetailPage = lazy(() => import('@/app/components/BuildDetailPage'));
const BuildSettingsPage = lazy(() => import('@/app/components/build/BuildSettingsPage'));

// Standups
const StandupsPage = lazy(() => import('@/app/components/StandupsPage'));
const CreateStandupPage = lazy(() => import('@/app/components/standup/CreateStandupPage'));
const StandupDetailPage = lazy(() => import('@/app/components/standup/StandupDetailPage'));
const StandupSettingsPage = lazy(() => import('@/app/components/standup/StandupSettingsPage'));

// Meetups
const MeetupsPage = lazy(() => import('@/app/components/MeetupsPage'));
const CreateMeetupPage = lazy(() => import('@/app/components/meetup/CreateMeetupPage'));
const MeetupDetailPage = lazy(() => import('@/app/components/meetup/MeetupDetailPage'));
const MeetupSettingsPage = lazy(() => import('@/app/components/meetup/MeetupSettingsPage'));
const AddMeetingToMeetupPage = lazy(() => import('@/app/components/meetup/AddMeetingToMeetupPage'));

// Libraries
const LibrariesPage = lazy(() => import('@/app/components/LibrariesPage'));
const CreateLibraryPage = lazy(() => import('@/app/components/CreateLibraryPage'));
const LibraryDetailPage = lazy(() => import('@/app/components/LibraryDetailPage'));
const LibrariesSetupPage = lazy(() => import('@/app/components/LibrariesSetupPage'));
const LibrarySettingsPage = lazy(() => import('@/app/components/libraries/LibrarySettingsPage'));

// Checklists
const ChecklistsPage = lazy(() => import('@/app/components/ChecklistsPage'));
const ChecklistsSetupPage = lazy(() => import('@/app/components/ChecklistsSetupPage'));
const CreateChecklistPage = lazy(() => import('@/app/components/CreateChecklistPage'));
const ChecklistDetailPage = lazy(() => import('@/app/components/ChecklistDetailPage'));

// Sprints
const SprintsPage = lazy(() => import('@/app/components/SprintsPage'));
const CreateSprintPage = lazy(() => import('@/app/components/CreateSprintPage'));
const SprintDetailPage = lazy(() => import('@/app/components/SprintDetailPage'));
const SprintSettingsPage = lazy(() => import('@/app/components/SprintSettingsPage'));

// Markets
const MarketsPage = lazy(() => import('@/app/components/MarketsPage'));
const MarketDetailPage = lazy(() => import('@/app/components/MarketDetailPage'));
const OfferingProfilePage = lazy(() => import('@/app/components/OfferingProfilePage'));
const MarketsAllMarketsPage = lazy(() => import('@/app/components/MarketsAllMarketsPage'));
const MarketsAllOfferingsPage = lazy(() => import('@/app/components/MarketsAllOfferingsPage'));
const MarketsAllCompaniesPage = lazy(() => import('@/app/components/MarketsAllCompaniesPage'));
const NetworkCompaniesPage = lazy(() => import('@/app/components/NetworkCompaniesPage'));
const MyVenturesPage = lazy(() => import('@/app/components/MyVenturesPage'));
const CreateCompanyPage = lazy(() => import('@/app/components/markets/CreateCompanyPage'));
const CreateOfferingPage = lazy(() => import('@/app/components/markets/CreateOfferingPage'));
const EditCompanyPage = lazy(() => import('@/app/components/markets/EditCompanyPage'));
const EditOfferingPage = lazy(() => import('@/app/components/markets/EditOfferingPage'));
const CompanyProfilePage = lazy(() => import('@/app/components/markets/CompanyProfilePage'));
const CompanyNewsPage = lazy(() => import('@/app/components/markets/CompanyNewsPage'));
const CompanyNewsSettings = lazy(() => import('@/app/components/markets/CompanyNewsSettings'));
const CompanyCompanionPage = lazy(() => import('@/app/components/markets/CompanyCompanionPage'));
const MyCompaniesPage = lazy(() => import('@/app/components/markets/MyCompaniesPage'));
const CompanyCompanionsPage = lazy(() => import('@/app/components/markets/CompanyCompanionsPage'));
const MemberMatchesPage = lazy(() => import('@/app/components/MemberMatchesPage'));

// Sponsors
const SponsorsPage = lazy(() => import('@/app/components/SponsorsPage'));
const SponsorDetailPage = lazy(() => import('@/app/components/SponsorDetailPage'));
const SponsorManagePage = lazy(() => import('@/app/components/sponsor/SponsorManagePage'));
const SponsorCompanionPage = lazy(() => import('@/app/components/sponsor/SponsorCompanionPage'));

// Misc
const AIDiscussionDemo = lazy(() => import('@/app/components/AIDiscussionDemo'));
const EngagementDemo = lazy(() => import('@/app/components/engagement/EngagementDemo'));

// Pages directory
const MyContentsPage = lazy(() => import('@/app/pages/MyContentsPage'));
const MyContentAdminPage = lazy(() => import('@/app/pages/MyContentAdminPage').then(m => ({ default: m.MyContentAdminPage })));
const ContactDirectoryPage = lazy(() => import('@/app/pages/ContactDirectoryPage'));
const FriendsPage = lazy(() => import('@/app/pages/FriendsPage'));
const FriendCompanionPage = lazy(() => import('@/app/pages/FriendCompanionPage'));
const FriendCompanionsListPage = lazy(() => import('@/app/pages/FriendCompanionsListPage'));
const SocialsPage = lazy(() => import('@/app/pages/SocialsPage'));
const SocialStatsPage = lazy(() => import('@/app/pages/SocialStatsPage'));
const ActiveMembersPage = lazy(() => import('@/app/pages/ActiveMembersPage'));
const AffinityMembersPage = lazy(() => import('@/app/pages/AffinityMembersPage'));
const BadgedMembersPage = lazy(() => import('@/app/pages/BadgedMembersPage'));
const BadgeTypesManagementPage = lazy(() => import('@/app/pages/admin/BadgeTypesManagementPage'));
const BadgeDetailPage = lazy(() => import('@/app/pages/admin/BadgeDetailPage'));

// Badges
const BadgeManagementPage = lazy(() => import('@/app/components/badges/BadgeManagementPage'));
const BadgeAdminHub = lazy(() => import('@/app/components/admin/BadgeAdminHub'));

// Admin
const TemplatesManager = lazy(() => import('@/app/components/admin/TemplatesManager'));
const ShareableLinksManager = lazy(() => import('@/app/components/admin/ShareableLinksManager'));
const ProgramBackupRestore = lazy(() => import('@/app/components/admin/ProgramBackupRestore'));
const AccountManagementPage = lazy(() => import('@/app/components/admin/AccountManagementPage'));
const PlatformAnalyticsDashboard = lazy(() => import('@/app/components/admin/PlatformAnalyticsDashboard'));
const TemplateLibraryPage = lazy(() => import('@/app/components/admin/TemplateLibraryPage'));
const TemplatesLibraryPage = lazy(() => import('@/app/pages/TemplatesLibraryPage').then(m => ({ default: m.TemplatesLibraryPage })));
const ApplicationReviewDashboard = lazy(() => import('@/app/components/admin/ApplicationReviewDashboard'));
const SessionManagement = lazy(() => import('@/app/components/admin/SessionManagement').then(m => ({ default: m.SessionManagement })));
const WaitlistManagementPage = lazy(() => import('@/app/components/admin/WaitlistManagementPage'));
const ApplicationAnalyticsDashboardPage = lazy(() => import('@/app/components/admin/ApplicationAnalyticsDashboardPage'));
const InvitationManagement = lazy(() => import('@/app/components/admin/InvitationManagement'));
const MyAdminDashboard = lazy(() => import('@/app/components/admin/MyAdminDashboard'));
const AdminDashboardTabbed = lazy(() => import('@/app/components/admin/AdminDashboardTabbed'));
const ContentEngagementDashboard = lazy(() => import('@/app/components/admin/ContentEngagementDashboard'));
const BatchContainerDeletePage = lazy(() => import('@/app/components/admin/BatchContainerDeletePage'));
const DataCleanupUtility = lazy(() => import('@/app/components/admin/DataCleanupUtility'));
const CircleAdminPage = lazy(() => import('@/app/components/admin/CircleAdminPage'));
const AdminNotificationsPage = lazy(() => import('@/app/components/admin/AdminNotificationsPage'));
const DataAuditDashboard = lazy(() => import('@/app/components/admin/DataAuditDashboard'));
const DataCleanupManager = lazy(() => import('@/app/components/admin/DataCleanupManager'));
const SeedDataConfiguration = lazy(() => import('@/app/components/admin/SeedDataConfiguration'));
const DataSeeder = lazy(() => import('@/app/components/admin/DataSeeder'));
const CircleManagement = lazy(() => import('@/app/components/admin/CircleManagement'));
const CircleEditor = lazy(() => import('@/app/components/admin/CircleEditor'));
const CoursesManagement = lazy(() => import('@/app/components/admin/CoursesManagement'));
const UserManagement = lazy(() => import('@/app/components/admin/UserManagement'));
const UserDetailPage = lazy(() => import('@/app/components/admin/UserDetailPage'));
const UserClassManagement = lazy(() => import('@/app/components/admin/UserClassManagement'));
const ContainerConfigurationPage = lazy(() => import('@/app/components/admin/ContainerConfigurationPage'));
const TagManagement = lazy(() => import('@/app/components/admin/TagManagement'));
const TopicInterestManagement = lazy(() => import('@/app/components/admin/TopicInterestManagement'));
const AnnouncementManagement = lazy(() => import('@/app/components/admin/AnnouncementManagement'));
const EventsManagement = lazy(() => import('@/app/components/admin/EventsManagement'));
const FeedManagement = lazy(() => import('@/app/components/admin/FeedManagement'));
const ForumsManagement = lazy(() => import('@/app/components/admin/ForumsManagement'));
const DocumentsManagement = lazy(() => import('@/app/components/admin/DocumentsManagement'));
const ReviewsManagement = lazy(() => import('@/app/components/admin/ReviewsManagement'));
const ContainerMemberships = lazy(() => import('@/app/components/admin/ContainerMemberships'));
const SubscriptionPackagesPage = lazy(() => import('@/app/components/admin/SubscriptionPackagesPage'));
const PaymentManagement = lazy(() => import('@/app/components/admin/PaymentManagement'));
const MembershipTiersManagement = lazy(() => import('@/app/components/admin/MembershipTiersManagement'));
const ContentModerationPage = lazy(() => import('@/app/components/admin/ContentModerationPage'));
const FlaggedContentPage = lazy(() => import('@/app/components/admin/FlaggedContentPage'));
const DeletedDocumentsPage = lazy(() => import('@/app/components/admin/DeletedDocumentsPage'));
const BuildEditor = lazy(() => import('@/app/components/admin/BuildEditor'));
const ChecklistsManagement = lazy(() => import('@/app/components/admin/ChecklistsManagement'));
const SprintsManagement = lazy(() => import('@/app/components/admin/SprintsManagement'));
const BuildsManagement = lazy(() => import('@/app/components/admin/BuildsManagement'));
const ProgramsManagement = lazy(() => import('@/app/components/admin/ProgramsManagement'));
const SponsorManagement = lazy(() => import('@/app/components/admin/SponsorManagement'));
const SponsorTierManagement = lazy(() => import('@/app/components/admin/SponsorTierManagement'));
const NotificationConfiguration = lazy(() => import('@/app/components/admin/NotificationConfiguration'));
const PlatformSettings = lazy(() => import('@/app/components/admin/PlatformSettings'));
const DemoAccountsManager = lazy(() => import('@/app/components/admin/DemoAccountsManager'));
const ClaimableProfilesManager = lazy(() => import('@/app/components/admin/ClaimableProfilesManager'));
const ClaimableProfilesImport = lazy(() => import('@/app/components/admin/ClaimableProfilesImport'));
const MarketManagement = lazy(() => import('@/app/components/admin/MarketManagement'));
const MarketsConfiguration = lazy(() => import('@/app/components/admin/MarketsConfiguration'));
const CompaniesManagement = lazy(() => import('@/app/components/admin/CompaniesManagement'));
const ProspectManagement = lazy(() => import('@/app/components/admin/ProspectManagement'));
const PlatformOfferingsManager = lazy(() => import('@/app/components/admin/PlatformOfferingsManager'));
const CircleAdminDashboard = lazy(() => import('@/app/components/admin/CircleAdminDashboard').then(m => ({ default: m.CircleAdminDashboard })));
const ProgramAdminDashboard = lazy(() => import('@/app/components/admin/ProgramAdminDashboard').then(m => ({ default: m.ProgramAdminDashboard })));
const ProgramSetupDashboard = lazy(() => import('@/app/components/admin/ProgramSetupDashboard'));
const MyProgramsDashboard = lazy(() => import('@/app/components/admin/MyProgramsDashboard'));
const DocumentationManager = lazy(() => import('@/app/components/admin/DocumentationManager'));
const AdminLinkLibrary = lazy(() => import('@/app/components/admin/AdminLinkLibrary'));
const AdminLinkForm = lazy(() => import('@/app/components/admin/AdminLinkForm'));
const InnovationAcceleratorSeedData = lazy(() => import('@/app/components/admin/InnovationAcceleratorSeedData'));
const TopicsTagsSeeder = lazy(() => import('@/app/components/admin/TopicsTagsSeeder'));
const TicketTemplatesAdmin = lazy(() => import('@/app/components/admin/TicketTemplatesAdmin'));
const TicketInventoryAdmin = lazy(() => import('@/app/components/admin/TicketInventoryAdmin'));
const KitCommerceAdmin = lazy(() => import('@/app/components/admin/KitCommerceAdmin'));
const TicketWalletDashboard = lazy(() => import('@/app/components/tickets/TicketWalletDashboard').then(m => ({ default: m.TicketWalletDashboard })));
const FunnelConfigurationPage = lazy(() => import('@/app/components/admin/FunnelConfigurationPage').then(m => ({ default: m.FunnelConfigurationPage })));

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth-aware route wrappers (must be defined before createBrowserRouter)
// ---------------------------------------------------------------------------

/** Shows auth loading spinner while session resolves, then renders the route */
function RootLayout() {
  const { loading } = useAuth();
  // `authReady` starts true only if auth was already resolved on mount (e.g.
  // a cached session). When loading flips false we set authReady inside
  // startTransition so that rendering <Outlet /> — and any lazy component it
  // triggers — is treated as a deferrable transition, not a synchronous-input
  // update. This prevents "A component suspended while responding to
  // synchronous input" from being thrown to the ChunkErrorBoundary.
  const [authReady, setAuthReady] = useState(!loading);

  useEffect(() => {
    if (!loading && !authReady) {
      startTransition(() => setAuthReady(true));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  return <Outlet />;
}

/** Redirects unauthenticated users to "/" */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Redirects authenticated users away from public-only pages */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

/** DashboardLayout as a layout route, wired to signOut */
function AuthenticatedLayout() {
  const { user, signOut } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <DashboardLayout onLogout={signOut} />;
}

// ---------------------------------------------------------------------------
// Router — createBrowserRouter (data mode) wraps every navigation in
// startTransition automatically, eliminating the "suspended during synchronous
// input" error that BrowserRouter/Routes cannot avoid in React 18.
// ---------------------------------------------------------------------------
const router = createBrowserRouter([
  {
    element: (
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <RootLayout />
        </Suspense>
      </ChunkErrorBoundary>
    ),
    children: [
      // ── Public routes ──────────────────────────────────────────────────
      { path: '/', element: <GuestOnly><MarketingLandingPage /></GuestOnly> },
      { path: '/demos', element: <DemosPage /> },
      { path: '/join', element: <GuestExplorePage /> },
      { path: '/join-community', element: <JoinOurCommunityPageFlexible /> },
      { path: '/prospect-signup', element: <ProspectSignup /> },
      { path: '/kit-demo', element: <KitCommerceDemo /> },
      { path: '/programs/:slug/landing', element: <ProgramLandingPage /> },
      { path: '/circles/:id/landing', element: <CircleLandingPage /> },
      { path: '/preview/circles/:id', element: <CirclePreviewPage /> },
      { path: '/preview/programs/:slug', element: <ProgramPreviewPage /> },
      { path: '/preview/templates/:id', element: <TemplatePreviewPage /> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/links', element: <LinkLibraryBrowser /> },
      { path: '/links/:linkId', element: <LinkDetailPage /> },
            
      { path: '/claim-profile', element: <ClaimProfilePage /> },
      { path: '/test-connection', element: <ConnectivityTestPage /> },
      { path: '/claim-profile-confirm', element: <RequireAuth><ClaimProfileConfirmPage /></RequireAuth> },

      // ── Authenticated routes (DashboardLayout) ────────────────────────
      {
        element: <AuthenticatedLayout />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/news', element: <NewsPage /> },
          { path: '/circles', element: <CirclesPage /> },
          { path: '/circles/:id', element: <CircleDetailPage /> },
          { path: '/circles/:circleId/feed', element: <FeedPage /> },
          { path: '/circles/:circleId/forums', element: <ForumsPage /> },
          { path: '/circles/:circleId/events', element: <EventsPage /> },
          { path: '/circles/:circleId/documents', element: <DocumentsPage /> },
          { path: '/circles/:circleId/courses', element: <CoursesPage /> },
          { path: '/circles/:circleId/reviews', element: <ReviewsPage /> },
          { path: '/circles/:circleId/settings', element: <CircleSettingsPage /> },
          { path: '/my-circles', element: <MyCirclesPage /> },
          { path: '/my-circles/summary', element: <MyCirclesSummaryPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/my-basics', element: <MyBasicsPage /> },
          { path: '/my-professional', element: <MyProfessionalPage /> },
          { path: '/my-engagement', element: <MyEngagementPage /> },
          { path: '/my-account', element: <MyAccountPage /> },
          { path: '/profile/badges', element: <MyBadgesPage /> },
          { path: '/badges/:badgeTypeId', element: <BadgeDetailPage /> },
          { path: '/my-growth', element: <MyGrowthPage /> },
          { path: '/my-growth/pathway/:pathwayId', element: <PathwayDetailPage /> },
          { path: '/browse-pathways', element: <BrowsePathwaysPage /> },
          { path: '/profile/followers', element: <FollowersPage /> },
          { path: '/profile/following', element: <FollowingPage /> },
          { path: '/profile/venues', element: <VenuesPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/my-calendar-admin', element: <MyCalendarAdminPage /> },
          { path: '/calendar-admin/:eventId', element: <EventAdminDetailPage /> },
          { path: '/discovery', element: <DiscoveryPage /> },
          { path: '/discovery/feed', element: <DiscoveryFeedPage /> },
          // Legacy routes — kept so existing bookmarks/links still work
          { path: '/discovery/following', element: <DiscoveryFollowingPage /> },
          { path: '/discovery/followers', element: <DiscoveryFollowersPage /> },
          { path: '/discovery/friends', element: <DiscoveryFriendsPage /> },
          { path: '/discovery/most-liked', element: <MostLikedPage /> },
          { path: '/explore/content', element: <ExploreContentPage /> },
          { path: '/explore', element: <ExplorePage /> },
          { path: '/pricing', element: <PricingPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/help', element: <HelpViewer /> },
          { path: '/help/:type', element: <HelpViewer /> },
          { path: '/rankings', element: <RankingsPage /> },
          { path: '/feed', element: <FeedPage /> },
          { path: '/blogs', element: <BlogsPage /> },
          { path: '/blogs/create', element: <ShareBlogForm /> },
          { path: '/blogs/:id', element: <BlogDetailPage /> },
          { path: '/magazines', element: <MagazinesPage /> },
          { path: '/magazines/create', element: <CreateMagazineForm /> },
          { path: '/magazines/:id', element: <MagazineDetailPage /> },
          { path: '/forums', element: <ForumsPage /> },
          { path: '/forums/:threadId', element: <ThreadDetailPage /> },
          { path: '/ai-demo', element: <AIDiscussionDemo /> },
          { path: '/engagement-demo', element: <EngagementDemo /> },
          { path: '/events', element: <EventsPage /> },
          { path: '/ticketed-events', element: <TicketedEventsPage /> },
          { path: '/event-companions', element: <EventCompanionsPage /> },
          { path: '/event-companions/new', element: <EventCompanionCreatePage /> },
          { path: '/event-companions/:id', element: <EventCompanionDetailPage /> },
          { path: '/episodes', element: <EpisodesPage /> },
          { path: '/episodes/new', element: <CreateEpisodePage /> },
          { path: '/playlists', element: <PlaylistsPage /> },
          { path: '/playlists/create', element: <CreatePlaylistPage /> },
          { path: '/playlists/:slug', element: <PlaylistDetailPage /> },
          { path: '/episodes/:id', element: <EpisodeDetailPage /> },
          { path: '/documents', element: <DocumentsPage /> },
          { path: '/documents/new', element: <AddDocumentForm /> },
          { path: '/documents/:id', element: <DocumentDetailPage /> },
          { path: '/documents/:id/edit', element: <AddDocumentForm /> },
          { path: '/my-documents', element: <MyDocumentsPage /> },
          { path: '/my-sessions', element: <MySessionsPage /> },
          // Courses
          { path: '/courses', element: <CoursesPage /> },
          { path: '/courses/:slug', element: <CourseLandingPage /> },
          { path: '/courses/:slug/learn', element: <CoursePlayerPage /> },
          { path: '/my-courses', element: <MyCoursesPage /> },
          { path: '/my-learning', element: <MyLearningUnified /> },
          { path: '/redeem', element: <RedeemPage /> },
          { path: '/instructor/dashboard', element: <InstructorDashboard /> },
          { path: '/instructor/courses/:slug', element: <InstructorCourseManagement /> },
          { path: '/courses/create', element: <CreateCoursePage /> },
          { path: '/course-admin/:courseId/setup', element: <ProgramSetupDashboard /> },
          { path: '/reviews', element: <ReviewsPage /> },
          { path: '/reviews/new', element: <AddReviewForm /> },
          { path: '/reviews/:id', element: <ReviewDetailPage /> },
          { path: '/my-reviews', element: <MyReviewsPage /> },
          { path: '/engagement-leaderboard', element: <EngagementLeaderboardPage /> },
          // Tables
          { path: '/tables', element: <TablesPage /> },
          { path: '/tables/create', element: <CreateTablePage /> },
          { path: '/tables/:slug', element: <TableDetailPage /> },
          { path: '/tables/:slug/settings', element: <TableSettingsPage /> },
          // Elevators
          { path: '/elevators', element: <ElevatorsPage /> },
          { path: '/elevators/create', element: <CreateElevatorPage /> },
          { path: '/elevators/:slug', element: <ElevatorDetailPage /> },
          { path: '/elevators/:slug/settings', element: <ElevatorSettingsPage /> },
          // Meetings
          { path: '/meetings', element: <MeetingsPage /> },
          { path: '/meetings/create', element: <CreateMeetingPage /> },
          { path: '/meetings/:slug', element: <MeetingDetailPage /> },
          { path: '/meetings/:slug/settings', element: <MeetingSettingsPage /> },
          // Pitches
          { path: '/pitches', element: <PitchesPage /> },
          { path: '/pitches/create', element: <CreatePitchPage /> },
          { path: '/pitches/:slug', element: <PitchDetailPage /> },
          { path: '/pitches/:slug/settings', element: <PitchSettingsPage /> },
          // Builds
          { path: '/builds', element: <BuildsPage /> },
          { path: '/builds/new', element: <CreateBuildPage /> },
          { path: '/builds/:slug', element: <BuildDetailPage /> },
          { path: '/builds/:slug/settings', element: <BuildSettingsPage /> },
          // Books
          { path: '/books', element: <BooksPage /> },
          { path: '/books/new', element: <AddBookForm /> },
          { path: '/books/:id', element: <BookDetailPage /> },
          { path: '/books/setup', element: <BooksSetupPage /> },
          // Decks
          { path: '/decks', element: <DecksPage /> },
          { path: '/decks/:id', element: <DeckDetailPage /> },
          // Topics
          { path: '/topics', element: <TopicsPage /> },
          { path: '/topics/:slug', element: <TopicDetailPage /> },
          // Tags
          { path: '/tags', element: <TagsPage /> },
          { path: '/tags/:tagName', element: <TagDetailPage /> },
          // Standups
          { path: '/standups', element: <StandupsPage /> },
          { path: '/standups/create', element: <CreateStandupPage /> },
          { path: '/standups/:slug', element: <StandupDetailPage /> },
          { path: '/standups/:slug/settings', element: <StandupSettingsPage /> },
          // Meetups
          { path: '/meetups', element: <MeetupsPage /> },
          { path: '/meetups/create', element: <CreateMeetupPage /> },
          { path: '/meetups/:slug', element: <MeetupDetailPage /> },
          { path: '/meetups/:slug/settings', element: <MeetupSettingsPage /> },
          { path: '/meetups/:slug/add-meeting', element: <AddMeetingToMeetupPage /> },
          // My Content
          { path: '/my-subscriptions', element: <Navigate to="/my-content" replace /> },
          { path: '/my-content', element: <MyContentPage /> },
          { path: '/my-content/audit', element: <MyContentAuditPage /> },
          { path: '/my-content/trash', element: <TrashPage /> },
          { path: '/my-pages', element: <MyPagesPage /> },
          { path: '/my-content-admin', element: <MyContentAdminPage /> },
          { path: '/my-contents', element: <MyContentsPage /> },
          { path: '/members', element: <MembersPage /> },
          { path: '/members/friends', element: <FriendsPage /> },
          { path: '/members/friends/companions', element: <FriendCompanionsListPage /> },
          { path: '/members/friends/:friendId/companion', element: <FriendCompanionPage /> },
          { path: '/members/socials', element: <SocialsPage /> },
          { path: '/members/social-stats', element: <SocialStatsPage /> },
          { path: '/members/following', element: <FollowingPage /> },
          { path: '/members/followers', element: <FollowersPage /> },
          { path: '/members/active', element: <ActiveMembersPage /> },
          { path: '/members/affinity', element: <AffinityMembersPage /> },
          { path: '/members/badged', element: <BadgedMembersPage /> },
          { path: '/members/:type', element: <MembersPage /> },
          { path: '/contacts/directory', element: <ContactDirectoryPage /> },
          { path: '/users/:userId', element: <UserProfilePage /> },
          { path: '/moments/:userId', element: <MomentsPage /> },
          { path: '/moments/:userId/settings', element: <MomentsSettingsPage /> },
          { path: '/portfolio/:userId', element: <PortfolioPage /> },
          { path: '/portfolio/:userId/settings', element: <PortfolioSettingsPage /> },
          { path: '/portfolio/:userId/add-item', element: <AddPortfolioItemPage /> },
          { path: '/recent-activities', element: <RecentActivitiesPage /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/sponsors', element: <SponsorsPage /> },
          { path: '/sponsors/:slug', element: <SponsorDetailPage /> },
          { path: '/sponsors/:slug/companion', element: <SponsorCompanionPage /> },
          { path: '/sponsor/:slug/manage', element: <SponsorManagePage /> },
          { path: '/sponsor/:slug/members', element: <SponsorManagePage /> },
          // Markets
          { path: '/markets', element: <MarketsPage /> },
          { path: '/markets/all-markets', element: <MarketsAllMarketsPage /> },
          { path: '/markets/all-offerings', element: <MarketsAllOfferingsPage /> },
          { path: '/markets/all-companies', element: <MarketsAllCompaniesPage /> },
          { path: '/markets/network-companies', element: <NetworkCompaniesPage /> },
          { path: '/markets/offerings/:slug', element: <OfferingProfilePage /> },
          { path: '/markets/:marketType', element: <MarketDetailPage /> },
          { path: '/my-ventures', element: <MyVenturesPage /> },
          { path: '/my-companies', element: <MyCompaniesPage /> },
          { path: '/company-companions', element: <CompanyCompanionsPage /> },
          { path: '/member-matches', element: <MemberMatchesPage /> },
          { path: '/markets/create-company', element: <CreateCompanyPage /> },
          { path: '/markets/create-offering', element: <CreateOfferingPage /> },
          { path: '/markets/edit-company/:id', element: <EditCompanyPage /> },
          { path: '/markets/edit-offering/:id', element: <EditOfferingPage /> },
          { path: '/markets/companies/:slug', element: <CompanyProfilePage /> },
          { path: '/markets/companies/:slug/companion', element: <CompanyCompanionPage /> },
          { path: '/markets/companies/:slug/news', element: <CompanyNewsPage /> },
          { path: '/markets/companies/:slug/news/settings', element: <CompanyNewsSettings /> },
          // Libraries
          { path: '/libraries', element: <LibrariesPage /> },
          { path: '/libraries/create', element: <CreateLibraryPage /> },
          { path: '/libraries/:id', element: <LibraryDetailPage /> },
          { path: '/libraries/setup', element: <LibrariesSetupPage /> },
          { path: '/libraries/:id/settings', element: <LibrarySettingsPage /> },
          // Checklists
          { path: '/checklists', element: <ChecklistsPage /> },
          { path: '/checklists/setup', element: <ChecklistsSetupPage /> },
          { path: '/checklists/new', element: <CreateChecklistPage /> },
          { path: '/checklists/:id', element: <ChecklistDetailPage /> },
          // Sprints
          { path: '/sprints', element: <SprintsPage /> },
          { path: '/sprints/new', element: <CreateSprintPage /> },
          { path: '/sprints/:slug', element: <SprintDetailPage /> },
          { path: '/sprints/:slug/settings', element: <SprintSettingsPage /> },
          // Programs
          { path: '/programs', element: <Navigate to="/programs/discover" replace /> },
          { path: '/programs/discover', element: <ProgramsDiscoverPage /> },
          { path: '/programs/new', element: <CreateProgramPage /> },
          { path: '/programs/:slug', element: <ProgramPageRouter /> },
          { path: '/programs/:slug/dashboard', element: <ProgramDetailPage /> },
          { path: '/programs/:slug/about', element: <ProgramPageRouter /> },
          { path: '/programs/:slug/apply', element: <ProgramApplicationPage /> },
          { path: '/programs/:slug/settings', element: <ProgramSettingsPage /> },
          { path: '/programs/:slug/analytics', element: <ProgramAnalyticsDashboard /> },
          { path: '/programs/:programId/admin', element: <ProgramAdminDashboard /> },
          { path: '/programs/:programId/admin/funnel-config', element: <FunnelConfigurationPage /> },
          // Circles misc
          { path: '/circles/:id/request', element: <CircleRequestPage /> },
          { path: '/circles/:id/join', element: <CircleRequestPage /> },
          // My Programs
          { path: '/my-programs', element: <MyProgramsPage /> },
          // Program Admin
          { path: '/program-admin', element: <MyProgramsDashboard /> },
          { path: '/program-admin/applications', element: <ApplicationReviewDashboard /> },
          { path: '/program-admin/:programId/sessions', element: <SessionManagement /> },
          { path: '/program-admin/:programId/setup', element: <ProgramSetupDashboard /> },
          { path: '/program-admin/waitlist', element: <WaitlistManagementPage /> },
          { path: '/program-admin/analytics', element: <ApplicationAnalyticsDashboardPage /> },
          // Admin
          { path: '/admin', element: <MyAdminDashboard /> },
          { path: '/circle-admin', element: <CircleAdminPage /> },
          { path: '/admin/circles/:circleId', element: <CircleAdminDashboard /> },
          { path: '/circles/:circleId/admin', element: <CircleAdminDashboard /> },
          { path: '/circles/:circleId/admin/funnel-config', element: <FunnelConfigurationPage /> },
          // Platform Admin
          { path: '/platform-admin', element: <AdminDashboardTabbed /> },
          { path: '/platform-admin/batch-delete', element: <BatchContainerDeletePage /> },
          { path: '/platform-admin/data-cleanup-utility', element: <DataCleanupUtility /> },
          { path: '/platform-admin/applications', element: <ApplicationReviewDashboard /> },
          { path: '/platform-admin/circles', element: <CircleManagement /> },
          { path: '/platform-admin/circles/:circleId/edit', element: <CircleEditor /> },
          { path: '/platform-admin/programs', element: <ProgramsManagement /> },
          { path: '/platform-admin/courses', element: <CoursesManagement /> },
          { path: '/platform-admin/users', element: <UserManagement /> },
          { path: '/platform-admin/users/:userId', element: <UserDetailPage /> },
          { path: '/platform-admin/user-classes', element: <UserClassManagement /> },
          { path: '/platform-admin/container-configuration', element: <ContainerConfigurationPage /> },
          { path: '/platform-admin/tags', element: <TagManagement /> },
          { path: '/platform-admin/topic-interests', element: <TopicInterestManagement /> },
          { path: '/platform-admin/announcements', element: <AnnouncementManagement /> },
          { path: '/platform-admin/events', element: <EventsManagement /> },
          { path: '/platform-admin/feed', element: <FeedManagement /> },
          { path: '/platform-admin/forums', element: <ForumsManagement /> },
          { path: '/platform-admin/documents', element: <DocumentsManagement /> },
          { path: '/platform-admin/reviews', element: <ReviewsManagement /> },
          { path: '/platform-admin/container-memberships', element: <ContainerMemberships /> },
          { path: '/platform-admin/subscription-packages', element: <SubscriptionPackagesPage /> },
          { path: '/platform-admin/payment', element: <PaymentManagement /> },
          { path: '/platform-admin/membership-tiers', element: <MembershipTiersManagement /> },
          { path: '/platform-admin/content-moderation', element: <ContentModerationPage /> },
          { path: '/platform-admin/flagged-content', element: <FlaggedContentPage /> },
          { path: '/platform-admin/deleted-documents', element: <DeletedDocumentsPage /> },
          { path: '/platform-admin/builds/new', element: <BuildEditor /> },
          { path: '/platform-admin/builds/:buildId/edit', element: <BuildEditor /> },
          { path: '/platform-admin/checklists', element: <ChecklistsManagement /> },
          { path: '/platform-admin/sprints', element: <SprintsManagement /> },
          { path: '/platform-admin/builds', element: <BuildsManagement /> },
          { path: '/platform-admin/sponsors', element: <SponsorManagement /> },
          { path: '/platform-admin/sponsor-tiers', element: <SponsorTierManagement /> },
          { path: '/platform-admin/notifications', element: <NotificationConfiguration /> },
          { path: '/platform-admin/notifications/manage', element: <AdminNotificationsPage /> },
          { path: '/platform-admin/settings', element: <PlatformSettings /> },
          { path: '/platform-admin/demo-accounts', element: <DemoAccountsManager /> },
          { path: '/platform-admin/claimable-profiles', element: <ClaimableProfilesManager /> },
          { path: '/platform-admin/claimable-profiles/import', element: <ClaimableProfilesImport /> },
          { path: '/platform-admin/templates', element: <TemplatesManager /> },
          { path: '/platform-admin/template-library', element: <TemplateLibraryPage /> },
          { path: '/platform-admin/templates-library', element: <TemplatesLibraryPage /> },
          { path: '/platform-admin/shareable-links', element: <ShareableLinksManager /> },
          { path: '/platform-admin/program-backup-restore', element: <ProgramBackupRestore /> },
          { path: '/platform-admin/account-management', element: <AccountManagementPage /> },
          { path: '/platform-admin/analytics', element: <PlatformAnalyticsDashboard /> },
          { path: '/platform-admin/markets', element: <MarketManagement /> },
          { path: '/platform-admin/markets/configuration', element: <MarketsConfiguration /> },
          { path: '/platform-admin/companies', element: <CompaniesManagement /> },
          { path: '/platform-admin/prospects', element: <ProspectManagement /> },
          { path: '/platform-admin/offerings', element: <PlatformOfferingsManager /> },
          { path: '/platform-admin/links', element: <AdminLinkLibrary /> },
          { path: '/platform-admin/links/create', element: <AdminLinkForm /> },
          { path: '/platform-admin/links/:linkId/edit', element: <AdminLinkForm /> },
          { path: '/platform-admin/invitations', element: <InvitationManagement /> },
          { path: '/platform-admin/data-audit', element: <DataAuditDashboard /> },
          { path: '/platform-admin/data-cleanup', element: <DataCleanupManager /> },
          { path: '/platform-admin/seed-data', element: <SeedDataConfiguration /> },
          { path: '/platform-admin/data-seeder', element: <DataSeeder /> },
          { path: '/platform-admin/seed-innovation-accelerator', element: <InnovationAcceleratorSeedData /> },
          { path: '/platform-admin/seed-topics-tags', element: <TopicsTagsSeeder /> },
          { path: '/platform-admin/documentation', element: <DocumentationManager /> },
          { path: '/platform-admin/content-engagement', element: <ContentEngagementDashboard /> },
          { path: '/platform-admin/badge-admin', element: <BadgeAdminHub /> },
          { path: '/platform-admin/badges', element: <BadgeManagementPage /> },
          { path: '/platform-admin/badge-types', element: <BadgeTypesManagementPage /> },
          { path: '/platform-admin/badges/:badgeTypeId', element: <BadgeDetailPage /> },
          { path: '/platform-admin/pathways', element: <PathwayAdminPage /> },
          { path: '/platform-admin/pathway-progress', element: <PathwayProgressTracker /> },
          { path: '/platform-admin/ticket-templates', element: <TicketTemplatesAdmin /> },
          { path: '/platform-admin/ticket-inventory', element: <TicketInventoryAdmin /> },
          { path: '/platform-admin/kit-commerce', element: <KitCommerceAdmin /> },
          { path: '/my-tickets', element: <TicketWalletDashboard /> },
          // Legacy redirects
          { path: '/admin/circles', element: <Navigate to="/platform-admin/circles" replace /> },
          { path: '/admin/circles/:circleId/edit', element: <Navigate to="/platform-admin/circles" replace /> },
          { path: '/admin/users', element: <Navigate to="/platform-admin/users" replace /> },
          { path: '/admin/tags', element: <Navigate to="/platform-admin/tags" replace /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  useFixEngagementConstraints();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      console.error('[Unhandled Promise Rejection]:', event.reason);
      handleAsyncError(event.reason, { component: 'App', action: 'unhandledRejection' });
    };

    const handleGlobalError = (event: ErrorEvent) => {
      event.preventDefault();
      console.error('[Global Error]:', event.error);
      handleAsyncError(event.error, { component: 'App', action: 'globalError' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <SponsorProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors />
          </SponsorProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}