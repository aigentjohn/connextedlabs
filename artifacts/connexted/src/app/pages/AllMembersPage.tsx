import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { 
  Users, 
  Search, 
  SlidersHorizontal,
  Award,
  Clock,
  Zap,
  TrendingUp,
  Filter,
  X,
  Shield,
  Crown,
  Star,
  User,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react';

type SortOption = 'alphabetical' | 'newest' | 'badges' | 'active' | 'affinity';
type RoleFilter = 'all' | 'super' | 'admin' | 'manager' | 'coordinator' | 'moderator' | 'host' | 'member';
type RoleType = 'super' | 'admin' | 'manager' | 'coordinator' | 'moderator' | 'host' | 'member';

interface Member {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string | null;
  badges: string[];
  role: string;
  circles: string[];
  programs: string[];
  containers: string[];
  affinity_score?: number;
  has_auth?: boolean;
}

export default function AllMembersPage() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>(['super', 'admin', 'manager', 'coordinator', 'moderator', 'host', 'member']);
  const [showFilters, setShowFilters] = useState(false);
  const [authFilter, setAuthFilter] = useState<'all' | 'with-auth' | 'without-auth'>('all');
  
  // User's own memberships for affinity calculation
  const [userCircles, setUserCircles] = useState<string[]>([]);
  const [userPrograms, setUserPrograms] = useState<string[]>([]);
  const [userContainers, setUserContainers] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchMembers();
      fetchUserMemberships();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortMembers();
  }, [members, searchQuery, sortBy, userCircles, selectedRoles, authFilter]);

  const fetchUserMemberships = async () => {
    if (!user) return;

    try {
      // Fetch user's circles
      const { data: circleData } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const circles = circleData?.map(cm => cm.circle_id) || [];
      setUserCircles(circles);

      // Fetch user's programs (through journeys and circles)
      const { data: programData } = await supabase
        .from('circles')
        .select('program_id')
        .in('id', circles);
      
      const programs = [...new Set(programData?.map(c => c.program_id).filter(Boolean) || [])];
      setUserPrograms(programs as string[]);

      // Fetch user's containers
      const { data: containerData } = await supabase
        .from('container_members')
        .select('container_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const containers = containerData?.map(cm => cm.container_id) || [];
      setUserContainers(containers);
    } catch (error) {
      console.error('Error fetching user memberships:', error);
    }
  };

  const fetchMembers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id); // Exclude current user

      if (profilesError) throw profilesError;

      // For each member, fetch their memberships
      const membersWithData = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Fetch circles
          const { data: circleData } = await supabase
            .from('circle_members')
            .select('circle_id')
            .eq('user_id', profile.id)
            .eq('status', 'active');
          
          const circles = circleData?.map(cm => cm.circle_id) || [];

          // Fetch programs through circles
          const { data: programData } = await supabase
            .from('circles')
            .select('program_id')
            .in('id', circles);
          
          const programs = [...new Set(programData?.map(c => c.program_id).filter(Boolean) || [])];

          // Fetch containers
          const { data: containerData } = await supabase
            .from('container_members')
            .select('container_id')
            .eq('user_id', profile.id)
            .eq('status', 'active');
          
          const containers = containerData?.map(cm => cm.container_id) || [];

          // Fetch badges
          const { data: badgeData } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', profile.id);
          
          const badges = badgeData?.map(b => b.badge_id) || [];

          return {
            id: profile.id,
            full_name: profile.full_name || profile.name || 'Unknown',
            display_name: profile.display_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            last_active_at: profile.last_active_at,
            badges,
            role: profile.role,
            circles,
            programs: programs as string[],
            containers,
          };
        })
      );

      setMembers(membersWithData);

      // Try to batch fetch auth status for all members (optional feature)
      try {
        const userIds = membersWithData.map(m => m.id);
        const { data: authStatusData, error: authError } = await supabase
          .rpc('batch_check_users_auth_status', { user_ids: userIds });

        if (authError) {
          // Function doesn't exist yet - this is fine, just skip auth status
          console.log('Auth status check not available. To enable this feature, run the migration in /supabase/migrations/20240127_add_check_auth_status_function.sql');
        } else if (authStatusData) {
          // Update members with auth status
          const membersWithAuth = membersWithData.map(member => {
            const authInfo = authStatusData.find((a: any) => a.user_id === member.id);
            return {
              ...member,
              has_auth: authInfo?.has_auth ?? false
            };
          });
          setMembers(membersWithAuth);
        }
      } catch (authCheckError) {
        // Silently fail - auth status is an optional feature
        console.log('Auth status check skipped:', authCheckError);
      }

    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAffinityScore = (member: Member): number => {
    // Affinity weights
    const PROGRAM_WEIGHT = 5;
    const CIRCLE_WEIGHT = 3;
    const CONTAINER_WEIGHT = 1;

    let score = 0;

    // Common programs
    const commonPrograms = member.programs.filter(p => userPrograms.includes(p));
    score += commonPrograms.length * PROGRAM_WEIGHT;

    // Common circles
    const commonCircles = member.circles.filter(c => userCircles.includes(c));
    score += commonCircles.length * CIRCLE_WEIGHT;

    // Common containers
    const commonContainers = member.containers.filter(c => userContainers.includes(c));
    score += commonContainers.length * CONTAINER_WEIGHT;

    return score;
  };

  const filterAndSortMembers = () => {
    let filtered = [...members];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(query) ||
          member.display_name?.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(member => selectedRoles.includes(member.role as RoleType));
    }

    // Apply auth filter
    if (authFilter !== 'all') {
      filtered = filtered.filter(member => member.has_auth === (authFilter === 'with-auth'));
    }

    // Calculate affinity scores if needed
    if (sortBy === 'affinity') {
      filtered = filtered.map(member => ({
        ...member,
        affinity_score: calculateAffinityScore(member)
      }));
    }

    // Apply sorting
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'badges':
        filtered.sort((a, b) => b.badges.length - a.badges.length);
        break;
      case 'active':
        filtered.sort((a, b) => {
          const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
          const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'affinity':
        filtered.sort((a, b) => (b.affinity_score || 0) - (a.affinity_score || 0));
        break;
    }

    setFilteredMembers(filtered);
  };

  const getSortIcon = (option: SortOption) => {
    switch (option) {
      case 'alphabetical':
        return <Filter className="w-4 h-4" />;
      case 'newest':
        return <Clock className="w-4 h-4" />;
      case 'badges':
        return <Award className="w-4 h-4" />;
      case 'active':
        return <TrendingUp className="w-4 h-4" />;
      case 'affinity':
        return <Zap className="w-4 h-4" />;
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'alphabetical':
        return 'Alphabetical';
      case 'newest':
        return 'Newest Members';
      case 'badges':
        return 'Most Badges';
      case 'active':
        return 'Most Active';
      case 'affinity':
        return 'Highest Affinity';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'all':
        return <Users className="w-4 h-4" />;
      case 'super':
        return <Shield className="w-4 h-4" />;
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <Star className="w-4 h-4" />;
      case 'coordinator':
        return <User className="w-4 h-4" />;
      case 'moderator':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'host':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'member':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'all':
        return 'All Roles';
      case 'super':
        return 'Super';
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'coordinator':
        return 'Coordinator';
      case 'moderator':
        return 'Moderator';
      case 'host':
        return 'Host';
      case 'member':
        return 'Member';
      default:
        return 'Member';
    }
  };

  const toggleRole = (role: RoleType) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const selectAllRoles = () => {
    setSelectedRoles(['super', 'admin', 'manager', 'coordinator', 'moderator', 'host', 'member']);
  };

  const selectNone = () => {
    setSelectedRoles([]);
  };

  const selectAllExceptMembers = () => {
    setSelectedRoles(['super', 'admin', 'manager', 'coordinator', 'moderator', 'host']);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Members</h1>
              <p className="text-gray-600 mt-1">{filteredMembers.length} members found</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Sort by: {getSortLabel(sortBy)}</span>
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  {(['alphabetical', 'newest', 'badges', 'active', 'affinity'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setShowFilters(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        sortBy === option ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      {getSortIcon(option)}
                      <span>{getSortLabel(option)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role Filter Toggle Buttons */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Filter by Role</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllRoles}
                className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                All
              </button>
              <button
                onClick={selectNone}
                className="text-xs px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                None
              </button>
              <button
                onClick={selectAllExceptMembers}
                className="text-xs px-3 py-1 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 transition-colors"
              >
                All Except Members
              </button>
            </div>
          </div>

          {/* Role Toggle Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['super', 'admin', 'manager', 'coordinator', 'moderator', 'host', 'member'] as RoleType[]).map((role) => {
              const isSelected = selectedRoles.includes(role);
              const roleColors = {
                super: isSelected ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white text-purple-600 border-purple-200',
                admin: isSelected ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white text-red-600 border-red-200',
                manager: isSelected ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-white text-orange-600 border-orange-200',
                coordinator: isSelected ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-yellow-600 border-yellow-200',
                moderator: isSelected ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-blue-600 border-blue-200',
                host: isSelected ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-green-600 border-green-200',
                member: isSelected ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-white text-gray-600 border-gray-200',
              };

              return (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${roleColors[role]} ${
                    isSelected ? 'shadow-sm font-medium' : 'hover:shadow-sm'
                  }`}
                >
                  {getRoleIcon(role)}
                  <span>{getRoleLabel(role)}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Link
            key={member.id}
            to={`/users/${member.id}`}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-purple-300 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  member.full_name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Name */}
              <h3 className="font-semibold text-gray-900 mb-1">
                {member.display_name || member.full_name}
              </h3>
              {member.display_name && (
                <p className="text-sm text-gray-500 mb-3">{member.full_name}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                {member.badges.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span>{member.badges.length}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>{member.circles.length}</span>
                </div>
              </div>

              {/* Affinity Score (if sorted by affinity) */}
              {sortBy === 'affinity' && member.affinity_score !== undefined && member.affinity_score > 0 && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                  <Zap className="w-4 h-4" />
                  <span>Affinity: {member.affinity_score}</span>
                </div>
              )}

              {/* New Member Badge */}
              {sortBy === 'newest' && (
                <div className="mt-2 text-xs text-gray-500">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </div>
              )}

              {/* Role Badge - Show all roles with different colors */}
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                member.role === 'super' ? 'bg-purple-100 text-purple-800' :
                member.role === 'admin' ? 'bg-red-100 text-red-800' :
                member.role === 'manager' ? 'bg-orange-100 text-orange-800' :
                member.role === 'coordinator' ? 'bg-yellow-100 text-yellow-800' :
                member.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
                member.role === 'host' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {getRoleIcon(member.role)}
                <span>{getRoleLabel(member.role)}</span>
              </div>

              {/* Auth Status Badge */}
              {member.has_auth !== undefined && (
                <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  member.has_auth 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {member.has_auth ? (
                    <>
                      <UserCheck className="w-3 h-3" />
                      <span>Can Login</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3 h-3" />
                      <span>No Auth</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search query' : 'No members to display'}
          </p>
        </div>
      )}
    </div>
  );
}