import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
  url: string;
  title?: string;
  size?: number;
  className?: string;
}

/**
 * QRCodeGenerator - A reusable component for generating QR codes
 * 
 * Usage:
 * <QRCodeGenerator 
 *   url="https://connexted.com/circles/innovation" 
 *   title="Innovation Circle"
 *   size={256}
 * />
 */
export function QRCodeGenerator({ url, title, size = 256, className = '' }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).catch((err) => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [url, size]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `qr-code-${title?.toLowerCase().replace(/\s+/g, '-') || 'download'}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Share this link',
          url: url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <canvas ref={canvasRef} className="border-4 border-white shadow-lg rounded-lg" />
      
      <div className="flex gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={handleCopyLink} variant="outline" size="sm">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
        <Button onClick={handleShare} variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}

interface QRCodeDialogProps {
  url: string;
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  size?: number;
}

/**
 * QRCodeDialog - A dialog that displays a QR code with sharing options
 * 
 * Usage:
 * <QRCodeDialog
 *   url="https://connexted.com/circles/innovation"
 *   title="Innovation Circle"
 *   description="Scan this QR code to join the Innovation Circle"
 *   isOpen={showQR}
 *   onClose={() => setShowQR(false)}
 * />
 */
export function QRCodeDialog({ url, title, description, isOpen, onClose, size = 300 }: QRCodeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="flex justify-center py-4">
          <QRCodeGenerator url={url} title={title} size={size} />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 break-all px-4">{url}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Utility function to generate QR code as data URL (base64)
 * Useful for embedding in emails or saving to database
 */
export async function generateQRCodeDataURL(url: string, size = 256): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}
