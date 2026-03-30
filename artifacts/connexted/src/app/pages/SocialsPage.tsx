import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { 
  Share2,
  Search,
  Filter,
  X,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Github,
  Globe,
  MessageCircle,
  Download,
  ExternalLink,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import { generateVCardFromProfile, downloadVCard } from '@/lib/vcard-parser';
import Breadcrumbs from '@/app/components/Breadcrumbs';

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
    custom?: { label: string; url: string }[];
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

export default function SocialsPage() {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<SocialMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<SocialMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFriends, setShowOnlyFriends] = useState(false);
  const [showOnlyWithSocials, setShowOnlyWithSocials] = useState(true);
  const [mutualConnectionIds, setMutualConnectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchMutualConnections();
      fetchMembers();
    }
  }, [user]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, showOnlyFriends, showOnlyWithSocials, mutualConnectionIds]);

  const fetchMutualConnections = async () => {
    try {
      const { data: following, error: followingError } = await supabase
        .from('user_connections')
        .select('following_id')
        .eq('follower_id', user!.id);

      if (followingError) throw followingError;

      const followingIds = following?.map(conn => conn.following_id) || [];

      if (followingIds.length === 0) {
        setMutualConnectionIds(new Set());
        return;
      }

      const { data: followers, error: followersError } = await supabase
        .from('user_connections')
        .select('follower_id')
        .eq('following_id', user!.id)
        .in('follower_id', followingIds);

      if (followersError) throw followersError;

      const mutualIds = followers?.map(conn => conn.follower_id) || [];
      setMutualConnectionIds(new Set(mutualIds));
    } catch (error) {
      console.error('Error fetching mutual connections:', error);
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
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Filter to friends only if enabled
    if (showOnlyFriends) {
      filtered = filtered.filter(member => mutualConnectionIds.has(member.id));
    }

    // Filter to only members with social links shared
    if (showOnlyWithSocials) {
      filtered = filtered.filter(member => 
        member.privacy_settings?.share_social_links === true &&
        member.social_links &&
        Object.keys(member.social_links).length > 0
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.company_name?.toLowerCase().includes(query) ||
        member.tagline?.toLowerCase().includes(query)
      );
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredMembers(filtered);
  };

  const handleDownloadVCard = (member: SocialMember) => {
    try {
      const profileData = {
        name: member.name,
        email: member.privacy_settings?.show_email ? member.email : undefined,
        phone: member.privacy_settings?.show_whatsapp ? member.whatsapp_number : undefined,
        title: member.job_title || undefined,
        organization: member.company_name || undefined,
        location: member.location || undefined,
      };

      const vcardText = generateVCardFromProfile(profileData);
      const filename = `${member.name.replace(/\s+/g, '-').toLowerCase()}.vcf`;
      downloadVCard(vcardText, filename);
      
      toast.success(`Downloaded vCard for ${member.name}`);
    } catch (error) {
      console.error('Error generating vCard:', error);
      toast.error('Failed to generate vCard');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSocialLinks = (member: SocialMember) => {
    const links = [];
    const socials = member.social_links || {};
    const privacy = member.privacy_settings || {};

    // LinkedIn
    if (socials.linkedin && privacy.show_linkedin) {
      links.push({
        platform: 'LinkedIn',
        icon: Linkedin,
        url: socials.linkedin.startsWith('http') ? socials.linkedin : `https://linkedin.com/in/${socials.linkedin}`,
        color: 'bg-blue-600 hover:bg-blue-700',
      });
    }

    // Twitter/X
    if (socials.twitter && privacy.show_twitter) {
      links.push({
        platform: 'Twitter',
        icon: Twitter,
        url: socials.twitter.startsWith('http') ? socials.twitter : `https://twitter.com/${socials.twitter}`,
        color: 'bg-sky-500 hover:bg-sky-600',
      });
    }

    // Facebook
    if (socials.facebook && privacy.show_facebook) {
      links.push({
        platform: 'Facebook',
        icon: Facebook,
        url: socials.facebook.startsWith('http') ? socials.facebook : `https://facebook.com/${socials.facebook}`,
        color: 'bg-blue-700 hover:bg-blue-800',
      });
    }

    // Instagram
    if (socials.instagram && privacy.show_instagram) {
      links.push({
        platform: 'Instagram',
        icon: Instagram,
        url: socials.instagram.startsWith('http') ? socials.instagram : `https://instagram.com/${socials.instagram}`,
        color: 'bg-pink-600 hover:bg-pink-700',
      });
    }

    // GitHub
    if (socials.github && privacy.show_github) {
      links.push({
        platform: 'GitHub',
        icon: Github,
        url: socials.github.startsWith('http') ? socials.github : `https://github.com/${socials.github}`,
        color: 'bg-gray-800 hover:bg-gray-900',
      });
    }

    // Website
    if (socials.website && privacy.show_website) {
      links.push({
        platform: 'Website',
        icon: Globe,
        url: socials.website.startsWith('http') ? socials.website : `https://${socials.website}`,
        color: 'bg-indigo-600 hover:bg-indigo-700',
      });
    }

    // Calendly
    if (socials.calendly && privacy.show_calendly) {
      links.push({
        platform: 'Calendly',
        icon: Calendar,
        url: socials.calendly.startsWith('http') ? socials.calendly : `https://calendly.com/${socials.calendly}`,
        color: 'bg-teal-600 hover:bg-teal-700',
      });
    }

    // WhatsApp
    if (member.whatsapp_number && privacy.show_whatsapp) {
      links.push({
        platform: 'WhatsApp',
        icon: MessageCircle,
        url: `https://wa.me/${member.whatsapp_number.replace(/[^0-9+]/g, '')}`,
        color: 'bg-green-600 hover:bg-green-700',
      });
    }

    return links;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading socials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Members', path: '/members/all' },
          { label: 'Socials' },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Share2 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold">Member Socials</h1>
        </div>
        <p className="text-gray-600">
          Connect with members across their social platforms and download contact information
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Filter: Friends Only */}
            <Button
              variant={showOnlyFriends ? 'default' : 'outline'}
              onClick={() => setShowOnlyFriends(!showOnlyFriends)}
              className="whitespace-nowrap"
            >
              {showOnlyFriends ? <UserCheck className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
              {showOnlyFriends ? 'Friends Only' : 'All Members'}
            </Button>

            {/* Filter: With Socials */}
            <Button
              variant={showOnlyWithSocials ? 'default' : 'outline'}
              onClick={() => setShowOnlyWithSocials(!showOnlyWithSocials)}
              className="whitespace-nowrap"
            >
              {showOnlyWithSocials ? <Share2 className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
              {showOnlyWithSocials ? 'With Socials' : 'All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
        </p>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No members found</p>
            <p className="text-sm mt-2">
              {showOnlyWithSocials 
                ? 'Try toggling filters to see more members' 
                : 'No members match your search'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const socialLinks = getSocialLinks(member);
            const isFriend = mutualConnectionIds.has(member.id);

            return (
              <Card key={member.id} className="hover:shadow-lg transition-all border-2 hover:border-indigo-200">
                <CardContent className="pt-6">
                  {/* Profile Section */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        {getInitials(member.name)}
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

                  {/* Friend Badge */}
                  {isFriend && (
                    <Badge variant="default" className="mb-3 bg-green-100 text-green-700 hover:bg-green-100">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Friend
                    </Badge>
                  )}

                  {/* Social Links Icon Bar */}
                  {socialLinks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {socialLinks.map((link, index) => {
                          const IconComponent = link.icon;
                          return (
                            <button
                              key={index}
                              onClick={() => window.open(link.url, '_blank')}
                              className={`${link.color} text-white p-2.5 rounded-lg transition-all hover:scale-110 shadow-sm`}
                              title={link.platform}
                            >
                              <IconComponent className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>

                      {/* vCard Download Button */}
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
