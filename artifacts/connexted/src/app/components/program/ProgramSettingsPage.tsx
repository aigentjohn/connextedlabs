// Split candidate: ~596 lines — consider extracting GeneralSettingsForm, AccessSettingsPanel, and DangerZoneSection into sub-components.
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  ArrowLeft,
  Settings,
  Users,
  Shield,
  Trash2,
  AlertCircle,
  Save,
  Home,
  BookOpen,
} from 'lucide-react';
import { ImageUpload } from '@/app/components/shared/ImageUpload';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';

interface Program {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  circle_id: string | null;
  pricing_type?: 'free' | 'paid' | 'members-only';
  price_cents?: number;
  cover_image?: string | null;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ProgramSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'not-started' | 'in-progress' | 'completed'>('not-started');
  const [pricingType, setPricingType] = useState<'free' | 'paid' | 'members-only'>('free');
  const [priceCents, setPriceCents] = useState<number>(0);
  const [coverImage, setCoverImage] = useState('');

  // Members management
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (slug) {
      fetchProgram();
      fetchAllUsers();
    }
  }, [slug]);

  const fetchProgram = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Program not found');
        navigate('/platform-admin/programs');
        return;
      }

      // Check if user is admin or platform super
      const isPlatformAdmin = profile?.role ? hasRoleLevel(profile.role, ROLES.ADMIN) : false;
      if (profile && data.created_by !== profile.id && !data.admin_ids?.includes(profile.id) && !isPlatformAdmin) {
        toast.error('You do not have permission to edit this program');
        navigate(`/programs/${slug}`);
        return;
      }

      setProgram(data);
      setName(data.name);
      setDescription(data.description || '');
      setStatus(data.status);
      setPricingType(data.pricing_type || 'free');
      setPriceCents(data.price_cents || 0);
      setAdminIds(data.admin_ids || []);
      setCoverImage(data.cover_image || '');
    } catch (error) {
      console.error('Error fetching program:', error);
      toast.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .order('name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSaveBasicSettings = async () => {
    if (!program) return;

    if (!name.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('programs')
        .update({
          name: name.trim(),
          description: description.trim(),
          status,
          pricing_type: pricingType,
          price_cents: pricingType === 'paid' ? priceCents : 0,
          cover_image: coverImage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', program.id);

      if (error) throw error;

      toast.success('Program settings saved');
      fetchProgram();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async (userId: string) => {
    if (!program) return;

    const newAdminIds = [...adminIds, userId];

    try {
      const { error } = await supabase
        .from('programs')
        .update({
          admin_ids: newAdminIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', program.id);

      if (error) throw error;

      setAdminIds(newAdminIds);
      toast.success('Admin added');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!program) return;

    // Don't allow removing the creator
    if (userId === program.created_by) {
      toast.error('Cannot remove the program creator');
      return;
    }

    const newAdminIds = adminIds.filter(id => id !== userId);

    try {
      const { error } = await supabase
        .from('programs')
        .update({
          admin_ids: newAdminIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', program.id);

      if (error) throw error;

      setAdminIds(newAdminIds);
      toast.success('Admin removed');
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  const handleDeleteProgram = async () => {
    if (!program) return;

    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    try {
      // Get user token for server-side auth
      const { data: sessionData } = await supabase.auth.getSession();
      const userToken = sessionData?.session?.access_token;
      if (!userToken) {
        toast.error('No active session — please sign in again');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/admin/delete-container`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': userToken,
          },
          body: JSON.stringify({ table: 'programs', id: program.id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Server delete error:', result);
        throw new Error(result.error || 'Failed to delete program');
      }

      toast.success('Program deleted');
      navigate('/platform-admin/programs');
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast.error(error.message || 'Failed to delete program');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Program Not Found</CardTitle>
            <CardDescription>
              The program you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/programs')}>
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminUsers = allUsers.filter(u => 
    u.id === program.created_by || adminIds.includes(u.id)
  );

  const availableAdmins = allUsers.filter(u => 
    u.id !== program.created_by && 
    !adminIds.includes(u.id) &&
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/programs">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Programs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/programs/${program.slug}`}>
                {program.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/programs/${program.slug}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Program
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Program Settings</h1>
              <p className="text-sm text-gray-500">{program.name}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Settings className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Shield className="w-4 h-4 mr-2" />
              Administrators
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <AlertCircle className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Update the name, description, and status of your program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter program name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your program"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <ImageUpload
                    bucket="covers"
                    storagePath={`programs/${program.id}/cover`}
                    preset="wide"
                    currentUrl={coverImage}
                    onUpload={(url) => setCoverImage(url)}
                    variant="cover"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-started">Not Started</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveBasicSettings} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>
                  Configure access and pricing for this program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Type</Label>
                  <Select value={pricingType} onValueChange={(value: any) => setPricingType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free - Open to Everyone</SelectItem>
                      <SelectItem value="members-only">Members Only - Requires Approval</SelectItem>
                      <SelectItem value="paid">Paid - Requires Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pricingType === 'paid' && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">$</span>
                      <Input
                        id="price"
                        type="number"
                        value={(priceCents / 100).toFixed(2)}
                        onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value) * 100))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveBasicSettings} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Administrators */}
          <TabsContent value="admins" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Program Administrators</CardTitle>
                <CardDescription>
                  Manage who can edit this program and its content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Admins */}
                <div className="space-y-3">
                  {adminUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.id === program.created_by && (
                          <Badge variant="secondary">Creator</Badge>
                        )}
                        {user.id !== program.created_by && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdmin(user.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Admin */}
                <div className="pt-4 border-t">
                  <Label>Add Administrator</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {searchQuery && availableAdmins.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto">
                      {availableAdmins.slice(0, 10).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            handleAddAdmin(user.id);
                            setSearchQuery('');
                          }}
                        >
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                          <Button size="sm" variant="outline">
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-700">
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between p-4 bg-white border border-red-200 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Delete Program</h4>
                    <p className="text-sm text-gray-600">
                      Permanently delete this program and all its data. This action cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteProgram}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}