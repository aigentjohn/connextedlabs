import { cn } from '@/app/components/ui/utils';

interface ProgressBarProps {
  current: number;
  max: number;
  warningThreshold?: number; // 0-1, default 0.8
  className?: string;
}

export function ProgressBar({ 
  current, 
  max, 
  warningThreshold = 0.8, 
  className 
}: ProgressBarProps) {
  const percentage = (current / max) * 100;
  const isWarning = current >= max * warningThreshold;
  const isAtLimit = current >= max;
  
  return (
    <div className={cn('w-full h-2 bg-gray-200 rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full transition-all',
          isAtLimit ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}
