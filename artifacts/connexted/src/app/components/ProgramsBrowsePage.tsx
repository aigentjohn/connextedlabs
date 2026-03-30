import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PROGRAM_TEMPLATES } from '@/data/program-templates';
import { Search, Users, Calendar, CheckCircle, Lock, Clock, UserPlus, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useMyProgramMemberships, useJoinProgram } from '@/hooks/useProgramMembership';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { LikeButton } from '@/app/components/engagement/LikeButton';

interface ProgramInstance {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  cover_image: string | null;
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  member_count?: number;
}

function ProgramBrowseCard({ program, isMember, onJoin, likeCount, isLiked, userId }: {
  program: ProgramInstance;
  isMember: boolean;
  onJoin: (programId: string) => void;
  likeCount?: number;
  isLiked?: boolean;
  userId?: string;
}) {
  const navigate = useNavigate();
  const template = PROGRAM_TEMPLATES.find(t => t.id === program.template_id);
  const [memberCount, setMemberCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchMemberCount();
  }, [program.id]);

  const fetchMemberCount = async () => {
    const { count } = await supabase
      .from('program_members')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', program.id)
      .in('status', ['enrolled', 'completed']);
    
    setMemberCount(count || 0);
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsJoining(true);
    await onJoin(program.id);
    setIsJoining(false);
  };

  const enrollmentBadge = () => {
    if (isMember) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enrolled
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/programs/${program.slug}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{template?.icon || '📋'}</span>
              {enrollmentBadge()}
            </div>
            <CardTitle className="text-xl">{program.name}</CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {program.description || template?.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Member Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>

        {/* Duration */}
        {template?.duration && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{template.duration}</span>
          </div>
        )}

        {/* Like Button */}
        <LikeButton
          contentType="program"
          contentId={program.id}
          initialIsLiked={isLiked ?? false}
          initialLikesCount={likeCount ?? 0}
          userId={userId}
          size="sm"
        />

        {/* Action Button */}
        <div className="pt-2">
          {isMember ? (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/programs/${program.slug}`);
              }}
            >
              View Program
            </Button>
          ) : (
            <Button 
              className="w-full"
              onClick={handleJoin}
              disabled={isJoining}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isJoining ? 'Joining...' : 'Join Program'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProgramsBrowsePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allPrograms, setAllPrograms] = useState<ProgramInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'my-programs'>('available');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const [likedByMeSet, setLikedByMeSet] = useState<Set<string>>(new Set());

  const { memberships, refetch: refetchMemberships } = useMyProgramMemberships();
  const { joinProgram } = useJoinProgram();

  useEffect(() => {
    if (profile) {
      fetchAllPrograms();
    }
  }, [profile]);

  const fetchAllPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const programs = data || [];
      setAllPrograms(programs);

      // Fetch likes for all programs
      if (programs.length > 0 && profile) {
        const ids = programs.map(p => p.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'program')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        const likedMe = new Set<string>();
        (likesData || []).forEach((like: { content_id: string; user_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
          if (like.user_id === profile.id) likedMe.add(like.content_id);
        });
        setLikeCountsMap(counts);
        setLikedByMeSet(likedMe);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProgram = async (programId: string) => {
    const result = await joinProgram(programId);
    if (result.success) {
      if (result.alreadyMember) {
        toast.info('You are already a member of this program');
      } else {
        toast.success('Successfully joined program!');
      }
      refetchMemberships();
      fetchAllPrograms();
    } else if (result.error) {
      toast.error(result.error.message || 'Failed to join program');
    }
  };

  const myProgramIds = new Set(memberships.map(m => m.program_id));

  const myPrograms = allPrograms.filter(p => myProgramIds.has(p.id));
  const availablePrograms = allPrograms.filter(p => !myProgramIds.has(p.id));

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'innovation', label: 'Innovation' },
    { value: 'learning', label: 'Learning' },
    { value: 'startup', label: 'Startup' },
    { value: 'product', label: 'Product' },
    { value: 'community', label: 'Community' },
    { value: 'research', label: 'Research' },
  ];

  const filterPrograms = (programs: ProgramInstance[]) => {
    return programs.filter((program) => {
      const matchesSearch =
        program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const template = PROGRAM_TEMPLATES.find(t => t.id === program.template_id);
      const matchesCategory =
        selectedCategory === 'all' || template?.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'most-liked') return (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filteredAvailable = filterPrograms(availablePrograms);
  const filteredMyPrograms = filterPrograms(myPrograms);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Breadcrumbs items={[{ label: 'Browse Programs' }]} />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Programs</h1>
            <p className="text-gray-600 mt-2">
              Browse and join programs in your community
            </p>
          </div>
          <Button onClick={() => navigate('/programs/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="available">
              Available Programs
              {availablePrograms.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {availablePrograms.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-programs">
              My Programs
              {myPrograms.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myPrograms.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter */}
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort:</span>
              <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
              <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
              <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
            </div>
          </div>

          <TabsContent value="available" className="space-y-4">
            {filteredAvailable.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAvailable.map((program) => (
                  <ProgramBrowseCard
                    key={program.id}
                    program={program}
                    isMember={false}
                    onJoin={handleJoinProgram}
                    likeCount={likeCountsMap[program.id] || 0}
                    isLiked={likedByMeSet.has(program.id)}
                    userId={profile?.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No available programs</p>
                    <p className="text-sm mt-1">
                      {searchQuery || selectedCategory !== 'all'
                        ? 'Try adjusting your search or filter'
                        : 'Check back later for new programs'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-programs" className="space-y-4">
            {filteredMyPrograms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMyPrograms.map((program) => (
                  <ProgramBrowseCard
                    key={program.id}
                    program={program}
                    isMember={true}
                    onJoin={handleJoinProgram}
                    likeCount={likeCountsMap[program.id] || 0}
                    isLiked={likedByMeSet.has(program.id)}
                    userId={profile?.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No programs yet</p>
                    <p className="text-sm mt-1">
                      {searchQuery || selectedCategory !== 'all'
                        ? 'Try adjusting your search or filter'
                        : 'Join your first program to get started'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}