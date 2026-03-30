import { useState } from 'react';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/components/ui/utils';
import { Check } from 'lucide-react';

interface CompletionCheckboxProps {
  itemId: string;
  journeyId: string;
  isCompleted: boolean;
  onToggle: (itemId: string, journeyId: string, completed: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CompletionCheckbox({
  itemId,
  journeyId,
  isCompleted,
  onToggle,
  disabled = false,
  size = 'md',
}: CompletionCheckboxProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onToggle(itemId, journeyId, !isCompleted);
    } catch (error) {
      console.error('Error toggling completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center justify-center rounded border-2 transition-all',
        isCompleted
          ? 'bg-green-500 border-green-500 text-white'
          : 'bg-white border-gray-300 hover:border-gray-400',
        disabled && 'opacity-50 cursor-not-allowed',
        isLoading && 'opacity-50 cursor-wait',
        sizeClasses[size]
      )}
    >
      {isCompleted && <Check className={cn(sizeClasses[size], 'text-white')} strokeWidth={3} />}
    </button>
  );
}
