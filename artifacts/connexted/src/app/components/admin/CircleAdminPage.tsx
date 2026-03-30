import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Users, 
  Settings, 
  Activity, 
  Plus,
  TrendingUp,
  Shield,
  Calendar,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  ChevronRight,
  Eye,
  Loader2
} from 'lucide-react';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface Circle {
  id: string;
  name: string;
  description: string;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
  created_at: string;
  image: string | null;
}

interface UserClass {
  class_number: number;
  display_name: string;
  max_admin_circles: number;
  max_admin_containers: number;
  max_member_containers: number;
}

interface MembershipStats {
  invited: number;
  applied: number;
  approved: number;
  enrolled: number;
  completed: number;
  not_completed: number;
}

export default function CircleAdminPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [userClass, setUserClass] = useState<UserClass | null>(null);
  const [membershipStats, setMembershipStats] = useState<Record<string, MembershipStats>>({});
  const [totalStats, setTotalStats] = useState({
    totalMembers: 0,
    recentActivity: 0,
    activeCircles: 0
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    longDescription: '',
    image: '',
    accessType: 'open' as 'open' | 'request' | 'invite',
  });

  useEffect(() => {
    if (profile) {
      fetchCircleAdminData();
    }
  }, [profile]);

  const fetchCircleAdminData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const isPlatformAdmin = profile.role === 'super';

      // Fetch user's class limits
      const userClassNumber = (profile as any).user_class || 1;
      const { data: userClassData } = await supabase
        .from('user_classes')
        .select('*')
        .eq('class_number', userClassNumber)
        .single();

      setUserClass(userClassData);

      // Fetch circles where user is admin or creator
      const { data: circlesData, error } = await supabase
        .from('circles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredCircles = isPlatformAdmin 
        ? circlesData || []
        : (circlesData || []).filter((c: Circle) => 
            c.admin_ids?.includes(profile.id)
          );

      setMyCircles(filteredCircles);

      // Calculate total stats
      const allMemberIds = new Set<string>();
      filteredCircles.forEach((circle: Circle) => {
        (circle.member_ids || []).forEach((id: string) => allMemberIds.add(id));
      });

      // Count active circles (those with recent activity)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let activeCircles = 0;
      let recentActivity = 0;

      // Count recent posts in my circles
      if (filteredCircles.length > 0) {
        const circleIds = filteredCircles.map((c: Circle) => c.id);
        
        const { count: postsCount } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .in('circle_id', circleIds)
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        recentActivity = postsCount || 0;

        // Count active circles (circles with at least one post in last 30 days)
        const { data: activeCircleData } = await supabase
          .from('posts')
          .select('circle_id')
          .in('circle_id', circleIds)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const activeCircleIds = new Set(activeCircleData?.map(p => p.circle_id) || []);
        activeCircles = activeCircleIds.size;
      }

      setTotalStats({
        totalMembers: allMemberIds.size,
        recentActivity,
        activeCircles
      });

      // Fetch membership state stats for each circle
      const statsMap: Record<string, MembershipStats> = {};
      
      for (const circle of filteredCircles) {
        try {
          const { data: participants } = await supabase
            .from('circle_participants')
            .select('member_state')
            .eq('circle_id', circle.id);

          const stats: MembershipStats = {
            invited: 0,
            applied: 0,
            approved: 0,
            enrolled: 0,
            completed: 0,
            not_completed: 0
          };

          (participants || []).forEach((p: any) => {
            const state = p.member_state;
            if (state in stats) {
              stats[state as keyof MembershipStats]++;
            }
          });

          statsMap[circle.id] = stats;
        } catch (error) {
          console.log('Error fetching participant stats for circle', circle.id, error);
          // Set default stats if table doesn't exist or error occurs
          statsMap[circle.id] = {
            invited: 0,
            applied: 0,
            approved: 0,
            enrolled: 0,
            completed: 0,
            not_completed: 0
          };
        }
      }

      setMembershipStats(statsMap);

    } catch (error) {
      console.error('Error fetching circle admin data:', error);
      toast.error('Failed to load circle admin data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCircles = myCircles.filter(circle =>
    circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    circle.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreateMoreCircles = () => {
    if (profile?.role === 'super') return true;
    if (!userClass) return false;
    
    // Count circles where user is an admin (admin_ids contains user)
    const circlesAdministeredByUser = myCircles.filter(c => c.admin_ids?.includes(profile?.id || '')).length;
    return circlesAdministeredByUser < userClass.max_admin_circles;
  };

  const getAccessTypeBadge = (accessType: string) => {
    const badges = {
      open: <Badge className="bg-green-100 text-green-800 border-green-200">Open</Badge>,
      request: <Badge className="bg-blue-100 text-blue-800 border-blue-200">Request</Badge>,
      invite: <Badge className="bg-purple-100 text-purple-800 border-purple-200">Invite</Badge>
    };
    return badges[accessType as keyof typeof badges] || null;
  };

  const handleCreateCircle = async () => {
    if (!profile) return;

    if (!createForm.name.trim() || !createForm.description.trim()) {
      toast.error('Please fill in circle name and description');
      return;
    }

    try {
      setCreating(true);

      // Generate a URL-safe slug from the name, with a short random suffix for uniqueness
      const baseSlug = createForm.name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = baseSlug + '-' + Math.random().toString(36).substring(2, 8);

      const defaultGuestAccess = {
        feed: false,
        members: false,
        documents: false,
        forum: false,
        checklists: false,
        reviews: false,
        calendar: false,
      };

      const { data: newCircle, error: circleError } = await supabase
        .from('circles')
        .insert({
          community_id: (profile as any).community_id,
          name: createForm.name.trim(),
          slug: slug,
          description: createForm.description.trim(),
          long_description: createForm.longDescription.trim() || null,
          image: createForm.image.trim() || null,
          access_type: createForm.accessType,
          is_open_circle: createForm.accessType === 'open',
          admin_ids: [profile.id],
          member_ids: [profile.id],
          moderator_ids: [],
          guest_access: defaultGuestAccess,
          created_by: profile.id,
        })
        .select()
        .single();

      if (circleError) {
        console.error('Circle creation error:', circleError);
        throw circleError;
      }

      toast.success('Circle created successfully!');

      // Reset form and close dialog
      setShowCreateDialog(false);
      setCreateForm({
        name: '',
        description: '',
        longDescription: '',
        image: '',
        accessType: 'open',
      });

      // Refresh the circles list
      await fetchCircleAdminData();
    } catch (error: any) {
      console.error('Error creating circle:', error);
      toast.error('Failed to create circle: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading circle admin...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in</p>
      </div>
    );
  }

  // Check if user has admin access
  const hasAdminAccess = profile.role === 'super' || myCircles.length > 0;

  if (!hasAdminAccess) {
    return (
      <div className="p-8">
        <Breadcrumbs items={[{ label: 'Circle Admin' }]} />
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Circle Admin</CardTitle>
            <CardDescription>You don't have admin access to any circles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              To get admin access, you need to be assigned as an admin by a circle creator or platform admin.
            </p>
            <Link to="/circles">
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Browse Circles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const circlesAdministeredByUser = myCircles.filter(c => c.admin_ids?.includes(profile.id)).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Breadcrumbs items={[{ label: 'Circle Admin' }]} />

      {/* Header */}
      <div className="mt-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Circle Admin</h1>
            <p className="text-gray-600 mt-1">Manage circles where you have admin access</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/circles">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Browse All Circles
              </Button>
            </Link>
            {canCreateMoreCircles() ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Circle
              </Button>
            ) : (
              <Button disabled>
                <Plus className="w-4 h-4 mr-2" />
                Create Circle (Limit Reached)
              </Button>
            )}
          </div>
        </div>

        {/* User Class Info */}
        {userClass && (
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">
                      {userClass.display_name} - Circle Creation Limit
                    </p>
                    <p className="text-sm text-indigo-700">
                      You have created <strong>{circlesAdministeredByUser}</strong> of <strong>{userClass.max_admin_circles}</strong> allowed circles
                    </p>
                  </div>
                </div>
                {circlesAdministeredByUser >= userClass.max_admin_circles && profile.role !== 'super' && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    Limit Reached
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Circles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myCircles.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {circlesAdministeredByUser} created by you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.totalMembers}</div>
            <p className="text-xs text-gray-500 mt-1">Across all circles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Active Circles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalStats.activeCircles}</div>
            <p className="text-xs text-gray-500 mt-1">With activity (30 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.recentActivity}</div>
            <p className="text-xs text-gray-500 mt-1">Posts (30 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search circles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Circles List */}
      <div className="space-y-4">
        {filteredCircles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No circles match your search' : 'No circles found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCircles.map((circle) => {
            const stats = membershipStats[circle.id] || {
              invited: 0,
              applied: 0,
              approved: 0,
              enrolled: 0,
              completed: 0,
              not_completed: 0
            };
            const isAdmin = circle.admin_ids?.includes(profile.id);

            return (
              <Card key={circle.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{circle.name}</h3>
                        {getAccessTypeBadge(circle.access_type)}
                        {isAdmin && (
                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{circle.description}</p>
                      
                      {/* Membership State Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-600">Invited:</span>
                          <span className="font-medium">{stats.invited}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-4 h-4 text-purple-600" />
                          <span className="text-gray-600">Applied:</span>
                          <span className="font-medium">{stats.applied}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="text-gray-600">Approved:</span>
                          <span className="font-medium">{stats.approved}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                          <span className="text-gray-600">Enrolled:</span>
                          <span className="font-medium">{stats.enrolled}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium">{stats.completed}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Link to={`/admin/circles/${circle.id}`}>
                        <Button size="sm">
                          <Users className="w-4 h-4 mr-2" />
                          Manage Members
                        </Button>
                      </Link>
                      <Link to={`/circles/${circle.id}/settings`}>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </Link>
                      <Link to={`/circles/${circle.id}`}>
                        <Button size="sm" variant="ghost">
                          View Circle
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{circle.member_ids?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {new Date(circle.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Circle Dialog */}
      {showCreateDialog && (
        <CreateCircleDialog
          profile={profile}
          creating={creating}
          createForm={createForm}
          setCreateForm={setCreateForm}
          onClose={() => {
            setShowCreateDialog(false);
            setCreateForm({
              name: '',
              description: '',
              longDescription: '',
              image: '',
              accessType: 'open',
            });
          }}
          onSubmit={handleCreateCircle}
        />
      )}
    </div>
  );
}

function CreateCircleDialog({
  profile,
  creating,
  createForm,
  setCreateForm,
  onClose,
  onSubmit,
}: {
  profile: any;
  creating: boolean;
  createForm: {
    name: string;
    description: string;
    longDescription: string;
    image: string;
    accessType: 'open' | 'request' | 'invite';
  };
  setCreateForm: (form: any) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Circle</CardTitle>
          <CardDescription>
            Create a new circle. You'll be set as the creator and admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="create-name">Circle Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Web Development"
                required
              />
            </div>

            <div>
              <Label htmlFor="create-description">Short Description *</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description for circle cards"
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="create-longDescription">Full Description</Label>
              <Textarea
                id="create-longDescription"
                value={createForm.longDescription}
                onChange={(e) => setCreateForm({ ...createForm, longDescription: e.target.value })}
                placeholder="Detailed description shown on the circle page"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="create-image">Cover Image URL</Label>
              <Input
                id="create-image"
                type="url"
                value={createForm.image}
                onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="create-accessType">Access Type *</Label>
              <Select
                value={createForm.accessType}
                onValueChange={(value: 'open' | 'request' | 'invite') =>
                  setCreateForm({ ...createForm, accessType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open - Anyone can join</SelectItem>
                  <SelectItem value="request">Request - Must request to join</SelectItem>
                  <SelectItem value="invite">Invite Only - Admin must invite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Circle
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}