import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Map, Plus, Edit2, Trash2, Eye, GripVertical, 
  FileText, Save, X, ChevronDown, ChevronRight,
  Container, Calendar, MessageSquare, Link as LinkIcon,
  FileCode, BookOpen, Presentation, Library, PlayCircle,
  Hammer, Table as TableIcon, TrendingUp, Users, CalendarClock, Handshake,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
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
import { JOURNEY_ITEM_TYPES, JourneyItemType } from '@/lib/journey-item-types';
import { AddContentDialog } from '@/app/components/admin/AddContentDialog';

interface Journey {
  id: string;
  program_id: string;
  title: string;
  description: string;
  order_index: number;
  status: string;
  circle_id: string | null;
}

interface JourneyItem {
  id: string;
  journey_id: string;
  item_type: 'document' | 'book' | 'deck' | 'shelf' | 'playlist' | 
              'build' | 'pitch' | 'table' | 'elevator' | 'standup' | 'meetup' | 'sprint' |
              'event' | 'discussion' | 'resource' | 'container';
  item_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  icon: string | null;
  estimated_time: number | null;
  created_at: string;
}

interface Circle {
  id: string;
  name: string;
}

interface Container {
  id: string;
  name: string;
  description?: string;
  slug: string;
}

interface JourneyManagementProps {
  programId?: string;
  courseId?: string;
  journeys: Journey[];
  onRefresh: () => void;
}

export default function JourneyManagement({ programId, courseId, journeys, onRefresh }: JourneyManagementProps) {
  const { profile } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [journeyItems, setJourneyItems] = useState<JourneyItem[]>([]);
  const [expandedJourneys, setExpandedJourneys] = useState<Set<string>>(new Set());
  const [availableContainers, setAvailableContainers] = useState<Record<string, Container[]>>({});
  
  const contentType = courseId ? 'course' : 'program';
  const contentId = courseId || programId;
  
  // Dialog states
  const [addJourneyDialogOpen, setAddJourneyDialogOpen] = useState(false);
  const [editJourneyDialogOpen, setEditJourneyDialogOpen] = useState(false);
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false);
  const [createContainerDialogOpen, setCreateContainerDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [journeyForm, setJourneyForm] = useState({
    title: '',
    description: '',
    status: 'not-started',
    circle_id: ''
  });
  
  // Extended content form to support ALL item types
  const [contentForm, setContentForm] = useState<{
    item_type: 'document' | 'book' | 'deck' | 'shelf' | 'playlist' | 
                'build' | 'pitch' | 'table' | 'elevator' | 'standup' | 'meetup' | 'sprint' |
                'event' | 'discussion' | 'resource' | 'container';
    container_type: ContainerType;
    existing_item_id: string;
    title: string;
    description: string;
    is_published: boolean;
  }>({
    item_type: 'document',
    container_type: 'tables',
    existing_item_id: '',
    title: '',
    description: '',
    is_published: true
  });

  const [newContainerForm, setNewContainerForm] = useState({
    container_type: 'tables' as ContainerType,
    name: '',
    description: '',
    link_to_journey: true
  });
  
  const [itemToDelete, setItemToDelete] = useState<JourneyItem | null>(null);

  useEffect(() => {
    fetchCircles();
  }, []);

  useEffect(() => {
    if (selectedJourney) {
      fetchJourneyItems(selectedJourney.id);
    }
  }, [selectedJourney]);

  useEffect(() => {
    if (addContentDialogOpen && contentForm.item_type === 'container') {
      fetchAvailableContainers(contentForm.container_type);
    }
  }, [addContentDialogOpen, contentForm.item_type, contentForm.container_type]);

  const fetchCircles = async () => {
    try {
      const { data, error } = await supabase
        .from('circles')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCircles(data || []);
    } catch (error: any) {
      console.error('Error fetching circles:', error);
    }
  };

  const fetchJourneyItems = async (journeyId: string) => {
    try {
      const { data, error } = await supabase
        .from('journey_items')
        .select('*')
        .eq('journey_id', journeyId)
        .order('order_index', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Journey items table not yet created.');
          setJourneyItems([]);
          return;
        }
        throw error;
      }
      setJourneyItems(data || []);
    } catch (error: any) {
      console.error('Error fetching journey items:', error);
      toast.error('Failed to load journey items');
    }
  };

  const fetchAvailableContainers = async (containerType: ContainerType) => {
    try {
      // books uses `title` instead of `name` and has no `slug`
      const isBooks = containerType === 'books';
      const selectCols = isBooks
        ? 'id, title, description'
        : 'id, name, description, slug';
      const orderCol = isBooks ? 'title' : 'name';

      const { data, error } = await supabase
        .from(containerType)
        .select(selectCols)
        .order(orderCol);

      if (error) throw error;

      // Normalise books rows so the rest of the UI can use `.name`
      const normalised = isBooks
        ? (data || []).map((b: any) => ({ ...b, name: b.title }))
        : data || [];

      setAvailableContainers(prev => ({
        ...prev,
        [containerType]: normalised
      }));
    } catch (error: any) {
      console.error(`Error fetching ${containerType}:`, error);
    }
  };

  const handleAddJourney = async () => {
    if (!journeyForm.title.trim()) {
      toast.error('Journey name is required');
      return;
    }

    try {
      const maxOrder = Math.max(...journeys.map(j => j.order_index), -1);
      
      const journeyData: any = {
        title: journeyForm.title,
        description: journeyForm.description,
        status: journeyForm.status,
        circle_id: journeyForm.circle_id === 'none' ? null : journeyForm.circle_id || null,
        order_index: maxOrder + 1
      };

      // Add either program_id or course_id based on context
      if (programId) {
        journeyData.program_id = programId;
      } else if (courseId) {
        journeyData.course_id = courseId;
      }

      console.log('🔍 Creating journey with data:', journeyData);
      console.log('🔍 courseId:', courseId, 'programId:', programId);

      const { data, error } = await supabase
        .from('program_journeys')
        .insert(journeyData)
        .select()
        .single();

      if (error) {
        console.error('❌ Journey insert error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      console.log('✅ Journey created:', data);
      toast.success('Journey created successfully');
      setAddJourneyDialogOpen(false);
      setJourneyForm({ title: '', description: '', status: 'not-started', circle_id: '' });
      onRefresh();
    } catch (error: any) {
      console.error('Error creating journey:', error);
      toast.error(`Failed to create journey: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateJourney = async () => {
    if (!selectedJourney || !journeyForm.title.trim()) {
      toast.error('Journey name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('program_journeys')
        .update({
          title: journeyForm.title,
          description: journeyForm.description,
          status: journeyForm.status,
          circle_id: journeyForm.circle_id === 'none' ? null : journeyForm.circle_id || null
        })
        .eq('id', selectedJourney.id);

      if (error) throw error;

      toast.success('Journey updated successfully');
      setEditJourneyDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating journey:', error);
      toast.error('Failed to update journey');
    }
  };

  const handleDeleteJourney = async (journeyId: string) => {
    if (!confirm('Are you sure you want to delete this journey? This will also remove all its content items.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('program_journeys')
        .delete()
        .eq('id', journeyId);

      if (error) throw error;

      toast.success('Journey deleted successfully');
      if (selectedJourney?.id === journeyId) {
        setSelectedJourney(null);
      }
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting journey:', error);
      toast.error('Failed to delete journey');
    }
  };

  const handleAddContentItem = async () => {
    if (!selectedJourney) {
      toast.error('Please select a journey first');
      return;
    }

    if (contentForm.item_type === 'container' && !contentForm.existing_item_id) {
      toast.error('Please select a container');
      return;
    }

    if (!contentForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const maxOrder = Math.max(...journeyItems.map(i => i.order_index), -1);
      
      const { error } = await supabase
        .from('journey_items')
        .insert({
          journey_id: selectedJourney.id,
          item_type: contentForm.item_type,
          item_id: contentForm.existing_item_id || crypto.randomUUID(), // Temp ID for non-container items
          title: contentForm.title,
          description: contentForm.description,
          order_index: maxOrder + 1,
          is_published: contentForm.is_published,
        });

      if (error) throw error;

      toast.success('Content item added successfully');
      setAddContentDialogOpen(false);
      setContentForm({
        item_type: 'document',
        container_type: 'tables',
        existing_item_id: '',
        title: '',
        description: '',
        is_published: true
      });
      fetchJourneyItems(selectedJourney.id);
    } catch (error: any) {
      console.error('Error adding content item:', error);
      toast.error('Failed to add content item');
    }
  };

  const handleCreateContainer = async () => {
    if (!newContainerForm.name.trim()) {
      toast.error('Container name is required');
      return;
    }

    try {
      // Generate slug
      const slug = newContainerForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Build type-specific container data
      // books uses `title` instead of `name` and has no `slug` column
      const isBooks = newContainerForm.container_type === 'books';
      const containerData: any = {
        ...(isBooks
          ? { title: newContainerForm.name }
          : { name: newContainerForm.name, slug }),
        description: newContainerForm.description,
        created_by: profile?.id,
        member_ids: [profile?.id],
        admin_ids: [profile?.id]
      };

      const { data, error } = await supabase
        .from(newContainerForm.container_type)
        .insert(containerData)
        .select()
        .single();

      if (error) throw error;

      toast.success(`${CONTAINER_TYPES[newContainerForm.container_type].label} created successfully`);

      // Link to journey if requested
      if (newContainerForm.link_to_journey && selectedJourney && data) {
        const maxOrder = Math.max(...journeyItems.map(i => i.order_index), -1);
        
        const { error: linkError } = await supabase
          .from('journey_items')
          .insert({
            journey_id: selectedJourney.id,
            item_type: 'container',
            item_id: data.id,
            title: newContainerForm.name,
            description: newContainerForm.description,
            order_index: maxOrder + 1,
            is_published: true,
          });

        if (linkError) throw linkError;
        fetchJourneyItems(selectedJourney.id);
      }

      setCreateContainerDialogOpen(false);
      setNewContainerForm({
        container_type: 'tables',
        name: '',
        description: '',
        link_to_journey: true
      });
    } catch (error: any) {
      console.error('Error creating container:', error);
      toast.error('Failed to create container');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('journey_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast.success('Content item removed from journey');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      if (selectedJourney) {
        fetchJourneyItems(selectedJourney.id);
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Failed to remove content item');
    }
  };

  const toggleJourneyExpansion = (journeyId: string) => {
    const newExpanded = new Set(expandedJourneys);
    if (newExpanded.has(journeyId)) {
      newExpanded.delete(journeyId);
    } else {
      newExpanded.add(journeyId);
    }
    setExpandedJourneys(newExpanded);
    
    // Load items if expanding
    if (!expandedJourneys.has(journeyId)) {
      const journey = journeys.find(j => j.id === journeyId);
      if (journey) {
        setSelectedJourney(journey);
      }
    }
  };

  const openEditJourneyDialog = (journey: Journey) => {
    setSelectedJourney(journey);
    setJourneyForm({
      title: journey.title,
      description: journey.description,
      status: journey.status,
      circle_id: journey.circle_id || ''
    });
    setEditJourneyDialogOpen(true);
  };

  const openAddContentDialog = (journey: Journey) => {
    setSelectedJourney(journey);
    setAddContentDialogOpen(true);
  };

  const openCreateContainerDialog = (journey: Journey) => {
    setSelectedJourney(journey);
    setCreateContainerDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Journey Management</CardTitle>
              <CardDescription>
                Organize your program into journeys and add content items to each journey
              </CardDescription>
            </div>
            <Button onClick={() => setAddJourneyDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Journey
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {journeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Map className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="mb-2">No journeys yet</p>
              <p className="text-sm">Create your first journey to start organizing program content</p>
            </div>
          ) : (
            <div className="space-y-4">
              {journeys.map((journey) => (
                <Card key={journey.id} className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleJourneyExpansion(journey.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedJourneys.has(journey.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{journey.title}</h3>
                            <Badge variant={journey.status === 'published' ? 'default' : 'secondary'}>
                              {journey.status}
                            </Badge>
                          </div>
                          {journey.description && (
                            <p className="text-sm text-gray-600 mt-1">{journey.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddContentDialog(journey)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Content
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreateContainerDialog(journey)}
                        >
                          <Container className="w-4 h-4 mr-1" />
                          Create Container
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditJourneyDialog(journey)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteJourney(journey.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedJourneys.has(journey.id) && selectedJourney?.id === journey.id && (
                    <CardContent className="pt-0">
                      {journeyItems.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-3">No content items yet</p>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddContentDialog(journey)}
                            >
                              Add Existing Content
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCreateContainerDialog(journey)}
                            >
                              Create New Container
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {journeyItems.map((item, index) => {
                            // Get type-specific icon and config
                            const typeConfig = JOURNEY_ITEM_TYPES[item.item_type as JourneyItemType];
                            const Icon = typeConfig?.icon || FileText;
                            
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                              >
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <Icon className="w-5 h-5 text-indigo-600" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {typeConfig?.label || item.item_type}
                                    </Badge>
                                    {!item.is_published && (
                                      <Badge variant="secondary" className="text-xs">
                                        Draft
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Journey Dialog */}
      <Dialog open={addJourneyDialogOpen} onOpenChange={setAddJourneyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Journey</DialogTitle>
            <DialogDescription>
              Create a new journey (module/phase) for this program
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Journey Name</label>
              <Input
                value={journeyForm.title}
                onChange={(e) => setJourneyForm({ ...journeyForm, title: e.target.value })}
                placeholder="e.g., Foundation Phase, Advanced Training"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={journeyForm.description}
                onChange={(e) => setJourneyForm({ ...journeyForm, description: e.target.value })}
                placeholder="Describe this journey..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={journeyForm.status} onValueChange={(value) => setJourneyForm({ ...journeyForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Circle (Optional)</label>
                <Select value={journeyForm.circle_id} onValueChange={(value) => setJourneyForm({ ...journeyForm, circle_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select circle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {circles.map((circle) => (
                      <SelectItem key={circle.id} value={circle.id}>
                        {circle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddJourneyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJourney}>
              <Save className="w-4 h-4 mr-2" />
              Create Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Journey Dialog */}
      <Dialog open={editJourneyDialogOpen} onOpenChange={setEditJourneyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Journey</DialogTitle>
            <DialogDescription>
              Update journey details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Journey Name</label>
              <Input
                value={journeyForm.title}
                onChange={(e) => setJourneyForm({ ...journeyForm, title: e.target.value })}
                placeholder="e.g., Foundation Phase"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={journeyForm.description}
                onChange={(e) => setJourneyForm({ ...journeyForm, description: e.target.value })}
                placeholder="Describe this journey..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={journeyForm.status} onValueChange={(value) => setJourneyForm({ ...journeyForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Circle (Optional)</label>
                <Select value={journeyForm.circle_id} onValueChange={(value) => setJourneyForm({ ...journeyForm, circle_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select circle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {circles.map((circle) => (
                      <SelectItem key={circle.id} value={circle.id}>
                        {circle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJourneyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateJourney}>
              <Save className="w-4 h-4 mr-2" />
              Update Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Content Item Dialog - Using the comprehensive new component */}
      <AddContentDialog
        open={addContentDialogOpen}
        onOpenChange={setAddContentDialogOpen}
        selectedJourney={selectedJourney}
        onSuccess={() => {
          if (selectedJourney) {
            fetchJourneyItems(selectedJourney.id);
          }
        }}
        profileId={profile?.id}
      />

      {/* Create Container Dialog */}
      <Dialog open={createContainerDialogOpen} onOpenChange={setCreateContainerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Container</DialogTitle>
            <DialogDescription>
              Create a new container and optionally add it to this journey
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Container Type</label>
              <Select 
                value={newContainerForm.container_type} 
                onValueChange={(value) => setNewContainerForm({ ...newContainerForm, container_type: value as ContainerType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTAINER_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newContainerForm.name}
                onChange={(e) => setNewContainerForm({ ...newContainerForm, name: e.target.value })}
                placeholder={`e.g., Product Strategy ${CONTAINER_TYPES[newContainerForm.container_type].label}`}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={newContainerForm.description}
                onChange={(e) => setNewContainerForm({ ...newContainerForm, description: e.target.value })}
                placeholder={`Describe this ${CONTAINER_TYPES[newContainerForm.container_type].label.toLowerCase()}...`}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="link_to_journey"
                checked={newContainerForm.link_to_journey}
                onChange={(e) => setNewContainerForm({ ...newContainerForm, link_to_journey: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="link_to_journey" className="text-sm font-medium text-blue-900">
                Add to current journey ({selectedJourney?.title})
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateContainerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContainer}>
              <Save className="w-4 h-4 mr-2" />
              Create {CONTAINER_TYPES[newContainerForm.container_type].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Content Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{itemToDelete?.title}" from this journey?
              This will not delete the actual content, just remove it from the journey.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}