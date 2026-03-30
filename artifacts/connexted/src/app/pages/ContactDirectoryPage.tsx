import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { 
  ContactRound,
  Search,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building,
  Grid3x3,
  List,
  FileDown,
  Filter,
  X,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { generateVCardFromProfile, downloadVCard } from '@/lib/vcard-parser';
import { toast } from 'sonner';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';

interface ContactMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  job_title: string | null;
  company_name: string | null;
  whatsapp_number: string | null;
  privacy_settings: {
    share_contact_info?: boolean;
    show_email?: boolean;
    show_whatsapp?: boolean;
    show_location?: boolean;
    show_current_company?: boolean;
  } | null;
}

type ViewMode = 'cards' | 'table';
type SortOption = 'name' | 'company' | 'location';

export default function ContactDirectoryPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactMember[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showOnlyShared, setShowOnlyShared] = useState(true);
  const [mutualConnectionIds, setMutualConnectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchMutualConnections();
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortContacts();
  }, [contacts, searchQuery, sortBy, showOnlyShared, mutualConnectionIds]);

  const fetchMutualConnections = async () => {
    try {
      // Get users the current user follows
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

      // Get users who follow the current user back (mutual connections)
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
      toast.error('Failed to load connections');
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);

      // Fetch all users who have opted to share their contact info
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar, tagline, bio, location, job_title, company_name, whatsapp_number, privacy_settings')
        .neq('id', user!.id); // Exclude current user

      if (error) throw error;

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortContacts = () => {
    let filtered = [...contacts];

    // Filter to only mutual connections (friends)
    filtered = filtered.filter(contact => 
      mutualConnectionIds.has(contact.id)
    );

    // Filter by share_contact_info setting
    if (showOnlyShared) {
      filtered = filtered.filter(contact => 
        contact.privacy_settings?.share_contact_info === true
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.company_name?.toLowerCase().includes(query) ||
        contact.location?.toLowerCase().includes(query) ||
        contact.job_title?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'company':
          return (a.company_name || '').localeCompare(b.company_name || '');
        case 'location':
          return (a.location || '').localeCompare(b.location || '');
        default:
          return 0;
      }
    });

    setFilteredContacts(filtered);
  };

  const handleDownloadVCard = (contact: ContactMember) => {
    try {
      const profileData = {
        name: contact.name,
        email: contact.privacy_settings?.show_email ? contact.email : undefined,
        phone: contact.privacy_settings?.show_whatsapp ? contact.whatsapp_number : undefined,
        title: contact.job_title || undefined,
        organization: contact.company_name || undefined,
        location: contact.privacy_settings?.show_location ? contact.location : undefined,
        bio: contact.bio || undefined,
      };

      const vcardText = generateVCardFromProfile(profileData);
      const filename = `${contact.name.replace(/\s+/g, '-').toLowerCase()}.vcf`;
      downloadVCard(vcardText, filename);
      
      toast.success(`Downloaded vCard for ${contact.name}`);
    } catch (error) {
      console.error('Error generating vCard:', error);
      toast.error('Failed to generate vCard');
    }
  };

  const handleBulkDownload = () => {
    try {
      let vcardText = '';
      
      filteredContacts.forEach(contact => {
        const profileData = {
          name: contact.name,
          email: contact.privacy_settings?.show_email ? contact.email : undefined,
          phone: contact.privacy_settings?.show_whatsapp ? contact.whatsapp_number : undefined,
          title: contact.job_title || undefined,
          organization: contact.company_name || undefined,
          location: contact.privacy_settings?.show_location ? contact.location : undefined,
          bio: contact.bio || undefined,
        };

        vcardText += generateVCardFromProfile(profileData) + '\n';
      });

      downloadVCard(vcardText, 'contacts-directory.vcf');
      toast.success(`Downloaded ${filteredContacts.length} contacts`);
    } catch (error) {
      console.error('Error generating bulk vCards:', error);
      toast.error('Failed to generate vCards');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ContactRound className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold">Contact Directory</h1>
        </div>
        <p className="text-gray-600">
          Access contact information for your friends (mutual connections) who have opted to share their details
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
                placeholder="Search by name, email, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showOnlyShared ? 'default' : 'outline'}
              onClick={() => setShowOnlyShared(!showOnlyShared)}
              className="whitespace-nowrap"
            >
              {showOnlyShared ? <CheckCircle className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
              {showOnlyShared ? 'Sharing Only' : 'All Members'}
            </Button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 border rounded-md bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="company">Sort by Company</option>
              <option value="location">Sort by Location</option>
            </select>

            {/* View Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Bulk Download */}
            {filteredContacts.length > 0 && (
              <Button onClick={handleBulkDownload} variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Export All ({filteredContacts.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'} found
        </p>
      </div>

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <ContactRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No friends found</p>
              <p className="text-sm mt-2">
                Connect with other members to build mutual friendships and access their contact information
              </p>
              {!showOnlyShared && mutualConnectionIds.size > 0 && (
                <p className="text-sm mt-1">
                  Try toggling "Sharing Only" to see all friends
                </p>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar || undefined} />
                      <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link to={`/member/${contact.id}`}>
                        <CardTitle className="text-lg hover:text-indigo-600 transition-colors">
                          {contact.name}
                        </CardTitle>
                      </Link>
                      {contact.tagline && (
                        <CardDescription className="mt-1">
                          {contact.tagline}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Job & Company */}
                  {(contact.job_title || contact.company_name) && (
                    <div className="flex items-start gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        {contact.job_title && <div className="font-medium">{contact.job_title}</div>}
                        {contact.company_name && contact.privacy_settings?.show_current_company && (
                          <div className="text-gray-600">{contact.company_name}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {contact.location && contact.privacy_settings?.show_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{contact.location}</span>
                    </div>
                  )}

                  {/* Email */}
                  {contact.privacy_settings?.show_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {/* WhatsApp */}
                  {contact.whatsapp_number && contact.privacy_settings?.show_whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a href={`https://wa.me/${contact.whatsapp_number.replace(/[^0-9]/g, '')}`} className="hover:text-indigo-600 truncate">
                        {contact.whatsapp_number}
                      </a>
                    </div>
                  )}

                  {/* Download Button */}
                  <div className="pt-2">
                    <Button
                      onClick={() => handleDownloadVCard(contact)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download vCard
                    </Button>
                  </div>

                  {/* Friend Badge & Sharing Badge */}
                  <div className="pt-1 flex gap-2 flex-wrap">
                    <Badge variant="default" className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Friend
                    </Badge>
                    {contact.privacy_settings?.share_contact_info && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Sharing Enabled
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ContactRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No friends found</p>
                <p className="text-sm mt-2">
                  Connect with other members to build mutual friendships and access their contact information
                </p>
                {!showOnlyShared && mutualConnectionIds.size > 0 && (
                  <p className="text-sm mt-1">
                    Try toggling "Sharing Only" to see all friends
                  </p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link to={`/member/${contact.id}`} className="flex items-center gap-3 hover:text-indigo-600">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={contact.avatar || undefined} />
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            {contact.tagline && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {contact.tagline}
                              </div>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{contact.job_title || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {contact.company_name && contact.privacy_settings?.show_current_company ? (
                          <span className="text-sm">{contact.company_name}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.location && contact.privacy_settings?.show_location ? (
                          <span className="text-sm">{contact.location}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.privacy_settings?.show_email ? (
                          <a href={`mailto:${contact.email}`} className="text-sm hover:text-indigo-600">
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">Hidden</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.whatsapp_number && contact.privacy_settings?.show_whatsapp ? (
                          <a 
                            href={`https://wa.me/${contact.whatsapp_number.replace(/[^0-9]/g, '')}`}
                            className="text-sm hover:text-indigo-600"
                          >
                            {contact.whatsapp_number}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleDownloadVCard(contact)}
                          variant="ghost"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}