import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { CalendarClock, Edit, Trash2, Search, Plus, Download, Users, CheckSquare } from 'lucide-react';
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

interface Sprint {
  id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  goals: string[];
  member_ids: string[];
  admin_ids: string[];
  created_at: string;
  updated_at: string;
}

export default function SprintsManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) return;

    const fetchSprints = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sprints')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Handle table doesn't exist error gracefully
          if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
            console.log('Sprints table not found');
            setSprints([]);
            setLoading(false);
            return;
          }
          throw error;
        }
        setSprints(data || []);
      } catch (error) {
        console.error('Error fetching sprints:', error);
        toast.error('Failed to load sprints');
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [profile]);
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const filteredSprints = sprints.filter(sprint => {
    const matchesSearch = sprint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sprint.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sprint.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteSprint = async (sprintId: string, sprintName: string) => {
    try {
      // Delete sprint_checklists junction records first
      await supabase
        .from('sprint_checklists')
        .delete()
        .eq('sprint_id', sprintId);

      // Then delete the sprint
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', sprintId);

      if (error) throw error;

      setSprints(sprints.filter(s => s.id !== sprintId));
      toast.success(`Sprint "${sprintName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting sprint:', error);
      toast.error('Failed to delete sprint');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(sprints, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `sprints-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Sprints exported successfully!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Sprints Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading sprints...</p>
        </div>
      </div>
    );
  }

  const statuses = Array.from(new Set(sprints.map(s => s.status).filter(Boolean)));
  const activeSprints = sprints.filter(s => s.status === 'active').length;
  const totalMembers = sprints.reduce((sum, s) => sum + (s.member_ids?.length || 0), 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Sprints Management' }
      ]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Sprints Management</h1>
          <p className="text-gray-600">Create and manage all sprint containers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Link to="/sprints/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Sprint
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprints.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSprints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statuses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search sprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            All
          </Button>
          {statuses.map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              size="sm"
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Sprints List */}
      <div className="space-y-4">
        {filteredSprints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {sprints.length === 0 ? (
                <div>
                  <CalendarClock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="mb-4">No sprints found. Tables may not be set up yet.</p>
                  <Link to="/setup/sprints">
                    <Button>
                      Go to Setup
                    </Button>
                  </Link>
                </div>
              ) : (
                'No sprints match your filters'
              )}
            </CardContent>
          </Card>
        ) : (
          filteredSprints.map((sprint) => (
            <Card key={sprint.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{sprint.name}</h3>
                        {sprint.status && (
                          <Badge 
                            variant={sprint.status === 'active' ? 'default' : 'outline'}
                            className="capitalize"
                          >
                            {sprint.status}
                          </Badge>
                        )}
                      </div>
                      
                      {sprint.description && (
                        <p className="text-gray-600 mb-3">{sprint.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {sprint.member_ids?.length || 0} members
                        </div>
                        <div>
                          Slug: <span className="font-mono text-xs">{sprint.slug}</span>
                        </div>
                        {sprint.start_date && (
                          <div>Start: {format(new Date(sprint.start_date), 'PP')}</div>
                        )}
                        {sprint.end_date && (
                          <div>End: {format(new Date(sprint.end_date), 'PP')}</div>
                        )}
                      </div>

                      {sprint.goals && sprint.goals.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">Goals:</p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {sprint.goals.slice(0, 3).map((goal, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-gray-400 mr-2">•</span>
                                <span>{goal}</span>
                              </li>
                            ))}
                            {sprint.goals.length > 3 && (
                              <li className="text-gray-400 italic">
                                +{sprint.goals.length - 3} more goals...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Created {format(new Date(sprint.created_at), 'PPp')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Link to={`/sprints/${sprint.slug}/settings`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={`/sprints/${sprint.slug}`}>
                      <Button variant="ghost" size="sm">
                        View
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
                          <AlertDialogTitle>Delete Sprint?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{sprint.name}"? This will remove all members and linked checklists. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSprint(sprint.id, sprint.name)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}