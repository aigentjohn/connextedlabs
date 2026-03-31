import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  ExternalLink,
  MessageCircle,
  Building2,
  Globe,
  Play,
  FileText,
  Github,
  Microscope,
  Rocket,
  Store,
  Check,
  Mail,
  User,
  ShoppingCart,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Gift,
  Loader2,
  Ticket,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { KitCommerceButton } from '@/app/components/KitCommerceButton';
import { WaitlistBlock } from '@/app/components/shared/WaitlistBlock';
import { templateApi, inventoryApi, waitlistApi, type TicketTemplate } from '@/services/ticketSystemService';
import { accessTicketService } from '@/services/accessTicketService';

interface OfferingDetail {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  website_url: string;
  demo_url: string;
  offering_type: string;
  stage: string;
  engagement_style: string;
  seeking_feedback: boolean;
  seeking_early_adopters: boolean;
  seeking_customers: boolean;
  seeking_partners: boolean;
  target_audience: string;
  pricing_model: string;
  pricing_details: string;
  company_id: string;
  owner_user_id: string;
  // Kit Commerce fields
  purchase_type?: string;
  kit_product_id?: string;
  kit_product_url?: string;
  kit_landing_page_url?: string;
  cta_text?: string;
  external_url?: string;
}

function getCtaLabel(purchaseType?: string, ctaText?: string): string {
  const custom = ctaText && ctaText.trim() !== '' && ctaText.trim().toLowerCase() !== 'get started'
    ? ctaText.trim() : null;
  switch (purchaseType) {
    case 'free_claim':    return custom || 'Claim Free Access';
    case 'kit_commerce':  return custom || 'Purchase Now';
    case 'external_link': return custom || 'Visit Website';
    case 'contact_only':  return custom || 'Get in Touch';
    default:              return custom || 'Learn More';
  }
}

export default function OfferingProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [offering, setOffering] = useState<OfferingDetail | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  // Linked ticket template (if one exists for this offering)
  const [linkedTemplate, setLinkedTemplate] = useState<TicketTemplate | null>(null);
  // Whether the current user already has an active access ticket for this offering
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // Inventory claim / waitlist state
  const [claimingTicket, setClaimingTicket] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'on_waitlist' | 'not_on_waitlist'>('idle');
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistTotal, setWaitlistTotal] = useState(0);

  // Inquiry form state
  const [inquirerName, setInquirerName] = useState('');
  const [inquirerEmail, setInquirerEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryType, setInquiryType] = useState('general');
  const [inquirySubject, setInquirySubject] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchOffering();
    }
  }, [slug]);

  useEffect(() => {
    if (profile) {
      setInquirerName(profile.name || '');
      setInquirerEmail(profile.email || '');
    }
  }, [profile]);

  const fetchOffering = async () => {
    try {
      setLoading(true);

      // Get offering
      const { data: offeringData, error } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();

      if (error || !offeringData) {
        toast.error('Offering not found');
        navigate('/markets');
        return;
      }

      setOffering(offeringData);

      // Track view
      await supabase.from('market_offering_views').insert({
        offering_id: offeringData.id,
        viewer_user_id: profile?.id || null,
      });

      // Get company if exists
      if (offeringData.company_id) {
        const { data: companyData } = await supabase
          .from('market_companies')
          .select('*')
          .eq('id', offeringData.company_id)
          .single();
        setCompany(companyData);
      }

      // Get owner
      const { data: ownerData } = await supabase
        .from('users')
        .select('name, email, avatar')
        .eq('id', offeringData.owner_user_id)
        .single();
      setOwner(ownerData);

      // Get market placements
      const { data: placementsData } = await supabase
        .from('market_placements')
        .select('market_type')
        .eq('offering_id', offeringData.id)
        .eq('is_active', true);
      setMarkets(placementsData?.map((p) => p.market_type) || []);

      // Get links
      const { data: linksData } = await supabase
        .from('market_offering_links')
        .select('*')
        .eq('offering_id', offeringData.id)
        .order('display_order');
      setLinks(linksData || []);

      // Get media
      const { data: mediaData } = await supabase
        .from('market_offering_media')
        .select('*')
        .eq('offering_id', offeringData.id)
        .order('display_order');
      setMedia(mediaData || []);

      // Get features
      const { data: featuresData } = await supabase
        .from('market_offering_features')
        .select('*')
        .eq('offering_id', offeringData.id)
        .order('display_order');
      setFeatures(featuresData || []);

      // Get linked ticket template (public endpoint — works for logged-out visitors)
      try {
        const { templates: tmplList } = await templateApi.forOffering(offeringData.id);
        const tmpl = tmplList?.[0] ?? null;
        setLinkedTemplate(tmpl);

        // If user is logged in, check waitlist position for this offering
        if (profile?.id && tmpl) {
          try {
            const pos = await waitlistApi.getPosition('marketplace_offering', offeringData.id);
            if (pos.onWaitlist) {
              setWaitlistStatus('on_waitlist');
              setWaitlistPosition(pos.position);
              setWaitlistTotal(pos.total);
            } else {
              setWaitlistStatus('not_on_waitlist');
              setWaitlistTotal(pos.total);
            }
          } catch {
            setWaitlistStatus('not_on_waitlist');
          }
        }
      } catch (tmplErr) {
        console.warn('Could not load linked ticket template:', tmplErr);
      }

      // Check whether the logged-in user already has an access ticket for this offering
      if (profile?.id) {
        try {
          setCheckingAccess(true);
          const ticket = await accessTicketService.getUserTicket(profile.id, 'marketplace_offering', offeringData.id);
          const active = ticket && ticket.status === 'active' &&
            (!ticket.expires_at || new Date(ticket.expires_at) > new Date());
          setHasAccess(!!active);
        } catch (accessErr) {
          console.warn('Access check failed (non-fatal):', accessErr);
          setHasAccess(false);
        } finally {
          setCheckingAccess(false);
        }
      }
    } catch (error) {
      console.error('Error fetching offering:', error);
      toast.error('Failed to load offering');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!profile && (!inquirerName.trim() || !inquirerEmail.trim())) {
      toast.error('Please enter your name and email');
      return;
    }

    try {
      setSubmittingInquiry(true);

      const { error } = await supabase.from('market_inquiries').insert({
        offering_id: offering?.id,
        inquirer_user_id: profile?.id || null,
        inquirer_name: profile ? profile.name : inquirerName,
        inquirer_email: profile ? profile.email : inquirerEmail,
        inquiry_type: inquiryType,
        subject: inquirySubject || `Inquiry about ${offering?.name}`,
        message: inquiryMessage,
        status: 'new',
      });

      if (error) throw error;

      toast.success('Inquiry sent! The founder will be in touch soon.');
      setShowInquiryForm(false);
      setInquiryMessage('');
      setInquirySubject('');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'website':
        return Globe;
      case 'demo':
        return Play;
      case 'docs':
        return FileText;
      case 'github':
        return Github;
      default:
        return ExternalLink;
    }
  };

  const getMarketIcon = (type: string) => {
    switch (type) {
      case 'discovery':
        return Microscope;
      case 'launch':
        return Rocket;
      case 'marketplace':
        return Store;
      default:
        return Store;
    }
  };

  const getMarketName = (type: string) => {
    switch (type) {
      case 'discovery':
        return 'Discovery Lab';
      case 'launch':
        return 'Launch Pad';
      case 'marketplace':
        return 'Marketplace';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading offering...</p>
      </div>
    );
  }

  if (!offering) {
    return null;
  }

  const isOwner = profile?.id === offering.owner_user_id;

  const handleFreeClaim = async () => {
    if (!profile) {
      toast.error('Please sign in to claim free access');
      return;
    }
    try {
      setClaiming(true);
      await accessTicketService.createTicket({
        userId: profile.id,
        containerType: 'marketplace_offering' as any,
        containerId: offering.id,
        acquisitionSource: 'direct_enrollment',
        ticketType: 'free',
        pricePaidCents: 0,
        originalPriceCents: 0,
      });
      setHasAccess(true);
      toast.success('Access granted! You can now access this offering.');
    } catch (err: any) {
      console.error('Free claim error:', err);
      if (err?.message?.includes('duplicate') || err?.code === '23505') {
        setHasAccess(true);
        toast.info('You already have access to this offering.');
      } else {
        toast.error('Could not grant access. Please try again or contact support.');
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimTicket = async () => {
    if (!profile || !linkedTemplate) return;
    try {
      setClaimingTicket(true);
      const { items } = await inventoryApi.listByTemplate(linkedTemplate.id);
      const available = items.find(i => i.status === 'available');
      if (!available) {
        toast.error('No tickets left — the inventory was just claimed. Try joining the waitlist.');
        return;
      }
      await inventoryApi.assign(available.id, { userId: profile.id, pricePaidCents: 0 });
      toast.success('Ticket claimed! Go to My Tickets to redeem it.', {
        action: { label: 'My Tickets', onClick: () => navigate('/my-tickets') },
      });
    } catch (err: any) {
      toast.error(`Could not claim ticket: ${err.message}`);
    } finally {
      setClaimingTicket(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!profile || !linkedTemplate) return;
    try {
      setJoiningWaitlist(true);
      const result = await waitlistApi.join(
        'marketplace_offering',
        offering.id,
        offering.name,
        linkedTemplate.id,
      );
      if (result.alreadyOnWaitlist) {
        setWaitlistStatus('on_waitlist');
        setWaitlistPosition(result.position);
        setWaitlistTotal(result.total);
        toast.info('You\'re already on this waitlist.');
      } else {
        setWaitlistStatus('on_waitlist');
        setWaitlistPosition(result.position);
        setWaitlistTotal(result.total);
        toast.success(`You're #${result.position} on the waitlist. We'll notify you when a ticket is available.`);
      }
    } catch (err: any) {
      toast.error(`Could not join waitlist: ${err.message}`);
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    try {
      await waitlistApi.leave('marketplace_offering', offering.id);
      setWaitlistStatus('not_on_waitlist');
      setWaitlistPosition(null);
      toast.success('Removed from waitlist.');
    } catch (err: any) {
      toast.error(`Could not leave waitlist: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: offering.name },
        ]}
      />

      {/* Cover Image */}
      {offering.cover_image_url && (
        <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={offering.cover_image_url}
            alt={offering.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left - Logo & Basic Info */}
        <div className="flex-1">
          <div className="flex items-start gap-4">
            {offering.logo_url ? (
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={offering.logo_url}
                  alt={offering.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            )}

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {markets.map((market) => {
                  const Icon = getMarketIcon(market);
                  return (
                    <Badge key={market} variant="outline">
                      <Icon className="w-3 h-3 mr-1" />
                      {getMarketName(market)}
                    </Badge>
                  );
                })}
              </div>
              
              <h1 className="text-3xl font-bold">{offering.name}</h1>
              
              {offering.tagline && (
                <p className="text-xl text-gray-600">{offering.tagline}</p>
              )}

              <div className="flex items-center gap-3 text-sm text-gray-600">
                {company && (
                  <>
                    <button
                      onClick={() => navigate(`/markets/companies/${company.slug}`)}
                      className="hover:text-indigo-600 transition-colors"
                    >
                      by {company.name}
                    </button>
                    <span>•</span>
                  </>
                )}
                <Badge variant="outline" className="capitalize">
                  {offering.offering_type}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Right - CTAs */}
        <div className="space-y-3">
          {/* ── YOU HAVE ACCESS banner ── */}
          {hasAccess && linkedTemplate?.unlocks?.containerId && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-800">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="font-semibold">You have access!</span>
              </div>
              <p className="text-sm text-green-700">
                Your access ticket for <strong>{offering.name}</strong> is active.
              </p>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const ct = linkedTemplate.unlocks.containerType;
                  const cid = linkedTemplate.unlocks.containerId;
                  const pathMap: Record<string, string> = {
                    program: `/programs/${cid}`,
                    course: `/courses/${cid}`,
                    circle: `/circles/${cid}`,
                    event: `/events/${cid}`,
                    library: `/libraries/${cid}`,
                    playlist: `/playlists/${cid}`,
                  };
                  navigate(pathMap[ct ?? ''] || '/home');
                }}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Access {linkedTemplate.unlocks.containerName || offering.name}
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          )}

          {/* ── Inventory Ticket Claim / Waitlist ── */}
          {!hasAccess && !checkingAccess && linkedTemplate && (() => {
            const inventoryCount = linkedTemplate.inventoryCount ?? 0;
            const assignedCount = linkedTemplate.assignedCount ?? 0;
            const available = Math.max(0, inventoryCount - assignedCount);
            const hasInventory = inventoryCount > 0;

            if (!profile) {
              return (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <Ticket className="w-4 h-4 inline mr-1" />
                  {available > 0
                    ? 'Tickets are available — sign in to claim yours.'
                    : 'Sign in to join the waitlist for this offering.'}
                </div>
              );
            }

            if (available > 0) {
              return (
                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    onClick={handleClaimTicket}
                    disabled={claimingTicket}
                  >
                    {claimingTicket ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Ticket className="w-4 h-4 mr-2" />
                    )}
                    {claimingTicket ? 'Claiming…' : 'Claim Ticket'}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {available} ticket{available !== 1 ? 's' : ''} available — go to <a href="/my-tickets" className="underline text-indigo-600">My Tickets</a> to redeem after claiming.
                  </p>
                </div>
              );
            }

            if (waitlistStatus === 'on_waitlist') {
              return (
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold">
                      <Clock className="w-4 h-4" />
                      You're on the waitlist
                    </div>
                    {waitlistPosition !== null && (
                      <span className="text-sm font-bold text-amber-900">
                        #{waitlistPosition} of {waitlistTotal}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-700">
                    We'll notify you when a ticket becomes available.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                    onClick={handleLeaveWaitlist}
                  >
                    Leave Waitlist
                  </Button>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full md:w-auto border-amber-400 text-amber-700 hover:bg-amber-50"
                  onClick={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                >
                  {joiningWaitlist ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  {joiningWaitlist ? 'Joining…' : 'Join Waitlist'}
                </Button>
                {hasInventory && (
                  <p className="text-xs text-gray-500">All tickets are currently claimed. Join to get notified when one opens up.</p>
                )}
              </div>
            );
          })()}

          {/* Free Claim Button — only when no linked template exists */}
          {!hasAccess && !linkedTemplate && offering.purchase_type === 'free_claim' && (
            profile ? (
              <Button
                size="lg"
                className="w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                onClick={handleFreeClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Gift className="w-4 h-4 mr-2" />
                )}
                {claiming ? 'Granting access…' : getCtaLabel(offering.purchase_type, offering.cta_text)}
              </Button>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <Gift className="w-4 h-4 inline mr-1" />
                This offering is free — sign in to claim your access.
              </div>
            )
          )}

          {/* Kit Commerce Purchase Button */}
          {!hasAccess && offering.purchase_type === 'kit_commerce' && offering.kit_product_url && (
            <KitCommerceButton
              productUrl={offering.kit_product_url}
              buttonText={getCtaLabel(offering.purchase_type, offering.cta_text)}
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            />
          )}

          {/* External Link Button */}
          {offering.purchase_type === 'external_link' && offering.external_url && (
            <Button
              asChild
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              <a href={offering.external_url} target="_blank" rel="noopener noreferrer">
                <Globe className="w-4 h-4 mr-2" />
                {getCtaLabel(offering.purchase_type, offering.cta_text)}
              </a>
            </Button>
          )}

          {/* Kit Landing Page Link */}
          {offering.kit_landing_page_url && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full md:w-auto border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <a 
                href={offering.kit_landing_page_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Learn More
              </a>
            </Button>
          )}

          {isOwner && (
            <Button
              variant="outline"
              onClick={() => navigate(`/markets/edit-offering/${offering.id}`)}
              className="w-full md:w-auto"
            >
              Edit Offering
            </Button>
          )}
          
          <Dialog open={showInquiryForm} onOpenChange={setShowInquiryForm}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="w-full md:w-auto">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contact {owner?.name || 'Founder'}</DialogTitle>
                <DialogDescription>
                  Send an inquiry about {offering.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {!profile && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Your Name</label>
                      <Input
                        value={inquirerName}
                        onChange={(e) => setInquirerName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Your Email</label>
                      <Input
                        type="email"
                        value={inquirerEmail}
                        onChange={(e) => setInquirerEmail(e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Type of Inquiry</label>
                  <Select value={inquiryType} onValueChange={setInquiryType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">General Question</SelectItem>
                      <SelectItem value="feedback">Provide Feedback</SelectItem>
                      <SelectItem value="early_access">Request Early Access</SelectItem>
                      <SelectItem value="demo">Schedule Demo</SelectItem>
                      <SelectItem value="purchase">Purchase Inquiry</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Subject (optional)</label>
                  <Input
                    value={inquirySubject}
                    onChange={(e) => setInquirySubject(e.target.value)}
                    placeholder="Brief subject line"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <Textarea
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Tell us more about your interest..."
                    rows={5}
                  />
                </div>

                <Button
                  onClick={handleSubmitInquiry}
                  disabled={submittingInquiry}
                  className="w-full"
                >
                  {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seeking Badges */}
      {(offering.seeking_feedback ||
        offering.seeking_early_adopters ||
        offering.seeking_customers ||
        offering.seeking_partners) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-blue-900">Currently seeking:</span>
              {offering.seeking_feedback && (
                <Badge className="bg-purple-600">Feedback</Badge>
              )}
              {offering.seeking_early_adopters && (
                <Badge className="bg-blue-600">Early Adopters</Badge>
              )}
              {offering.seeking_customers && (
                <Badge className="bg-green-600">Customers</Badge>
              )}
              {offering.seeking_partners && (
                <Badge className="bg-orange-600">Partners</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          {offering.description && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">About</h2>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{offering.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          {features.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Key Features</h2>
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature.feature_text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Screenshots/Media */}
          {media.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Screenshots</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {media.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.caption || 'Screenshot'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {item.caption && (
                        <p className="text-sm text-gray-600">{item.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Pricing */}
          {offering.pricing_model && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Pricing</h3>
                <div>
                  <Badge variant="outline" className="capitalize">
                    {offering.pricing_model.replace('_', ' ')}
                  </Badge>
                  {offering.pricing_details && (
                    <p className="text-sm text-gray-600 mt-2">{offering.pricing_details}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Audience */}
          {offering.target_audience && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Target Audience</h3>
                <p className="text-sm text-gray-700">{offering.target_audience}</p>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {(offering.website_url || offering.demo_url || links.length > 0) && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Links</h3>
                <div className="space-y-2">
                  {offering.website_url && (
                    <a
                      href={offering.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  {offering.demo_url && (
                    <a
                      href={offering.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                    >
                      <Play className="w-4 h-4" />
                      Demo
                    </a>
                  )}
                  {links.map((link) => {
                    const Icon = getLinkIcon(link.link_type);
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <Icon className="w-4 h-4" />
                        {link.title || link.link_type}
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Founder */}
          {owner && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold">Founder</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium">{owner.name}</p>
                    <p className="text-xs text-gray-600">Creator</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}