import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GitFork, Check, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { toast } from 'sonner';

interface ForkButtonProps {
  contentType: 'prompt' | 'build';
  contentId: string;
  contentTitle: string;
  forksCount: number;
  userId?: string;
  onForkComplete?: (newId: string, newSlug?: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showCount?: boolean;
  className?: string;
}

export function ForkButton({
  contentType,
  contentId,
  contentTitle,
  forksCount,
  userId,
  onForkComplete,
  size = 'md',
  variant = 'outline',
  showCount = true,
  className = ''
}: ForkButtonProps) {
  const navigate = useNavigate();
  const [isForking, setIsForking] = useState(false);
  const [forked, setForked] = useState(false);

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-700'
  };

  const handleFork = async () => {
    if (!userId) {
      toast.error('Please log in to fork this content');
      return;
    }

    setIsForking(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/api/fork`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          contentType,
          contentId,
          userId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setForked(true);
        toast.success(`Successfully forked "${contentTitle}"!`);
        onForkComplete?.(data.newId, data.newSlug);
        
        // Navigate to the new fork after a brief delay
        setTimeout(() => {
          if (contentType === 'build' && data.newSlug) {
            navigate(`/builds/${data.newSlug}/settings`);
          } else if (contentType === 'build') {
            navigate(`/builds`);
          } else {
            navigate(`/${contentType}s`);
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to fork');
      }
    } catch (error: any) {
      console.error('Failed to fork:', error);
      toast.error(error.message || 'Failed to fork. Please try again.');
      setIsForking(false);
    }
  };

  return (
    <button
      onClick={handleFork}
      disabled={isForking || forked || !userId}
      className={`
        flex items-center gap-2 rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      title={!userId ? 'Log in to fork' : forked ? 'Forked successfully!' : `Fork this ${contentType}`}
    >
      {isForking ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : forked ? (
        <Check className={`${iconSizes[size]} text-green-600`} />
      ) : (
        <GitFork className={iconSizes[size]} />
      )}
      
      <span>
        {isForking ? 'Forking...' : forked ? 'Forked!' : 'Fork'}
      </span>
      
      {showCount && forksCount > 0 && (
        <span className={`
          ${variant === 'default' ? 'bg-white/20' : 'bg-gray-100'} 
          px-2 py-0.5 rounded-full text-xs font-semibold
        `}>
          {forksCount}
        </span>
      )}
    </button>
  );
}
