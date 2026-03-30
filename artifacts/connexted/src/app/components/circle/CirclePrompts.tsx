import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Sparkles, Copy, Check, Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { CreatePromptDialog } from '@/app/components/circle/CreatePromptDialog';

interface CirclePrompt {
  id: string;
  circle_id: string;
  title: string;
  prompt_text: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CirclePromptsProps {
  circleId: string;
  isAdmin: boolean;
  isMember: boolean;
}

export default function CirclePrompts({ circleId, isAdmin, isMember }: CirclePromptsProps) {
  const { profile } = useAuth();
  const [prompts, setPrompts] = useState<CirclePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, [circleId]);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('circle_prompts')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async (prompt: CirclePrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopiedId(prompt.id);
      toast.success('Prompt copied to clipboard!');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy prompt');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('circle_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prompts.filter(p => p.id !== promptId));
      toast.success('Prompt deleted');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const toggleExpanded = (promptId: string) => {
    setExpandedId(expandedId === promptId ? null : promptId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Prompt Library</h2>
          <p className="text-gray-600 mt-1">
            Copy prompts and use them in your preferred AI tool (ChatGPT, Claude, Gemini, etc.)
          </p>
        </div>
        {isMember && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Prompt
          </Button>
        )}
      </div>

      {/* Empty State */}
      {prompts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No prompts yet</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create AI prompts that members can copy and use in their favorite AI tools. 
              Results can be shared back to the circle feed or forum.
            </p>
            {isMember && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Prompt
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prompts List */}
      <div className="grid gap-4">
        {prompts.map((prompt) => {
          const isExpanded = expandedId === prompt.id;
          const isCopied = copiedId === prompt.id;
          const isOwner = profile?.id === prompt.created_by;

          return (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg">{prompt.title}</CardTitle>
                    </div>
                    {prompt.description && (
                      <CardDescription>{prompt.description}</CardDescription>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleCopyPrompt(prompt)}
                      variant={isCopied ? "default" : "outline"}
                      size="sm"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy to AI
                        </>
                      )}
                    </Button>
                    
                    {(isOwner || isAdmin) && (
                      <Button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Collapsible Prompt Text */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleExpanded(prompt.id)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide prompt
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show prompt
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                        {prompt.prompt_text}
                      </pre>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                    <span>Created {new Date(prompt.created_at).toLocaleDateString()}</span>
                    {prompt.updated_at !== prompt.created_at && (
                      <span>Updated {new Date(prompt.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      {prompts.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">How to use these prompts</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Click "Copy to AI" to copy the prompt to your clipboard</li>
                  <li>Open your preferred AI tool (ChatGPT, Claude, Gemini, etc.)</li>
                  <li>Paste the prompt and customize it with your details</li>
                  <li>Share your AI results back to the circle feed or forum to help others!</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Prompt Dialog */}
      <CreatePromptDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        circleId={circleId}
        onPromptCreated={fetchPrompts}
      />
    </div>
  );
}
