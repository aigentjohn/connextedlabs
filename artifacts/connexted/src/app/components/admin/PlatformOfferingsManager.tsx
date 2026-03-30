import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  Zap,
  TrendingUp,
  ArrowRight,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Tag,
  Calendar,
  Upload,
  RefreshCw,
  Package,
  Sparkles,
  Eye,
  CheckCircle,
  Edit,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { KitCommerceButton } from '@/app/components/KitCommerceButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  getMarketingLevelConfig,
  calculateMarketingLevel,
  MarketingLevelName,
  MARKETING_LEVELS,
} from '@/utils/offerings-marketing-levels';
import { importCompanyOfferings } from '@/utils/simple-offering-import';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface PlatformOffering {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  offering_type: string;
  kit_product_id: string;
  kit_product_url: string;
  kit_landing_page_url: string;
  purchase_type: string;
  external_url?: string;
  cta_text: string;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  linked_program_id?: string;
  linked_program?: any;
  linked_course_id?: string;
  linked_course?: any;
  enrollment_behavior?: string;
  enrollment_conditions?: any;
  marketing_level?: string;
  interest_tracking_enabled?: boolean;
  interest_form_type?: string;
  // Pricing fields stored directly
  base_price?: number;
  current_discount_code?: string;
  discount_description?: string;
  discount_percentage?: number;
  final_price?: number;
}

export default function PlatformOfferingsManager() {
  const { profile } = useAuth();
  const [offerings, setOfferings] = useState<PlatformOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffering, setEditingOffering] = useState<PlatformOffering | null>(null);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [linkedCourseId, setLinkedCourseId] = useState<string>('');
  const [linkedProgramId, setLinkedProgramId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    kit_product_id: '',
    kit_product_url: '',
    kit_landing_page_url: '',
    cta_text: 'Get Started',
    is_active: true,
    is_featured: false,
    purchase_type: 'kit_commerce', // 'kit_commerce', 'external_link', 'contact_only'
    external_url: '',
  });

  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    base_price: 99,
    current_discount_code: '',
    discount_description: '',
    discount_percentage: 0,
  });

  // Features list
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchOfferings();
    fetchAvailableCourses();
    fetchAvailablePrograms();
  }, []);

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      
      // Get platform company
      const { data: company } = await supabase
        .from('market_companies')
        .select('id')
        .eq('company_type', 'platform_company')
        .single();

      if (!company) {
        toast.error('Platform company not found. Please initialize first.');
        setLoading(false);
        return;
      }

      // Get offerings
      const { data: offeringsData, error } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOfferings(offeringsData || []);
    } catch (error: any) {
      console.error('Error fetching platform offerings:', error);
      toast.error('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('is_published', true)
        .order('title');

      if (!error) {
        setAvailableCourses(courses || []);
      }
    } catch (error: any) {
      console.error('Error fetching available courses:', error);
    }
  };

  const fetchAvailablePrograms = async () => {
    try {
      const { data: programs, error } = await supabase
        .from('programs')
        .select('id, name, slug')
        .order('name');

      if (!error) {
        setAvailablePrograms(programs || []);
      }
    } catch (error: any) {
      console.error('Error fetching available programs:', error);
    }
  };

  const handleSaveOffering = async () => {
    try {
      // Get platform company
      const { data: company } = await supabase
        .from('market_companies')
        .select('id')
        .eq('company_type', 'platform_company')
        .single();

      if (!company) {
        toast.error('Platform company not found');
        return;
      }

      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');

      const offeringData = {
        // ── Columns that have always existed in market_offerings ─────────────
        name: formData.name,
        slug,
        tagline: formData.tagline || null,
        description: formData.description || null,
        company_id: company.id,
        owner_user_id: profile?.id,
        offering_type: 'membership',
        is_public: true,
        is_active: formData.is_active,
        // ── Kit Commerce columns (added via apply-offerings-columns migration) ─
        purchase_type: formData.purchase_type,
        kit_product_id: formData.kit_product_id || null,
        kit_product_url: formData.kit_product_url || null,
        kit_landing_page_url: formData.kit_landing_page_url || null,
        cta_text: formData.cta_text || null,
        external_url: formData.external_url || null,
        is_featured: formData.is_featured,
        linked_course_id: linkedCourseId || null,
        linked_program_id: linkedProgramId || null,
      };

      if (editingOffering) {
        // Update
        const { error } = await supabase
          .from('market_offerings')
          .update(offeringData)
          .eq('id', editingOffering.id);

        if (error) throw error;
        toast.success('Offering updated successfully');
      } else {
        // Create
        const { error } = await supabase
          .from('market_offerings')
          .insert([offeringData]);

        if (error) throw error;
        toast.success('Offering created successfully');
      }

      setShowDialog(false);
      resetForm();
      fetchOfferings();
    } catch (error: any) {
      console.error('Error saving offering:', error);
      toast.error('Failed to save offering');
    }
  };

  const handleSavePricing = async () => {
    if (!editingOffering) return;

    try {
      const finalPrice = pricingForm.base_price * (1 - pricingForm.discount_percentage / 100);

      // Update pricing fields directly in market_offerings
      const { error } = await supabase
        .from('market_offerings')
        .update({
          base_price: pricingForm.base_price,
          current_discount_code: pricingForm.current_discount_code,
          discount_description: pricingForm.discount_description,
          discount_percentage: pricingForm.discount_percentage,
          final_price: finalPrice,
        })
        .eq('id', editingOffering.id);

      if (error) throw error;

      toast.success('Pricing updated successfully');
      setShowPricingDialog(false);
      fetchOfferings();
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing');
    }
  };

  const handleEditOffering = (offering: PlatformOffering) => {
    setEditingOffering(offering);
    setFormData({
      name: offering.name,
      tagline: offering.tagline,
      description: offering.description,
      kit_product_id: offering.kit_product_id || '',
      kit_product_url: offering.kit_product_url || '',
      kit_landing_page_url: offering.kit_landing_page_url || '',
      cta_text: offering.cta_text || 'Get Started',
      is_active: offering.is_active,
      is_featured: offering.is_featured,
      purchase_type: offering.purchase_type,
      external_url: offering.external_url || '',
    });
    setFeatures(offering.features || []);
    setLinkedCourseId(offering.linked_course_id || '');
    setLinkedProgramId(offering.linked_program_id || '');
    setShowDialog(true);
  };

  const handleEditPricing = (offering: PlatformOffering) => {
    setEditingOffering(offering);
    setPricingForm({
      base_price: offering.base_price || 99,
      current_discount_code: offering.current_discount_code || '',
      discount_description: offering.discount_description || '',
      discount_percentage: offering.discount_percentage || 0,
    });
    setShowPricingDialog(true);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tagline: '',
      description: '',
      kit_product_id: '',
      kit_product_url: '',
      kit_landing_page_url: '',
      cta_text: 'Get Started',
      is_active: true,
      is_featured: false,
      purchase_type: 'kit_commerce',
      external_url: '',
    });
    setFeatures([]);
    setEditingOffering(null);
    setLinkedCourseId('');
    setLinkedProgramId('');
  };

  const calculateFinalPrice = () => {
    return pricingForm.base_price * (1 - pricingForm.discount_percentage / 100);
  };

  const handleImportOfferings = async () => {
    if (!importJson.trim()) {
      toast.error('Please paste JSON data');
      return;
    }

    try {
      setImporting(true);
      const offeringsToImport = JSON.parse(importJson);

      // Get platform company ID
      const { data: company } = await supabase
        .from('market_companies')
        .select('id')
        .eq('company_type', 'platform_company')
        .single();

      if (!company) {
        toast.error('Platform company not found');
        return;
      }

      const result = await importCompanyOfferings(supabase, company.id, offeringsToImport);

      toast.success(`✅ Imported ${result.imported} offerings!`);

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast.error(`${result.errors.length} failed - see console`);
      }

      setShowImportDialog(false);
      setImportJson('');
      fetchOfferings();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Platform Offerings' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            Platform Offerings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage CONNEXTED LABS memberships, programs, and services in the Market
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Offering
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900">Platform Offerings in the Market</p>
              <p className="text-sm text-blue-700">
                These offerings appear in the Markets section alongside member companies. They link to Kit Commerce
                for payment processing. Update pricing and discount codes here to control what users see.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offerings List */}
      <Card>
        <CardHeader>
          <CardTitle>All Platform Offerings</CardTitle>
        </CardHeader>
        <CardContent>
          {offerings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No platform offerings yet</p>
              <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Offering
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offering</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Discount Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map((offering) => (
                  <TableRow key={offering.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{offering.name}</p>
                        <p className="text-sm text-gray-500">{offering.tagline}</p>
                        {offering.is_featured && (
                          <Badge className="mt-1 bg-yellow-500">Featured</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {offering.purchase_type === 'kit_commerce' && (
                        <div>
                          <Badge className="bg-blue-500">💳 Kit Commerce</Badge>
                          {offering.kit_product_id && (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1">
                              {offering.kit_product_id}
                            </code>
                          )}
                        </div>
                      )}
                      {offering.purchase_type === 'external_link' && (
                        <div>
                          <Badge className="bg-purple-500">🔗 External Link</Badge>
                          {offering.external_url && (
                            <a
                              href={offering.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline block mt-1 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          )}
                        </div>
                      )}
                      {offering.purchase_type === 'contact_only' && (
                        <Badge className="bg-amber-500">📧 Contact Only</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {offering.base_price ? (
                        <div className="space-y-1">
                          <p className="text-sm">
                            {offering.discount_percentage && offering.discount_percentage > 0 ? (
                              <>
                                <span className="line-through text-gray-400">
                                  ${offering.base_price}
                                </span>
                                {' → '}
                                <span className="font-semibold text-green-600">
                                  ${offering.final_price?.toFixed(2) || offering.base_price}
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold">
                                ${offering.base_price}
                              </span>
                            )}
                          </p>
                          {offering.discount_percentage && offering.discount_percentage > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {offering.discount_percentage}% off
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {offering.current_discount_code ? (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                            {offering.current_discount_code}
                          </code>
                          <button
                            onClick={() => {
                              copyToClipboard(offering.current_discount_code!);
                              toast.success('Code copied!');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {offering.is_active ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPricing(offering)}
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Pricing
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditOffering(offering)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/markets/offerings/${offering.slug}`, '_blank')}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Offering Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOffering ? 'Edit' : 'Create'} Platform Offering
            </DialogTitle>
            <DialogDescription>
              Configure the offering details. Pricing is managed separately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Offering Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="CONNEXTED LABS Membership"
              />
            </div>

            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Month-to-month access while we perfect the platform"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Detailed description of what this offering includes..."
              />
            </div>

            {/* Purchase Type Selector */}
            <div className="border-t pt-4">
              <Label htmlFor="purchase_type">Purchase Type</Label>
              <Select
                value={formData.purchase_type}
                onValueChange={(value) => setFormData({ ...formData, purchase_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kit_commerce">
                    💳 Kit Commerce - Full integration with pricing
                  </SelectItem>
                  <SelectItem value="external_link">
                    🔗 External Link - Referral to external site (new tab)
                  </SelectItem>
                  <SelectItem value="contact_only">
                    📧 Contact Only - No direct purchase, inquiry form only
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.purchase_type === 'kit_commerce' && 'Users purchase directly via Kit Commerce with pricing display'}
                {formData.purchase_type === 'external_link' && 'Users are redirected to an external URL in a new tab'}
                {formData.purchase_type === 'contact_only' && 'Users can only contact you about this offering'}
              </p>
            </div>

            {/* Conditional Fields Based on Purchase Type */}
            {formData.purchase_type === 'kit_commerce' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                <div>
                  <Label htmlFor="kit_product_id">Kit Product ID (Permalink) *</Label>
                  <Input
                    id="kit_product_id"
                    value={formData.kit_product_id}
                    onChange={(e) => setFormData({ ...formData, kit_product_id: e.target.value })}
                    placeholder="connexted-1-month-access"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The product permalink from ConvertKit Commerce
                  </p>
                </div>
                <div>
                  <Label htmlFor="kit_product_url">Kit Product URL</Label>
                  <Input
                    id="kit_product_url"
                    value={formData.kit_product_url}
                    onChange={(e) => setFormData({ ...formData, kit_product_url: e.target.value })}
                    placeholder="https://example.com/product"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The URL to the product page in ConvertKit Commerce
                  </p>
                </div>
                <div>
                  <Label htmlFor="kit_landing_page_url">Kit Landing Page URL</Label>
                  <Input
                    id="kit_landing_page_url"
                    value={formData.kit_landing_page_url}
                    onChange={(e) => setFormData({ ...formData, kit_landing_page_url: e.target.value })}
                    placeholder="https://example.com/landing"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The URL to the landing page for the product in ConvertKit Commerce
                  </p>
                </div>
              </div>
            )}

            {formData.purchase_type === 'external_link' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                <div>
                  <Label htmlFor="external_url">External URL *</Label>
                  <Input
                    id="external_url"
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                    placeholder="https://example.com/product"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The URL users will be directed to (opens in new tab)
                  </p>
                </div>
              </div>
            )}

            {formData.purchase_type === 'contact_only' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Users will only see contact/inquiry options. No direct purchase or external link.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="cta_text">Call-to-Action Button Text</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                placeholder={
                  formData.purchase_type === 'kit_commerce' ? 'Get Started' :
                  formData.purchase_type === 'external_link' ? 'Learn More' :
                  'Contact Us'
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Text shown on the action button
              </p>
            </div>

            <div>
              <Label>Features (What's Included)</Label>
              <div className="space-y-2 mt-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="flex-1">{feature}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFeature(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                    placeholder="Add a feature..."
                  />
                  <Button onClick={handleAddFeature} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Active in Market</Label>
                <p className="text-xs text-gray-500">Show this offering to users</p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_featured">Featured</Label>
                <p className="text-xs text-gray-500">Show in featured section</p>
              </div>
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="linked_course_id">Linked Course</Label>
              <Select
                value={linkedCourseId}
                onValueChange={(value) => setLinkedCourseId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Link this offering to a specific course
              </p>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="linked_program_id">Linked Program</Label>
              <Select
                value={linkedProgramId}
                onValueChange={(value) => setLinkedProgramId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Link this offering to a specific program
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveOffering}>
              {editingOffering ? 'Update' : 'Create'} Offering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pricing Configuration</DialogTitle>
            <DialogDescription>
              Set the pricing display for {editingOffering?.name}. These values are shown to users on the offering page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="base_price">Base Price ($)</Label>
              <Input
                id="base_price"
                type="number"
                value={pricingForm.base_price}
                onChange={(e) => setPricingForm({ ...pricingForm, base_price: parseFloat(e.target.value) })}
                placeholder="99"
              />
              <p className="text-xs text-gray-500 mt-1">The regular price before discounts</p>
            </div>

            <div>
              <Label htmlFor="discount_code">Current Discount Code</Label>
              <Input
                id="discount_code"
                value={pricingForm.current_discount_code}
                onChange={(e) => setPricingForm({ ...pricingForm, current_discount_code: e.target.value.toUpperCase() })}
                placeholder="BETA50"
              />
              <p className="text-xs text-gray-500 mt-1">The code users should use at checkout</p>
            </div>

            <div>
              <Label htmlFor="discount_description">Discount Description</Label>
              <Input
                id="discount_description"
                value={pricingForm.discount_description}
                onChange={(e) => setPricingForm({ ...pricingForm, discount_description: e.target.value })}
                placeholder="50% off for beta testers"
              />
              <p className="text-xs text-gray-500 mt-1">How you describe the discount</p>
            </div>

            <div>
              <Label htmlFor="discount_percentage">Discount Percentage (%)</Label>
              <Input
                id="discount_percentage"
                type="number"
                value={pricingForm.discount_percentage}
                onChange={(e) => setPricingForm({ ...pricingForm, discount_percentage: parseInt(e.target.value) })}
                placeholder="50"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Used to calculate final displayed price</p>
            </div>

            {/* Price Preview */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-green-900 mb-2">Price Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Base Price:</span>
                    <span className="line-through text-gray-500">${pricingForm.base_price}</span>
                  </div>
                  {pricingForm.discount_percentage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Discount:</span>
                      <span className="text-green-600">-{pricingForm.discount_percentage}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-green-300 pt-2">
                    <span className="font-semibold text-green-900">Final Price:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${calculateFinalPrice().toFixed(2)}
                    </span>
                  </div>
                  {pricingForm.current_discount_code && (
                    <div className="mt-3 p-2 bg-white rounded border border-green-300">
                      <p className="text-xs text-gray-600 mb-1">Discount Code:</p>
                      <code className="text-sm font-mono bg-green-100 px-2 py-1 rounded font-semibold">
                        {pricingForm.current_discount_code}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePricing}>
              Update Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Offerings from JSON</DialogTitle>
            <DialogDescription>
              Paste JSON data to import multiple offerings at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="importJson">JSON Data</Label>
              <Textarea
                id="importJson"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={10}
                placeholder="Paste JSON data here..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportOfferings} disabled={importing}>
              {importing ? 'Importing...' : 'Import Offerings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}