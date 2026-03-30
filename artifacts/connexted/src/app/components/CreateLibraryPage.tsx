import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { BookOpen, RefreshCw, FolderOpen, Plus, X, Tag, Globe, Lock, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface FilterRule {
  field: string;
  value: string | string[];
}

export default function CreateLibraryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'manual' | 'auto_generated'>('manual');
  const [isPublic, setIsPublic] = useState(false);
  const [icon, setIcon] = useState('📚');

  // Auto-generated filter rules
  const [documentTypes, setDocumentTypes] = useState<string[]>([]); // Changed to array
  const [intendedAudience, setIntendedAudience] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !filterTags.includes(newTag.trim())) {
      setFilterTags([...filterTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFilterTags(filterTags.filter((t) => t !== tag));
  };

  const toggleDocumentType = (type: string) => {
    if (documentTypes.includes(type)) {
      setDocumentTypes(documentTypes.filter((t) => t !== type));
    } else {
      setDocumentTypes([...documentTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast.error('You must be logged in to create a library');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a library name');
      return;
    }

    setLoading(true);

    try {
      // Build filter rules for auto-generated libraries
      let filterRules = null;
      if (type === 'auto_generated') {
        filterRules = {};
        if (documentTypes.length > 0) filterRules.document_type = documentTypes;
        if (intendedAudience && intendedAudience !== 'any') filterRules.intended_audience = intendedAudience;
        if (filterTags.length > 0) filterRules.tags = filterTags;

        // Validate that at least one filter is set
        if (Object.keys(filterRules).length === 0) {
          toast.error('Please set at least one filter for auto-generated libraries');
          setLoading(false);
          return;
        }
      }

      // Create the library
      const { data, error } = await supabase
        .from('libraries')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          type,
          owner_type: 'user',
          owner_id: profile.id,
          filter_rules: filterRules,
          is_public: isPublic,
          icon,
          created_by: profile.id,
          admin_ids: [profile.id],
          member_ids: [profile.id],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Library created successfully!');
      navigate(`/libraries/${data.id}`);
    } catch (error) {
      console.error('Error creating library:', error);
      toast.error('Failed to create library');
    } finally {
      setLoading(false);
    }
  };

  const commonIcons = ['📚', '📖', '📁', '🗂️', '📂', '🔖', '📝', '📄', '📋', '🎓'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Libraries', path: '/libraries' },
        { label: 'Create Library' }
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Library</h1>
        <p className="text-gray-600 mt-1">
          Organize documents with a custom library
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        {/* Library Type */}
        <div className="space-y-3">
          <Label>Library Type</Label>
          <RadioGroup value={type} onValueChange={(value) => setType(value as 'manual' | 'auto_generated')}>
            <div className="space-y-3">
              <div
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  type === 'manual'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setType('manual')}
              >
                <RadioGroupItem value="manual" id="manual" />
                <div className="flex-1">
                  <label htmlFor="manual" className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer">
                    <FolderOpen className="w-5 h-5 text-indigo-600" />
                    Manual Collection
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    You choose which documents to include and can organize them into folders
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  type === 'auto_generated'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setType('auto_generated')}
              >
                <RadioGroupItem value="auto_generated" id="auto_generated" />
                <div className="flex-1">
                  <label htmlFor="auto_generated" className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    Auto-Generated
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically includes documents matching filter rules you define
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Library Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., DevOps Resources, Tutorial Collection"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this library about?"
              rows={3}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {commonIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center text-2xl ${
                    icon === emoji
                      ? 'border-indigo-600 bg-indigo-50 scale-110'
                      : 'border-gray-200 hover:border-gray-300 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label>Privacy</Label>
            <RadioGroup value={isPublic ? 'public' : 'private'} onValueChange={(value) => setIsPublic(value === 'public')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <label htmlFor="private" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Lock className="w-4 h-4" />
                  Private - Only you can see this library
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <label htmlFor="public" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Globe className="w-4 h-4" />
                  Public - Everyone can see this library
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Auto-Generated Filter Rules */}
        {type === 'auto_generated' && (
          <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center gap-2 text-indigo-900">
              <RefreshCw className="w-5 h-5" />
              <h3 className="font-semibold">Filter Rules</h3>
            </div>
            <p className="text-sm text-indigo-700">
              Documents matching these criteria will automatically appear in this library
            </p>

            <div className="space-y-3">
              {/* Document Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Document Types (select one or more)</Label>
                <div className="bg-white p-3 rounded-lg border border-gray-300 space-y-2">
                  {['tutorial', 'guide', 'resource', 'template', 'research', 'documentation'].map((docType) => (
                    <div key={docType} className="flex items-center space-x-2">
                      <Checkbox
                        id={docType}
                        checked={documentTypes.includes(docType)}
                        onCheckedChange={() => toggleDocumentType(docType)}
                      />
                      <label
                        htmlFor={docType}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                      >
                        <FileText className="w-4 h-4 inline mr-1 text-gray-500" />
                        {docType}
                      </label>
                    </div>
                  ))}
                </div>
                {documentTypes.length > 0 && (
                  <p className="text-xs text-indigo-600">
                    Selected: {documentTypes.join(', ')}
                  </p>
                )}
              </div>

              {/* Intended Audience Filter */}
              <div className="space-y-2">
                <Label htmlFor="audience" className="text-sm">Intended Audience</Label>
                <Select value={intendedAudience} onValueChange={setIntendedAudience}>
                  <SelectTrigger id="audience" className="bg-white">
                    <SelectValue placeholder="Any audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any audience</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag"
                    className="bg-white"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {filterTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filterTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        <Tag className="w-3 h-3" />
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
                <p className="text-xs text-indigo-600">
                  Documents with ANY of these tags will be included
                </p>
              </div>
            </div>

            {/* Preview Count (would need real implementation) */}
            <div className="mt-4 p-3 bg-white rounded border border-indigo-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-indigo-600">Preview: </span>
                Documents matching these filters will appear here automatically
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/libraries')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Library'}
          </Button>
        </div>
      </form>
    </div>
  );
}