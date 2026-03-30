import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Table, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function CreateTablePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'member' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [sponsorId, setSponsorId] = useState<string>('none');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSponsors = async () => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*');

      if (error) {
        console.error('Error fetching sponsors:', error);
      } else {
        setSponsors(data || []);
      }
    };

    fetchSponsors();
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const generateSlug = (text: string) => {
    const baseSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return baseSlug + '-' + Math.random().toString(36).substring(2, 8);
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
      toast.error('Unable to create table');
      return;
    }

    if (!name.trim()) {
      toast.error('Table name is required');
      return;
    }

    setLoading(true);

    try {
      const slug = generateSlug(name);

      // Resolve community_id from profile or DB
      let resolvedCommunityId = (profile as any).community_id;
      if (!resolvedCommunityId) {
        const { data: userData } = await supabase
          .from('users')
          .select('community_id')
          .eq('id', profile.id)
          .single();
        resolvedCommunityId = userData?.community_id;
      }
      if (!resolvedCommunityId) {
        throw new Error('No community associated with user');
      }

      const tableData: Record<string, any> = {
        name: name.trim(),
        description: description.trim(),
        slug,
        visibility,
        cover_image: coverImage.trim() || null,
        tags,
        created_by: profile.id,
        admin_ids: [profile.id],
        member_ids: [profile.id],
        guest_ids: [],
        community_id: resolvedCommunityId,
      };

      // Only include sponsor_id if a sponsor was selected
      if (sponsorId && sponsorId !== 'none') {
        tableData.sponsor_id = sponsorId;
      }

      console.log('[CreateTable] Payload:', JSON.stringify(tableData, null, 2));

      // Use server endpoint to bypass RLS (server uses service role key)
      const serverUrl = 'https://' + projectId + '.supabase.co/functions/v1/make-server-d7930c7f/tables/create';

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + publicAnonKey,
        },
        body: JSON.stringify({ tableData }),
      });

      console.log('[CreateTable] Response status:', response.status);

      // Handle non-JSON responses (edge function crash, 502, etc.)
      const responseText = await response.text();
      console.log('[CreateTable] Response body:', responseText);

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error('Server returned non-JSON (status ' + response.status + '): ' + responseText.substring(0, 200));
      }

      if (!response.ok || !result.success) {
        const err = result.error;
        console.error('[CreateTable] Server error object:', err);

        if (err?.code === '23505') {
          toast.error('A table with this name already exists.');
          return;
        }

        // Extract the most useful error string from whatever shape the error is
        let errMsg = 'Unknown server error (status ' + response.status + ')';
        if (typeof err === 'string' && err.length > 0) {
          errMsg = err;
        } else if (err && typeof err === 'object') {
          errMsg = err.message || err.details || err.hint || JSON.stringify(err);
        }
        throw new Error(errMsg);
      }

      toast.success('Table created successfully!');
      navigate('/tables/' + (result.table?.slug || slug));
    } catch (error: any) {
      console.error('[CreateTable] Error:', error);
      toast.error(error.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Tables', path: '/tables' },
        { label: 'Create Table' }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/tables">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tables
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Table className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Create Table</h1>
        </div>
        <p className="text-gray-600">
          Create a new lightweight participation space organized by topic
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Table Details</CardTitle>
          <CardDescription>
            Provide information about your table to help people decide if they want to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Table Name *</Label>
              <Input
                id="name"
                name="table-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Strategy, Marketing Insights, Tech Trends"
                autoComplete="off"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="table-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this table is about, who should join, and what members can expect..."
                autoComplete="off"
                rows={4}
                required
              />
              <p className="text-sm text-gray-500">
                Help potential members understand if this table is right for them
              </p>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                name="table-cover-image"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoComplete="off"
              />
              <p className="text-sm text-gray-500">
                Optional: Provide a URL to an image for your table
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
                  <SelectItem value="public">Public — Anyone can view and join</SelectItem>
                  <SelectItem value="member">Members Only — Only logged-in members can view</SelectItem>
                  <SelectItem value="unlisted">Unlisted — Only with direct link</SelectItem>
                  <SelectItem value="private">Private — Invite only</SelectItem>
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
                  placeholder="Add tags to help people find this table (press Enter)"
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
                {loading ? 'Creating...' : 'Create Table'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tables')}
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