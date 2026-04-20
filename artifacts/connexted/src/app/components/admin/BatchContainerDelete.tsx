// Split candidate: ~437 lines — consider extracting ContainerSelectionTable, DeleteProgressIndicator, and DeleteConfirmDialog into sub-components.
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Input } from '@/app/components/ui/input';
import { 
  Trash2, 
  AlertTriangle, 
  Search,
  Loader2,
  Users,
  Calendar,
  CheckSquare,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

// Type union kept for TypeScript safety — labels and list are loaded from DB at runtime
type ContainerType =
  | 'circles'
  | 'tables'
  | 'builds'
  | 'pitches'
  | 'elevators'
  | 'meetups'
  | 'meetings'
  | 'standups'
  | 'sprints'
  | 'programs'
  | 'journeys'
  | 'checklists'
  | 'libraries'
  | 'playlists'
  | 'moments'
  | 'portfolios'
  | 'quizzes'
  | 'events'
  | 'courses';

interface Container {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  created_at: string;
  created_by?: string;
  member_ids?: string[];
  admin_ids?: string[];
}

const containerTypeLabels: Record<ContainerType, string> = {
  circles: 'Circles',
  tables: 'Tables',
  builds: 'Builds',
  pitches: 'Pitches',
  elevators: 'Elevators',
  meetups: 'Meetups',
  meetings: 'Meetings',
  standups: 'Standups',
  sprints: 'Sprints',
  programs: 'Programs',
  journeys: 'Journeys',
  checklists: 'Lists',
  libraries: 'Libraries',
  playlists: 'Playlists',
  moments: 'Moments',
  portfolios: 'Portfolios',
  quizzes: 'Quizzes',
  events: 'Events',
  courses: 'Courses',
};

export default function BatchContainerDelete() {
  const { profile } = useAuth();
  const [containerType, setContainerType] = useState<ContainerType>('circles');
  const [containerTypeOptions, setContainerTypeOptions] = useState<{type_code: string, display_name: string}[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchContainers();
    }
  }, [containerType, profile]);

  useEffect(() => {
    if (profile?.role === 'super') {
      const loadContainerTypeOptions = async () => {
        const { data: containerTypesData } = await supabase
          .from('container_types')
          .select('type_code, display_name')
          .order('sort_order', { ascending: true });

        if (containerTypesData && containerTypesData.length > 0) {
          setContainerTypeOptions(containerTypesData);
        } else {
          // Fallback to hardcoded labels
          setContainerTypeOptions(
            Object.entries(containerTypeLabels).map(([type_code, display_name]) => ({ type_code, display_name }))
          );
        }
      };
      loadContainerTypeOptions();
    }
  }, [profile]);

  const fetchContainers = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    
    try {
      const { data, error } = await supabase
        .from(containerType)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContainers(data || []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error(`Failed to load ${containerTypeLabels[containerType]}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContainers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContainers.map(c => c.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    setDeleting(true);

    try {
      const idsToDelete = Array.from(selectedIds);
      
      // Delete in batches of 10 to avoid timeouts
      const batchSize = 10;
      let deletedCount = 0;

      // Obtain a fresh user token once before the loop
      const { data: sessionData } = await supabase.auth.getSession();
      const userToken = sessionData?.session?.access_token;
      if (!userToken) {
        throw new Error('No active session — please sign in again');
      }
      
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);

        // Send publicAnonKey in Authorization to satisfy the Supabase Edge
        // Function gateway, and the real user JWT in X-User-Token for the
        // server-side admin check (matches the pathway-routes pattern).
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/admin/batch-delete-containers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Token': userToken,
            },
            body: JSON.stringify({
              table: containerType,
              ids: batch,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        if (data && !data.success) {
          throw new Error(data.error || 'Server-side deletion failed');
        }
        
        deletedCount += batch.length;
      }

      toast.success(`Successfully deleted ${deletedCount} ${containerTypeLabels[containerType].toLowerCase()}`);
      
      // Refresh the list
      await fetchContainers();
      setSelectedIds(new Set());
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error('Error deleting containers:', error);
      toast.error(`Failed to delete: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const filteredContainers = containers.filter(container => {
    const name = container.name || container.title || 'Untitled';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.slug?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!profile || profile.role !== 'super') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">Platform admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Batch Container Delete
          </CardTitle>
          <CardDescription>
            Select a container type and delete multiple containers at once. Use with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Container Type Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Container Type</label>
            <Select 
              value={containerType} 
              onValueChange={(value) => setContainerType(value as ContainerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {containerTypeOptions.map(({ type_code, display_name }) => (
                  <SelectItem key={type_code} value={type_code}>
                    {display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Total: {filteredContainers.length}
              </Badge>
              {selectedIds.size > 0 && (
                <Badge variant="default">
                  Selected: {selectedIds.size}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={loading || filteredContainers.length === 0}
              >
                {selectedIds.size === filteredContainers.length ? 'Deselect All' : 'Select All'}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedIds.size === 0 || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedIds.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Container List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading {containerTypeLabels[containerType].toLowerCase()}...</p>
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchQuery 
                  ? `No ${containerTypeLabels[containerType].toLowerCase()} found matching "${searchQuery}"`
                  : `No ${containerTypeLabels[containerType].toLowerCase()} found`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContainers.map((container) => (
                <div
                  key={container.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(container.id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(container.id)}
                      onCheckedChange={() => handleToggleSelect(container.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {container.name || container.title || 'Untitled'}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {container.slug && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {container.slug}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(container.created_at).toLocaleDateString()}
                        </span>
                        
                        {container.member_ids && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {container.member_ids.length} members
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Batch Delete
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-500">
                <p>
                  You are about to permanently delete <strong>{selectedIds.size}</strong>{' '}
                  {containerTypeLabels[containerType].toLowerCase()}.
                </p>
                <p className="text-red-600 font-semibold">
                  ⚠️ This action cannot be undone!
                </p>
                <p>
                  All associated data (members, documents, reviews, posts, etc.) may also be affected.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete {selectedIds.size} Items</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}