import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Badge } from '@/app/components/ui/badge';
import { Search, Bookmark, Folder, Upload, Plus, Trash2, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  folder?: string;
  favicon?: string;
  created_at: string;
}

interface BookmarkBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, title: string) => void;
}

export default function BookmarkBrowser({ open, onClose, onSelect }: BookmarkBrowserProps) {
  const { profile } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['All Bookmarks']));
  
  // Add bookmark form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newFolder, setNewFolder] = useState('');

  useEffect(() => {
    if (open && profile) {
      fetchBookmarks();
    }
  }, [open, profile]);

  const fetchBookmarks = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const addBookmark = async () => {
    if (!profile || !newTitle.trim() || !newUrl.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: profile.id,
          title: newTitle.trim(),
          url: newUrl.trim(),
          folder: newFolder.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setBookmarks([data, ...bookmarks]);
      setNewTitle('');
      setNewUrl('');
      setNewFolder('');
      setShowAddForm(false);
      toast.success('Bookmark added');
    } catch (error) {
      console.error('Error adding bookmark:', error);
      toast.error('Failed to add bookmark');
    }
  };

  const deleteBookmark = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookmarks(bookmarks.filter(b => b.id !== id));
      toast.success('Bookmark deleted');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };

  const importBookmarks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const links = doc.querySelectorAll('a');

        const newBookmarks: Omit<Bookmark, 'id' | 'created_at'>[] = [];
        
        links.forEach((link) => {
          const href = link.getAttribute('href');
          const title = link.textContent || 'Untitled';
          
          if (href && href.startsWith('http')) {
            // Try to determine folder from parent structure
            let folder = '';
            let parent = link.parentElement;
            while (parent && parent.tagName !== 'HTML') {
              const h3 = parent.querySelector('h3');
              if (h3) {
                folder = h3.textContent || '';
                break;
              }
              parent = parent.parentElement;
            }

            newBookmarks.push({
              user_id: profile.id,
              title,
              url: href,
              folder: folder || undefined,
            });
          }
        });

        if (newBookmarks.length === 0) {
          toast.error('No bookmarks found in file');
          return;
        }

        const { data, error } = await supabase
          .from('bookmarks')
          .insert(newBookmarks)
          .select();

        if (error) throw error;

        setBookmarks([...data, ...bookmarks]);
        toast.success(`Imported ${newBookmarks.length} bookmarks`);
      } catch (error) {
        console.error('Error importing bookmarks:', error);
        toast.error('Failed to import bookmarks');
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) {
        next.delete(folder);
      } else {
        next.add(folder);
      }
      return next;
    });
  };

  // Group bookmarks by folder
  const folders = Array.from(new Set(bookmarks.map(b => b.folder || 'Uncategorized')));
  const bookmarksByFolder = folders.reduce((acc, folder) => {
    acc[folder] = bookmarks.filter(b => (b.folder || 'Uncategorized') === folder);
    return acc;
  }, {} as Record<string, Bookmark[]>);

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.folder || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (bookmark: Bookmark) => {
    onSelect(bookmark.url, bookmark.title);
    onClose();
    toast.success('Bookmark selected');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Bookmark Browser
          </DialogTitle>
          <DialogDescription>
            Browse, add, and import your bookmarks to quickly add URLs to documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "secondary" : "default"}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bookmark
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="w-4 h-4 mr-2" />
                Import Bookmarks
                <input
                  type="file"
                  accept=".html"
                  onChange={importBookmarks}
                  className="hidden"
                />
              </label>
            </Button>

            <div className="flex-1" />
            
            <p className="text-xs text-gray-500 self-center">
              {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Add Bookmark Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Bookmark title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL *</label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Folder (optional)</label>
                <Input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Work, Resources, etc."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addBookmark} size="sm" className="flex-1">Add</Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline" size="sm" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bookmarks List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Loading bookmarks...
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 space-y-2">
                <Bookmark className="w-12 h-12 text-gray-300" />
                <p>No bookmarks yet</p>
                <p className="text-sm">Add bookmarks or import from your browser</p>
              </div>
            ) : searchQuery ? (
              // Flat list when searching
              <div className="p-4 space-y-2">
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border group"
                  >
                    <Bookmark className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleSelect(bookmark)}
                    >
                      <p className="font-medium text-sm truncate">{bookmark.title}</p>
                      <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
                      {bookmark.folder && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {bookmark.folder}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBookmark(bookmark.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              // Folder structure
              <div className="p-4 space-y-2">
                {/* All Bookmarks */}
                <div>
                  <button
                    onClick={() => toggleFolder('All Bookmarks')}
                    className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-50 rounded-lg"
                  >
                    {expandedFolders.has('All Bookmarks') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Bookmark className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold">All Bookmarks</span>
                    <Badge variant="secondary" className="ml-auto">{bookmarks.length}</Badge>
                  </button>
                  
                  {expandedFolders.has('All Bookmarks') && (
                    <div className="ml-6 mt-1 space-y-1">
                      {bookmarks.slice(0, 10).map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group"
                        >
                          <Bookmark className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleSelect(bookmark)}
                          >
                            <p className="font-medium text-sm truncate">{bookmark.title}</p>
                            <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBookmark(bookmark.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      {bookmarks.length > 10 && (
                        <p className="text-xs text-gray-500 ml-6 mt-2">
                          ...and {bookmarks.length - 10} more
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Folders */}
                {folders.map((folder) => {
                  const folderBookmarks = bookmarksByFolder[folder];
                  return (
                    <div key={folder}>
                      <button
                        onClick={() => toggleFolder(folder)}
                        className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-50 rounded-lg"
                      >
                        {expandedFolders.has(folder) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Folder className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">{folder}</span>
                        <Badge variant="secondary" className="ml-auto">{folderBookmarks.length}</Badge>
                      </button>
                      
                      {expandedFolders.has(folder) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {folderBookmarks.map((bookmark) => (
                            <div
                              key={bookmark.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group"
                            >
                              <Bookmark className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleSelect(bookmark)}
                              >
                                <p className="font-medium text-sm truncate">{bookmark.title}</p>
                                <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteBookmark(bookmark.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-gray-500">
            <strong>Tip:</strong> Export bookmarks from your browser (Settings → Bookmarks → Export) to import them here.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}