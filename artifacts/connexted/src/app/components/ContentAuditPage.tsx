/**
 * ContentAuditPage — unified view of all user-created content.
 * Route: /my-content/audit
 *
 * Tabs: Books · Decks · Lists · Libraries
 * Each tab shows count badge, a sortable list, and inline quick-actions:
 *   - Edit (navigate to detail page)
 *   - Change visibility (where the table supports it)
 *   - Delete (with confirmation)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  BookOpen, Layers, CheckSquare, Library,
  MoreHorizontal, Pencil, Trash2, Globe, Lock, Users, Loader2,
  Eye, EyeOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// ── Types ──────────────────────────────────────────────────────────────────

type Visibility = 'public' | 'member' | 'private' | 'unlisted';

interface BookRow   { id: string; title: string; description: string | null; visibility: Visibility; created_at: string; }
interface DeckRow   { id: string; title: string; description: string | null; visibility: Visibility; created_at: string; }
interface ListRow   { id: string; name: string;  description: string | null; category: string | null; created_at: string; }
interface LibRow    { id: string; name: string;  description: string | null; is_public: boolean; created_at: string; }

// ── Helpers ─────────────────────────────────────────────────────────────────

const VISIBILITY_OPTS: { value: Visibility; label: string; icon: React.ElementType }[] = [
  { value: 'public',   label: 'Public',   icon: Globe  },
  { value: 'member',   label: 'Members',  icon: Users  },
  { value: 'private',  label: 'Private',  icon: Lock   },
  { value: 'unlisted', label: 'Unlisted', icon: EyeOff },
];

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const map: Record<Visibility, string> = {
    public:   'bg-green-50 text-green-700 border-green-200',
    member:   'bg-blue-50 text-blue-700 border-blue-200',
    private:  'bg-gray-50 text-gray-600 border-gray-200',
    unlisted: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${map[visibility] ?? ''}`}>
      {visibility}
    </Badge>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ContentAuditPage() {
  const { profile } = useAuth();

  const [books, setBooks]       = useState<BookRow[]>([]);
  const [decks, setDecks]       = useState<DeckRow[]>([]);
  const [lists, setLists]       = useState<ListRow[]>([]);
  const [libraries, setLibraries] = useState<LibRow[]>([]);
  const [loading, setLoading]   = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userId = profile?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [b, d, l, lib] = await Promise.all([
        supabase.from('books').select('id, title, description, visibility, created_at').eq('created_by', userId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('decks').select('id, title, description, visibility, created_at').eq('created_by', userId).order('created_at', { ascending: false }),
        supabase.from('checklists').select('id, name, description, category, created_at').eq('created_by', userId).order('created_at', { ascending: false }),
        supabase.from('libraries').select('id, name, description, is_public, created_at').eq('owner_id', userId).eq('owner_type', 'user').order('created_at', { ascending: false }),
      ]);
      setBooks(b.data ?? []);
      setDecks(d.data ?? []);
      setLists(l.data ?? []);
      setLibraries(lib.data ?? []);
    } catch (err) {
      console.error('ContentAuditPage load error:', err);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from(deleteTarget.table).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  async function changeVisibility(table: 'books' | 'decks', id: string, visibility: Visibility) {
    const { error } = await supabase.from(table).update({ visibility }).eq('id', id);
    if (error) { toast.error('Failed to update visibility'); return; }
    toast.success('Visibility updated');
    await load();
  }

  async function toggleLibraryPublic(id: string, current: boolean) {
    const { error } = await supabase.from('libraries').update({ is_public: !current }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(!current ? 'Library is now public' : 'Library is now private');
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Content', href: '/my-content' }, { label: 'Content Audit' }]} />
      <div>
        <h1 className="text-2xl font-bold">Content Audit</h1>
        <p className="text-sm text-gray-500 mt-1">All content you've created — edit, change visibility, or delete.</p>
      </div>

      <Tabs defaultValue="books">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Books
            <Badge variant="secondary" className="ml-1 text-xs">{books.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="decks" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Decks
            <Badge variant="secondary" className="ml-1 text-xs">{decks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Lists
            <Badge variant="secondary" className="ml-1 text-xs">{lists.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="libraries" className="flex items-center gap-2">
            <Library className="w-4 h-4" />
            Libraries
            <Badge variant="secondary" className="ml-1 text-xs">{libraries.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Books ── */}
        <TabsContent value="books" className="mt-4">
          <ContentTable
            items={books.map(b => ({ id: b.id, name: b.title, description: b.description, created_at: b.created_at, visibility: b.visibility, editHref: `/books/${b.id}` }))}
            onDelete={(id, name) => setDeleteTarget({ table: 'books', id, name })}
            visibilityOpts={VISIBILITY_OPTS}
            onVisibilityChange={(id, v) => changeVisibility('books', id, v as Visibility)}
            emptyLabel="No books yet"
          />
        </TabsContent>

        {/* ── Decks ── */}
        <TabsContent value="decks" className="mt-4">
          <ContentTable
            items={decks.map(d => ({ id: d.id, name: d.title, description: d.description, created_at: d.created_at, visibility: d.visibility, editHref: `/decks/${d.id}` }))}
            onDelete={(id, name) => setDeleteTarget({ table: 'decks', id, name })}
            visibilityOpts={VISIBILITY_OPTS}
            onVisibilityChange={(id, v) => changeVisibility('decks', id, v as Visibility)}
            emptyLabel="No decks yet"
          />
        </TabsContent>

        {/* ── Lists ── */}
        <TabsContent value="lists" className="mt-4">
          <ContentTable
            items={lists.map(l => ({ id: l.id, name: l.name, description: l.description, created_at: l.created_at, editHref: `/checklists/${l.id}` }))}
            onDelete={(id, name) => setDeleteTarget({ table: 'checklists', id, name })}
            emptyLabel="No lists yet"
          />
        </TabsContent>

        {/* ── Libraries ── */}
        <TabsContent value="libraries" className="mt-4">
          <div className="space-y-2">
            {libraries.length === 0 ? (
              <EmptyState label="No libraries yet" />
            ) : (
              libraries.map(lib => (
                <div key={lib.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50">
                  <Library className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lib.name}</p>
                    {lib.description && <p className="text-xs text-gray-500 truncate">{lib.description}</p>}
                  </div>
                  <Badge variant="outline" className={lib.is_public ? 'bg-green-50 text-green-700 border-green-200 text-[10px]' : 'bg-gray-50 text-gray-600 border-gray-200 text-[10px]'}>
                    {lib.is_public ? 'Public' : 'Private'}
                  </Badge>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(lib.created_at), { addSuffix: true })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/libraries/${lib.id}/settings`}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleLibraryPublic(lib.id, lib.is_public)}>
                        {lib.is_public ? <><EyeOff className="w-4 h-4 mr-2" /> Make Private</> : <><Eye className="w-4 h-4 mr-2" /> Make Public</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteTarget({ table: 'libraries', id: lib.id, name: lib.name })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Shared content table ────────────────────────────────────────────────────

interface ContentRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  visibility?: Visibility;
  editHref: string;
}

function ContentTable({
  items,
  onDelete,
  visibilityOpts,
  onVisibilityChange,
  emptyLabel,
}: {
  items: ContentRow[];
  onDelete: (id: string, name: string) => void;
  visibilityOpts?: typeof VISIBILITY_OPTS;
  onVisibilityChange?: (id: string, value: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
          </div>
          {item.visibility && <VisibilityBadge visibility={item.visibility} />}
          <span className="text-xs text-gray-400 shrink-0">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={item.editHref}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Link>
              </DropdownMenuItem>
              {visibilityOpts && onVisibilityChange && (
                <>
                  <DropdownMenuSeparator />
                  {visibilityOpts.map(opt => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onVisibilityChange(item.id, opt.value)}
                      className={item.visibility === opt.value ? 'font-medium' : ''}
                    >
                      <opt.icon className="w-4 h-4 mr-2" />
                      {opt.label}
                      {item.visibility === opt.value && <span className="ml-auto text-xs text-gray-400">current</span>}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(item.id, item.name)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">{label}</p>
    </div>
  );
}
