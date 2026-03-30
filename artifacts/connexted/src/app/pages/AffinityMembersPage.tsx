import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { Zap, Search, X, Award, Users, TrendingUp, Circle, Loader2 } from 'lucide-react';

interface AffinityMember {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  badges: string[];
  circles: string[];
  programs: string[];
  containers: string[];
  affinity_score: number;
  common_programs: number;
  common_circles: number;
  common_containers: number;
}

export default function AffinityMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<AffinityMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<AffinityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState(0);
  
  // User's own memberships for affinity calculation
  const [userCircles, setUserCircles] = useState<string[]>([]);
  const [userPrograms, setUserPrograms] = useState<string[]>([]);
  const [userContainers, setUserContainers] = useState<string[]>([]);

  // Weights for affinity calculation
  const PROGRAM_WEIGHT = 5;
  const CIRCLE_WEIGHT = 3;
  const CONTAINER_WEIGHT = 1;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, minScore]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    console.log('Starting affinity calculation...');
    
    try {
      // Step 1: Fetch user's own memberships
      console.log('Fetching user memberships...');
      
      const [userCircleData, userContainerData] = await Promise.all([
        supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('container_members')
          .select('container_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
      ]);

      const myCircles = userCircleData.data?.map(cm => cm.circle_id) || [];
      const myContainers = userContainerData.data?.map(cm => cm.container_id) || [];

      // Fetch programs for user's circles
      const { data: userProgramData } = await supabase
        .from('circles')
        .select('program_id')
        .in('id', myCircles);
      
      const myPrograms = [...new Set(userProgramData?.map(c => c.program_id).filter(Boolean) || [])];

      setUserCircles(myCircles);
      setUserPrograms(myPrograms as string[]);
      setUserContainers(myContainers);

      console.log('User memberships:', { 
        circles: myCircles.length, 
        programs: myPrograms.length, 
        containers: myContainers.length 
      });

      // If user has no memberships, can't calculate affinity
      if (myCircles.length === 0 && myPrograms.length === 0 && myContainers.length === 0) {
        console.log('User has no memberships, cannot calculate affinity');
        setMembers([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch all profiles (excluding current user)
      console.log('Fetching all profiles...');
      const { data: profiles } = await supabase
        .from('users')
        .select('id, full_name, display_name, email, avatar_url')
        .neq('id', user.id);

      if (!profiles || profiles.length === 0) {
        console.log('No other members found');
        setMembers([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${profiles.length} other members`);
      const memberIds = profiles.map(p => p.id);

      // Step 3: Batch fetch ALL memberships for all members at once
      console.log('Batch fetching all member data...');
      const [allCircleMemberships, allContainerMemberships, allBadges] = await Promise.all([
        supabase
          .from('circle_members')
          .select('user_id, circle_id')
          .in('user_id', memberIds)
          .eq('status', 'active'),
        supabase
          .from('container_members')
          .select('user_id, container_id')
          .in('user_id', memberIds)
          .eq('status', 'active'),
        supabase
          .from('user_badges')
          .select('user_id, badge_id')
          .in('user_id', memberIds)
      ]);

      console.log('Batch fetch complete');

      // Step 4: Get all unique circles to fetch their programs
      const allCircleIds = [...new Set(allCircleMemberships.data?.map(cm => cm.circle_id) || [])];
      
      const { data: circlePrograms } = await supabase
        .from('circles')
        .select('id, program_id')
        .in('id', allCircleIds);

      // Create a map of circle_id -> program_id for quick lookup
      const circleToProgramMap = new Map(
        circlePrograms?.map(c => [c.id, c.program_id]) || []
      );

      console.log('Building member data structures...');

      // Step 5: Create lookup maps for fast access
      const memberCircles = new Map<string, string[]>();
      const memberContainers = new Map<string, string[]>();
      const memberBadges = new Map<string, string[]>();
      const memberPrograms = new Map<string, Set<string>>();

      // Build circles map and programs map
      allCircleMemberships.data?.forEach(cm => {
        if (!memberCircles.has(cm.user_id)) {
          memberCircles.set(cm.user_id, []);
        }
        memberCircles.get(cm.user_id)!.push(cm.circle_id);

        // Add program for this circle
        const programId = circleToProgramMap.get(cm.circle_id);
        if (programId) {
          if (!memberPrograms.has(cm.user_id)) {
            memberPrograms.set(cm.user_id, new Set());
          }
          memberPrograms.get(cm.user_id)!.add(programId);
        }
      });

      // Build containers map
      allContainerMemberships.data?.forEach(cm => {
        if (!memberContainers.has(cm.user_id)) {
          memberContainers.set(cm.user_id, []);
        }
        memberContainers.get(cm.user_id)!.push(cm.container_id);
      });

      // Build badges map
      allBadges.data?.forEach(b => {
        if (!memberBadges.has(b.user_id)) {
          memberBadges.set(b.user_id, []);
        }
        memberBadges.get(b.user_id)!.push(b.badge_id);
      });

      console.log('Calculating affinity scores...');

      // Step 6: Calculate affinity for each member
      const membersWithAffinity: AffinityMember[] = profiles.map(profile => {
        const circles = memberCircles.get(profile.id) || [];
        const containers = memberContainers.get(profile.id) || [];
        const badges = memberBadges.get(profile.id) || [];
        const programs = Array.from(memberPrograms.get(profile.id) || []);

        // Calculate common memberships
        const commonPrograms = programs.filter(p => myPrograms.includes(p));
        const commonCircles = circles.filter(c => myCircles.includes(c));
        const commonContainers = containers.filter(c => myContainers.includes(c));

        // Calculate affinity score
        const affinityScore = 
          (commonPrograms.length * PROGRAM_WEIGHT) +
          (commonCircles.length * CIRCLE_WEIGHT) +
          (commonContainers.length * CONTAINER_WEIGHT);

        return {
          id: profile.id,
          full_name: profile.full_name || 'Unknown',
          display_name: profile.display_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          badges,
          circles,
          programs,
          containers,
          affinity_score: affinityScore,
          common_programs: commonPrograms.length,
          common_circles: commonCircles.length,
          common_containers: commonContainers.length,
        };
      });

      // Filter out members with zero affinity and sort by score
      const withAffinity = membersWithAffinity
        .filter(m => m.affinity_score > 0)
        .sort((a, b) => b.affinity_score - a.affinity_score);

      console.log(`Found ${withAffinity.length} members with affinity > 0`);
      setMembers(withAffinity);
    } catch (error) {
      console.error('Error fetching affinity members:', error);
    } finally {
      setLoading(false);
      console.log('Affinity calculation complete');
    }
  };

  const filterMembers = () => {
    let filtered = members.filter(m => m.affinity_score >= minScore);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(query) ||
          member.display_name?.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query)
      );
    }

    setFilteredMembers(filtered);
  };

  const getAffinityLevel = (score: number): { label: string; color: string } => {
    if (score >= 15) return { label: 'Very High', color: 'text-purple-600 bg-purple-50' };
    if (score >= 10) return { label: 'High', color: 'text-blue-600 bg-blue-50' };
    if (score >= 5) return { label: 'Medium', color: 'text-green-600 bg-green-50' };
    return { label: 'Low', color: 'text-yellow-600 bg-yellow-50' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-yellow-600 animate-spin mb-4" />
        <div className="text-gray-500">Calculating affinity scores...</div>
        <div className="text-sm text-gray-400 mt-2">This may take a moment for large communities</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recommended Members</h1>
              <p className="text-gray-600 mt-1">
                {filteredMembers.length} members with common interests and activities
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">How Affinity Works</h3>
              <p className="text-sm text-gray-700 mb-2">
                Members are scored based on common memberships with you:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Programs:</strong> +{PROGRAM_WEIGHT} points each (highest priority)</li>
                <li>• <strong>Circles:</strong> +{CIRCLE_WEIGHT} points each (medium priority)</li>
                <li>• <strong>Containers:</strong> +{CONTAINER_WEIGHT} point each (base priority)</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                Your memberships: {userPrograms.length} programs, {userCircles.length} circles, {userContainers.length} containers
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recommended members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
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

          {/* Min Score Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Min Score:
            </label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value={0}>All (0+)</option>
              <option value={5}>Medium (5+)</option>
              <option value={10}>High (10+)</option>
              <option value={15}>Very High (15+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const affinityLevel = getAffinityLevel(member.affinity_score);
            
            return (
              <div
                key={member.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-yellow-300 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
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
                    {/* Affinity badge */}
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Name */}
                  <Link
                    to={`/users/${member.id}`}
                    className="font-semibold text-gray-900 hover:text-yellow-600 mb-1"
                  >
                    {member.display_name || member.full_name}
                  </Link>
                  {member.display_name && (
                    <p className="text-sm text-gray-500 mb-3">{member.full_name}</p>
                  )}

                  {/* Affinity Score */}
                  <div className="mb-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${affinityLevel.color} font-semibold`}>
                      <span className="text-2xl">{member.affinity_score}</span>
                      <span className="text-sm">{affinityLevel.label}</span>
                    </div>
                  </div>

                  {/* Common Connections Breakdown */}
                  <div className="w-full space-y-2 mb-4">
                    {member.common_programs > 0 && (
                      <div className="flex items-center justify-between text-sm bg-purple-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Circle className="w-3 h-3 text-purple-600" />
                          <span className="text-gray-700">Common Programs</span>
                        </div>
                        <span className="font-semibold text-purple-700">
                          {member.common_programs} (×{PROGRAM_WEIGHT})
                        </span>
                      </div>
                    )}
                    {member.common_circles > 0 && (
                      <div className="flex items-center justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span className="text-gray-700">Common Circles</span>
                        </div>
                        <span className="font-semibold text-blue-700">
                          {member.common_circles} (×{CIRCLE_WEIGHT})
                        </span>
                      </div>
                    )}
                    {member.common_containers > 0 && (
                      <div className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-gray-700">Common Containers</span>
                        </div>
                        <span className="font-semibold text-green-700">
                          {member.common_containers} (×{CONTAINER_WEIGHT})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100 w-full justify-center">
                    {member.badges.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span>{member.badges.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{member.circles.length} circles</span>
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    to={`/users/${member.id}`}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium text-center"
                  >
                    Connect
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No members found' : 'No recommendations yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search query or lowering the minimum score'
              : 'Join programs, circles, or containers to find members with common interests'}
          </p>
          {!searchQuery && (
            <Link
              to="/discovery"
              className="inline-flex items-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Explore Platform
            </Link>
          )}
        </div>
      )}
    </div>
  );
}