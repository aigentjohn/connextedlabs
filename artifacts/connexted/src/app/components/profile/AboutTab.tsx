import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { 
  User, 
  FileText, 
  UserCircle,
  Camera,
  Info,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface AboutTabProps {
  profile: any;
  onUpdate?: () => void;
}

export function AboutTab({ profile, onUpdate }: AboutTabProps) {
  const [name, setName] = useState(profile?.name || '');
  const [tagline, setTagline] = useState(profile?.tagline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setTagline(profile.tagline || '');
      setBio(profile.bio || '');
      setAvatar(profile.avatar || '');
    }
  }, [profile]);

  useEffect(() => {
    // Check if any field has changed
    const changed = 
      name !== (profile?.name || '') ||
      tagline !== (profile?.tagline || '') ||
      bio !== (profile?.bio || '') ||
      avatar !== (profile?.avatar || '');
    setHasChanges(changed);
  }, [name, tagline, bio, avatar, profile]);

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name,
          tagline,
          bio,
          avatar,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="w-5 h-5" />
          About Me
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your basic profile information and introduction
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Avatar Preview */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-2xl">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{name || 'Your Name'}</h3>
            {tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
          </div>
        </div>

        <Separator />

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jane Smith"
            required
          />
          <p className="text-xs text-muted-foreground">
            Your full name as it will appear throughout the platform
          </p>
        </div>

        {/* Tagline Field */}
        <div className="space-y-2">
          <Label htmlFor="tagline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Tagline
          </Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Full-Stack Developer | Startup Founder | Tech Enthusiast"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            A brief headline that describes you (max 100 characters)
          </p>
        </div>

        {/* Bio Field */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself... Share your story, interests, and what you're working on."
            rows={6}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            Share your story and interests ({bio.length}/1000 characters)
          </p>
        </div>

        {/* Avatar URL Field */}
        <div className="space-y-2">
          <Label htmlFor="avatar" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Avatar URL
          </Label>
          <Input
            id="avatar"
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://example.com/your-photo.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Link to your profile picture (supported: JPEG, PNG, GIF, WebP)
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your name and avatar are visible to other members based on your privacy settings. 
            You can control who sees your information in the <strong>Privacy</strong> tab.
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
              disabled={saving || !hasChanges || !name.trim()}
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
