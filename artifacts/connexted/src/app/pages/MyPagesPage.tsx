import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/app/components/ui/alert-dialog';
import { Label } from '@/app/components/ui/label';
import { PrivacySelector } from '@/app/components/unified/PrivacySelector';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Code2,
  Download,
  Upload,
  Search,
  Clock,
  ImagePlus,
  Loader2,
} from 'lucide-react';

interface Page {
  id: string;
  title: string;
  content: string;
  description: string | null;
  visibility: 'public' | 'member' | 'private';
  tags: string[];
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  title: '',
  content: '',
  description: '',
  visibility: 'private' as const,
  tags: '' as string,
};

export default function MyPagesPage() {
  const { profile } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  // File input ref for .md import
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs for inline image upload in editor
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchPages();
  }, [profile?.id]);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, content, description, visibility, tags, created_at, updated_at')
        .eq('created_by', profile!.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingPage(null);
    setForm({ ...EMPTY_FORM });
    setPreviewMode(false);
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditingPage(page);
    setForm({
      title: page.title,
      content: page.content,
      description: page.description || '',
      visibility: page.visibility,
      tags: page.tags.join(', '),
    });
    setPreviewMode(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      content: form.content,
      description: form.description.trim() || null,
      visibility: form.visibility,
      tags,
    };

    try {
      setSaving(true);

      if (editingPage) {
        const { error } = await supabase
          .from('pages')
          .update(payload)
          .eq('id', editingPage.id);
        if (error) throw error;
        toast.success('Page updated');
      } else {
        const { error } = await supabase
          .from('pages')
          .insert({ ...payload, created_by: profile!.id });
        if (error) throw error;
        toast.success('Page created');
      }

      setDialogOpen(false);
      fetchPages();
    } catch (err) {
      console.error('Error saving page:', err);
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Page deleted');
      setDeleteTarget(null);
      setPages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (err) {
      console.error('Error deleting page:', err);
      toast.error('Failed to delete page');
    }
  };

  // ── Inline image upload ─────────────────────────────────────────────────────

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setImageUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('assets').getPublicUrl(path);
      const md = `![${file.name.replace(`.${ext}`, '')}](${data.publicUrl})`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? form.content.length;
        const end = ta.selectionEnd ?? start;
        const before = form.content.slice(0, start);
        const after = form.content.slice(end);
        const newContent = `${before}\n${md}\n${after}`;
        setForm((f) => ({ ...f, content: newContent }));
      } else {
        setForm((f) => ({ ...f, content: f.content + `\n${md}\n` }));
      }
      toast.success('Image inserted');
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  // ── Import / Export ─────────────────────────────────────────────────────────

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      // Use filename (minus extension) as title suggestion
      const suggested = file.name.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
      setEditingPage(null);
      setForm({
        title: suggested,
        content: text,
        description: '',
        visibility: 'private',
        tags: '',
      });
      setPreviewMode(false);
      setDialogOpen(true);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = '';
  };

  const handleExport = (page: Page) => {
    const blob = new Blob([page.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = pages.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  const visibilityColors: Record<string, string> = {
    public: 'bg-green-100 text-green-700',
    member: 'bg-blue-100 text-blue-700',
    private: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StickyNote className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Pages</h1>
            <p className="text-sm text-gray-500">
              Lightweight markdown pages for courses, cohorts, and journeys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import .md
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Page
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-sm text-gray-500">Loading pages...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <StickyNote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            {pages.length === 0
              ? 'No pages yet. Create your first page or import a .md file.'
              : 'No pages match your search.'}
          </p>
          {pages.length === 0 && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Page
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{page.title}</CardTitle>
                    {page.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {page.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleExport(page)}
                      title="Export as .md"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(page)}
                    >
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setDeleteTarget(page)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${visibilityColors[page.visibility]}`}
                  >
                    {page.visibility}
                  </span>
                  {page.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(page.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Edit Page' : 'New Page'}</DialogTitle>
            <DialogDescription>
              Write in markdown. Toggle between editor and preview at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Page title"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short summary shown in lists"
              />
            </div>

            {/* Editor / Preview toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={imageUploading || previewMode}
                    onClick={() => imageInputRef.current?.click()}
                    title="Insert image"
                  >
                    {imageUploading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <ImagePlus className="w-3.5 h-3.5" />}
                    Image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setPreviewMode((v) => !v)}
                  >
                    {previewMode ? (
                      <><Code2 className="w-3.5 h-3.5" /> Editor</>
                    ) : (
                      <><Eye className="w-3.5 h-3.5" /> Preview</>
                    )}
                  </Button>
                </div>
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFile} />

              {previewMode ? (
                <div className="min-h-[280px] max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-white prose prose-sm max-w-none">
                  {form.content.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {form.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">Nothing to preview yet.</p>
                  )}
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write your page content in markdown..."
                  className="min-h-[280px] font-mono text-sm resize-y"
                />
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. onboarding, week1, reading"
              />
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <PrivacySelector
                mode="content"
                value={form.visibility}
                onChange={(v) => setForm((f) => ({ ...f, visibility: v as typeof form.visibility }))}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingPage ? 'Save Changes' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted. This cannot be
              undone. Any journey items that reference this page will show an error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
