// Split candidate: ~505 lines — consider extracting MemberTable, MemberFiltersPanel, and MemberExportDialog into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Download, Search, Mail, Phone, MapPin, Briefcase, Calendar, Filter, FileDown, UserCheck, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  company?: string;
  position?: string;
  avatar_url?: string;
  created_at: string;
  user_class?: string;
  containers: string[]; // Names of containers they're in that admin manages
}

export default function MyAdminMembersPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'cards' | 'directory'>('cards');
  const [containerFilter, setContainerFilter] = useState<string>('all');
  const [allContainerNames, setAllContainerNames] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      fetchMembers();
    }
  }, [profile]);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, members, containerFilter]);

  const fetchMembers = async () => {
    if (!profile) return;

    try {
      const isPlatformAdmin = profile.role === 'super';
      const memberMap = new Map<string, MemberProfile>();
      const containerNamesSet = new Set<string>();

      // Fetch all container types where user is admin
      const containerTypes = [
        { table: 'circles', nameField: 'name' },
        { table: 'tables', nameField: 'name' },
        { table: 'elevators', nameField: 'name' },
        { table: 'meetings', nameField: 'name' },
        { table: 'pitches', nameField: 'name' },
        { table: 'builds', nameField: 'name' },
        { table: 'standups', nameField: 'name' },
        { table: 'meetups', nameField: 'name' },
      ];

      for (const containerType of containerTypes) {
        const { data: containers } = await supabase
          .from(containerType.table)
          .select('id, name, member_ids, admin_ids');

        if (!containers) continue;

        const filteredContainers = isPlatformAdmin
          ? containers
          : containers.filter((c: any) => c.admin_ids?.includes(profile.id));

        for (const container of filteredContainers) {
          containerNamesSet.add(container.name);
          const memberIds = container.member_ids || [];

          for (const memberId of memberIds) {
            if (memberMap.has(memberId)) {
              // Add container to existing member
              const member = memberMap.get(memberId)!;
              member.containers.push(container.name);
            } else {
              // Fetch member profile
              const { data: profileData } = await supabase
                .from('users')
                .select('*')
                .eq('id', memberId)
                .single();

              if (profileData) {
                memberMap.set(memberId, {
                  id: profileData.id,
                  name: profileData.name,
                  email: profileData.email,
                  phone: profileData.phone,
                  location: profileData.location,
                  bio: profileData.bio,
                  company: profileData.company,
                  position: profileData.position,
                  avatar_url: profileData.avatar_url,
                  created_at: profileData.created_at,
                  user_class: profileData.user_class,
                  containers: [container.name],
                });
              }
            }
          }
        }
      }

      const membersArray = Array.from(memberMap.values());
      setMembers(membersArray);
      setFilteredMembers(membersArray);
      setAllContainerNames(Array.from(containerNamesSet).sort());
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.company?.toLowerCase().includes(query) ||
          m.position?.toLowerCase().includes(query) ||
          m.location?.toLowerCase().includes(query)
      );
    }

    // Filter by container
    if (containerFilter !== 'all') {
      filtered = filtered.filter((m) => m.containers.includes(containerFilter));
    }

    setFilteredMembers(filtered);
  };

  const downloadDirectory = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Email', 'Phone', 'Company', 'Position', 'Location', 'User Class', 'Containers', 'Member Since'];
      const rows = filteredMembers.map((m) => [
        m.name,
        m.email,
        m.phone || '',
        m.company || '',
        m.position || '',
        m.location || '',
        m.user_class || '',
        m.containers.join('; '),
        new Date(m.created_at).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `member-directory-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Directory downloaded successfully');
    } catch (error) {
      console.error('Error downloading directory:', error);
      toast.error('Failed to download directory');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Admin', href: '/admin' },
          { label: 'Members' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Members Management</h1>
          <p className="text-gray-600">
            View and manage members across containers you administer
          </p>
        </div>
        <Button onClick={downloadDirectory} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Directory
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-3xl font-bold mt-2">{members.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Containers</p>
                <p className="text-3xl font-bold mt-2">{allContainerNames.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Filtered Results</p>
                <p className="text-3xl font-bold mt-2">{filteredMembers.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search members by name, email, company, position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={containerFilter}
                onChange={(e) => setContainerFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">All Containers</option>
                {allContainerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'cards' | 'directory')}>
        <TabsList>
          <TabsTrigger value="cards">
            <Users className="w-4 h-4 mr-2" />
            Member Cards
          </TabsTrigger>
          <TabsTrigger value="directory">
            <FileDown className="w-4 h-4 mr-2" />
            Directory View
          </TabsTrigger>
        </TabsList>

        {/* Member Cards View */}
        <TabsContent value="cards" className="mt-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No members found matching your filters
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Link to={`/users/${member.id}`}>
                          <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors truncate">
                            {member.name}
                          </h3>
                        </Link>
                        {member.position && member.company && (
                          <p className="text-sm text-gray-600 truncate">
                            {member.position} at {member.company}
                          </p>
                        )}
                        {member.user_class && (
                          <Badge variant="secondary" className="mt-1">
                            {member.user_class}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      {member.email && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{member.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Member of:</p>
                      <div className="flex flex-wrap gap-1">
                        {member.containers.slice(0, 3).map((container) => (
                          <Badge key={container} variant="outline" className="text-xs">
                            {container}
                          </Badge>
                        ))}
                        {member.containers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.containers.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link to={`/users/${member.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Directory View */}
        <TabsContent value="directory" className="mt-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No members found matching your filters
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Member Directory</CardTitle>
                <CardDescription>
                  Complete contact information for all members ({filteredMembers.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Phone</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Company</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Position</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Containers</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <Avatar className="w-8 h-8 mr-3">
                                <AvatarImage src={member.avatar_url} alt={member.name} />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                {member.user_class && (
                                  <p className="text-xs text-gray-500">{member.user_class}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{member.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{member.phone || '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{member.company || '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{member.position || '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{member.location || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {member.containers.slice(0, 2).map((container) => (
                                <Badge key={container} variant="outline" className="text-xs">
                                  {container}
                                </Badge>
                              ))}
                              {member.containers.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{member.containers.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Link to={`/users/${member.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Privacy & Data Protection</p>
              <p>
                As a container administrator, you have access to member contact information for communication and management purposes. 
                Please respect member privacy and use this information responsibly. Member Moments and personal containers remain private.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}