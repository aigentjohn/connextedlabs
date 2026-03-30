// Split candidate: ~572 lines — consider extracting SetupStepsChecklist, ProgramOverviewCard, and SetupActionPanel into sub-components.
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { 
  FolderKanban, Map, TrendingUp, Database, Settings, Eye, 
  Plus, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import JourneyManagement from '@/app/components/admin/JourneyManagement';
import JourneyProgressAnalytics from '@/app/components/admin/JourneyProgressAnalytics';
import ProgramAuditView from '@/app/components/admin/ProgramAuditView';
import { ExportImportManager } from '@/app/components/ExportImportManager';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  member_ids: string[];
  admin_ids: string[];
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  is_published: boolean;
  instructor_id: string;
  created_by: string;
  enrollment_count: number;
  created_at: string;
}

interface Journey {
  id: string;
  program_id: string;
  name: string;
  description: string;
  order_index: number;
  status: string;
  circle_id: string | null;
}

export default function ProgramSetupDashboard() {
  const { programId } = useParams<{ programId: string }>();
  const { courseId } = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const contentType = courseId ? 'course' : 'program';
  const contentId = courseId || programId;
  const contentData = course || program;

  useEffect(() => {
    if ((programId || courseId) && profile) {
      fetchData();
    }
  }, [programId, courseId, profile]);

  const fetchData = async () => {
    if ((!programId && !courseId) || !profile) return;

    try {
      setLoading(true);

      if (courseId) {
        // Fetch course data
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) {
          if (courseError.code === 'PGRST116') {
            // Course not found
            console.error('Course not found:', courseId);
            toast.error('Course not found');
            setCourse(null);
            setLoading(false);
            return;
          }
          throw courseError;
        }

        // Verify instructor access
        const isInstructor = courseData.instructor_id === profile.id || 
                           courseData.created_by === profile.id || 
                           (profile.role && hasRoleLevel(profile.role, ROLES.ADMIN));
        if (!isInstructor) {
          toast.error('You do not have access to manage this course');
          setCourse(null);
          setLoading(false);
          return;
        }

        setCourse(courseData);

        // Fetch course journeys
        const { data: journeysData, error: journeysError } = await supabase
          .from('program_journeys')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });

        if (journeysError) {
          if (journeysError.code === 'PGRST116' || journeysError.code === 'PGRST204' || journeysError.code === 'PGRST205') {
            // No journeys found or table doesn't exist
            console.log('No journeys found for course');
            setJourneys([]);
          } else {
            throw journeysError;
          }
        } else {
          setJourneys(journeysData || []);
        }

      } else if (programId) {
        // Fetch program data
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) {
          if (programError.code === 'PGRST116') {
            // Program not found - might be a course ID, let's check
            console.error('Program not found:', programId);
            
            // Check if this ID is actually a course
            const { data: courseCheck, error: courseCheckError } = await supabase
              .from('courses')
              .select('id, slug')
              .eq('id', programId)
              .single();
            
            if (!courseCheckError && courseCheck) {
              // It's a course! Redirect to the correct course-admin route
              console.log('Found course with this ID, redirecting to course-admin route');
              toast.info('Redirecting to course management...');
              navigate(`/course-admin/${courseCheck.id}/setup`, { replace: true });
              return;
            }
            
            toast.error('Program not found');
            setProgram(null);
            setLoading(false);
            return;
          }
          throw programError;
        }

        // Verify admin access
        const isAdmin = programData.admin_ids?.includes(profile.id) || profile.role === 'super';
        if (!isAdmin) {
          toast.error('You do not have admin access to this program');
          setProgram(null);
          setLoading(false);
          return;
        }

        setProgram(programData);

        // Fetch program journeys
        const { data: journeysData, error: journeysError } = await supabase
          .from('program_journeys')
          .select('*')
          .eq('program_id', programId)
          .order('order_index', { ascending: true });

        if (journeysError) {
          if (journeysError.code === 'PGRST116' || journeysError.code === 'PGRST204' || journeysError.code === 'PGRST205') {
            // No journeys found or table doesn't exist
            console.log('No journeys found for program');
            setJourneys([]);
          } else {
            throw journeysError;
          }
        } else {
          setJourneys(journeysData || []);
        }
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      
      // Handle specific error cases
      if (error.code === 'PGRST116') {
        toast.error(courseId ? 'Course not found' : 'Program not found');
      } else if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205') {
        toast.error('Database table not found. Please run database migrations.');
      } else {
        toast.error('Failed to load data: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!contentData) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">{contentType === 'course' ? 'Course' : 'Program'} not found or access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contentName = course ? course.title : program?.name || '';
  const contentSlug = contentData.slug;
  const contentStatus = course ? (course.is_published ? 'published' : 'draft') : program?.status || '';
  const memberCount = course ? course.enrollment_count : program?.member_ids?.length || 0;
  const adminCount = course ? 1 : program?.admin_ids?.length || 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: contentType === 'course' ? 'Course Admin' : 'Program Admin', href: contentType === 'course' ? '/instructor/dashboard' : '/program-admin' },
          { label: contentName, href: contentType === 'course' ? `/courses/${contentSlug}` : `/programs/${contentSlug}` },
          { label: 'Setup & Content' }
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {contentName} - Setup & Content
            </h1>
            <p className="text-gray-600">
              Manage journeys, lessons, and {contentType === 'course' ? 'course' : 'program'} content
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={contentType === 'course' ? `/courses/${contentSlug}` : `/programs/${contentSlug}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View {contentType === 'course' ? 'Course' : 'Program'}
              </Button>
            </Link>
            {contentType === 'course' ? (
              <Link to={`/instructor/courses/${contentSlug}`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            ) : (
              <Link to={`/programs/${contentSlug}/settings`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={contentStatus === 'published' ? 'default' : 'secondary'}>
                {contentStatus}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {contentType === 'course' ? 'Students' : 'Attenders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Journeys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{journeys.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {contentType === 'course' ? 'Course Leader' : 'Program Leaders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminCount}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="journeys" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Journeys
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progress & Analytics
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup & Restore
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Overview</CardTitle>
              <CardDescription>
                Quick overview of your program's structure and content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-600">{contentData.description || 'No description provided'}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Journeys Structure</h3>
                  {journeys.length === 0 ? (
                    <p className="text-gray-500 text-sm">No journeys created yet. Add journeys to organize your program content.</p>
                  ) : (
                    <div className="space-y-2">
                      {journeys.map((journey, index) => (
                        <div key={journey.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{journey.name}</div>
                            <div className="text-sm text-gray-600">{journey.description}</div>
                          </div>
                          <Badge variant="outline">{journey.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => setActiveTab('journeys')}
                    >
                      <Map className="w-4 h-4 mr-2" />
                      Manage Journeys
                    </Button>
                    {programId && (
                      <Link to={`/program-admin/${programId}/sessions`} className="w-full">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Manage Sessions
                        </Button>
                      </Link>
                    )}
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => setActiveTab('audit')}
                    >
                      <FolderKanban className="w-4 h-4 mr-2" />
                      Run Audit
                    </Button>
                    <Link to={`/programs/${contentData.slug}/settings`} className="w-full">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="w-4 h-4 mr-2" />
                        Program Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  About Journey-Based Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Programs are now organized into Journeys - structured learning paths that help attenders progress through your content.
                  Each journey can have its own circle for group discussions and multiple content items like videos, articles, and exercises.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Completion tracking is now done at the journey level, allowing you to see which attenders are progressing through each journey
                  and which content items they've completed. Use the Analytics tab to view detailed progress reports.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journeys">
          <JourneyManagement 
            programId={programId}
            courseId={courseId}
            journeys={journeys}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="analytics">
          {programId && (
            <JourneyProgressAnalytics 
              programId={programId}
              program={program}
              journeys={journeys}
            />
          )}
          {courseId && (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Course Analytics Coming Soon
                </h3>
                <p className="text-gray-600">
                  Detailed analytics for course enrollments and student progress will be available soon.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backup">
          {courseId && (
            <ExportImportManager 
              entityType="course"
              entityId={courseId}
              entityName={contentName}
              courseId={courseId}
              onImportComplete={() => {
                toast.success('Course imported successfully!');
                refreshData();
              }}
            />
          )}
          {programId && (
            <ExportImportManager 
              entityType="program"
              entityId={programId}
              entityName={contentName}
              programId={programId}
              onImportComplete={() => {
                toast.success('Program imported successfully!');
                refreshData();
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="audit">
          {programId && (
            <ProgramAuditView 
              programId={programId}
              program={program}
              journeys={journeys}
            />
          )}
          {courseId && (
            <Card>
              <CardContent className="py-12 text-center">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Course Audit Coming Soon
                </h3>
                <p className="text-gray-600">
                  Audit and data integrity tools for courses will be available soon.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}