/**
 * MyAccountPage - Membership, My Payments
 *
 * Fourth of 4 profile sub-pages covering account & billing.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';

// Tab components
import { MembershipManagement } from '@/app/components/profile/MembershipManagement';
import { MyPaymentsTab } from '@/app/components/profile/MyPaymentsTab';

export default function MyAccountPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('membership');

  if (!profile) return null;

  return (
    <ProfilePageShell sectionLabel="My Account">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 gap-1 h-auto w-full">
          <TabsTrigger value="membership" className="text-xs md:text-sm">Membership</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs md:text-sm">My Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="mt-6">
          <MembershipManagement userId={profile.id} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <MyPaymentsTab profile={profile} />
        </TabsContent>
      </Tabs>
    </ProfilePageShell>
  );
}
