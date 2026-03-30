/**
 * MyEngagementPage - My Status, Interests, Looking For
 *
 * Third of 4 profile sub-pages covering engagement & discovery.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';

// Tab components
import { MemberStatusDashboard } from '@/app/components/profile/MemberStatusDashboard';
import { InterestsTab } from '@/app/components/profile/InterestsTab';
import { LookingForTab } from '@/app/components/profile/LookingForTab';

export default function MyEngagementPage() {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('status');

  if (!profile) return null;

  return (
    <ProfilePageShell sectionLabel="My Engagement">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 gap-1 h-auto w-full">
          <TabsTrigger value="status" className="text-xs md:text-sm">My Status</TabsTrigger>
          <TabsTrigger value="interests" className="text-xs md:text-sm">Interests</TabsTrigger>
          <TabsTrigger value="looking-for" className="text-xs md:text-sm">Looking For</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <MemberStatusDashboard userId={profile.id} />
        </TabsContent>

        <TabsContent value="interests" className="mt-6">
          <InterestsTab profile={profile} />
        </TabsContent>

        <TabsContent value="looking-for" className="mt-6">
          <LookingForTab profile={profile} onUpdate={refreshProfile} />
        </TabsContent>
      </Tabs>
    </ProfilePageShell>
  );
}
