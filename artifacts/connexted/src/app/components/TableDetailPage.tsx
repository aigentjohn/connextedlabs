import { useState,useEffect } from 'react';
// Split candidate: ~499 lines — consider extracting TableMembersPanel, TableContentFeed, and TableAdminActions into sub-components.
import { useParams, Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Users,
  Settings,
  UserPlus,
  FileText,
  Star,
  Calendar,
  User,
  Tag,
  Globe,
  Lock,
  ExternalLink,
  Plus,
  MessageSquare,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import ContainerFeed from '@/app/components/shared/ContainerFeed';
import { getParticipantLabel, getLeaderLabel, getOwnerLabel, getActionLabel, formatParticipantCount } from '@/utils/terminology';
import { ShareInviteInline } from '@/app/components/shared/ShareInviteButton';
import ContainerReviews from '@/app/components/shared/ContainerReviews';

export default function TableDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('documents');
  const [table, setTable] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialogs state
  const [showCreateDocument, setShowCreateDocument] = useState(false);

  // Form states
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (profile && slug) {
      fetchTableData();
    }
  }, [profile, slug]);

  const fetchTableData = async () => {
    try {
      // Fetch table
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tableError) throw tableError;
      setTable(tableData);

      // Fetch creator
      if (tableData.created_by) {
        const { data: creatorData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .eq('id', tableData.created_by)
          .single();
        
        if (creatorData) setCreator(creatorData);
      }

      // Fetch admins
      if (tableData.admin_ids && tableData.admin_ids.length > 0) {
        const { data: adminsData } = await supabase
          .from('users')
          .select('id, name, avatar, title')
          .in('id', tableData.admin_ids);
        
        if (adminsData) setAdmins(adminsData);
      }

      // Fetch documents that include this table
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .contains('table_ids', [tableData.id])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      setDocuments(docsData || []);

      // Fetch reviews that include this table
      const { data: reviewsData } = await supabase
        .from('endorsements')
        .select('*')
        .contains('table_ids', [tableData.id])
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);

      // Fetch member details
      if (tableData.member_ids && tableData.member_ids.length > 0) {
        const { data: membersData } = await supabase
          .from('users')
          .select('*')
          .in('id', tableData.member_ids);

        setMembers(membersData || []);
      }

    } catch (error) {
      console.error('Error fetching table data:', error);
      toast.error('Failed to load table');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading table...</p>
      </div>
    );
  }

  if (!table) {
    return <Navigate to="/tables" replace />;
  }

  const isMember = table.member_ids?.includes(profile.id);
  const isAdmin = profile.role === 'super' || table.admin_ids?.includes(profile.id);
  const canAccess = canViewContainer(profile, table, 'tables');

  const handleJoinTable = async () => {
    try {
      const updatedMemberIds = [...(table.member_ids || []), profile.id];
      
      const { error } = await supabase
        .from('tables')
        .update({ member_ids: updatedMemberIds })
        .eq('id', table.id);

      if (error) throw error;

      setTable({ ...table, member_ids: updatedMemberIds });
      toast.success(`You've joined ${table.name}!`);
    } catch (error) {
      console.error('Error joining table:', error);
      toast.error('Failed to join table');
    }
  };

  const handleLeaveTable = async () => {
    try {
      const updatedMemberIds = (table.member_ids || []).filter((id: string) => id !== profile.id);
      
      const { error } = await supabase
        .from('tables')
        .update({ member_ids: updatedMemberIds })
        .eq('id', table.id);

      if (error) throw error;

      setTable({ ...table, member_ids: updatedMemberIds });
      toast.success(`You've left ${table.name}`);
    } catch (error) {
      console.error('Error leaving table:', error);
      toast.error('Failed to leave table');
    }
  };

  // Create Document Handler
  const handleCreateDocument = async () => {
    if (!documentTitle.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: documentTitle,
          description: documentDescription,
          url: documentUrl, // Changed from link_url to url
          table_ids: [table.id],
          circle_ids: [],
          author_id: profile.id,
          tags: [], // Add empty tags array
          access_level: 'public', // Add default access level
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments([data, ...documents]);
      setDocumentTitle('');
      setDocumentDescription('');
      setDocumentUrl('');
      setShowCreateDocument(false);
      toast.success('Document created successfully!');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Tables', path: '/tables' },
        { label: table.name }
      ]} />
      
      {/* Table Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {table.cover_image && (
          <img src={table.cover_image} alt={table.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{table.name}</h1>
              <p className="text-gray-600 mb-4">{table.description}</p>
              
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{formatParticipantCount('container', table.member_ids?.length || 0)}</span>
                </div>
                <div className="flex items-center">
                  <span className="capitalize">{table.visibility === 'public' ? 'Public' : 'Members Only'} table</span>
                </div>
              </div>

              {/* Creator and Admins */}
              {(creator || admins.length > 0) && (
                <div className="mt-4 space-y-2">
                  {creator && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Created by</span>
                      <span className="font-medium text-gray-900">{creator.name}</span>
                      {creator.title && (
                        <span className="text-gray-500">• {creator.title}</span>
                      )}
                    </div>
                  )}
                  {admins.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-500">Admins:</span>
                      <span className="font-medium text-gray-900">
                        {admins.map(a => a.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {table.tags && table.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {table.tags.map((tag: string, index: number) => (
                    <Link key={`${table.id}-tag-${index}`} to={`/tags/${encodeURIComponent(tag)}`}>
                      <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer transition-colors">
                        <span className="mr-1">#</span>
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 md:mt-0 md:ml-6 flex gap-2">
              {!isMember && canAccess && (
                <Button onClick={handleJoinTable}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Table
                </Button>
              )}
              {isMember && !isAdmin && (
                <Button variant="outline" onClick={handleLeaveTable}>
                  <Check className="w-4 h-4 mr-2" />
                  Joined
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to={`/tables/${table.slug}/settings`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
              {isMember && (
                <Badge variant="default" className="self-start">
                  Member
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Control - Show message if user can't access */}
      {!canAccess ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Members Only</h2>
          <p className="text-gray-600 mb-6">
            This table is only accessible to members. Join to view content.
          </p>
          <Button onClick={handleJoinTable}>
            <UserPlus className="w-4 h-4 mr-2" />
            Join Table
          </Button>
        </div>
      ) : (
        /* Table Content Tabs - Documents, Reviews, Feed, Members */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="feed">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              {getParticipantLabel('container', true)} ({members.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            {/* Add Document Button for Members */}
            {isMember && (
              <div className="flex justify-end mb-4">
                <Dialog open={showCreateDocument} onOpenChange={setShowCreateDocument}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Document</DialogTitle>
                      <DialogDescription>
                        Share a document with {table.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="doc-title">Title *</Label>
                        <Input
                          id="doc-title"
                          value={documentTitle}
                          onChange={(e) => setDocumentTitle(e.target.value)}
                          placeholder="Enter document title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-description">Description</Label>
                        <Textarea
                          id="doc-description"
                          value={documentDescription}
                          onChange={(e) => setDocumentDescription(e.target.value)}
                          placeholder="Brief description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-url">Link URL</Label>
                        <Input
                          id="doc-url"
                          value={documentUrl}
                          onChange={(e) => setDocumentUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCreateDocument(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateDocument}>
                          Create Document
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <FileText className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No documents yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {isMember ? 'Be the first to add a document!' : 'Documents added to this table will appear here'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-6">
                      <Link to={`/documents/${doc.id}`} className="block hover:text-indigo-600">
                        <h3 className="text-lg font-semibold mb-2">{doc.title}</h3>
                        {doc.description && (
                          <p className="text-gray-600 text-sm">{doc.description}</p>
                        )}
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <ContainerReviews containerType="table" containerId={table.id} containerName={table.name} containerSlug={table.slug} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="feed">
            <ContainerFeed containerType="table" containerId={table.id} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="members">
            {members.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <Users className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No {getParticipantLabel('container', true, true)} yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {member.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                      </div>
                      {table.admin_ids?.includes(member.id) && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {/* Shareable URL */}
      {table && (
        <ShareInviteInline
          entityType="table"
          entityId={table.slug}
          entityName={table.name}
        />
      )}
    </div>
  );
}