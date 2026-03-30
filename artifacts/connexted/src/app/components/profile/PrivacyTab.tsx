/**
 * PrivacyTab Component
 * 
 * Manages contact privacy and profile visibility settings.
 * Social link visibility is owned entirely by the Social tab.
 * 
 * Manages the `privacy_settings` JSONB column on the `users` table.
 * Uses spread-then-overlay saves so it never clobbers keys set elsewhere
 * (e.g. share_social_links, show_linkedin set by SocialTab).
 * 
 * Update frequency: Tier 1 (static) - changes monthly or less.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { 
  Shield,
  Eye,
  Lock,
  Info,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface PrivacyTabProps {
  profile: any;
  onUpdate?: () => Promise<void>;
}

export function PrivacyTab({ profile, onUpdate }: PrivacyTabProps) {
  // Self-managed state from profile.privacy_settings
  const ps = profile.privacy_settings || {};

  // Contact privacy
  const [emailPrivate, setEmailPrivate] = useState(ps.email_private ?? false);
  const [phonePrivate, setPhonePrivate] = useState(ps.phone_private ?? true);
  const [whatsappPrivate, setWhatsappPrivate] = useState(ps.whatsapp_private ?? false);
  const [locationPrivate, setLocationPrivate] = useState(ps.location_private ?? false);

  // Profile visibility
  const [profilePublic, setProfilePublic] = useState(ps.profile_public !== false);
  const [showConnections, setShowConnections] = useState(ps.show_connections !== false);

  const [dirty, setDirty] = useState(false);

  // Sync if profile changes externally
  useEffect(() => {
    const ps = profile.privacy_settings || {};
    setEmailPrivate(ps.email_private ?? false);
    setPhonePrivate(ps.phone_private ?? true);
    setWhatsappPrivate(ps.whatsapp_private ?? false);
    setLocationPrivate(ps.location_private ?? false);
    setProfilePublic(ps.profile_public !== false);
    setShowConnections(ps.show_connections !== false);
    setDirty(false);
  }, [profile]);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          privacy_settings: {
            // Spread first so we never clobber social keys
            // set by SocialTab (share_social_links, show_linkedin, etc.)
            ...(profile.privacy_settings || {}),
            // Contact privacy
            email_private: emailPrivate,
            phone_private: phonePrivate,
            whatsapp_private: whatsappPrivate,
            location_private: locationPrivate,
            // Profile visibility
            profile_public: profilePublic,
            show_connections: showConnections,
          },
        })
        .eq('id', profile.id);

      if (error) throw error;
      setDirty(false);
      toast.success('Privacy settings saved');
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    }
  };

  const markDirty = () => { if (!dirty) setDirty(true); };

  const privacyCategories = [
    {
      category: 'Contact Information',
      description: 'Control who can see your contact details on your profile',
      icon: Lock,
      settings: [
        {
          id: 'email-privacy',
          label: 'Email Address',
          // checked = visible (matches SocialTab convention: switch right = visible)
          checked: !emailPrivate,
          onChange: (v: boolean) => { setEmailPrivate(!v); markDirty(); },
        },
        {
          id: 'phone-privacy',
          label: 'Phone Number',
          checked: !phonePrivate,
          onChange: (v: boolean) => { setPhonePrivate(!v); markDirty(); },
        },
        {
          id: 'whatsapp-privacy',
          label: 'WhatsApp Number',
          checked: !whatsappPrivate,
          onChange: (v: boolean) => { setWhatsappPrivate(!v); markDirty(); },
        },
        {
          id: 'location-privacy',
          label: 'Location',
          checked: !locationPrivate,
          onChange: (v: boolean) => { setLocationPrivate(!v); markDirty(); },
        },
      ],
    },
    {
      category: 'Profile Visibility',
      description: 'Control your overall profile and connections visibility',
      icon: Eye,
      settings: [
        {
          id: 'profile-public',
          label: 'Public Profile',
          // already correct: checked = visible
          checked: profilePublic,
          onChange: (v: boolean) => { setProfilePublic(v); markDirty(); },
        },
        {
          id: 'show-connections',
          label: 'Show Connections',
          checked: showConnections,
          onChange: (v: boolean) => { setShowConnections(v); markDirty(); },
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Privacy levels:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li><strong>Public:</strong> Visible to all members</li>
            <li><strong>Private:</strong> Only visible to you and admins</li>
          </ul>
          Social link visibility is managed in the <strong>Social</strong> tab.
        </AlertDescription>
      </Alert>

      {privacyCategories.map((category, categoryIndex) => (
        <Card key={categoryIndex}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <category.icon className="w-5 h-5" />
              {category.category}
            </CardTitle>
            {category.description && (
              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {category.settings.map((setting, settingIndex) => (
              <div key={setting.id}>
                {settingIndex > 0 && <Separator className="my-4" />}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={setting.id} className="text-base font-medium cursor-pointer">
                      {setting.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {setting.checked
                        ? 'Visible to members'
                        : 'Only visible to you'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Visible</span>
                    <Switch
                      id={setting.id}
                      checked={setting.checked}
                      onCheckedChange={setting.onChange}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Save Button */}
      {dirty && (
        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Privacy Settings
        </Button>
      )}

      {/* Privacy Summary */}
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <SummaryRow label="Email" isVisible={!emailPrivate} />
            <SummaryRow label="Phone" isVisible={!phonePrivate} />
            <SummaryRow label="WhatsApp" isVisible={!whatsappPrivate} />
            <SummaryRow label="Location" isVisible={!locationPrivate} />
            <Separator className="my-3" />
            <SummaryRow label="Profile" isVisible={profilePublic} />
            <SummaryRow label="Connections" isVisible={showConnections} />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          <strong>Note:</strong> Changes are saved when you click "Save Privacy Settings".
          Admins always have access to your information for support and moderation purposes.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** Small helper for the summary card */
function SummaryRow({
  label,
  isVisible,
}: {
  label: string;
  isVisible: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <span className={isVisible ? 'text-green-600' : 'text-orange-600'}>
        {isVisible ? 'Visible to members' : 'Only visible to you'}
      </span>
    </div>
  );
}