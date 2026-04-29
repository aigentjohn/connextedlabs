import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
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
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload, Trash2, Loader2, ImageIcon, RefreshCw, Info,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { formatDistanceToNow } from 'date-fns';

interface Asset {
  name: string;
  fullPath: string;
  publicUrl: string;
  size: number;
  created_at: string;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MyAssetsPage() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  async function load() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .list(profile.id, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const files = (data ?? []).filter(f => f.id); // exclude folders
      const mapped: Asset[] = files.map(f => {
        const fullPath = `${profile.id}/${f.name}`;
        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fullPath);
        return {
          name: f.name,
          fullPath,
          publicUrl: urlData.publicUrl,
          size: f.metadata?.size ?? 0,
          created_at: f.created_at ?? new Date().toISOString(),
        };
      });
      setAssets(mapped);
    } catch (err: any) {
      console.error('MyAssetsPage load error:', err);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return; }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
      const path = `${profile.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('assets')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      toast.success('Uploaded');
      await load();
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Ref-check: scan pages.content for this URL
      const { data: refs } = await supabase
        .from('pages')
        .select('id, title')
        .ilike('content', `%${deleteTarget.publicUrl}%`);

      if (refs && refs.length > 0) {
        toast.error(`This image is used in ${refs.length} page(s): "${refs[0].title}"${refs.length > 1 ? ` +${refs.length - 1} more` : ''}. Remove it from those pages first.`);
        setDeleteTarget(null);
        return;
      }

      const { error } = await supabase.storage.from('assets').remove([deleteTarget.fullPath]);
      if (error) throw error;
      toast.success('Deleted');
      setAssets(prev => prev.filter(a => a.fullPath !== deleteTarget.fullPath));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message ?? 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success('URL copied'));
  }

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|svg)$/i.test(name);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Content', href: '/my-content' }, { label: 'My Assets' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Assets</h1>
          <p className="text-sm text-gray-500 mt-1">Images and files you've uploaded to the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => uploadRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload
          </Button>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{assets.length} file{assets.length !== 1 ? 's' : ''}</span>
        <span>{fmtBytes(assets.reduce((s, a) => s + a.size, 0))} total</span>
      </div>

      {/* Bucket info banner */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="py-3 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700">
            Assets are stored in your private <strong>assets</strong> bucket.
            Copy a URL and paste it into the Page editor image button, or any URL field.
            Deleting an asset that is referenced in a page is blocked — remove it from the page first.
          </p>
        </CardContent>
      </Card>

      {/* Asset grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No assets yet. Upload an image to get started.</p>
            <Button className="mt-4" size="sm" onClick={() => uploadRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload your first image
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map(asset => (
            <Card key={asset.fullPath} className="overflow-hidden group">
              <div className="aspect-square bg-gray-100 relative">
                {isImage(asset.name) ? (
                  <img
                    src={asset.publicUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs h-7"
                    onClick={() => copyUrl(asset.publicUrl)}
                  >
                    Copy URL
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0"
                    onClick={() => setDeleteTarget(asset)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate" title={asset.name}>{asset.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{fmtBytes(asset.size)}</Badge>
                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. Any page referencing this image will show a broken image. This check only scans Pages — manually remove the URL from other content first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
