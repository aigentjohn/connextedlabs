import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, Info, Sparkles, Users, Globe, ArrowLeft } from 'lucide-react';

interface DemoAccount {
  id: string;
  label: string;
  description: string;
  email: string;
  password: string;
  icon: string;
  tier_badge: string;
  role_type: string;
  is_active: boolean;
  display_order: number;
}

export default function DemosPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingInDemo, setLoggingInDemo] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const fetchDemoAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('demo_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data) {
        console.log('Fetched demo accounts:', data);
        setDemoAccounts(data);
      } else {
        console.log('No demo accounts found or error:', error);
        setDemoAccounts([]);
      }
    } catch (err: any) {
      console.error('Error fetching demo accounts:', err);
      setDemoAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoAccount: DemoAccount) => {
    setLoggingInDemo(demoAccount.id);
    
    try {
      const { error } = await signIn(demoAccount.email, demoAccount.password);
      
      if (error) {
        toast.error('Demo account unavailable. Please contact support.');
      } else {
        toast.success(`Welcome to ${demoAccount.label}!`, {
          description: 'Exploring the platform with pre-loaded content.',
        });
        navigate('/home');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      toast.error('Failed to login to demo account');
    } finally {
      setLoggingInDemo(null);
    }
  };

  const getTierColor = (tierBadge: string) => {
    if (tierBadge.includes('FREE')) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (tierBadge.includes('MEMBER')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (tierBadge.includes('PREMIUM')) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getCardGradient = (tierBadge: string) => {
    if (tierBadge.includes('FREE')) return 'from-gray-50/50 to-white hover:from-gray-100/50';
    if (tierBadge.includes('MEMBER')) return 'from-blue-50/50 to-white hover:from-blue-100/50';
    if (tierBadge.includes('PREMIUM')) return 'from-purple-50/50 to-white hover:from-purple-100/50';
    return 'from-gray-50/50 to-white hover:from-gray-100/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">Interactive Demos</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Explore CONNEXTED LABS
              <span className="block bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Through Different Perspectives
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              See the platform in action through 5 different user experiences. Each demo is pre-loaded 
              with content and features that showcase what's possible at each membership tier.
            </p>

            <Alert className="max-w-3xl mx-auto border-indigo-200 bg-indigo-50/50">
              <Info className="w-4 h-4 text-indigo-600" />
              <AlertDescription className="text-sm text-gray-700">
                <strong>One-click access:</strong> Click any demo below to instantly explore the platform. 
                No signup required. Each demo showcases different features, roles, and membership tiers.
              </AlertDescription>
            </Alert>
          </div>

          {/* Back to Home */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Demo Cards Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-gray-500">Loading demo accounts...</div>
            </div>
          ) : demoAccounts.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">No demo accounts are currently available.</p>
                <Button onClick={() => navigate('/login')}>
                  Go to Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {demoAccounts.map((demo) => (
                <Card
                  key={demo.id}
                  className={`border-2 bg-gradient-to-br ${getCardGradient(demo.tier_badge)} hover:shadow-lg transition-all cursor-pointer group ${
                    loggingInDemo === demo.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => handleDemoLogin(demo)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-5xl">{demo.icon}</div>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getTierColor(demo.tier_badge)}`}>
                        {demo.tier_badge}
                      </span>
                    </div>
                    <CardTitle className="text-2xl group-hover:text-indigo-600 transition-colors">
                      {demo.label}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600">
                      {demo.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* What you'll see section based on role */}
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold mb-2 text-gray-900">What you'll experience:</p>
                        <ul className="space-y-1">
                          {demo.role_type === 'member' && demo.tier_badge.includes('FREE') && (
                            <>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                Explore public communities and content
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                See what's available at no cost
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                Basic profile and engagement features
                              </li>
                            </>
                          )}
                          {demo.role_type === 'member' && demo.tier_badge.includes('MEMBER') && (
                            <>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                Join circles and participate in programs
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                Post content and engage with community
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                Access exclusive member features
                              </li>
                            </>
                          )}
                          {demo.role_type === 'member' && demo.tier_badge.includes('PREMIUM') && (
                            <>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Full platform access + Market showcase
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Company profile and product listings
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Advanced networking and analytics
                              </li>
                            </>
                          )}
                          {demo.role_type === 'host' && (
                            <>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Create and manage your own circles
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Host events and manage members
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Track engagement and growth
                              </li>
                            </>
                          )}
                          {demo.role_type === 'manager' && (
                            <>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Coordinate multiple programs and circles
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Platform-wide analytics and insights
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                Advanced admin capabilities
                              </li>
                            </>
                          )}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <Button 
                          className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700"
                          disabled={loggingInDemo === demo.id}
                        >
                          {loggingInDemo === demo.id ? (
                            'Logging in...'
                          ) : (
                            <>
                              Explore This Demo
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Browse as Guest */}
            <Card className="border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate('/join')}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Globe className="w-6 h-6 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Browse as Guest</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Explore public communities and content without creating an account
                    </p>
                    <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                      <span>Start exploring</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Create Account */}
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate('/login?tab=register')}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Users className="w-6 h-6 text-indigo-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Your Account</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Ready to join? Create your free account and start building
                    </p>
                    <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                      <span>Get started free</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Demo FAQs</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do demos work?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Each demo is a pre-configured account with sample content, connections, and features 
                  enabled. Click any demo to instantly login and explore that user's experience. No setup required!
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I try multiple demos?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Absolutely! Log out and come back to this page to try a different demo. Each one showcases 
                  different features, membership tiers, and platform capabilities.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What's the difference between demos?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Demos vary by membership tier (Free, Member, Premium) and role (Member, Host, Manager). 
                  Free tier shows basic access, Member tier shows community participation, Premium tier shows 
                  advanced features like Market access, Hosts can create circles, and Managers coordinate programs.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ready to create your own account?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  When you're ready, click "Create Your Account" above to get started with your own free account. 
                  You can always upgrade to Member or Premium tier later to unlock more features.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
