/**
 * MyProfessionalPage - Professional, Skills, Data
 *
 * Second of 4 profile sub-pages covering professional identity.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';

// Tab components
import { ProfessionalTab } from '@/app/components/profile/ProfessionalTab';
import { SkillsTab } from '@/app/components/profile/SkillsTab';
import { ProfileDataTab } from '@/app/components/profile/ProfileDataTab';

export default function MyProfessionalPage() {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('professional');

  if (!profile) return null;

  return (
    <ProfilePageShell sectionLabel="My Professional">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 gap-1 h-auto w-full">
          <TabsTrigger value="professional" className="text-xs md:text-sm">Professional</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs md:text-sm">Skills</TabsTrigger>
          <TabsTrigger value="data" className="text-xs md:text-sm">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="professional" className="mt-6">
          <ProfessionalTab profile={profile} onUpdate={refreshProfile} />
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <SkillsTab profile={profile} />
        </TabsContent>

        <TabsContent value="data" className="space-y-6 mt-6">
          <ProfileDataTab
            profile={profile}
            onRefreshProfile={refreshProfile}
            onShowWizard={() => {
              // Navigate to basics page for onboarding
              window.location.href = '/my-basics';
            }}
          />
        </TabsContent>
      </Tabs>
    </ProfilePageShell>
  );
}
