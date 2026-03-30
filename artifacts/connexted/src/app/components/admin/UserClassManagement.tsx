import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Save, RotateCcw, Shield, Users, Settings, Eye, X, DollarSign, Info } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface UserClass {
  class_number: number;
  display_name: string;
  max_admin_circles: number;
  max_admin_containers: number;
  max_member_containers: number;
  description: string;
  is_default: boolean;
  member_count?: number;
}

interface UserInClass {
  id: string;
  name: string;
  email: string;
  user_class: number;
  membership_tier: string;
  created_at: string;
}

interface ClassDistribution {
  class_number: number;
  count: number;
  free_count: number;
  member_count: number;
  premium_count: number;
}

export default function UserClassManagement() {
  const { profile } = useAuth();
  const [userClasses, setUserClasses] = useState<UserClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewingClass, setViewingClass] = useState<number | null>(null);
  const [classMembers, setClassMembers] = useState<UserInClass[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchUserClasses();
      fetchDistribution();
    }
  }, [profile]);

  const fetchUserClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_classes')
        .select('*')
        .order('class_number', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize default classes if none exist
        const defaultClasses = initializeDefaultClasses();
        setUserClasses(defaultClasses);
      } else {
        setUserClasses(data);
      }
    } catch (error) {
      console.error('Error fetching user classes:', error);
      // If table doesn't exist, initialize with defaults
      const defaultClasses = initializeDefaultClasses();
      setUserClasses(defaultClasses);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_class, membership_tier');

      if (error) {
        // If user_class column doesn't exist, show all users in default class
        console.warn('user_class column may not exist:', error);
        
        // Fetch just the count of users for now
        const { data: usersData, error: countError } = await supabase
          .from('users')
          .select('id, membership_tier');
        
        if (countError) throw countError;
        
        // Put all users in the default class (Class 1) for now
        const dist: { [key: number]: ClassDistribution } = {};
        
        for (let i = 1; i <= 10; i++) {
          dist[i] = {
            class_number: i,
            count: i === 1 ? (usersData?.length || 0) : 0,
            free_count: i === 1 ? usersData?.filter((u: any) => u.membership_tier === 'free').length || 0 : 0,
            member_count: i === 1 ? usersData?.filter((u: any) => u.membership_tier === 'member').length || 0 : 0,
            premium_count: i === 1 ? usersData?.filter((u: any) => u.membership_tier === 'premium').length || 0 : 0,
          };
        }

        setDistribution(Object.values(dist));
        
        // Update user classes with member counts
        setUserClasses(prev => prev.map(uc => ({
          ...uc,
          member_count: dist[uc.class_number]?.count || 0
        })));
        
        return;
      }

      // Calculate distribution
      const dist: { [key: number]: ClassDistribution } = {};
      
      for (let i = 1; i <= 10; i++) {
        dist[i] = {
          class_number: i,
          count: 0,
          free_count: 0,
          member_count: 0,
          premium_count: 0
        };
      }

      data?.forEach((user: any) => {
        const classNum = user.user_class || 1;
        if (dist[classNum]) {
          dist[classNum].count++;
          if (user.membership_tier === 'free') dist[classNum].free_count++;
          else if (user.membership_tier === 'member') dist[classNum].member_count++;
          else if (user.membership_tier === 'premium') dist[classNum].premium_count++;
        }
      });

      setDistribution(Object.values(dist));
      
      // Update user classes with member counts
      setUserClasses(prev => prev.map(uc => ({
        ...uc,
        member_count: dist[uc.class_number]?.count || 0
      })));
    } catch (error) {
      console.error('Error fetching distribution:', error);
      // Initialize with empty distribution
      const dist: ClassDistribution[] = [];
      for (let i = 1; i <= 10; i++) {
        dist.push({
          class_number: i,
          count: 0,
          free_count: 0,
          member_count: 0,
          premium_count: 0
        });
      }
      setDistribution(dist);
    }
  };

  const initializeDefaultClasses = (): UserClass[] => {
    return [
      { class_number: 1, display_name: 'Class 1 - Starter', max_admin_circles: 0, max_admin_containers: 1, max_member_containers: 5, description: 'Limited participation', is_default: true },
      { class_number: 2, display_name: 'Class 2 - Basic', max_admin_circles: 0, max_admin_containers: 2, max_member_containers: 10, description: 'Light container admin', is_default: false },
      { class_number: 3, display_name: 'Class 3 - Standard', max_admin_circles: 1, max_admin_containers: 3, max_member_containers: 15, description: 'One circle + containers', is_default: false },
      { class_number: 4, display_name: 'Class 4 - Plus', max_admin_circles: 1, max_admin_containers: 5, max_member_containers: 20, description: 'Moderate capacity', is_default: false },
      { class_number: 5, display_name: 'Class 5 - Advanced', max_admin_circles: 2, max_admin_containers: 10, max_member_containers: 30, description: 'Multiple circles', is_default: false },
      { class_number: 6, display_name: 'Class 6 - Pro', max_admin_circles: 3, max_admin_containers: 15, max_member_containers: 40, description: 'Professional level', is_default: false },
      { class_number: 7, display_name: 'Class 7 - Expert', max_admin_circles: 5, max_admin_containers: 25, max_member_containers: 50, description: 'High capacity', is_default: false },
      { class_number: 8, display_name: 'Class 8 - Enterprise', max_admin_circles: 10, max_admin_containers: 50, max_member_containers: 75, description: 'Large scale', is_default: false },
      { class_number: 9, display_name: 'Class 9 - Executive', max_admin_circles: 20, max_admin_containers: 100, max_member_containers: 100, description: 'Very high capacity', is_default: false },
      { class_number: 10, display_name: 'Class 10 - Unlimited', max_admin_circles: -1, max_admin_containers: -1, max_member_containers: -1, description: 'No limits', is_default: false },
    ];
  };

  const handleClassChange = (classNumber: number, field: keyof UserClass, value: string | number | boolean) => {
    setUserClasses(prev => 
      prev.map(uc => 
        uc.class_number === classNumber 
          ? { ...uc, [field]: value }
          : field === 'is_default' && value === true 
            ? { ...uc, is_default: false } // Unset other defaults
            : uc
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete all existing classes
      const { error: deleteError } = await supabase
        .from('user_classes')
        .delete()
        .neq('class_number', 0); // Delete all

      // Insert new classes
      const { error: insertError } = await supabase
        .from('user_classes')
        .insert(userClasses.map(({ member_count, ...rest }) => rest)); // Remove member_count before saving

      if (deleteError && !deleteError.message.includes('0 rows')) throw deleteError;
      if (insertError) throw insertError;

      toast.success('User classes saved successfully');
      setHasChanges(false);
      fetchUserClasses();
      fetchDistribution();
    } catch (error) {
      console.error('Error saving user classes:', error);
      toast.error('Failed to save user classes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default values? This will discard all changes.')) {
      fetchUserClasses();
      setHasChanges(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset all classes to default configuration?')) {
      const defaultClasses = initializeDefaultClasses();
      setUserClasses(defaultClasses);
      setHasChanges(true);
    }
  };

  const handleViewMembers = async (classNumber: number) => {
    setViewingClass(classNumber);
    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, user_class, membership_tier, created_at')
        .eq('user_class', classNumber)
        .order('name');

      if (error) {
        // If user_class column doesn't exist yet, show all users for Class 1
        if (classNumber === 1) {
          const { data: allUsers, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, membership_tier, created_at')
            .order('name');
          
          if (usersError) throw usersError;
          
          setClassMembers((allUsers || []).map((u: any) => ({ ...u, user_class: 1 })));
        } else {
          setClassMembers([]);
        }
        return;
      }

      setClassMembers(data || []);
    } catch (error) {
      console.error('Error fetching class members:', error);
      toast.error('Failed to fetch class members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const getMembershipBadge = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <Badge className="bg-yellow-500 text-white">Premium</Badge>;
      case 'member':
        return <Badge className="bg-blue-500 text-white">Member</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">You need platform admin access to manage user classes</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const totalUsers = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'User Class Management' }
        ]} 
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">User Class Management</h1>
          <p className="text-gray-600">Configure container capacity limits for each user class (1-10)</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard Changes
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">Understanding User Classes vs Membership Tiers</h3>
              
              <div className="space-y-3 text-sm">
                <div className="bg-white rounded p-3 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-1">User Classes (Container Capacity)</h4>
                  <p className="text-blue-800">
                    Classes 1-10 control <strong>HOW MANY</strong> containers users can manage. This is about capacity and activity level, not payment.
                  </p>
                </div>
                
                <div className="bg-white rounded p-3 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-1">Membership Tiers (Payment Status)</h4>
                  <p className="text-blue-800">
                    Free/Member/Premium shows <strong>PAYMENT STATUS</strong>. This is about billing and what they've paid for.
                  </p>
                </div>
                
                <div className="bg-white rounded p-3 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-1">Circle Management is Special</h4>
                  <p className="text-blue-800">
                    Circles are full communities with governance. They're tracked separately from lighter containers (Tables, Elevators, Meetings, etc.).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Distribution Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Class Distribution by Payment Status
          </CardTitle>
          <CardDescription>See how users are distributed across capacity classes and their billing tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {userClasses.map((userClass) => {
              const dist = distribution.find(d => d.class_number === userClass.class_number);
              const count = dist?.count || 0;
              const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0.0';
              
              return (
                <div key={userClass.class_number} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      Class {userClass.class_number}
                    </Badge>
                    {userClass.is_default && (
                      <Badge className="text-xs bg-green-500">Default</Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-1">{userClass.display_name}</h4>
                  <p className="text-2xl font-bold mb-1">{count}</p>
                  <p className="text-xs text-gray-600 mb-3">{percentage}% of users</p>
                  
                  {count > 0 && dist && (
                    <div className="space-y-1 mb-3">
                      {dist.free_count > 0 && (
                        <div className="text-xs flex items-center justify-between">
                          <span className="text-gray-600">Free:</span>
                          <span className="font-medium">{dist.free_count}</span>
                        </div>
                      )}
                      {dist.member_count > 0 && (
                        <div className="text-xs flex items-center justify-between">
                          <span className="text-blue-600">Paid Member:</span>
                          <span className="font-medium">{dist.member_count}</span>
                        </div>
                      )}
                      {dist.premium_count > 0 && (
                        <div className="text-xs flex items-center justify-between">
                          <span className="text-yellow-600">Paid Premium:</span>
                          <span className="font-medium">{dist.premium_count}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {count > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleViewMembers(userClass.class_number)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Members
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Classes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Classes Configuration</CardTitle>
              <CardDescription>Edit capacity limits for each class level</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Display Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Members</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <div className="flex items-center gap-1">
                      Max Circles
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <div className="flex items-center gap-1">
                      Max Other Containers
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Max Join</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Default</th>
                </tr>
              </thead>
              <tbody>
                {userClasses.map((userClass) => (
                  <tr key={userClass.class_number} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-mono">
                        {userClass.class_number}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        value={userClass.display_name}
                        onChange={(e) => handleClassChange(userClass.class_number, 'display_name', e.target.value)}
                        className="max-w-[180px]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{userClass.member_count || 0}</span>
                        {(userClass.member_count || 0) > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewMembers(userClass.class_number)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={userClass.max_admin_circles}
                          onChange={(e) => handleClassChange(userClass.class_number, 'max_admin_circles', parseInt(e.target.value) || 0)}
                          className="max-w-[80px]"
                        />
                        {userClass.max_admin_circles === -1 && (
                          <Badge variant="secondary" className="text-xs">∞</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Communities</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={userClass.max_admin_containers}
                          onChange={(e) => handleClassChange(userClass.class_number, 'max_admin_containers', parseInt(e.target.value) || 0)}
                          className="max-w-[80px]"
                        />
                        {userClass.max_admin_containers === -1 && (
                          <Badge variant="secondary" className="text-xs">∞</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Tables/Meetings/etc</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={userClass.max_member_containers}
                          onChange={(e) => handleClassChange(userClass.class_number, 'max_member_containers', parseInt(e.target.value) || 0)}
                          className="max-w-[80px]"
                        />
                        {userClass.max_member_containers === -1 && (
                          <Badge variant="secondary" className="text-xs">∞</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">As member</p>
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        value={userClass.description}
                        onChange={(e) => handleClassChange(userClass.class_number, 'description', e.target.value)}
                        className="max-w-[180px]"
                        placeholder="Optional description"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={userClass.is_default}
                        onChange={(e) => handleClassChange(userClass.class_number, 'is_default', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Container Types Explained
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Max Admin Circles (Communities)</h4>
              <p className="text-gray-600">
                <strong>Circles</strong> are full communities with their own governance, member management, and settings. 
                These are heavyweight containers that require significant management.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Examples: Developer Circle, Marketing Circle, Regional Circle
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Max Admin Other Containers</h4>
              <p className="text-gray-600">
                Lighter-weight containers: <strong>Tables</strong> (resources), <strong>Elevators</strong> (networking), 
                <strong>Meetings</strong>, <strong>Pitches</strong>, <strong>Builds</strong>, <strong>Standups</strong>, and <strong>Meetups</strong>.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                These are simpler participation containers with less overhead.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Max Member Containers (Join)</h4>
              <p className="text-gray-600">
                Total containers (any type) a user can join and participate in as a regular member, 
                not counting containers they admin.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                This limits passive participation to prevent overwhelming feeds.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Unlimited Access</h4>
            <p className="text-sm text-yellow-800">
              Set any value to <code className="bg-yellow-100 px-1 rounded">-1</code> to allow unlimited 
              capacity for that container type in that class.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Default Class</p>
                <p className="text-lg font-bold">
                  {userClasses.find(c => c.is_default)?.display_name || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Unlimited Classes</p>
                <p className="text-2xl font-bold">
                  {userClasses.filter(c => c.max_admin_circles === -1 || c.max_admin_containers === -1 || c.max_member_containers === -1).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Classes in Use</p>
                <p className="text-2xl font-bold">
                  {distribution.filter(d => d.count > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Modal */}
      {viewingClass !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Members in {userClasses.find(c => c.class_number === viewingClass)?.display_name}
                  </CardTitle>
                  <CardDescription>
                    {classMembers.length} member{classMembers.length !== 1 ? 's' : ''} in this capacity class
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewingClass(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-6">
              {loadingMembers ? (
                <div className="text-center py-8 text-gray-600">Loading members...</div>
              ) : classMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No members in this class</div>
              ) : (
                <div className="space-y-2">
                  {classMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{member.name}</h4>
                          {getMembershipBadge(member.membership_tier)}
                          <Badge variant="outline" className="text-xs">Class {member.user_class}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to={`/platform-admin/users/${member.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-lg rounded-lg p-4 flex items-center gap-4 z-40">
          <p className="text-sm font-medium">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}