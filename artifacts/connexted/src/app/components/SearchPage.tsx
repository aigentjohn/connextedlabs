import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
  Search,
  Users,
  CircleDot,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  Layers,
  MessageCircle,
  Target,
  ArrowRight,
  SearchX,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResultGroup {
  type: string;
  label: string;
  icon: React.ReactNode;
  items: any[];
  linkPrefix: string;
  nameKey: string;
  descKey: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Highlight all occurrences of `query` within `text` */
function highlightMatch(text: string | null | undefined, query: string): React.ReactNode {
  if (!text || !query) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** For a member result, find the first field that matched and return a contextual snippet */
function getMemberMatchContext(member: any, query: string): { field: string; snippet: string } | null {
  const q = query.toLowerCase();
  const checks: { field: string; value: string | null }[] = [
    { field: 'Name', value: member.name },
    { field: 'Tagline', value: member.tagline },
    { field: 'Bio', value: member.bio },
    { field: 'Looking for', value: member.looking_for_details },
    { field: 'Job title', value: member.job_title },
    { field: 'Company', value: member.company_name },
  ];

  for (const check of checks) {
    if (check.value && check.value.toLowerCase().includes(q)) {
      // Extract a ~120 char snippet around the match
      const idx = check.value.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      const end = Math.min(check.value.length, idx + query.length + 80);
      const snippet =
        (start > 0 ? '...' : '') +
        check.value.slice(start, end) +
        (end < check.value.length ? '...' : '');
      return { field: check.field, snippet };
    }
  }
  return null;
}

// Career stage label lookup
const CAREER_STAGE_LABELS: Record<string, string> = {
  student: 'Student / Early Explorer',
  emerging: 'Emerging Professional',
  established: 'Established Professional',
  'senior-leader': 'Senior Leader',
  founder: 'Founder / Solopreneur',
  'coach-consultant': 'Coach / Consultant',
  'career-changer': 'Career Changer',
  'retired-advisor': 'Retired / Advisor',
  // Legacy values
  'early-career': 'Early Career',
  'mid-career': 'Mid Career',
  senior: 'Senior',
  executive: 'Executive',
  entrepreneur: 'Entrepreneur',
  consultant: 'Consultant',
  transition: 'Career Transition',
  retired: 'Retired',
};

// Looking-for label lookup
const LOOKING_FOR_LABELS: Record<string, string> = {
  'peer-support': 'Peer Support & Community',
  mentorship: 'Mentorship & Guidance',
  'skill-building': 'Skill Building & Learning',
  accountability: 'Accountability & Motivation',
  visibility: 'Clients & Visibility',
  collaboration: 'Co-Creation & Collaboration',
  // Legacy values
  'co-founder': 'Co-Founder',
  investors: 'Investors',
  'job-opportunities': 'Job Opportunities',
  collaborators: 'Collaborators',
  feedback: 'Feedback',
  advisors: 'Advisors',
  ideas: 'Ideas & Inspiration',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const { profile } = useAuth();

  // Result state
  const [members, setMembers] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    const q = searchQuery.trim();

    try {
      const results = await Promise.all([
        // Members — search across all useful text fields
        supabase
          .from('users')
          .select('id, name, avatar, tagline, bio, job_title, company_name, career_stage, interests, professional_roles, looking_for, looking_for_details')
          .or(
            `name.ilike.%${q}%,tagline.ilike.%${q}%,bio.ilike.%${q}%,looking_for_details.ilike.%${q}%,job_title.ilike.%${q}%,company_name.ilike.%${q}%`,
          )
          .limit(20),

        // Circles
        supabase
          .from('circles')
          .select('id, name, description, avatar, member_ids')
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Programs
        supabase
          .from('programs')
          .select('id, name, description, status')
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Courses
        supabase
          .from('courses')
          .select('id, title, description')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Books
        supabase
          .from('books')
          .select('id, title, author, description')
          .or(`title.ilike.%${q}%,author.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Decks
        supabase
          .from('decks')
          .select('id, title, description')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Documents
        supabase
          .from('documents')
          .select('id, title, description')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Events
        supabase
          .from('events')
          .select('id, title, description, start_date')
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(20),

        // Forum threads
        supabase
          .from('forum_threads')
          .select('id, title, body, created_at')
          .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
          .limit(20),
      ]);

      setMembers(results[0].data || []);
      setCircles(results[1].data || []);
      setPrograms(results[2].data || []);
      setCourses(results[3].data || []);
      setBooks(results[4].data || []);
      setDecks(results[5].data || []);
      setDocuments(results[6].data || []);
      setEvents(results[7].data || []);
      setThreads(results[8].data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  if (!profile) return null;

  // Build result groups (only those with results)
  const resultGroups: SearchResultGroup[] = [
    {
      type: 'members',
      label: 'People',
      icon: <Users className="w-4 h-4" />,
      items: members,
      linkPrefix: '/members/',
      nameKey: 'name',
      descKey: 'tagline',
    },
    {
      type: 'circles',
      label: 'Circles',
      icon: <CircleDot className="w-4 h-4" />,
      items: circles,
      linkPrefix: '/circles/',
      nameKey: 'name',
      descKey: 'description',
    },
    {
      type: 'programs',
      label: 'Programs',
      icon: <Layers className="w-4 h-4" />,
      items: programs,
      linkPrefix: '/programs/',
      nameKey: 'name',
      descKey: 'description',
    },
    {
      type: 'courses',
      label: 'Courses',
      icon: <GraduationCap className="w-4 h-4" />,
      items: courses,
      linkPrefix: '/courses/',
      nameKey: 'title',
      descKey: 'description',
    },
    {
      type: 'books',
      label: 'Books',
      icon: <BookOpen className="w-4 h-4" />,
      items: books,
      linkPrefix: '/books/',
      nameKey: 'title',
      descKey: 'description',
    },
    {
      type: 'decks',
      label: 'Decks',
      icon: <Layers className="w-4 h-4" />,
      items: decks,
      linkPrefix: '/decks/',
      nameKey: 'title',
      descKey: 'description',
    },
    {
      type: 'documents',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      items: documents,
      linkPrefix: '/documents/',
      nameKey: 'title',
      descKey: 'description',
    },
    {
      type: 'events',
      label: 'Events',
      icon: <Calendar className="w-4 h-4" />,
      items: events,
      linkPrefix: '/events',
      nameKey: 'title',
      descKey: 'description',
    },
    {
      type: 'threads',
      label: 'Discussions',
      icon: <MessageCircle className="w-4 h-4" />,
      items: threads,
      linkPrefix: '/forums/',
      nameKey: 'title',
      descKey: 'body',
    },
  ];

  const totalResults = resultGroups.reduce((sum, g) => sum + g.items.length, 0);
  const groupsWithResults = resultGroups.filter((g) => g.items.length > 0);
  const searchTerm = searchParams.get('q') || '';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Search' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Search</h1>
        <p className="text-gray-600">
          Find people, circles, content, and more across the community
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="What are you looking for? Try a topic, skill, role, or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
            autoFocus
          />
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Searching...</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && searchTerm && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-600">
              <strong>{totalResults}</strong> result{totalResults !== 1 ? 's' : ''} for &ldquo;
              <strong>{searchTerm}</strong>&rdquo;
            </p>

            {/* Type filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                All ({totalResults})
              </button>
              {resultGroups.map((g) => (
                <button
                  key={g.type}
                  onClick={() => setActiveTab(g.type)}
                  disabled={g.items.length === 0}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                    activeTab === g.type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : g.items.length === 0
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {g.icon}
                  {g.label}
                  {g.items.length > 0 && (
                    <span className="opacity-70">({g.items.length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── No results ── */}
          {totalResults === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <SearchX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No results for &ldquo;{searchTerm}&rdquo;
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Nothing matched your search yet. This is useful — it tells us what the community
                  needs. As more people share and create, results will appear.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to="/circles">
                    <Button variant="outline" size="sm">
                      <CircleDot className="w-4 h-4 mr-1.5" />
                      Browse Circles
                    </Button>
                  </Link>
                  <Link to="/members">
                    <Button variant="outline" size="sm">
                      <Users className="w-4 h-4 mr-1.5" />
                      Browse Members
                    </Button>
                  </Link>
                  <Link to="/programs">
                    <Button variant="outline" size="sm">
                      <Layers className="w-4 h-4 mr-1.5" />
                      Browse Programs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── All results view ── */}
          {activeTab === 'all' && totalResults > 0 && (
            <div className="space-y-8">
              {groupsWithResults.map((group) => (
                <section key={group.type}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {group.icon}
                      {group.label}
                      <Badge variant="secondary" className="ml-1">
                        {group.items.length}
                      </Badge>
                    </h3>
                    {group.items.length > 3 && (
                      <button
                        onClick={() => setActiveTab(group.type)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.type === 'members'
                      ? group.items.slice(0, 4).map((member) => (
                          <MemberResultCard
                            key={member.id}
                            member={member}
                            query={searchTerm}
                          />
                        ))
                      : group.items.slice(0, 3).map((item) => (
                          <GenericResultCard
                            key={item.id}
                            item={item}
                            query={searchTerm}
                            linkPrefix={group.linkPrefix}
                            nameKey={group.nameKey}
                            descKey={group.descKey}
                            type={group.label}
                          />
                        ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ── Filtered tab view ── */}
          {activeTab !== 'all' && (
            <div className="space-y-2">
              {resultGroups
                .filter((g) => g.type === activeTab)
                .map((group) =>
                  group.items.length > 0 ? (
                    group.type === 'members' ? (
                      group.items.map((member) => (
                        <MemberResultCard
                          key={member.id}
                          member={member}
                          query={searchTerm}
                        />
                      ))
                    ) : (
                      group.items.map((item) => (
                        <GenericResultCard
                          key={item.id}
                          item={item}
                          query={searchTerm}
                          linkPrefix={group.linkPrefix}
                          nameKey={group.nameKey}
                          descKey={group.descKey}
                          type={group.label}
                        />
                      ))
                    )
                  ) : (
                    <Card key={group.type} className="border-dashed">
                      <CardContent className="py-8 text-center text-gray-500">
                        No {group.label.toLowerCase()} matched &ldquo;{searchTerm}&rdquo;
                      </CardContent>
                    </Card>
                  ),
                )}
            </div>
          )}
        </>
      )}

      {/* Empty state — before any search */}
      {!hasSearched && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              What are you looking for?
            </h3>
            <p className="text-gray-500 max-w-lg mx-auto">
              Search across people, circles, programs, books, documents, and more. Try a topic like
              &ldquo;leadership&rdquo;, a role like &ldquo;coach&rdquo;, or a name.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Member result card ──────────────────────────────────────────────────────

function MemberResultCard({ member, query }: { member: any; query: string }) {
  const matchContext = getMemberMatchContext(member, query);
  const stageLabel = member.career_stage ? CAREER_STAGE_LABELS[member.career_stage] || member.career_stage : null;
  const lookingForLabels = (member.looking_for || [])
    .slice(0, 3)
    .map((v: string) => LOOKING_FOR_LABELS[v] || v);

  return (
    <Link to={`/members/${member.id}`}>
      <Card className="hover:shadow-md hover:border-indigo-200 transition-all">
        <CardContent className="py-4 flex items-start gap-4">
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700">
              {member.name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Name + tagline */}
            <h4 className="font-semibold text-gray-900">
              {highlightMatch(member.name, query)}
            </h4>
            {member.tagline && (
              <p className="text-sm text-gray-600 line-clamp-1">
                {highlightMatch(member.tagline, query)}
              </p>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {member.job_title && (
                <Badge variant="secondary" className="text-xs">
                  {member.job_title}
                  {member.company_name ? ` at ${member.company_name}` : ''}
                </Badge>
              )}
              {stageLabel && (
                <Badge variant="outline" className="text-xs">
                  {stageLabel}
                </Badge>
              )}
              {(member.professional_roles || []).slice(0, 2).map((role: string) => (
                <Badge key={role} variant="outline" className="text-xs text-indigo-700 border-indigo-200">
                  {role}
                </Badge>
              ))}
            </div>

            {/* Looking for */}
            {lookingForLabels.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Target className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500">
                  Looking for: {lookingForLabels.join(', ')}
                </span>
              </div>
            )}

            {/* Match context — why this result matched */}
            {matchContext && matchContext.field !== 'Name' && matchContext.field !== 'Tagline' && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-gray-600">
                <span className="text-gray-400 mr-1">Matched in {matchContext.field}:</span>
                {highlightMatch(matchContext.snippet, query)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Generic result card (circles, books, programs, etc.) ────────────────────

function GenericResultCard({
  item,
  query,
  linkPrefix,
  nameKey,
  descKey,
  type,
}: {
  item: any;
  query: string;
  linkPrefix: string;
  nameKey: string;
  descKey: string;
  type: string;
}) {
  const name = item[nameKey] || 'Untitled';
  const desc = item[descKey] || '';
  const linkTo = linkPrefix.endsWith('/') ? `${linkPrefix}${item.id}` : linkPrefix;

  // Build extra info line
  const extras: string[] = [];
  if (item.author) extras.push(`by ${item.author}`);
  if (item.status) extras.push(item.status);
  if (item.member_ids) extras.push(`${item.member_ids.length} members`);
  if (item.start_date) extras.push(new Date(item.start_date).toLocaleDateString());

  return (
    <Link to={linkTo}>
      <Card className="hover:shadow-md hover:border-indigo-200 transition-all">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">
                {highlightMatch(name, query)}
              </h4>
              {desc && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                  {highlightMatch(desc, query)}
                </p>
              )}
              {extras.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">{extras.join(' · ')}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs shrink-0 text-gray-500">
              {type}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}