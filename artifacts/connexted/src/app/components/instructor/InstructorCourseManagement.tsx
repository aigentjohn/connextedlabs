import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { 
  BookOpen, Settings, DollarSign, Users, Eye, 
  Save, ArrowLeft, Trash2, AlertCircle
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_bio: string;
  instructor_avatar_url: string | null;
  pricing_type: 'free' | 'paid' | 'members-only';
  price_cents: number;
  currency: string;
  is_published: boolean;
  featured: boolean;
  access_level: 'public' | 'member' | 'premium';
  enrollment_count: number;
}

export default function InstructorCourseManagement() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<Course>>({});

  useEffect(() => {
    if (slug) {
      fetchCourse();
    }
  }, [slug]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('id, slug, title, description, instructor_name, instructor_bio, instructor_avatar_url, pricing_type, price_cents, currency, is_published, featured, access_level, enrollment_count, instructor_id, created_by')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      // Check if user is instructor/creator or platform admin
      const isOwner = data.instructor_id === profile?.id || data.created_by === profile?.id;
      const isAdmin = profile?.role ? hasRoleLevel(profile.role, ROLES.ADMIN) : false;
      if (!isOwner && !isAdmin) {
        toast.error('You do not have permission to manage this course');
        navigate('/instructor/dashboard');
        return;
      }

      setCourse(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!course) return;

    try {
      setSaving(true);
      // Only update the fields we manage
      const { error } = await supabase
        .from('courses')
        .update({
          title: formData.title,
          description: formData.description,
          instructor_name: formData.instructor_name,
          instructor_bio: formData.instructor_bio,
          pricing_type: formData.pricing_type,
          price_cents: formData.price_cents,
          access_level: formData.access_level,
          featured: formData.featured,
          is_published: formData.is_published,
        })
        .eq('id', course.id);

      if (error) throw error;

      toast.success('Course updated successfully');
      fetchCourse(); // Refresh data
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;

    try {
      setSaving(true);
      const newPublishedState = !course.is_published;
      
      const { error } = await supabase
        .from('courses')
        .update({ 
          is_published: newPublishedState,
          published_at: newPublishedState ? new Date().toISOString() : null
        })
        .eq('id', course.id);

      if (error) throw error;

      toast.success(newPublishedState ? 'Course published!' : 'Course unpublished');
      fetchCourse();
    } catch (error) {
      console.error('Error toggling publish state:', error);
      toast.error('Failed to update publish state');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

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
          body: JSON.stringify({ table: 'courses', id: course.id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Server delete error:', result);
        throw new Error(result.error || 'Failed to delete course');
      }

      toast.success(`Course "${course.title}" deleted successfully`);
      navigate('/instructor/dashboard');
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.message || 'Failed to delete course');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-600">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Course not found</p>
          <Link to="/instructor/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const revenue = course.pricing_type === 'paid'
    ? ((course.price_cents * course.enrollment_count) / 100)
    : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Course Leader Dashboard', href: '/instructor/dashboard' },
          { label: course.title }
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link to="/instructor/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl">{course.title}</h1>
              {!course.is_published && (
                <Badge variant="outline">Draft</Badge>
              )}
              {course.featured && (
                <Badge className="bg-yellow-500">Featured</Badge>
              )}
            </div>
            <p className="text-gray-600">Manage course settings and content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/courses/${course.slug}`}>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </Link>
          <Button 
            onClick={handlePublishToggle}
            variant={course.is_published ? 'outline' : 'default'}
            disabled={saving}
          >
            {course.is_published ? 'Unpublish' : 'Publish Course'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{course.enrollment_count}</p>
                <p className="text-sm text-gray-600">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {course.pricing_type === 'paid' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${revenue.toFixed(0)}</p>
                  <p className="text-sm text-gray-600">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your course"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instructor_name">Course Leader Name</Label>
                  <Input
                    id="instructor_name"
                    value={formData.instructor_name || ''}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    placeholder="Course leader name"
                  />
                </div>
                <div>
                  <Label htmlFor="instructor_bio">Course Leader Bio</Label>
                  <Input
                    id="instructor_bio"
                    value={formData.instructor_bio || ''}
                    onChange={(e) => setFormData({ ...formData, instructor_bio: e.target.value })}
                    placeholder="Brief bio"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pricing_type">Pricing Type</Label>
                <select
                  id="pricing_type"
                  value={formData.pricing_type || 'free'}
                  onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="members-only">Members Only</option>
                </select>
              </div>

              {formData.pricing_type === 'paid' && (
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={(formData.price_cents || 0) / 100}
                    onChange={(e) => setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="access_level">Visibility</Label>
                <select
                  id="access_level"
                  value={formData.access_level || 'public'}
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="public">Public</option>
                  <option value="member">Members Only</option>
                  <option value="premium">Premium Only</option>
                </select>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage your course journeys, lessons, and materials
              </p>
              <Link to={`/course-admin/${course.id}/setup`}>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Content & Journeys
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Featured Course</Label>
                  <p className="text-sm text-gray-600">Show this course in featured section</p>
                </div>
                <Switch
                  checked={formData.featured || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Published</Label>
                  <p className="text-sm text-gray-600">Make course visible to students</p>
                </div>
                <Switch
                  checked={formData.is_published || false}
                  onCheckedChange={handlePublishToggle}
                />
              </div>

              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between p-4 bg-white border border-red-200 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Delete Course</h4>
                  <p className="text-sm text-gray-600">
                    Permanently delete this course and all its content, enrollments, and progress data. This action cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Course</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{course.title}"? This will permanently delete the course
                        and all its content, enrollments, and student progress. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCourse}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Course
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}