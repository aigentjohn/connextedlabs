import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Users, CheckCircle2, ArrowRight, Loader2, Mail, Calendar,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import SEO, { generateProgramSchema } from '@/app/components/SEO';
import RedeemCodeDialog from '@/app/components/shared/RedeemCodeDialog';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';
import { templateApi, type TicketTemplate } from '@/services/ticketSystemService';
import { WaitlistBlock } from '@/app/components/shared/WaitlistBlock';
import { accessTicketService } from '@/services/accessTicketService';

interface ProgramData {
  id: string;
  name: string;
  description: string;
  slug: string;
  cover_image: string | null;
  visibility: 'public' | 'member' | 'private';
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  member_ids: string[];
  admin_ids: string[];
  template_id: string | null;
  circle_id: string | null;
  pricing_type?: 'free' | 'paid' | 'members-only';
  price_cents?: number;
  convertkit_product_id?: string;
  duration_weeks?: number;
}

interface Circle {
  id: string;
  name: string;
  member_ids: string[];
}

export default function ProgramLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailForUpdates, setEmailForUpdates] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Ticket / access state
  const [linkedTemplate, setLinkedTemplate] = useState<TicketTemplate | null>(null);
  const [hasTicketAccess, setHasTicketAccess] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchProgram();
    }
  }, [slug]);

  const fetchProgram = async () => {
    try {
      setLoading(true);

      // Fetch program - try public visibility first, then check if user has access
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (programError) throw programError;
      if (!programData) {
        setProgram(null);
        setLoading(false);
        return;
      }

      setProgram(programData);

      // Fetch circle if program has one
      if (programData.circle_id) {
        const { data: circleData, error: circleError } = await supabase
          .from('circles')
          .select('id, name, member_ids')
          .eq('id', programData.circle_id)
          .single();

        if (!circleError && circleData) {
          setCircle(circleData);
        }
      }

      // Track landing page visit
      trackVisit(programData.id);

      // Load linked ticket template (public, works logged-out)
      try {
        const { templates } = await templateApi.forContainer('program', programData.id);
        setLinkedTemplate(templates?.[0] ?? null);
      } catch (tmplErr) {
        console.warn('Could not load program ticket template:', tmplErr);
      }

      // Check if logged-in user already has an access ticket for this program
      if (profile?.id) {
        try {
          const ticket = await accessTicketService.getUserTicket(profile.id, 'program', programData.id);
          const active = ticket && ticket.status === 'active' &&
            (!ticket.expires_at || new Date(ticket.expires_at) > new Date());
          setHasTicketAccess(!!active);
        } catch (accessErr) {
          console.warn('Program access check failed (non-fatal):', accessErr);
        }
      }

    } catch (error) {
      console.error('Error fetching program:', error);
      toast.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const trackVisit = async (programId: string) => {
    try {
      // Get referral source from URL
      const urlParams = new URLSearchParams(window.location.search);
      const referralSource = urlParams.get('ref');

      await supabase.from('landing_page_visits').insert({
        container_type: 'program',
        container_id: programId,
        visitor_id: user?.id || null,
        referral_source: referralSource,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail - don't disrupt user experience
      console.error('Error tracking visit:', error);
    }
  };

  const handleGetUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForUpdates || !program) {
      return;
    }

    try {
      setSavingEmail(true);

      // Save as prospect
      const { error } = await supabase.from('prospects').insert({
        email: emailForUpdates,
        container_type: 'program',
        container_id: program.id,
        source: 'landing-page',
        status: 'prospect',
      });

      if (error) throw error;

      toast.success('Thanks! We\'ll keep you updated.');
      setEmailForUpdates('');
    } catch (error) {
      console.error('Error saving email:', error);
      toast.error('Failed to save email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleApplyNow = () => {
    if (!program) return;

    // If program has ConvertKit product ID and is paid, redirect to ConvertKit
    if (program.convertkit_product_id && program.pricing_type === 'paid') {
      // Construct ConvertKit Commerce purchase URL
      const convertkitUrl = `https://app.convertkit.com/commerce/products/${program.convertkit_product_id}/purchase`;
      
      // Open in new tab
      window.open(convertkitUrl, '_blank');
      
      toast.success('Opening payment page...');
      return;
    }

    // Otherwise, follow standard application flow
    if (user) {
      // User is logged in, go to application form
      navigate(`/programs/${program.slug}/apply`);
    } else {
      // User not logged in, redirect to login then back here
      navigate(`/login?redirect=/programs/${program.slug}/apply`);
    }
  };

  const handleAccessProgram = () => {
    if (!program) return;
    navigate(`/programs/${program.slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Program Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The program you're looking for doesn't exist or is no longer available.
        </p>
        <Button asChild>
          <Link to="/programs">Browse Programs</Link>
        </Button>
      </div>
    );
  }

  // Check if user is already a member
  const isMember = user && profile && program.member_ids.includes(profile.id);
  const isAdmin = user && profile && program.admin_ids.includes(profile.id);

  // If user has a ticket OR is a member, route them straight in
  if (isMember || hasTicketAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">You're Already a Member!</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Click below to access {program.name} and all its content.
        </p>
        <Button size="lg" onClick={handleAccessProgram}>
          Access Program
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Public landing page view
  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags */}
      <SEO
        title={program.name}
        description={program.description || `Join ${program.name}, a structured learning program for innovators and entrepreneurs. ${program.member_ids.length} members enrolled.`}
        image={program.cover_image || undefined}
        url={`https://connexted.app/programs/${program.slug}`}
        type="article"
        schema={generateProgramSchema({
          title: program.name,
          description: program.description || '',
          price: (program.price_cents || 0) / 100,
          startDate: program.status === 'in-progress' ? new Date().toISOString() : undefined,
          duration: program.duration_weeks ? `P${program.duration_weeks}W` : undefined,
          url: `https://connexted.app/programs/${program.slug}`
        })}
      />
      
      {/* Header */}
      <PublicHeader />
      
      <div className="pb-12">
        <Breadcrumbs items={[
          { label: 'Programs', path: '/programs/browse' },
          { label: program?.name || 'Loading...' }
        ]} />
      </div>
      
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-6 py-16 max-w-5xl">
          <div className="text-center">
            {/* Cover Image */}
            {program.cover_image && (
              <div className="mb-8 rounded-lg overflow-hidden max-w-3xl mx-auto">
                <img
                  src={program.cover_image}
                  alt={program.name}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Status Badge */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <Badge variant={program.status === 'in-progress' ? 'default' : 'secondary'}>
                {program.status === 'not-started' && '🎯 Coming Soon'}
                {program.status === 'in-progress' && '🚀 Now Open'}
                {program.status === 'completed' && '✅ Completed'}
              </Badge>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {program.member_ids.length} Members
              </Badge>
            </div>

            {/* Title & Description */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {program.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {program.description}
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 max-w-sm mx-auto">
              {/* WaitlistBlock — shown when a ticket template is linked */}
              {linkedTemplate && (
                <WaitlistBlock
                  template={linkedTemplate}
                  profile={profile}
                  displayName={program.name}
                  className="w-full"
                />
              )}

              {/* Standard apply CTA — always shown below the waitlist block */}
              <Button size="lg" className="w-full" onClick={handleApplyNow}>
                {program.status === 'in-progress' ? 'Apply Now' : 'Request Early Access'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <a href="#details">Learn More</a>
              </Button>
            </div>

            {/* Have a code? */}
            {user && profile && (
              <div className="mt-4">
                <RedeemCodeDialog
                  containerType="program"
                  containerId={program.id}
                  userId={profile.id}
                  onRedeemed={() => {
                    toast.success('You now have access!');
                    setTimeout(() => navigate(`/programs/${program.slug}`), 1500);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Program Details */}
      <section id="details" className="border-b">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What You'll Get */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">What You'll Get</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Access to structured learning journeys
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Expert guidance and mentorship
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Private group of peers
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Resources and tools for success
                    </span>
                  </li>
                  {circle && (
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        Access to <strong>{circle.name}</strong> group
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Program Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Program Details</h3>
                <dl className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <dt className="font-medium">Status:</dt>
                    <dd className="text-muted-foreground">
                      {program.status === 'not-started' && 'Starting Soon'}
                      {program.status === 'in-progress' && 'Now Accepting Applications'}
                      {program.status === 'completed' && 'Program Complete'}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <dt className="font-medium">Members:</dt>
                    <dd className="text-muted-foreground">
                      {program.member_ids.length} enrolled
                    </dd>
                  </div>
                  {circle && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <dt className="font-medium">Group:</dt>
                      <dd className="text-muted-foreground">
                        {circle.name} ({circle.member_ids.length} members)
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <dt className="font-medium">Access:</dt>
                    <dd className="text-muted-foreground">
                      {program.visibility === 'public' && 'Public - Apply to join'}
                      {program.visibility === 'member' && 'Members Only - Apply to join'}
                      {program.visibility === 'private' && 'Private - Invitation required'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Get Updates Section */}
      {program.status === 'not-started' && (
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-6 py-16 max-w-2xl text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Get Notified When We Launch</h2>
            <p className="text-muted-foreground mb-6">
              This program is starting soon. Leave your email to be the first to know when
              applications open.
            </p>
            <form onSubmit={handleGetUpdates} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={emailForUpdates}
                onChange={(e) => setEmailForUpdates(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-md"
                required
              />
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Get Updates'
                )}
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {program.status === 'in-progress' && (
        <section className="border-b bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join {program.member_ids.length}+ members already in the program.
            </p>
            <Button size="lg" variant="secondary" onClick={handleApplyNow}>
              Apply Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}