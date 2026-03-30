import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Sparkles } from 'lucide-react';

export default function UnclaimedProfileBanner() {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkClaimStatus();
  }, []);

  const checkClaimStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if user has a claimable profile
      const { data: profile } = await supabase
        .from('claimable_profiles')
        .select('claim_status, user_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (profile && profile.claim_status === 'unclaimed') {
        setShowBanner(true);
      }
    } catch (err) {
      console.error('Error checking claim status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimProfile = () => {
    // Redirect to a claim confirmation page or show modal
    navigate('/claim-profile-confirm');
  };

  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <Alert className="border-indigo-300 bg-indigo-50 mb-4 sticky top-0 z-40">
      <AlertCircle className="w-4 h-4 text-indigo-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <strong className="text-indigo-900">You're viewing with limited access.</strong>
          <span className="text-indigo-700 ml-2">
            Claim your profile to unlock posting, commenting, and full community features.
          </span>
        </div>
        <Button 
          onClick={handleClaimProfile}
          size="sm"
          className="ml-4 bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Claim Profile
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to check if current user can perform write actions
 * Returns: { canWrite: boolean, isClaimable: boolean, isLoading: boolean }
 */
export function useClaimableProfilePermissions() {
  const [permissions, setPermissions] = useState({
    canWrite: true,
    isClaimable: false,
    isLoading: true,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions({ canWrite: false, isClaimable: false, isLoading: false });
        return;
      }

      // Check if user has a claimable profile
      const { data: profile } = await supabase
        .from('claimable_profiles')
        .select('claim_status, user_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (profile) {
        setPermissions({
          canWrite: profile.claim_status === 'claimed',
          isClaimable: profile.claim_status === 'unclaimed',
          isLoading: false,
        });
      } else {
        // No claimable profile - regular user
        setPermissions({ canWrite: true, isClaimable: false, isLoading: false });
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      // Default to allowing access if check fails
      setPermissions({ canWrite: true, isClaimable: false, isLoading: false });
    }
  };

  return permissions;
}
