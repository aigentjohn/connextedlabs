import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

interface CreateProgramPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  onPromptCreated: () => void;
}

export function CreateProgramPromptDialog({
  open,
  onOpenChange,
  programId,
  onPromptCreated,
}: CreateProgramPromptDialogProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !promptText.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!profile) {
      toast.error('You must be logged in to create prompts');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('program_prompts').insert({
        program_id: programId,
        title: title.trim(),
        description: description.trim() || null,
        prompt_text: promptText.trim(),
        created_by: profile.id,
      });

      if (error) throw error;

      toast.success('Prompt created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setPromptText('');
      
      // Close dialog and refresh list
      onOpenChange(false);
      onPromptCreated();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <DialogTitle>Create AI Prompt</DialogTitle>
          </div>
          <DialogDescription>
            Create a reusable AI prompt that program members can copy and use in their preferred AI tools.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Prompt Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Pitch Feedback Analyzer, Competitive Research Template"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">
              Give your prompt a clear, descriptive name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Use this prompt to get detailed feedback on your pitch deck..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              Explain what this prompt does and when to use it
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promptText">
              Prompt Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="promptText"
              placeholder="You are an expert startup advisor. Analyze the following pitch deck and provide feedback on:
1. Clarity of the problem statement
2. Uniqueness of the solution
3. Market opportunity sizing
4. Business model viability
5. Team credibility

[User will paste their pitch deck here]"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Write the full prompt that users will copy. Include instructions for where they should add their own content.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for great prompts:</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Be specific about the role the AI should play</li>
              <li>Break down complex requests into numbered steps</li>
              <li>Include placeholders like [PASTE YOUR CONTENT HERE]</li>
              <li>Specify the format you want the output in</li>
              <li>Test your prompt in an AI tool before sharing</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Prompt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
