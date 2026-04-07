// Split candidate: ~412 lines — consider extracting ChecklistRow, ChecklistItemsPreview, and ChecklistActionsMenu into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { CheckSquare, Search, Trash2, Download, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { format } from 'date-fns';

interface ChecklistItem {
  id: string;
  text: string;
  order_index: number;
}

interface Checklist {
  id: string;
  name: string;
  description: string;
  category: string;
  is_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  items?: ChecklistItem[];
}

export default function ChecklistsManagement() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  
  useEffect(() => {
    if (!profile || profile.role !== 'super') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all checklists with author info
        const { data: checklistsData, error: checklistsError } = await supabase
          .from('checklists')
          .select(`
            *,
            author:users!checklists_created_by_fkey(id, name, email)
          `)
          .order('created_at', { ascending: false });

        if (checklistsError) {
          // Handle table doesn't exist error gracefully
          if (checklistsError.code === 'PGRST204' || checklistsError.code === 'PGRST205' || checklistsError.code === '42P01') {
            console.log('Checklists table not found');
            setChecklists([]);
            setLoading(false);
            return;
          }
          throw checklistsError;
        }

        // Fetch items for each checklist
        const checklistsWithItems = await Promise.all(
          (checklistsData || []).map(async (checklist) => {
            const { data: items } = await supabase
              .from('checklist_items')
              .select('*')
              .eq('checklist_id', checklist.id)
              .order('order_index');
            
            return {
              ...checklist,
              items: items || []
            };
          })
        );

        setChecklists(checklistsWithItems);
        
      } catch (error) {
        console.error('Error fetching checklists:', error);
        toast.error('Failed to load lists');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);
  
  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const categories = Array.from(new Set(checklists.map(c => c.category).filter(Boolean)));
  
  const filteredChecklists = checklists
    .filter(checklist => {
      const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checklist.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || checklist.category === categoryFilter;
      const matchesTemplate = templateFilter === 'all' || 
        (templateFilter === 'templates' && checklist.is_template) ||
        (templateFilter === 'regular' && !checklist.is_template);
      return matchesSearch && matchesCategory && matchesTemplate;
    });

  const handleDeleteChecklist = async (checklistId: string, checklistName: string) => {
    try {
      // First delete all items
      await supabase
        .from('checklist_items')
        .delete()
        .eq('checklist_id', checklistId);

      // Then delete the checklist
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;

      setChecklists(checklists.filter(c => c.id !== checklistId));
      toast.success(`List "${checklistName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Failed to delete list');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(checklists, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `checklists-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Lists exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Lists Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading lists...</p>
        </div>
      </div>
    );
  }

  const templateCount = checklists.filter(c => c.is_template).length;
  const totalItems = checklists.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Lists Management' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Lists Management</h1>
          <p className="text-gray-600">Manage all lists across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Link to="/checklists/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create List
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checklists.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{templateCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={templateFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setTemplateFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={templateFilter === 'templates' ? 'default' : 'outline'}
            onClick={() => setTemplateFilter('templates')}
            size="sm"
          >
            Templates
          </Button>
          <Button
            variant={templateFilter === 'regular' ? 'default' : 'outline'}
            onClick={() => setTemplateFilter('regular')}
            size="sm"
          >
            Regular
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('all')}
            size="sm"
          >
            All Categories
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={categoryFilter === category ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(category)}
              size="sm"
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Checklists List */}
      <div className="space-y-4">
        {filteredChecklists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {checklists.length === 0 ? (
                <div>
                  <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="mb-4">No lists found. Tables may not be set up yet.</p>
                  <Link to="/setup/checklists">
                    <Button>
                      Go to Setup
                    </Button>
                  </Link>
                </div>
              ) : (
                'No lists match your filters'
              )}
            </CardContent>
          </Card>
        ) : (
          filteredChecklists.map(checklist => {
            return (
              <Card key={checklist.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-semibold">{checklist.name}</h3>
                        {checklist.is_template && (
                          <Badge variant="default" className="bg-blue-600">Template</Badge>
                        )}
                        {checklist.category && (
                          <Badge variant="outline" className="capitalize">{checklist.category}</Badge>
                        )}
                      </div>
                      
                      {checklist.description && (
                        <p className="text-gray-700 mb-3">{checklist.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div>Created by: {checklist.author?.name || 'Unknown'}</div>
                        <div>{checklist.items?.length || 0} items</div>
                        <div>{format(new Date(checklist.created_at), 'PPp')}</div>
                        {checklist.updated_at && (
                          <div>Updated: {format(new Date(checklist.updated_at), 'PP')}</div>
                        )}
                      </div>
                      
                      {checklist.items && checklist.items.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Preview Items:</p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {checklist.items.slice(0, 3).map((item, idx) => (
                              <li key={item.id} className="flex items-start">
                                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                                <span>{item.text}</span>
                              </li>
                            ))}
                            {checklist.items.length > 3 && (
                              <li className="text-gray-400 italic">
                                +{checklist.items.length - 3} more items...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link to={`/checklists/${checklist.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete List?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{checklist.name}"? This will also delete all {checklist.items?.length || 0} items. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteChecklist(checklist.id, checklist.name)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}