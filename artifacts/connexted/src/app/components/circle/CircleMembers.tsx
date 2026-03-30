import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Search, MapPin, Mail } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  tagline: string | null;
  location: string | null;
  interests: string[];
  badges: string[];
}

interface CircleMembersProps {
  circleId: string;
  isAdmin?: boolean;
  containerType?: 'circle' | 'table' | 'elevator' | 'meeting' | 'pitch';
}

export default function CircleMembers({ circleId, isAdmin, containerType = 'circle' }: CircleMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [circleId, containerType]);

  const fetchMembers = async () => {
    try {
      // Get the container and its member IDs based on type
      let tableName = 'circles';
      switch (containerType) {
        case 'table':
          tableName = 'tables';
          break;
        case 'elevator':
          tableName = 'elevators';
          break;
        case 'meeting':
          tableName = 'meetings';
          break;
        case 'pitch':
          tableName = 'pitches';
          break;
      }

      const { data: containerData, error: containerError } = await supabase
        .from(tableName)
        .select('member_ids')
        .eq('id', circleId)
        .single();

      if (containerError) throw containerError;

      if (containerData?.member_ids && containerData.member_ids.length > 0) {
        const { data: membersData, error: membersError } = await supabase
          .from('users')
          .select('id, name, email, avatar, tagline, location, interests, badges')
          .in('id', containerData.member_ids);

        if (membersError) throw membersError;
        setMembers(membersData || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading members...</div>
      </div>
    );
  }

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.location && member.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="text-xl">{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-medium text-lg mb-1">{member.name}</h3>
                {member.tagline && (
                  <p className="text-sm text-gray-600 mb-3">{member.tagline}</p>
                )}
                
                <div className="w-full space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.location && (
                    <div className="flex items-center justify-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{member.location}</span>
                    </div>
                  )}
                </div>

                {member.interests && member.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4 justify-center">
                    {member.interests.slice(0, 3).map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

                {member.badges && member.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                    {member.badges.slice(0, 2).map((badge, index) => (
                      <Badge key={index} variant="default" className="text-xs">
                        {badge.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No members found
          </CardContent>
        </Card>
      )}
    </div>
  );
}