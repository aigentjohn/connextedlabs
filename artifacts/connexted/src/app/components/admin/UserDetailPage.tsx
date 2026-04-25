import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldOff,
  UserCog,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Pause,
  Save,
  Edit,
  Users,
  Table as TableIcon,
  TrendingUp,
  Video,
  Presentation,
  Hammer,
  MessageSquare,
  Users2,
  FileText,
  Image as ImageIcon,
  Activity,
  Clock,
  AlertTriangle,
  Ban,
  Crown,
  Lock,
  CreditCard,
  Ticket,
  Package,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  templateApi, inventoryApi,
  type TicketTemplate, type InventoryItem,
  formatCents, expiryLabel, templateColor,
} from '@/services/ticketSystemService';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

type UserStatus = 'active' | 'suspended' | 'banned';

interface StatusHistory {
  status: UserStatus;
  changed_at: string;
  changed_by: string;
  reason?: string;
}

interface RoleHistory {
  role: 'admin' | 'member';
  changed_at: string;
  changed_by: string;
}

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedTagline, setEditedTagline] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedMembershipTier, setEditedMembershipTier] = useState('free');
  const [editedUserClass, setEditedUserClass] = useState(1);
  
  // User data
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [adminContainers, setAdminContainers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistory[]>([]);
  
  // User class definitions loaded from DB
  const [userClassDefs, setUserClassDefs] = useState<any[]>([]);

  // Dialogs
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    if ((profile?.role === 'admin' || profile?.role === 'super') && userId) {
      fetchUserDetails();
    }
  }, [profile, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!userData) {
        toast.error('User not found');
        navigate('/platform-admin/users');
        return;
      }

      setUser(userData);
      setEditedName(userData.name || '');
      setEditedEmail(userData.email || '');
      setEditedTagline(userData.tagline || '');
      setEditedLocation(userData.location || '');
      setEditedMembershipTier(userData.membership_tier || 'free');
      setEditedUserClass(userData.user_class || 1);
      setStatusHistory(userData.status_history || []);

      // Load user class definitions from DB (for display names in dropdowns)
      const { data: classData } = await supabase
        .from('user_classes')
        .select('class_number, display_name, description')
        .order('class_number', { ascending: true });
      if (classData && classData.length > 0) setUserClassDefs(classData);
      setRoleHistory(userData.role_history || []);

      // Fetch all containers to determine subscriptions and admin roles
      const [circlesData, tablesData, elevatorsData, meetingsData, pitchesData, buildsData, standupsData, meetupsData, postsData, documentsData] = await Promise.all([
        supabase.from('circles').select('*'),
        supabase.from('tables').select('*'),
        supabase.from('elevators').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('pitches').select('*'),
        supabase.from('builds').select('*'),
        supabase.from('standups').select('*'),
        supabase.from('meetups').select('*'),
        supabase.from('posts').select('*').eq('author_id', userId),
        supabase.from('documents').select('*').eq('uploaded_by', userId),
      ]);

      // Build subscriptions list
      const allSubscriptions: any[] = [];
      const allAdminContainers: any[] = [];

      const containerTypes = [
        { data: circlesData.data, type: 'circle', icon: Users },
        { data: tablesData.data, type: 'table', icon: TableIcon },
        { data: elevatorsData.data, type: 'elevator', icon: TrendingUp },
        { data: meetingsData.data, type: 'meeting', icon: Video },
        { data: pitchesData.data, type: 'pitch', icon: Presentation },
        { data: buildsData.data, type: 'build', icon: Hammer },
        { data: standupsData.data, type: 'standup', icon: MessageSquare },
        { data: meetupsData.data, type: 'meetup', icon: Users2 },
      ];

      containerTypes.forEach(({ data, type, icon }) => {
        (data || []).forEach((container: any) => {
          const isMember = container.member_ids?.includes(userId);
          const isAdmin = container.admin_ids?.includes(userId);
          
          if (isMember) {
            allSubscriptions.push({
              ...container,
              containerType: type,
              icon,
              isAdmin,
            });
          }
          
          if (isAdmin) {
            allAdminContainers.push({
              ...container,
              containerType: type,
              icon,
            });
          }
        });
      });

      setSubscriptions(allSubscriptions);
      setAdminContainers(allAdminContainers);
      setPosts(postsData.data || []);
      setDocuments(documentsData.data || []);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          name: editedName,
          email: editedEmail,
          tagline: editedTagline,
          location: editedLocation,
          membership_tier: editedMembershipTier,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditing(false);
      fetchUserDetails();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async () => {
    if (!user) return;
    
    const newRole = user.role === 'super' ? 'member' : 'super';
    
    try {
      // Update role history
      const newRoleHistory = [
        ...(roleHistory || []),
        {
          role: newRole,
          changed_at: new Date().toISOString(),
          changed_by: profile?.id || 'unknown',
        },
      ];

      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: userId,
        new_role: newRole,
      });

      if (error) throw error;

      // Best-effort update of role_history audit log
      await supabase.from('users').update({ role_history: newRoleHistory }).eq('id', userId);

      toast.success(`User role updated to ${newRole}`);
      fetchUserDetails();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleChangeStatus = async (newStatus: UserStatus, reason?: string) => {
    if (!user) return;
    
    try {
      // Update status history
      const newStatusHistory = [
        ...(statusHistory || []),
        {
          status: newStatus,
          changed_at: new Date().toISOString(),
          changed_by: profile?.id || 'unknown',
          reason,
        },
      ];

      const { error } = await supabase
        .from('users')
        .update({ 
          status: newStatus,
          status_history: newStatusHistory,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      setSuspendDialogOpen(false);
      setBanDialogOpen(false);
      setSuspendReason('');
      setBanReason('');
      fetchUserDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleRemoveFromContainer = async (containerId: string, containerType: string) => {
    try {
      const tableName = containerType + 's';
      
      // Fetch container
      const { data: container, error: fetchError } = await supabase
        .from(tableName)
        .select('member_ids, admin_ids')
        .eq('id', containerId)
        .single();

      if (fetchError) throw fetchError;

      // Remove user from member_ids and admin_ids
      const updatedMemberIds = (container.member_ids || []).filter((id: string) => id !== userId);
      const updatedAdminIds = (container.admin_ids || []).filter((id: string) => id !== userId);

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          member_ids: updatedMemberIds,
          admin_ids: updatedAdminIds,
        })
        .eq('id', containerId);

      if (updateError) throw updateError;

      toast.success('User removed from container');
      fetchUserDetails();
    } catch (error) {
      console.error('Error removing from container:', error);
      toast.error('Failed to remove user from container');
    }
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  const isCurrentUser = user.id === profile.id;
  const userStatus: UserStatus = user.status || 'active';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'User Management', path: '/platform-admin/users' },
          { label: user.name }
        ]} 
      />

      {/* User Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  {user.role === 'super' && (
                    <Badge variant="default">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {isCurrentUser && (
                    <Badge variant="outline">You</Badge>
                  )}
                  {userStatus === 'suspended' && (
                    <Badge variant="destructive">
                      <Pause className="w-3 h-3 mr-1" />
                      Suspended
                    </Badge>
                  )}
                  {userStatus === 'banned' && (
                    <Badge variant="destructive">
                      <Ban className="w-3 h-3 mr-1" />
                      Banned
                    </Badge>
                  )}
                  {userStatus === 'active' && (
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {user.email}
                  </div>
                  {user.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {user.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Crown className="w-4 h-4 mr-1" />
                    Class {user.user_class || 1}
                  </div>
                </div>

                {user.tagline && (
                  <p className="text-gray-700 mb-3">{user.tagline}</p>
                )}

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-blue-50 px-3 py-1.5 rounded">
                    <span className="text-blue-900 font-medium">{subscriptions.length}</span>
                    <span className="text-blue-700 ml-1">subscriptions</span>
                  </div>
                  <div className="bg-purple-50 px-3 py-1.5 rounded">
                    <span className="text-purple-900 font-medium">{adminContainers.length}</span>
                    <span className="text-purple-700 ml-1">admin roles</span>
                  </div>
                  <div className="bg-green-50 px-3 py-1.5 rounded">
                    <span className="text-green-900 font-medium">{posts.length}</span>
                    <span className="text-green-700 ml-1">posts</span>
                  </div>
                  <div className="bg-orange-50 px-3 py-1.5 rounded">
                    <span className="text-orange-900 font-medium">{documents.length}</span>
                    <span className="text-orange-700 ml-1">documents</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">
            <UserCog className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="w-4 h-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Users className="w-4 h-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <ShieldAlert className="w-4 h-4 mr-2" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <AdminUserTicketsPanel userId={userId!} userName={user.name} userEmail={user.email} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Manage user profile and settings</CardDescription>
                </div>
                {!editing && (
                  <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={editedTagline}
                      onChange={(e) => setEditedTagline(e.target.value)}
                      placeholder="Professional tagline"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      placeholder="City, State/Country"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="membership_tier">Billing Tier</Label>
                    <Select value={editedMembershipTier} onValueChange={setEditedMembershipTier}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">Controls pathway/course/program access only — not platform features</p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditing(false);
                        setEditedName(user.name);
                        setEditedEmail(user.email);
                        setEditedTagline(user.tagline || '');
                        setEditedLocation(user.location || '');
                        setEditedMembershipTier(user.membership_tier || 'free');
                      }} 
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Tagline:</span>
                    <span className="font-medium">{user.tagline || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{user.location || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Billing Tier:</span>
                    <Badge variant="outline">{user.membership_tier || 'free'}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs">{user.id}</span>
                  </div>
                  {user.settings?.temp_password && (
                    <div className="flex justify-between py-2 border-b bg-yellow-50 px-3 -mx-3">
                      <span className="text-gray-600">🔑 Temp Password:</span>
                      <span className="font-mono text-xs font-medium text-orange-600">{user.settings.temp_password}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Temp Password Alert */}
          {user.settings?.temp_password && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Shield className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900 mb-1">🔐 Temporary Password Active</p>
                    <div className="text-yellow-700 space-y-1">
                      <p className="text-xs">This user was imported via CSV and has a temporary password: <span className="font-mono font-bold bg-yellow-100 px-2 py-0.5 rounded">{user.settings.temp_password}</span></p>
                      <p className="text-xs mt-2">The user can log in with this password. Recommend they change it after first login.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Management */}
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Manage user's platform role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Current Role: {user.role}</p>
                  <p className="text-sm text-gray-600">
                    {user.role === 'admin' ? 'Full platform administration access' : 'Standard member access'}
                  </p>
                </div>
                <Button
                  onClick={handleToggleRole}
                  variant={user.role === 'super' ? 'destructive' : 'default'}
                  disabled={isCurrentUser}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  {user.role === 'super' ? 'Demote to Member' : 'Promote to Admin'}
                </Button>
              </div>
              {isCurrentUser && (
                <p className="text-sm text-gray-500 mt-2">You cannot change your own role</p>
              )}
            </CardContent>
          </Card>

          {/* User Class Management */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Access Level
              </CardTitle>
              <CardDescription>
                User class (1–10) and its display name — controls circles, containers, and content access. Independent of billing tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  {(() => {
                    const currentDef = userClassDefs.find(c => c.class_number === (user.user_class || 1));
                    return (
                      <>
                        <p className="font-medium">
                          {currentDef ? currentDef.display_name : `Class ${user.user_class || 1}`}
                        </p>
                        {currentDef?.description && (
                          <p className="text-sm text-gray-600">{currentDef.description}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <Select
                  value={(user.user_class || 1).toString()}
                  onValueChange={async (value) => {
                    try {
                      const { error } = await supabase.rpc('admin_update_user', {
                        target_user_id: userId,
                        new_user_class: parseInt(value),
                      });
                      if (error) throw error;
                      const def = userClassDefs.find(c => c.class_number === parseInt(value));
                      toast.success(`User class updated to ${def?.display_name ?? `Class ${value}`}`);
                      fetchUserDetails();
                    } catch (error) {
                      console.error('Error updating user class:', error);
                      toast.error('Failed to update user class');
                    }
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userClassDefs.length > 0
                      ? userClassDefs.map((uc: any) => (
                          <SelectItem key={uc.class_number} value={uc.class_number.toString()}>
                            {uc.class_number} — {uc.display_name}
                          </SelectItem>
                        ))
                      : Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Class {i + 1}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="mb-1"><strong>Billing Tier:</strong> <Badge variant="outline" className="ml-2">{user.membership_tier || 'free'}</Badge></p>
                <p className="text-xs text-gray-500 mt-1">User class upgrades are applied via tickets. Billing tier controls pathway/course/program access only.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Container Subscriptions ({subscriptions.length})</CardTitle>
              <CardDescription>All containers this user is a member of</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No subscriptions</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="capitalize">{sub.containerType}</span>
                              {sub.isAdmin && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromContainer(sub.id, sub.containerType)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Containers ({adminContainers.length})</CardTitle>
              <CardDescription>Containers where user has admin privileges</CardDescription>
            </CardHeader>
            <CardContent>
              {adminContainers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No admin roles</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adminContainers.map((container) => {
                    const Icon = container.icon;
                    return (
                      <div 
                        key={container.id}
                        className="flex items-center gap-3 p-4 border rounded-lg bg-purple-50"
                      >
                        <Icon className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-purple-900">{container.name}</p>
                          <p className="text-sm text-purple-700 capitalize">{container.containerType}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Posts ({posts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No posts</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {posts.slice(0, 10).map((post) => (
                      <div key={post.id} className="p-3 border rounded text-sm">
                        <p className="font-medium line-clamp-2">{post.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {posts.length > 10 && (
                      <p className="text-xs text-gray-500 text-center">
                        And {posts.length - 10} more...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No documents</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {documents.slice(0, 10).map((doc) => (
                      <div key={doc.id} className="p-3 border rounded text-sm">
                        <p className="font-medium line-clamp-1">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {documents.length > 10 && (
                      <p className="text-xs text-gray-500 text-center">
                        And {documents.length - 10} more...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Manage user account status and restrictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                {userStatus === 'active' && <CheckCircle className="w-8 h-8 text-green-600" />}
                {userStatus === 'suspended' && <Pause className="w-8 h-8 text-orange-600" />}
                {userStatus === 'banned' && <Ban className="w-8 h-8 text-red-600" />}
                <div>
                  <p className="font-medium text-lg">Status: {userStatus}</p>
                  <p className="text-sm text-gray-600">
                    {userStatus === 'active' && 'User has full access to the platform'}
                    {userStatus === 'suspended' && 'User access is temporarily restricted'}
                    {userStatus === 'banned' && 'User is permanently banned from the platform'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {userStatus !== 'active' && (
                  <Button 
                    onClick={() => handleChangeStatus('active')}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate Account
                  </Button>
                )}
                
                {userStatus !== 'suspended' && (
                  <Button 
                    onClick={() => setSuspendDialogOpen(true)}
                    variant="outline"
                    className="border-orange-500 text-orange-700 hover:bg-orange-50"
                    disabled={isCurrentUser}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Suspend User
                  </Button>
                )}
                
                {userStatus !== 'banned' && (
                  <Button 
                    onClick={() => setBanDialogOpen(true)}
                    variant="destructive"
                    disabled={isCurrentUser}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Ban User
                  </Button>
                )}
              </div>

              {isCurrentUser && (
                <p className="text-sm text-gray-500 text-center">
                  You cannot change your own account status
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
              <CardDescription>Track all status changes</CardDescription>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No status changes recorded</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.status === 'active' ? 'default' : 'destructive'}>
                            {entry.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(entry.changed_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-gray-700 mt-1">Reason: {entry.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role History</CardTitle>
              <CardDescription>Track all role changes</CardDescription>
            </CardHeader>
            <CardContent>
              {roleHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No role changes recorded</p>
              ) : (
                <div className="space-y-3">
                  {roleHistory.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.role === 'admin' ? 'default' : 'outline'}>
                            {entry.role}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(entry.changed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User</AlertDialogTitle>
            <AlertDialogDescription>
              This will temporarily restrict the user's access to the platform. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleChangeStatus('suspended', suspendReason)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently ban the user from the platform. This is a severe action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason (required)</Label>
            <Textarea
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason for ban..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleChangeStatus('banned', banReason)}
              disabled={!banReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Admin User Tickets Panel ─────────────────────────────────────────────────

function AdminUserTicketsPanel({
  userId, userName, userEmail,
}: { userId: string; userName: string; userEmail: string }) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);

  // Issue form
  const [issueTemplateId, setIssueTemplateId] = useState('');
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [issuePrice, setIssuePrice] = useState('');
  const [issueRef, setIssueRef] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadingItems(true);
      const [{ items }, { templates: tmpl }] = await Promise.all([
        inventoryApi.listForUser(userId),
        templateApi.list(),
      ]);
      setInventoryItems(items);
      setTemplates(tmpl.filter(t => t.status !== 'archived'));
    } catch (err: any) {
      console.error('Error loading user tickets:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Load available inventory when template is selected
  useEffect(() => {
    if (!issueTemplateId) { setAvailableItems([]); return; }
    setLoadingAvail(true);
    inventoryApi.listByTemplate(issueTemplateId)
      .then(({ items }) => {
        setAvailableItems(items.filter(i => i.status === 'available'));
        const tmpl = templates.find(t => t.id === issueTemplateId);
        if (tmpl) setIssuePrice(String(tmpl.faceValueCents));
      })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [issueTemplateId, templates]);

  const handleIssue = async () => {
    if (!issueTemplateId || availableItems.length === 0) {
      toast.error('Select a template with available inventory');
      return;
    }
    try {
      setIssuing(true);
      const item = availableItems[0];
      await inventoryApi.assign(item.id, {
        userId,
        pricePaidCents: issuePrice !== '' ? Number(issuePrice) : undefined,
        paymentReference: issueRef || undefined,
        notes: issueNotes || undefined,
      });
      toast.success(`Ticket ${item.serialNumber} issued to ${userName}`);
      setIssueOpen(false);
      setIssueTemplateId('');
      setIssuePrice('');
      setIssueRef('');
      setIssueNotes('');
      load();
    } catch (err: any) {
      toast.error(`Failed to issue ticket: ${err.message}`);
    } finally {
      setIssuing(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === issueTemplateId);

  if (loadingItems) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Access Tickets
              </CardTitle>
              <CardDescription>
                Inventory tickets assigned to {userName}
              </CardDescription>
            </div>
            <Button onClick={() => setIssueOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Issue Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets assigned to this user yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryItems.map(item => {
                const colors = templateColor('indigo');
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded ${colors.bg} flex items-center justify-center`}>
                        <Ticket className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.templateName}</div>
                        <div className="text-xs font-mono text-gray-500">{item.serialNumber}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">
                        {item.pricePaidCents != null ? formatCents(item.pricePaidCents) : '—'}
                      </div>
                      <div className="text-gray-400">
                        {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : ''}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-0.5 ${
                          item.status === 'assigned' ? 'border-blue-300 text-blue-700' :
                          item.status === 'voided' ? 'border-gray-300 text-gray-500' : ''
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Ticket Dialog */}
      {issueOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Issue Ticket to {userName}
              </h3>
              <button onClick={() => setIssueOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Ticket Template</Label>
                <Select value={issueTemplateId} onValueChange={setIssueTemplateId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.faceValueCents ? formatCents(t.faceValueCents) : 'Free'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {issueTemplateId && (
                <>
                  {loadingAvail ? (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking inventory…
                    </div>
                  ) : availableItems.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
                      No available inventory. Create a batch in{' '}
                      <a href="/platform-admin/ticket-inventory" className="underline" target="_blank">Ticket Inventory</a>.
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                      Will assign: <span className="font-mono font-bold">{availableItems[0].serialNumber}</span>
                      {' '}({availableItems.length} available)
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Price Paid (cents)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={issuePrice}
                        onChange={e => setIssuePrice(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                        placeholder={selectedTemplate ? String(selectedTemplate.faceValueCents) : '0'}
                      />
                      {selectedTemplate && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Face: {formatCents(selectedTemplate.faceValueCents)}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Payment Reference</Label>
                      <Input
                        value={issueRef}
                        onChange={e => setIssueRef(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                        placeholder="Invoice / ref #"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={issueNotes}
                      onChange={e => setIssueNotes(e.target.value)}
                      className="mt-0.5 h-8 text-sm"
                      placeholder="Optional internal note"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleIssue}
                disabled={issuing || !issueTemplateId || availableItems.length === 0}
                className="flex-1"
              >
                {issuing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Issue Ticket
              </Button>
              <Button variant="outline" onClick={() => setIssueOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

