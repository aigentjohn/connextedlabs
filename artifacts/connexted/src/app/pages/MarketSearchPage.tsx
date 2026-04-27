import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Search, ArrowLeft, Store, ExternalLink } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  logo_url: string | null;
  offering_type: string;
  company_name: string | null;
  company_slug: string | null;
  owner_name: string | null;
  market_name: string;
  market_slug: string;
}

const OFFERING_TYPE_LABELS: Record<string, string> = {
  software: 'Software/SaaS',
  service: 'Services',
  physical: 'Physical Products',
  digital: 'Digital Products',
  hardware: 'Hardware',
};

export default function MarketSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      runSearch(q);
    }
  }, []);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Fetch all public active offerings with their market placements
      const { data: placements, error } = await supabase
        .from('market_placements')
        .select(`
          offering_id,
          is_active,
          markets!inner(name, slug),
          market_offerings!inner(
            id, name, slug, tagline, logo_url, offering_type,
            company_id, owner_user_id,
            is_public, is_active
          )
        `)
        .eq('is_active', true)
        .eq('market_offerings.is_public', true)
        .eq('market_offerings.is_active', true);

      if (error) throw error;

      const term = q.toLowerCase();

      // Client-side filter across name, tagline, type
      const matched = (placements || []).filter((p: any) => {
        const o = p.market_offerings;
        return (
          o.name?.toLowerCase().includes(term) ||
          o.tagline?.toLowerCase().includes(term) ||
          o.offering_type?.toLowerCase().includes(term) ||
          (p.markets as any)?.name?.toLowerCase().includes(term)
        );
      });

      // Deduplicate by offering id (same offering may be in multiple markets)
      const seen = new Set<string>();
      const deduped = matched.filter((p: any) => {
        if (seen.has(p.market_offerings.id)) return false;
        seen.add(p.market_offerings.id);
        return true;
      });

      // Fetch company + owner names in parallel
      const enriched: SearchResult[] = await Promise.all(
        deduped.map(async (p: any) => {
          const o = p.market_offerings;
          let company_name = null;
          let company_slug = null;
          let owner_name = null;

          if (o.company_id) {
            const { data: co } = await supabase
              .from('market_companies')
              .select('name, slug')
              .eq('id', o.company_id)
              .single();
            company_name = co?.name ?? null;
            company_slug = co?.slug ?? null;
          }
          if (o.owner_user_id) {
            const { data: owner } = await supabase
              .from('users')
              .select('name')
              .eq('id', o.owner_user_id)
              .single();
            owner_name = owner?.name ?? null;
          }

          return {
            id: o.id,
            name: o.name,
            slug: o.slug,
            tagline: o.tagline,
            logo_url: o.logo_url ?? null,
            offering_type: o.offering_type,
            company_name,
            company_slug,
            owner_name,
            market_name: (p.markets as any).name,
            market_slug: (p.markets as any).slug,
          };
        })
      );

      setResults(enriched);
    } catch (err) {
      console.error('Market search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query });
    runSearch(query);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/markets')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Markets
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Search Marketplace</h1>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, services, or companies..."
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {/* Results */}
      {loading && (
        <div className="text-center py-12 text-gray-500">Searching…</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No results for "{searchParams.get('q')}"</p>
          <p className="text-gray-400 text-sm mt-1">Try a broader term or browse the markets directly.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/markets')}>
            Browse Markets
          </Button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{searchParams.get('q')}"</strong>
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/markets/${r.market_slug}/${r.slug}`)}
                className="w-full text-left border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
              >
                {r.logo_url ? (
                  <img src={r.logo_url} alt={r.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-indigo-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    {r.offering_type && (
                      <Badge variant="outline" className="text-xs">
                        {OFFERING_TYPE_LABELS[r.offering_type] ?? r.offering_type}
                      </Badge>
                    )}
                  </div>
                  {r.tagline && (
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{r.tagline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    {r.company_name && <span>{r.company_name}</span>}
                    {r.owner_name && !r.company_name && <span>{r.owner_name}</span>}
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {r.market_name}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
