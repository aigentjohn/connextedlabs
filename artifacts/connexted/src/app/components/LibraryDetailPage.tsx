import { useState,useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import AddDocumentsDialog from '@/app/components/libraries/AddDocumentsDialog';
import {
  CreateFolderDialog,
  RenameFolderDialog,
  DeleteFolderDialog,
  MoveFolderDialog,
} from '@/app/components/FolderManagementDialogs';
import { MoveDocumentToFolderDialog } from '@/app/components/MoveDocumentToFolderDialog';
import { ShareInviteInline } from '@/app/components/shared/ShareInviteButton';
import { toast } from 'sonner';
import { useViewTracking } from '@/hooks/useViewTracking';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import {
  BookOpen,
  Search,
  Plus,
  Settings,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  File,
  Star,
  Eye,
  Calendar,
  User,
  Tag,
  ExternalLink,
  MoreVertical,
  Trash,
  FolderPlus,
  Clock,
  Users,
  Crown,
  Shield,
  Edit,
  Move,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface Library {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'auto_generated' | 'manual';
  owner_type: 'user' | 'circle' | 'platform';
  owner_id: string | null;
  filter_rules: any;
  is_public: boolean;
  icon: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  admin_ids: string[];
  member_ids: string[];
}

interface LibraryFolder {
  id: string;
  library_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  views: number;
  favorites: string[];
  author_id: string;
  created_at: string;
  updated_at: string;
  document_type?: string;
  intended_audience?: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  folder_id?: string | null;
}

interface LibraryDocument {
  id: string;
  library_id: string;
  document_id: string;
  folder_id: string | null;
  added_by_user_id: string;
  display_order: number;
  added_at: string;
  document: Document;
}

export default function LibraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Library | null>(null);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [libraryDocuments, setLibraryDocuments] = useState<LibraryDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]); // For system/auto-gen libraries
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'folders' | 'list'>('list');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showAddDocumentsDialog, setShowAddDocumentsDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);

  // Track library views - Note: Libraries don't have a direct content_type in our schema yet
  // But we can add it later if needed
  // useViewTracking('library', id);

  useEffect(() => {
    if (id && profile) {
      fetchLibrary();
    }
  }, [id, profile]);

  const fetchLibrary = async () => {
    if (!id || !profile) return;

    setLoading(true);
    try {
      // Fetch library details
      const { data: libraryData, error: libraryError } = await supabase
        .from('libraries')
        .select('*')
        .eq('id', id)
        .single();

      if (libraryError) {
        // If table doesn't exist or other DB errors
        if (libraryError.code === 'PGRST204' || libraryError.code === 'PGRST116' || libraryError.code === '42P01') {
          console.log('Libraries table not found');
          toast.error('Libraries feature is not available');
          navigate('/');
          return;
        }
        throw libraryError;
      }
      setLibrary(libraryData);

      if (libraryData.type === 'manual') {
        // Fetch folders
        const { data: foldersData, error: foldersError } = await supabase
          .from('library_folders')
          .select('*')
          .eq('library_id', id)
          .order('display_order');

        if (foldersError && foldersError.code !== 'PGRST204' && foldersError.code !== 'PGRST116' && foldersError.code !== '42P01') {
          throw foldersError;
        }
        setFolders(foldersData || []);

        // Fetch library documents with document details
        const { data: libDocsData, error: libDocsError } = await supabase
          .from('library_documents')
          .select(`
            *,
            document:documents (
              *,
              author:users!documents_author_id_fkey (
                id,
                name,
                avatar
              )
            )
          `)
          .eq('library_id', id)
          .order('display_order');

        if (libDocsError && libDocsError.code !== 'PGRST204' && libDocsError.code !== 'PGRST116' && libDocsError.code !== '42P01') {
          throw libDocsError;
        }

        // Transform the data
        const transformedDocs = (libDocsData || []).map((item: any) => ({
          ...item,
          document: {
            ...item.document,
            author: item.document.author,
          },
        }));

        setLibraryDocuments(transformedDocs);

        // If we have folders, default to folder view
        if (foldersData && foldersData.length > 0) {
          setViewMode('folders');
        }
      } else if (libraryData.type === 'system') {
        // Fetch documents based on system library type
        await fetchSystemLibraryDocuments(libraryData);
      } else if (libraryData.type === 'auto_generated') {
        // Fetch documents matching filter rules
        await fetchAutoGeneratedDocuments(libraryData.filter_rules);
      }
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemLibraryDocuments = async (libraryData: Library) => {
    if (!profile) return;

    try {
      let query = supabase.from('documents').select(`
        *,
        author:users!documents_author_id_fkey (
          id,
          name,
          avatar
        )
      `);

      // Identify system library by name
      if (libraryData.name === 'All Documents') {
        // All documents
        query = query.order('created_at', { ascending: false });
      } else if (libraryData.name === 'My Documents') {
        // My documents
        query = query.eq('author_id', profile.id).order('created_at', { ascending: false });
      } else if (libraryData.name === 'Saved Documents') {
        // Saved documents - fetch from content_favorites table
        const { data: favoritesData, error: favError } = await supabase
          .from('content_favorites')
          .select('content_id')
          .eq('user_id', profile.id)
          .eq('content_type', 'document');
        
        if (favError) throw favError;
        
        const favoriteIds = (favoritesData || []).map(f => f.content_id);
        
        if (favoriteIds.length > 0) {
          query = query.in('id', favoriteIds).order('created_at', { ascending: false });
        } else {
          // No favorites, return empty result
          setAllDocuments([]);
          return;
        }
      } else if (libraryData.name === 'Shared with Me') {
        // Documents shared in circles/containers I'm in
        // This would require joining with document_shares table
        // For now, we'll just show all public documents
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setAllDocuments(data || []);
    } catch (error) {
      console.error('Error fetching system library documents:', error);
    }
  };

  const fetchAutoGeneratedDocuments = async (filterRules: any) => {
    if (!filterRules) return;

    try {
      let query = supabase.from('documents').select(`
        *,
        author:users!documents_author_id_fkey (
          id,
          name,
          avatar
        )
      `);

      // Apply filter rules
      if (filterRules.document_type) {
        // Handle both single string and array of types
        if (Array.isArray(filterRules.document_type)) {
          query = query.in('document_type', filterRules.document_type);
        } else {
          query = query.eq('document_type', filterRules.document_type);
        }
      }
      if (filterRules.intended_audience) {
        query = query.eq('intended_audience', filterRules.intended_audience);
      }
      if (filterRules.tags && Array.isArray(filterRules.tags)) {
        query = query.overlaps('tags', filterRules.tags);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAllDocuments(data || []);
    } catch (error) {
      console.error('Error fetching auto-generated documents:', error);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getDocumentsInFolder = (folderId: string | null) => {
    return libraryDocuments.filter((ld) => ld.folder_id === folderId);
  };

  const getSubfolders = (parentId: string | null) => {
    return folders.filter((f) => f.parent_folder_id === parentId);
  };

  // Filter documents based on search
  const getFilteredDocuments = () => {
    const docs = library?.type === 'manual' 
      ? libraryDocuments.map(ld => ({ ...ld.document, folder_id: ld.folder_id }))
      : allDocuments;

    if (!searchQuery.trim()) return docs;

    const query = searchQuery.toLowerCase();
    return docs.filter((doc) => {
      const document = 'document' in doc ? doc.document : doc;
      return (
        document.title?.toLowerCase().includes(query) ||
        document.description?.toLowerCase().includes(query) ||
        document.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    });
  };

  const filteredDocuments = getFilteredDocuments();

  // Check if user can edit based on platform admin role or library admin status
  const isMember = library && profile && library.member_ids?.includes(profile.id);
  const isAdmin = library && profile && (
    profile.role === 'super' || // Platform admins can edit any library
    library.admin_ids?.includes(profile.id) // Library admins can edit
  );
  const canEdit = library && (
    isAdmin &&
    library.type !== 'system' // System libraries can only be edited by platform admins
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleRemoveDocument = async (libraryDocId: string, documentTitle: string) => {
    if (!confirm(`Remove "${documentTitle}" from this library? The document will still exist in other libraries and the platform.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('library_documents')
        .delete()
        .eq('id', libraryDocId);

      if (error) throw error;

      toast.success('Document removed from library');
      fetchLibrary(); // Refresh the library
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 mt-4">Loading library...</p>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Library not found</h3>
        <Button asChild>
          <Link to="/libraries">Back to Libraries</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Libraries', path: '/libraries' },
        { label: library.name }
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{library.icon}</span>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{library.name}</h1>
              <Badge variant="secondary">
                {library.type === 'system' && 'System'}
                {library.type === 'auto_generated' && 'Auto-Generated'}
                {library.type === 'manual' && 'Manual'}
              </Badge>
              {library.is_public ? (
                <Badge variant="outline" className="gap-1">
                  <Eye className="w-3 h-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
            </div>
            <p className="text-gray-600">{library.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Created {formatDate(library.created_at)}
              </span>
              {library.type !== 'system' && library.member_ids && library.member_ids.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {library.member_ids.length} {library.member_ids.length === 1 ? 'member' : 'members'}
                    {isAdmin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    )}
                    {isMember && !isAdmin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Member
                      </Badge>
                    )}
                  </span>
                </>
              )}
              {library.type === 'auto_generated' && (
                <span className="text-gray-400">•</span>
              )}
              {library.type === 'auto_generated' && library.filter_rules && (
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Updates automatically based on filters
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {library.type === 'manual' && canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolderDialog(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Folder
              </Button>
              <AddDocumentsDialog
                libraryId={library.id}
                folders={folders}
                existingDocumentIds={libraryDocuments.map((ld) => ld.document_id)}
                onDocumentsAdded={fetchLibrary}
              />
            </>
          )}
          {library.created_by && library.created_by !== profile.id && (
            <PrivateCommentDialog
              containerType="library"
              containerId={library.id}
              containerTitle={library.name}
              recipientId={library.created_by}
              recipientName="the creator"
            />
          )}
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/libraries/${library.id}/settings`}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
          <ShareInviteInline
            entityType="library"
            entityId={library.id}
            entityName={library.name}
          />
        </div>
      </div>

      {/* View Mode Toggle (for manual libraries with folders) */}
      {library.type === 'manual' && folders.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
          <button
            onClick={() => setViewMode('folders')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'folders'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            Folders
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <File className="w-4 h-4 inline mr-2" />
            All Documents
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search documents in this library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content */}
      {library.type === 'manual' && viewMode === 'folders' && folders.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredDocuments.length} documents
          </h2>
          <FolderTree
            folders={folders}
            documents={libraryDocuments}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            searchQuery={searchQuery}
            canEdit={canEdit}
            onRemoveDocument={handleRemoveDocument}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredDocuments.length} documents
          </h2>
          <DocumentList 
            documents={filteredDocuments}
            libraryType={library.type}
            libraryDocuments={libraryDocuments}
            canEdit={canEdit}
            onRemoveDocument={handleRemoveDocument}
          />
        </div>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : library.type === 'manual'
              ? 'Add documents to get started'
              : 'Documents will appear here automatically'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {library.type === 'manual' && canEdit && !searchQuery && (
              <>
                {folders.length === 0 && (
                  <Button onClick={() => setShowCreateFolderDialog(true)} variant="outline">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Create First Folder
                  </Button>
                )}
                <AddDocumentsDialog
                  libraryId={library.id}
                  folders={folders}
                  existingDocumentIds={libraryDocuments.map((ld) => ld.document_id)}
                  onDocumentsAdded={fetchLibrary}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Folder Dialog for root level */}
      {library && library.type === 'manual' && canEdit && (
        <CreateFolderDialog
          libraryId={library.id}
          parentFolderId={null}
          allFolders={folders}
          onSuccess={() => {
            setShowCreateFolderDialog(false);
            fetchLibrary();
          }}
          open={showCreateFolderDialog}
          onOpenChange={setShowCreateFolderDialog}
        />
      )}
    </div>
  );
}

// Folder Tree Component
function FolderTree({
  folders,
  documents,
  expandedFolders,
  onToggleFolder,
  searchQuery,
  parentId = null,
  level = 0,
  canEdit,
  onRemoveDocument,
}: {
  folders: LibraryFolder[];
  documents: LibraryDocument[];
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  searchQuery: string;
  parentId?: string | null;
  level?: number;
  canEdit?: boolean;
  onRemoveDocument?: (libraryDocId: string, documentTitle: string) => void;
}) {
  const [renamingFolder, setRenamingFolder] = useState<LibraryFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<LibraryFolder | null>(null);
  const [movingFolder, setMovingFolder] = useState<LibraryFolder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [movingDocument, setMovingDocument] = useState<LibraryDocument | null>(null);
  const { profile } = useAuth();

  const subfolders = folders.filter((f) => f.parent_folder_id === parentId);
  const docsInFolder = documents.filter((ld) => ld.folder_id === parentId);

  // Filter based on search
  const filteredDocs = searchQuery
    ? docsInFolder.filter((ld) =>
        ld.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ld.document.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : docsInFolder;

  const handleFolderAction = (action: string, folder: LibraryFolder) => {
    switch (action) {
      case 'rename':
        setRenamingFolder(folder);
        break;
      case 'delete':
        setDeletingFolder(folder);
        break;
      case 'move':
        setMovingFolder(folder);
        break;
      case 'add-subfolder':
        setCreateFolderParentId(folder.id);
        setShowCreateDialog(true);
        break;
    }
  };

  const countSubfolders = (folderId: string): number => {
    const children = folders.filter((f) => f.parent_folder_id === folderId);
    return children.length + children.reduce((sum, child) => sum + countSubfolders(child.id), 0);
  };

  const countDocumentsRecursive = (folderId: string): number => {
    const docsInThisFolder = documents.filter((ld) => ld.folder_id === folderId).length;
    const children = folders.filter((f) => f.parent_folder_id === folderId);
    return docsInThisFolder + children.reduce((sum, child) => sum + countDocumentsRecursive(child.id), 0);
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-1" style={{ marginLeft: level > 0 ? '1.5rem' : 0 }}>
      {/* Create Folder Button at Root Level */}
      {level === 0 && canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCreateFolderParentId(null);
            setShowCreateDialog(true);
          }}
          className="mb-3"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Create Folder
        </Button>
      )}

      {/* Subfolders */}
      {subfolders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        const docsCount = documents.filter((ld) => ld.folder_id === folder.id).length;

        return (
          <div key={folder.id}>
            <div className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors group">
              <button
                onClick={() => onToggleFolder(folder.id)}
                className="flex items-start gap-2 flex-1 min-w-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <FolderOpen className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{folder.name}</span>
                    <span className="text-sm text-gray-500">{docsCount}</span>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                      {folder.description}
                    </p>
                  )}
                </div>
              </button>

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 flex-shrink-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleFolderAction('add-subfolder', folder)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Add Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFolderAction('rename', folder)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFolderAction('move', folder)}>
                      <Move className="w-4 h-4 mr-2" />
                      Move Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFolderAction('delete', folder)}
                      className="text-red-600"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isExpanded && (
              <FolderTree
                folders={folders}
                documents={documents}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                searchQuery={searchQuery}
                parentId={folder.id}
                level={level + 1}
                canEdit={canEdit}
                onRemoveDocument={onRemoveDocument}
              />
            )}
          </div>
        );
      })}

      {/* Documents in this folder */}
      {filteredDocs.map((ld) => (
        <div key={ld.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors group">
          <Link
            to={`/documents/${ld.document.id}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <File className="w-5 h-5 text-gray-400 ml-6" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate group-hover:text-indigo-600">
                {ld.document.title}
              </h4>
              {ld.document.description && (
                <p className="text-sm text-gray-600 truncate">{ld.document.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {ld.document.views}
              </span>
              {ld.document.favorites?.length > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {ld.document.favorites.length}
                </span>
              )}
            </div>
          </Link>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMovingDocument(ld)}>
                  <Move className="w-4 h-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
                {onRemoveDocument && (
                  <DropdownMenuItem
                    onClick={() => onRemoveDocument(ld.id, ld.document.title)}
                    className="text-red-600"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Remove from Library
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}

      {/* Folder Management Dialogs */}
      {profile && folders.length > 0 && folders[0]?.library_id && (
        <>
          <CreateFolderDialog
            libraryId={folders[0].library_id}
            parentFolderId={createFolderParentId}
            allFolders={folders}
            onSuccess={refreshPage}
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
          {renamingFolder && (
            <RenameFolderDialog
              folder={renamingFolder}
              onSuccess={refreshPage}
              open={!!renamingFolder}
              onOpenChange={(open) => !open && setRenamingFolder(null)}
            />
          )}
          {deletingFolder && (
            <DeleteFolderDialog
              folder={deletingFolder}
              documentCount={countDocumentsRecursive(deletingFolder.id)}
              subfolderCount={countSubfolders(deletingFolder.id)}
              onSuccess={refreshPage}
              open={!!deletingFolder}
              onOpenChange={(open) => !open && setDeletingFolder(null)}
            />
          )}
          {movingFolder && (
            <MoveFolderDialog
              folder={movingFolder}
              allFolders={folders}
              onSuccess={refreshPage}
              open={!!movingFolder}
              onOpenChange={(open) => !open && setMovingFolder(null)}
            />
          )}
          {movingDocument && (
            <MoveDocumentToFolderDialog
              libraryDocumentId={movingDocument.id}
              documentTitle={movingDocument.document.title}
              currentFolderId={movingDocument.folder_id}
              allFolders={folders}
              onSuccess={refreshPage}
              open={!!movingDocument}
              onOpenChange={(open) => !open && setMovingDocument(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

// Document List Component
function DocumentList({ documents, libraryType, libraryDocuments, canEdit, onRemoveDocument }: { documents: any[]; libraryType: 'system' | 'auto_generated' | 'manual'; libraryDocuments: LibraryDocument[]; canEdit?: boolean; onRemoveDocument?: (libraryDocId: string, documentTitle: string) => void }) {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInMs = now.getTime() - created.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const document = 'document' in doc ? doc.document : doc;
        return (
          <Link
            key={document.id}
            to={`/documents/${document.id}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <File className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 truncate">
                    {document.title}
                  </h3>
                </div>

                {document.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{document.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {document.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {document.author.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {getTimeAgo(document.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {document.views} views
                  </span>
                  {document.favorites?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {document.favorites.length}
                    </span>
                  )}
                </div>

                {document.tags && document.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {document.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{document.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              {canEdit && onRemoveDocument && libraryType === 'manual' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const libraryDoc = libraryDocuments.find(ld => ld.document_id === document.id);
                    if (libraryDoc) {
                      onRemoveDocument(libraryDoc.id, document.title);
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash className="w-4 h-4" />
                </button>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}