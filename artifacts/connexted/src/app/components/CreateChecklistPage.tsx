import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { CheckSquare, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useContentAuth } from '@/lib/content-auth';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';

export default function CreateChecklistPage() {
  const { profile } = useAuth();
  const { ownerFields } = useContentAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          is_template: isTemplate,
          ...ownerFields('checklists'),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('List created');
      navigate(`/checklists/${data.id}`);
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      // Check if tables don't exist
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        navigate('/checklists/setup');
        return;
      }
      toast.error('Failed to create list');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Lists', path: '/checklists' },
          { label: 'Create List' },
        ]}
      />

      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <CheckSquare className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create List</h1>
            <p className="text-gray-600">Create a new list for your sprints</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Development List, QA Testing, Deployment"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this list for?"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Development, Design, QA, Marketing, Operations"
            />
            <p className="text-sm text-gray-500 mt-1">
              Helps organize and filter lists
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_template"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div className="flex-1">
              <Label htmlFor="is_template" className="cursor-pointer">
                This is a template
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Templates can be used when creating new sprints. They serve as starting points
                for common list types.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <Button type="submit" disabled={submitting || !name.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Creating...' : 'Create List'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/checklists')}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h3 className="font-semibold text-indigo-900 mb-2">Next Steps</h3>
          <p className="text-sm text-indigo-800">
            After creating your list, you'll be able to add items, set priorities, and
            assign tasks. You can then add this list to sprints to track progress.
          </p>
        </div>
      </div>

      {/* JSON Import/Export */}
    </div>
  );
}