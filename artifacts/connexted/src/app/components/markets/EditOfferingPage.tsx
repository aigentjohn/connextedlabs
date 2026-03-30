import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Package, ArrowLeft, Loader2, Trash2, ShoppingCart, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

const OFFERING_TYPES = [
  { value: 'software', label: 'Software/SaaS' },
  { value: 'service', label: 'Services' },
  { value: 'physical', label: 'Physical Products' },
  { value: 'digital', label: 'Digital Products' },
  { value: 'hardware', label: 'Hardware' },
];

const ENGAGEMENT_STYLES = [
  { value: 'self_serve', label: 'Self-Serve (users can sign up directly)' },
  { value: 'talk_to_founder', label: 'Talk to Founder (inquiry required)' },
  { value: 'quick_start', label: 'Quick Start (guided onboarding)' },
];

const PRICING_MODELS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'one_time', label: 'One-Time Payment' },
  { value: 'contact_us', label: 'Contact for Pricing' },
  { value: 'custom', label: 'Custom Pricing' },
];

interface Company {
  id: string;
  name: string;
}

interface Market {
  id: string;
  name: string;
  slug: string;
}

export default function EditOfferingPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  // Linked ticket templates (read-only, shown for admin context)
  const [linkedTemplates, setLinkedTemplates] = useState<Array<{ id: string; name: string; inventoryCount: number; assignedCount: number }>>([]);
  
  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    slug: '',
    tagline: '',
    description: '',
    offering_type: '',
    category: '',
    engagement_style: 'talk_to_founder',
    pricing_model: '',
    pricing_details: '',
    target_audience: '',
    website_url: '',
    demo_url: '',
    seeking_feedback: false,
    seeking_early_adopters: false,
    seeking_customers: false,
    seeking_partners: false,
    selected_markets: [] as string[],
    // Kit Commerce fields
    purchase_type: '' as string,
    kit_product_id: '' as string,
    kit_product_url: '' as string,
    kit_landing_page_url: '' as string,
    cta_text: '' as string,
  });

  useEffect(() => {
    if (profile?.id && id) {
      fetchData();
    }
  }, [profile, id]);

  const fetchData = async () => {
    if (!profile?.id || !id) return;

    try {
      setLoadingData(true);

      // Fetch the offering
      const { data: offering, error: offeringError } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('id', id)
        .eq('owner_user_id', profile.id)
        .single();

      if (offeringError) {
        console.error('Error fetching offering:', offeringError);
        toast.error('Failed to load offering');
        navigate('/my-ventures');
        return;
      }

      if (!offering) {
        toast.error('Offering not found or you do not have permission to edit it');
        navigate('/my-ventures');
        return;
      }

      // Fetch user's companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('market_companies')
        .select('id, name')
        .eq('owner_user_id', profile.id)
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch active markets
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (marketsError) throw marketsError;
      setMarkets(marketsData || []);

      // Fetch current market placements
      const { data: placementsData, error: placementsError } = await supabase
        .from('market_placements')
        .select('market_id')
        .eq('offering_id', id);

      if (placementsError) throw placementsError;

      const selectedMarketIds = placementsData?.map(p => p.market_id) || [];

      // Populate form with offering data (including Kit Commerce fields)
      setFormData({
        company_id: offering.company_id || '',
        name: offering.name || '',
        slug: offering.slug || '',
        tagline: offering.tagline || '',
        description: offering.description || '',
        offering_type: offering.offering_type || '',
        category: offering.category || '',
        engagement_style: offering.engagement_style || 'talk_to_founder',
        pricing_model: offering.pricing_model || '',
        pricing_details: offering.pricing_details || '',
        target_audience: offering.target_audience || '',
        website_url: offering.website_url || '',
        demo_url: offering.demo_url || '',
        seeking_feedback: offering.seeking_feedback || false,
        seeking_early_adopters: offering.seeking_early_adopters || false,
        seeking_customers: offering.seeking_customers || false,
        seeking_partners: offering.seeking_partners || false,
        selected_markets: selectedMarketIds,
        purchase_type: offering.purchase_type || '',
        kit_product_id: offering.kit_product_id || '',
        kit_product_url: offering.kit_product_url || '',
        kit_landing_page_url: offering.kit_landing_page_url || '',
        cta_text: offering.cta_text || '',
      });

      // Load linked ticket templates (admin context — read from KV via server)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/ticket-templates/for-container?offeringId=${id}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              ...(session?.access_token ? { 'X-User-Token': session.access_token } : {}),
            },
          }
        );
        if (res.ok) {
          const { templates } = await res.json();
          setLinkedTemplates((templates || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            inventoryCount: t.inventoryCount || 0,
            assignedCount: t.assignedCount || 0,
          })));
        }
      } catch (tmplErr) {
        console.warn('Could not load linked templates:', tmplErr);
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMarketToggle = (marketId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_markets: prev.selected_markets.includes(marketId)
        ? prev.selected_markets.filter(id => id !== marketId)
        : [...prev.selected_markets, marketId]
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.company_id) {
      toast.error('Please select a company');
      return false;
    }

    if (!formData.name.trim()) {
      toast.error('Offering name is required');
      return false;
    }

    if (!formData.slug.trim()) {
      toast.error('Offering slug is required');
      return false;
    }

    // Slug validation
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }

    if (!formData.offering_type) {
      toast.error('Offering type is required');
      return false;
    }

    if (formData.selected_markets.length === 0) {
      toast.error('Please select at least one market to list this offering');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!profile?.id || !id) {
      toast.error('You must be logged in to edit an offering');
      return;
    }

    try {
      setLoading(true);

      // Check if slug is unique (excluding current offering)
      const { data: existingOffering } = await supabase
        .from('market_offerings')
        .select('id')
        .eq('slug', formData.slug)
        .neq('id', id)
        .single();

      if (existingOffering) {
        toast.error('This offering slug is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Update the offering (including Kit Commerce fields)
      const { error: offeringError } = await supabase
        .from('market_offerings')
        .update({
          company_id: formData.company_id || null,
          name: formData.name,
          slug: formData.slug,
          tagline: formData.tagline || null,
          description: formData.description || null,
          offering_type: formData.offering_type,
          category: formData.category || null,
          engagement_style: formData.engagement_style,
          pricing_model: formData.pricing_model || null,
          pricing_details: formData.pricing_details || null,
          target_audience: formData.target_audience || null,
          website_url: formData.website_url || null,
          demo_url: formData.demo_url || null,
          seeking_feedback: formData.seeking_feedback,
          seeking_early_adopters: formData.seeking_early_adopters,
          seeking_customers: formData.seeking_customers,
          seeking_partners: formData.seeking_partners,
          // Kit Commerce fields
          purchase_type: formData.purchase_type || null,
          kit_product_id: formData.kit_product_id || null,
          kit_product_url: formData.kit_product_url || null,
          kit_landing_page_url: formData.kit_landing_page_url || null,
          cta_text: formData.cta_text || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (offeringError) {
        console.error('Error updating offering:', offeringError);
        toast.error('Failed to update offering. Please try again.');
        return;
      }

      // Update market placements - delete old ones and insert new ones
      const { error: deleteError } = await supabase
        .from('market_placements')
        .delete()
        .eq('offering_id', id);

      if (deleteError) {
        console.error('Error deleting old placements:', deleteError);
      }

      if (formData.selected_markets.length > 0) {
        const placements = formData.selected_markets.map(marketId => ({
          offering_id: id,
          market_id: marketId,
          is_active: true,
        }));

        const { error: placementsError } = await supabase
          .from('market_placements')
          .insert(placements);

        if (placementsError) {
          console.error('Error creating market placements:', placementsError);
          toast.warning('Offering updated but market placements may have failed');
        }
      }

      toast.success('Offering updated successfully!');
      navigate('/my-ventures');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.id || !id) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('market_offerings')
        .delete()
        .eq('id', id)
        .eq('owner_user_id', profile.id);

      if (error) {
        console.error('Error deleting offering:', error);
        toast.error('Failed to delete offering');
        return;
      }

      toast.success('Offering deleted successfully');
      navigate('/my-ventures');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Loading offering data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: 'My Ventures', href: '/my-ventures' },
          { label: 'Edit Offering' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/my-ventures')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Offering</h1>
            <p className="text-gray-600">Update your product or service details</p>
          </div>
        </div>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Offering
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this offering. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Offering'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-indigo-600" />
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Core details about your offering
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="company_id">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => handleChange('company_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Offering Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Offering Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., AI Marketing Platform"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="e.g., ai-marketing-platform"
                required
              />
              <p className="text-sm text-gray-500">
                This will be used in your offering's URL: /markets/offerings/{formData.slug || 'your-slug'}
              </p>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="A brief, catchy description"
                maxLength={200}
              />
              <p className="text-sm text-gray-500">
                {formData.tagline.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Detailed description of your offering, its features, and benefits..."
                rows={5}
              />
            </div>

            {/* Offering Type */}
            <div className="space-y-2">
              <Label htmlFor="offering_type">
                Offering Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.offering_type}
                onValueChange={(value) => handleChange('offering_type', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select offering type" />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="e.g., Marketing, Sales, Analytics"
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                placeholder="e.g., Small businesses, Enterprise, Startups"
              />
            </div>
          </CardContent>
        </Card>

        {/* Engagement & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement & Pricing</CardTitle>
            <CardDescription>
              How customers can engage with your offering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Engagement Style */}
            <div className="space-y-2">
              <Label htmlFor="engagement_style">Engagement Style</Label>
              <Select
                value={formData.engagement_style}
                onValueChange={(value) => handleChange('engagement_style', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select engagement style" />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Model */}
            <div className="space-y-2">
              <Label htmlFor="pricing_model">Pricing Model</Label>
              <Select
                value={formData.pricing_model}
                onValueChange={(value) => handleChange('pricing_model', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing model" />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Details */}
            <div className="space-y-2">
              <Label htmlFor="pricing_details">Pricing Details</Label>
              <Textarea
                id="pricing_details"
                value={formData.pricing_details}
                onChange={(e) => handleChange('pricing_details', e.target.value)}
                placeholder="e.g., Starting at $99/month, Free tier available, Custom pricing for enterprise"
                rows={3}
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            {/* Demo URL */}
            <div className="space-y-2">
              <Label htmlFor="demo_url">Demo/Video URL</Label>
              <Input
                id="demo_url"
                type="url"
                value={formData.demo_url}
                onChange={(e) => handleChange('demo_url', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </CardContent>
        </Card>

        {/* What You're Seeking */}
        <Card>
          <CardHeader>
            <CardTitle>What You're Seeking</CardTitle>
            <CardDescription>
              Let others know what you're looking for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_feedback"
                checked={formData.seeking_feedback}
                onCheckedChange={(checked) => handleChange('seeking_feedback', checked)}
              />
              <Label htmlFor="seeking_feedback" className="cursor-pointer">
                Feedback & User Testing
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_early_adopters"
                checked={formData.seeking_early_adopters}
                onCheckedChange={(checked) => handleChange('seeking_early_adopters', checked)}
              />
              <Label htmlFor="seeking_early_adopters" className="cursor-pointer">
                Early Adopters
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_customers"
                checked={formData.seeking_customers}
                onCheckedChange={(checked) => handleChange('seeking_customers', checked)}
              />
              <Label htmlFor="seeking_customers" className="cursor-pointer">
                Paying Customers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_partners"
                checked={formData.seeking_partners}
                onCheckedChange={(checked) => handleChange('seeking_partners', checked)}
              />
              <Label htmlFor="seeking_partners" className="cursor-pointer">
                Partners & Collaborators
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Kit Commerce Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle>Kit Commerce Integration</CardTitle>
                <CardDescription>
                  Link this offering to a Kit (ConvertKit) product to enable purchase → ticket auto-assignment
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Architecture callout */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">How the Kit → Ticket pipeline works</p>
              <ol className="list-decimal ml-4 space-y-1 text-xs">
                <li>Customer buys this offering on Kit Commerce</li>
                <li>Kit fires a purchase webhook to this platform</li>
                <li>Webhook matches the Kit product ID to the linked ticket template</li>
                <li>First available inventory ticket is auto-assigned to the buyer</li>
                <li>Buyer's access_ticket activates; they can now enter the linked container</li>
              </ol>
              <p className="text-xs mt-2">
                <strong>To complete the chain:</strong> after saving the Kit Product ID here, open
                Ticket Templates admin, create a template, link <em>this</em> offering — the form
                will auto-copy the Kit Product ID onto the template for fast webhook routing.
              </p>
            </div>

            {/* Purchase type */}
            <div className="space-y-2">
              <Label htmlFor="purchase_type">Purchase Type</Label>
              <Select
                value={formData.purchase_type || 'none'}
                onValueChange={v => handleChange('purchase_type', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-gray-500">No purchase flow</span></SelectItem>
                  <SelectItem value="kit_commerce">Kit Commerce (auto-assign ticket on purchase)</SelectItem>
                  <SelectItem value="external">External URL (redirect only)</SelectItem>
                  <SelectItem value="inquiry">Contact / Inquiry only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.purchase_type === 'kit_commerce' || formData.purchase_type === 'external') && (
              <>
                {/* Kit Product ID */}
                <div className="space-y-2">
                  <Label htmlFor="kit_product_id">
                    Kit Product ID
                    {formData.purchase_type === 'kit_commerce' && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </Label>
                  <Input
                    id="kit_product_id"
                    value={formData.kit_product_id}
                    onChange={e => handleChange('kit_product_id', e.target.value)}
                    placeholder="e.g. 456789  (numeric ID from Kit dashboard)"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Found in Kit → Products → your product → URL bar or API response.
                    This is the canonical source — the linked ticket template will copy it automatically.
                  </p>
                </div>

                {/* Kit Product URL */}
                <div className="space-y-2">
                  <Label htmlFor="kit_product_url">Kit Product / Checkout URL</Label>
                  <Input
                    id="kit_product_url"
                    type="url"
                    value={formData.kit_product_url}
                    onChange={e => handleChange('kit_product_url', e.target.value)}
                    placeholder="https://pay.yoursite.com/checkout/abc123"
                  />
                  <p className="text-xs text-gray-500">
                    The direct checkout URL. Used for the purchase button on the offering profile page.
                  </p>
                </div>

                {/* Kit Landing Page URL */}
                <div className="space-y-2">
                  <Label htmlFor="kit_landing_page_url">Kit Landing Page URL (optional)</Label>
                  <Input
                    id="kit_landing_page_url"
                    type="url"
                    value={formData.kit_landing_page_url}
                    onChange={e => handleChange('kit_landing_page_url', e.target.value)}
                    placeholder="https://yoursite.ck.page/your-product"
                  />
                  <p className="text-xs text-gray-500">
                    If you have a separate Kit landing page, link it here for a "Learn More" button.
                  </p>
                </div>

                {/* CTA text */}
                <div className="space-y-2">
                  <Label htmlFor="cta_text">Button CTA Text</Label>
                  <Input
                    id="cta_text"
                    value={formData.cta_text}
                    onChange={e => handleChange('cta_text', e.target.value)}
                    placeholder="e.g. Get Access, Purchase Now, Buy Ticket"
                    maxLength={50}
                  />
                </div>
              </>
            )}

            {/* Linked templates (read-only) */}
            {linkedTemplates.length > 0 && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Linked Ticket Templates
                </p>
                {linkedTemplates.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {t.inventoryCount} inventory · {t.assignedCount} assigned
                      </span>
                    </div>
                    <a
                      href={`/platform-admin/ticket-templates`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Manage <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Placement */}
        <Card>
          <CardHeader>
            <CardTitle>Market Placement</CardTitle>
            <CardDescription>
              Select which markets to list this offering in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {markets.map((market) => (
              <div key={market.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`market-${market.id}`}
                  checked={formData.selected_markets.includes(market.id)}
                  onCheckedChange={() => handleMarketToggle(market.id)}
                />
                <Label htmlFor={`market-${market.id}`} className="cursor-pointer">
                  {market.name}
                </Label>
              </div>
            ))}
            {markets.length === 0 && (
              <p className="text-sm text-gray-500">No active markets available</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/my-ventures')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}