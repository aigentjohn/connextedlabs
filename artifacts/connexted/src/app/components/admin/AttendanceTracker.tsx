import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Video,
  FileText,
  BarChart3,
  Download
} from 'lucide-react';

interface Session {
  id: string;
  program_id?: string;
  circle_id?: string;
  name: string;
  description?: string;
  session_type: 'meeting' | 'workshop' | 'event' | 'class' | 'other';
  start_date: string;
  duration_minutes: number;
  location?: string;
  virtual_link?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  max_capacity?: number;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  expected: boolean;
  attended: boolean;
  notes?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface AttendanceTrackerProps {
  sessionId: string;
  onBack?: () => void;
}

export function AttendanceTracker({ sessionId, onBack }: AttendanceTrackerProps) {
  const { profile } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [guestFormData, setGuestFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    session_type: 'meeting' as const,
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    virtual_link: '',
    notes: ''
  });

  useEffect(() => {
    if (sessionId) {
      fetchSessionAndAttendance();
    }
  }, [sessionId]);

  const fetchSessionAndAttendance = async () => {
    try {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData || null);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('session_attendance')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('session_id', sessionId)
        .order('profiles(full_name)');

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);
    } catch (error: any) {
      console.error('Error fetching session and attendance:', error);
      toast.error('Failed to load session and attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('id', 'in', attendanceRecords.map(record => record.user_id).filter(id => id) as string[]);

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching available members:', error);
      toast.error('Failed to load available members');
    }
  };

  const fetchAttendance = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_attendance')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('session_id', sessionId);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    }
  };

  const handleAddMember = async () => {
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }

    try {
      const { error } = await supabase
        .from('session_attendance')
        .insert({
          session_id: sessionId,
          user_id: selectedMemberId,
          expected: true,
          attended: false
        });

      if (error) throw error;

      toast.success('Member added to attendance');
      setShowAddMemberDialog(false);
      fetchSessionAndAttendance();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleAddGuest = async () => {
    if (!guestFormData.guest_name || !guestFormData.guest_email) {
      toast.error('Please fill in guest name and email');
      return;
    }

    try {
      const { error } = await supabase
        .from('session_attendance')
        .insert({
          session_id: sessionId,
          guest_name: guestFormData.guest_name,
          guest_email: guestFormData.guest_email,
          guest_phone: guestFormData.guest_phone,
          expected: true,
          attended: false
        });

      if (error) throw error;

      toast.success('Guest added to attendance');
      setShowAddGuestDialog(false);
      setGuestFormData({
        guest_name: '',
        guest_email: '',
        guest_phone: ''
      });
      fetchSessionAndAttendance();
    } catch (error: any) {
      console.error('Error adding guest:', error);
      toast.error('Failed to add guest');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? All attendance records will be removed.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session deleted successfully');
      if (onBack) {
        onBack();
      }
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleUpdateAttendance = async (recordId: string, updates: Partial<AttendanceRecord>) => {
    try {
      const { error } = await supabase
        .from('session_attendance')
        .update({
          ...updates,
          marked_by: profile?.id,
          ...(updates.attended && !updates.checked_in_at ? { checked_in_at: new Date().toISOString() } : {})
        })
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Attendance updated');
      fetchSessionAndAttendance();
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success(`Session marked as ${status}`);
      fetchSessionAndAttendance();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const exportAttendance = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_attendance')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('session_id', sessionId);

      if (error) throw error;

      // Create CSV
      const headers = ['Name', 'Email', 'Expected', 'Attended', 'Participation', 'Checked In', 'Notes'];
      const rows = (data || []).map(record => [
        record.profiles?.full_name || record.guest_name || '',
        record.profiles?.email || record.guest_email || '',
        record.expected ? 'Yes' : 'No',
        record.attended ? 'Yes' : 'No',
        record.participation_level,
        record.checked_in_at ? new Date(record.checked_in_at).toLocaleString() : '',
        record.notes || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${sessionId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Attendance exported');
    } catch (error: any) {
      console.error('Error exporting attendance:', error);
      toast.error('Failed to export attendance');
    }
  };

  const openAttendanceDialog = (session: Session) => {
    fetchAttendance(session.id);
    setShowAttendanceDialog(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      meeting: <Users className="w-4 h-4" />,
      workshop: <FileText className="w-4 h-4" />,
      event: <Calendar className="w-4 h-4" />,
      class: <FileText className="w-4 h-4" />,
      other: <Calendar className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || icons.meeting;
  };

  const attendanceStats = session && attendanceRecords.length > 0 ? {
    total: attendanceRecords.length,
    attended: attendanceRecords.filter(r => r.attended).length,
    expected: attendanceRecords.filter(r => r.expected).length,
    rate: attendanceRecords.length > 0 
      ? Math.round((attendanceRecords.filter(r => r.attended).length / attendanceRecords.filter(r => r.expected).length) * 100) 
      : 0
  } : null;

  const handleCreateSession = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          name: formData.name,
          description: formData.description || null,
          session_type: formData.session_type,
          start_date: new Date(formData.scheduled_at).toISOString(),
          duration_minutes: formData.duration_minutes,
          location: formData.location || null,
          virtual_link: formData.virtual_link || null,
          status: 'scheduled',
          program_id: session.program_id,
          circle_id: session.circle_id
        });

      if (error) throw error;

      toast.success('Session created successfully');
      setShowCreateDialog(false);
      setFormData({
        name: '',
        description: '',
        session_type: 'meeting',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        virtual_link: '',
        notes: ''
      });
      fetchSessionAndAttendance();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Tracking</h2>
          <p className="text-gray-600">Manage sessions and track attendance for {session?.name}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-8">Loading sessions...</div>
      ) : session === null ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">No sessions created yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card key={session.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getTypeIcon(session.session_type)}
                      {session.session_type}
                    </Badge>
                  </div>
                  {session.description && (
                    <p className="text-sm text-gray-600 mb-3">{session.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(session.start_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(session.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}({session.duration_minutes} min)
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {session.location}
                      </div>
                    )}
                    {session.virtual_link && (
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        <a href={session.virtual_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Join Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAttendanceDialog(session)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Attendance
                  </Button>
                  {session.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateSessionStatus(session.id, 'completed')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Week 1 Kickoff Meeting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Brief description of the session"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="meeting">Meeting</option>
                  <option value="workshop">Workshop</option>
                  <option value="event">Event</option>
                  <option value="class">Class</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="15"
                  step="15"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Room 101, Building A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Virtual Link</label>
              <input
                type="url"
                value={formData.virtual_link}
                onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Internal notes for admins"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSession} disabled={!formData.name || !formData.scheduled_at}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Attendance: {selectedSession?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedSession && exportAttendance(selectedSession.id)}
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
            </DialogTitle>
          </DialogHeader>

          {attendanceStats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-900">{attendanceStats.expected}</div>
                  <div className="text-sm text-gray-600">Expected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{attendanceStats.attended}</div>
                  <div className="text-sm text-gray-600">Attended</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceStats.expected - attendanceStats.attended}
                  </div>
                  <div className="text-sm text-gray-600">Absent</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{attendanceStats.rate}%</div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-2">
            {attendanceRecords.map((record) => (
              <Card key={record.id} className="hover:bg-gray-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={record.attended}
                        onCheckedChange={(checked) =>
                          handleUpdateAttendance(record.id, { attended: checked as boolean })
                        }
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{record.profiles?.full_name}</div>
                        <div className="text-sm text-gray-600">{record.profiles?.email}</div>
                      </div>
                      {record.attended && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Attended
                        </Badge>
                      )}
                      {!record.attended && record.expected && (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Absent
                        </Badge>
                      )}
                      <select
                        value={record.participation_level}
                        onChange={(e) =>
                          handleUpdateAttendance(record.id, { participation_level: e.target.value as any })
                        }
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">No Participation</option>
                        <option value="passive">Passive</option>
                        <option value="active">Active</option>
                        <option value="leading">Leading</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAttendanceDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}