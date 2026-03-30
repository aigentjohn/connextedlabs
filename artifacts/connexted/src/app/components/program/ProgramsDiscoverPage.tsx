// Split candidate: ~548 lines — consider extracting ProgramDiscoverCard, ProgramCategoryFilter, and ProgramSearchBar into sub-components.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { PROGRAM_TEMPLATES } from '@/data/program-templates';
import { Search, Users, Calendar, CheckCircle, Lock, Globe, Clock, UserPlus, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useMyProgramMemberships, useJoinProgram } from '@/hooks/useProgramMembership';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { canManagePrograms } from '@/lib/constants/roles';

interface ProgramInstance {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  cover_image: string | null;
  status: 'not-started' | 'in-progress' | 'completed';
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  pricing_type: 'free' | 'paid' | 'members-only';
  enrollment_status?: 'open' | 'closed' | 'invite-only';
  created_at: string;
  member_ids: string[];
  admin_ids: string[];
  capacity_limit?: number;
  enrollment_opens_at?: string;
  enrollment_closes_at?: string;
}

function ProgramDiscoverCard({ program, isMember, onJoin }: {
  program: ProgramInstance;
  isMember: boolean;
  onJoin: (programId: string) => void;
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

  const getEnrollmentBadge = () => {
    if (isMember) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enrolled
        </Badge>
      );
    }

    const enrollmentStatus = program.enrollment_status || 'open';
    
    if (enrollmentStatus === 'open') {
      return (
        <Badge className="bg-green-500">
          <Globe className="w-3 h-3 mr-1" />
          Open
        </Badge>
      );
    }
    
    if (enrollmentStatus === 'invite-only') {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          <Lock className="w-3 h-3 mr-1" />
          Invite Only
        </Badge>
      );
    }
    
    if (enrollmentStatus === 'closed') {
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-600">
          <Lock className="w-3 h-3 mr-1" />
          Closed
        </Badge>
      );
    }
  };

  const getStatusBadge = () => {
    if (program.status === 'in-progress') {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    if (program.status === 'completed') {
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-600">
          Completed
        </Badge>
      );
    }
    return null;
  };

  const getPricingBadge = () => {
    if (program.pricing_type === 'paid') {
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-700">
          Paid
        </Badge>
      );
    }
    if (program.pricing_type === 'members-only') {
      return (
        <Badge variant="outline" className="border-indigo-500 text-indigo-700">
          Members Only
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-green-500 text-green-700">
        Free
      </Badge>
    );
  };

  const canJoin = !isMember && program.enrollment_status === 'open';

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/programs/${program.slug}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{template?.icon || '📋'}</span>
              {getEnrollmentBadge()}
              {getStatusBadge()}
              {getPricingBadge()}
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
          {program.capacity_limit && (
            <span className="text-gray-400">/ {program.capacity_limit} max</span>
          )}
        </div>

        {/* Duration */}
        {template?.duration && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{template.duration}</span>
          </div>
        )}

        {/* Category */}
        {template?.category && (
          <Badge variant="secondary" className="text-xs">
            {template.category}
          </Badge>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          {isMember ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/programs/${program.slug}`);
              }}
            >
              View Program
            </Button>
          ) : canJoin ? (
            <Button 
              size="sm"
              onClick={handleJoin}
              disabled={isJoining}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isJoining ? 'Joining...' : 'Join Program'}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/programs/${program.slug}`);
              }}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProgramsDiscoverPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { memberships, loading: membershipsLoading } = useMyProgramMemberships();
  const { joinProgram } = useJoinProgram();

  const [allPrograms, setAllPrograms] = useState<ProgramInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEnrollment, setSelectedEnrollment] = useState('all');
  const [selectedPricing, setSelectedPricing] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, [profile]);

  const fetchPrograms = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch all programs that are visible to the user
      let query = supabase
        .from('programs')
        .select('*');

      // Filter by visibility - only show public and member programs
      // (private and unlisted programs are not discoverable)
      if (profile.role !== 'super' && profile.role !== 'admin') {
        query = query.in('visibility', ['public', 'member']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setAllPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProgram = async (programId: string) => {
    const program = allPrograms.find(p => p.id === programId);
    if (!program) return;

    const success = await joinProgram(programId, program.name);
    if (success) {
      // Refresh programs to update member counts
      fetchPrograms();
    }
  };

  const myProgramIds = new Set(memberships.map(m => m.program_id));

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'innovation', label: 'Innovation' },
    { value: 'learning', label: 'Learning' },
    { value: 'startup', label: 'Startup' },
    { value: 'product', label: 'Product' },
    { value: 'community', label: 'Community' },
    { value: 'research', label: 'Research' },
  ];

  const enrollmentOptions = [
    { value: 'all', label: 'All Enrollment Status' },
    { value: 'open', label: 'Open Now' },
    { value: 'invite-only', label: 'Invite Only' },
    { value: 'closed', label: 'Closed' },
  ];

  const pricingOptions = [
    { value: 'all', label: 'All Pricing' },
    { value: 'free', label: 'Free' },
    { value: 'paid', label: 'Paid' },
    { value: 'members-only', label: 'Members Only' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'not-started', label: 'Upcoming' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const filterPrograms = (programs: ProgramInstance[]) => {
    return programs.filter((program) => {
      const matchesSearch =
        program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const template = PROGRAM_TEMPLATES.find(t => t.id === program.template_id);
      const matchesCategory =
        selectedCategory === 'all' || template?.category === selectedCategory;

      const matchesEnrollment =
        selectedEnrollment === 'all' || program.enrollment_status === selectedEnrollment;

      const matchesPricing =
        selectedPricing === 'all' || program.pricing_type === selectedPricing;

      const matchesStatus =
        selectedStatus === 'all' || program.status === selectedStatus;

      const matchesSubscribed =
        !showSubscribedOnly || myProgramIds.has(program.id);

      return matchesSearch && matchesCategory && matchesEnrollment && matchesPricing && matchesStatus && matchesSubscribed;
    });
  };

  const filteredPrograms = filterPrograms(allPrograms);

  if (loading || membershipsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Programs', href: '/programs' }, { label: 'Discover' }]} />
        
        {/* Header */}
        <div className="mb-8 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Discover Programs</h1>
            {profile && canManagePrograms(profile.role) && (
              <Button onClick={() => navigate('/programs/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Program
              </Button>
            )}
          </div>
          <p className="text-gray-600">
            Browse all available learning programs and cohorts
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Subscribed Only Filter */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="subscribed-filter" 
                  checked={showSubscribedOnly}
                  onCheckedChange={(checked) => setShowSubscribedOnly(!!checked)}
                />
                <Label htmlFor="subscribed-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  My Programs
                </Label>
              </div>

              {/* Category Filter */}
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Enrollment Filter */}
              <div>
                <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollmentOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Filter */}
              <div>
                <Select value={selectedPricing} onValueChange={setSelectedPricing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(searchQuery || selectedCategory !== 'all' || selectedEnrollment !== 'all' || selectedPricing !== 'all' || selectedStatus !== 'all') && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span>Filters active:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedEnrollment('all');
                    setSelectedPricing('all');
                    setSelectedStatus('all');
                    setShowSubscribedOnly(false);
                  }}
                  className="h-6 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredPrograms.length} {filteredPrograms.length === 1 ? 'program' : 'programs'}
          </p>
        </div>

        {/* Programs Grid */}
        {filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No programs found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedCategory !== 'all' || selectedEnrollment !== 'all' || selectedPricing !== 'all' || selectedStatus !== 'all' || showSubscribedOnly
                  ? 'Try adjusting your filters to see more results.'
                  : 'No programs available yet.'}
              </p>
              {profile && canManagePrograms(profile.role) ? (
                <Button onClick={() => navigate('/programs/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Program
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <ProgramDiscoverCard
                key={program.id}
                program={program}
                isMember={myProgramIds.has(program.id)}
                onJoin={handleJoinProgram}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}