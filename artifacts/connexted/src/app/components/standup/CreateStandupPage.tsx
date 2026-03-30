import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, MessageSquare, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function CreateStandupPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customQuestion, setCustomQuestion] = useState("What's your status?");
  const [visibility, setVisibility] = useState<'public' | 'members_only'>('public');
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
      toast.error('Unable to create standup');
      return;
    }

    if (!name.trim()) {
      toast.error('Standup name is required');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(name);

      const standupData = {
        name: name.trim(),
        description: description.trim(),
        custom_question: customQuestion.trim() || "What's your status?",
        slug,
        visibility,
        cover_image: coverImage.trim() || null,
        tags,
        created_by: profile.id,
        admin_ids: [profile.id], // Creator is automatically an admin
        member_ids: [profile.id], // Creator is automatically a member
      };

      const { error } = await supabase
        .from('standups')
        .insert([standupData]);

      if (error) throw error;

      toast.success('Standup created successfully!');
      navigate(`/standups/${slug}`);
    } catch (error: any) {
      console.error('Error creating standup:', error);
      if (error.code === '23505') {
        toast.error('A standup with this name already exists');
      } else {
        toast.error('Failed to create standup');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Standups', path: '/standups' },
        { label: 'Create Standup' }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/standups">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Standups
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Standup</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Standup Details</CardTitle>
            <CardDescription>
              Create a standup where team members can share daily updates and progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Standup Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Daily Engineering Standup"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share what you're working on, blockers, and wins"
                rows={4}
              />
            </div>

            {/* Custom Question */}
            <div className="space-y-2">
              <Label htmlFor="customQuestion">
                Custom Question
                <span className="text-sm text-gray-500 ml-2 font-normal">
                  (This is what members will be prompted to answer)
                </span>
              </Label>
              <Input
                id="customQuestion"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="What's your status?"
              />
              <p className="text-xs text-gray-500">
                Examples: "What are you working on today?", "What did you accomplish?", "What's blocking you?"
              </p>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can view and join</SelectItem>
                  <SelectItem value="members_only">Members Only - Only members can view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
              <Input
                id="coverImage"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
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
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="pl-2 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
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
                {loading ? 'Creating...' : 'Create Standup'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/standups')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}