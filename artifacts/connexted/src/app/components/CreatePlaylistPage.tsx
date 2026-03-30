import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, PlayCircle, X } from 'lucide-react';
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

export default function CreatePlaylistPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { context: programContext, clearContext } = useProgramContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
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
      toast.error('Unable to create playlist');
      return;
    }

    if (!name.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(name);

      const playlistData = {
        name: name.trim(),
        description: description.trim(),
        slug,
        visibility,
        tags,
        cover_image: coverImage || null,
        created_by: profile.id,
        author_id: profile.id,
        member_ids: [profile.id], // Creator is automatically a member
        ...(programContext && {
          program_id: programContext.program_id,
          program_journey_id: programContext.program_journey_id,
        }),
      };

      const { error } = await supabase
        .from('playlists')
        .insert([playlistData]);

      if (error) throw error;

      // Clear program context after successful creation
      if (programContext) {
        clearContext();
      }

      toast.success('Playlist created successfully!');
      navigate(`/playlists/${slug}`);
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      if (error.code === '23505') {
        toast.error('A playlist with this name already exists');
      } else {
        toast.error('Failed to create playlist');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Playlists', path: '/playlists' },
        { label: 'Create Playlist' }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/playlists">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Playlists
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <PlayCircle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Playlist</h1>
        </div>
        <p className="text-gray-600">
          Create a new playlist to organize episodes for your community
        </p>
      </div>

      {/* Program Context Banner */}
      {programContext && (
        <ProgramContextBanner 
          context={programContext} 
          onClear={clearContext}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Playlist Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Getting Started with React"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will members learn from this playlist?"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can view</SelectItem>
                  <SelectItem value="member">Members Only - Members can view</SelectItem>
                  <SelectItem value="unlisted">Unlisted - Only shared link can view</SelectItem>
                  <SelectItem value="private">Private - Only you can view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/playlists')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Playlist'}
          </Button>
        </div>
      </form>
    </div>
  );
}