import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Check, Users } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface Archetype {
  tag: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
}

const ARCHETYPE_CATEGORIES = [
  'Learning-Oriented',
  'Action-Oriented',
  'Support-Oriented',
  'Strategic-Oriented',
  'Growth-Oriented'
];

interface ArchetypeSelectorProps {
  selectedArchetypes: string[];
  onSelectionChange: (archetypes: string[]) => void;
  maxSelection?: number;
  showCategories?: boolean;
}

export default function ArchetypeSelector({
  selectedArchetypes,
  onSelectionChange,
  maxSelection,
  showCategories = true
}: ArchetypeSelectorProps) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(ARCHETYPE_CATEGORIES));

  useEffect(() => {
    loadArchetypes();
  }, []);

  const loadArchetypes = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/audience/all`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const data = await res.json();

      if (data.success) {
        // Filter only archetypes (those with emoji field)
        const archetypeList = (data.audience || [])
          .filter((a: any) => a.emoji && ARCHETYPE_CATEGORIES.includes(a.category))
          .map((a: any) => ({
            tag: a.tag,
            name: a.official_name || a.tag,
            emoji: a.emoji,
            description: a.description || '',
            category: a.category
          }));
        
        setArchetypes(archetypeList);
      }
    } catch (error) {
      console.error('Error loading archetypes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArchetype = (tag: string) => {
    if (selectedArchetypes.includes(tag)) {
      onSelectionChange(selectedArchetypes.filter(t => t !== tag));
    } else {
      if (maxSelection && selectedArchetypes.length >= maxSelection) {
        // If max reached, replace last one
        const newSelection = [...selectedArchetypes.slice(0, maxSelection - 1), tag];
        onSelectionChange(newSelection);
      } else {
        onSelectionChange([...selectedArchetypes, tag]);
      }
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading archetypes...</p>
      </div>
    );
  }

  if (archetypes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No archetypes available</p>
        <p className="text-sm mt-2">Contact admin to seed archetypes</p>
      </div>
    );
  }

  const archetypesByCategory = ARCHETYPE_CATEGORIES.reduce((acc, category) => {
    acc[category] = archetypes.filter(a => a.category === category);
    return acc;
  }, {} as Record<string, Archetype[]>);

  if (!showCategories) {
    // Simple grid view without categories
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {archetypes.map((archetype) => {
          const isSelected = selectedArchetypes.includes(archetype.tag);
          return (
            <button
              key={archetype.tag}
              onClick={() => toggleArchetype(archetype.tag)}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'}
              `}
            >
              <div className="flex items-start gap-2">
                <span className="text-3xl">{archetype.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1">
                    {archetype.name}
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {archetype.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Category-based view
  return (
    <div className="space-y-4">
      {maxSelection && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Users className="w-4 h-4 inline mr-1" />
          Selected: {selectedArchetypes.length} / {maxSelection}
        </div>
      )}

      {ARCHETYPE_CATEGORIES.map((category) => {
        const categoryArchetypes = archetypesByCategory[category] || [];
        if (categoryArchetypes.length === 0) return null;

        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
            >
              <h3 className="font-semibold text-gray-900">{category}</h3>
              <Badge variant="secondary">{categoryArchetypes.length}</Badge>
            </button>

            {isExpanded && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryArchetypes.map((archetype) => {
                  const isSelected = selectedArchetypes.includes(archetype.tag);
                  return (
                    <button
                      key={archetype.tag}
                      onClick={() => toggleArchetype(archetype.tag)}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${isSelected 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{archetype.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-1">
                            {archetype.name}
                            {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {archetype.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {selectedArchetypes.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <Label className="mb-2 block text-indigo-900">Your Selected Archetypes</Label>
          <div className="flex flex-wrap gap-2">
            {selectedArchetypes.map((tag) => {
              const archetype = archetypes.find(a => a.tag === tag);
              if (!archetype) return null;
              
              return (
                <Badge key={tag} variant="default" className="gap-1">
                  <span>{archetype.emoji}</span>
                  {archetype.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
