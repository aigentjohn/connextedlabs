import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useContentAuth } from '@/lib/content-auth';
import { supabase } from '@/lib/supabase';
import { createLibraryShareAnnouncement } from '@/lib/announcement-helper';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { X, Plus, Star } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

const REVIEW_CATEGORIES = [
  'Tool',
  'Book',
  'Course',
  'Service',
  'Product',
  'Other'
];

interface Circle {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
}

interface Container {
  id: string;
  name: string;
  type: string;
}

export default function AddReviewForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { userId, ownerFields } = useContentAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('Tool');
  const [rating, setRating] = useState(5);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedPitches, setSelectedPitches] = useState<string[]>([]);
  const [selectedBuilds, setSelectedBuilds] = useState<string[]>(() => {
    const buildId = searchParams.get('buildId');
    return buildId ? [buildId] : [];
  });
  const [selectedElevators, setSelectedElevators] = useState<string[]>([]);
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedStandups, setSelectedStandups] = useState<string[]>([]);
  const [selectedMeetups, setSelectedMeetups] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [userCircles, setUserCircles] = useState<Circle[]>([]);
  const [userTables, setUserTables] = useState<Table[]>([]);
  const [userPitches, setUserPitches] = useState<Container[]>([]);
  const [userBuilds, setUserBuilds] = useState<Container[]>([]);
  const [userElevators, setUserElevators] = useState<Container[]>([]);
  const [userMeetings, setUserMeetings] = useState<Container[]>([]);
  const [userLibraries, setUserLibraries] = useState<Container[]>([]);
  const [userEvents, setUserEvents] = useState<Container[]>([]);
  const [userStandups, setUserStandups] = useState<Container[]>([]);
  const [userMeetups, setUserMeetups] = useState<Container[]>([]);
  const [userDocuments, setUserDocuments] = useState<Container[]>([]);

  useEffect(() => {
    if (profile) {
      fetchUserContainers();
    }
  }, [profile]);

  const fetchUserContainers = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const isPlatformAdmin = profile.role === 'super';

      // Fetch circles user is a member of (or all circles for platform admin) - only where reviews_enabled = true
      let circlesQuery = supabase
        .from('circles')
        .select('id, name')
        .eq('reviews_enabled', true)
        .order('name');
      
      if (!isPlatformAdmin) {
        circlesQuery = circlesQuery.contains('member_ids', [profile.id]);
      }

      const { data: circlesData } = await circlesQuery;

      // Fetch tables user is a member of (or all tables for platform admin) - only where reviews_enabled = true
      let tablesQuery = supabase
        .from('tables')
        .select('id, name')
        .eq('reviews_enabled', true)
        .order('name');
      
      if (!isPlatformAdmin) {
        tablesQuery = tablesQuery.contains('member_ids', [profile.id]);
      }

      const { data: tablesData } = await tablesQuery;

      // Fetch pitches with reviews enabled
      let pitchesQuery = supabase
        .from('pitches')
        .select('id, name')
        .eq('reviews_enabled', true)
        .order('name');
      
      if (!isPlatformAdmin) {
        pitchesQuery = pitchesQuery.contains('member_ids', [profile.id]);
      }

      const { data: pitchesData } = await pitchesQuery;

      // Fetch builds with reviews enabled
      let buildsQuery = supabase
        .from('builds')
        .select('id, name')
        .eq('reviews_enabled', true)
        .order('name');
      
      if (!isPlatformAdmin) {
        buildsQuery = buildsQuery.contains('member_ids', [profile.id]);
      }

      const { data: buildsData } = await buildsQuery;

      // Fetch elevators with reviews enabled
      let elevatorsQuery = supabase
        .from('elevators')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        elevatorsQuery = elevatorsQuery.contains('member_ids', [profile.id]);
      }

      const { data: elevatorsData } = await elevatorsQuery;

      // Fetch meetings with reviews enabled
      let meetingsQuery = supabase
        .from('meetings')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        meetingsQuery = meetingsQuery.contains('member_ids', [profile.id]);
      }

      const { data: meetingsData } = await meetingsQuery;

      // Fetch libraries with reviews enabled
      let librariesQuery = supabase
        .from('libraries')
        .select('id, name')
        .eq('reviews_enabled', true)
        .order('name');
      
      if (!isPlatformAdmin) {
        librariesQuery = librariesQuery.contains('admin_ids', [profile.id]);
      }

      const { data: librariesData } = await librariesQuery;

      // Fetch events with reviews enabled
      let eventsQuery = supabase
        .from('events')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        eventsQuery = eventsQuery.contains('admin_ids', [profile.id]);
      }

      const { data: eventsData } = await eventsQuery;

      // Fetch standups with reviews enabled
      let standupsQuery = supabase
        .from('standups')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        standupsQuery = standupsQuery.contains('member_ids', [profile.id]);
      }

      const { data: standupsData } = await standupsQuery;

      // Fetch meetups with reviews enabled
      let meetupsQuery = supabase
        .from('meetups')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        meetupsQuery = meetupsQuery.contains('admin_ids', [profile.id]);
      }

      const { data: meetupsData } = await meetupsQuery;

      // Fetch documents with reviews enabled
      let documentsQuery = supabase
        .from('documents')
        .select('id, title as name')
        .eq('reviews_enabled', true)
        .order('title');
      
      if (!isPlatformAdmin) {
        documentsQuery = documentsQuery.eq('created_by', profile.id);
      }

      const { data: documentsData } = await documentsQuery;

      setUserCircles(circlesData || []);
      setUserTables(tablesData || []);
      setUserPitches((pitchesData || []).map(p => ({ ...p, type: 'pitch' })));
      setUserBuilds((buildsData || []).map(b => ({ ...b, type: 'build' })));
      setUserElevators((elevatorsData || []).map(e => ({ ...e, type: 'elevator' })));
      setUserMeetings((meetingsData || []).map(m => ({ ...m, type: 'meeting' })));
      setUserLibraries((librariesData || []).map(l => ({ ...l, type: 'library' })));
      setUserEvents((eventsData || []).map(e => ({ ...e, type: 'event' })));
      setUserStandups((standupsData || []).map(s => ({ ...s, type: 'standup' })));
      setUserMeetups((meetupsData || []).map(m => ({ ...m, type: 'meetup' })));
      setUserDocuments((documentsData || []).map(d => ({ ...d, type: 'document' })));
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    navigate('/');
    return null;
  }

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      if (tags.length < 10) {
        setTags([...tags, trimmedTag]);
        setTagInput('');
      } else {
        toast.error('Maximum 10 tags allowed');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Review description is required';
    if (!linkUrl.trim()) {
      newErrors.linkUrl = 'URL is required';
    } else if (!validateUrl(linkUrl)) {
      newErrors.linkUrl = 'Please enter a valid URL';
    }
    // Container selection is now optional - users can create standalone reviews
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);

      // Create review in Supabase
      const reviewData: any = {
        ...ownerFields('endorsements'),
        title: title.trim(),
        description: description.trim(),
        link_url: linkUrl.trim(),
        external_rating: rating,
        category: category.toLowerCase(),
        access_level: 'public'
      };

      // Only add array fields if they have values
      if (selectedCircles.length > 0) reviewData.circle_ids = selectedCircles;
      if (selectedTables.length > 0) reviewData.table_ids = selectedTables;
      if (selectedPitches.length > 0) reviewData.pitch_ids = selectedPitches;
      if (selectedBuilds.length > 0) reviewData.build_ids = selectedBuilds;
      if (selectedElevators.length > 0) reviewData.elevator_ids = selectedElevators;
      if (selectedMeetings.length > 0) reviewData.meeting_ids = selectedMeetings;
      if (selectedLibraries.length > 0) reviewData.library_ids = selectedLibraries;
      if (selectedEvents.length > 0) reviewData.event_ids = selectedEvents;
      if (selectedStandups.length > 0) reviewData.standup_ids = selectedStandups;
      if (selectedMeetups.length > 0) reviewData.meetup_ids = selectedMeetups;
      if (selectedDocuments.length > 0) reviewData.document_ids = selectedDocuments;
      if (tags.length > 0) reviewData.tags = tags;

      const { data, error } = await supabase
        .from('endorsements')
        .insert(reviewData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating review:', error);
        throw error;
      }

      toast.success('Review published successfully!');
      
      // Create announcement posts if shared to circles
      if (selectedCircles.length > 0) {
        await createLibraryShareAnnouncement({
          authorId: profile.id,
          circleIds: selectedCircles,
          itemType: 'review',
          itemId: data.id,
          itemTitle: title.trim(),
          itemData: {
            rating,
            category: category.toLowerCase()
          }
        });
      }
      
      navigate('/reviews');
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error(`Failed to publish review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCircle = (circleId: string) => {
    if (selectedCircles.includes(circleId)) {
      setSelectedCircles(selectedCircles.filter(id => id !== circleId));
    } else {
      setSelectedCircles([...selectedCircles, circleId]);
    }
  };

  const toggleTable = (tableId: string) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId));
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Reviews', path: '/reviews' },
            { label: 'Write Review', path: '/reviews/new' }
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Reviews', path: '/reviews' },
          { label: 'Write Review', path: '/reviews/new' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Write a Review</CardTitle>
          <p className="text-sm text-gray-600">
            Share your experience with a tool, book, course, or service
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">What are you reviewing? *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Notion - All-in-one workspace"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        value <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Your Review *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your thoughts, what you liked, and any tips..."
                rows={6}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link *</Label>
              <Input
                id="linkUrl"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className={errors.linkUrl ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                Link to the product website, Amazon page, course site, etc.
              </p>
              {errors.linkUrl && <p className="text-sm text-red-500">{errors.linkUrl}</p>}
            </div>

            {/* Circles */}
            {userCircles.length > 0 && (
              <div className="space-y-2">
                <Label>Share with Circles (Optional)</Label>
                <p className="text-xs text-gray-500">
                  Select circles to share this review with. You can only select circles you're a member of.
                </p>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {userCircles.map((circle) => (
                    <label
                      key={circle.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCircles.includes(circle.id)}
                        onChange={() => toggleCircle(circle.id)}
                        className="rounded"
                      />
                      <span>{circle.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {userTables.length > 0 && (
              <div className="space-y-2">
                <Label>Share with Tables (Optional)</Label>
                <p className="text-xs text-gray-500">
                  Select tables to share this review with. You can only select tables you're a member of.
                </p>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {userTables.map((table) => (
                    <label
                      key={table.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.id)}
                        onChange={() => toggleTable(table.id)}
                        className="rounded"
                      />
                      <span>{table.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Info about standalone reviews */}
            {selectedCircles.length === 0 && selectedTables.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This review will be created as a standalone review. It will appear in your "My Reviews" 
                  page and the global reviews page, but won't be associated with any specific circle or table.
                </p>
              </div>
            )}

            {errors.containers && <p className="text-sm text-red-500">{errors.containers}</p>}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags..."
                />
                <Button type="button" onClick={handleAddTag} variant="outline" size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Press Enter or click + to add each tag
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Review'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/reviews')}
                disabled={submitting}
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