/**
 * Standalone Redeem Code Page
 * 
 * Accessible at /redeem or /redeem?code=XYZ
 * Allows users to enter any access code (scholarship, promo, gift, etc.)
 * and get enrolled in the corresponding course/program/etc.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Gift, Ticket, Loader2, CheckCircle, AlertCircle, BookOpen, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { redeemCodeWithBridge } from '@/services/enrollmentBridge';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function RedeemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();

  const [code, setCode] = useState(searchParams.get('code')?.toUpperCase() || '');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ticketId: string;
    containerType: string;
    containerId: string;
  } | null>(null);

  // Auto-redeem if code came from URL and user is logged in
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && profile && !result) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => handleRedeem(urlCode), 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, profile]);

  const handleRedeem = async (codeOverride?: string) => {
    const codeToRedeem = codeOverride || code;
    if (!codeToRedeem.trim()) {
      setError('Please enter a code');
      return;
    }

    if (!profile) {
      toast.error('Please sign in to redeem a code');
      navigate(`/login?redirect=/redeem?code=${encodeURIComponent(codeToRedeem)}`);
      return;
    }

    setRedeeming(true);
    setError(null);

    try {
      const redeemResult = await redeemCodeWithBridge({
        code: codeToRedeem.trim(),
        userId: profile.id,
      });

      setResult(redeemResult);
      toast.success('Code redeemed successfully!');
    } catch (err: any) {
      console.error('Redemption error:', err);
      setError(err.message || 'Failed to redeem code');
    } finally {
      setRedeeming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !redeeming) {
      handleRedeem();
    }
  };

  const getNavigationPath = () => {
    if (!result) return '/';
    switch (result.containerType) {
      case 'course': return `/courses`;
      case 'program': return `/programs`;
      case 'circle': return `/circles/${result.containerId}`;
      default: return '/my-learning';
    }
  };

  const getContainerLabel = () => {
    if (!result) return '';
    switch (result.containerType) {
      case 'course': return 'Course';
      case 'program': return 'Program';
      case 'circle': return 'Circle';
      case 'event': return 'Event';
      default: return result.containerType;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'My Learning', href: '/my-learning' },
        { label: 'Redeem Code' },
      ]} />

      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Redeem Access Code</CardTitle>
            <CardDescription>
              Enter your scholarship, promo, or gift code to get access
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {result ? (
              /* Success state */
              <div className="text-center py-6 space-y-4">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-green-700">Code Redeemed!</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You now have access to a {getContainerLabel().toLowerCase()}.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {result.containerType === 'course' && <BookOpen className="w-3 h-3 mr-1" />}
                    {result.containerType === 'program' && <Users className="w-3 h-3 mr-1" />}
                    {getContainerLabel()}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => navigate(getNavigationPath())} className="w-full">
                    Go to {getContainerLabel()}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/my-learning')} className="w-full">
                    View My Learning
                  </Button>
                </div>
              </div>
            ) : (
              /* Input state */
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Access Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. SCHOLAR2026, PROMO-XYZ, GIFT-ABC"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={redeeming}
                    className="font-mono text-lg tracking-wider text-center"
                    autoFocus
                  />
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleRedeem()}
                  disabled={redeeming || !code.trim() || !profile}
                  className="w-full"
                  size="lg"
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Redeem Code
                    </>
                  )}
                </Button>

                {!profile && (
                  <p className="text-sm text-amber-600 text-center">
                    Please sign in to redeem a code
                  </p>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-2">Accepted code types:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge variant="outline" className="text-xs">Scholarship</Badge>
                    <Badge variant="outline" className="text-xs">Promo</Badge>
                    <Badge variant="outline" className="text-xs">Gift Card</Badge>
                    <Badge variant="outline" className="text-xs">Partner</Badge>
                    <Badge variant="outline" className="text-xs">Contest Prize</Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
