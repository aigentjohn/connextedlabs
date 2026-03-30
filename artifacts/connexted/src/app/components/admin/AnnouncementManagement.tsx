import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
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
import { Checkbox } from '@/app/components/ui/checkbox';

interface Announcement {
  id: string;
  community_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: { name: string };
}

export default function AnnouncementManagement() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false,
  });

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchAnnouncements();
    }
  }, [profile]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, author:users!announcements_author_id_fkey(name)')
        .eq('community_id', profile?.community_id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Access denied. Platform admin only.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            is_pinned: formData.isPinned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success('Announcement updated!');
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert({
            community_id: profile.community_id,
            title: formData.title,
            content: formData.content,
            author_id: profile.id,
            is_pinned: formData.isPinned,
          });

        if (error) throw error;
        toast.success('Announcement created!');
      }

      // Refresh announcements
      await fetchAnnouncements();

      // Reset form
      setFormData({ title: '', content: '', isPinned: false });
      setEditingAnnouncement(null);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.is_pinned,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Announcement deleted');
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ 
          is_pinned: !announcement.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', announcement.id);

      if (error) throw error;

      toast.success(announcement.is_pinned ? 'Announcement unpinned' : 'Announcement pinned');
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update announcement');
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', isPinned: false });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Announcements' }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/platform-admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl mb-2">Announcements</h1>
          <p className="text-gray-600">Manage community-wide news and announcements</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleCloseDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </DialogTitle>
              <DialogDescription>
                {editingAnnouncement 
                  ? 'Update the announcement details below.'
                  : 'Create a new announcement for the community news page.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Announcement content..."
                  rows={6}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pinned"
                  checked={formData.isPinned}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isPinned: checked as boolean })
                  }
                />
                <Label htmlFor="pinned" className="cursor-pointer">
                  Pin this announcement (appears at the top)
                </Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No announcements yet. Create your first announcement to share news with the community.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      {announcement.is_pinned && (
                        <Badge variant="default">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      by {announcement.author?.name || 'Unknown'} • {new Date(announcement.created_at).toLocaleDateString()}
                      {announcement.updated_at && announcement.updated_at !== announcement.created_at && (
                        <> • Updated {new Date(announcement.updated_at).toLocaleDateString()}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(announcement)}
                      title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      {announcement.is_pinned ? (
                        <PinOff className="w-4 h-4" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}