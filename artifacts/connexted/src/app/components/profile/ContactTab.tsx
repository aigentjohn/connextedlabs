/**
 * ContactTab Component
 * 
 * Self-managing contact information editor.
 * Initializes from profile data and saves directly to Supabase.
 * 
 * Privacy switches for contact fields (email, phone, whatsapp, location)
 * are managed centrally in PrivacyTab — this tab shows read-only status
 * indicators and links to PrivacyTab for changes.
 * 
 * Contact Preferences (opt-in checkboxes) are a separate concept stored
 * in the `contact_preferences` column, not `privacy_settings`.
 * 
 * Update frequency: Tier 1 (static) - changes monthly or less.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  MessageCircle,
  UserCircle,
  Download,
  Upload,
  Info,
  Save,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateVCardFromProfile, downloadVCard } from '@/lib/vcard-parser';
import VCardImportDialog from '@/app/components/profile/VCardImportDialog';
import { importVCardData } from '@/lib/profile-import-export';

interface ContactTabProps {
  profile: any;
  onUpdate?: () => Promise<void>;
  /** Optional callback to switch to the Privacy tab */
  onNavigateToPrivacy?: () => void;
}

export function ContactTab({ profile, onUpdate, onNavigateToPrivacy }: ContactTabProps) {
  // Self-managed state initialized from profile
  const [phone, setPhone] = useState(profile.phone_number || '');
  const [location, setLocation] = useState(profile.location || '');
  const [showVCardImport, setShowVCardImport] = useState(false);

  const [allowVCardExport, setAllowVCardExport] = useState(
    profile.allow_vcard_export !== false
  );
  const [dirty, setDirty] = useState(false);

  // Read-only privacy status (managed in PrivacyTab)
  const ps = profile.privacy_settings || {};
  const emailPrivate = ps.email_private ?? false;
  const phonePrivate = ps.phone_private ?? true;
  const whatsappPrivate = ps.whatsapp_private ?? false;
  const locationPrivate = ps.location_private ?? false;

  // Sync if profile changes externally
  useEffect(() => {
    setPhone(profile.phone_number || '');
    setLocation(profile.location || '');
    setDirty(false);
  }, [profile]);

  const handleSaveContact = async () => {
    try {
      // Only save contact DATA fields — privacy_settings are managed by PrivacyTab
      const { error } = await supabase
        .from('users')
        .update({
          phone_number: phone || null,
          location: location || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      setDirty(false);
      toast.success('Contact information saved');
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error saving contact info:', error);
      toast.error('Failed to save contact information');
    }
  };

  const updateVCardPermission = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ allow_vcard_export: checked })
        .eq('id', profile.id);
      
      if (error) throw error;
      setAllowVCardExport(checked);
      toast.success('vCard sharing preferences updated');
    } catch (error) {
      console.error('Error updating vCard permission:', error);
      toast.error('Failed to update preferences');
    }
  };

  const updateContactPreference = async (channel: string, checked: boolean) => {
    try {
      const newPrefs = { ...(profile.contact_preferences || {}), [channel]: checked };
      const { error } = await supabase
        .from('users')
        .update({ contact_preferences: newPrefs })
        .eq('id', profile.id);
      
      if (error) throw error;
      toast.success('Contact preferences updated');
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error updating contact preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const handleVCardExport = () => {
    try {
      const profileData = {
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
        location: location || profile.location,
        phone: phone || profile.phone_number,
        website: profile.website,
        linkedin_url: profile.linkedin_url,
        twitter_handle: profile.twitter_handle,
        job_title: profile.job_title,
        company_name: profile.company_name,
        avatar: profile.avatar,
      };
      const vcardText = generateVCardFromProfile(profileData);
      const filename = `${profile.name.replace(/\s+/g, '-').toLowerCase()}.vcf`;
      downloadVCard(vcardText, filename);
      toast.success('vCard exported successfully!');
    } catch (error: any) {
      console.error('Error exporting vCard:', error);
      toast.error(`Failed to export vCard: ${error.message}`);
    }
  };

  const handleVCardImport = async (profileData: any) => {
    try {
      await importVCardData(profileData, profile.id, supabase);
      toast.success('vCard data imported successfully!');
      if (onUpdate) await onUpdate();
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Error importing vCard:', error);
      toast.error(`Failed to import vCard: ${error.message}`);
    }
  };

  const markDirty = () => { if (!dirty) setDirty(true); };

  /** Read-only privacy status badge for a field */
  function PrivacyBadge({ isPrivate }: { isPrivate: boolean }) {
    return (
      <Badge
        variant="outline"
        className={`text-xs gap-1 cursor-default ${
          isPrivate
            ? 'border-orange-300 text-orange-700 bg-orange-50'
            : 'border-green-300 text-green-700 bg-green-50'
        }`}
      >
        {isPrivate ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {isPrivate ? 'Private' : 'Public'}
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Contact Information
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Manage your contact details and sharing preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Privacy notice — link to PrivacyTab */}
        <Alert className="bg-indigo-50 border-indigo-200">
          <Shield className="w-4 h-4 text-indigo-600" />
          <AlertDescription className="text-sm text-indigo-800">
            Visibility for each field is managed in the{' '}
            {onNavigateToPrivacy ? (
              <button
                type="button"
                onClick={onNavigateToPrivacy}
                className="font-semibold underline underline-offset-2 hover:text-indigo-600"
              >
                Privacy tab
              </button>
            ) : (
              <strong>Privacy tab</strong>
            )}
            . Status badges below show current visibility.
          </AlertDescription>
        </Alert>

        {/* Email */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
            <PrivacyBadge isPrivate={emailPrivate} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              value={profile.email}
              disabled
              className="pl-9 bg-gray-50"
            />
          </div>
        </div>

        <Separator />

        {/* Phone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="phone" className="text-base font-semibold">Phone Number</Label>
            <PrivacyBadge isPrivate={phonePrivate} />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="phone"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); markDirty(); }}
              placeholder="+1 (555) 123-4567"
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        {/* WhatsApp */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp" className="text-base font-semibold">WhatsApp Number</Label>
            <PrivacyBadge isPrivate={whatsappPrivate} />
          </div>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            <Input
              id="whatsapp"
              value={profile.whatsapp_number || ''}
              disabled
              placeholder="Not set - Click Edit Profile to add"
              className="pl-9 bg-gray-50"
            />
          </div>
        </div>

        <Separator />

        {/* Location */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="text-base font-semibold">Location</Label>
            <PrivacyBadge isPrivate={locationPrivate} />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="location"
              value={location}
              onChange={(e) => { setLocation(e.target.value); markDirty(); }}
              placeholder="San Francisco, CA"
              className="pl-9"
            />
          </div>
        </div>

        {/* Save Button — only saves contact DATA, not privacy */}
        {dirty && (
          <>
            <Separator />
            <Button onClick={handleSaveContact} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Contact Info
            </Button>
          </>
        )}

        <Separator />

        {/* vCard Sharing Preferences */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-blue-600" />
              vCard Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="allow-vcard-export" className="text-sm font-medium">
                  Allow vCard Export
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Let other members download your contact information as a vCard
                </p>
              </div>
              <Switch
                id="allow-vcard-export"
                checked={allowVCardExport}
                onCheckedChange={updateVCardPermission}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleVCardExport} variant="outline" size="sm" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export My vCard
              </Button>
              <Button onClick={() => setShowVCardImport(true)} variant="outline" size="sm" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Import vCard
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Contact Preferences — stored in `contact_preferences` column, NOT privacy_settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Contact Preferences</h3>
            <p className="text-sm text-gray-600 mt-1">
              Let other members know how you prefer to be reached.
              This is separate from privacy — even if a channel is public,
              you can indicate you'd rather not be contacted that way.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="contact-email"
                checked={profile.contact_preferences?.email !== false}
                onChange={(e) => updateContactPreference('email', e.target.checked)}
                className="mt-1"
              />
              <div>
                <Label htmlFor="contact-email" className="text-sm font-medium cursor-pointer">
                  Email
                </Label>
                <p className="text-xs text-gray-600">I'm open to being contacted via email</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="contact-phone"
                checked={profile.contact_preferences?.phone !== false}
                onChange={(e) => updateContactPreference('phone', e.target.checked)}
                className="mt-1"
              />
              <div>
                <Label htmlFor="contact-phone" className="text-sm font-medium cursor-pointer">
                  Phone
                </Label>
                <p className="text-xs text-gray-600">I'm open to being contacted via phone</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="contact-whatsapp"
                checked={profile.contact_preferences?.whatsapp !== false}
                onChange={(e) => updateContactPreference('whatsapp', e.target.checked)}
                className="mt-1"
              />
              <div>
                <Label htmlFor="contact-whatsapp" className="text-sm font-medium cursor-pointer">
                  WhatsApp
                </Label>
                <p className="text-xs text-gray-600">I'm open to being contacted via WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Note:</strong> To edit your WhatsApp number, click "Edit Profile" at the top of the page.
            Contact preference changes save immediately. To change who can <em>see</em> your contact info, visit the{' '}
            {onNavigateToPrivacy ? (
              <button
                type="button"
                onClick={onNavigateToPrivacy}
                className="font-semibold underline underline-offset-2 hover:text-indigo-600"
              >
                Privacy tab
              </button>
            ) : (
              <strong>Privacy tab</strong>
            )}.
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* vCard Import Dialog */}
      <VCardImportDialog
        open={showVCardImport}
        onOpenChange={setShowVCardImport}
        onImport={handleVCardImport}
      />
    </Card>
  );
}
