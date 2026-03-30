import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Play, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  Circle,
  FileText,
  Sparkles,
  Database,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { DEMO_PERSONAS, SEED_CIRCLES } from './SeedDataConfiguration';

interface SeedProgress {
  phase: string;
  current: number;
  total: number;
  status: 'pending' | 'running' | 'complete' | 'error';
  message: string;
}

interface SeedResults {
  users: { success: number; failed: number; ids: string[] };
  circles: { success: number; failed: number; ids: string[] };
  posts: { success: number; failed: number; ids: string[] };
  moments: { success: number; failed: number; ids: string[] };
  companies: { success: number; failed: number; ids: string[] };
  memberships: { success: number; failed: number };
  errors: string[];
}

export default function DataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<SeedProgress[]>([]);
  const [results, setResults] = useState<SeedResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  const updateProgress = (phase: string, current: number, total: number, status: SeedProgress['status'], message: string) => {
    setProgress(prev => {
      const existing = prev.find(p => p.phase === phase);
      if (existing) {
        return prev.map(p => p.phase === phase ? { phase, current, total, status, message } : p);
      } else {
        return [...prev, { phase, current, total, status, message }];
      }
    });
  };

  const startSeeding = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will create demo data in your database.\n\n' +
      'Make sure you have:\n' +
      '1. Backed up your database\n' +
      '2. Cleaned up test data\n' +
      '3. Reviewed the seed configuration\n\n' +
      'Continue with seeding?'
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setProgress([]);
    setShowResults(false);

    const seedResults: SeedResults = {
      users: { success: 0, failed: 0, ids: [] },
      circles: { success: 0, failed: 0, ids: [] },
      posts: { success: 0, failed: 0, ids: [] },
      moments: { success: 0, failed: 0, ids: [] },
      companies: { success: 0, failed: 0, ids: [] },
      memberships: { success: 0, failed: 0 },
      errors: []
    };

    try {
      // Phase 1: Create Users
      updateProgress('users', 0, DEMO_PERSONAS.length, 'running', 'Creating demo user accounts...');
      
      const userMap = new Map<string, string>(); // persona.id -> database user.id
      
      for (let i = 0; i < DEMO_PERSONAS.length; i++) {
        const persona = DEMO_PERSONAS[i];
        try {
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', persona.email)
            .single();

          if (existingUser) {
            seedResults.errors.push(`User ${persona.email} already exists. Skipping.`);
            seedResults.users.failed++;
            continue;
          }

          // Create user
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: crypto.randomUUID(), // Generate UUID for user ID
              email: persona.email,
              full_name: persona.name, // Required NOT NULL field
              name: persona.name,
              bio: persona.bio,
              role: persona.role,
              membership_tier: persona.tier,
              avatar: persona.avatar_url,
              tagline: persona.tagline,
              location: persona.location,
              website: persona.website,
              linkedin_url: persona.linkedin,
              twitter_handle: persona.twitter,
              interests: persona.interests
            })
            .select()
            .single();

          if (userError) throw userError;

          userMap.set(persona.id, newUser.id);
          seedResults.users.success++;
          seedResults.users.ids.push(newUser.id);

          // Create moments container for user
          const { error: momentsError } = await supabase
            .from('moments')
            .insert({
              user_id: newUser.id,
              highlights: []
            });

          if (momentsError) {
            console.error('Error creating moments container:', momentsError);
          }

          // Create portfolio container for user
          const { error: portfolioError } = await supabase
            .from('portfolios')
            .insert({
              user_id: newUser.id,
              items: []
            });

          if (portfolioError) {
            console.error('Error creating portfolio container:', portfolioError);
          }

          updateProgress('users', i + 1, DEMO_PERSONAS.length, 'running', `Created ${persona.name}`);
        } catch (error: any) {
          console.error(`Error creating user ${persona.email}:`, error);
          seedResults.users.failed++;
          seedResults.errors.push(`User ${persona.email}: ${error.message}`);
        }
      }

      updateProgress('users', DEMO_PERSONAS.length, DEMO_PERSONAS.length, 'complete', 
        `${seedResults.users.success} users created, ${seedResults.users.failed} failed`);

      // Phase 2: Create Circles
      updateProgress('circles', 0, SEED_CIRCLES.length, 'running', 'Creating circles...');
      
      const circleMap = new Map<string, string>(); // circle.id -> database circle.id

      for (let i = 0; i < SEED_CIRCLES.length; i++) {
        const circle = SEED_CIRCLES[i];
        try {
          // Check if circle already exists
          const { data: existingCircle } = await supabase
            .from('circles')
            .select('id')
            .eq('name', circle.name)
            .single();

          if (existingCircle) {
            seedResults.errors.push(`Circle ${circle.name} already exists. Skipping.`);
            seedResults.circles.failed++;
            continue;
          }

          // Create circle
          const { data: newCircle, error: circleError } = await supabase
            .from('circles')
            .insert({
              name: circle.name,
              description: circle.description,
              access_type: 'open', // Required field: 'open', 'request', or 'invite'
              member_ids: [],
              admin_ids: []
            })
            .select()
            .single();

          if (circleError) throw circleError;

          circleMap.set(circle.id, newCircle.id);
          seedResults.circles.success++;
          seedResults.circles.ids.push(newCircle.id);

          updateProgress('circles', i + 1, SEED_CIRCLES.length, 'running', `Created ${circle.name}`);
        } catch (error: any) {
          console.error(`Error creating circle ${circle.name}:`, error);
          seedResults.circles.failed++;
          seedResults.errors.push(`Circle ${circle.name}: ${error.message}`);
        }
      }

      updateProgress('circles', SEED_CIRCLES.length, SEED_CIRCLES.length, 'complete',
        `${seedResults.circles.success} circles created, ${seedResults.circles.failed} failed`);

      // Phase 3: Create Circle Memberships
      updateProgress('memberships', 0, DEMO_PERSONAS.length, 'running', 'Adding users to circles...');

      // Logic: 
      // - All users join "Open Circle"
      // - Premium users (Alex, Sam) join "Innovation Lab"
      // - Member+ users (Maria, Sam, Taylor) join "Product Founders Network"
      
      const openCircleId = circleMap.get('open-circle');
      const innovationLabId = circleMap.get('innovation-lab');
      const productFoundersId = circleMap.get('product-founders-network');

      let membershipCount = 0;
      for (const persona of DEMO_PERSONAS) {
        const userId = userMap.get(persona.id);
        if (!userId) continue;

        try {
          // Add to Open Circle (everyone)
          if (openCircleId) {
            await supabase
              .from('circle_memberships')
              .insert({
                circle_id: openCircleId,
                user_id: userId,
                tier: 'free',
                status: 'active'
              });
            membershipCount++;
          }

          // Add premium users to Innovation Lab
          if (innovationLabId && persona.tier === 'premium') {
            await supabase
              .from('circle_memberships')
              .insert({
                circle_id: innovationLabId,
                user_id: userId,
                tier: 'premium',
                status: 'active'
              });
            membershipCount++;
          }

          // Add member+ users to Product Founders Network
          if (productFoundersId && (persona.tier === 'member' || persona.tier === 'premium')) {
            await supabase
              .from('circle_memberships')
              .insert({
                circle_id: productFoundersId,
                user_id: userId,
                tier: persona.tier,
                status: 'active'
              });
            membershipCount++;
          }

          // Make Maria an admin of Product Founders Network (she's a host)
          if (persona.id === 'maria-rodriguez' && productFoundersId) {
            const { data: circle } = await supabase
              .from('circles')
              .select('admin_ids')
              .eq('id', productFoundersId)
              .single();

            if (circle) {
              await supabase
                .from('circles')
                .update({
                  admin_ids: [...(circle.admin_ids || []), userId]
                })
                .eq('id', productFoundersId);
            }
          }

          seedResults.memberships.success++;
        } catch (error: any) {
          console.error(`Error adding ${persona.name} to circles:`, error);
          seedResults.memberships.failed++;
          seedResults.errors.push(`Membership for ${persona.name}: ${error.message}`);
        }
      }

      updateProgress('memberships', DEMO_PERSONAS.length, DEMO_PERSONAS.length, 'complete',
        `${seedResults.memberships.success} memberships created`);

      // Phase 4: Create Companies
      updateProgress('companies', 0, 1, 'running', 'Creating company profiles...');

      for (const persona of DEMO_PERSONAS) {
        if (!persona.showcase?.company) continue;

        const userId = userMap.get(persona.id);
        if (!userId) continue;

        try {
          const company = persona.showcase.company;

          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              user_id: userId,
              name: company.name,
              tagline: company.tagline,
              description: company.description,
              stage: company.stage,
              website: company.website,
              team_size: company.team_size,
              is_active: true,
              products: company.products || []
            })
            .select()
            .single();

          if (companyError) throw companyError;

          seedResults.companies.success++;
          seedResults.companies.ids.push(newCompany.id);
        } catch (error: any) {
          console.error(`Error creating company for ${persona.name}:`, error);
          seedResults.companies.failed++;
          seedResults.errors.push(`Company for ${persona.name}: ${error.message}`);
        }
      }

      updateProgress('companies', 1, 1, 'complete',
        `${seedResults.companies.success} companies created`);

      // Phase 5: Create Posts
      let totalPosts = DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.posts?.length || 0), 0);
      updateProgress('posts', 0, totalPosts, 'running', 'Creating posts...');

      let postCount = 0;
      for (const persona of DEMO_PERSONAS) {
        if (!persona.showcase?.posts) continue;

        const userId = userMap.get(persona.id);
        if (!userId) continue;

        for (const post of persona.showcase.posts) {
          try {
            const { data: newPost, error: postError } = await supabase
              .from('posts')
              .insert({
                author_id: userId,
                content: post.content,
                title: post.title,
                tags: post.tags || [],
                circle_id: openCircleId, // Post to Open Circle
                created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date in last 30 days
              })
              .select()
              .single();

            if (postError) throw postError;

            seedResults.posts.success++;
            seedResults.posts.ids.push(newPost.id);
            postCount++;
            updateProgress('posts', postCount, totalPosts, 'running', `Created post by ${persona.name}`);
          } catch (error: any) {
            console.error(`Error creating post for ${persona.name}:`, error);
            seedResults.posts.failed++;
            seedResults.errors.push(`Post by ${persona.name}: ${error.message}`);
          }
        }
      }

      updateProgress('posts', totalPosts, totalPosts, 'complete',
        `${seedResults.posts.success} posts created`);

      // Phase 6: Create Moments
      let totalMoments = DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.moments?.length || 0), 0);
      updateProgress('moments', 0, totalMoments, 'running', 'Creating moments...');

      let momentCount = 0;
      for (const persona of DEMO_PERSONAS) {
        if (!persona.showcase?.moments) continue;

        const userId = userMap.get(persona.id);
        if (!userId) continue;

        // Get the moments container
        const { data: momentsContainer } = await supabase
          .from('moments')
          .select('highlights')
          .eq('user_id', userId)
          .single();

        if (momentsContainer) {
          const newHighlights = persona.showcase.moments.map(m => ({
            id: crypto.randomUUID(),
            title: m.title,
            description: m.description,
            date: m.date,
            created_at: new Date().toISOString()
          }));

          try {
            const { error: updateError } = await supabase
              .from('moments')
              .update({
                highlights: [...(momentsContainer.highlights || []), ...newHighlights]
              })
              .eq('user_id', userId);

            if (updateError) throw updateError;

            seedResults.moments.success += newHighlights.length;
            momentCount += newHighlights.length;
            updateProgress('moments', momentCount, totalMoments, 'running', `Added moments for ${persona.name}`);
          } catch (error: any) {
            console.error(`Error creating moments for ${persona.name}:`, error);
            seedResults.moments.failed += persona.showcase.moments.length;
            seedResults.errors.push(`Moments for ${persona.name}: ${error.message}`);
          }
        }
      }

      updateProgress('moments', totalMoments, totalMoments, 'complete',
        `${seedResults.moments.success} moments created`);

      // Complete!
      setResults(seedResults);
      setShowResults(true);
      toast.success('Seeding completed! Check results below.');

    } catch (error: any) {
      console.error('Seeding error:', error);
      toast.error('Seeding failed: ' + error.message);
      seedResults.errors.push(`Fatal error: ${error.message}`);
      setResults(seedResults);
      setShowResults(true);
    } finally {
      setIsSeeding(false);
    }
  };

  const getProgressPercentage = () => {
    if (progress.length === 0) return 0;
    const completed = progress.filter(p => p.status === 'complete').length;
    return (completed / progress.length) * 100;
  };

  const getStatusIcon = (status: SeedProgress['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: SeedProgress['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Data Seeder' }
        ]}
      />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Data Seeder</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automatically populate database with demo personas and content
          </p>
        </div>
        <Button
          onClick={startSeeding}
          disabled={isSeeding}
          size="lg"
        >
          {isSeeding ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Start Seeding
            </>
          )}
        </Button>
      </div>

      {/* Warning Alert */}
      <Alert className="border-orange-300 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">Important Pre-Seeding Checklist</AlertTitle>
        <AlertDescription className="text-orange-800">
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>✅ Review seed configuration at <strong>/platform-admin/seed-data</strong></li>
            <li>✅ Run data audit to identify conflicts at <strong>/platform-admin/data-audit</strong></li>
            <li>✅ Clean up test data at <strong>/platform-admin/data-cleanup</strong></li>
            <li>✅ Export a database backup before proceeding</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* What Will Be Created */}
      <Card>
        <CardHeader>
          <CardTitle>Seeding Plan</CardTitle>
          <CardDescription>This seeding operation will create:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{DEMO_PERSONAS.length}</p>
                <p className="text-sm text-gray-600">Demo Users</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Circle className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{SEED_CIRCLES.length}</p>
                <p className="text-sm text-gray-600">Circles</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.posts?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <Sparkles className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.moments?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Moments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <Database className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">
                  {DEMO_PERSONAS.filter(p => p.showcase?.company).length}
                </p>
                <p className="text-sm text-gray-600">Companies</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
              <Users className="w-8 h-8 text-pink-600" />
              <div>
                <p className="text-2xl font-bold">~10</p>
                <p className="text-sm text-gray-600">Memberships</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      {isSeeding && (
        <Card>
          <CardHeader>
            <CardTitle>Seeding Progress</CardTitle>
            <CardDescription>
              {Math.round(getProgressPercentage())}% Complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="space-y-2">
              {progress.map((p, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(p.status)}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(p.status)}
                    <div>
                      <p className="font-medium capitalize">{p.phase}</p>
                      <p className="text-sm text-gray-600">{p.message}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {p.current}/{p.total}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {showResults && results && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <CheckCircle2 className="w-6 h-6 mr-2" />
              Seeding Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Users</p>
                <p className="text-2xl font-bold text-green-600">{results.users.success}</p>
                {results.users.failed > 0 && (
                  <p className="text-xs text-red-600">{results.users.failed} failed</p>
                )}
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Circles</p>
                <p className="text-2xl font-bold text-green-600">{results.circles.success}</p>
                {results.circles.failed > 0 && (
                  <p className="text-xs text-red-600">{results.circles.failed} failed</p>
                )}
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Posts</p>
                <p className="text-2xl font-bold text-green-600">{results.posts.success}</p>
                {results.posts.failed > 0 && (
                  <p className="text-xs text-red-600">{results.posts.failed} failed</p>
                )}
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Moments</p>
                <p className="text-2xl font-bold text-green-600">{results.moments.success}</p>
                {results.moments.failed > 0 && (
                  <p className="text-xs text-red-600">{results.moments.failed} failed</p>
                )}
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Companies</p>
                <p className="text-2xl font-bold text-green-600">{results.companies.success}</p>
                {results.companies.failed > 0 && (
                  <p className="text-xs text-red-600">{results.companies.failed} failed</p>
                )}
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Memberships</p>
                <p className="text-2xl font-bold text-green-600">{results.memberships.success}</p>
                {results.memberships.failed > 0 && (
                  <p className="text-xs text-red-600">{results.memberships.failed} failed</p>
                )}
              </div>
            </div>

            {/* Errors */}
            {results.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="font-semibold text-red-900 mb-2">
                  Errors ({results.errors.length})
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((error, idx) => (
                    <p key={idx} className="text-xs text-red-700">• {error}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <Alert className="border-blue-300 bg-blue-100">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Next Steps</AlertTitle>
              <AlertDescription className="text-blue-800">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Visit <strong>/platform-admin/data-audit</strong> to verify data</li>
                  <li>Visit <strong>/platform-admin/validation</strong> to test demo accounts</li>
                  <li>Test login for each demo persona</li>
                  <li>Configure demo accounts at <strong>/platform-admin/demo-accounts</strong></li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}