/**
 * ProfileDataTab Component
 * 
 * Profile data operations: Setup Wizard launcher, JSON Resume import/export, vCard import/export.
 * 
 * Update frequency: Tier 4 (utility) - used occasionally for bulk data operations.
 * 
 * The onboarding wizard itself is rendered at the ProfilePage level (page-level modal).
 * This component just provides the "Start Wizard" button via onShowWizard callback.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import VCardImportDialog from '@/app/components/profile/VCardImportDialog';
import {
  Sparkles,
  Download,
  Upload,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportProfileAsJSONResume, importProfileFromJSON, importVCardData } from '@/lib/profile-import-export';
import { generateVCardFromProfile, downloadVCard } from '@/lib/vcard-parser';

interface ProfileDataTabProps {
  profile: any;
  onRefreshProfile: () => Promise<void>;
  onShowWizard: () => void;
}

export function ProfileDataTab({ profile, onRefreshProfile, onShowWizard }: ProfileDataTabProps) {
  const [showVCardImport, setShowVCardImport] = useState(false);

  const handleExportProfile = async () => {
    if (!profile) return;

    try {
      await exportProfileAsJSONResume({
        profile,
        phone: profile.phone_number || '',
        location: profile.location || '',
        website: profile.website || '',
        bio: profile.bio || '',
        linkedinUrl: profile.linkedin_url || '',
        twitterHandle: profile.twitter_handle || '',
        supabase,
      });
      toast.success('JSON Resume exported! Use AI to populate it from your LinkedIn PDF.');
    } catch (error) {
      console.error('Error exporting profile:', error);
      toast.error('Failed to export profile data');
    }
  };

  const handleImportProfile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file || !profile) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.basics || data.$schema?.includes('jsonresume')) {
          toast.info('Importing JSON Resume...');
        }

        const result = await importProfileFromJSON(data, profile.id, supabase);

        toast.success(result.message);

        await onRefreshProfile();

        if (result.isJSONResume) {
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setTimeout(() => {
            toast.info('Visit "Edit Profile" to see all imported fields and make adjustments.');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error importing profile:', error);
        toast.error(`Failed to import profile: ${error.message || 'Invalid JSON file'}`);
      }
    };

    input.click();
  };

  const handleVCardExport = () => {
    if (!profile) return;

    try {
      const profileData = {
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
        location: profile.location,
        phone: profile.phone_number,
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
    if (!profile) return;

    try {
      await importVCardData(profileData, profile.id, supabase);
      toast.success('vCard data imported successfully!');
      await onRefreshProfile();
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Error importing vCard:', error);
      toast.error(`Failed to import vCard: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Setup Wizard Card */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Profile Setup Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Need help setting up your profile? Run through our guided 3-step wizard to complete your profile quickly.
          </p>
          <Button
            onClick={onShowWizard}
            variant="outline"
            className="border-indigo-300 hover:bg-indigo-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Profile Wizard
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="json-resume" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="json-resume">JSON Resume</TabsTrigger>
          <TabsTrigger value="vcard">vCard</TabsTrigger>
        </TabsList>

        <TabsContent value="json-resume" className="mt-4">
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-600" />
                AI-Powered Profile Setup
              </CardTitle>
              <p className="text-sm text-amber-700">
                Use AI to quickly populate your profile from your resume or LinkedIn!
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-2">How it works:</p>
                <ol className="space-y-1 list-decimal list-inside text-sm">
                  <li>Download your LinkedIn profile as PDF</li>
                  <li>Upload to ChatGPT/Claude and ask to convert to JSON Resume format</li>
                  <li>Save the response as a .json file</li>
                  <li>Import it here to auto-fill your profile!</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportProfile} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button onClick={handleImportProfile} variant="outline" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vcard" className="mt-4">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-blue-600" />
                Contact Card (vCard)
              </CardTitle>
              <p className="text-sm text-blue-700">
                Import or export contact information as a vCard (.vcf file)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                vCards work with all contact apps, email clients, and CRM systems.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleVCardExport} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export vCard
                </Button>
                <Button onClick={() => setShowVCardImport(true)} variant="outline" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Import vCard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* vCard Import Dialog */}
      <VCardImportDialog
        open={showVCardImport}
        onOpenChange={setShowVCardImport}
        onImport={handleVCardImport}
      />
    </div>
  );
}
