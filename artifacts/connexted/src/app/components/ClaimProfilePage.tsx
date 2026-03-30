// Split candidate: ~479 lines — consider extracting ClaimVerificationStep, ClaimProfileForm, and ClaimSuccessScreen into sub-components.
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId } from '@/utils/supabase/info';
import { 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Shield,
  MessageSquare,
  Heart,
  Calendar,
  X,
  Loader2
} from 'lucide-react';

export default function ClaimProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [circles, setCircles] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyMagicLink(token);
    } else {
      setVerificationError('No invitation token provided');
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyMagicLink = async (token: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/claimable-profiles/verify-magic-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setVerificationError(data.error || 'Invalid or expired invitation link');
        setIsVerifying(false);
        return;
      }

      // Sign in the user with the session URL
      if (data.sessionUrl) {
        // Extract hash from action link
        const url = new URL(data.sessionUrl);
        const hash = url.hash;
        
        // Confirm session
        const { error: sessionError } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          token_hash: hash.substring(1), // Remove # from hash
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          // Continue anyway, we'll handle this gracefully
        }
      }

      // Fetch circle details
      const circleIds = await fetchCircleDetails(data.userId);

      setProfileData(data);
      setCircles(circleIds);
      setIsVerifying(false);
    } catch (err: any) {
      console.error('Error verifying magic link:', err);
      setVerificationError('Failed to verify invitation link');
      setIsVerifying(false);
    }
  };

  const fetchCircleDetails = async (userId: string) => {
    try {
      // Get user's circles
      const { data: circleMemberships } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', userId);

      if (!circleMemberships || circleMemberships.length === 0) {
        return [];
      }

      const circleIds = circleMemberships.map(cm => cm.circle_id);

      const { data: circlesData } = await supabase
        .from('circles')
        .select('id, name, description, image')
        .in('id', circleIds);

      return circlesData || [];
    } catch (err) {
      console.error('Error fetching circles:', err);
      return [];
    }
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please request a new magic link.');
        setIsClaiming(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/claimable-profiles/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to claim profile');
        setIsClaiming(false);
        return;
      }

      toast.success('Welcome to CONNEXTED LABS! 🎉', {
        description: 'Your profile has been claimed successfully.',
      });

      // Redirect to home after a brief delay
      setTimeout(() => {
        navigate('/home');
        window.location.reload(); // Refresh to update auth state
      }, 1500);
    } catch (err: any) {
      console.error('Error claiming profile:', err);
      toast.error('Failed to claim profile');
      setIsClaiming(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to decline this invitation? This action cannot be undone.')) {
      return;
    }

    setIsRejecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired');
        setIsRejecting(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/claimable-profiles/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to decline invitation');
        setIsRejecting(false);
        return;
      }

      toast.success('Invitation declined');

      // Redirect to marketing page
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      console.error('Error rejecting profile:', err);
      toast.error('Failed to decline invitation');
      setIsRejecting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Your Invitation</h3>
            <p className="text-gray-600">Please wait while we set up your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (verificationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h3>
            <p className="text-gray-700 mb-6">{verificationError}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show claim flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to CONNEXTED LABS!
          </h1>
          <p className="text-lg text-gray-600">
            Hi {profileData?.name?.split(' ')[0] || 'there'}, you've been invited to join our community
          </p>
        </div>

        {/* Profile Status Banner */}
        {profileData?.claimStatus === 'unclaimed' && (
          <Alert className="mb-6 border-indigo-200 bg-indigo-50/50">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            <AlertDescription className="text-sm text-gray-700">
              <strong>You're viewing this invitation.</strong> Browse and explore what you have access to, 
              then claim your profile when you're ready to unlock full access.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Your Access Card */}
          <Card className="border-indigo-200">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Your Access
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Membership Tier */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Membership Tier:</p>
                <Badge className="text-base capitalize bg-indigo-600">
                  {profileData?.claimStatus === 'unclaimed' ? 'Member' : 'Claimed'}
                </Badge>
              </div>

              {/* Circles */}
              {circles.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Your Circles:</p>
                  <div className="space-y-2">
                    {circles.map((circle) => (
                      <div key={circle.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                        {circle.image && (
                          <img 
                            src={circle.image} 
                            alt={circle.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{circle.name}</p>
                          {circle.description && (
                            <p className="text-xs text-gray-600 mt-1">{circle.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What You Can Do Card */}
          <Card className="border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                What You Can Do
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {profileData?.claimStatus === 'unclaimed' ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Browse & View Content</p>
                      <p className="text-sm text-gray-600">Explore circles and see what members are sharing</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Post & Comment</p>
                      <p className="text-sm text-gray-600">Unlock by claiming your profile</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Heart className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">React & Interact</p>
                      <p className="text-sm text-gray-600">Unlock by claiming your profile</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Connect with Members</p>
                      <p className="text-sm text-gray-600">Unlock by claiming your profile</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Join Events</p>
                      <p className="text-sm text-gray-600">Unlock by claiming your profile</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-700">Post, comment, and share content</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-700">Connect with other members</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-700">Join events and workshops</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-700">Full access to all circles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {profileData?.claimStatus === 'unclaimed' && (
          <Card className="border-2 border-indigo-300">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Join?</h3>
                <p className="text-gray-600">
                  Claim your profile to unlock full access and start connecting with the community
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8"
                  onClick={handleClaim}
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Claim My Profile
                    </>
                  )}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 border-gray-300"
                  onClick={handleReject}
                  disabled={isRejecting}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      No Thanks
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                By claiming your profile, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        )}

        {/* Already Claimed */}
        {profileData?.claimStatus === 'claimed' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Profile Already Claimed</h3>
              <p className="text-gray-700 mb-6">You're all set! Head to your dashboard to get started.</p>
              <Button onClick={() => navigate('/home')} className="bg-green-600 hover:bg-green-700">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}