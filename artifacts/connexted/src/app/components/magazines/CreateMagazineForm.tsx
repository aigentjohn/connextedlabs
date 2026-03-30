import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Switch } from '@/app/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { TopicSelector } from '@/app/components/unified/TopicSelector';
import { AlertCircle, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Link } from 'react-router';

export default function CreateMagazineForm() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    cover_image_url: '',
    visibility: 'public' as 'public' | 'member' | 'unlisted' | 'private',
    is_auto_curated: false,
    update_frequency: 'weekly',
  });
  
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user edits
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    if (!formData.tagline.trim()) {
      newErrors.tagline = 'Tagline is required';
    } else if (formData.tagline.length < 10) {
      newErrors.tagline = 'Tagline must be at least 10 characters';
    } else if (formData.tagline.length > 200) {
      newErrors.tagline = 'Tagline must be less than 200 characters';
    }
    
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    if (selectedTopicIds.length === 0) {
      newErrors.topics = 'Select at least one topic';
    } else if (selectedTopicIds.length > 5) {
      newErrors.topics = 'Select no more than 5 topics';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (!profile?.id) {
      toast.error('You must be logged in to create a magazine');
      return;
    }
    
    try {
      setLoading(true);

      // Create magazine
      const { data: magazine, error: magazineError } = await supabase
        .from('magazines')
        .insert({
          name: formData.title.trim(),
          slug: formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          tagline: formData.tagline.trim(),
          description: formData.description.trim() || '',
          cover_image_url: formData.cover_image_url.trim() || null,
          curator_id: profile.id,
          owner_type: 'user',
          owner_id: profile.id,
          curation_type: formData.is_auto_curated ? 'auto' : 'curated',
          publishing_frequency: formData.update_frequency || null,
          visibility: formData.visibility,
          status: 'active',
        })
        .select()
        .single();

      if (magazineError) throw magazineError;

      // Link topics to magazine
      if (selectedTopicIds.length > 0) {
        const topicLinks = selectedTopicIds.map(topicId => ({
          magazine_id: magazine.id,
          topic_id: topicId,
        }));

        const { error: topicsError } = await supabase
          .from('magazine_topics')
          .insert(topicLinks);

        if (topicsError) throw topicsError;
      }

      // If auto-curated, trigger initial curation (we'll implement this later)
      if (formData.is_auto_curated) {
        // TODO: Call auto-curation function
        console.log('Auto-curation will be triggered for topics:', selectedTopicIds);
      }

      toast.success('Magazine created successfully!');
      navigate(`/magazines/${magazine.id}`);
      
    } catch (error: any) {
      console.error('Error creating magazine:', error);
      toast.error(error.message || 'Failed to create magazine');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Magazines', href: '/magazines' },
          { label: 'Create Magazine' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/magazines">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create a Magazine</h1>
          <p className="text-muted-foreground mt-1">
            Curate a collection of blog posts organized by topics
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your magazine a title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">
                Magazine Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., The Startup Digest"
                maxLength={100}
                disabled={loading}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Tagline */}
            <div>
              <Label htmlFor="tagline">
                Tagline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tagline"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="A one-line pitch for your magazine (10-200 chars)"
                maxLength={200}
                disabled={loading}
              />
              {errors.tagline && (
                <p className="text-sm text-red-500 mt-1">{errors.tagline}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formData.tagline.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what readers will find in this magazine..."
                rows={4}
                maxLength={1000}
                disabled={loading}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {/* Cover Image */}
            <div>
              <Label htmlFor="cover_image_url">Cover Image URL (Optional)</Label>
              <Input
                id="cover_image_url"
                name="cover_image_url"
                value={formData.cover_image_url}
                onChange={handleChange}
                placeholder="https://example.com/cover-image.jpg"
                type="url"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                URL to an image that represents your magazine
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardDescription>
              Select topics that define what this magazine is about (1-5 topics)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopicSelector
              value={selectedTopicIds}
              onChange={setSelectedTopicIds}
              maxTopics={5}
            />
            {errors.topics && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.topics}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Magazine Settings</CardTitle>
            <CardDescription>
              Configure visibility and curation options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visibility */}
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: any) => 
                  setFormData(prev => ({ ...prev, visibility: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public - Anyone can view
                  </SelectItem>
                  <SelectItem value="member">
                    Members Only - Only community members can view
                  </SelectItem>
                  <SelectItem value="unlisted">
                    Unlisted - Only those with the link can view
                  </SelectItem>
                  <SelectItem value="private">
                    Private - Only you and invited editors can view
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto-Curation */}
            <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <Label htmlFor="is_auto_curated" className="font-semibold">
                    Auto-Curation
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Automatically include new blogs tagged with your selected topics
                </p>
              </div>
              <Switch
                id="is_auto_curated"
                checked={formData.is_auto_curated}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_auto_curated: checked }))
                }
                disabled={loading}
              />
            </div>

            {/* Update Frequency */}
            <div>
              <Label htmlFor="update_frequency">Update Frequency (Optional)</Label>
              <Select
                value={formData.update_frequency}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, update_frequency: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as-needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                How often do you plan to add new content?
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link to="/magazines">
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Magazine
          </Button>
        </div>
      </form>
    </div>
  );
}