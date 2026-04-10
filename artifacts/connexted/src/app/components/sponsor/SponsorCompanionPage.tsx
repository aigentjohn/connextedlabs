import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { useSponsor } from '@/lib/sponsor-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { CompanionQRCode } from '@/app/components/events/CompanionQRCode';
import { toast } from 'sonner';
import {
  Building2, Crown, Globe, ExternalLink, Settings,
  Mic, Presentation, FileText, Headphones,
  CheckSquare, BookOpen, QrCode, ArrowLeft,
} from 'lucide-react';

// ── Item type config (mirrors SponsorManagePage) ───────────────────────────

const ITEM_TYPES = [
  { value: 'elevator',  label: 'Elevator',  icon: Mic,          table: 'elevators',  nameField: 'name',  slugField: 'slug', route: '/elevators'  },
  { value: 'pitch',     label: 'Pitch',     icon: Presentation, table: 'pitches',    nameField: 'name',  slugField: 'slug', route: '/pitches'    },
  { value: 'document',  label: 'Document',  icon: FileText,     table: 'documents',  nameField: 'title', slugField: 'id',   route: '/documents'  },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare,  table: 'checklists', nameField: 'name',  slugField: 'slug', route: '/checklists' },
  { value: 'episode',   label: 'Episode',   icon: Headphones,   table: 'episodes',   nameField: 'title', slugField: 'id',   route: '/episodes'   },
  { value: 'book',      label: 'Book',      icon: BookOpen,     table: 'books',      nameField: 'title', slugField: 'slug', route: '/books'      },
  { value: 'qr_code',   label: 'QR Code',   icon: QrCode,       table: '',           nameField: '',      slugField: '',     route: ''            },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  tier_data?: { tier_name: string; tier_level: number };
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

// ── Component ──────────────────────────────────────────────────────────────

export default function SponsorCompanionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const { canManageSponsor } = useSponsor();

  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [items, setItems] = useState<CompanionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) loadData();
  }, [slug]);

  async function loadData() {
    try {
      setLoading(true);

      // Fetch sponsor
      const { data: sponsorData, error } = await supabase
        .from('sponsors')
        .select('id, name, slug, tagline, logo_url, website_url, tier_data:sponsor_tiers(tier_name, tier_level)')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setSponsor(sponsorData);

      // Fetch companion items
      const { data: rawItems, error: itemsError } = await supabase
        .from('sponsor_companion_items')
        .select('*')
        .eq('sponsor_id', sponsorData.id)
        .order('order_index');

      if (itemsError) throw itemsError;

      // Resolve item names
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
      if (!config || item.item_type === 'qr_code') {
        resolved.push(item);
        continue;
      }
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

  function getTierColor(level?: number) {
    switch (level) {
      case 1: return 'bg-amber-700 text-white';
      case 2: return 'bg-gray-400 text-white';
      case 3: return 'bg-yellow-600 text-white';
      case 4: return 'bg-slate-700 text-white';
      default: return 'bg-blue-600 text-white';
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium mb-2">Sponsor not found</h2>
        <Button variant="outline" asChild>
          <Link to="/sponsors">Browse Sponsors</Link>
        </Button>
      </div>
    );
  }

  const qrItems = items.filter(i => i.item_type === 'qr_code');
  const contentItems = items.filter(i => i.item_type !== 'qr_code');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">

      {/* Back + Manage */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/sponsors/${sponsor.slug}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profile
          </Link>
        </Button>
        {profile && canManageSponsor(sponsor.id) && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/sponsor/${sponsor.slug}/manage`}>
              <Settings className="w-4 h-4 mr-1" />
              Manage
            </Link>
          </Button>
        )}
      </div>

      {/* Sponsor Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={sponsor.logo_url || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                {sponsor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{sponsor.name}</h1>
                {sponsor.tier_data && (
                  <Badge className={getTierColor(sponsor.tier_data.tier_level)}>
                    <Crown className="w-3 h-3 mr-1" />
                    {sponsor.tier_data.tier_name}
                  </Badge>
                )}
              </div>
              {sponsor.tagline && (
                <p className="text-sm text-gray-600 mt-1">{sponsor.tagline}</p>
              )}
              {sponsor.website_url && (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                >
                  <Globe className="w-3 h-3" />
                  {sponsor.website_url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes — shown prominently at the top */}
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

      {/* Content Items */}
      {contentItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            From {sponsor.name}
          </h2>
          {contentItems.map(item => {
            const config = ITEM_TYPES.find(t => t.value === item.item_type);
            const Icon = config?.icon || FileText;
            const route = config?.route;
            const href = route ? `${route}/${item.resolved_slug || item.item_id}` : null;

            return (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-50">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          {config?.label || item.item_type}
                        </span>
                      </div>
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
                        <Link to={href}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
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
          {profile && canManageSponsor(sponsor.id) && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to={`/sponsor/${sponsor.slug}/manage`}>Add Content</Link>
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
