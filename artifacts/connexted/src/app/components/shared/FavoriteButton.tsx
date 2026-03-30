import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  itemId: string;
  itemType: string;
  isFavorited?: boolean; // Now passed from parent component
  onUpdate?: (itemId: string, isFavorited: boolean) => void; // Updated signature
  className?: string;
  showLabel?: boolean;
}

export default function FavoriteButton({
  itemId,
  itemType,
  isFavorited = false,
  onUpdate,
  className,
  showLabel = false,
}: FavoriteButtonProps) {
  const { profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  if (!profile) return null;
  
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    const newIsFavorited = !isFavorited;
    
    // Optimistic update
    if (onUpdate) {
      onUpdate(itemId, newIsFavorited);
    }
    
    try {
      if (newIsFavorited) {
        // Add to favorites
        const { error } = await supabase
          .from('content_favorites')
          .insert({
            user_id: profile.id,
            content_id: itemId,
            content_type: itemType
          });
        
        if (error) throw error;
        toast.success('Added to favorites');
      } else {
        // Remove from favorites
        const { error } = await supabase
          .from('content_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('content_id', itemId)
          .eq('content_type', itemType);
        
        if (error) throw error;
        toast.success('Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update
      if (onUpdate) {
        onUpdate(itemId, isFavorited);
      }
      toast.error('Failed to update favorite');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={cn(
        'inline-flex items-center gap-1.5 p-1.5 rounded-md transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Bookmark
        className={cn(
          'w-5 h-5 transition-all',
          isFavorited
            ? 'fill-blue-500 text-blue-500'
            : 'text-gray-400 hover:text-blue-500'
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
}