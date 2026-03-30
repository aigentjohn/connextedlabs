import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Edit, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

interface TagEditorDialogProps {
  threadId: string;
  currentTags: string[];
  allExistingTags: string[];
  onUpdate: () => void;
}

export default function TagEditorDialog({ threadId, currentTags, allExistingTags, onUpdate }: TagEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(currentTags || []);
  const [tagInput, setTagInput] = useState('');

  const normalizeTag = (tag: string): string => {
    return tag.toLowerCase().trim().replace(/\s+/g, '-');
  };

  const handleAddTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (normalized && !tags.includes(normalized)) {
      if (tags.length < 5) {
        setTags([...tags, normalized]);
        setTagInput('');
      } else {
        toast.error('Maximum 5 tags allowed');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSave = async () => {
    const { data, error } = await supabase
      .from('forum_threads')
      .update({ tags: tags.length > 0 ? tags : undefined })
      .eq('id', threadId);

    if (error) {
      toast.error('Failed to update tags');
    } else {
      toast.success('Tags updated successfully!');
      setOpen(false);
      onUpdate();
    }
  };

  const handleOpen = () => {
    setTags(currentTags || []);
    setTagInput('');
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Edit className="w-4 h-4" />
        Edit Tags
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Thread Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags to help organize this thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-input">Add Tags (max 5)</Label>
              <Input
                id="tag-input"
                placeholder="Type a tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                list="existing-tag-suggestions"
              />
              <datalist id="existing-tag-suggestions">
                {allExistingTags.map(tag => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>

              {/* Display current tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Tags ({tags.length}/5)</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="default" className="pl-2 pr-1 py-1">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-indigo-700 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {tags.length === 0 && (
                <p className="text-sm text-gray-500">
                  No tags added yet. Tags help organize and filter threads.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}