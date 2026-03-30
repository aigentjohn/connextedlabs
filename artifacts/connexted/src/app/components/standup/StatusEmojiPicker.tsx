import { Label } from '@/app/components/ui/label';

interface StatusEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

const STATUS_EMOJIS = [
  { emoji: '🟢', label: 'On track', description: 'Everything going well' },
  { emoji: '🟡', label: 'Blocked', description: 'Need help or waiting' },
  { emoji: '🔴', label: 'Urgent', description: 'Critical issue' },
  { emoji: '✅', label: 'Done', description: 'Task completed' },
  { emoji: '⚠️', label: 'At risk', description: 'Potential issues' },
  { emoji: '🚧', label: 'In progress', description: 'Actively working' },
  { emoji: '💪', label: 'Strong', description: 'Making great progress' },
  { emoji: '🎯', label: 'Focused', description: 'Clear direction' },
];

export default function StatusEmojiPicker({ value, onChange }: StatusEmojiPickerProps) {
  return (
    <div className="space-y-2">
      <Label>
        Status Emoji <span className="text-sm text-gray-500 font-normal">(optional)</span>
      </Label>
      <div className="grid grid-cols-4 gap-2">
        {STATUS_EMOJIS.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => onChange(value === item.emoji ? '' : item.emoji)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
              hover:border-indigo-300 hover:bg-indigo-50
              ${value === item.emoji 
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                : 'border-gray-200 bg-white'
              }
            `}
            title={item.description}
          >
            <span className="text-2xl mb-1">{item.emoji}</span>
            <span className="text-xs text-gray-600">{item.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Choose a status emoji for quick visual scanning during meetings
      </p>
    </div>
  );
}
