import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import JoinOurCommunityPage from '@/app/components/JoinOurCommunityPage';
import InviteOnlyPage from '@/app/components/InviteOnlyPage';

type LaunchMode = 'invite_only' | 'soft_launch' | 'open_launch';

interface PlatformSettings {
  launch_mode: LaunchMode;
  public_signup_enabled: boolean;
  show_pricing_page: boolean;
  open_tiers: number[];
}

export default function JoinOurCommunityPageFlexible() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('launch_mode, public_signup_enabled, show_pricing_page, open_tiers')
        .single();

      if (error) {
        // If platform_settings doesn't exist or no data, default to invite_only
        console.log('No platform settings found, defaulting to invite-only');
        setSettings({
          launch_mode: 'invite_only',
          public_signup_enabled: false,
          show_pricing_page: false,
          open_tiers: [],
        });
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      // Default to most restrictive mode on error
      setSettings({
        launch_mode: 'invite_only',
        public_signup_enabled: false,
        show_pricing_page: false,
        open_tiers: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If invite-only mode, show invite-only page
  if (settings?.launch_mode === 'invite_only' || !settings?.public_signup_enabled) {
    return <InviteOnlyPage />;
  }

  // Otherwise show full pricing page
  // In the future, you can pass settings as props to show only certain tiers
  return <JoinOurCommunityPage />;
}
