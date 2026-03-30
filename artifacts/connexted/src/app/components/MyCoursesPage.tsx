import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { BookOpen, Play, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { accessTicketService } from '@/services/accessTicketService';

interface Enrollment {
  id: string;
  course_id: string;
  progress_percentage: number;
  enrolled_at: string;
  last_accessed_at: string | null;
  completed_at: string | null;
  source: 'ticket' | 'legacy';
  courses: {
    id: string;
    slug: string;
    title: string;
    description: string;
    instructor_name: string;
  };
}

export default function MyCoursesPage() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const enrollmentMap = new Map<string, Enrollment>();

      // 1. Fetch from access_tickets (unified system — source of truth)
      try {
        const tickets = await accessTicketService.getUserTicketsByType(profile.id, 'course');
        
        if (tickets && tickets.length > 0) {
          const ticketCourseIds = tickets.map(t => t.container_id).filter(Boolean) as string[];
          
          if (ticketCourseIds.length > 0) {
            const { data: ticketCourses } = await supabase
              .from('courses')
              .select('id, slug, title, description, instructor_name')
              .in('id', ticketCourseIds);

            for (const ticket of tickets) {
              const course = ticketCourses?.find(c => c.id === ticket.container_id);
              if (course) {
                enrollmentMap.set(course.id, {
                  id: ticket.id,
                  course_id: course.id,
                  progress_percentage: ticket.progress_percentage || 0,
                  enrolled_at: ticket.granted_at,
                  last_accessed_at: ticket.last_accessed_at,
                  completed_at: ticket.completed_at,
                  source: 'ticket',
                  courses: course,
                });
              }
            }
          }
        }
      } catch (ticketErr) {
        console.error('Failed to fetch course tickets (non-fatal):', ticketErr);
      }

      // 2. Fallback: also fetch from legacy course_enrollments (catch any not yet in tickets)
      try {
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('course_enrollments')
          .select('*')
          .eq('user_id', profile.id)
          .order('enrolled_at', { ascending: false });

        if (!enrollmentsError && enrollmentsData && enrollmentsData.length > 0) {
          const legacyCourseIds = enrollmentsData
            .map(e => e.course_id)
            .filter(id => !enrollmentMap.has(id)); // Only fetch courses not already from tickets
          
          if (legacyCourseIds.length > 0) {
            const { data: legacyCourses } = await supabase
              .from('courses')
              .select('id, slug, title, description, instructor_name')
              .in('id', legacyCourseIds);

            for (const enrollment of enrollmentsData) {
              if (!enrollmentMap.has(enrollment.course_id)) {
                const course = legacyCourses?.find(c => c.id === enrollment.course_id);
                if (course) {
                  enrollmentMap.set(course.id, {
                    id: enrollment.id,
                    course_id: enrollment.course_id,
                    progress_percentage: enrollment.progress_percentage || 0,
                    enrolled_at: enrollment.enrolled_at,
                    last_accessed_at: enrollment.last_accessed_at,
                    completed_at: enrollment.completed_at,
                    source: 'legacy',
                    courses: course,
                  });
                }
              }
            }
          }
        }
      } catch (legacyErr) {
        console.error('Failed to fetch legacy enrollments (non-fatal):', legacyErr);
      }

      setEnrollments(Array.from(enrollmentMap.values()));
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast.error('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const inProgressCourses = enrollments.filter(
    (e) => e.progress_percentage > 0 && e.progress_percentage < 100
  );
  const notStartedCourses = enrollments.filter((e) => e.progress_percentage === 0);
  const completedCourses = enrollments.filter((e) => e.progress_percentage === 100);

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'My Learning' }]} />
        <div className="text-center py-12 text-gray-600">Loading your courses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Learning' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">My Learning</h1>
          <p className="text-gray-600">
            Continue your learning journey and track your progress
          </p>
        </div>
        <Link to="/courses">
          <Button>
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Courses
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enrollments.length}</p>
                <p className="text-sm text-gray-600">Total Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Play className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCourses.length}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCourses.length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Courses Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start learning today by enrolling in a course
            </p>
            <Link to="/courses">
              <Button>Browse Course Catalog</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* In Progress Courses */}
          {inProgressCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Continue Learning</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressCourses.map((enrollment) => (
                  <CourseEnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Not Started Courses */}
          {notStartedCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Start Learning</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notStartedCourses.map((enrollment) => (
                  <CourseEnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Courses */}
          {completedCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Completed
                <Badge className="ml-2 bg-green-600">{completedCourses.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map((enrollment) => (
                  <CourseEnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourseEnrollmentCard({
  enrollment,
}: {
  enrollment: Enrollment;
}) {
  const course = enrollment.courses;
  const isCompleted = enrollment.progress_percentage === 100;

  return (
    <Link to={`/courses/${course.slug}/learn`}>
      <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
        {/* Gradient Header */}
        <div className="w-full h-32 bg-gradient-to-br from-purple-500 to-blue-600 rounded-t-lg flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-white opacity-50" />
        </div>

        <CardHeader className="flex-grow">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="line-clamp-2">{course.title}</CardTitle>
            {isCompleted && (
              <Badge className="bg-green-600 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Done
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>

          {/* Course Leader */}
          <p className="text-sm text-gray-500 mt-2">{course.instructor_name}</p>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold">{enrollment.progress_percentage}%</span>
            </div>
            <Progress value={enrollment.progress_percentage} className="h-2" />
          </div>

          {/* Action Button */}
          <Button className="w-full" size="sm">
            {isCompleted ? 'Review Course' : enrollment.progress_percentage > 0 ? 'Continue Learning' : 'Start Course'}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}