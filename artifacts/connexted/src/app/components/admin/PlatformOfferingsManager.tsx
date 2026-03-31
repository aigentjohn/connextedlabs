import { useState, useEffect, useCallback } from 'react';
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
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  RefreshCw,
  Package,
  Sparkles,
  Eye,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Copy,
  ExternalLink,
  Building2,
  ChevronRight,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { KitCommerceButton } from '@/app/components/KitCommerceButton';
import {
  getMarketingLevelConfig,
  calculateMarketingLevel,
  MarketingLevelName,
  MARKETING_LEVELS,
} from '@/utils/offerings-marketing-levels';
import { importCompanyOfferings } from '@/utils/simple-offering-import';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface Company {
  id: string;
  name: string;
  slug: string;
}

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
  base_price?: number;
  current_discount_code?: string;
  discount_description?: string;
  discount_percentage?: number;
  final_price?: number;
}

export default function PlatformOfferingsManager() {
  const { profile } = useAuth();

  // ── Company selection ────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // ── Offerings ────────────────────────────────────────────────────────────────
  const [offerings, setOfferings] = useState<PlatformOffering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  // ── Dialogs ──────────────────────────────────────────────────────────────────
  const [showDialog, setShowDialog] = useState(false);
  const [editingOffering, setEditingOffering] = useState<PlatformOffering | null>(null);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  // ── Linked content ───────────────────────────────────────────────────────────
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [linkedCourseId, setLinkedCourseId] = useState<string>('');
  const [linkedProgramId, setLinkedProgramId] = useState<string>('');

  // ── Form state ───────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    kit_product_id: '',
    kit_product_url: '',
    kit_landing_page_url: '',
    cta_text: '',
    is_active: true,
    is_featured: false,
    purchase_type: 'kit_commerce',
    external_url: '',
  });

  const [pricingForm, setPricingForm] = useState({
    base_price: 99,
    current_discount_code: '',
    discount_description: '',
    discount_percentage: 0,
  });

  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCompanies();
    fetchAvailableCourses();
    fetchAvailablePrograms();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) fetchOfferings();
    else setOfferings([]);
  }, [selectedCompanyId]);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('market_companies')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      toast.error('Failed to load companies');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchOfferings = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      setLoadingOfferings(true);
      const { data, error } = await supabase
        .from('market_offerings')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOfferings(data || []);
    } catch (err: any) {
      console.error('Error fetching offerings:', err);
      toast.error('Failed to load offerings');
    } finally {
      setLoadingOfferings(false);
    }
  }, [selectedCompanyId]);

  const fetchAvailableCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug')
        .eq('is_published', true)
        .order('title');
      if (!error) setAvailableCourses(data || []);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchAvailablePrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, slug')
        .order('name');
      if (!error) setAvailablePrograms(data || []);
    } catch (err: any) {
      console.error('Error fetching programs:', err);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const handleSaveOffering = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    try {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');

      const offeringData = {
        name: formData.name,
        slug,
        tagline: formData.tagline || null,
        description: formData.description || null,
        company_id: selectedCompanyId,
        owner_user_id: profile?.id,
        offering_type: 'membership',
        is_public: true,
        is_active: formData.is_active,
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
        const { error } = await supabase
          .from('market_offerings')
          .update(offeringData)
          .eq('id', editingOffering.id);
        if (error) throw error;
        toast.success('Offering updated');
      } else {
        const { error } = await supabase
          .from('market_offerings')
          .insert([offeringData]);
        if (error) throw error;
        toast.success('Offering created');
      }

      setShowDialog(false);
      resetForm();
      fetchOfferings();
    } catch (err: any) {
      console.error('Error saving offering:', err);
      toast.error('Failed to save offering');
    }
  };

  const handleSavePricing = async () => {
    if (!editingOffering) return;
    try {
      const finalPrice = pricingForm.base_price * (1 - pricingForm.discount_percentage / 100);
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
      toast.success('Pricing updated');
      setShowPricingDialog(false);
      fetchOfferings();
    } catch (err: any) {
      console.error('Error saving pricing:', err);
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
      cta_text: offering.cta_text || '',
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
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingOffering(null);
    setFormData({
      name: '',
      tagline: '',
      description: '',
      kit_product_id: '',
      kit_product_url: '',
      kit_landing_page_url: '',
      cta_text: '',
      is_active: true,
      is_featured: false,
      purchase_type: 'kit_commerce',
      external_url: '',
    });
    setFeatures([]);
    setLinkedCourseId('');
    setLinkedProgramId('');
  };

  const calculateFinalPrice = () => {
    return pricingForm.base_price * (1 - pricingForm.discount_percentage / 100);
  };

  const handleImportOfferings = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    if (!importJson.trim()) {
      toast.error('Please paste JSON data first');
      return;
    }
    try {
      setImporting(true);
      const offeringsToImport = JSON.parse(importJson);
      const result = await importCompanyOfferings(supabase, selectedCompanyId, offeringsToImport);
      toast.success(`Imported ${result.imported} offerings!`);
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast.error(`${result.errors.length} failed — see console`);
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

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // ── Render ────────────────────────────────────────────────────────────────────
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
            Select a company, then manage its offerings in the Market
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            disabled={!selectedCompanyId}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            disabled={!selectedCompanyId}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Offering
          </Button>
        </div>
      </div>

      {/* ── Company Picker ──────────────────────────────────────────────────── */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Building2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div className="flex-1">
              <Label className="text-indigo-900 font-semibold mb-1 block">
                Select Company
              </Label>
              {loadingCompanies ? (
                <p className="text-sm text-indigo-600">Loading companies…</p>
              ) : (
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a company to manage its offerings…" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedCompany && (
              <div className="flex items-center gap-1 text-sm text-indigo-700">
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium">{selectedCompany.name}</span>
              </div>
            )}
          </div>
          {!selectedCompanyId && !loadingCompanies && (
            <p className="text-xs text-indigo-600 mt-2 ml-9">
              Pick any company above to view and manage its offerings. You can add offerings on behalf of any company.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Offerings List ──────────────────────────────────────────────────── */}
      {selectedCompanyId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Offerings — {selectedCompany?.name}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOfferings}
              disabled={loadingOfferings}
            >
              <RefreshCw className={`w-4 h-4 ${loadingOfferings ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingOfferings ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : offerings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No offerings yet for {selectedCompany?.name}</p>
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
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
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
                        {offering.purchase_type === 'free_claim' && (
                          <Badge className="bg-green-500">🎁 Free Claim</Badge>
                        )}
                        {!offering.purchase_type && (
                          <Badge variant="outline">Not set</Badge>
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
                                <span className="font-semibold">${offering.base_price}</span>
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
      )}

      {/* ── Edit / Create Offering Dialog ───────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOffering ? 'Edit' : 'Create'} Offering
              {selectedCompany && (
                <span className="text-gray-500 font-normal text-base ml-2">
                  — {selectedCompany.name}
                </span>
              )}
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
                placeholder="e.g. CONNEXTED LABS Membership"
              />
            </div>

            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Short description shown on the card"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Detailed description of what this offering includes…"
              />
            </div>

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
                  <SelectItem value="free_claim">
                    🎁 Free — self-service claim, no payment required
                  </SelectItem>
                  <SelectItem value="kit_commerce">
                    💳 Kit Commerce — full integration with pricing
                  </SelectItem>
                  <SelectItem value="external_link">
                    🔗 External Link — redirect to external site (new tab)
                  </SelectItem>
                  <SelectItem value="contact_only">
                    📧 Contact Only — inquiry form, no direct purchase
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.purchase_type === 'free_claim' && 'Users click one button to instantly receive a free access ticket — no ConvertKit needed'}
                {formData.purchase_type === 'kit_commerce' && 'Users purchase directly via Kit Commerce with pricing display'}
                {formData.purchase_type === 'external_link' && 'Users are redirected to an external URL in a new tab'}
                {formData.purchase_type === 'contact_only' && 'Users can only contact you about this offering'}
              </p>
            </div>

            {formData.purchase_type === 'free_claim' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">🎁 Free self-service access.</span> When a logged-in user visits this offering page they will see a green "Claim Free Access" button. Clicking it instantly creates an access ticket for them — no ConvertKit, no payment, no admin action needed. Ideal for MVPs, beta programs, and complimentary access.
                </p>
              </div>
            )}

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
                  <p className="text-xs text-gray-500 mt-1">The product permalink from ConvertKit Commerce</p>
                </div>
                <div>
                  <Label htmlFor="kit_product_url">Kit Product URL</Label>
                  <Input
                    id="kit_product_url"
                    value={formData.kit_product_url}
                    onChange={(e) => setFormData({ ...formData, kit_product_url: e.target.value })}
                    placeholder="https://app.kit.com/products/…"
                  />
                  <p className="text-xs text-gray-500 mt-1">The URL to the product page in ConvertKit Commerce</p>
                </div>
                <div>
                  <Label htmlFor="kit_landing_page_url">Kit Landing Page URL</Label>
                  <Input
                    id="kit_landing_page_url"
                    value={formData.kit_landing_page_url}
                    onChange={(e) => setFormData({ ...formData, kit_landing_page_url: e.target.value })}
                    placeholder="https://example.com/landing"
                  />
                  <p className="text-xs text-gray-500 mt-1">The landing page URL for this product</p>
                </div>
              </div>
            )}

            {formData.purchase_type === 'external_link' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <Label htmlFor="external_url">External URL *</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://example.com/product"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Users will be directed here (opens in new tab)</p>
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
                  formData.purchase_type === 'free_claim' ? 'e.g. Claim Free Access' :
                  formData.purchase_type === 'kit_commerce' ? 'e.g. Purchase Now' :
                  formData.purchase_type === 'external_link' ? 'e.g. Visit Website' :
                  formData.purchase_type === 'contact_only' ? 'e.g. Get in Touch' :
                  'e.g. Learn More'
                }
              />
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                    placeholder="Add a feature…"
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
                onValueChange={setLinkedCourseId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a course (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="linked_program_id">Linked Program</Label>
              <Select
                value={linkedProgramId}
                onValueChange={setLinkedProgramId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a program (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* ── Pricing Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pricing Configuration</DialogTitle>
            <DialogDescription>
              Set the pricing display for {editingOffering?.name}.
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
              <p className="text-xs text-gray-500 mt-1">The code users should enter at checkout</p>
            </div>

            <div>
              <Label htmlFor="discount_description">Discount Description</Label>
              <Input
                id="discount_description"
                value={pricingForm.discount_description}
                onChange={(e) => setPricingForm({ ...pricingForm, discount_description: e.target.value })}
                placeholder="50% off for beta testers"
              />
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
            </div>

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
            <Button onClick={handleSavePricing}>Update Pricing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Offerings from JSON</DialogTitle>
            <DialogDescription>
              Paste JSON data to import multiple offerings at once into{' '}
              <strong>{selectedCompany?.name}</strong>.
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
                placeholder="Paste JSON data here…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportOfferings} disabled={importing}>
              {importing ? 'Importing…' : 'Import Offerings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
