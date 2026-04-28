import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { BookOpen, Search } from 'lucide-react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { toast } from 'sonner';
import { LikeButton } from '@/app/components/engagement/LikeButton';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_avatar_url: string | null;
  pricing_type: 'free' | 'paid' | 'members-only';
  price_cents: number;
  is_published: boolean;
  featured: boolean;
  circle_ids: string[];
  created_at: string;
  tags: string[] | null;
}

export default function CoursesPage() {
  const { profile } = useAuth();
  const { circleId } = useParams<{ circleId?: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(false);
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likeCountsMap, setLikeCountsMap] = useState<Record<string, number>>({});
  const [likedByMeSet, setLikedByMeSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCourses();
  }, [circleId]);

  useEffect(() => {
    if (profile) {
      fetchEnrollments();
    }
  }, [profile]);

  const fetchEnrollments = async () => {
    if (!profile) return;

    try {
      const [legacyResult, ticketResult] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', profile.id),
        supabase
          .from('access_tickets')
          .select('container_id')
          .eq('user_id', profile.id)
          .eq('container_type', 'course')
          .eq('is_active', true),
      ]);

      const ids = new Set<string>();
      (legacyResult.data || []).forEach(e => ids.add(e.course_id));
      (ticketResult.data || []).forEach(t => t.container_id && ids.add(t.container_id));
      setSubscribedCourseIds(ids);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('courses')
        .select('id, slug, title, description, instructor_name, instructor_avatar_url, pricing_type, price_cents, is_published, featured, circle_ids, created_at, tags')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by circle if viewing circle-scoped courses
      if (circleId) {
        query = query.contains('circle_ids', [circleId]);
      }

      const { data, error } = await query;
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.warn('Courses table not yet created.');
          toast.info('Courses feature coming soon! Database setup pending.');
          setCourses([]);
          return;
        }
        throw error;
      }

      const courseList = data || [];
      setCourses(courseList);

      // Fetch likes for all courses
      if (courseList.length > 0 && profile) {
        const ids = courseList.map(c => c.id);
        const { data: likesData } = await supabase
          .from('content_likes')
          .select('content_id, user_id')
          .eq('content_type', 'course')
          .in('content_id', ids);

        const counts: Record<string, number> = {};
        const likedMe = new Set<string>();
        (likesData || []).forEach((like: { content_id: string; user_id: string }) => {
          counts[like.content_id] = (counts[like.content_id] || 0) + 1;
          if (like.user_id === profile.id) likedMe.add(like.content_id);
        });
        setLikeCountsMap(counts);
        setLikedByMeSet(likedMe);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search and filters
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      searchQuery === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPricing = 
      selectedPricing === 'all' || course.pricing_type === selectedPricing;

    const matchesSubscribed = 
      !showSubscribedOnly || subscribedCourseIds.has(course.id);

    return matchesSearch && matchesPricing && matchesSubscribed;
  }).sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (sortBy === 'most-liked') return (likeCountsMap[b.id] || 0) - (likeCountsMap[a.id] || 0);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const featuredCourses = filteredCourses.filter(c => c.featured);
  const regularCourses = filteredCourses.filter(c => !c.featured);

  // Recommended: score courses by tag overlap with user profile (client-side, no schema change)
  const recommendedCourses = (() => {
    if (!profile || !courses.length) return [];
    const profileTerms = new Set<string>(
      [
        ...(profile.interests ?? []),
        profile.career_stage ?? '',
      ].filter(Boolean).map(t => t.toLowerCase())
    );
    if (profileTerms.size === 0) return [];
    return courses
      .filter(c => !subscribedCourseIds.has(c.id)) // hide already-enrolled
      .map(c => ({
        course: c,
        score: (c.tags ?? []).filter(t => profileTerms.has(t.toLowerCase())).length,
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ course }) => course);
  })();

  const getPriceDisplay = (course: Course) => {
    if (course.pricing_type === 'free') {
      return <Badge className="bg-green-600">Free</Badge>;
    } else if (course.pricing_type === 'members-only') {
      return <Badge variant="outline">Members Only</Badge>;
    } else {
      const price = (course.price_cents / 100).toFixed(2);
      return <span className="font-bold text-lg">${price}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Courses' }]}
        icon={BookOpen}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="Course Catalog"
        description="Learn at your own pace with self-paced courses"
      />

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Subscribed Only Filter */}
            <div className="flex items-center space-x-2 h-10">
              <Checkbox 
                id="subscribed-filter" 
                checked={showSubscribedOnly}
                onCheckedChange={(checked) => setShowSubscribedOnly(!!checked)}
              />
              <Label htmlFor="subscribed-filter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                My Courses
              </Label>
            </div>
          </div>

          {/* Pricing Filter */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button
              variant={selectedPricing === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPricing('all')}
            >
              All Courses
            </Button>
            <Button
              variant={selectedPricing === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPricing('free')}
            >
              Free
            </Button>
            <Button
              variant={selectedPricing === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPricing('paid')}
            >
              Paid
            </Button>
            <Button
              variant={selectedPricing === 'members-only' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPricing('members-only')}
            >
              Members Only
            </Button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-500">Sort:</span>
            <Button variant={sortBy === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('newest')}>Newest</Button>
            <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('oldest')}>Oldest</Button>
            <Button variant={sortBy === 'most-liked' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-liked')}>Most Liked</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading courses...
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {courses.length === 0 ? 'No Courses Available Yet' : 'No Courses Found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {courses.length === 0
                ? 'Check back soon for new learning opportunities!'
                : 'Try adjusting your search or filters'}
            </p>
            {searchQuery || selectedPricing !== 'all' || showSubscribedOnly ? (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPricing('all');
                  setShowSubscribedOnly(false);
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Recommended for You */}
          {recommendedCourses.length > 0 && !showSubscribedOnly && searchQuery === '' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Recommended for You</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recommendedCourses.map((course) => (
                  <div key={course.id} className="min-w-[280px]">
                    <CourseCard
                      course={course}
                      getPriceDisplay={getPriceDisplay}
                      likeCount={likeCountsMap[course.id] || 0}
                      isLiked={likedByMeSet.has(course.id)}
                      userId={profile?.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured Courses */}
          {featuredCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Featured Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    getPriceDisplay={getPriceDisplay}
                    likeCount={likeCountsMap[course.id] || 0}
                    isLiked={likedByMeSet.has(course.id)}
                    userId={profile?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Courses */}
          {regularCourses.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {featuredCourses.length > 0 ? 'All Courses' : `${filteredCourses.length} Courses Available`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    getPriceDisplay={getPriceDisplay}
                    likeCount={likeCountsMap[course.id] || 0}
                    isLiked={likedByMeSet.has(course.id)}
                    userId={profile?.id}
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

// Course Card Component
function CourseCard({
  course,
  getPriceDisplay,
  likeCount,
  isLiked,
  userId,
}: {
  course: Course;
  getPriceDisplay: (course: Course) => React.ReactNode;
  likeCount?: number;
  isLiked?: boolean;
  userId?: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
      <Link to={`/courses/${course.slug}`} className="flex-1 flex flex-col">
        {/* Gradient Header */}
        <div className="w-full h-36 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-white opacity-50" />
        </div>

        <CardHeader className="flex-grow">
          <div className="flex items-start justify-between gap-2 mb-1">
            {getPriceDisplay(course)}
            {course.featured && <Badge className="bg-yellow-500">Featured</Badge>}
          </div>
          
          <CardTitle className="line-clamp-2 mb-2">{course.title}</CardTitle>
          <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>

          {/* Course Leader */}
          <div className="flex items-center gap-2 mt-3">
            {course.instructor_avatar_url ? (
              <img
                src={course.instructor_avatar_url}
                alt={course.instructor_name}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-600">
                  {course.instructor_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700">{course.instructor_name}</span>
          </div>
        </CardHeader>
      </Link>

      <CardContent className="pt-0 space-y-3">
        {/* Like Button */}
        <LikeButton
          contentType="course"
          contentId={course.id}
          initialIsLiked={isLiked ?? false}
          initialLikesCount={likeCount ?? 0}
          userId={userId}
          size="sm"
        />
        <Link to={`/courses/${course.slug}`}>
          <Button size="sm" className="w-full">View Course</Button>
        </Link>
      </CardContent>
    </Card>
  );
}