import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  Play,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import SEO, { generateCourseSchema } from '@/app/components/SEO';
import { enrollInCourse } from '@/services/enrollmentBridge';
import { checkAccess } from '@/services/enrollmentBridge';
import RedeemCodeDialog from '@/app/components/shared/RedeemCodeDialog';
import { WaitlistBlock } from '@/app/components/shared/WaitlistBlock';
import { templateApi, type TicketTemplate } from '@/services/ticketSystemService';
import { RatingWidget } from '@/app/components/engagement/RatingWidget';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor_id: string;
  instructor_name: string;
  instructor_bio: string | null;
  instructor_avatar_url: string | null;
  pricing_type: 'free' | 'paid' | 'members-only';
  price_cents: number;
  currency: string;
  is_published: boolean;
  convertkit_product_id: string | null;
  average_rating: number | null;
  ratings_count: number | null;
}

interface Journey {
  id: string;
  title: string;
  description: string;
  order_index: number;
  item_count: number;
}

export default function CourseLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [linkedTemplate, setLinkedTemplate] = useState<TicketTemplate | null>(null);
  const [userRating, setUserRating] = useState<{ rating: number; review_text: string } | null>(null);

  useEffect(() => {
    if (slug) {
      fetchCourseData();
    }
  }, [slug, profile]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, slug, title, description, instructor_id, instructor_name, instructor_bio, instructor_avatar_url, pricing_type, price_cents, currency, is_published, convertkit_product_id, average_rating, ratings_count')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (courseError) throw courseError;
      
      if (!courseData) {
        toast.error('Course not found or not published');
        navigate('/courses');
        return;
      }
      
      setCourse(courseData);

      // Fetch journeys (syllabus)
      const { data: journeyData, error: journeyError } = await supabase
        .from('program_journeys')
        .select('id, title, description, order_index')
        .eq('course_id', courseData.id)
        .order('order_index');

      if (journeyError) throw journeyError;

      // Count items in each journey
      const journeysWithCounts = await Promise.all(
        (journeyData || []).map(async (journey) => {
          const { count } = await supabase
            .from('journey_items')
            .select('*', { count: 'exact', head: true })
            .eq('journey_id', journey.id);

          return {
            ...journey,
            item_count: count || 0,
          };
        })
      );

      setJourneys(journeysWithCounts);

      // Check if user is enrolled (unified: check ticket first, fallback to legacy)
      if (profile) {
        const accessResult = await checkAccess({
          userId: profile.id,
          containerType: 'course',
          containerId: courseData.id,
        });
        setIsEnrolled(accessResult.hasAccess);

        // Load existing rating for this user
        const { data: ratingData } = await supabase
          .from('content_ratings')
          .select('rating, review_text')
          .eq('content_type', 'course')
          .eq('content_id', courseData.id)
          .eq('user_id', profile.id)
          .maybeSingle();
        if (ratingData) setUserRating(ratingData);
      }

      // Fetch linked ticket template (public — works for logged-out visitors)
      try {
        const { templates: tmplList } = await templateApi.forContainer('course', courseData.id);
        setLinkedTemplate(tmplList?.[0] ?? null);
      } catch (tmplErr) {
        console.warn('Could not load linked ticket template:', tmplErr);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!profile) {
      toast.error('Please sign in to enroll');
      return;
    }

    if (!course) return;

    try {
      setEnrolling(true);

      // Handle paid courses with ConvertKit integration
      if (course.pricing_type === 'paid') {
        if (course.convertkit_product_id) {
          const convertkitUrl = `https://app.convertkit.com/commerce/products/${course.convertkit_product_id}`;
          toast.info('Redirecting to checkout...');
          window.location.href = convertkitUrl;
          return;
        } else {
          toast.error('Payment integration not configured for this course. Please contact support.');
          return;
        }
      }

      // Handle members-only courses
      if (course.pricing_type === 'members-only') {
        toast.info('This course is only available to premium members');
        return;
      }

      // Handle free courses - create enrollment via bridge (ticket + legacy)
      await enrollInCourse({
        userId: profile.id,
        courseId: course.id,
        acquisitionSource: 'direct_enrollment',
        ticketType: 'free',
      });

      toast.success('Successfully enrolled!');
      setIsEnrolled(true);
      
      // Navigate to course player
      setTimeout(() => {
        navigate(`/courses/${course.slug}/learn`);
      }, 1000);
    } catch (error: any) {
      console.error('Error enrolling:', error);
      if (error.code === '23505') {
        toast.error('You are already enrolled in this course');
        setIsEnrolled(true);
      } else {
        toast.error('Failed to enroll in course');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    if (!course) return;
    navigate(`/courses/${course.slug}/learn`);
  };

  const getPriceDisplay = () => {
    if (!course) return null;
    
    if (course.pricing_type === 'free') {
      return <span className="text-3xl font-bold text-green-600">Free</span>;
    } else if (course.pricing_type === 'members-only') {
      return <span className="text-xl font-semibold text-gray-700">Members Only</span>;
    } else {
      const price = (course.price_cents / 100).toFixed(2);
      return <span className="text-3xl font-bold">${price}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Loading...' }
        ]} />
        <div className="text-center py-12">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Not Found' }
        ]} />
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Course Not Found</h2>
            <p className="text-gray-600 mb-6">
              The course you're looking for doesn't exist or isn't published yet.
            </p>
            <Button onClick={() => navigate('/courses')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalItems = journeys.reduce((sum, j) => sum + j.item_count, 0);

  return (
    <div className="space-y-6">
      {/* SEO Meta Tags */}
      <SEO
        title={course.title}
        description={course.description || `Learn ${course.title} with CONNEXTED LABS.`}
        url={`https://connexted.app/courses/${course.slug}`}
        type="article"
        schema={generateCourseSchema({
          title: course.title,
          description: course.description || '',
          instructor: course.instructor_name,
          price: course.price_cents / 100,
          url: `https://connexted.app/courses/${course.slug}`
        })}
      />
      
      <Breadcrumbs items={[
        { label: 'Courses', href: '/courses' },
        { label: course.title }
      ]} />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 lg:p-12">
          {/* Left: Course Info */}
          <div className="text-white space-y-4">
            <h1 className="text-4xl font-bold">{course.title}</h1>
            <p className="text-lg text-white/90">{course.description}</p>

            {/* Summary Stats */}
            {(journeys.length > 0 || totalItems > 0) && (
              <div className="flex items-center gap-6 text-sm">
                {journeys.length > 0 && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {journeys.length} {journeys.length === 1 ? 'module' : 'modules'}
                  </div>
                )}
                {totalItems > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {totalItems} {totalItems === 1 ? 'lesson' : 'lessons'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Enrollment Card + Ratings */}
          <div className="flex flex-col items-center gap-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  {getPriceDisplay()}
                </div>

                {isEnrolled ? (
                  <Button 
                    onClick={handleStartCourse}
                    className="w-full" 
                    size="lg"
                  >
                    Continue Learning
                    <Play className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleEnroll}
                    disabled={enrolling || !profile}
                    className="w-full" 
                    size="lg"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                )}

                {/* "Have a code?" link — shown when not enrolled and logged in */}
                {!isEnrolled && profile && (
                  <div className="text-center mt-3">
                    <RedeemCodeDialog
                      containerType="course"
                      containerId={course.id}
                      userId={profile.id}
                      onRedeemed={() => {
                        setIsEnrolled(true);
                        toast.success('You now have access!');
                        setTimeout(() => navigate(`/courses/${course.slug}/learn`), 1500);
                      }}
                    />
                  </div>
                )}

                {!profile && (
                  <p className="text-sm text-gray-600 text-center mt-3">
                    Sign in to enroll in this course
                  </p>
                )}

                {/* Waitlist — appears when a ticket template is linked to this course */}
                {linkedTemplate && !isEnrolled && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <WaitlistBlock
                      template={linkedTemplate}
                      profile={profile}
                      displayName={course.title}
                    />
                  </div>
                )}

                <div className="mt-6 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Full lifetime access
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Learn at your own pace
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Certificate of completion
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ratings — shown to all; rate button only for enrolled users */}
            <Card className="w-full max-w-md">
              <CardContent className="pt-4">
                <RatingWidget
                  contentType="course"
                  contentId={course.id}
                  userId={isEnrolled ? profile?.id : undefined}
                  initialRating={userRating?.rating ?? 0}
                  initialReview={userRating?.review_text ?? ''}
                  avgRating={course.average_rating ?? 0}
                  ratingsCount={course.ratings_count ?? 0}
                  onRatingSubmit={async () => {
                    // Recompute average from content_ratings and write back to courses
                    const { data: ratings } = await supabase
                      .from('content_ratings')
                      .select('rating')
                      .eq('content_type', 'course')
                      .eq('content_id', course.id);
                    if (ratings && ratings.length > 0) {
                      const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
                      await supabase
                        .from('courses')
                        .update({ average_rating: Math.round(avg * 10) / 10, ratings_count: ratings.length })
                        .eq('id', course.id);
                      setCourse(prev => prev ? { ...prev, average_rating: Math.round(avg * 10) / 10, ratings_count: ratings.length } : prev);
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Syllabus */}
          {journeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Syllabus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {journeys.map((journey, index) => (
                  <div
                    key={journey.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-semibold text-gray-500">
                            Module {index + 1}
                          </span>
                          {journey.item_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {journey.item_count} {journey.item_count === 1 ? 'lesson' : 'lessons'}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {journey.title}
                        </h4>
                        {journey.description && (
                          <p className="text-sm text-gray-600">
                            {journey.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Leader */}
          <Card>
            <CardHeader>
              <CardTitle>Course Leader</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {course.instructor_avatar_url ? (
                  <img
                    src={course.instructor_avatar_url}
                    alt={course.instructor_name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {course.instructor_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {course.instructor_name}
                  </h4>
                  {course.instructor_bio && (
                    <p className="text-sm text-gray-600 mt-1">
                      {course.instructor_bio}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}