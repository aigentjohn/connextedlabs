import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Hammer, X } from 'lucide-react';
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

export default function CreateBuildPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { context: programContext, clearContext } = useProgramContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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
      toast.error('Unable to create build');
      return;
    }

    if (!name.trim()) {
      toast.error('Build name is required');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(name);

      const buildData = {
        name: name.trim(),
        description: description.trim(),
        slug,
        visibility,
        tags,
        created_by: profile.id,
        admin_ids: [profile.id], // Creator is automatically an admin
        member_ids: [profile.id], // Creator is automatically a member
        ...(programContext && {
          program_id: programContext.program_id,
          program_journey_id: programContext.program_journey_id,
        }),
      };

      const { error } = await supabase
        .from('builds')
        .insert([buildData]);

      if (error) throw error;

      // Clear program context after successful creation
      if (programContext) {
        clearContext();
      }

      toast.success('Build created successfully!');
      navigate(`/builds/${slug}`);
    } catch (error: any) {
      console.error('Error creating build:', error);
      if (error.code === '23505') {
        toast.error('A build with this name already exists');
      } else {
        toast.error('Failed to create build');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Builds', path: '/builds' },
        { label: 'Create Build' }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/builds">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Builds
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Hammer className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Build</h1>
        </div>
        <p className="text-gray-600">
          Create a new build to organize documents and reviews for your project
        </p>
      </div>

      {/* Program Context Banner */}
      {programContext && (
        <ProgramContextBanner context={programContext} onClear={clearContext} />
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Build Details</CardTitle>
          <CardDescription>
            Provide information about your build
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Build Name *</Label>
              <Input
                id="name"
                name="build-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mobile App Redesign"
                autoComplete="off"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="build-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this build is about..."
                autoComplete="off"
                rows={4}
              />
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

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Build'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/builds')}
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