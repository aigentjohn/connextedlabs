/**
 * Lifecycle Filter Component
 * Dropdown to filter containers by lifecycle state
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { type LifecycleState } from '@/lib/lifecycle-helpers';
import { Activity } from 'lucide-react';

interface LifecycleFilterProps {
  value: 'all' | LifecycleState;
  onChange: (value: 'all' | LifecycleState) => void;
  className?: string;
}

export default function LifecycleFilter({ value, onChange, className = '' }: LifecycleFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Activity className="w-4 h-4 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by state" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          <SelectItem value="engaged">💚 Engaged</SelectItem>
          <SelectItem value="active">🟢 Active</SelectItem>
          <SelectItem value="released">🟢 Released</SelectItem>
          <SelectItem value="created">🔵 Created</SelectItem>
          <SelectItem value="idea">🟣 Idea</SelectItem>
          <SelectItem value="stale">🟠 Stale</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}