import { useState, useEffect, Suspense } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import Sidebar from '@/app/components/Sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Bell, User, LogOut, Menu, X, Shield, Search, CreditCard, FileText, AlertCircle, Sparkles, UserCheck, ArrowLeft, Home, ChevronDown, Zap, MessageSquare, GraduationCap, FolderKanban, Briefcase, Activity, UserCircle, Users, Newspaper, Calendar, Store, BookOpen, Layers, PenTool, Hash, Star, Rss, type LucideIcon } from 'lucide-react';
// REMOVED: import * as Icons from 'lucide-react';  — was pulling all ~1000 icons into the initial bundle
import { useAuth, forceSignOut } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getNotificationCount } from '@/lib/notifications';
import { getUserClassLabel } from '@/lib/user-class-utils';
import { Clock } from 'lucide-react';

/**
 * Curated icon map for dynamic container-type icons stored in the DB.
 * Add entries here when a new icon_name value is introduced in container_types.
 * Avoids the `import * as Icons` namespace import that bypasses tree-shaking.
 */
const CONTAINER_ICON_MAP: Record<string, LucideIcon> = {
  // Generic / fallback
  Users, User, FolderKanban, Briefcase, Activity, UserCircle,
  // Navigation staples
  Newspaper, Calendar, Store, BookOpen, Layers, PenTool, FileText,
  GraduationCap, Zap, MessageSquare, Bell, Search, Shield, Home,
  // Container types commonly stored in container_types.icon_name
  Circle: Users, circles: Users,
  Table: Layers, tables: Layers,
  Elevator: Zap, elevators: Zap,
  Meeting: Calendar, meetings: Calendar,
  Meetup: Calendar, meetups: Calendar,
  Sprint: Activity, sprints: Activity,
  Standup: MessageSquare, standups: MessageSquare,
  Program: GraduationCap, programs: GraduationCap,
  Course: BookOpen, courses: BookOpen,
  Document: FileText, documents: FileText,
  Book: BookOpen, books: BookOpen,
  Deck: Layers, decks: Layers,
  Blog: PenTool, blogs: PenTool,
  Forum: MessageSquare, forums: MessageSquare,
  Episode: Activity, episodes: Activity,
  News: Newspaper, news: Newspaper,
  Market: Store, markets: Store,
  // Additional lucide names admins might choose
  BarChart2: Activity, TrendingUp: Activity,
  Play: Activity, Video: Activity,
  Star: Bell, Heart: Bell,
  CheckSquare: FolderKanban, List: FolderKanban,
};

function getContainerIcon(iconName: string): LucideIcon {
  return CONTAINER_ICON_MAP[iconName] ?? FolderKanban;
}

// Inline route loader — keeps the shell visible while a lazy page chunk downloads
function RouteLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  onLogout: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showContainers, setShowContainers] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, userPermissions, error: authError, isImpersonating, originalAdminProfile, stopImpersonation } = useAuth();
  const currentUser = profile;

  // Fetch notifications
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // If table doesn't exist or other DB errors, silently skip
        if (error.code === 'PGRST204' || error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Notifications table not found, skipping...');
          setNotifications([]);
          return;
        }
        // Don't log in preview environments
        return;
      }

      setNotifications(data || []);
    } catch (error: any) {
      // Network errors in iframe/preview - silently ignore
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        setNotifications([]);
        return;
      }
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await supabase.rpc('mark_notification_read', { 
          p_notification_id: notification.id 
        });
        
        // Update local state
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate if there's a link
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Dynamic navigation based on user class permissions
  const navigation = userPermissions?.visible_containers.map(container => {
    const IconComponent = getContainerIcon(container.icon_name);
    return {
      name: container.display_name,
      href: container.route_path,
      icon: IconComponent,
      type: container.type_code
    };
  }) || [];

  // Separate navigation into Content Types and Container Types
  // Content Types = standalone artefacts (not circle-scoped, not containers)
  // Container Types = everything in CONTAINER_TAXONOMY — goes under Activities
  //
  // From the container_types DB table, only 'episodes' is true content.
  // Everything else (builds, pitches, checklists, playlists, magazines, etc.) is a container.
  const contentTypes: string[] = ['episodes'];
  const containerTypes: string[] = [
    'libraries', 'tables', 'elevators', 'meetings', 'standups',
    'meetups', 'sprints', 'pitches', 'checklists', 'builds',
    'playlists', 'magazines', 'prompts',
  ];
  
  // Content navigation - things available from container_types + standalone content pages
  const contentNavigation = navigation.filter(item => contentTypes.includes(item.type));
  
  // Add standalone content pages — NOT circle-scoped elements.
  // Posts (feed), Forums, and Events live inside circles and are NOT standalone.
  const standaloneContent = [
    { name: 'Documents', href: '/documents', icon: FileText, type: 'documents' },
    { name: 'Books',     href: '/books',     icon: BookOpen, type: 'books'     },
    { name: 'Decks',     href: '/decks',     icon: Layers,   type: 'decks'     },
    { name: 'Blogs',     href: '/blogs',     icon: PenTool,  type: 'blogs'     },
    { name: 'Reviews',   href: '/reviews',   icon: Star,     type: 'reviews'   },
  ];
  
  const allContentNavigation = [...standaloneContent, ...contentNavigation]
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Container/Activities navigation - group collaboration activities
  const dynamicContainerNavigation = navigation.filter(item => containerTypes.includes(item.type));
  
  const containerNavigation = [...dynamicContainerNavigation]
    .sort((a, b) => a.name.localeCompare(b.name));

  const isActive = (path: string) => location.pathname === path;

  if (!currentUser) {
    // Profile failed to load (network error, RLS issue, etc.) — show a
    // recovery screen instead of a blank page. The auth error banner would
    // otherwise never appear because it lives inside the main return JSX.
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to load your profile</h2>
          <p className="text-sm text-gray-500 mb-4">
            {authError || 'There was a problem loading your account. Please try again.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" className="text-red-600" onClick={forceSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Global search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  // Handle circle join callback
  const handleContainerJoined = () => {
    // Force sidebar to refresh by changing its key
    setSidebarKey(prev => prev + 1);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Connection Error Banner */}
      {authError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="font-medium">{authError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4 text-red-700 hover:text-red-900 hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
      
      {/* Impersonation Banner */}
      {isImpersonating && originalAdminProfile && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-700 px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <UserCheck className="w-4 h-4" />
                <span className="font-medium text-sm">Viewing as:</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7 border-2 border-white/30">
                  <AvatarImage src={currentUser.avatar || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{currentUser.name}</p>
                  <p className="text-xs text-white/80">{currentUser.email}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={async () => {
                await stopImpersonation();
                navigate('/');
              }}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to {originalAdminProfile.name}
            </Button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              >
                <Menu className="w-6 h-6" />
              </Button>

              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:inline">Connexted</span>
              </Link>
            </div>

            {/* Desktop Navigation - Simplified */}
            <nav className="hidden md:flex space-x-1">
              {/* Fixed left items: News, Calendar */}
              {navigation.find(item => item.type === 'news') && (
                <Link
                  to="/news"
                  className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/news')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Newspaper className="w-4 h-4 mr-2" />
                  News
                </Link>
              )}
              
              {navigation.find(item => item.type === 'calendar') && (
                <Link
                  to="/events"
                  className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/events')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </Link>
              )}

              {/* Markets */}
              <Link
                to="/markets"
                className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/markets')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Store className="w-4 h-4 mr-2" />
                Markets
              </Link>
              
              {/* Circles */}
              {navigation.find(item => item.type === 'circles') && (
                <Link
                  to="/circles"
                  className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/circles')
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Circles
                </Link>
              )}

              {/* Courses */}
              <Link
                to="/courses"
                className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/courses')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Courses
              </Link>
              
              {/* Programs - Platform Feature */}
              <Link
                to="/programs/discover"
                className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/programs')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Programs
              </Link>
              
              {/* Separator */}
              <div className="flex items-center px-2">
                <div className="w-px h-6 bg-gray-300"></div>
              </div>
              
              {/* Content Dropdown */}
              {allContentNavigation.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        allContentNavigation.some(item => isActive(item.href))
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Content
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                      Content Types
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allContentNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={item.href}
                            className={`cursor-pointer ${
                              isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : ''
                            }`}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {item.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Containers Dropdown */}
              {containerNavigation.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`inline-flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        containerNavigation.some(item => isActive(item.href))
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Activities
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                      Container Types
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {containerNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={item.href}
                            className={`cursor-pointer ${
                              isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : ''
                            }`}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {item.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="hidden md:block">
                <Popover open={showSearch} onOpenChange={setShowSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Search className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <form onSubmit={handleSearch} className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search everything..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                    </form>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => navigate('/notifications')}
                title="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 ? (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                ) : currentUser.has_new_notifications ? (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                ) : null}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-sm font-medium">{currentUser.name}</span>
                      <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                        {getUserClassLabel((currentUser as any).user_class || 3)}
                      </Badge>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{currentUser.name}</p>
                      <p className="text-xs text-gray-500">{currentUser.email}</p>
                      <p className="text-xs text-indigo-600 capitalize">{currentUser.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/" className="cursor-pointer">
                      <Home className="w-4 h-4 mr-2" />
                      My Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-basics" className="cursor-pointer">
                      <UserCircle className="w-4 h-4 mr-2" />
                      My Basics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-professional" className="cursor-pointer">
                      <Briefcase className="w-4 h-4 mr-2" />
                      My Professional
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-engagement" className="cursor-pointer">
                      <Activity className="w-4 h-4 mr-2" />
                      My Engagement
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-account" className="cursor-pointer">
                      <CreditCard className="w-4 h-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/my-courses" className="cursor-pointer">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      My Courses
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-programs" className="cursor-pointer">
                      <FolderKanban className="w-4 h-4 mr-2" />
                      My Programs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-documents" className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      My Documents
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-content-admin" className="cursor-pointer">
                      <Clock className="w-4 h-4 mr-2" />
                      My Content
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive(item.href)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Programs */}
              <Link
                to="/programs/discover"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname.startsWith('/programs')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <GraduationCap className="w-5 h-5 mr-3" />
                Programs
              </Link>

              {/* Markets */}
              <Link
                to="/markets"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname.startsWith('/markets')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Store className="w-5 h-5 mr-3" />
                Markets
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col h-full">
          <Sidebar currentUserId={currentUser.id} key={sidebarKey} />
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <aside className="fixed left-0 top-16 bottom-0 z-50 lg:hidden flex flex-col">
              <Sidebar currentUserId={currentUser.id} key={sidebarKey} />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Suspense fallback={<RouteLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}