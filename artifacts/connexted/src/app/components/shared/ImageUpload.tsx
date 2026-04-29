import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = {
  square: { width: 400, height: 400, label: '400 × 400 px' },
  wide:   { width: 1200, height: 400, label: '1200 × 400 px' },
} as const;

type Preset = keyof typeof PRESETS;

const MAX_SIZE_MB = 2;
const ACCEPTED = 'image/jpeg,image/png,image/webp';

// ── Canvas resize → WebP ──────────────────────────────────────────────────────

async function resizeToPreset(file: File, preset: Preset): Promise<Blob> {
  const { width, height } = PRESETS[preset];
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      // Cover-crop: scale to fill, center the crop
      const scale = Math.max(width / img.width, height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (width - sw) / 2, (height - sh) / 2, sw, sh);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Resize failed'))),
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ImageUploadProps {
  /** Supabase Storage bucket: 'avatars' | 'covers' | 'assets' */
  bucket: string;
  /** Storage path without extension, e.g. '{userId}/avatar'. Extension is always .webp. */
  storagePath: string;
  /** 'square' → 400×400 | 'wide' → 1200×400 */
  preset: Preset;
  /** Shape variant: 'avatar' renders a circle; 'cover' and 'logo' are rectangular. */
  variant?: 'avatar' | 'cover' | 'logo';
  /** Current image URL shown as preview. */
  currentUrl?: string | null;
  /** Called with the new public URL after a successful upload, or '' on clear. */
  onUpload: (publicUrl: string) => void;
  /** Fallback initial shown in avatar placeholder. */
  fallback?: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImageUpload({
  bucket,
  storagePath,
  preset,
  currentUrl,
  onUpload,
  variant = 'cover',
  fallback = '?',
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  const specLabel = `${PRESETS[preset].label} · WebP · Max ${MAX_SIZE_MB} MB`;

  async function handleFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are accepted');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Original file must be under ${MAX_SIZE_MB} MB`);
      return;
    }

    setUploading(true);
    // Show a local preview immediately while resizing/uploading
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const blob = await resizeToPreset(file, preset);
      const path = `${storagePath}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const bustUrl = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(bustUrl);
      onUpload(bustUrl);
      toast.success('Image uploaded');
    } catch (err: any) {
      console.error('ImageUpload error:', err);
      toast.error(err.message ?? 'Upload failed');
      setPreview(currentUrl ?? null);
    } finally {
      URL.revokeObjectURL(localPreview);
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
    if (file) handleFile(file);
  }

  function clear() {
    setPreview(null);
    onUpload('');
  }

  // ── Avatar variant ────────────────────────────────────────────────────────

  if (variant === 'avatar') {
    return (
      <div className={`space-y-1 ${className ?? ''}`}>
        <div className="relative inline-block">
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
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Camera className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400">{specLabel}</p>
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
      </div>
    );
  }

  // ── Cover / Logo variant ──────────────────────────────────────────────────

  const isLogo = variant === 'logo';
  const containerClass = isLogo ? 'w-32 h-32 rounded-lg' : 'w-full h-36 rounded-lg';

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
              <Button type="button" size="sm" variant="secondary"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Change
              </Button>
              <Button type="button" size="sm" variant="secondary"
                onClick={(e) => { e.stopPropagation(); clear(); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 p-4">
            {uploading
              ? <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" />
              : <Upload className="w-6 h-6 mx-auto mb-1" />}
            <p className="text-xs">{uploading ? 'Uploading…' : 'Click or drag to upload'}</p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{specLabel}</p>
      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
    </div>
  );
}
