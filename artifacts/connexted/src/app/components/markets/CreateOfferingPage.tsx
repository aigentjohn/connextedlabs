import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { checkMarketAccess } from '@/lib/tier-permissions';
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
import { Package, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

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

export default function CreateOfferingPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketAccess, setMarketAccess] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    company_id: searchParams.get('companyId') || '',
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
  });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile?.id) return;

    try {
      setLoadingData(true);

      // Check market access
      const access = await checkMarketAccess(profile.id);
      setMarketAccess(access);

      if (!access.canCreateOffering) {
        toast.error('You cannot create offerings with your current membership tier');
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

      if (!companiesData || companiesData.length === 0) {
        toast.error('You need to create a company first before adding offerings');
        navigate('/my-ventures');
        return;
      }

      setCompanies(companiesData);

      // If companyId from URL, validate it belongs to user
      if (searchParams.get('companyId')) {
        const companyExists = companiesData.some(c => c.id === searchParams.get('companyId'));
        if (!companyExists) {
          toast.error('Invalid company');
          navigate('/my-ventures');
          return;
        }
      } else {
        // Auto-select first company if no company specified
        setFormData(prev => ({ ...prev, company_id: companiesData[0].id }));
      }

      // Fetch active markets
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (marketsError) throw marketsError;
      setMarkets(marketsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'name' && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
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
    if (!profile?.id) {
      toast.error('You must be logged in to create an offering');
      return;
    }

    try {
      setLoading(true);

      // Check if slug is unique
      const { data: existingOffering } = await supabase
        .from('market_offerings')
        .select('id')
        .eq('slug', formData.slug)
        .single();

      if (existingOffering) {
        toast.error('This offering slug is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Create the offering
      const { data: newOffering, error: offeringError } = await supabase
        .from('market_offerings')
        .insert({
          company_id: formData.company_id || null,
          owner_user_id: profile.id,
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
          is_public: true,
          is_active: true,
        })
        .select()
        .single();

      if (offeringError) {
        console.error('Error creating offering:', offeringError);
        toast.error('Failed to create offering. Please try again.');
        return;
      }

      // Create market placements
      const placements = formData.selected_markets.map(marketId => ({
        offering_id: newOffering.id,
        market_id: marketId,
        is_active: true,
      }));

      const { error: placementsError } = await supabase
        .from('market_placements')
        .insert(placements);

      if (placementsError) {
        console.error('Error creating market placements:', placementsError);
        toast.warning('Offering created but market placements may have failed');
      }

      toast.success('Offering created successfully!');
      navigate('/my-ventures');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Loading...</p>
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
          { label: 'Create Offering' },
        ]}
      />

      {/* Header */}
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
          <h1 className="text-3xl font-bold text-gray-900">Create Offering</h1>
          <p className="text-gray-600">Add a product or service to your company</p>
        </div>
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
              <p className="text-sm text-gray-500">
                This offering will be listed under the selected company
              </p>
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
                placeholder="e.g., Project Management Pro"
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
                placeholder="e.g., project-management-pro"
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
                placeholder="Detailed description of your offering, features, benefits..."
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
                placeholder="e.g., Productivity, Marketing, Analytics"
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
                  <SelectValue />
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
                placeholder="Describe your pricing structure, tiers, or special offers..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* What You're Seeking */}
        <Card>
          <CardHeader>
            <CardTitle>What Are You Seeking?</CardTitle>
            <CardDescription>
              Help customers understand how they can engage
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
                Seeking Feedback (validation & user insights)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_early_adopters"
                checked={formData.seeking_early_adopters}
                onCheckedChange={(checked) => handleChange('seeking_early_adopters', checked)}
              />
              <Label htmlFor="seeking_early_adopters" className="cursor-pointer">
                Seeking Early Adopters (beta users)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_customers"
                checked={formData.seeking_customers}
                onCheckedChange={(checked) => handleChange('seeking_customers', checked)}
              />
              <Label htmlFor="seeking_customers" className="cursor-pointer">
                Seeking Customers (ready to buy)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seeking_partners"
                checked={formData.seeking_partners}
                onCheckedChange={(checked) => handleChange('seeking_partners', checked)}
              />
              <Label htmlFor="seeking_partners" className="cursor-pointer">
                Seeking Partners (collaborations & integrations)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Target Audience & Links */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                placeholder="Who is this offering for? e.g., Small business owners, Enterprise teams, Developers..."
                rows={2}
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

        {/* Market Placement */}
        <Card>
          <CardHeader>
            <CardTitle>
              Market Placement <span className="text-red-500">*</span>
            </CardTitle>
            <CardDescription>
              Select which markets to list this offering (you can select multiple)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {markets.map((market) => (
              <div key={market.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`market-${market.id}`}
                  checked={formData.selected_markets.includes(market.id)}
                  onCheckedChange={() => handleMarketToggle(market.id)}
                />
                <Label htmlFor={`market-${market.id}`} className="cursor-pointer font-medium">
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
                Creating...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Create Offering
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}