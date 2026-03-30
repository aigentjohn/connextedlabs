// COMPREHENSIVE Add Content Dialog Component
// Supports ALL 16 journey item types organized by category
// Split candidate: ~496 lines — consider extracting ContentTypeGrid, ContentFormByType, and ContentSearchPanel into sub-components.
import { useState, useEffect } from 'react';
import { Plus, FileText, BookOpen, Presentation, Library, PlayCircle, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { CONTAINER_TYPES, ContainerType } from '@/lib/container-types';
import { JOURNEY_ITEM_TYPES, JourneyItemType, getItemTypesByCategory } from '@/lib/journey-item-types';

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJourney: { id: string; title: string; circle_id?: string | null } | null;
  onSuccess: () => void;
  profileId?: string;
  programCircleId?: string | null;  // NEW: Pass the program's circle_id to filter
  communityId?: string | null;      // NEW: Pass the community_id to filter
}

export function AddContentDialog({ open, onOpenChange, selectedJourney, onSuccess, profileId, programCircleId, communityId }: AddContentDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<'content' | 'container' | 'other'>('content');
  const [selectedType, setSelectedType] = useState<JourneyItemType>('document');
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [form, setForm] = useState({
    existing_item_id: '',
    title: '',
    description: '',
    is_published: true
  });

  // Fetch items when type changes
  useEffect(() => {
    if (open && selectedType !== 'container') {
      fetchItemsForType(selectedType);
    }
  }, [open, selectedType]);

  // Update selected type when category changes
  useEffect(() => {
    const typesInCategory = getItemTypesByCategory(selectedCategory);
    if (typesInCategory.length > 0) {
      setSelectedType(typesInCategory[0]);
    }
  }, [selectedCategory]);

  const fetchItemsForType = async (type: JourneyItemType) => {
    setLoadingItems(true);
    try {
      const config = JOURNEY_ITEM_TYPES[type];
      if (!config.tableName) {
        setAvailableItems([]);
        return;
      }

      // Determine which fields to select based on table
      let selectFields = 'id, name, description';
      
      // Some tables use different field names
      if (type === 'document' || type === 'book' || type === 'deck' || type === 'episode') {
        selectFields = 'id, title, description';
      } else if (type === 'shelf') {
        selectFields = 'id, name, description';
      } else if (type === 'event') {
        selectFields = 'id, title, description';
      } else if (type === 'playlist') {
        selectFields = 'id, name, description';
      }

      const { data, error } = await supabase
        .from(config.tableName)
        .select(selectFields)
        .order(type === 'document' || type === 'book' || type === 'deck' || type === 'event' || type === 'episode' ? 'title' : 'name');

      if (error) {
        console.warn(`Error fetching ${type}:`, error);
        setAvailableItems([]);
        return;
      }

      // Normalize the data to always have 'name' field
      const normalized = (data || []).map((item: any) => ({
        ...item,
        name: item.name || item.title
      }));

      setAvailableItems(normalized);
    } catch (error: any) {
      console.error(`Error fetching ${type}:`, error);
      setAvailableItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedJourney) {
      toast.error('No journey selected');
      return;
    }

    if (!form.existing_item_id) {
      toast.error('Please select an item');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      // Get current max order
      const { data: existingItems } = await supabase
        .from('journey_items')
        .select('order_index')
        .eq('journey_id', selectedJourney.id);

      const maxOrder = Math.max(...(existingItems || []).map(i => i.order_index), -1);

      const { error } = await supabase
        .from('journey_items')
        .insert({
          journey_id: selectedJourney.id,
          item_type: selectedType,
          item_id: form.existing_item_id,
          title: form.title,
          description: form.description || null,
          order_index: maxOrder + 1,
          is_published: form.is_published,
        });

      if (error) throw error;

      toast.success('Content added to journey!');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding content:', error);
      toast.error('Failed to add content');
    }
  };

  const resetForm = () => {
    setForm({
      existing_item_id: '',
      title: '',
      description: '',
      is_published: true
    });
  };

  const handleItemSelect = (itemId: string) => {
    const item = availableItems.find(i => i.id === itemId);
    setForm({
      ...form,
      existing_item_id: itemId,
      title: item?.name || item?.title || '',
      description: item?.description || ''
    });
  };

  const typesInCategory = getItemTypesByCategory(selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content to Journey</DialogTitle>
          <DialogDescription>
            Add existing content items to "{selectedJourney?.title}"
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as typeof selectedCategory)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="container">
              <Presentation className="w-4 h-4 mr-2" />
              Containers
            </TabsTrigger>
            <TabsTrigger value="other">
              <Calendar className="w-4 h-4 mr-2" />
              Other
            </TabsTrigger>
          </TabsList>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select {JOURNEY_ITEM_TYPES[selectedType].label}
              </label>
              <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${JOURNEY_ITEM_TYPES[selectedType].label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {loadingItems ? (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  ) : availableItems.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No {JOURNEY_ITEM_TYPES[selectedType].labelPlural.toLowerCase()} available
                    </div>
                  ) : (
                    availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="How this appears in the journey"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What learners will do..."
                rows={2}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </TabsContent>

          {/* CONTAINER TAB */}
          <TabsContent value="container" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Container Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select {JOURNEY_ITEM_TYPES[selectedType].label}
              </label>
              <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${JOURNEY_ITEM_TYPES[selectedType].label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {loadingItems ? (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  ) : availableItems.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No {JOURNEY_ITEM_TYPES[selectedType].labelPlural.toLowerCase()} available
                    </div>
                  ) : (
                    availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || item.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="How this appears in the journey"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What learners will do..."
                rows={2}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Published</span>
              </label>
            </div>
          </TabsContent>

          {/* OTHER TAB */}
          <TabsContent value="other" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Type</label>
              <div className="grid grid-cols-2 gap-2">
                {typesInCategory.map((type) => {
                  const config = JOURNEY_ITEM_TYPES[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedType === type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedType === 'event' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Event</label>
                  <Select value={form.existing_item_id} onValueChange={handleItemSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingItems ? (
                        <div className="p-2 text-sm text-gray-500">Loading...</div>
                      ) : availableItems.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No events available</div>
                      ) : (
                        availableItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name || item.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Title (Display Name)</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="How this appears in the journey"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What learners will do..."
                    rows={2}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">Published</span>
                  </label>
                </div>
              </>
            )}

            {(selectedType === 'discussion' || selectedType === 'resource') && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  {selectedType === 'discussion' 
                    ? 'Discussions linking coming soon - use Forums to create discussions first'
                    : 'Resources allow you to link external URLs and files'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.existing_item_id || !form.title.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Journey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}