/**
 * Kit Commerce Admin
 *
 * Central setup & monitoring page for the Kit (ConvertKit) → Ticket pipeline.
 *
 * Covers:
 *  1. Webhook URLs to paste into Kit dashboard (with copy buttons)
 *  2. Pipeline chain audit: offerings with Kit IDs → linked templates → inventory health
 *  3. Recent Kit purchases log (from KV store)
 *  4. Quick-action links to fix every gap in the chain
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import {
  ShoppingCart, Copy, Check, ExternalLink, ArrowRight, Loader2,
  AlertTriangle, CheckCircle2, Zap, Ticket, Package, Store,
  RefreshCw, ChevronRight, Link2, Info, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KitOffering {
  id: string;
  name: string;
  slug: string;
  kit_product_id: string | null;
  kit_product_url: string | null;
  purchase_type: string | null;
}

interface TemplateChain {
  id: string;
  name: string;
  offeringId: string | null;
  offeringName: string | null;
  kitProductId: string | null;
  status: 'active' | 'archived';
  inventoryCount: number;
  assignedCount: number;
  unlocks: any;
}

interface PurchaseLog {
  purchase_id: string | number;
  email: string;
  product_name: string;
  total_cents: number;
  purchase_type: string;
  processed_at: string;
  user_id?: string;
  template_name?: string;
  course_id?: string;
  tier_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2 py-0.5 hover:bg-indigo-50 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {label || (copied ? 'Copied!' : 'Copy')}
    </button>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
      ok
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KitCommerceAdmin() {
  const { profile } = useAuth();
  const [offerings, setOfferings] = useState<KitOffering[]>([]);
  const [templates, setTemplates] = useState<TemplateChain[]>([]);
  const [purchases, setPurchases] = useState<PurchaseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

  const WEBHOOKS = [
    {
      label: 'Commerce Purchase',
      url: `${BASE}/webhooks/kit/commerce-purchase`,
      description: 'Triggered when a Kit product is purchased. Auto-assigns a ticket.',
      priority: 'Required',
    },
    {
      label: 'Commerce Refund',
      url: `${BASE}/webhooks/kit/commerce-refund`,
      description: 'Triggered on refund. Revokes the ticket and access.',
      priority: 'Recommended',
    },
    {
      label: 'Form Subscribe',
      url: `${BASE}/webhooks/kit/form-subscribe`,
      description: 'Creates a prospect record when someone subscribes to your list.',
      priority: 'Optional',
    },
    {
      label: 'Tag Added',
      url: `${BASE}/webhooks/kit/tag-added`,
      description: 'Tags subscribers with platform-level metadata.',
      priority: 'Optional',
    },
  ];

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all offerings (including ones without Kit IDs — so we can show gaps)
      const { data: offeringsData } = await supabase
        .from('market_offerings')
        .select('id, name, slug, kit_product_id, kit_product_url, purchase_type')
        .eq('is_active', true)
        .order('name');

      setOfferings(offeringsData || []);

      // Fetch all templates via server (KV-backed)
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${publicAnonKey}`,
        ...(session?.access_token ? { 'X-User-Token': session.access_token } : {}),
      };

      const [tmplRes, purchaseRes] = await Promise.all([
        fetch(`${BASE}/ticket-templates`, { headers }),
        fetch(`${BASE}/kit-purchases`, { headers }).catch(() => ({ ok: false })),
      ]);

      if (tmplRes.ok) {
        const { templates: data } = await tmplRes.json();
        setTemplates((data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          offeringId: t.offeringId,
          offeringName: t.offeringName,
          kitProductId: t.kitProductId,
          status: t.status,
          inventoryCount: t.inventoryCount || 0,
          assignedCount: t.assignedCount || 0,
          unlocks: t.unlocks || {},
        })));
      }

      if ((purchaseRes as any).ok) {
        const { purchases: data } = await (purchaseRes as any).json();
        setPurchases(data || []);
      }
    } catch (err: any) {
      console.error('KitCommerceAdmin load error:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  // ── Derived health metrics ──────────────────────────────────────────────────

  const offeringsWithKitId = offerings.filter(o => o.kit_product_id);
  const offeringsWithoutKitId = offerings.filter(o => !o.kit_product_id);
  const activeTemplates = templates.filter(t => t.status === 'active');
  const templatesWithKitId = activeTemplates.filter(t => t.kitProductId);
  const templatesWithInventory = activeTemplates.filter(t => t.inventoryCount > 0);
  const templatesWithAvailableSlots = activeTemplates.filter(
    t => (t.inventoryCount - t.assignedCount) > 0
  );

  // Chain status per template
  const getChainStatus = (t: TemplateChain) => {
    const hasOffering = !!t.offeringId;
    const hasKitId = !!t.kitProductId;
    const hasInventory = t.inventoryCount > 0;
    const hasSlots = (t.inventoryCount - t.assignedCount) > 0;
    return { hasOffering, hasKitId, hasInventory, hasSlots };
  };

  const fullyWired = activeTemplates.filter(t => {
    const s = getChainStatus(t);
    return s.hasOffering && s.hasKitId && s.hasInventory && s.hasSlots;
  });

  const available = activeTemplates.reduce((sum, t) => sum + Math.max(0, t.inventoryCount - t.assignedCount), 0);

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">← Admin</Button>
        </Link>
      </div>

      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'Kit Commerce' },
      ]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            Kit Commerce Setup
          </h1>
          <p className="text-gray-600 mt-1">
            Configure webhook endpoints, audit the purchase pipeline, and monitor recent transactions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Offerings with Kit ID', value: offeringsWithKitId.length, total: offerings.length, color: 'blue', icon: <Store className="w-5 h-5 text-blue-500" /> },
          { label: 'Templates with Kit ID', value: templatesWithKitId.length, total: activeTemplates.length, color: 'indigo', icon: <Ticket className="w-5 h-5 text-indigo-500" /> },
          { label: 'Fully wired chains', value: fullyWired.length, total: activeTemplates.length, color: 'green', icon: <Zap className="w-5 h-5 text-green-500" /> },
          { label: 'Tickets available', value: available, total: activeTemplates.reduce((s, t) => s + t.inventoryCount, 0), color: 'amber', icon: <Package className="w-5 h-5 text-amber-500" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
              {stat.total > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">of {stat.total} total</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 1. Webhook Setup ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Step 1 — Add Webhooks in Kit Dashboard
          </CardTitle>
          <CardDescription>
            In Kit → Settings → Webhooks, add each URL below. The <strong>Commerce Purchase</strong>{' '}
            webhook is required for the ticket pipeline. Others are optional but recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Kit dashboard deep-link */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border text-sm">
            <Info className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-600">Kit Webhooks:</span>
            <a
              href="https://app.kit.com/account_settings/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline flex items-center gap-1"
            >
              app.kit.com/account_settings/webhooks
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3">
            {WEBHOOKS.map(wh => (
              <div key={wh.label} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{wh.label}</span>
                    <Badge
                      variant="outline"
                      className={
                        wh.priority === 'Required'
                          ? 'border-red-200 text-red-700 bg-red-50'
                          : wh.priority === 'Recommended'
                          ? 'border-amber-200 text-amber-700 bg-amber-50'
                          : 'border-gray-200 text-gray-600'
                      }
                    >
                      {wh.priority}
                    </Badge>
                  </div>
                  <CopyButton text={wh.url} label="Copy URL" />
                </div>
                <div className="font-mono text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 break-all">
                  {wh.url}
                </div>
                <p className="text-xs text-gray-500">{wh.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Offering → Kit ID Setup ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            Step 2 — Add Kit Product IDs to Offerings
          </CardTitle>
          <CardDescription>
            Each offering sold via Kit Commerce needs its Kit Product ID set. Edit an offering,
            go to the "Kit Commerce Integration" section, and enter the numeric product ID from Kit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : offerings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active offerings found.</p>
          ) : (
            <>
              {offeringsWithoutKitId.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{offeringsWithoutKitId.length} offering{offeringsWithoutKitId.length !== 1 ? 's' : ''} missing a Kit Product ID</span>
                </div>
              )}
              <div className="divide-y border rounded-lg overflow-hidden">
                {offerings.map(o => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      {o.kit_product_id
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      }
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{o.name}</div>
                        <div className="text-xs text-gray-400 truncate">{o.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {o.kit_product_id ? (
                        <span className="font-mono text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">
                          Kit #{o.kit_product_id}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">No Kit ID</span>
                      )}
                      {o.purchase_type === 'kit_commerce' && (
                        <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                          Kit Commerce
                        </Badge>
                      )}
                      <Link to={`/markets/edit-offering/${o.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          Edit <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Template Chain Audit ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            Step 3 — Ticket Template Chain Audit
          </CardTitle>
          <CardDescription>
            Each active template needs: an offering linked, a Kit Product ID copied, and available
            inventory. A "fully wired" chain auto-assigns tickets the moment a Kit purchase arrives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : activeTemplates.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-gray-500">No active ticket templates yet.</p>
              <Link to="/platform-admin/ticket-templates">
                <Button size="sm">Create First Template</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTemplates.map(t => {
                const s = getChainStatus(t);
                const allGood = s.hasOffering && s.hasKitId && s.hasInventory && s.hasSlots;
                return (
                  <div
                    key={t.id}
                    className={`border rounded-lg p-4 space-y-3 ${allGood ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {allGood
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          }
                          <span className="font-medium text-sm">{t.name}</span>
                          {allGood && <Badge className="text-xs bg-green-600">Fully Wired ⚡</Badge>}
                        </div>
                        {t.unlocks?.containerType && (
                          <div className="mt-1 text-xs text-gray-500 ml-6">
                            Unlocks: <span className="font-medium capitalize">{t.unlocks.containerType}</span>
                            {t.unlocks.containerName && ` → ${t.unlocks.containerName}`}
                          </div>
                        )}
                      </div>
                      <Link to={`/platform-admin/ticket-inventory?template=${t.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Package className="w-3 h-3 mr-1" /> Inventory
                        </Button>
                      </Link>
                    </div>

                    {/* Chain status badges */}
                    <div className="flex flex-wrap gap-2 ml-6">
                      <StatusPill ok={s.hasOffering} label={s.hasOffering ? `Offering: ${t.offeringName}` : 'No offering linked'} />
                      <StatusPill ok={s.hasKitId} label={s.hasKitId ? `Kit ID: ${t.kitProductId}` : 'No Kit Product ID'} />
                      <StatusPill ok={s.hasInventory} label={`${t.inventoryCount} inventory`} />
                      <StatusPill ok={s.hasSlots} label={`${Math.max(0, t.inventoryCount - t.assignedCount)} available`} />
                    </div>

                    {/* Fix links */}
                    {!allGood && (
                      <div className="ml-6 flex flex-wrap gap-2">
                        {!s.hasOffering && (
                          <Link to="/platform-admin/ticket-templates">
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-700 hover:bg-amber-100">
                              Link offering →
                            </Button>
                          </Link>
                        )}
                        {!s.hasKitId && s.hasOffering && (
                          <Link to={`/markets/edit-offering/${t.offeringId}`}>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-700 hover:bg-amber-100">
                              Add Kit ID to offering →
                            </Button>
                          </Link>
                        )}
                        {s.hasKitId && !s.hasInventory && (
                          <Link to={`/platform-admin/ticket-inventory?template=${t.id}`}>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-700 hover:bg-amber-100">
                              Create inventory batch →
                            </Button>
                          </Link>
                        )}
                        {s.hasInventory && !s.hasSlots && (
                          <Link to={`/platform-admin/ticket-inventory?template=${t.id}`}>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-red-700 hover:bg-red-100">
                              ⚠ All tickets assigned — add more →
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end pt-1">
                <Link to="/platform-admin/ticket-templates">
                  <Button size="sm" variant="outline">
                    <Ticket className="w-4 h-4 mr-2" />
                    Manage Templates
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Recent Purchases ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-500" />
            Recent Kit Purchases
          </CardTitle>
          <CardDescription>
            Purchase log stored in KV. Each row represents a completed Kit Commerce transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No Kit purchases logged yet. Once customers buy via Kit Commerce, transactions will appear here.
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden">
              {purchases.slice(0, 25).map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.email}</div>
                    <div className="text-xs text-gray-500 truncate">{p.product_name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">
                      {p.purchase_type || 'unknown'}
                    </Badge>
                    <span className="text-sm font-medium text-green-700">
                      ${((p.total_cents || 0) / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}
                    </span>
                    {p.user_id && (
                      <Link to={`/platform-admin/users/${p.user_id}`}>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          User <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Quick reference ── */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" />
            Quick Reference — Full Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              { label: 'Kit Dashboard', href: 'https://app.kit.com', external: true },
              { label: 'Edit Offering (Kit ID)', href: '/markets/edit-offering/...', external: false, note: 'Set kit_product_id' },
              { label: 'Ticket Templates', href: '/platform-admin/ticket-templates', external: false, note: 'Link offering + Kit ID auto-fills' },
              { label: 'Ticket Inventory', href: '/platform-admin/ticket-inventory', external: false, note: 'Create batch + assign' },
              { label: 'User Wallet', href: '/my-tickets', external: false, note: 'Buyer sees ticket here' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs font-medium">
                    {item.label} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link to={item.href}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs font-medium">
                    {item.label}
                  </Link>
                )}
                {item.note && <span className="text-xs text-gray-400">({item.note})</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}