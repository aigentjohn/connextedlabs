import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_SIZE_MB: Record<string, number> = {
  avatars: 2,
  covers: 5,
  assets: 10,
};

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

export interface ImageUploadProps {
  /** Supabase Storage bucket name: 'avatars' | 'covers' | 'assets' */
  bucket: string;
  /** Full storage path, e.g. '{userId}/avatar.jpg'. Caller constructs this. */
  storagePath: string;
  /** Current image URL (shown as preview). */
  currentUrl?: string | null;
  /** Called with the public URL after a successful upload. */
  onUpload: (publicUrl: string) => void;
  /** Shape variant: 'avatar' renders a circle; 'cover' renders a wide banner strip. */
  variant?: 'avatar' | 'cover' | 'logo';
  /** Fallback text shown in avatar placeholder (first char). */
  fallback?: string;
  className?: string;
}

export function ImageUpload({
  bucket,
  storagePath,
  currentUrl,
  onUpload,
  variant = 'cover',
  fallback = '?',
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function handleFile(file: File) {
    const maxMb = MAX_SIZE_MB[bucket] ?? 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Image must be under ${maxMb} MB`);
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = storagePath.includes('.') ? storagePath : `${storagePath}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      // Bust cache so the browser fetches the new image
      const bustUrl = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(bustUrl);
      onUpload(bustUrl);
      toast.success('Image uploaded');
    } catch (err: any) {
      console.error('ImageUpload error:', err);
      toast.error(err.message ?? 'Upload failed');
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }

  function clear() {
    setPreview(null);
    onUpload('');
  }

  if (variant === 'avatar') {
    return (
      <div className={`relative inline-block ${className ?? ''}`}>
        <Avatar className="w-20 h-20">
          <AvatarImage src={preview ?? undefined} />
          <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-gray-50 disabled:opacity-60"
          title="Upload photo"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
      </div>
    );
  }

  // 'cover' and 'logo' variant — rectangular drop zone
  const isLogo = variant === 'logo';
  const containerClass = isLogo
    ? 'w-32 h-32 rounded-lg'
    : 'w-full h-36 rounded-lg';

  return (
    <div className={className}>
      <div
        className={`relative ${containerClass} border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              <Button type="button" size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Change
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); clear(); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 p-4">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
            ) : (
              <Upload className="w-6 h-6 mx-auto mb-1" />
            )}
            <p className="text-xs">{uploading ? 'Uploading…' : 'Click or drag to upload'}</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
    </div>
  );
}
