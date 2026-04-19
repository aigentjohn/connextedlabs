import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Globe, Users, Star, Lock } from 'lucide-react';

export type Visibility = 'public' | 'member' | 'premium' | 'private';

interface PrivacySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  /** Controls which option set is shown.  Defaults to 'container'. */
  mode?: 'content' | 'container';
  contentType?: string;
}

interface VisibilityOption {
  value: Visibility;
  icon: typeof Globe;
  iconColor: string;
  label: string;
  description: string;
}

const CONTAINER_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    icon: Globe,
    iconColor: 'text-green-600',
    label: 'Anyone can find this',
    description: 'Appears in browse pages, search, and Discover',
  },
  {
    value: 'member',
    icon: Users,
    iconColor: 'text-blue-600',
    label: 'Members only',
    description: 'Only visible to members of this container',
  },
  {
    value: 'private',
    icon: Lock,
    iconColor: 'text-red-600',
    label: 'Only me',
    description: 'Not visible to anyone else',
  },
];

const CONTENT_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    icon: Globe,
    iconColor: 'text-green-600',
    label: 'Anyone can find this',
    description: 'Appears in browse pages, search, and Discover',
  },
  {
    value: 'premium',
    icon: Star,
    iconColor: 'text-amber-600',
    label: 'Course & program members only',
    description: 'Hidden from browse — accessible only via an enrolled course or program',
  },
  {
    value: 'private',
    icon: Lock,
    iconColor: 'text-red-600',
    label: 'Only me',
    description: 'Not visible to anyone else',
  },
];

export function PrivacySelector({
  value,
  onChange,
  mode = 'container',
  contentType,
}: PrivacySelectorProps) {
  const options = mode === 'content' ? CONTENT_OPTIONS : CONTAINER_OPTIONS;

  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)}>
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <RadioGroupItem value={option.value} id={option.value} />
            <div className="flex-1">
              <Label
                htmlFor={option.value}
                className="font-medium flex items-center gap-2 cursor-pointer"
              >
                <option.icon className={`w-4 h-4 ${option.iconColor}`} />
                {option.label}
              </Label>
              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
