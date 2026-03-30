import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { 
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Menu,
  X,
  Award,
  Home,
} from 'lucide-react';
import { JourneyDetailView } from '@/app/components/program/JourneyDetailView';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { checkAccess } from '@/services/enrollmentBridge';
import { accessTicketService } from '@/services/accessTicketService';
import { issueCourseCompletionBadge } from '@/services/badgeService';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
}

interface Journey {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface JourneyProgress {
  journey_id: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Enrollment {
  id: string;
  progress_percentage: number;
  last_accessed_at: string;
}

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [currentJourneyIndex, setCurrentJourneyIndex] = useState(0);
  const [journeyProgress, setJourneyProgress] = useState<Record<string, JourneyProgress>>({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialIndexSet, setInitialIndexSet] = useState(false);
  // Guard: prevent firing completion callbacks more than once per session
  const completionFiredRef = useRef(false);

  useEffect(() => {
    if (slug && profile) {
      checkEnrollmentAndLoadCourse();
    }
  }, [slug, profile]);

  const checkEnrollmentAndLoadCourse = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle(); // Changed from .single() to handle 0 results

      if (courseError) throw courseError;
      
      // If no course found
      if (!courseData) {
        toast.error('Course not found');
        navigate('/courses');
        return;
      }
      
      setCourse(courseData);

      // Check enrollment (unified: check ticket first, fallback to legacy)
      const accessResult = await checkAccess({
        userId: profile.id,
        containerType: 'course',
        containerId: courseData.id,
      });

      if (!accessResult.hasAccess) {
        toast.error('You must enroll in this course first');
        navigate(`/courses/${slug}`);
        return;
      }

      // Also fetch the legacy enrollment for progress tracking (still needed for now)
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseData.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (enrollmentData) {
        setEnrollment(enrollmentData);

        // Update last_accessed_at
        await supabase
          .from('course_enrollments')
          .update({ 
            last_accessed_at: new Date().toISOString(),
            started_at: enrollmentData.started_at || new Date().toISOString()
          })
          .eq('id', enrollmentData.id);
      }

      // Also record access on the ticket
      try {
        await accessTicketService.recordAccess(profile.id, 'course', courseData.id);
      } catch (e) {
        // Non-critical
      }

      // Fetch journeys
      const { data: journeyData, error: journeyError } = await supabase
        .from('program_journeys')
        .select('*')
        .eq('course_id', courseData.id)
        .order('order_index');

      if (journeyError) throw journeyError;
      setJourneys(journeyData || []);

      // Fetch progress for each journey
      if (journeyData) {
        const progressData: Record<string, JourneyProgress> = {};
        
        for (const journey of journeyData) {
          // Get total items
          const { count: totalItems } = await supabase
            .from('journey_items')
            .select('*', { count: 'exact', head: true })
            .eq('journey_id', journey.id);

          // Get completed items
          const { count: completedItems } = await supabase
            .from('journey_item_completions')
            .select('*', { count: 'exact', head: true })
            .eq('journey_id', journey.id)
            .eq('user_id', profile.id)
            .eq('completed', true);

          const total = totalItems || 0;
          const completed = completedItems || 0;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

          progressData[journey.id] = {
            journey_id: journey.id,
            total_items: total,
            completed_items: completed,
            completion_percentage: percentage,
            status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
          };
        }

        setJourneyProgress(progressData);

        // Auto-resume: start at the first incomplete module
        if (!initialIndexSet && journeyData.length > 0) {
          const firstIncompleteIdx = journeyData.findIndex(
            (j) => {
              const p = progressData[j.id];
              return !p || p.status !== 'completed';
            }
          );
          if (firstIncompleteIdx >= 0) {
            setCurrentJourneyIndex(firstIncompleteIdx);
          }
          setInitialIndexSet(true);
        }

        // Write overall progress back to course_enrollments so MyCoursesPage shows accurate %
        if (enrollmentData && journeyData.length > 0) {
          const totalPct = Math.round(
            Object.values(progressData).reduce((sum, p) => sum + p.completion_percentage, 0) / journeyData.length
          );
          await supabase
            .from('course_enrollments')
            .update({ progress_percentage: totalPct })
            .eq('id', enrollmentData.id);
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Unified completion handler — called when course reaches 100%
  // -------------------------------------------------------------------------
  const fireCourseCompletion = useCallback(async (courseId: string, enrollmentId: string) => {
    if (completionFiredRef.current) return;
    completionFiredRef.current = true;

    // 1. Mark enrollment completed in DB
    await supabase
      .from('course_enrollments')
      .update({ completed_at: new Date().toISOString(), progress_percentage: 100 })
      .eq('id', enrollmentId);

    toast.success('Course completed! Great work! 🎉');

    // 2. Advance any enrolled pathways that include this course as a step
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token || publicAnonKey;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/pathways/completion-hook`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content_type: 'course', content_id: courseId }),
        }
      );
      const data = await res.json();
      if (data.success && data.pathways_advanced > 0) {
        const completed = data.results?.filter((r: any) => r.pathwayCompleted) || [];
        if (completed.length > 0) {
          toast.success('Pathway completed! Check My Growth for your achievement.', { duration: 5000 });
        } else {
          toast.info(`Pathway progress updated — ${data.pathways_advanced} pathway${data.pathways_advanced > 1 ? 's' : ''} advanced.`, { duration: 4000 });
        }
      }
    } catch (hookError) {
      console.error('Error calling pathway completion hook:', hookError);
    }

    // 3. Issue course-completion badge (non-blocking)
    try {
      if (profile) {
        await issueCourseCompletionBadge(profile.id, courseId);
      }
    } catch (badgeError) {
      console.error('Error issuing course completion badge:', badgeError);
    }
  }, [profile, publicAnonKey]);

  // Callback for JourneyDetailView to report live progress changes
  const handleProgressChange = useCallback(async (journeyId: string) => {
    if (!profile) return;
    
    // Re-fetch progress for this specific journey
    const { count: totalItems } = await supabase
      .from('journey_items')
      .select('*', { count: 'exact', head: true })
      .eq('journey_id', journeyId);

    const { count: completedItems } = await supabase
      .from('journey_item_completions')
      .select('*', { count: 'exact', head: true })
      .eq('journey_id', journeyId)
      .eq('user_id', profile.id)
      .eq('completed', true);

    const total = totalItems || 0;
    const completed = completedItems || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    setJourneyProgress((prev) => ({
      ...prev,
      [journeyId]: {
        journey_id: journeyId,
        total_items: total,
        completed_items: completed,
        completion_percentage: percentage,
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
      },
    }));

    // Also update overall enrollment progress
    if (enrollment && journeys.length > 0) {
      const updatedProgress = { ...journeyProgress };
      updatedProgress[journeyId] = {
        journey_id: journeyId,
        total_items: total,
        completed_items: completed,
        completion_percentage: percentage,
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
      };
      const totalPct = Math.round(
        Object.values(updatedProgress).reduce((sum, p) => sum + p.completion_percentage, 0) / journeys.length
      );
      await supabase
        .from('course_enrollments')
        .update({ progress_percentage: totalPct })
        .eq('id', enrollment.id);

      // Auto-fire completion callbacks when all modules reach 100%
      if (totalPct === 100 && course) {
        await fireCourseCompletion(course.id, enrollment.id);
      }
    }
  }, [profile, enrollment, journeys, journeyProgress, course, fireCourseCompletion]);

  const handlePreviousJourney = () => {
    if (currentJourneyIndex > 0) {
      setCurrentJourneyIndex(currentJourneyIndex - 1);
    }
  };

  const handleNextJourney = () => {
    if (currentJourneyIndex < journeys.length - 1) {
      setCurrentJourneyIndex(currentJourneyIndex + 1);
    }
  };

  const handleJourneySelect = (index: number) => {
    setCurrentJourneyIndex(index);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const calculateOverallProgress = () => {
    if (journeys.length === 0) return 0;
    const totalPercentage = Object.values(journeyProgress).reduce(
      (sum, progress) => sum + progress.completion_percentage,
      0
    );
    return Math.round(totalPercentage / journeys.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-xl mb-2">Loading course...</div>
        </div>
      </div>
    );
  }

  if (!course || journeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Course Not Ready</h2>
            <p className="text-gray-600 mb-6">
              This course doesn't have any content yet.
            </p>
            <Button onClick={() => navigate('/courses')}>
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentJourney = journeys[currentJourneyIndex];
  const currentProgress = journeyProgress[currentJourney?.id] || {
    total_items: 0,
    completed_items: 0,
    completion_percentage: 0,
    status: 'not_started' as const,
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed z-30 w-80 bg-white border-r border-gray-200 h-full overflow-y-auto transition-transform duration-200`}
      >
        {/* Course Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/courses/${course.slug}`)}
                className="mb-2 -ml-2"
              >
                <Home className="w-4 h-4 mr-2" />
                Course Home
              </Button>
              <h2 className="font-semibold text-lg">{course.title}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Your Progress</span>
              <span className="font-semibold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        {/* Journey List */}
        <div className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-3">
            Course Modules
          </h3>
          {journeys.map((journey, index) => {
            const progress = journeyProgress[journey.id];
            const isActive = index === currentJourneyIndex;
            const isCompleted = progress?.status === 'completed';
            const isInProgress = progress?.status === 'in_progress';

            return (
              <button
                key={journey.id}
                onClick={() => handleJourneySelect(index)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : isInProgress ? (
                      <Circle className="w-5 h-5 text-blue-600 fill-blue-100" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Journey Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      Module {index + 1}
                    </div>
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {journey.title}
                    </div>
                    {progress && progress.total_items > 0 && (
                      <div className="text-xs text-gray-600">
                        {progress.completed_items} / {progress.total_items} complete
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {progress && progress.total_items > 0 && (
                  <div className="mt-2 ml-8">
                    <Progress 
                      value={progress.completion_percentage} 
                      className="h-1" 
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Certificate Section */}
        {overallProgress === 100 && (
          <div className="p-4 m-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">
                Congratulations!
              </h4>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              You've completed all modules!
            </p>
            <Button size="sm" className="w-full"
              onClick={() => {
                if (enrollment && course) {
                  fireCourseCompletion(course.id, enrollment.id);
                } else {
                  toast.info('Certificate feature coming soon!');
                }
              }}
            >
              Complete Course
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <div className="text-sm text-gray-600">
                Module {currentJourneyIndex + 1} of {journeys.length}
              </div>
              <h1 className="text-xl font-semibold">{currentJourney?.title}</h1>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousJourney}
              disabled={currentJourneyIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={handleNextJourney}
              disabled={currentJourneyIndex === journeys.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Journey Content */}
        <div className="p-6 max-w-5xl mx-auto">
          {currentJourney && (
            <JourneyDetailView
              key={currentJourney.id}
              journey={currentJourney}
              journeyProgress={currentProgress}
              onBack={() => {}}
              isAdmin={false}
              coursePlayerMode={true}
              onProgressChange={() => handleProgressChange(currentJourney.id)}
              onNextModule={
                currentJourneyIndex < journeys.length - 1
                  ? handleNextJourney
                  : undefined
              }
              isLastModule={currentJourneyIndex === journeys.length - 1}
            />
          )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}