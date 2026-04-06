import { useState,useEffect } from 'react';
// Split candidate: ~551 lines — consider extracting FlaggedItemRow, ModerationDecisionPanel, and FlaggedContentFilters into sub-components.
import { AlertTriangle, Flag, Eye, CheckCircle2, XCircle, Search, ExternalLink, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { notifyContentModeration } from '@/lib/notificationHelpers';

interface FlaggedContent {
  id: string;
  content_type: string;
  content_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  reporter?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  resolver?: {
    id: string;
    name: string;
  } | null;
  content?: any;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate_content: 'Inappropriate Content',
  spam: 'Spam',
  harassment: 'Harassment',
  misinformation: 'Misinformation',
  copyright_violation: 'Copyright Violation',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewing: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function FlaggedContentPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [flags, setFlags] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedFlag, setSelectedFlag] = useState<FlaggedContent | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (profile) {
      // Check if user is platform admin
      if (profile.role !== 'admin') {
        toast.error('Access denied: Platform admin only');
        navigate('/');
        return;
      }
      fetchFlags();
    }
  }, [profile, activeTab]);

  const fetchFlags = async () => {
    try {
      setLoading(true);

      // Fetch flags with reporter info
      let query = supabase
        .from('content_flags')
        .select(`
          *,
          reporter:users!content_flags_reporter_id_fkey(id, name, avatar),
          resolver:users!content_flags_resolved_by_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      // Filter by status based on active tab
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data: flagsData, error: flagsError } = await query;

      if (flagsError) throw flagsError;

      // Fetch the actual content for each flag
      const flagsWithContent = await Promise.all(
        (flagsData || []).map(async (flag) => {
          let content = null;

          if (flag.content_type === 'review') {
            const { data } = await supabase
              .from('endorsements')
              .select('id, title, description, author_id')
              .eq('id', flag.content_id)
              .single();
            content = data;
          } else if (flag.content_type === 'post') {
            const { data } = await supabase
              .from('posts')
              .select('id, content, author_id')
              .eq('id', flag.content_id)
              .single();
            content = data;
          } else if (flag.content_type === 'document') {
            const { data } = await supabase
              .from('documents')
              .select('id, title, description, author_id')
              .eq('id', flag.content_id)
              .single();
            content = data;
          }

          return { ...flag, content };
        })
      );

      setFlags(flagsWithContent);
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast.error('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContent = (flag: FlaggedContent) => {
    if (!flag.content) {
      toast.error('Content not found (may have been deleted)');
      return;
    }

    // Navigate to the content
    if (flag.content_type === 'review') {
      window.open(`/reviews/${flag.content_id}`, '_blank');
    } else if (flag.content_type === 'post') {
      toast.info('Post viewing coming soon');
    } else if (flag.content_type === 'document') {
      window.open(`/documents/${flag.content_id}`, '_blank');
    }
  };

  const handleReviewFlag = (flag: FlaggedContent) => {
    setSelectedFlag(flag);
    setResolutionNotes('');
    setReviewDialogOpen(true);
  };

  const handleResolveFlag = async (action: 'resolved' | 'dismissed') => {
    if (!selectedFlag || !profile) return;

    try {
      setResolving(true);

      const { error } = await supabase
        .from('content_flags')
        .update({
          status: action,
          resolved_by: profile.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim() || null,
        })
        .eq('id', selectedFlag.id);

      if (error) throw error;

      // Notify content author if content was approved
      if (action === 'resolved') {
        const contentAuthorId = selectedFlag.content?.author_id || selectedFlag.content?.uploaded_by;
        if (contentAuthorId) {
          await notifyContentModeration(
            contentAuthorId,
            selectedFlag.content_type,
            selectedFlag.content_id,
            'approved',
            resolutionNotes.trim() || 'Your content has been reviewed and approved'
          );
        }
      }

      toast.success(`Flag ${action === 'resolved' ? 'resolved' : 'dismissed'}`);
      setReviewDialogOpen(false);
      setSelectedFlag(null);
      fetchFlags();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast.error('Failed to update flag status');
    } finally {
      setResolving(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!selectedFlag || !profile) return;

    try {
      setResolving(true);

      // Get content author before deleting
      const contentAuthorId = selectedFlag.content?.author_id || selectedFlag.content?.uploaded_by;

      // Delete the content
      const { error: deleteError } = await supabase
        .from(selectedFlag.content_type === 'review' ? 'reviews' : 
              selectedFlag.content_type === 'post' ? 'posts' : 'documents')
        .delete()
        .eq('id', selectedFlag.content_id);

      if (deleteError) throw deleteError;

      // Mark flag as resolved
      const { error: flagError } = await supabase
        .from('content_flags')
        .update({
          status: 'resolved',
          resolved_by: profile.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: `Content deleted: ${resolutionNotes.trim() || 'No additional notes'}`,
        })
        .eq('id', selectedFlag.id);

      if (flagError) throw flagError;

      // Notify content author
      if (contentAuthorId) {
        await notifyContentModeration(
          contentAuthorId,
          selectedFlag.content_type,
          selectedFlag.content_id,
          'rejected',
          resolutionNotes.trim() || 'Content violated community guidelines'
        );
      }

      toast.success('Content deleted and flag resolved');
      setReviewDialogOpen(false);
      setSelectedFlag(null);
      fetchFlags();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setResolving(false);
    }
  };

  const filteredFlags = flags.filter(flag =>
    flag.reporter?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    REASON_LABELS[flag.reason].toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.content_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={STATUS_COLORS[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading flagged content...</div>
      </div>
    );
  }

  const counts = {
    pending: flags.filter(f => f.status === 'pending').length,
    reviewing: flags.filter(f => f.status === 'reviewing').length,
    resolved: flags.filter(f => f.status === 'resolved').length,
    dismissed: flags.filter(f => f.status === 'dismissed').length,
    all: flags.length,
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Flagged Content' }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flag className="h-8 w-8 text-orange-600" />
            Flagged Content
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and moderate user-reported content
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{counts.reviewing}</div>
            <div className="text-sm text-muted-foreground">Under Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{counts.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{counts.dismissed}</div>
            <div className="text-sm text-muted-foreground">Dismissed</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by reporter, reason, or content type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing ({counts.reviewing})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({counts.dismissed})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredFlags.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No flagged content found</p>
              </CardContent>
            </Card>
          ) : (
            filteredFlags.map((flag) => (
              <Card key={flag.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="font-semibold text-lg">
                            {REASON_LABELS[flag.reason]}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {flag.content_type.charAt(0).toUpperCase() + flag.content_type.slice(1)} flagged{' '}
                            {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(flag.status)}
                    </div>

                    {/* Content Preview */}
                    {flag.content && (
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="font-medium mb-2">Flagged Content:</div>
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {flag.content_type === 'review' && flag.content.title}
                          {flag.content_type === 'post' && flag.content.content}
                          {flag.content_type === 'document' && flag.content.title}
                        </div>
                      </div>
                    )}

                    {/* Reporter Details */}
                    {flag.details && (
                      <div>
                        <div className="font-medium text-sm mb-1">Reporter's Details:</div>
                        <p className="text-sm text-muted-foreground">{flag.details}</p>
                      </div>
                    )}

                    {/* Reporter Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={flag.reporter?.avatar || undefined} />
                        <AvatarFallback>
                          {flag.reporter?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>Reported by {flag.reporter?.name || 'Unknown User'}</span>
                    </div>

                    {/* Resolution Info */}
                    {flag.status !== 'pending' && flag.resolver && (
                      <div className="text-sm text-muted-foreground">
                        {flag.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {flag.resolver.name}{' '}
                        {flag.resolved_at && formatDistanceToNow(new Date(flag.resolved_at), { addSuffix: true })}
                        {flag.resolution_notes && (
                          <div className="mt-1 italic">Note: {flag.resolution_notes}</div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewContent(flag)}
                        disabled={!flag.content}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Content
                      </Button>
                      {(flag.status === 'pending' || flag.status === 'reviewing') && (
                        <Button
                          size="sm"
                          onClick={() => handleReviewFlag(flag)}
                        >
                          Review Flag
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      {selectedFlag && (
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Flagged Content</DialogTitle>
              <DialogDescription>
                Decide how to handle this report. You can dismiss it, resolve it, or delete the content.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Flag Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div><strong>Reason:</strong> {REASON_LABELS[selectedFlag.reason]}</div>
                <div><strong>Content Type:</strong> {selectedFlag.content_type}</div>
                <div><strong>Reported by:</strong> {selectedFlag.reporter?.name}</div>
                {selectedFlag.details && (
                  <div><strong>Details:</strong> {selectedFlag.details}</div>
                )}
              </div>

              {/* Content Preview */}
              {selectedFlag.content && (
                <div>
                  <Label>Content Preview</Label>
                  <div className="bg-muted p-4 rounded-lg mt-2">
                    <div className="text-sm">
                      {selectedFlag.content_type === 'review' && (
                        <>
                          <div className="font-semibold mb-2">{selectedFlag.content.title}</div>
                          <div className="text-muted-foreground">{selectedFlag.content.description}</div>
                        </>
                      )}
                      {selectedFlag.content_type === 'post' && selectedFlag.content.content}
                      {selectedFlag.content_type === 'document' && (
                        <>
                          <div className="font-semibold mb-2">{selectedFlag.content.title}</div>
                          <div className="text-muted-foreground">{selectedFlag.content.description}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <Label htmlFor="resolution">Resolution Notes (Optional)</Label>
                <Textarea
                  id="resolution"
                  placeholder="Add notes about your decision..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleResolveFlag('dismissed')}
                disabled={resolving}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss Report
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveFlag('resolved')}
                disabled={resolving}
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Resolve (Keep Content)
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteContent}
                disabled={resolving || !selectedFlag.content}
              >
                Delete Content
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}