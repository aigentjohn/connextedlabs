import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
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
import { Search, Plus, Trash2, Users, Settings, Eye, GraduationCap, Database } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructor_name: string;
  pricing_type: 'free' | 'paid' | 'members-only';
  price_cents: number;
  is_published: boolean;
  featured: boolean;
  access_level: string;
  enrollment_count: number;
  created_at: string;
  created_by: string;
  instructor_id: string;
}

export default function CoursesManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'super') return;
    fetchCourses();
  }, [profile]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
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
          body: JSON.stringify({ table: 'courses', id: courseId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Server delete error:', result);
        throw new Error(result.error || 'Failed to delete course');
      }

      setCourses(courses.filter(c => c.id !== courseId));
      toast.success(`Course "${courseTitle}" deleted successfully!`);
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.message || 'Failed to delete course');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Courses Management' }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Courses Management</h1>
          <p className="text-gray-600">
            View, manage, and delete all platform courses
          </p>
        </div>
        <Link to="/courses/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="w-12 h-12 text-green-600" />
            <div>
              <div className="text-3xl font-bold text-green-900">{courses.length}</div>
              <div className="text-sm text-green-700">Total Courses</div>
            </div>
            <div className="ml-8">
              <div className="text-3xl font-bold text-green-900">
                {courses.filter(c => c.is_published).length}
              </div>
              <div className="text-sm text-green-700">Published</div>
            </div>
            <div className="ml-8">
              <div className="text-3xl font-bold text-green-900">
                {courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}
              </div>
              <div className="text-sm text-green-700">Total Enrollments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search courses by title, description, or instructor..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No courses match your search' : 'No courses yet'}
            </p>
            {!searchQuery && (
              <Link to="/courses/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Course
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant={course.is_published ? 'default' : 'secondary'}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  {course.featured && (
                    <Badge className="bg-yellow-500">Featured</Badge>
                  )}
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {course.enrollment_count || 0}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {course.pricing_type || 'free'}
                  </Badge>
                </div>
                {course.instructor_name && (
                  <p className="text-xs text-gray-500 mt-2">
                    by {course.instructor_name}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Link to={`/courses/${course.slug}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Link to={`/course-admin/${course.id}/setup`}>
                    <Button variant="outline" size="sm">
                      <Database className="w-4 h-4 mr-2" />
                      Setup
                    </Button>
                  </Link>
                  <Link to={`/instructor/courses/${course.slug}`}>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Course</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{course.title}"? This will permanently delete
                          the course and all its content, enrollments, and student progress. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCourse(course.id, course.title)}
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
          ))}
        </div>
      )}
    </div>
  );
}