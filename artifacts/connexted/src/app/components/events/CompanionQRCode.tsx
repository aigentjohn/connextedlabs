import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/app/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CompanionQRCodeProps {
  companionId: string;
}

export function CompanionQRCode({ companionId }: CompanionQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/event-companions/${companionId}`;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    }).then(setDataUrl);
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Event Companion QR Code"
          className="rounded-lg border shadow-sm"
          width={240}
          height={240}
        />
      ) : (
        <div className="w-60 h-60 rounded-lg border bg-gray-50 animate-pulse" />
      )}

      <div className="w-full max-w-xs space-y-2 text-center">
        <p className="text-xs text-gray-500 break-all">{url}</p>
        <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
          {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Display this QR code at the event so attendees can check in and access companion content.
      </p>
    </div>
  );
}
