import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Presentation, X } from 'lucide-react';
import { useProgramContext } from '@/hooks/useProgramContext';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ProgramContextBanner } from '@/app/components/shared/ProgramContextBanner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { YouTubeInput } from '@/app/components/ui/youtube-embed';

export default function CreatePitchPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { programContext, clearContext } = useProgramContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pitchUrl, setPitchUrl] = useState('');
  const [sponsorId, setSponsorId] = useState<string>('none');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('Unable to create pitch');
      return;
    }

    if (!name.trim()) {
      toast.error('Pitch name is required');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(name);

      const pitchData = {
        name: name.trim(),
        description: description.trim(),
        long_description: longDescription.trim() || null,
        slug,
        visibility,
        cover_image: coverImage.trim() || null,
        tags,
        created_by: profile.id,
        admin_ids: [profile.id], // Creator is automatically an admin
        member_ids: [profile.id], // Creator is automatically a member
        favorites: [],
        sponsor_id: sponsorId === 'none' ? null : sponsorId,
        video_url: videoUrl.trim() || null,
        url: pitchUrl.trim() || null,
      };

      const { error } = await supabase
        .from('pitches')
        .insert([pitchData]);

      if (error) throw error;

      toast.success('Pitch created successfully!');
      navigate(`/pitches/${slug}`);
    } catch (error: any) {
      console.error('Error creating pitch:', error);
      if (error.code === '23505') {
        toast.error('A pitch with this name already exists');
      } else {
        toast.error('Failed to create pitch');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSponsors = async () => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*');

      if (error) {
        console.error('Error fetching sponsors:', error);
        toast.error('Failed to fetch sponsors');
      } else {
        setSponsors(data || []);
      }
    };

    fetchSponsors();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Pitches', path: '/pitches' },
        { label: 'Create Pitch' }
      ]} />
      
      <ProgramContextBanner context={programContext} onClear={clearContext} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/pitches">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pitches
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Presentation className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Pitch</h1>
        </div>
        <p className="text-gray-600">
          Create a new pitch to showcase your idea or project
        </p>
      </div>

      {/* Quick Start Tools */}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Pitch Details</CardTitle>
          <CardDescription>
            Provide information about your pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Pitch Name *</Label>
              <Input
                id="name"
                name="pitch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., AI-Powered Learning Platform"
                autoComplete="off"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Short Description *</Label>
              <Textarea
                id="description"
                name="pitch-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief overview of your pitch (shown in cards)..."
                autoComplete="off"
                rows={3}
                required
              />
            </div>

            {/* Long Description */}
            <div className="space-y-2">
              <Label htmlFor="longDescription">Full Description</Label>
              <Textarea
                id="longDescription"
                name="pitch-long-description"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Detailed description of your pitch (shown on detail page)..."
                autoComplete="off"
                rows={6}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                name="pitch-cover-image"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoComplete="off"
              />
              <p className="text-sm text-gray-500">
                Optional: Provide a URL to an image for your pitch
              </p>
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <YouTubeInput
                value={videoUrl}
                onChange={setVideoUrl}
                label="Pitch Video (optional)"
                placeholder="https://www.youtube.com/watch?v=..."
                showPreview={true}
              />
              <p className="text-sm text-gray-500">
                Add a YouTube video to showcase your pitch
              </p>
            </div>

            {/* Pitch URL */}
            <div className="space-y-2">
              <Label htmlFor="pitchUrl">Pitch URL (optional)</Label>
              <Input
                id="pitchUrl"
                name="pitch-url"
                type="url"
                value={pitchUrl}
                onChange={(e) => setPitchUrl(e.target.value)}
                placeholder="https://example.com/pitch"
                autoComplete="off"
              />
              <p className="text-sm text-gray-500">
                Add a URL to your pitch's landing page or website
              </p>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Anyone can view</SelectItem>
                  <SelectItem value="member">Members Only — Only logged-in members</SelectItem>
                  <SelectItem value="unlisted">Unlisted — Only with direct link</SelectItem>
                  <SelectItem value="private">Private — Only invited members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags (press Enter)"
                />
                <Button type="button" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="pl-2 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Sponsor */}
            <div className="space-y-2">
              <Label htmlFor="sponsorId">Sponsor</Label>
              <Select value={sponsorId || 'none'} onValueChange={(value: any) => setSponsorId(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sponsor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sponsor</SelectItem>
                  {sponsors.map((sponsor) => (
                    <SelectItem key={sponsor.id} value={sponsor.id}>
                      {sponsor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Pitch'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/pitches')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}