import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import {
  Share2,
  Search,
  X,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Globe,
  MessageCircle,
  Download,
  Calendar,
  UserCheck,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { generateVCardFromProfile, downloadVCard } from '@/lib/vcard-parser';
import Breadcrumbs from '@/app/components/Breadcrumbs';

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'linkedin',  label: 'LinkedIn',   icon: Linkedin,      color: 'bg-blue-600 hover:bg-blue-700',    privacyKey: 'show_linkedin' },
  { key: 'twitter',   label: 'X (Twitter)',icon: Twitter,       color: 'bg-sky-500 hover:bg-sky-600',      privacyKey: 'show_twitter' },
  { key: 'facebook',  label: 'Facebook',   icon: Facebook,      color: 'bg-blue-700 hover:bg-blue-800',    privacyKey: 'show_facebook' },
  { key: 'instagram', label: 'Instagram',  icon: Instagram,     color: 'bg-pink-600 hover:bg-pink-700',    privacyKey: 'show_instagram' },
  { key: 'github',    label: 'GitHub',     icon: Github,        color: 'bg-gray-800 hover:bg-gray-900',    privacyKey: 'show_github' },
  { key: 'website',   label: 'Website',    icon: Globe,         color: 'bg-indigo-600 hover:bg-indigo-700',privacyKey: 'show_website' },
  { key: 'calendly',  label: 'Calendly',   icon: Calendar,      color: 'bg-teal-600 hover:bg-teal-700',    privacyKey: 'show_calendly' },
  { key: 'whatsapp',  label: 'WhatsApp',   icon: MessageCircle, color: 'bg-green-600 hover:bg-green-700',  privacyKey: 'show_whatsapp' },
] as const;

type PlatformKey = typeof PLATFORMS[number]['key'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  tagline: string | null;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  whatsapp_number: string | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    github?: string;
    website?: string;
    calendly?: string;
  } | null;
  privacy_settings: {
    share_social_links?: boolean;
    show_linkedin?: boolean;
    show_twitter?: boolean;
    show_facebook?: boolean;
    show_instagram?: boolean;
    show_github?: boolean;
    show_website?: boolean;
    show_calendly?: boolean;
    show_whatsapp?: boolean;
    show_email?: boolean;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVisibleLinks(member: SocialMember) {
  const socials = member.social_links || {};
  const privacy = member.privacy_settings || {};
  const links: { platform: PlatformKey; icon: any; url: string; color: string }[] = [];

  if (socials.linkedin   && privacy.show_linkedin)  links.push({ platform: 'linkedin',  icon: Linkedin,      url: normalise(socials.linkedin, 'linkedin.com/in/'),  color: 'bg-blue-600 hover:bg-blue-700' });
  if (socials.twitter    && privacy.show_twitter)   links.push({ platform: 'twitter',   icon: Twitter,       url: normalise(socials.twitter,  'twitter.com/'),       color: 'bg-sky-500 hover:bg-sky-600' });
  if (socials.facebook   && privacy.show_facebook)  links.push({ platform: 'facebook',  icon: Facebook,      url: normalise(socials.facebook, 'facebook.com/'),      color: 'bg-blue-700 hover:bg-blue-800' });
  if (socials.instagram  && privacy.show_instagram) links.push({ platform: 'instagram', icon: Instagram,     url: normalise(socials.instagram,'instagram.com/'),     color: 'bg-pink-600 hover:bg-pink-700' });
  if (socials.github     && privacy.show_github)    links.push({ platform: 'github',    icon: Github,        url: normalise(socials.github,   'github.com/'),        color: 'bg-gray-800 hover:bg-gray-900' });
  if (socials.website    && privacy.show_website)   links.push({ platform: 'website',   icon: Globe,         url: normalise(socials.website,  ''),                   color: 'bg-indigo-600 hover:bg-indigo-700' });
  if (socials.calendly   && privacy.show_calendly)  links.push({ platform: 'calendly',  icon: Calendar,      url: normalise(socials.calendly, 'calendly.com/'),      color: 'bg-teal-600 hover:bg-teal-700' });
  if (member.whatsapp_number && privacy.show_whatsapp) links.push({ platform: 'whatsapp', icon: MessageCircle, url: `https://wa.me/${member.whatsapp_number.replace(/[^0-9+]/g, '')}`, color: 'bg-green-600 hover:bg-green-700' });

  return links;
}

function normalise(value: string, fallbackPrefix: string) {
  if (value.startsWith('http')) return value;
  return fallbackPrefix ? `https://${fallbackPrefix}${value}` : `https://${value}`;
}

function memberHasPlatform(member: SocialMember, platform: PlatformKey): boolean {
  const privacy = member.privacy_settings || {};
  if (!privacy.share_social_links) return false;
  if (platform === 'whatsapp') return !!(member.whatsapp_number && privacy.show_whatsapp);
  const socials = member.social_links || {} as any;
  const privKey = PLATFORMS.find(p => p.key === platform)!.privacyKey as keyof typeof privacy;
  return !!(socials[platform] && privacy[privKey]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SocialsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<SocialMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);
  const [mutualConnectionIds, setMutualConnectionIds] = useState<Set<string>>(new Set());

  // Platform filter checkboxes — none checked = show all
  const [checkedPlatforms, setCheckedPlatforms] = useState<Set<PlatformKey>>(new Set());

  useEffect(() => {
    if (user) {
      fetchMutualConnections();
      fetchMembers();
    }
  }, [user]);

  const fetchMutualConnections = async () => {
    try {
      const { data: following } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', user!.id);

      const followingIds = (following || []).map((c: any) => c.following_id);
      if (!followingIds.length) return;

      const { data: followers } = await supabase
        .from('user_connections')
        .select('follower_id')
        .eq('following_id', user!.id)
        .in('follower_id', followingIds);

      setMutualConnectionIds(new Set((followers || []).map((c: any) => c.follower_id)));
    } catch (err) {
      console.error('Error fetching mutual connections:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, tagline, job_title, company_name, location, whatsapp_number, social_links, privacy_settings')
        .neq('id', user!.id);
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (key: PlatformKey) => {
    setCheckedPlatforms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearPlatforms = () => setCheckedPlatforms(new Set());

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredMembers = members.filter(member => {
    // Friends filter
    if (showOnlyFriends && !mutualConnectionIds.has(member.id)) return false;

    // Platform filter — if any boxes checked, member must match at least one (OR)
    if (checkedPlatforms.size > 0) {
      const hasAny = [...checkedPlatforms].some(p => memberHasPlatform(member, p));
      if (!hasAny) return false;
    } else {
      // No boxes checked — still require share_social_links to be on
      if (!member.privacy_settings?.share_social_links) return false;
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.company_name || '').toLowerCase().includes(q) ||
        (member.tagline || '').toLowerCase().includes(q)
      );
    }

    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // ── vCard ──────────────────────────────────────────────────────────────────

  const handleDownloadVCard = (member: SocialMember) => {
    try {
      const vcardText = generateVCardFromProfile({
        name: member.name,
        email: member.privacy_settings?.show_email ? member.email : undefined,
        phone: member.privacy_settings?.show_whatsapp ? member.whatsapp_number ?? undefined : undefined,
        title: member.job_title ?? undefined,
        organization: member.company_name ?? undefined,
        location: member.location ?? undefined,
      });
      downloadVCard(vcardText, `${member.name.replace(/\s+/g, '-').toLowerCase()}.vcf`);
      toast.success(`Downloaded vCard for ${member.name}`);
    } catch (err) {
      console.error('Error generating vCard:', err);
      toast.error('Failed to generate vCard');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading socials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Members', href: '/members/all' },
          { label: 'Socials' },
        ]}
      />

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Share2 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold">Member Socials</h1>
        </div>
        <p className="text-gray-600">
          Connect with members across their social platforms and download contact information
        </p>
      </div>

      {/* Search + Friends filter */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, company, or tagline..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant={showOnlyFriends ? 'default' : 'outline'}
              onClick={() => setShowOnlyFriends(v => !v)}
              className="whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {showOnlyFriends ? 'Friends Only' : 'All Members'}
            </Button>
          </div>

          {/* Platform checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filter by platform
                <span className="text-xs text-gray-400 font-normal">(any checked platform — leave all unchecked to show everyone)</span>
              </p>
              {checkedPlatforms.size > 0 && (
                <button onClick={clearPlatforms} className="text-xs text-indigo-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                const checked = checkedPlatforms.has(p.key);
                return (
                  <label
                    key={p.key}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all select-none text-sm
                      ${checked
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <Checkbox
                      id={`platform-${p.key}`}
                      checked={checked}
                      onCheckedChange={() => togglePlatform(p.key)}
                      className="sr-only"
                    />
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count + active filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-gray-600">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
        </p>
        {checkedPlatforms.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...checkedPlatforms].map(k => {
              const p = PLATFORMS.find(p => p.key === k)!;
              return (
                <Badge key={k} variant="secondary" className="text-xs gap-1 bg-indigo-100 text-indigo-700">
                  {p.label}
                  <button onClick={() => togglePlatform(k)} className="ml-0.5 hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No members found</p>
            <p className="text-sm mt-2">
              {checkedPlatforms.size > 0
                ? 'No members have shared the selected platforms. Try selecting different platforms.'
                : 'No members match your search.'}
            </p>
          </div>
        ) : (
          filteredMembers.map(member => {
            const visibleLinks = getVisibleLinks(member);
            const isFriend = mutualConnectionIds.has(member.id);

            return (
              <Card key={member.id} className="hover:shadow-lg transition-all border-2 hover:border-indigo-200">
                <CardContent className="pt-6">
                  {/* Profile */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link to={`/users/${member.id}`}>
                        <h3 className="font-semibold text-lg hover:text-indigo-600 transition-colors">
                          {member.name}
                        </h3>
                      </Link>
                      {member.tagline && (
                        <p className="text-sm text-gray-600 line-clamp-2">{member.tagline}</p>
                      )}
                      {member.job_title && (
                        <p className="text-xs text-gray-500 mt-1">{member.job_title}</p>
                      )}
                    </div>
                  </div>

                  {isFriend && (
                    <Badge variant="default" className="mb-3 bg-green-100 text-green-700 hover:bg-green-100">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Friend
                    </Badge>
                  )}

                  {/* Social icons */}
                  {visibleLinks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {visibleLinks.map((link, i) => {
                          const Icon = link.icon;
                          const isHighlighted = checkedPlatforms.size > 0 && checkedPlatforms.has(link.platform);
                          return (
                            <button
                              key={i}
                              onClick={() => window.open(link.url, '_blank')}
                              className={`${link.color} text-white p-2.5 rounded-lg transition-all hover:scale-110 shadow-sm
                                ${isHighlighted ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                              title={PLATFORMS.find(p => p.key === link.platform)?.label}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        onClick={() => handleDownloadVCard(member)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download vCard
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No social links shared
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
