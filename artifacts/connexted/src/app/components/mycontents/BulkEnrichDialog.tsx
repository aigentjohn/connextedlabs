import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface BulkEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Guide' },
  { value: 'resource', label: 'Resource' },
  { value: 'template', label: 'Template' },
  { value: 'research', label: 'Research' },
  { value: 'documentation', label: 'Documentation' },
];

const CONTENT_FORMATS = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'slide_deck', label: 'Slide Deck' },
  { value: 'code_repo', label: 'Code Repository' },
  { value: 'tool', label: 'Tool' },
  { value: 'image', label: 'Image' },
];

const AUDIENCES = [
  { value: 'any', label: 'Any' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const ACCESS_LEVELS = [
  { value: 'public', label: 'Public' },
  { value: 'member', label: 'Members Only' },
  { value: 'premium', label: 'Premium' },
];

export default function BulkEnrichDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkEnrichDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Metadata fields
  const [documentType, setDocumentType] = useState('');
  const [contentFormat, setContentFormat] = useState('');
  const [intendedAudience, setIntendedAudience] = useState('');
  const [category, setCategory] = useState('');
  const [accessLevel, setAccessLevel] = useState('');
  const [sponsorOrg, setSponsorOrg] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleEnrich = async () => {
    if (!profile || selectedIds.length === 0) return;

    // Build update object with only filled fields
    const updates: any = {
      enriched_at: new Date().toISOString(),
      status: 'enriched',
      updated_at: new Date().toISOString(),
    };

    if (documentType) updates.document_type = documentType;
    if (contentFormat) updates.content_format = contentFormat;
    if (intendedAudience) updates.intended_audience = intendedAudience;
    if (category) updates.category = category;
    if (accessLevel) updates.access_level = accessLevel;
    if (sponsorOrg) updates.sponsor_org = sponsorOrg;
    if (tags.length > 0) updates.tags = tags;
    if (notes) updates.notes = notes;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('my_contents')
        .update(updates)
        .in('id', selectedIds)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast.success(`Enriched ${selectedIds.length} items`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error enriching items:', error);
      toast.error('Failed to enrich items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDocumentType('');
    setContentFormat('');
    setIntendedAudience('');
    setCategory('');
    setAccessLevel('');
    setSponsorOrg('');
    setTags([]);
    setTagInput('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Enrich Metadata</DialogTitle>
          <DialogDescription>
            Apply metadata to {selectedIds.length} selected item{selectedIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-900">
              <strong>Note:</strong> Only fill in the fields you want to apply. Empty fields will
              not overwrite existing data.
            </p>
          </div>

          {/* Document Type */}
          <div>
            <Label htmlFor="document_type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Format */}
          <div>
            <Label htmlFor="content_format">Content Format</Label>
            <Select value={contentFormat} onValueChange={setContentFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format..." />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Intended Audience */}
          <div>
            <Label htmlFor="intended_audience">Intended Audience</Label>
            <Select value={intendedAudience} onValueChange={setIntendedAudience}>
              <SelectTrigger>
                <SelectValue placeholder="Select audience..." />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((audience) => (
                  <SelectItem key={audience.value} value={audience.value}>
                    {audience.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Programming, Design, Marketing"
            />
          </div>

          {/* Access Level */}
          <div>
            <Label htmlFor="access_level">Access Level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select access level..." />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sponsor Org */}
          <div>
            <Label htmlFor="sponsor_org">Sponsor Organization (Optional)</Label>
            <Input
              id="sponsor_org"
              value={sponsorOrg}
              onChange={(e) => setSponsorOrg(e.target.value)}
              placeholder="Organization name"
            />
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tags..."
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes that apply to all selected items..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleEnrich} disabled={loading}>
            {loading ? 'Enriching...' : `Enrich ${selectedIds.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}