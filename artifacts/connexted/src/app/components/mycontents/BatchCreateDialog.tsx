import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Mic, Hammer, Briefcase, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

interface BatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContents: any[];
  onSuccess: () => void;
}

type ContentType = 'document' | 'pitch' | 'build' | 'portfolio' | 'post';

const CONTENT_TYPES = [
  {
    value: 'document',
    label: 'Documents',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-600',
    description: 'Knowledge base articles and resources',
  },
  {
    value: 'pitch',
    label: 'Pitches',
    icon: Mic,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-600',
    description: 'Presentations and demo materials',
  },
  {
    value: 'build',
    label: 'Builds',
    icon: Hammer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-600',
    description: 'Projects and code repositories',
  },
  {
    value: 'portfolio',
    label: 'Portfolio Items',
    icon: Briefcase,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-600',
    description: 'Project showcases and demos',
  },
  {
    value: 'post',
    label: 'Posts',
    icon: MessageSquare,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-600',
    description: 'Share content in community feed',
  },
];

export default function BatchCreateDialog({
  open,
  onOpenChange,
  selectedContents,
  onSuccess,
}: BatchCreateDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if contents are enriched
  const enrichedCount = selectedContents.filter((c) => c.status === 'enriched').length;
  const pendingCount = selectedContents.filter((c) => c.status === 'pending').length;

  const handleCreate = async () => {
    if (!profile || !selectedType || selectedContents.length === 0) return;

    try {
      setLoading(true);

      switch (selectedType) {
        case 'document':
          await createDocuments();
          break;
        case 'pitch':
          await createPitches();
          break;
        case 'build':
          await createBuilds();
          break;
        case 'portfolio':
          await createPortfolioItems();
          break;
        case 'post':
          await createPosts();
          break;
      }

      toast.success(`Created ${selectedContents.length} draft ${selectedType}s`);
      onSuccess();
      onOpenChange(false);

      // Navigate to the appropriate page
      switch (selectedType) {
        case 'document':
          navigate('/my-documents');
          break;
        case 'pitch':
          navigate('/pitches');
          break;
        case 'build':
          navigate('/builds');
          break;
        case 'portfolio':
          navigate(`/portfolio/${profile.id}`);
          break;
        case 'post':
          navigate('/feed');
          break;
      }
    } catch (error) {
      console.error('Error creating content:', error);
      toast.error(`Failed to create ${selectedType}s`);
    } finally {
      setLoading(false);
    }
  };

  const createDocuments = async () => {
    const items = selectedContents.map((content) => ({
      title: content.title,
      url: content.url,
      description: content.description || 'Edit this description to explain what this document covers and why it\'s useful.',
      document_type: content.document_type || 'resource',
      intended_audience: content.intended_audience || 'any',
      tags: content.tags || [],
      access_level: content.access_level || 'public',
      author_id: profile!.id,
      status: 'draft',
      is_complete: false,
      my_content_id: content.id,
    }));

    const { error } = await supabase.from('documents').insert(items);
    if (error) throw error;

    // Update my_contents usage
    await updateUsageCount(selectedContents.map((c) => c.id));
  };

  const createPitches = async () => {
    const items = selectedContents.map((content) => ({
      title: content.title || 'Untitled Pitch',
      tagline: 'Add a compelling tagline here...',
      description: content.description || 'Describe your pitch, the problem you\'re solving, and your solution.',
      author_id: profile!.id,
      status: 'draft',
      is_complete: false,
      tags: content.tags || [],
    }));

    const { data, error } = await supabase.from('pitches').insert(items).select();
    if (error) throw error;

    // Link resources to pitches
    if (data) {
      for (let i = 0; i < data.length; i++) {
        const pitch = data[i];
        const content = selectedContents[i];

        await supabase.from('content_links').insert({
          my_content_id: content.id,
          content_type: 'pitch',
          content_id: pitch.id,
          link_type: 'primary',
          added_by_user_id: profile!.id,
        });
      }
    }

    await updateUsageCount(selectedContents.map((c) => c.id));
  };

  const createBuilds = async () => {
    const items = selectedContents.map((content) => ({
      title: content.title,
      description: content.description || 'Describe this project: what you built, technologies used, and outcomes achieved.',
      github_url: content.content_format === 'code_repo' ? content.url : null,
      demo_url: content.content_format !== 'code_repo' ? content.url : null,
      tags: content.tags || [],
      author_id: profile!.id,
      status: 'draft',
      is_complete: false,
    }));

    const { error } = await supabase.from('builds').insert(items);
    if (error) throw error;

    await updateUsageCount(selectedContents.map((c) => c.id));
  };

  const createPortfolioItems = async () => {
    const items = selectedContents.map((content) => ({
      user_id: profile!.id,
      title: content.title,
      description: content.description || 'Describe this project: what you built, technologies used, and outcomes achieved.',
      image_url: content.content_format === 'image' ? content.url : null,
      project_url: content.content_format !== 'image' ? content.url : null,
      technologies: content.tags || [],
      status: 'draft',
      is_complete: false,
    }));

    const { error } = await supabase.from('portfolio_items').insert(items);
    if (error) throw error;

    await updateUsageCount(selectedContents.map((c) => c.id));
  };

  const createPosts = async () => {
    const items = selectedContents.map((content) => ({
      user_id: profile!.id,
      content: `Check out this resource: ${content.title}`,
      link_url: content.url,
      link_title: content.title,
      link_description: content.description,
      status: 'draft',
      is_complete: false,
    }));

    const { error } = await supabase.from('posts').insert(items);
    if (error) throw error;

    await updateUsageCount(selectedContents.map((c) => c.id));
  };

  const updateUsageCount = async (contentIds: string[]) => {
    // Increment usage count for all contents
    for (const id of contentIds) {
      await supabase.rpc('increment', {
        row_id: id,
        table_name: 'my_contents',
        column_name: 'usage_count',
      }).catch(() => {
        // Fallback if RPC doesn't exist
        supabase
          .from('my_contents')
          .update({
            usage_count: supabase.raw('usage_count + 1'),
            last_used_at: new Date().toISOString(),
          })
          .eq('id', id);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Create Content</DialogTitle>
          <DialogDescription>
            Create {selectedContents.length} draft content items from selected URLs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enrichment Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Enrichment Status:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">
                    {enrichedCount} enriched
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-600">
                      {pendingCount} pending
                    </span>
                  </div>
                )}
              </div>
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-gray-500">
                Items with pending status will have default metadata. Consider enriching them first for better results.
              </p>
            )}
          </div>

          {/* Content Type Selection */}
          <div>
            <Label className="mb-3 block">Create As:</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;

                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value as ContentType)}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? `${type.borderColor} ${type.bgColor}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mt-0.5 ${type.color}`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {selectedType && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-900 mb-2">What will be created:</h4>
              <ul className="text-sm text-indigo-800 space-y-1">
                <li>✓ {selectedContents.length} draft {selectedType}s with status "draft"</li>
                <li>✓ Metadata from My Contents will be applied</li>
                <li>✓ Links back to My Contents for tracking</li>
                <li>✓ Editable descriptions with placeholder text</li>
                <li>✓ Usage count will be incremented</li>
              </ul>
            </div>
          )}

          {/* Draft Explanation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">About Draft Status:</h4>
            <p className="text-sm text-yellow-800">
              All items will be created as drafts with placeholder descriptions. You can review and edit them later before publishing. Navigate to the respective page (My Documents, Pitches, etc.) to complete and publish your drafts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !selectedType}>
            {loading
              ? 'Creating...'
              : `Create ${selectedContents.length} Draft ${
                  selectedType ? CONTENT_TYPES.find((t) => t.value === selectedType)?.label : 'Items'
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}