import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';
import { toast } from 'sonner';
import {
  Building2, Globe, ExternalLink, Settings, ArrowLeft,
  Mic, Presentation, FileText, Headphones,
  CheckSquare, BookOpen, QrCode,
} from 'lucide-react';

const ITEM_TYPES = [
  { value: 'elevator',  label: 'Elevator',  icon: Mic,          table: 'elevators',  nameField: 'name',  slugField: 'slug', route: '/elevators'  },
  { value: 'pitch',     label: 'Pitch',     icon: Presentation, table: 'pitches',    nameField: 'name',  slugField: 'slug', route: '/pitches'    },
  { value: 'document',  label: 'Document',  icon: FileText,     table: 'documents',  nameField: 'title', slugField: 'id',   route: '/documents'  },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare,  table: 'checklists', nameField: 'name',  slugField: 'slug', route: '/checklists' },
  { value: 'episode',   label: 'Episode',   icon: Headphones,   table: 'episodes',   nameField: 'title', slugField: 'id',   route: '/episodes'   },
  { value: 'book',      label: 'Book',      icon: BookOpen,     table: 'books',      nameField: 'title', slugField: 'slug', route: '/books'      },
  { value: 'qr_code',   label: 'QR Code',   icon: QrCode,       table: '',           nameField: '',      slugField: '',     route: ''            },
] as const;

interface Company {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  owner_user_id: string;
}

interface CompanionItem {
  id: string;
  item_type: string;
  item_id: string;
  order_index: number;
  notes: string | null;
  resolved_name?: string;
  resolved_description?: string;
  resolved_slug?: string;
}

export default function CompanyCompanionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [items, setItems] = useState<CompanionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (slug) loadData();
  }, [slug]);

  async function loadData() {
    try {
      setLoading(true);
      const { data: co, error } = await supabase
        .from('market_companies')
        .select('id, name, slug, tagline, logo_url, website_url, owner_user_id')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      setCompany(co);

      // Check manage access
      if (profile) {
        const isPlatformAdmin = profile.role === 'admin' || profile.role === 'super';
        const isOwner = co.owner_user_id === profile.id;
        if (isPlatformAdmin || isOwner) {
          setCanManage(true);
        } else {
          const { data: membership } = await supabase
            .from('company_members')
            .select('id')
            .eq('company_id', co.id)
            .eq('user_id', profile.id)
            .maybeSingle();
          setCanManage(!!membership);
        }
      }

      // Fetch companion items
      const { data: rawItems } = await supabase
        .from('company_companion_items')
        .select('*')
        .eq('company_id', co.id)
        .order('order_index');

      const resolved = await resolveNames(rawItems || []);
      setItems(resolved);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load companion');
    } finally {
      setLoading(false);
    }
  }

  async function resolveNames(rawItems: any[]): Promise<CompanionItem[]> {
    const resolved: CompanionItem[] = [];
    for (const item of rawItems) {
      const config = ITEM_TYPES.find(t => t.value === item.item_type);
      if (!config || item.item_type === 'qr_code') { resolved.push(item); continue; }
      const { data } = await supabase
        .from(config.table)
        .select(`${config.nameField}, ${config.slugField}, description`)
        .eq('id', item.item_id)
        .single();
      resolved.push({
        ...item,
        resolved_name: data?.[config.nameField] || 'Untitled',
        resolved_description: data?.description || null,
        resolved_slug: data?.[config.slugField] || item.item_id,
      });
    }
    return resolved;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium mb-2">Company not found</h2>
        <Button variant="outline" asChild>
          <Link to="/markets/all-companies">Browse Companies</Link>
        </Button>
      </div>
    );
  }

  const qrItems = items.filter(i => i.item_type === 'qr_code');
  const contentItems = items.filter(i => i.item_type !== 'qr_code');

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/markets/companies/${company.slug}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profile
          </Link>
        </Button>
        {canManage && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/markets/edit-company/${company.id}`}>
              <Settings className="w-4 h-4 mr-1" />
              Manage
            </Link>
          </Button>
        )}
      </div>

      {/* Company header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={company.logo_url || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-400 to-blue-600 text-white">
                {company.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold">{company.name}</h1>
              {company.tagline && (
                <p className="text-sm text-gray-600 mt-0.5">{company.tagline}</p>
              )}
              {company.website_url && (
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                >
                  <Globe className="w-3 h-3" />
                  {company.website_url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes — prominent at top */}
      {qrItems.length > 0 && (
        <div className="space-y-4">
          {qrItems.map(item => {
            let qrData = { url: '', label: '' };
            try { qrData = JSON.parse(item.notes || '{}'); } catch {}
            if (!qrData.url) return null;
            return (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <CompanionQRCode url={qrData.url} label={qrData.label || undefined} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content items */}
      {contentItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            From {company.name}
          </h2>
          {contentItems.map(item => {
            const config = ITEM_TYPES.find(t => t.value === item.item_type);
            const Icon = config?.icon || FileText;
            const href = config?.route ? `${config.route}/${item.resolved_slug || item.item_id}` : null;
            return (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-50">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {config?.label || item.item_type}
                      </span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                        {item.resolved_name || 'View item'}
                      </p>
                      {item.resolved_description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {item.resolved_description}
                        </p>
                      )}
                    </div>
                    {href && (
                      <Button variant="ghost" size="sm" asChild className="shrink-0">
                        <Link to={href}><ExternalLink className="w-4 h-4" /></Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No content has been added to this companion yet.</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to={`/markets/edit-company/${company.id}`}>Add Content</Link>
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
