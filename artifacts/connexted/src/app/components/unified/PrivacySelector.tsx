import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Globe, Users, Link, Lock } from 'lucide-react';

export type Visibility = 'public' | 'member' | 'unlisted' | 'private';

interface PrivacySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  contentType?: string;
}

export function PrivacySelector({ value, onChange, contentType = 'item' }: PrivacySelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)}>
      <div className="space-y-3">
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="public" id="public" />
          <div className="flex-1">
            <Label htmlFor="public" className="font-medium flex items-center gap-2 cursor-pointer">
              <Globe className="w-4 h-4 text-green-600" />
              Public
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Anyone can discover and view this {contentType}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="member" id="member" />
          <div className="flex-1">
            <Label htmlFor="member" className="font-medium flex items-center gap-2 cursor-pointer">
              <Users className="w-4 h-4 text-blue-600" />
              Members Only
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Only logged-in Connexted members can view
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="unlisted" id="unlisted" />
          <div className="flex-1">
            <Label htmlFor="unlisted" className="font-medium flex items-center gap-2 cursor-pointer">
              <Link className="w-4 h-4 text-purple-600" />
              Unlisted
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Anyone with the link can view (not listed publicly)
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="private" id="private" />
          <div className="flex-1">
            <Label htmlFor="private" className="font-medium flex items-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4 text-red-600" />
              Private
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Only you and people you invite can view
            </p>
          </div>
        </div>
      </div>
    </RadioGroup>
  );
}
