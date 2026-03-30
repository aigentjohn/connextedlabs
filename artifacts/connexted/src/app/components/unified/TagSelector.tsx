import { useState, useEffect, useMemo } from 'react';
import { X, Hash, Sparkles } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

interface TagSuggestion {
  tag: string;
  type: 'what' | 'how' | 'status';
  description: string | null;
  category: string | null;
  usage_count: number;
}

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  contentType?: 'book' | 'deck' | 'document' | 'checklist' | 'event' | 'circle';
  placeholder?: string;
  maxTags?: number;
  showSuggestions?: boolean;
  showUsageCount?: boolean;
  allowCustom?: boolean;
  title?: string; // for smart suggestions
  description?: string; // for smart suggestions
}

export function TagSelector({ 
  value, 
  onChange, 
  contentType,
  placeholder = "Add tags (press Enter)...", 
  maxTags = 10,
  showSuggestions = true,
  showUsageCount = false,
  allowCustom = true,
  title = '',
  description = ''
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [allSuggestions, setAllSuggestions] = useState<{ 
    what: TagSuggestion[], 
    how: TagSuggestion[], 
    status: TagSuggestion[] 
  }>({ what: [], how: [], status: [] });
  const [smartSuggestions, setSmartSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'smart' | 'what' | 'how'>('smart');

  // Fetch all tag suggestions on mount
  useEffect(() => {
    if (showSuggestions) {
      fetchTagSuggestions();
    }
  }, [showSuggestions]);

  // Fetch smart suggestions when title/description changes
  useEffect(() => {
    if (showSuggestions && (title || description)) {
      fetchSmartSuggestions();
    }
  }, [title, description, showSuggestions]);

  const fetchTagSuggestions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions/grouped`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllSuggestions(data.grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
    }
  };

  const fetchSmartSuggestions = async () => {
    if (!title && !description) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/smart-suggest`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            contentType,
            limit: 12
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSmartSuggestions(data.suggestions);
          // Auto-switch to smart tab when suggestions load
          if (data.suggestions.length > 0) {
            setActiveTab('smart');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching smart suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter suggestions based on search input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue) {
      return allSuggestions;
    }

    const searchLower = inputValue.toLowerCase();
    return {
      what: allSuggestions.what.filter(s => s.tag.includes(searchLower)),
      how: allSuggestions.how.filter(s => s.tag.includes(searchLower)),
      status: allSuggestions.status.filter(s => s.tag.includes(searchLower)),
    };
  }, [inputValue, allSuggestions]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    
    // Check max tags limit
    if (maxTags && value.length >= maxTags) {
      return;
    }

    // Check if tag already exists
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (allowCustom && inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value[value.length - 1]);
    }
  };

  const renderSuggestionButton = (suggestion: TagSuggestion) => (
    <button
      key={suggestion.tag}
      type="button"
      onClick={() => addTag(suggestion.tag)}
      className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-md transition-all text-sm"
      title={suggestion.description || undefined}
    >
      <Hash className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
      <span className="text-gray-700 group-hover:text-blue-700">{suggestion.tag}</span>
      {showUsageCount && suggestion.usage_count > 0 && (
        <span className="text-xs text-gray-400 ml-1">({suggestion.usage_count})</span>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary"
              className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5"
            >
              <Hash className="w-3 h-3" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={maxTags ? value.length >= maxTags : false}
          />
          {maxTags && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {value.length}/{maxTags}
            </div>
          )}
        </div>
        {allowCustom && (
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || (maxTags ? value.length >= maxTags : false)}
          >
            Add
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'smart' | 'what' | 'how')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="smart" className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smart</span>
              {smartSuggestions.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {smartSuggestions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="what">
              What
              <span className="ml-1 text-xs text-gray-500">({filteredSuggestions.what.length})</span>
            </TabsTrigger>
            <TabsTrigger value="how">
              How
              <span className="ml-1 text-xs text-gray-500">({filteredSuggestions.how.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smart" className="mt-3 space-y-2">
            {loading ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                Analyzing content for smart suggestions...
              </div>
            ) : smartSuggestions.length > 0 ? (
              <>
                <p className="text-xs text-gray-600">
                  Suggested tags based on your title and description:
                </p>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions
                    .filter(s => !value.includes(s.tag))
                    .map(suggestion => renderSuggestionButton(suggestion))}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">
                {title || description ? 'No smart suggestions found. Try the WHAT/HOW tabs.' : 'Enter a title or description to get smart tag suggestions'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="what" className="mt-3 space-y-2">
            <p className="text-xs text-gray-600">
              Tags that describe <strong>WHAT</strong> this content is about:
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {filteredSuggestions.what
                .filter(s => !value.includes(s.tag))
                .map(suggestion => renderSuggestionButton(suggestion))}
            </div>
            {filteredSuggestions.what.length === 0 && (
              <div className="text-sm text-gray-500 py-2">No WHAT tags found</div>
            )}
          </TabsContent>

          <TabsContent value="how" className="mt-3 space-y-2">
            <p className="text-xs text-gray-600">
              Tags that describe <strong>HOW</strong> this content is structured or delivered:
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {filteredSuggestions.how
                .filter(s => !value.includes(s.tag))
                .map(suggestion => renderSuggestionButton(suggestion))}
            </div>
            {filteredSuggestions.how.length === 0 && (
              <div className="text-sm text-gray-500 py-2">No HOW tags found</div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Use <strong>WHAT</strong> tags for subject matter and <strong>HOW</strong> tags for format/method. 
        {allowCustom && ' Press Enter to add custom tags.'}
      </p>
    </div>
  );
}