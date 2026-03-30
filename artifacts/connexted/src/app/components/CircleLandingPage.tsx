import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';
import {
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  Globe,
  MessageCircle,
  Calendar as CalendarIcon,
  FileText,
  BookOpen,
  Star,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { templateApi, type TicketTemplate } from '@/services/ticketSystemService';
import { WaitlistBlock } from '@/app/components/shared/WaitlistBlock';
import { accessTicketService } from '@/services/accessTicketService';

interface CircleData {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
  moderator_ids: string[];
  guest_access: {
    feed: boolean;
    members: boolean;
    documents: boolean;
    forum: boolean;
    checklists: boolean;
    reviews: boolean;
    calendar: boolean;
  };
  is_open_circle: boolean;
  created_at: string;
}

export default function CircleLandingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailForUpdates, setEmailForUpdates] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Ticket / access state
  const [linkedTemplate, setLinkedTemplate] = useState<TicketTemplate | null>(null);
  const [hasTicketAccess, setHasTicketAccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCircle();
    }
  }, [id]);

  const fetchCircle = async () => {
    try {
      setLoading(true);

      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('*')
        .eq('id', id)
        .single();

      if (circleError) throw circleError;
      if (!circleData) {
        setCircle(null);
        setLoading(false);
        return;
      }

      setCircle(circleData);

      // Track landing page visit
      trackVisit(circleData.id);

      // Load linked ticket template (public, works logged-out)
      try {
        const { templates } = await templateApi.forContainer('circle', circleData.id);
        setLinkedTemplate(templates?.[0] ?? null);
      } catch (tmplErr) {
        console.warn('Could not load circle ticket template:', tmplErr);
      }

      // Check if logged-in user has an active access ticket for this circle
      if (profile?.id) {
        try {
          const ticket = await accessTicketService.getUserTicket(profile.id, 'circle', circleData.id);
          const active = ticket && ticket.status === 'active' &&
            (!ticket.expires_at || new Date(ticket.expires_at) > new Date());
          setHasTicketAccess(!!active);
        } catch (accessErr) {
          console.warn('Circle access check failed (non-fatal):', accessErr);
        }
      }

    } catch (error) {
      console.error('Error fetching circle:', error);
      toast.error('Failed to load circle');
    } finally {
      setLoading(false);
    }
  };

  const trackVisit = async (circleId: string) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const referralSource = urlParams.get('ref');

      await supabase.from('landing_page_visits').insert({
        container_type: 'circle',
        container_id: circleId,
        visitor_id: user?.id || null,
        referral_source: referralSource,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error tracking visit:', error);
    }
  };

  const handleGetUpdates = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForUpdates || !circle) {
      return;
    }

    try {
      setSavingEmail(true);

      const { error } = await supabase.from('prospects').insert({
        email: emailForUpdates,
        container_type: 'circle',
        container_id: circle.id,
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

  const handleRequestAccess = () => {
    if (!circle) return;

    if (user) {
      // User is logged in, go to application/request form
      navigate(`/circles/${circle.id}/request`);
    } else {
      // User not logged in, redirect to login
      navigate(`/login?redirect=/circles/${circle.id}/request`);
    }
  };

  const handleJoinCircle = () => {
    if (!circle) return;

    if (user) {
      // For open circles, go directly to join flow
      navigate(`/circles/${circle.id}/join`);
    } else {
      navigate(`/login?redirect=/circles/${circle.id}/join`);
    }
  };

  const handleAccessCircle = () => {
    if (!circle) return;
    navigate(`/circles/${circle.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-4">Circle Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The circle you're looking for doesn't exist or is no longer available.
        </p>
        <Button asChild>
          <Link to="/circles">Browse Circles</Link>
        </Button>
      </div>
    );
  }

  // Check if user is already a member
  const isMember = user && profile && circle.member_ids.includes(profile.id);
  const isAdmin = user && profile && circle.admin_ids.includes(profile.id);

  // If user has a ticket OR is already a member, route them straight in
  if (isMember || hasTicketAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">You're Already a Member!</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Click below to access {circle.name} and connect with the group.
        </p>
        <Button size="lg" onClick={handleAccessCircle}>
          Access Circle
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const guestAccess = circle.guest_access || {
    feed: false,
    members: false,
    documents: false,
    forum: false,
    checklists: false,
    reviews: false,
    calendar: false,
  };

  const hasAnyGuestAccess = Object.values(guestAccess).some(v => v);

  // Public landing page view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-6 py-16 max-w-5xl">
          <div className="text-center">
            {/* Circle Image */}
            {circle.image && (
              <div className="mb-8 rounded-full overflow-hidden w-32 h-32 mx-auto border-4 border-primary/20">
                <img
                  src={circle.image}
                  alt={circle.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Access Type Badge */}
            <div className="mb-4 flex items-center justify-center gap-2">
              {circle.access_type === 'open' && (
                <Badge variant="default">
                  <Globe className="h-3 w-3 mr-1" />
                  Open to Join
                </Badge>
              )}
              {circle.access_type === 'request' && (
                <Badge variant="secondary">
                  <Shield className="h-3 w-3 mr-1" />
                  Request to Join
                </Badge>
              )}
              {circle.access_type === 'invite' && (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Invite Only
                </Badge>
              )}
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {circle.member_ids.length} Members
              </Badge>
              {circle.is_open_circle && (
                <Badge variant="outline">
                  <Globe className="h-3 w-3 mr-1" />
                  Platform-Wide
                </Badge>
              )}
            </div>

            {/* Title & Description */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {circle.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {circle.description}
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 max-w-sm mx-auto">
              {/* Ticket waitlist — shown when a template is linked (overrides default CTA) */}
              {linkedTemplate ? (
                <WaitlistBlock
                  template={linkedTemplate}
                  profile={profile}
                  displayName={circle.name}
                  className="w-full"
                />
              ) : (
                <>
                  {circle.access_type === 'open' && (
                    <Button size="lg" className="w-full" onClick={handleJoinCircle}>
                      Join Circle
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {circle.access_type === 'request' && (
                    <Button size="lg" className="w-full" onClick={handleRequestAccess}>
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {circle.access_type === 'invite' && (
                    <Button size="lg" className="w-full" onClick={handleRequestAccess}>
                      Express Interest
                      <Mail className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {hasAnyGuestAccess && (
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <a href="#preview">Preview Content</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Long Description */}
      {circle.long_description && (
        <section className="border-b">
          <div className="container mx-auto px-6 py-16 max-w-3xl">
            <h2 className="text-2xl font-bold mb-6 text-center">About This Circle</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground">
              {circle.long_description}
            </div>
          </div>
        </section>
      )}

      {/* What Members Get Access To */}
      <section className="border-b">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h2 className="text-2xl font-bold mb-8 text-center">What Members Get Access To</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Group Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Daily discussions, updates, and conversations with other members
                </CardDescription>
                {guestAccess.feed && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Member Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with {circle.member_ids.length} members and build your network
                </CardDescription>
                {guestAccess.members && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Resources & Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access shared resources, guides, and documentation
                </CardDescription>
                {guestAccess.documents && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Events & Meetups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Join exclusive events, workshops, and networking sessions
                </CardDescription>
                {guestAccess.calendar && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Forum & Q&A
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Ask questions, share knowledge, and get support from the group
                </CardDescription>
                {guestAccess.forum && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Reviews & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share and read reviews from other group members
                </CardDescription>
                {guestAccess.reviews && (
                  <Badge variant="outline" className="mt-2">
                    Preview Available
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Guest Preview Section */}
      {hasAnyGuestAccess && (
        <section id="preview" className="border-b bg-muted/30">
          <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
            <h2 className="text-2xl font-bold mb-4">Preview Available Content</h2>
            <p className="text-muted-foreground mb-6">
              Some content is available for preview without joining. Click below to explore.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {guestAccess.feed && (
                <Button variant="outline" asChild>
                  <Link to={`/circles/${circle.id}/feed`}>
                    Preview Feed
                  </Link>
                </Button>
              )}
              {guestAccess.members && (
                <Button variant="outline" asChild>
                  <Link to={`/circles/${circle.id}`}>
                    View Members
                  </Link>
                </Button>
              )}
              {guestAccess.documents && (
                <Button variant="outline" asChild>
                  <Link to={`/circles/${circle.id}/documents`}>
                    Browse Documents
                  </Link>
                </Button>
              )}
              {guestAccess.calendar && (
                <Button variant="outline" asChild>
                  <Link to={`/circles/${circle.id}/events`}>
                    View Events
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              🔒 Full access requires membership
            </p>
          </div>
        </section>
      )}

      {/* Get Updates Section for Invite-Only */}
      {circle.access_type === 'invite' && (
        <section className="border-b">
          <div className="container mx-auto px-6 py-16 max-w-2xl text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Interested in Joining?</h2>
            <p className="text-muted-foreground mb-6">
              This is an invite-only circle. Leave your email and we'll let you know
              if an invitation becomes available.
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
                  'Express Interest'
                )}
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Final CTA */}
      {circle.access_type !== 'invite' && (
        <section className="border-b bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
            <p className="text-lg mb-6 opacity-90">
              Connect with {circle.member_ids.length} members in {circle.name}
            </p>
            {circle.access_type === 'open' && (
              <Button size="lg" variant="secondary" onClick={handleJoinCircle}>
                Join Circle
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {circle.access_type === 'request' && (
              <Button size="lg" variant="secondary" onClick={handleRequestAccess}>
                Request Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}