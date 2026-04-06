/**
 * MyAccountPage - Membership
 */

import { useAuth } from '@/lib/auth-context';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';
import { MembershipManagement } from '@/app/components/profile/MembershipManagement';

export default function MyAccountPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <ProfilePageShell sectionLabel="My Account">
      <MembershipManagement userId={profile.id} />
    </ProfilePageShell>
  );
}
