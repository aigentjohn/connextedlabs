/**
 * MyBasicsPage - About, Contact, Social, Privacy
 *
 * First of 4 profile sub-pages. Also hosts the onboarding wizard
 * for new users (previously owned by the monolithic ProfilePage).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ProfileOnboardingWizard } from '@/app/components/profile/ProfileOnboardingWizard';
import { ProfilePageShell } from '@/app/components/profile/ProfilePageShell';
import { ProfileSectionIO } from '@/app/components/profile/ProfileSectionIO';
import { toast } from 'sonner';

// Tab components
import { AboutTab } from '@/app/components/profile/AboutTab';
import { ContactTab } from '@/app/components/profile/ContactTab';
import { SocialTab } from '@/app/components/profile/SocialTab';
import { PrivacyTab } from '@/app/components/profile/PrivacyTab';

export default function MyBasicsPage() {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('about');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-show onboarding wizard for new users
  useEffect(() => {
    if (
      profile &&
      !profile.onboarding_completed &&
      !profile.bio &&
      !profile.professional_roles?.length
    ) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <ProfilePageShell sectionLabel="My Basics">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 gap-1 h-auto w-full">
          <TabsTrigger value="about" className="text-xs md:text-sm">About</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs md:text-sm">Contact</TabsTrigger>
          <TabsTrigger value="social" className="text-xs md:text-sm">Social</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs md:text-sm">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-6">
          <AboutTab profile={profile} onUpdate={refreshProfile} />
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <ContactTab
            profile={profile}
            onUpdate={refreshProfile}
            onNavigateToPrivacy={() => setActiveTab('privacy')}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialTab profile={profile} onUpdate={refreshProfile} />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <PrivacyTab profile={profile} onUpdate={refreshProfile} />
        </TabsContent>
      </Tabs>

      <ProfileSectionIO section="basics" onUpdate={refreshProfile} />

      {/* Profile Onboarding Wizard */}
      <ProfileOnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        profile={profile}
        onComplete={async () => {
          await refreshProfile();
          toast.success('Welcome to CONNEXTED!');
        }}
      />
    </ProfilePageShell>
  );
}