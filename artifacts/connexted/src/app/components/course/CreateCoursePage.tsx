import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/app/components/ui/breadcrumb';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Home, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { canManagePrograms } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [creating, setCreating] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);

  useEffect(() => {
    if (profile && !canManagePrograms(profile.role)) {
      toast.error('You do not have permission to create courses');
      navigate('/courses'); // Redirect to courses list or dashboard
    }
  }, [profile, navigate]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pricing_type: 'free' as 'free' | 'paid' | 'members-only',
    price_cents: 0,
    access_level: 'public' as 'public' | 'member' | 'unlisted' | 'private',
    instructor_name: profile?.full_name || '',
    instructor_bio: '',
    convertkit_product_id: '', // ConvertKit Commerce integration
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    if (!profile) {
      toast.error('You must be logged in to create a course');
      return;
    }

    setCreating(true);
    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingCourse) {
        toast.error('A course with this title already exists. Please use a different title.');
        setCreating(false);
        return;
      }

      // Create course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          slug,
          title: formData.title,
          description: formData.description,
          category: null,
          difficulty_level: 'beginner',
          pricing_type: formData.pricing_type,
          price_cents: formData.pricing_type === 'paid' ? formData.price_cents : 0,
          currency: 'USD',
          access_level: formData.access_level,
          instructor_id: profile.id,
          instructor_name: formData.instructor_name,
          instructor_bio: formData.instructor_bio,
          instructor_avatar_url: profile.avatar_url || null,
          created_by: profile.id,
          is_published: false,
          featured: false,
          enrollment_count: 0,
          total_lessons: 0,
          average_rating: 0,
          convertkit_product_id: formData.convertkit_product_id || null, // Add ConvertKit integration
          tags: tags,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Link topics if any selected
      if (topicIds.length > 0) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics/link`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: profile.id,
                entityType: 'course',
                entityId: course.id,
                topicIds: topicIds,
              }),
            }
          );
        } catch (error) {
          console.error('Error linking topics:', error);
        }
      }

      toast.success(`Course "${formData.title}" created successfully!`);
      
      // Redirect to course admin setup to add journeys and content
      navigate(`/course-admin/${course.id}/setup`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/instructor/dashboard">Course Leader Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Course</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Create a New Course
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Set up your course basics. You'll add lessons, videos, quizzes, and content in the next step.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleCreateCourse}>
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Course Information
              </CardTitle>
              <CardDescription>
                Basic details about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Entrepreneurship"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What will students learn in this course?"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Topics (Who/Why)</Label>
                    <TopicSelector
                      value={topicIds}
                      onChange={setTopicIds}
                      maxTopics={5}
                      placeholder="Select topics..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tags (What/How)</Label>
                    <TagSelector
                      value={tags}
                      onChange={setTags}
                      contentType="course"
                      title={formData.title}
                      description={formData.description}
                      placeholder="Add tags..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-gray-900">Pricing & Access</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pricing_type">Pricing Type</Label>
                    <Select
                      value={formData.pricing_type}
                      onValueChange={(value) => handleInputChange('pricing_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="members-only">Members Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.pricing_type === 'paid' && (
                    <div>
                      <Label htmlFor="price">Price (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="99.00"
                        value={formData.price_cents / 100}
                        onChange={(e) => handleInputChange('price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="access_level">Visibility</Label>
                    <Select
                      value={formData.access_level}
                      onValueChange={(value) => handleInputChange('access_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public — Anyone can view</SelectItem>
                        <SelectItem value="member">Members Only — Logged-in members</SelectItem>
                        <SelectItem value="unlisted">Unlisted — Only with direct link</SelectItem>
                        <SelectItem value="private">Private — Invite only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ConvertKit Integration */}
                {formData.pricing_type === 'paid' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">💳 ConvertKit Commerce Integration</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Connect this course to a ConvertKit Commerce product to enable payments
                    </p>
                    <Label htmlFor="convertkit_product_id">ConvertKit Product ID</Label>
                    <Input
                      id="convertkit_product_id"
                      placeholder="e.g., 12345678"
                      value={formData.convertkit_product_id}
                      onChange={(e) => handleInputChange('convertkit_product_id', e.target.value)}
                      className="bg-white"
                    />
                    <p className="text-xs text-blue-600 mt-2">
                      Find this in your ConvertKit Commerce product settings. When set, the "Enroll" button will redirect to ConvertKit for payment.
                    </p>
                  </div>
                )}
              </div>

              {/* Instructor Info */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-gray-900">Course Leader</h3>
                
                <div>
                  <Label htmlFor="instructor_name">Course Leader Name</Label>
                  <Input
                    id="instructor_name"
                    placeholder="Your name"
                    value={formData.instructor_name}
                    onChange={(e) => handleInputChange('instructor_name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="instructor_bio">Course Leader Bio</Label>
                  <Textarea
                    id="instructor_bio"
                    placeholder="Brief bio about the course leader..."
                    value={formData.instructor_bio}
                    onChange={(e) => handleInputChange('instructor_bio', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/instructor/dashboard')}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Course & Add Content
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}