import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  BookOpen, Users, DollarSign, Plus, 
  Settings, BarChart3, Eye, Shield 
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { canManagePrograms, hasRoleLevel, ROLES } from '@/lib/constants/roles';

interface CourseStats {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_published: boolean;
  featured: boolean;
  enrollment_count: number;
  price_cents: number;
  currency: string;
  pricing_type: string;
  created_at: string;
  instructor_id: string | null;
  instructor_name: string | null;
  created_by: string | null;
}

export default function InstructorDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdminUser = profile?.role ? hasRoleLevel(profile.role, ROLES.ADMIN) : false;
  const [viewMode, setViewMode] = useState<'mine' | 'all'>(isAdminUser ? 'all' : 'mine');
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchData();
  }, [profile, viewMode]);

  const fetchData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const isAdmin = hasRoleLevel(profile.role, ROLES.ADMIN);
      
      let query = supabase
        .from('courses')
        .select('id, slug, title, description, is_published, featured, enrollment_count, price_cents, currency, pricing_type, created_at, instructor_id, instructor_name, created_by')
        .order('created_at', { ascending: false });
      
      if (!isAdmin || viewMode === 'mine') {
        query = query.or(`instructor_id.eq.${profile.id},created_by.eq.${profile.id}`);
      }
      
      const { data: coursesData, error: coursesError } = await query;

      if (coursesError) throw coursesError;

      setCourses(coursesData || []);

      // Calculate stats
      const totalStudents = coursesData?.reduce((sum, c) => sum + (c.enrollment_count || 0), 0) || 0;
      const totalRevenue = coursesData?.reduce((sum, c) => {
        if (c.pricing_type === 'paid') {
          return sum + ((c.price_cents || 0) * (c.enrollment_count || 0)) / 100;
        }
        return sum;
      }, 0) || 0;

      setStats({
        totalCourses: coursesData?.length || 0,
        totalStudents,
        totalRevenue,
      });

    } catch (error) {
      console.error('Error fetching course leader data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const publishedCourses = courses.filter(c => c.is_published);
  const draftCourses = courses.filter(c => !c.is_published);

  const isAdmin = profile ? hasRoleLevel(profile.role, ROLES.ADMIN) : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Course Leader Dashboard' }]} />
        <div className="text-center py-12 text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Course Leader Dashboard' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">
            {isAdmin && viewMode === 'all' ? 'Course Administration' : 'Course Leader Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isAdmin && viewMode === 'all'
              ? 'Manage and moderate all courses on the platform'
              : 'Manage your courses and track student engagement'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'mine' ? 'default' : 'ghost'}
                onClick={() => setViewMode('mine')}
                className="text-sm"
              >
                My Courses
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'all' ? 'default' : 'ghost'}
                onClick={() => setViewMode('all')}
                className="text-sm"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                All Courses
              </Button>
            </div>
          )}
          {profile && canManagePrograms(profile.role) && (
            <Link to="/courses/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCourses}</p>
                <p className="text-sm text-gray-600">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create Your First Course
            </h3>
            <p className="text-gray-600 mb-4">
              Share your knowledge and build a learning experience for students
            </p>
            {profile && canManagePrograms(profile.role) && (
              <Link to="/courses/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Published Courses */}
          {publishedCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Published Courses
                <Badge className="ml-2 bg-green-600">{publishedCourses.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {publishedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} showLeader={isAdmin && viewMode === 'all'} currentUserId={profile?.id} />
                ))}
              </div>
            </div>
          )}

          {/* Draft Courses */}
          {draftCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Drafts
                <Badge className="ml-2" variant="outline">{draftCourses.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {draftCourses.map((course) => (
                  <CourseCard key={course.id} course={course} showLeader={isAdmin && viewMode === 'all'} currentUserId={profile?.id} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourseCard({ course, showLeader, currentUserId }: { course: CourseStats; showLeader?: boolean; currentUserId?: string }) {
  const revenue = course.pricing_type === 'paid' 
    ? ((course.price_cents || 0) * (course.enrollment_count || 0)) / 100
    : 0;
  
  const isOwner = currentUserId && (course.instructor_id === currentUserId || course.created_by === currentUserId);

  return (
    <Card className={showLeader && !isOwner ? 'border-l-4 border-l-purple-300' : ''}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Gradient Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-white opacity-70" />
          </div>

          {/* Course Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="text-lg font-semibold mb-1">{course.title}</h3>
                {showLeader && course.instructor_name && (
                  <p className="text-xs text-purple-600 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Course Leader: {course.instructor_name}
                    {isOwner && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">You</Badge>}
                  </p>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!course.is_published && (
                  <Badge variant="outline">Draft</Badge>
                )}
                {course.featured && (
                  <Badge className="bg-yellow-500">Featured</Badge>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{course.enrollment_count} students</span>
              </div>
              {course.pricing_type === 'paid' && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>${revenue.toFixed(0)} revenue</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link to={`/instructor/courses/${course.slug}`}>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </Link>
              <Link to={`/instructor/courses/${course.slug}/analytics`}>
                <Button size="sm" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link to={`/courses/${course.slug}`}>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
