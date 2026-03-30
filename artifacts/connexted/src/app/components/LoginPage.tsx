import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Users, Globe, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, ShoppingBag } from 'lucide-react';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';

export default function LoginPage() {
  const { signIn, signInPasswordless, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [enableGuestBrowsing, setEnableGuestBrowsing] = useState(false);

  // Load platform settings to check if guest browsing is enabled
  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  // Load remembered email if it exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  // Check URL params for tab preference
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'register' || tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location.search]);

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('enable_guest_browsing')
        .single();
      
      if (!error && data) {
        setEnableGuestBrowsing(data.enable_guest_browsing ?? false);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      // Default to disabled if error
      setEnableGuestBrowsing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message || 'Invalid email or password');
    } else {
      localStorage.setItem('rememberedEmail', email);
      toast.success('Welcome back!');
      const from = (location.state as any)?.from?.pathname || '/home';
      navigate(from);
    }
    
    setIsLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);

    const { error } = await signInPasswordless(email);
    
    if (error) {
      toast.error(error.message || 'Failed to send magic link');
    } else {
      toast.success('Magic link sent!', {
        description: 'Check your email and click the link to access your account.',
        duration: 6000,
      });
    }
    
    setIsLoading(false);
  };

  const handleBrowseAsGuest = () => {
    navigate('/explore');
  };

  const handleBrowseMarkets = () => {
    navigate('/markets');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, name);
    
    if (error) {
      toast.error(error.message || 'Failed to create account');
    } else {
      toast.success('Account created successfully!');
      const from = (location.state as any)?.from?.pathname || '/home';
      navigate(from);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <PublicHeader />
      
      <div className="flex items-center justify-center p-4 py-20">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Get Started
            </h2>
            <p className="text-gray-600">
              Sign in to your account or claim your invitation
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 1. Sign In Card */}
            <Card className="border-2 border-indigo-200 hover:border-indigo-300 hover:shadow-lg transition-all">
              <CardHeader className="text-center pb-3">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Have an Account?</CardTitle>
                <CardDescription className="text-xs">
                  Sign in with your credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === 'signin' ? (
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-indigo-600 hover:bg-indigo-700" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <div className="text-center text-xs text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Sign Up
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600 mb-4">
                      Already have an account?
                    </p>
                    <Button
                      onClick={() => setActiveTab('signin')}
                      variant="outline"
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Create Account Card */}
            <Card className="border-2 border-green-200 hover:border-green-300 hover:shadow-lg transition-all">
              <CardHeader className="text-center pb-3">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">New to CONNEXTED?</CardTitle>
                <CardDescription className="text-xs">
                  Create your free account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === 'signup' ? (
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="pr-10"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Minimum 6 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-sm">Confirm Password</Label>
                      <Input
                        id="signup-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating account...' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <div className="text-center text-xs text-gray-600">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signin')}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600 mb-4">
                      Ready to join the community?
                    </p>
                    <Button
                      onClick={() => setActiveTab('signup')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Magic Link Option */}
          <div className="mb-6">
            <Card className="border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <CardHeader className="text-center pb-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Claim with Email</CardTitle>
                <CardDescription className="text-xs">
                  Get instant access via magic link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert className="border-purple-200 bg-purple-50/50">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-xs text-purple-900">
                      No password needed! We'll email you a secure link to access your account instantly.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="magic-email" className="text-sm">Your Email</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <Button 
                    onClick={handleMagicLink}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    disabled={isLoading || !email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Check your inbox and click the link to sign in
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Access Options - Only show if guest browsing is enabled */}
          {enableGuestBrowsing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Browse as Visitor - Markets Only */}
              <Card className="border-2 border-orange-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer" onClick={handleBrowseMarkets}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Browse as Visitor</h3>
                      <p className="text-xs text-gray-600 mb-2">
                        View our marketplace offerings without an account
                      </p>
                      <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                        <span>View Markets</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Browse as Guest - Full Explore */}
              <Card className="border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer" onClick={handleBrowseAsGuest}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Browse as Guest</h3>
                      <p className="text-xs text-gray-600 mb-2">
                        Explore communities, programs, and public content
                      </p>
                      <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                        <span>Start Exploring</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}