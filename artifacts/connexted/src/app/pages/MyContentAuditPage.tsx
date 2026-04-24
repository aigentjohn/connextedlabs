import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText, Link2, MessageSquare, ExternalLink, Tag,
  Image, Star, AlertTriangle, ArrowRight, Copy, Check,
  Globe, Users, Rocket, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

interface DocRow {
  id: string;
  title: string;
  access_level: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface LinkRow {
  id: string;
  title: string;
  url: string;
  domain: string | null;
  status: string;
  tags: string[] | null;
  created_at: string;
}

interface PostRow {
  id: string;
  content: string;
  access_level: string;
  created_at: string;
}

interface ShareableItem {
  id: string;
  name: string;
  slug?: string;
  type: 'circle' | 'program';
  memberCount: number;
  landingUrl: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function accessBadge(level: string) {
  const map: Record<string, string> = {
    public: 'bg-green-100 text-green-800',
    member: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    private: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[level] ?? 'bg-gray-100 text-gray-700'}`}>
      {level}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    enriched: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 text-gray-400 hover:text-gray-600">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MyContentAuditPage() {
  const { profile, user } = useAuth();

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [shareables, setShareables] = useState<ShareableItem[]>([]);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // health flags
  const [untaggedDocs, setUntaggedDocs] = useState(0);
  const [brokenLinks, setBrokenLinks] = useState(0);

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  async function load() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [
        { data: docsData },
        { data: linksData },
        { data: postsData },
        { data: circlesData },
        { data: programsData },
      ] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, access_level, tags, created_at, updated_at')
          .eq('author_id', profile.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),

        supabase
          .from('my_contents')
          .select('id, title, url, domain, status, tags, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('posts')
          .select('id, content, access_level, created_at')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('circles')
          .select('id, name, slug, admin_ids, host_ids, member_ids')
          .contains('admin_ids', [profile.id]),

        supabase
          .from('programs')
          .select('id, name, slug, admin_ids, member_ids')
          .contains('admin_ids', [profile.id]),
      ]);

      const d = docsData || [];
      const l = linksData || [];
      const p = postsData || [];

      setDocs(d);
      setLinks(l);
      setPosts(p);

      // Shareable items
      const origin = window.location.origin;
      const circleItems: ShareableItem[] = (circlesData || []).map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        type: 'circle',
        memberCount: c.member_ids?.length ?? 0,
        landingUrl: `${origin}/circles/${c.id}`,
      }));
      const programItems: ShareableItem[] = (programsData || []).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: 'program',
        memberCount: p.member_ids?.length ?? 0,
        landingUrl: `${origin}/programs/${p.slug ?? p.id}`,
      }));
      setShareables([...circleItems, ...programItems].sort((a, b) => a.name.localeCompare(b.name)));

      // Aggregate tags
      const tagMap = new Map<string, number>();
      const addTags = (tags: string[] | null) =>
        (tags || []).forEach(t => tagMap.set(t, (tagMap.get(t) ?? 0) + 1));
      d.forEach(r => addTags(r.tags));
      l.forEach(r => addTags(r.tags));
      const sorted = [...tagMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, count }));
      setAllTags(sorted);

      // Health flags
      setUntaggedDocs(d.filter(r => !r.tags || r.tags.length === 0).length);
      setBrokenLinks(l.filter(r => r.status === 'broken').length);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load content audit');
    } finally {
      setLoading(false);
    }
  }

  const healthFlags = untaggedDocs + brokenLinks;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Breadcrumbs items={[
        { label: 'My Content', href: '/my-content' },
        { label: 'Content Audit' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Content Audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">Everything you've created and manage on the platform</p>
        </div>
        {healthFlags > 0 && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4" />
            {healthFlags} item{healthFlags !== 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Documents', count: docs.length, color: 'text-blue-600', href: '/my-documents' },
          { icon: Link2, label: 'Links', count: links.length, color: 'text-indigo-600', href: '/my-contents' },
          { icon: MessageSquare, label: 'Posts', count: posts.length, color: 'text-green-600', href: null },
          { icon: ExternalLink, label: 'Admin of', count: shareables.length, color: 'text-purple-600', href: null },
        ].map(({ icon: Icon, label, count, color, href }) => (
          <Card key={label} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-5 pb-4">
              <Icon className={`w-5 h-5 mb-2 ${color}`} />
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                {label}
                {href && (
                  <Link to={href} className="ml-auto text-indigo-500 hover:text-indigo-700">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health flags */}
      {healthFlags > 0 && (
        <div className="flex flex-wrap gap-3">
          {untaggedDocs > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <Tag className="w-3.5 h-3.5" />
              {untaggedDocs} document{untaggedDocs !== 1 ? 's' : ''} with no tags
            </div>
          )}
          {brokenLinks > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              {brokenLinks} broken link{brokenLinks !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="documents">
            Documents
            <Badge variant="secondary" className="ml-1.5 text-xs">{docs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="links">
            Links
            <Badge variant="secondary" className="ml-1.5 text-xs">{links.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="posts">
            Posts
            <Badge variant="secondary" className="ml-1.5 text-xs">{posts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tags">
            Tags
            <Badge variant="secondary" className="ml-1.5 text-xs">{allTags.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="shareable">
            Shareable Links
            <Badge variant="secondary" className="ml-1.5 text-xs">{shareables.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          {docs.length === 0 ? (
            <Empty icon={FileText} label="No documents yet" action={{ label: 'Create Document', href: '/my-documents' }} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Visibility</th>
                    <th className="text-left px-4 py-3">Tags</th>
                    <th className="text-left px-4 py-3">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {docs.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{d.title}</td>
                      <td className="px-4 py-3">{accessBadge(d.access_level)}</td>
                      <td className="px-4 py-3">
                        {d.tags && d.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {d.tags.slice(0, 3).map(t => (
                              <span key={t} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{t}</span>
                            ))}
                            {d.tags.length > 3 && <span className="text-xs text-gray-400">+{d.tags.length - 3}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> No tags
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/documents/${d.id}`}><ArrowRight className="w-4 h-4" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Links */}
        <TabsContent value="links" className="mt-4">
          {links.length === 0 ? (
            <Empty icon={Link2} label="No links saved yet" action={{ label: 'Import Links', href: '/my-contents' }} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Domain</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Tags</th>
                    <th className="text-left px-4 py-3">Saved</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {links.map(l => (
                    <tr key={l.id} className={`hover:bg-gray-50 ${l.status === 'broken' ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{l.title || l.url}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.domain ?? '—'}</td>
                      <td className="px-4 py-3">{statusBadge(l.status)}</td>
                      <td className="px-4 py-3">
                        {l.tags && l.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {l.tags.slice(0, 2).map(t => (
                              <span key={t} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{t}</span>
                            ))}
                            {l.tags.length > 2 && <span className="text-xs text-gray-400">+{l.tags.length - 2}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Posts */}
        <TabsContent value="posts" className="mt-4">
          {posts.length === 0 ? (
            <Empty icon={MessageSquare} label="No posts yet" />
          ) : (
            <div className="space-y-2">
              {posts.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {accessBadge(p.access_level)}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags" className="mt-4">
          {allTags.length === 0 ? (
            <Empty icon={Tag} label="No tags used yet" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTags.map(({ tag, count }) => (
                <div key={tag} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-700">{tag}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{count}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Shareable Links */}
        <TabsContent value="shareable" className="mt-4">
          {shareables.length === 0 ? (
            <Empty icon={Globe} label="You don't admin any circles or programs yet" />
          ) : (
            <div className="space-y-2">
              {shareables.map(item => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="shrink-0">
                    {item.type === 'circle'
                      ? <Users className="w-5 h-5 text-purple-500" />
                      : <Rocket className="w-5 h-5 text-indigo-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{item.type}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{item.memberCount} members</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500 font-mono truncate max-w-xs">{item.landingUrl}</span>
                      <CopyButton text={item.landingUrl} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.type === 'circle' ? `/circles/${item.id}` : `/programs/${item.slug ?? item.id}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assets — stub */}
        <TabsContent value="assets" className="mt-4">
          <Stub
            icon={Image}
            title="Images & Assets"
            description="View and manage your uploaded images, avatars, and cover photos."
            note="Requires Supabase Storage bucket setup. Run the get_user_storage_objects() migration and configure the storage bucket to enable this tab."
          />
        </TabsContent>

        {/* Reviews — stub */}
        <TabsContent value="reviews" className="mt-4">
          <Stub
            icon={Star}
            title="Reviews & Endorsements"
            description="See all reviews and endorsements you've written."
            note="The reviews table has not been created yet. This tab will populate once the reviews feature is built."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Empty({
  icon: Icon,
  label,
  action,
}: {
  icon: React.ElementType;
  label: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center py-14 bg-gray-50 rounded-xl border border-gray-200">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 mb-3">{label}</p>
      {action && (
        <Button variant="outline" size="sm" asChild>
          <Link to={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

function Stub({
  icon: Icon,
  title,
  description,
  note,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  note: string;
}) {
  return (
    <div className="text-center py-14 bg-gray-50 rounded-xl border border-dashed border-gray-300">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <h3 className="font-medium text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-3 max-w-sm mx-auto">{description}</p>
      <p className="text-xs text-gray-400 max-w-sm mx-auto">{note}</p>
    </div>
  );
}
