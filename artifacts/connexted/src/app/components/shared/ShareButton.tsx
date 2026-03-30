import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

/**
 * ShareButton - A button that uses native share on mobile or copies to clipboard on desktop
 * 
 * Usage:
 * <ShareButton 
 *   url="https://connexted.com/circles/innovation"
 *   title="Innovation Circle"
 *   text="Check out this circle!"
 * />
 */
export function ShareButton({
  url,
  title = 'Share',
  text,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && navigator.share;

  const handleShare = async () => {
    // Try native share first (works on mobile and some desktop browsers)
    if (canShare) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
        return;
      } catch (err: any) {
        // User cancelled or share failed, fall through to copy
        if (err.name === 'AbortError') {
          return; // User cancelled, don't show error
        }
      }
    }

    // Fallback to copying to clipboard
    try {
      // Try modern clipboard API first — it often works in iframes during user gestures
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (clipErr: any) {
          // If NotAllowedError, fall through to legacy fallback
          if (clipErr.name !== 'NotAllowedError') throw clipErr;
        }
      }
      
      // Fallback for older browsers or restricted contexts
      const textArea = document.createElement('textarea');
      textArea.value = url;
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
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Error copying link:', err);
      toast.info('Please manually copy: ' + url, { duration: 5000 });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleShare}
            className={className}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {showLabel && size !== 'icon' && <span className="ml-2">Copied!</span>}
              </>
            ) : (
              <>
                {canShare ? (
                  <Share2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {showLabel && size !== 'icon' && (
                  <span className="ml-2">{canShare ? 'Share' : 'Copy Link'}</span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{canShare ? 'Share this link' : 'Copy link to clipboard'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ShareIconButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
}

/**
 * ShareIconButton - Compact icon-only version for toolbars
 * 
 * Usage:
 * <ShareIconButton url="https://connexted.com/builds/my-app" />
 */
export function ShareIconButton({ url, title, text, className = '' }: ShareIconButtonProps) {
  return (
    <ShareButton
      url={url}
      title={title}
      text={text}
      variant="ghost"
      size="icon"
      showLabel={false}
      className={className}
    />
  );
}

/**
 * Hook for programmatic sharing
 * 
 * Usage:
 * const { share, canShare } = useShare();
 * await share({ url: 'https://...', title: 'My Title' });
 */
export function useShare() {
  const canShare = typeof navigator !== 'undefined' && navigator.share;

  const share = async ({
    url,
    title,
    text,
  }: {
    url: string;
    title?: string;
    text?: string;
  }) => {
    if (canShare) {
      try {
        await navigator.share({ title, text, url });
        return { success: true, method: 'native' };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, method: 'cancelled' };
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      return { success: true, method: 'clipboard' };
    } catch (err) {
      toast.error('Failed to copy link');
      return { success: false, method: 'error' };
    }
  };

  return { share, canShare };
}