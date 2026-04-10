import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Building2, ArrowLeft, Loader2, Trash2, Save,
  GripVertical, Plus, Search, X,
  Mic, Presentation, FileText, Headphones,
  CheckSquare, BookOpen, QrCode, ExternalLink, Users,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
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
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';
import CompanyMemberDialog from '@/app/components/markets/CompanyMemberDialog';

// ── Item types ────────────────────────────────────────────────────────────────

const ITEM_TYPES = [
  { value: 'elevator',  label: 'Elevator',  icon: Mic,          table: 'elevators',  nameField: 'name',  slugField: 'slug', route: '/elevators',  builtin: false },
  { value: 'pitch',     label: 'Pitch',     icon: Presentation, table: 'pitches',    nameField: 'name',  slugField: 'slug', route: '/pitches',    builtin: false },
  { value: 'document',  label: 'Document',  icon: FileText,     table: 'documents',  nameField: 'title', slugField: 'id',   route: '/documents',  builtin: false },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare,  table: 'checklists', nameField: 'name',  slugField: 'slug', route: '/checklists', builtin: false },
  { value: 'episode',   label: 'Episode',   icon: Headphones,   table: 'episodes',   nameField: 'title', slugField: 'id',   route: '/episodes',   builtin: false },
  { value: 'book',      label: 'Book',      icon: BookOpen,     table: 'books',      nameField: 'title', slugField: 'slug', route: '/books',      builtin: false },
  { value: 'qr_code',   label: 'QR Code',   icon: QrCode,       table: '',           nameField: '',      slugField: '',     route: '',            builtin: true  },
] as const;

interface CompanyItem {
  id: string;
  company_id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
  'Manufacturing', 'Consulting', 'Media & Entertainment', 'Real Estate',
  'Food & Beverage', 'Travel & Hospitality', 'Other',
];

const TEAM_SIZES = ['1', '2-10', '11-50', '51-200', '200+'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditCompanyPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [formData, setFormData] = useState({
    name: '', slug: '', tagline: '', description: '',
    industry: '', team_size: '', headquarters_location: '',
    website_url: '', founded_year: '',
  });

  // ── Companion items state ─────────────────────────────────────────────────

  const [items, setItems] = useState<CompanyItem[]>([]);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrLabel, setQrLabel] = useState('');

  // ── Members dialog ────────────────────────────────────────────────────────

  const [showMembers, setShowMembers] = useState(false);

  // ── Access check ──────────────────────────────────────────────────────────

  const checkAccess = useCallback(async (companyId: string, ownerId: string): Promise<boolean> => {
    if (!profile) return false;
    if (profile.role === 'admin' || profile.role === 'super') return true;
    if (profile.id === ownerId) return true;
    const { data } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', profile.id)
      .maybeSingle();
    return !!data;
  }, [profile]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!profile?.id || !id) return;
    try {
      setLoadingData(true);

      const { data: co, error } = await supabase
        .from('market_companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !co) {
        toast.error('Company not found');
        navigate('/my-ventures');
        return;
      }

      const allowed = await checkAccess(co.id, co.owner_user_id);
      if (!allowed) {
        toast.error('You do not have permission to manage this company');
        navigate(`/markets/companies/${co.slug}`);
        return;
      }

      setCompany(co);
      setCanManage(true);
      setFormData({
        name: co.name || '',
        slug: co.slug || '',
        tagline: co.tagline || '',
        description: co.description || '',
        industry: co.industry || '',
        team_size: co.team_size || '',
        headquarters_location: co.headquarters_location || '',
        website_url: co.website_url || '',
        founded_year: co.founded_year ? co.founded_year.toString() : '',
      });

      // Fetch companion items
      const { data: itemsData } = await supabase
        .from('company_companion_items')
        .select('*')
        .eq('company_id', co.id)
        .order('order_index');

      const resolved = await resolveItemNames(itemsData || []);
      setItems(resolved);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load company');
    } finally {
      setLoadingData(false);
    }
  }, [id, profile?.id, checkAccess, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Resolve item names ────────────────────────────────────────────────────

  async function resolveItemNames(rawItems: CompanyItem[]): Promise<CompanyItem[]> {
    const resolved: CompanyItem[] = [];
    for (const item of rawItems) {
      const typeConfig = ITEM_TYPES.find(t => t.value === item.item_type);
      if (typeConfig?.builtin) {
        resolved.push({ ...item, resolved_name: typeConfig.label }); continue;
      }
      if (!typeConfig) {
        resolved.push({ ...item, resolved_name: `Unknown (${item.item_type})` }); continue;
      }
      const { data } = await supabase
        .from(typeConfig.table)
        .select(`${typeConfig.nameField}, ${typeConfig.slugField}, description`)
        .eq('id', item.item_id)
        .single();
      resolved.push({
        ...item,
        resolved_name: data?.[typeConfig.nameField] || 'Unknown',
        resolved_description: data?.description || null,
        resolved_slug: data?.[typeConfig.slugField] || item.item_id,
      });
    }
    return resolved;
  }

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { toast.error('Company name is required'); return false; }
    if (!formData.slug.trim()) { toast.error('Company slug is required'); return false; }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens'); return false;
    }
    if (!formData.industry) { toast.error('Industry is required'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !profile?.id || !id) return;
    try {
      setLoading(true);
      const { data: existingCompany } = await supabase
        .from('market_companies').select('id').eq('slug', formData.slug).neq('id', id).single();
      if (existingCompany) {
        toast.error('This slug is already taken. Please choose another.');
        setLoading(false); return;
      }
      const { error } = await supabase.from('market_companies').update({
        name: formData.name,
        slug: formData.slug,
        tagline: formData.tagline || null,
        description: formData.description || null,
        industry: formData.industry,
        team_size: formData.team_size || null,
        headquarters_location: formData.headquarters_location || null,
        website_url: formData.website_url || null,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) { toast.error('Failed to update company'); return; }
      toast.success('Company updated!');
      navigate('/my-ventures');
    } catch (err) {
      console.error(err); toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.id || !id || !company) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('market_companies').delete().eq('id', id).eq('owner_user_id', profile.id);
      if (error) { toast.error('Failed to delete company'); return; }
      toast.success('Company deleted');
      navigate('/my-ventures');
    } catch (err) {
      console.error(err); toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  // ── Companion item handlers ───────────────────────────────────────────────

  function startAddItem(type: string) {
    const config = ITEM_TYPES.find(t => t.value === type);
    if (config?.builtin) {
      if (type === 'qr_code') { setQrUrl(''); setQrLabel(''); setAddingType('qr_code'); }
      return;
    }
    setAddingType(type);
    setItemSearch('');
    loadAvailableItems(type);
  }

  async function loadAvailableItems(type: string) {
    const config = ITEM_TYPES.find(t => t.value === type);
    if (!config || config.builtin) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from(config.table)
      .select(`id, ${config.nameField}, ${config.slugField}`)
      .order(config.nameField);
    setAvailableItems(data || []);
    setLoadingItems(false);
  }

  async function addQRCodeItem() {
    if (!company || !qrUrl.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    const { data, error } = await supabase
      .from('company_companion_items')
      .insert({
        company_id: company.id,
        item_type: 'qr_code',
        item_id: company.id,
        order_index: maxOrder,
        notes: JSON.stringify({ url: qrUrl.trim(), label: qrLabel.trim() || null }),
      })
      .select().single();
    if (error) { toast.error('Failed to add QR code'); return; }
    setAddingType(null); setQrUrl(''); setQrLabel('');
    const resolved = await resolveItemNames([data]);
    setItems(prev => [...prev, ...resolved]);
    toast.success('QR code added');
  }

  async function addItem(itemId: string) {
    if (!company || !addingType) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    const { data, error } = await supabase
      .from('company_companion_items')
      .insert({
        company_id: company.id,
        item_type: addingType,
        item_id: itemId,
        order_index: maxOrder,
      })
      .select().single();
    if (error) { toast.error('Failed to add item'); return; }
    setAddingType(null); setAvailableItems([]);
    const resolved = await resolveItemNames([data]);
    setItems(prev => [...prev, ...resolved]);
    toast.success('Item added');
  }

  async function removeItem(itemId: string) {
    const { error } = await supabase.from('company_companion_items').delete().eq('id', itemId);
    if (error) { toast.error('Failed to remove'); return; }
    setItems(prev => prev.filter(i => i.id !== itemId));
    toast.success('Item removed');
  }

  function getItemRoute(item: CompanyItem) {
    const config = ITEM_TYPES.find(t => t.value === item.item_type);
    if (!config || config.builtin) return '#';
    return `${config.route}/${item.resolved_slug || item.item_id}`;
  }

  const alreadyAddedIds = items.map(i => i.item_id);
  const typeConfig = addingType ? ITEM_TYPES.find(t => t.value === addingType) : null;
  const filteredAvailable = availableItems.filter(item => {
    if (!itemSearch) return true;
    const nameField = (typeConfig as any)?.nameField || 'name';
    return item[nameField]?.toLowerCase().includes(itemSearch.toLowerCase());
  });

  const isOwner = profile?.id === company?.owner_user_id;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!canManage || !company) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: 'My Ventures', href: '/my-ventures' },
          { label: 'Edit Company' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/my-ventures')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name} — Manage</h1>
            <p className="text-gray-600 text-sm">Edit settings and companion content</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Companion link */}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/markets/companies/${company.slug}/companion`}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              View Companion
            </Link>
          </Button>

          {/* Members button */}
          <Button variant="outline" size="sm" onClick={() => setShowMembers(true)}>
            <Users className="w-4 h-4 mr-2" />
            Members
          </Button>

          {/* Delete (owner only) */}
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this company?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the company and all associated data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Company'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* ── Companion Content Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Companion Content</CardTitle>
              <CardDescription>Content shown on the company companion page</CardDescription>
            </div>
            {!addingType && (
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button key={type.value} variant="outline" size="sm" onClick={() => startAddItem(type.value)}>
                      <Icon className="w-4 h-4 mr-1" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add item panel */}
          {addingType && typeConfig && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Add {typeConfig.label}</h3>
                <Button variant="ghost" size="sm" onClick={() => { setAddingType(null); setAvailableItems([]); setQrUrl(''); setQrLabel(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {addingType === 'qr_code' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">URL *</Label>
                    <Input value={qrUrl} onChange={e => setQrUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Label (optional)</Label>
                    <Input value={qrLabel} onChange={e => setQrLabel(e.target.value)} placeholder="e.g. Website, LinkedIn, Brochure..." className="mt-1" />
                  </div>
                  <Button size="sm" onClick={addQRCodeItem} disabled={!qrUrl.trim()}>Add QR Code</Button>
                </div>
              )}
              {addingType !== 'qr_code' && (
                <div className="space-y-2">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={`Search ${typeConfig.label.toLowerCase()}s...`}
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {loadingItems ? (
                    <Skeleton className="h-20" />
                  ) : filteredAvailable.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No {typeConfig.label.toLowerCase()}s found</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredAvailable.map(item => {
                        const already = alreadyAddedIds.includes(item.id);
                        const nameField = (typeConfig as any).nameField;
                        return (
                          <button
                            key={item.id}
                            disabled={already}
                            onClick={() => addItem(item.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              already ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            {item[nameField]}
                            {already && <span className="ml-2 text-xs">(already added)</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No content yet</p>
              <p className="text-sm text-gray-400 mt-1">Add pitches, documents, QR codes and more above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const tc = ITEM_TYPES.find(t => t.value === item.item_type);
                const Icon = tc?.icon || FileText;
                const typeLabel = tc?.label || item.item_type;
                const isBuiltin = tc?.builtin ?? false;

                return (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <Icon className="w-4 h-4 text-indigo-500" />
                      <span className="flex-1 text-sm font-medium text-gray-700">
                        {typeLabel}
                        {item.item_type === 'qr_code' && (() => {
                          try {
                            const d = JSON.parse(item.notes || '{}');
                            return d.label ? <span className="ml-2 font-normal text-gray-500">— {d.label}</span> : null;
                          } catch { return null; }
                        })()}
                      </span>
                      <Button
                        variant="ghost" size="sm"
                        className="text-gray-400 hover:text-red-500 h-7 w-7 p-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="px-3 py-3">
                      {isBuiltin && item.item_type === 'qr_code' && (() => {
                        let qrData = { url: '', label: '' };
                        try { qrData = JSON.parse(item.notes || '{}'); } catch {}
                        return qrData.url
                          ? <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                          : <p className="text-sm text-gray-400 py-2">No URL set.</p>;
                      })()}
                      {!isBuiltin && (
                        <Link to={getItemRoute(item)} className="group flex items-start gap-2">
                          <p className="font-medium text-sm text-gray-900 group-hover:text-indigo-600">
                            {item.resolved_name}
                            <ExternalLink className="w-3 h-3 inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          {item.resolved_description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.resolved_description}</p>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Company Info Form ── */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Basic details about your company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Acme Corporation"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug <span className="text-red-500">*</span></Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="e.g., acme-corporation"
                required
              />
              <p className="text-sm text-gray-500">
                URL: /markets/companies/{formData.slug || 'your-slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="A brief, catchy description"
                maxLength={200}
              />
              <p className="text-sm text-gray-500">{formData.tagline.length}/200 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Tell us about your company, mission, and what you do..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry <span className="text-red-500">*</span></Label>
              <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
                <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Select value={formData.team_size} onValueChange={(value) => handleChange('team_size', value)}>
                <SelectTrigger><SelectValue placeholder="Select team size" /></SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headquarters_location">Headquarters Location</Label>
              <Input
                id="headquarters_location"
                value={formData.headquarters_location}
                onChange={(e) => handleChange('headquarters_location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="founded_year">Founded Year</Label>
              <Input
                id="founded_year"
                type="number"
                value={formData.founded_year}
                onChange={(e) => handleChange('founded_year', e.target.value)}
                placeholder="e.g., 2024"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/my-ventures')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      </form>

      {/* Members dialog */}
      {company && (
        <CompanyMemberDialog
          companyId={company.id}
          companyName={company.name}
          ownerUserId={company.owner_user_id}
          open={showMembers}
          onOpenChange={setShowMembers}
        />
      )}
    </div>
  );
}
