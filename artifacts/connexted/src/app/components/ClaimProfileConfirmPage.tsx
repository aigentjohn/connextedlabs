import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId } from '@/utils/supabase/info';
import { CheckCircle, Sparkles, Loader2 } from 'lucide-react';

export default function ClaimProfileConfirmPage() {
  const navigate = useNavigate();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
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

      toast.success('Profile claimed successfully! 🎉', {
        description: 'You now have full access to all features.',
      });

      // Redirect to home and refresh
      setTimeout(() => {
        navigate('/home');
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error claiming profile:', err);
      toast.error('Failed to claim profile');
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-indigo-200">
        <CardHeader className="text-center bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <CardTitle className="text-3xl">Claim Your Profile</CardTitle>
          <CardDescription className="text-base">
            Unlock full access to CONNEXTED LABS
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <Alert className="mb-6 border-indigo-200 bg-indigo-50/50">
            <AlertDescription className="text-sm text-gray-700">
              <strong>Ready to get started?</strong> By claiming your profile, you'll gain full access to:
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Post and Share Content</p>
                <p className="text-sm text-gray-600">Create posts, share updates, and contribute to discussions</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Comment & React</p>
                <p className="text-sm text-gray-600">Engage with other members' content and join conversations</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Connect with Members</p>
                <p className="text-sm text-gray-600">Follow members, build your network, and collaborate</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Access Events</p>
                <p className="text-sm text-gray-600">RSVP to events, join sessions, and participate in programs</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Customize Your Profile</p>
                <p className="text-sm text-gray-600">Edit your profile, add a bio, and showcase your work</p>
              </div>
            </div>
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
                  <Sparkles className="w-5 h-5 mr-2" />
                  Claim My Profile
                </>
              )}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => navigate('/home')}
              disabled={isClaiming}
            >
              Not Yet
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            By claiming your profile, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}