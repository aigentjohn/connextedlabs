import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Copy, Check, Link2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ShareableUrlProps {
  containerType: 'circle' | 'container' | 'moment' | 'portfolio' | 'library' | 'program' | 'template';
  containerId: string;
  containerName?: string;
  variant?: 'inline' | 'card';
  showLabel?: boolean;
}

export function ShareableUrl({ 
  containerType, 
  containerId, 
  containerName,
  variant = 'inline',
  showLabel = true 
}: ShareableUrlProps) {
  const [copied, setCopied] = useState(false);

  // Build the full URL
  const baseUrl = window.location.origin;
  
  // Use preview routes for shareable URLs (they're public and show join/info interface)
  let containerPath: string;
  if (containerType === 'circle') {
    containerPath = 'preview/circles';
  } else if (containerType === 'program') {
    containerPath = 'preview/programs';
  } else if (containerType === 'template') {
    containerPath = 'preview/templates';
  } else {
    // Fallback for other container types
    containerPath = `${containerType}s`;
  }
  
  const fullUrl = `${baseUrl}/${containerPath}/${containerId}`;

  // Create shortened display version
  const getShortUrl = () => {
    // Show just the path, not the full origin
    return `/${containerPath}/${containerId}`;
  };

  const shortUrl = getShortUrl();

  const handleCopyUrl = async () => {
    try {
      // Try modern clipboard API first — it often works in iframes during user gestures
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          toast.success('URL copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (clipboardError: any) {
          // If clipboard API fails due to permissions, fall through to fallback
          if (clipboardError.name !== 'NotAllowedError') {
            throw clipboardError;
          }
        }
      }
      
      // Fallback for older browsers or restricted contexts
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        toast.success('URL copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (error) {
      console.log('Clipboard unavailable, showing manual copy message');
      toast.info('Please manually copy: ' + fullUrl, { duration: 5000 });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(fullUrl, '_blank');
  };

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {showLabel && (
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-900">Share Link</h4>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-sm text-gray-700 font-mono truncate">
                  {fullUrl}
                </p>
              </div>
              
              <Button
                onClick={handleCopyUrl}
                variant={copied ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleOpenInNewTab}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            {containerName && (
              <p className="text-xs text-gray-500">
                Share this link to invite others to {containerName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      {showLabel && (
        <Link2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 font-mono truncate" title={fullUrl}>
          {shortUrl}
        </p>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={handleCopyUrl}
          variant={copied ? "default" : "ghost"}
          size="sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </Button>
        
        <Button
          onClick={handleOpenInNewTab}
          variant="ghost"
          size="sm"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}