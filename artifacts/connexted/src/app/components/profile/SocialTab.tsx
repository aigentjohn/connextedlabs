import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { 
  Link2, 
  Globe, 
  Linkedin, 
  Twitter,
  Facebook,
  Instagram,
  Github,
  Calendar,
  Info,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface SocialTabProps {
  profile: any;
  onUpdate?: () => void;
}

export function SocialTab({ profile, onUpdate }: SocialTabProps) {
  const [socialLinks, setSocialLinks] = useState(profile?.social_links || {
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    github: '',
    website: '',
    calendly: '',
  });
  
  const [privacySettings, setPrivacySettings] = useState(profile?.privacy_settings || {
    share_social_links: false,
    show_linkedin: false,
    show_twitter: false,
    show_facebook: false,
    show_instagram: false,
    show_github: false,
    show_website: false,
    show_calendly: false,
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setSocialLinks(profile.social_links || {
        linkedin: '',
        twitter: '',
        facebook: '',
        instagram: '',
        github: '',
        website: '',
        calendly: '',
      });
      setPrivacySettings(profile.privacy_settings || {
        share_social_links: false,
        show_linkedin: false,
        show_twitter: false,
        show_facebook: false,
        show_instagram: false,
        show_github: false,
        show_website: false,
        show_calendly: false,
      });
    }
  }, [profile]);

  useEffect(() => {
    // Check if any field has changed
    const linksChanged = JSON.stringify(socialLinks) !== JSON.stringify(profile?.social_links || {});
    const privacyChanged = JSON.stringify(privacySettings) !== JSON.stringify(profile?.privacy_settings || {});
    setHasChanges(linksChanged || privacyChanged);
  }, [socialLinks, privacySettings, profile]);

  const updateSocialLink = (platform: string, value: string) => {
    setSocialLinks({ ...socialLinks, [platform]: value });
  };

  const updatePrivacySetting = (key: string, value: boolean) => {
    setPrivacySettings({ ...privacySettings, [key]: value });
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          social_links: socialLinks,
          // Spread-then-overlay: preserve contact/profile privacy keys,
          // only write the 8 social-specific keys this tab manages.
          privacy_settings: {
            ...(profile.privacy_settings || {}),
            share_social_links: privacySettings.share_social_links,
            show_linkedin: privacySettings.show_linkedin,
            show_twitter: privacySettings.show_twitter,
            show_facebook: privacySettings.show_facebook,
            show_instagram: privacySettings.show_instagram,
            show_github: privacySettings.show_github,
            show_website: privacySettings.show_website,
            show_calendly: privacySettings.show_calendly,
          },
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Social media settings updated!');
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating social links:', error);
      toast.error('Failed to update social media settings');
    } finally {
      setSaving(false);
    }
  };

  const globallyHidden = !privacySettings.share_social_links;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Social Media & Links
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage your social profiles and sharing preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Social Privacy */}
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="share-social-links" className="text-base font-semibold">
                Share Social Links
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enable to allow members to see your social media profiles
              </p>
            </div>
            <Switch
              id="share-social-links"
              checked={privacySettings.share_social_links}
              onCheckedChange={(checked) => updatePrivacySetting('share_social_links', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Website */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="website" className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-website"
                checked={privacySettings.show_website}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_website', checked)}
              />
            </div>
          </div>
          <Input
            id="website"
            value={socialLinks.website || ''}
            onChange={(e) => updateSocialLink('website', e.target.value)}
            placeholder="https://yourwebsite.com"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_website 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* LinkedIn */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="linkedin" className="text-base font-semibold flex items-center gap-2">
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-linkedin"
                checked={privacySettings.show_linkedin}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_linkedin', checked)}
              />
            </div>
          </div>
          <Input
            id="linkedin"
            value={socialLinks.linkedin || ''}
            onChange={(e) => updateSocialLink('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_linkedin 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* Twitter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="twitter" className="text-base font-semibold flex items-center gap-2">
              <Twitter className="w-4 h-4" />
              X (Twitter)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-twitter"
                checked={privacySettings.show_twitter}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_twitter', checked)}
              />
            </div>
          </div>
          <Input
            id="twitter"
            value={socialLinks.twitter || ''}
            onChange={(e) => updateSocialLink('twitter', e.target.value)}
            placeholder="https://twitter.com/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_twitter 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* Facebook */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="facebook" className="text-base font-semibold flex items-center gap-2">
              <Facebook className="w-4 h-4" />
              Facebook
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-facebook"
                checked={privacySettings.show_facebook}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_facebook', checked)}
              />
            </div>
          </div>
          <Input
            id="facebook"
            value={socialLinks.facebook || ''}
            onChange={(e) => updateSocialLink('facebook', e.target.value)}
            placeholder="https://facebook.com/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_facebook 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* Instagram */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="instagram" className="text-base font-semibold flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-instagram"
                checked={privacySettings.show_instagram}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_instagram', checked)}
              />
            </div>
          </div>
          <Input
            id="instagram"
            value={socialLinks.instagram || ''}
            onChange={(e) => updateSocialLink('instagram', e.target.value)}
            placeholder="https://instagram.com/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_instagram 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* GitHub */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="github" className="text-base font-semibold flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-github"
                checked={privacySettings.show_github}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_github', checked)}
              />
            </div>
          </div>
          <Input
            id="github"
            value={socialLinks.github || ''}
            onChange={(e) => updateSocialLink('github', e.target.value)}
            placeholder="https://github.com/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_github 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Separator />

        {/* Calendly */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="calendly" className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendly
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visible</span>
              <Switch
                id="show-calendly"
                checked={privacySettings.show_calendly}
                disabled={globallyHidden}
                onCheckedChange={(checked) => updatePrivacySetting('show_calendly', checked)}
              />
            </div>
          </div>
          <Input
            id="calendly"
            value={socialLinks.calendly || ''}
            onChange={(e) => updateSocialLink('calendly', e.target.value)}
            placeholder="https://calendly.com/username"
          />
          <p className="text-xs text-muted-foreground">
            {globallyHidden 
              ? '🔒 Hidden (social links sharing disabled)' 
              : privacySettings.show_calendly 
                ? '🌐 Visible to members' 
                : '🔒 Only visible to you'}
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Social links are stored securely. You can control visibility for each platform individually.
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