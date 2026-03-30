import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { createLibraryShareAnnouncement } from '@/lib/announcement-helper';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { X, Plus, Bookmark, Lock, Users, AlertCircle } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import BookmarkBrowser from '@/app/components/BookmarkBrowser';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { TagSelector } from '@/app/components/unified/TagSelector';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

const ACCESS_LEVELS = [
  { value: 'public', label: 'Public', description: 'Anyone can view' },
  { value: 'member', label: 'Members Only', description: 'Logged-in members only' },
  { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link' },
  { value: 'private', label: 'Private', description: 'Only you and invited members' },
];

interface Circle {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
}

export default function AddDocumentForm() {
  const navigate = useNavigate();
  const { id: documentId } = useParams();
  const isEditMode = !!documentId;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Privacy mode
  const [privacyMode, setPrivacyMode] = useState<'personal' | 'share'>('personal');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [accessLevel, setAccessLevel] = useState('public');
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Available containers
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // Bookmark browser
  const [showBookmarkBrowser, setShowBookmarkBrowser] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchContainers();
    }
  }, [profile]);

  // Load existing document data in edit mode
  useEffect(() => {
    if (isEditMode && documentId && profile && !loading) {
      fetchDocument();
    }
  }, [isEditMode, documentId, profile, loading]);

  const fetchDocument = async () => {
    if (!documentId || !profile) return;

    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      if (!doc) {
        toast.error('Document not found');
        navigate('/documents');
        return;
      }

      // Populate form fields
      setTitle(doc.title || '');
      setDescription(doc.description || '');
      setUrl(doc.url || '');
      setAccessLevel(doc.access_level || 'public');
      setSelectedCircles(doc.circle_ids || []);
      setSelectedTables(doc.table_ids || []);
      setTags(doc.tags || []);

      // Set privacy mode based on sharing
      if ((doc.circle_ids && doc.circle_ids.length > 0) || (doc.table_ids && doc.table_ids.length > 0)) {
        setPrivacyMode('share');
      } else {
        setPrivacyMode('personal');
      }
    } catch (error) {
      console.error('Error fetching document for edit:', error);
      toast.error('Failed to load document');
      navigate('/documents');
    }
  };

  const fetchContainers = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch user's circles
      const { data: userCircles, error: circlesError } = await supabase
        .from('circles')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');

      if (circlesError) throw circlesError;

      // Fetch user's tables
      const { data: userTables, error: tablesError } = await supabase
        .from('tables')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');

      if (tablesError) throw tablesError;

      setCircles(userCircles || []);
      setTables(userTables || []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load circles and tables');
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleBookmarkSelect = (selectedUrl: string, selectedTitle: string) => {
    setUrl(selectedUrl);
    if (!title.trim()) {
      setTitle(selectedTitle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!validateUrl(url)) {
      newErrors.url = 'Please enter a valid URL';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && documentId) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update({
            title: title.trim(),
            description: description.trim(),
            url: url.trim(),
            tags: tags,
            circle_ids: selectedCircles,
            table_ids: selectedTables,
            access_level: accessLevel,
          })
          .eq('id', documentId);

        if (error) throw error;

        toast.success('Document updated successfully!');
        navigate(`/documents/${documentId}`);
      } else {
        // Create new document
        const { data, error } = await supabase
          .from('documents')
          .insert({
            title: title.trim(),
            description: description.trim(),
            url: url.trim(),
            tags: tags,
            circle_ids: selectedCircles,
            table_ids: selectedTables,
            author_id: profile!.id,
            access_level: accessLevel,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('Document added successfully!');
        
        // Create announcement posts if shared to circles
        if (selectedCircles.length > 0) {
          await createLibraryShareAnnouncement({
            authorId: profile!.id,
            circleIds: selectedCircles,
            itemType: 'document',
            itemId: data.id,
            itemTitle: title.trim(),
            itemData: {}
          });
        }
        
        navigate(`/documents/${data.id}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} document:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} document`);
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

  if (!profile) {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Documents', path: '/documents' },
          ...(isEditMode
            ? [{ label: title || 'Document', path: `/documents/${documentId}` }, { label: 'Edit' }]
            : [{ label: 'Add Document' }]
          )
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Document' : 'Add New Document'}</CardTitle>
          <p className="text-sm text-gray-600">
            {isEditMode
              ? 'Update the document settings below'
              : 'Save a document for yourself or share it with circles and tables'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Privacy Mode Selector */}
            <div className="space-y-3 pb-6 border-b">
              <Label>Privacy</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyMode('personal');
                    setSelectedCircles([]);
                    setSelectedTables([]);
                  }}
                  className={`flex flex-col items-start gap-2 p-4 border-2 rounded-lg transition-all ${
                    privacyMode === 'personal'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">Personal</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Save for yourself only. You can share it later.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyMode('share')}
                  className={`flex flex-col items-start gap-2 p-4 border-2 rounded-lg transition-all ${
                    privacyMode === 'share'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </div>
                  <p className="text-xs text-gray-600 text-left">
                    Share with circles and/or tables immediately.
                  </p>
                </button>
              </div>
              
              {/* Info Alert */}
              {privacyMode === 'personal' && (
                <Alert>
                  <Lock className="w-4 h-4" />
                  <AlertDescription>
                    This document will be saved to your personal library and won't be visible to anyone else.
                  </AlertDescription>
                </Alert>
              )}
              {privacyMode === 'share' && (selectedCircles.length === 0 && selectedTables.length === 0) && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Select at least one circle or table below to share this document.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Getting Started Guide"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this document contains..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">Document URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/..."
                  className={errors.url ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookmarkBrowser(true)}
                  className="flex-shrink-0"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Link to Google Docs, Dropbox, Notion, or any publicly accessible document
              </p>
              {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
            </div>

            {/* Access Level */}
            <div className="space-y-2">
              <Label>Access Level *</Label>
              <div className="space-y-2">
                {ACCESS_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded border"
                  >
                    <input
                      type="radio"
                      name="accessLevel"
                      value={level.value}
                      checked={accessLevel === level.value}
                      onChange={(e) => setAccessLevel(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-gray-500">{level.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Circles */}
            <div className="space-y-2">
              <Label>Share with Circles (Optional)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Leave unselected to keep this document in your personal library
              </p>
              {circles.length === 0 ? (
                <p className="text-sm text-gray-500">You are not a member of any circles yet.</p>
              ) : (
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {circles.map((circle) => (
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
              )}
            </div>

            {/* Tables (Optional) */}
            {tables.length > 0 && (
              <div className="space-y-2">
                <Label>Share with Tables (Optional)</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {tables.map((table) => (
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

            {errors.containers && <p className="text-sm text-red-500">{errors.containers}</p>}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (What/How)</Label>
              <TagSelector
                value={tags}
                onChange={setTags}
                contentType="document"
                title={title}
                description={description}
                maxTags={10}
                showSuggestions={true}
                placeholder="Add tags to help others discover this document..."
              />
              <p className="text-xs text-gray-500">
                Use tags to describe <strong>WHAT</strong> this is about and <strong>HOW</strong> it's structured
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting
                  ? (isEditMode ? 'Saving...' : 'Adding...')
                  : (isEditMode ? 'Save Changes' : 'Add Document')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEditMode ? `/documents/${documentId}` : '/documents')}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bookmark Browser Modal */}
      <BookmarkBrowser
        open={showBookmarkBrowser}
        onClose={() => setShowBookmarkBrowser(false)}
        onSelect={handleBookmarkSelect}
      />
    </div>
  );
}