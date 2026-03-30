import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Target,
  Users,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Handshake,
  Plus,
  X,
  Save,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface LookingForTabProps {
  profile: any;
  onUpdate?: () => void;
}

const LOOKING_FOR_OPTIONS = [
  { value: 'peer-support', label: 'Peer Support & Community', icon: Users, color: 'text-blue-600' },
  { value: 'mentorship', label: 'Mentorship & Guidance', icon: GraduationCap, color: 'text-purple-600' },
  { value: 'skill-building', label: 'Skill Building & Learning', icon: Lightbulb, color: 'text-green-600' },
  { value: 'accountability', label: 'Accountability & Motivation', icon: Target, color: 'text-orange-600' },
  { value: 'visibility', label: 'Clients & Visibility', icon: Briefcase, color: 'text-cyan-600' },
  { value: 'collaboration', label: 'Co-Creation & Collaboration', icon: Handshake, color: 'text-indigo-600' },
];

export function LookingForTab({ profile, onUpdate }: LookingForTabProps) {
  const [lookingFor, setLookingFor] = useState<string[]>(profile?.looking_for || []);
  const [lookingForDetails, setLookingForDetails] = useState(profile?.looking_for_details || '');
  const [customItem, setCustomItem] = useState('');
  const [showOnProfile, setShowOnProfile] = useState(
    profile?.privacy_settings?.show_looking_for !== false
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setLookingFor(profile.looking_for || []);
      setLookingForDetails(profile.looking_for_details || '');
      setShowOnProfile(profile?.privacy_settings?.show_looking_for !== false);
    }
  }, [profile]);

  useEffect(() => {
    const lookingForChanged = JSON.stringify(lookingFor) !== JSON.stringify(profile?.looking_for || []);
    const detailsChanged = lookingForDetails !== (profile?.looking_for_details || '');
    const visibilityChanged = showOnProfile !== (profile?.privacy_settings?.show_looking_for !== false);
    setHasChanges(lookingForChanged || detailsChanged || visibilityChanged);
  }, [lookingFor, lookingForDetails, showOnProfile, profile]);

  const toggleLookingFor = (value: string) => {
    if (lookingFor.includes(value)) {
      setLookingFor(lookingFor.filter(item => item !== value));
    } else {
      setLookingFor([...lookingFor, value]);
    }
  };

  const addCustomItem = () => {
    if (customItem.trim() && !lookingFor.includes(customItem.trim())) {
      setLookingFor([...lookingFor, customItem.trim()]);
      setCustomItem('');
    }
  };

  const removeItem = (item: string) => {
    setLookingFor(lookingFor.filter(i => i !== item));
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          looking_for: lookingFor,
          looking_for_details: lookingForDetails.trim() || null,
          privacy_settings: {
            ...(profile.privacy_settings || {}),
            show_looking_for: showOnProfile,
          },
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Looking for preferences updated!');
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating looking for:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const getOptionIcon = (value: string) => {
    const option = LOOKING_FOR_OPTIONS.find(opt => opt.value === value);
    if (option) {
      const Icon = option.icon;
      return <Icon className={`w-4 h-4 ${option.color}`} />;
    }
    return <Target className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          What I'm Looking For
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help others understand how they can connect with or support you
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Toggle */}
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-looking-for" className="text-base font-semibold">
                Show on Profile
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Display what you're looking for to help members connect with you
              </p>
            </div>
            <Switch
              id="show-looking-for"
              checked={showOnProfile}
              onCheckedChange={setShowOnProfile}
            />
          </div>
        </div>

        <Separator />

        {/* Quick Select Options */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Select all that apply
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {LOOKING_FOR_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = lookingFor.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  onClick={() => toggleLookingFor(option.value)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-white' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${option.color}`} />
                  </div>
                  <span className={`font-medium text-sm ${
                    isSelected ? 'text-indigo-900' : 'text-gray-700'
                  }`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Items */}
        {lookingFor.length > 0 && (
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Your selections
            </Label>
            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
              {lookingFor.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="px-3 py-2 text-sm bg-white border border-gray-200 hover:border-gray-300"
                >
                  <span className="mr-2">{getOptionIcon(item)}</span>
                  {LOOKING_FOR_OPTIONS.find(opt => opt.value === item)?.label || item}
                  <button
                    onClick={() => removeItem(item)}
                    className="ml-2 text-gray-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Custom Item */}
        <div>
          <Label className="text-base font-semibold mb-2 block">
            Add custom item
          </Label>
          <div className="flex gap-2">
            <Input
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomItem()}
              placeholder="e.g., Beta Testers, Advisory Board Members..."
              className="flex-1"
            />
            <Button onClick={addCustomItem} variant="outline" disabled={!customItem.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div>
          <Label htmlFor="looking-for-details" className="text-base font-semibold mb-2 block">
            Additional details (optional)
          </Label>
          <Textarea
            id="looking-for-details"
            value={lookingForDetails}
            onChange={(e) => setLookingForDetails(e.target.value)}
            placeholder="Add more context about what you're looking for, your ideal connections, specific requirements, or how people can reach out..."
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {lookingForDetails.length}/500 characters
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro tip:</strong> Being specific helps others understand how they can support you. 
            For example: "Looking for a technical co-founder with ML experience" or "Seeking mentorship in SaaS go-to-market strategy."
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          {hasChanges && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes
            </p>
          )}
          <div className="ml-auto">
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <>Saving...</>
              ) : hasChanges ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  All Saved
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}