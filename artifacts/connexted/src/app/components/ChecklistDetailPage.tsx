import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ShareInviteButton } from '@/app/components/shared/ShareInviteButton';
import {
  CheckSquare,
  Plus,
  Trash,
  Edit,
  Save,
  X,
  GripVertical,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface Checklist {
  id: string;
  name: string;
  description: string;
  category: string;
  is_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  is_complete: boolean;
  assignment: string;
  notes: string;
  priority: number;
}

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedIsTemplate, setEditedIsTemplate] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemAssignment, setNewItemAssignment] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (id && profile) {
      fetchChecklist();
    }
  }, [id, profile]);

  const fetchChecklist = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch checklist with creator info
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklists')
        .select(`
          *,
          creator:created_by(id, name, avatar)
        `)
        .eq('id', id)
        .single();

      if (checklistError) throw checklistError;
      
      // Transform creator from array to object
      const transformedChecklist = {
        ...checklistData,
        creator: Array.isArray(checklistData.creator) ? checklistData.creator[0] : checklistData.creator
      };
      
      setChecklist(transformedChecklist);
      setEditedName(checklistData.name);
      setEditedDescription(checklistData.description || '');
      setEditedCategory(checklistData.category || '');
      setEditedIsTemplate(checklistData.is_template);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', id)
        .order('priority');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      toast.error('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChecklist = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('checklists')
        .update({
          name: editedName,
          description: editedDescription,
          category: editedCategory,
          is_template: editedIsTemplate,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('List updated');
      setEditingChecklist(false);
      fetchChecklist();
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Failed to update list');
    }
  };

  const handleAddItem = async () => {
    if (!id || !newItemText.trim()) return;

    try {
      const maxPriority = items.length > 0 ? Math.max(...items.map((i) => i.priority)) : 0;

      const { error } = await supabase.from('checklist_items').insert({
        checklist_id: id,
        text: newItemText.trim(),
        assignment: newItemAssignment.trim(),
        notes: newItemNotes.trim(),
        priority: maxPriority + 1,
        is_complete: false,
      });

      if (error) throw error;

      toast.success('Item added');
      setNewItemText('');
      setNewItemAssignment('');
      setNewItemNotes('');
      fetchChecklist();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleToggleComplete = async (item: ChecklistItem) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ is_complete: !item.is_complete })
        .eq('id', item.id);

      if (error) throw error;

      setItems(
        items.map((i) => (i.id === item.id ? { ...i, is_complete: !i.is_complete } : i))
      );
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

      if (error) throw error;

      toast.success('Item deleted');
      fetchChecklist();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item updated');
      fetchChecklist();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleMovePriority = async (item: ChecklistItem, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex((i) => i.id === item.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === items.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapItem = items[swapIndex];

    try {
      // Swap priorities
      await supabase
        .from('checklist_items')
        .update({ priority: swapItem.priority })
        .eq('id', item.id);

      await supabase
        .from('checklist_items')
        .update({ priority: item.priority })
        .eq('id', swapItem.id);

      fetchChecklist();
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  };

  const handleDeleteChecklist = async () => {
    if (!id || !confirm('Delete this checklist? This action cannot be undone.')) return;

    try {
      const { error } = await supabase.from('checklists').delete().eq('id', id);

      if (error) throw error;

      toast.success('Checklist deleted');
      navigate('/checklists');
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Failed to delete checklist');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4">Loading checklist...</p>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">List not found</h3>
        <Button asChild>
          <Link to="/checklists">Back to Lists</Link>
        </Button>
      </div>
    );
  }

  const completedItems = items.filter((item) => item.is_complete).length;
  const totalItems = items.length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Lists', path: '/checklists' },
          { label: checklist.name },
        ]}
      />

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {editingChecklist ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Checklist name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="What is this checklist for?"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={editedCategory}
                onChange={(e) => setEditedCategory(e.target.value)}
                placeholder="e.g., Development, Design, QA"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_template"
                checked={editedIsTemplate}
                onChange={(e) => setEditedIsTemplate(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <Label htmlFor="is_template">This is a template</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveChecklist}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditingChecklist(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{checklist.name}</h1>
                  {checklist.description && (
                    <p className="text-gray-600 mt-1">{checklist.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareInviteButton
                  entityType="checklist"
                  entityId={checklist.id}
                  entityName={checklist.name}
                />
                <Button variant="outline" size="sm" onClick={() => setEditingChecklist(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeleteChecklist}>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {checklist.category && <Badge variant="secondary">{checklist.category}</Badge>}
              {checklist.is_template && <Badge variant="outline">Template</Badge>}
            </div>

            {/* Creator Info */}
            {checklist.creator && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={checklist.creator.avatar} alt={checklist.creator.name} />
                  <AvatarFallback>{checklist.creator.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <span>Created by <span className="font-medium text-gray-900">{checklist.creator.name}</span></span>
                <span>•</span>
                <span>{new Date(checklist.created_at).toLocaleDateString()}</span>
              </div>
            )}

            {/* Progress */}
            {totalItems > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {completedItems} / {totalItems} completed
                  </span>
                  <span className="font-semibold">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Item */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Item</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-item-text">Task *</Label>
            <Input
              id="new-item-text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="What needs to be done?"
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-item-assignment">Assignment</Label>
              <Input
                id="new-item-assignment"
                value={newItemAssignment}
                onChange={(e) => setNewItemAssignment(e.target.value)}
                placeholder="e.g., Frontend Team, QA"
              />
            </div>
            <div>
              <Label htmlFor="new-item-notes">Notes</Label>
              <Input
                id="new-item-notes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Additional details"
              />
            </div>
          </div>
          <Button onClick={handleAddItem} disabled={!newItemText.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Items ({totalItems})
        </h2>
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items yet. Add one above!</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  item.is_complete ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(item)}
                    className="flex-shrink-0 mt-1"
                  >
                    {item.is_complete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${item.is_complete ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {item.text}
                    </div>
                    {(item.assignment || item.notes) && (
                      <div className="mt-1 space-y-1 text-sm text-gray-600">
                        {item.assignment && (
                          <div>
                            <span className="font-medium">Assignment:</span> {item.assignment}
                          </div>
                        )}
                        {item.notes && (
                          <div>
                            <span className="font-medium">Notes:</span> {item.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMovePriority(item, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMovePriority(item, 'down')}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}