// Split candidate: ~592 lines — consider extracting SessionAttendanceTable, SessionLinksPanel, and SessionNotesEditor into sub-components.
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, Calendar, AlertCircle, Edit2, Trash2, ArrowLeft, Video, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/app/components/ui/breadcrumb';
import { AttendanceTracker } from '@/app/components/admin/AttendanceTracker';
import type { Session } from '@/types/sessions';

interface Program {
  id: string;
  name: string;
}

export function SessionManagement() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showAttendance, setShowAttendance] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    session_type: 'meeting' as const,
    start_date: '',
    duration_minutes: '60',
    location: '',
    virtual_link: '',
    status: 'scheduled' as const,
    max_capacity: ''
  });

  useEffect(() => {
    if (programId) {
      loadData();
    }
  }, [programId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load program
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .single();
      if (error) throw error;
      setProgram(data);

      // Load sessions for this program
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('program_id', programId)
        .order('start_date', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const sessionData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        session_type: formData.session_type,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        duration_minutes: parseInt(formData.duration_minutes) || null,
        location: formData.location.trim() || null,
        virtual_link: formData.virtual_link.trim() || null,
        status: formData.status,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
        program_id: programId
      };

      const { error } = await supabase
        .from('sessions')
        .insert([sessionData]);

      if (error) throw error;

      toast.success('Session created successfully!');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    try {
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        session_type: formData.session_type,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        duration_minutes: parseInt(formData.duration_minutes) || null,
        location: formData.location.trim() || null,
        virtual_link: formData.virtual_link.trim() || null,
        status: formData.status,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null
      };

      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', editingSession.id);

      if (error) throw error;

      toast.success('Session updated successfully!');
      setEditingSession(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This will also delete all attendance records.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      session_type: 'meeting',
      start_date: '',
      duration_minutes: '60',
      location: '',
      virtual_link: '',
      status: 'scheduled',
      max_capacity: ''
    });
  };

  const openEditDialog = (session: Session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      description: session.description || '',
      session_type: session.session_type,
      start_date: new Date(session.start_date).toISOString().slice(0, 16),
      duration_minutes: session.duration_minutes.toString(),
      location: session.location || '',
      virtual_link: session.virtual_link || '',
      status: session.status,
      max_capacity: session.max_capacity?.toString() || ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      scheduled: { variant: 'default', label: 'Scheduled' },
      in_progress: { variant: 'default', label: 'In Progress' },
      completed: { variant: 'secondary', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (showAttendance) {
    return <AttendanceTracker sessionId={showAttendance} onBack={() => setShowAttendance(null)} />;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading sessions...</p>
      </div>
    );
  }

  const backPath = '/program-admin';

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumb
        items={[
          { label: 'Program Admin', href: backPath },
          { label: program?.name || '', href: '#' },
          { label: 'Sessions', href: '#' }
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{program?.name} - Sessions</h1>
          <p className="text-gray-600 mt-1">
            Manage scheduled sessions and track attendance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(backPath)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Schedule a new session for {program?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Session Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Week 1 Workshop"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What will be covered in this session?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session_type">Session Type</Label>
                    <Select
                      value={formData.session_type}
                      onValueChange={(value: any) => setFormData({ ...formData, session_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="class">Class</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date & Time (optional)</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes, optional)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Physical Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Building A, Room 101"
                  />
                </div>
                <div>
                  <Label htmlFor="virtual_link">Virtual Meeting Link</Label>
                  <Input
                    id="virtual_link"
                    value={formData.virtual_link}
                    onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                    placeholder="https://zoom.us/..."
                  />
                </div>
                <div>
                  <Label htmlFor="max_capacity">Max Capacity</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSession}>
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first session to start tracking attendance
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {session.name}
                      {getStatusBadge(session.status)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(session.start_date).toLocaleString()}
                        </span>
                        <span>{session.duration_minutes} min</span>
                        {session.session_type && (
                          <Badge variant="outline">{session.session_type}</Badge>
                        )}
                      </div>
                      {(session.location || session.virtual_link) && (
                        <div className="flex items-center gap-4 text-sm mt-2">
                          {session.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {session.location}
                            </span>
                          )}
                          {session.virtual_link && (
                            <span className="flex items-center gap-1">
                              <Video className="w-4 h-4" />
                              <a href={session.virtual_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Virtual Link
                              </a>
                            </span>
                          )}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowAttendance(session.id)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Attendance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {session.description && (
                <CardContent>
                  <p className="text-sm text-gray-600">{session.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingSession && (
        <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Session</DialogTitle>
              <DialogDescription>
                Update session details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Session Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-session_type">Session Type</Label>
                  <Select
                    value={formData.session_type}
                    onValueChange={(value: any) => setFormData({ ...formData, session_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start_date">Start Date & Time (optional)</Label>
                  <Input
                    id="edit-start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes, optional)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-location">Physical Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-virtual_link">Virtual Meeting Link</Label>
                <Input
                  id="edit-virtual_link"
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-max_capacity">Max Capacity</Label>
                <Input
                  id="edit-max_capacity"
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditingSession(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSession}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}