import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { createApplicationNotification } from '@/lib/notificationHelpers';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Eye, Check, X, Flag, Search, Filter, MoreVertical, Mail, User, Calendar, FileText, Users, CalendarCheck } from 'lucide-react';
import { ApplicationDetailModal } from '@/app/components/admin/ApplicationDetailModal';
import { ApproveApplicationDialog } from '@/app/components/admin/ApproveApplicationDialog';
import { RejectApplicationDialog } from '@/app/components/admin/RejectApplicationDialog';
import { BatchActionsBar } from '@/app/components/admin/BatchActionsBar';
import { enrollInProgram } from '@/services/enrollmentBridge';

interface Application {
  id: string;
  program_id: string;
  name: string;
  email: string;
  phone?: string;
  answers: any;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'waitlisted' | 'withdrawn';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  score?: number;
  flagged: boolean;
  internal_notes?: string;
  tags?: string[];
  notified?: boolean;
  notification_date?: string;
  created_at: string;
  updated_at?: string;
}

interface Program {
  id: string;
  name: string;
  slug: string;
}

interface ApplicationStats {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  waitlisted: number;
}

export default function ApplicationReviewDashboard() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [notificationFilter, setNotificationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [applicationToAction, setApplicationToAction] = useState<Application | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0
  });

  useEffect(() => {
    if (profile) {
      fetchPrograms();
    }
  }, [profile]);

  useEffect(() => {
    if (programs.length > 0) {
      fetchApplications();
      fetchCohorts();
    }
  }, [programs, filter, selectedProgram]);

  const fetchPrograms = async () => {
    try {
      const isPlatformAdmin = profile?.role === 'super';
      
      let query = supabase
        .from('programs')
        .select('id, name, slug')
        .order('name');

      if (!isPlatformAdmin) {
        query = query.contains('admin_ids', [profile?.id]);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPrograms(data || []);
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);

      if (programs.length === 0) {
        setApplications([]);
        return;
      }

      const programIds = selectedProgram === 'all' 
        ? programs.map(p => p.id)
        : [selectedProgram];

      // Fetch applications
      let query = supabase
        .from('program_applications')
        .select('*')
        .in('program_id', programIds)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const applicationsData = data || [];
      setApplications(applicationsData);

      // Calculate stats
      const newStats: ApplicationStats = {
        total: applicationsData.length,
        pending: applicationsData.filter(a => a.status === 'pending').length,
        under_review: applicationsData.filter(a => a.status === 'under_review').length,
        approved: applicationsData.filter(a => a.status === 'approved').length,
        rejected: applicationsData.filter(a => a.status === 'rejected').length,
        waitlisted: applicationsData.filter(a => a.status === 'waitlisted').length
      };
      setStats(newStats);

    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('name');

      if (error) throw error;

      setCohorts(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      // Silently fail - sessions are optional for batch actions
      setCohorts([]);
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    newStatus: string,
    notes?: string,
    rejectionReason?: string,
    ticketAlreadyIssued?: boolean  // true when ApproveApplicationDialog issued a ticket
  ) => {
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString()
      };

      if (notes) {
        updateData.review_notes = notes;
      }

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error: updateError } = await supabase
        .from('program_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Get application data for notification and member addition
      const application = applications.find(a => a.id === applicationId);
      
      if (application) {
        // Get program data
        const program = programs.find(p => p.id === application.program_id);
        
        // Get user_id from program_applications
        const { data: appData } = await supabase
          .from('program_applications')
          .select('user_id')
          .eq('id', applicationId)
          .single();
        
        // If approved, grant program membership via enrollmentBridge
        if (newStatus === 'approved' && appData?.user_id && program) {
          try {
            // enrollInProgram creates both access_ticket (source of truth) and
            // program_members (legacy). Skip if the dialog already issued a
            // specific inventory ticket — the access_ticket exists already.
            if (!ticketAlreadyIssued) {
              await enrollInProgram({
                userId: appData.user_id,
                programId: program.id,
                acquisitionSource: 'invitation',
                acquisitionContext: {
                  application_id: applicationId,
                  approved_by: profile?.id,
                  notes,
                },
                ticketType: 'free',
              });
              console.log(`Access ticket + program membership created for user ${appData.user_id} in program ${program.name}`);
            } else {
              // Ticket was already issued by the dialog; still ensure program_members row exists
              await enrollInProgram({
                userId: appData.user_id,
                programId: program.id,
                acquisitionSource: 'invitation',
                acquisitionContext: {
                  application_id: applicationId,
                  approved_by: profile?.id,
                  notes,
                  ticket_issued_separately: true,
                },
                ticketType: 'paid',
              });
            }
          } catch (enrollErr) {
            console.error('Error creating program membership on approval:', enrollErr);
            // Non-fatal — fall back to legacy member_ids push
            try {
              const { data: programData } = await supabase
                .from('programs')
                .select('member_ids')
                .eq('id', program.id)
                .single();

              const currentMemberIds = programData?.member_ids || [];
              if (!currentMemberIds.includes(appData.user_id)) {
                await supabase
                  .from('programs')
                  .update({ member_ids: [...currentMemberIds, appData.user_id] })
                  .eq('id', program.id);
              }
            } catch (fallbackErr) {
              console.error('Fallback member_ids update also failed:', fallbackErr);
            }
          }
        }
        
        // Send notification for approved, rejected, or waitlisted statuses
        if (appData?.user_id && program && ['approved', 'rejected', 'waitlisted'].includes(newStatus)) {
          try {
            await createApplicationNotification(
              appData.user_id,
              program.id,
              program.name,
              program.slug,
              newStatus,
              profile?.id
            );
            console.log(`Notification sent for ${newStatus} status`);
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }

      // Log to history
      await supabase.from('application_review_history').insert({
        application_id: applicationId,
        reviewer_id: profile?.id,
        action: newStatus,
        previous_status: application?.status,
        new_status: newStatus,
        notes: notes
      });

      const statusMessages: { [key: string]: string } = {
        approved: 'Application approved — access ticket and membership created',
        rejected: 'Application rejected and member notified',
        waitlisted: 'Application waitlisted and member notified',
        under_review: 'Application marked as under review'
      };

      toast.success(statusMessages[newStatus] || 'Application updated');
      fetchApplications();
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const handleApprove = (application: Application) => {
    setApplicationToAction(application);
    setApproveDialogOpen(true);
  };

  const handleReject = (application: Application) => {
    setApplicationToAction(application);
    setRejectDialogOpen(true);
  };

  const handleFlagToggle = async (application: Application) => {
    try {
      const { error } = await supabase
        .from('program_applications')
        .update({ flagged: !application.flagged })
        .eq('id', application.id);

      if (error) throw error;

      toast.success(application.flagged ? 'Flag removed' : 'Application flagged');
      fetchApplications();
    } catch (error: any) {
      console.error('Error toggling flag:', error);
      toast.error('Failed to update flag');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApplications.length && filteredApplications.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.map(app => app.id));
    }
  };

  const getProgramName = (programId: string) => {
    return programs.find(p => p.id === programId)?.name || 'Unknown Program';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      waitlisted: 'bg-purple-100 text-purple-800 border-purple-200',
      withdrawn: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

  const filteredApplications = applications.filter(app => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        app.name.toLowerCase().includes(search) ||
        app.email.toLowerCase().includes(search) ||
        (app.phone && app.phone.toLowerCase().includes(search))
      );
      if (!matchesSearch) return false;
    }

    // Notification filter
    if (notificationFilter !== 'all') {
      if (notificationFilter === 'notified' && !app.notified) return false;
      if (notificationFilter === 'not-notified' && app.notified) return false;
      if (notificationFilter === 'approved-not-notified' && (app.status !== 'approved' || app.notified)) return false;
      if (notificationFilter === 'rejected-not-notified' && (app.status !== 'rejected' || app.notified)) return false;
    }

    return true;
  });

  if (loading && applications.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'My Programs', path: '/my-programs' },
          { label: 'Application Review', path: '/my-programs/applications' }
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Review</h1>
            <p className="text-gray-600">
              Review and manage program applications
            </p>
          </div>
          {selectedProgram && selectedProgram !== 'all' && (
            <Link to={`/admin/programs/${selectedProgram}/sessions`}>
              <Button variant="outline">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Manage Sessions
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('under_review')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
            <div className="text-sm text-gray-600">Reviewing</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('approved')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('rejected')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('waitlisted')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.waitlisted}</div>
            <div className="text-sm text-gray-600">Waitlisted</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notification Filter */}
            <div className="w-full md:w-64">
              <select
                value={notificationFilter}
                onChange={(e) => setNotificationFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Notifications</option>
                <option value="notified">Notified</option>
                <option value="not-notified">Not Notified</option>
                <option value="approved-not-notified">Approved - Not Notified</option>
                <option value="rejected-not-notified">Rejected - Not Notified</option>
              </select>
            </div>

            {/* Program Filter */}
            {programs.length > 1 && (
              <div className="w-full md:w-64">
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Programs ({programs.length})</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <BatchActionsBar
          selectedIds={selectedIds}
          applications={applications}
          cohorts={cohorts}
          onClearSelection={() => setSelectedIds([])}
          onRefresh={fetchApplications}
        />
      )}

      {/* Select All Option */}
      {filteredApplications.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === filteredApplications.length && filteredApplications.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-gray-700">
            Select all {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
            {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
          </span>
        </div>
      )}

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {searchTerm 
                ? `No applications found matching "${searchTerm}"`
                : filter === 'all'
                ? "No applications yet"
                : `No ${filter} applications`
              }
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View all applications
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <Card key={app.id} className={`hover:shadow-lg transition-shadow ${app.flagged ? 'border-l-4 border-l-red-500' : ''}`}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.includes(app.id)}
                      onCheckedChange={() => toggleSelection(app.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <Badge className={`${getStatusColor(app.status)} border`}>
                        {app.status.replace('_', ' ')}
                      </Badge>
                      {app.flagged && (
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="w-3 h-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                      {app.score !== null && app.score !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Score: {app.score}/100
                        </Badge>
                      )}
                      {app.notified && (
                        <Badge variant="outline" className="text-xs bg-blue-50">
                          <Mail className="w-3 h-3 mr-1" />
                          Notified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {app.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      {programs.length > 1 && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {getProgramName(app.program_id)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedApplication(app)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  
                  {app.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(app)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(app)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlagToggle(app)}
                    className={app.flagged ? 'text-red-600' : ''}
                  >
                    <Flag className={`w-4 h-4 mr-1 ${app.flagged ? 'fill-current' : ''}`} />
                    {app.flagged ? 'Unflag' : 'Flag'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <ApplicationDetailModal
        application={selectedApplication}
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onApprove={(app) => {
          setSelectedApplication(null);
          handleApprove(app);
        }}
        onReject={(app) => {
          setSelectedApplication(null);
          handleReject(app);
        }}
        onFlagToggle={handleFlagToggle}
        programName={selectedApplication ? getProgramName(selectedApplication.program_id) : ''}
      />

      <ApproveApplicationDialog
        application={applicationToAction}
        isOpen={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setApplicationToAction(null);
        }}
        onConfirm={(notes, ticketItemId) => {
          if (applicationToAction) {
            // ticketItemId is set when the dialog issued an inventory ticket
            updateApplicationStatus(applicationToAction.id, 'approved', notes, undefined, !!ticketItemId);
          }
          setApproveDialogOpen(false);
          setApplicationToAction(null);
        }}
      />

      <RejectApplicationDialog
        application={applicationToAction}
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setApplicationToAction(null);
        }}
        onConfirm={(reason, notes) => {
          if (applicationToAction) {
            updateApplicationStatus(applicationToAction.id, 'rejected', notes, reason);
          }
          setRejectDialogOpen(false);
          setApplicationToAction(null);
        }}
      />
    </div>
  );
}