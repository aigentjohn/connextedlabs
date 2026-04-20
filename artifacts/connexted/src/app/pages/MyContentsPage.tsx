import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Folder,
  FolderOpen,
  Link as LinkIcon,
  Plus,
  Upload,
  FileText,
  Mic,
  Hammer,
  Briefcase,
  MessageSquare,
  Search,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Check,
  AlertCircle,
  Trash2,
  Edit,
  Copy,
  Lightbulb,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import ImportUrlDialog from '@/app/components/mycontents/ImportUrlDialog';
import BulkEnrichDialog from '@/app/components/mycontents/BulkEnrichDialog';
import BatchCreateDialog from '@/app/components/mycontents/BatchCreateDialog';
import { UrlHealthCheckButton } from '@/app/components/mycontents/UrlHealthCheck';

interface MyContent {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  folder_path: string;
  folder_type: string | null;
  document_type: string | null;
  content_format: string | null;
  intended_audience: string | null;
  category: string | null;
  tags: string[];
  status: 'pending' | 'enriched' | 'archived';
  usage_count: number;
  last_used_at: string | null;
  created_content_ids: string[] | null;
  domain: string | null;
  created_at: string;
  updated_at: string;
}

interface FolderNode {
  path: string;
  name: string;
  type: string | null;
  count: number;
  children: FolderNode[];
}

const FOLDER_TYPE_ICONS = {
  document: FileText,
  pitch: Mic,
  build: Hammer,
  portfolio: Briefcase,
  post: MessageSquare,
  custom: Folder,
};

const FOLDER_TYPE_COLORS = {
  document: 'text-blue-600',
  pitch: 'text-purple-600',
  build: 'text-orange-600',
  portfolio: 'text-green-600',
  post: 'text-pink-600',
  custom: 'text-gray-600',
};

export default function MyContentsPage() {
  const { profile } = useAuth();
  const [contents, setContents] = useState<MyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('/');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchContents();
    }
  }, [profile]);

  const fetchContents = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('my_contents')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching my contents:', error);
      toast.error('Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  // Build folder tree from contents
  const buildFolderTree = (): FolderNode => {
    const root: FolderNode = {
      path: '/',
      name: 'Root',
      type: null,
      count: 0,
      children: [],
    };

    const folderMap = new Map<string, FolderNode>();
    folderMap.set('/', root);

    // Count items per folder
    contents.forEach((content) => {
      const path = content.folder_path || '/';
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';

      parts.forEach((part, index) => {
        const parentPath = currentPath || '/';
        currentPath = currentPath + '/' + part;

        if (!folderMap.has(currentPath)) {
          const node: FolderNode = {
            path: currentPath,
            name: part,
            type: index === 0 ? content.folder_type : null,
            count: 0,
            children: [],
          };

          folderMap.set(currentPath, node);
          const parent = folderMap.get(parentPath);
          if (parent) {
            parent.children.push(node);
          }
        }
      });

      // Increment count for this folder
      const folder = folderMap.get(path);
      if (folder) {
        folder.count++;
      }
    });

    return root;
  };

  const folderTree = buildFolderTree();

  // Filter contents by selected folder and search
  const filteredContents = contents.filter((content) => {
    const matchesFolder = content.folder_path === selectedFolder;
    const matchesSearch = searchQuery
      ? content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesUsage = usageFilter === 'all'
      ? true
      : usageFilter === 'used'
      ? content.usage_count > 0
      : content.usage_count === 0;
    return matchesFolder && matchesSearch && matchesUsage;
  });

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleEnrichSingle = (id: string) => {
    setSelectedItems(new Set([id]));
    setEnrichDialogOpen(true);
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Delete this link? This cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('my_contents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Link deleted');
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete link');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enriched':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'archived':
        return <Trash2 className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      enriched: 'bg-green-100 text-green-800',
      pending: 'bg-orange-100 text-orange-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  if (!profile) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 mt-4">Loading contents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Links' }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Links</h1>
          <p className="text-gray-600 mt-1">
            Organize and enrich your URLs before publishing to the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UrlHealthCheckButton
            contentIds={contents.map(c => c.id)}
            onComplete={fetchContents}
          />
          <Button onClick={() => setImportDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total URLs</div>
          <div className="text-2xl font-bold text-gray-900">{contents.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-orange-600">
            {contents.filter((c) => c.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Enriched</div>
          <div className="text-2xl font-bold text-green-600">
            {contents.filter((c) => c.status === 'enriched').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Used</div>
          <div className="text-2xl font-bold text-indigo-600">
            {contents.filter((c) => c.usage_count > 0).length}
          </div>
        </div>
      </div>

      {/* Welcome Explainer Card - Show when no contents */}
      {contents.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Lightbulb className="w-5 h-5" />
              Welcome to My Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-800">
              Perfect for organizing large collections of URLs before sharing them with your community.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-900">Import 50+ URLs at once (CSV, JSON, or paste)</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-900">Organize in folders before publishing</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-900">Batch-create Documents, Pitches, or Builds</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-900">Track which URLs became popular content</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-blue-200">
              <p className="text-sm font-medium mb-1 text-blue-900 flex items-center gap-1">
                <Lightbulb className="w-4 h-4" />
                Pro Tip
              </p>
              <p className="text-xs text-blue-800">
                For single documents, skip this and go straight to{' '}
                <Link to="/my-documents" className="text-blue-600 underline hover:text-blue-700">
                  My Documents
                </Link>{' '}
                instead. My Links is best for managing many URLs at once.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Tree Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Folders</h3>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <FolderTreeView
              node={folderTree}
              expandedFolders={expandedFolders}
              selectedFolder={selectedFolder}
              onToggle={toggleFolder}
              onSelect={setSelectedFolder}
            />
          </div>
        </div>

        {/* Content Grid/List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search contents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? 'List' : 'Grid'}
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-indigo-900">
                  {selectedItems.size} selected
                </span>
                <div className="flex-1" />
                <UrlHealthCheckButton
                  contentIds={Array.from(selectedItems)}
                  onComplete={fetchContents}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnrichDialogOpen(true)}
                >
                  Bulk Enrich
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Content
                </Button>
              </div>
            )}
          </div>

          {/* Content Items */}
          {filteredContents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contents yet</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'No contents match your search'
                  : 'Import URLs to get started'}
              </p>
              {!searchQuery && (
                <ImportUrlDialog onRefetch={fetchContents} />
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  isSelected={selectedItems.has(content.id)}
                  onToggleSelect={() => toggleItemSelection(content.id)}
                  onRefetch={fetchContents}
                  onEnrich={handleEnrichSingle}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
              {filteredContents.map((content) => (
                <ContentListItem
                  key={content.id}
                  content={content}
                  isSelected={selectedItems.has(content.id)}
                  onToggleSelect={() => toggleItemSelection(content.id)}
                  onRefetch={fetchContents}
                  onEnrich={handleEnrichSingle}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ImportUrlDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          fetchContents();
          setSelectedItems(new Set());
        }}
        defaultFolder={selectedFolder}
      />

      <BulkEnrichDialog
        open={enrichDialogOpen}
        onOpenChange={setEnrichDialogOpen}
        selectedIds={Array.from(selectedItems)}
        onSuccess={() => {
          fetchContents();
          setSelectedItems(new Set());
        }}
      />

      <BatchCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        selectedContents={contents.filter((c) => selectedItems.has(c.id))}
        onSuccess={() => {
          fetchContents();
          setSelectedItems(new Set());
        }}
      />
    </div>
  );
}

// Folder Tree Component
function FolderTreeView({
  node,
  expandedFolders,
  selectedFolder,
  onToggle,
  onSelect,
  level = 0,
}: {
  node: FolderNode;
  expandedFolders: Set<string>;
  selectedFolder: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  level?: number;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFolder === node.path;
  const Icon = node.type ? FOLDER_TYPE_ICONS[node.type as keyof typeof FOLDER_TYPE_ICONS] : Folder;
  const colorClass = node.type ? FOLDER_TYPE_COLORS[node.type as keyof typeof FOLDER_TYPE_COLORS] : 'text-gray-600';

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(node.path)}
      >
        {node.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
            className="hover:bg-gray-200 rounded p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        {node.children.length === 0 && <div className="w-5" />}
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
        {node.count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {node.count}
          </Badge>
        )}
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <FolderTreeView
            key={child.path}
            node={child}
            expandedFolders={expandedFolders}
            selectedFolder={selectedFolder}
            onToggle={onToggle}
            onSelect={onSelect}
            level={level + 1}
          />
        ))}
    </div>
  );
}

// Content Card Component
function ContentCard({
  content,
  isSelected,
  onToggleSelect,
  onRefetch,
  onEnrich,
  onDelete,
}: {
  content: MyContent;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRefetch: () => void;
  onEnrich: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [createdContent, setCreatedContent] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (content.created_content_ids && content.created_content_ids.length > 0) {
      fetchCreatedContent();
    }
  }, [content.created_content_ids]);

  const fetchCreatedContent = async () => {
    if (!content.created_content_ids || content.created_content_ids.length === 0) return;

    setLoadingContent(true);
    try {
      const contentItems: any[] = [];

      // Fetch from my_contents_usage to get content type and IDs
      const { data: usageData, error: usageError } = await supabase
        .from('my_contents_usage')
        .select('content_type, content_id')
        .eq('my_content_id', content.id);

      if (usageError) throw usageError;

      if (usageData && usageData.length > 0) {
        // Group by content type
        const grouped = usageData.reduce((acc: any, item: any) => {
          if (!acc[item.content_type]) acc[item.content_type] = [];
          acc[item.content_type].push(item.content_id);
          return acc;
        }, {});

        // Fetch each content type
        for (const [contentType, ids] of Object.entries(grouped)) {
          const table = `${contentType}s`; // documents, pitches, builds, etc.
          const { data: items } = await supabase
            .from(table)
            .select('id, title, name, slug')
            .in('id', ids as string[]);

          if (items) {
            items.forEach((item: any) => {
              contentItems.push({
                type: contentType,
                id: item.id,
                title: item.title || item.name,
                slug: item.slug,
              });
            });
          }
        }
      }

      setCreatedContent(contentItems);
    } catch (error) {
      console.error('Error fetching created content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      document: FileText,
      pitch: Mic,
      build: Hammer,
      portfolio: Briefcase,
      post: MessageSquare,
    };
    return icons[type] || FileText;
  };

  const getContentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      document: 'text-blue-600 bg-blue-50',
      pitch: 'text-purple-600 bg-purple-50',
      build: 'text-orange-600 bg-orange-50',
      portfolio: 'text-green-600 bg-green-50',
      post: 'text-pink-600 bg-pink-50',
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const getContentUrl = (type: string, item: any) => {
    const routes: Record<string, string> = {
      document: `/documents/${item.id}`,
      pitch: `/pitches/${item.slug || item.id}`,
      build: `/builds/${item.slug || item.id}`,
      portfolio: `/portfolio/${item.id}`,
      post: `/posts/${item.id}`,
    };
    return routes[type] || '#';
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'border-indigo-600' : 'border-gray-200'
      }`}
      onClick={onToggleSelect}
    >
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 rounded border-gray-300"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-gray-900 line-clamp-2">{content.title}</h3>
            <Badge className={getStatusBadge(content.status)}>{content.status}</Badge>
          </div>
          {content.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{content.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LinkIcon className="w-3 h-3" />
            <span className="truncate">{content.domain}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {content.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {content.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {content.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{content.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Created Content Items */}
      {createdContent.length > 0 && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg" onClick={(e) => e.stopPropagation()}>
          <div className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Created Content ({createdContent.length})
          </div>
          <div className="space-y-1">
            {createdContent.map((item, idx) => {
              const Icon = getContentTypeIcon(item.type);
              const colorClass = getContentTypeColor(item.type);
              return (
                <Link
                  key={idx}
                  to={getContentUrl(item.type, item)}
                  className="flex items-center gap-2 text-xs hover:bg-green-100 p-1.5 rounded transition-colors"
                >
                  <div className={`p-1 rounded ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="flex-1 truncate text-gray-900">{item.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.type}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {content.usage_count > 0 && (
            <span className="flex items-center gap-1">
              <Copy className="w-3 h-3" />
              Used {content.usage_count}x
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEnrich(content.id)}>
              <Edit className="w-4 h-4 mr-2" />
              Enrich Metadata
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(content.url, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open URL
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(content.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Content List Item Component
function ContentListItem({
  content,
  isSelected,
  onToggleSelect,
  onRefetch,
  onEnrich,
  onDelete,
}: {
  content: MyContent;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRefetch: () => void;
  onEnrich: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-indigo-50' : ''
      }`}
      onClick={onToggleSelect}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-gray-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-medium text-gray-900 truncate">{content.title}</h3>
          <Badge className={getStatusBadge(content.status)}>{content.status}</Badge>
        </div>
        {content.description && (
          <p className="text-sm text-gray-600 line-clamp-1 mb-2">{content.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {content.domain}
          </span>
          {content.usage_count > 0 && (
            <span className="flex items-center gap-1">
              <Copy className="w-3 h-3" />
              Used {content.usage_count}x
            </span>
          )}
          {content.tags.length > 0 && (
            <span>
              {content.tags.slice(0, 2).join(', ')}
              {content.tags.length > 2 && ` +${content.tags.length - 2}`}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEnrich(content.id)}>
            <Edit className="w-4 h-4 mr-2" />
            Enrich Metadata
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(content.url, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open URL
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => onDelete(content.id)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getStatusBadge(status: string): string {
  const variants = {
    enriched: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-orange-100 text-orange-800 border-orange-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return variants[status as keyof typeof variants] || variants.pending;
}