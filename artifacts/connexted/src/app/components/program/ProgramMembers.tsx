import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Users, Search, UserPlus, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface ProgramMembersProps {
  programId: string;
  isAdmin: boolean;
  selectedJourneyId?: string | null;
}

interface Member {
  id: string;
  user_id: string;
  program_id: string;
  status: string;
  enrolled_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    tagline?: string;
    role?: string;
  };
}

export function ProgramMembers({ programId, isAdmin, selectedJourneyId }: ProgramMembersProps) {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('program_members')
        .select(`
          id,
          user_id,
          program_id,
          status,
          enrolled_at,
          user:users!program_members_user_id_fkey (
            id,
            name,
            email,
            avatar,
            tagline,
            role
          )
        `)
        .eq('program_id', programId)
        .in('status', ['enrolled', 'active', 'completed'])
        .order('enrolled_at', { ascending: true });

      if (error) throw error;

      setMembers(data as Member[]);
    } catch (error) {
      console.error('Error fetching program members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [programId]);

  // Filter members by search query
  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.user.name?.toLowerCase().includes(searchLower) ||
      member.user.email?.toLowerCase().includes(searchLower) ||
      member.user.tagline?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey Filter Badge (if active) */}
      {selectedJourneyId && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Showing all program members (journey filter doesn't affect members)
          </span>
        </div>
      )}

      {/* Header with Search and Admin Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <Badge variant="secondary">{members.length} members</Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {isAdmin && (
            <Link to={`/programs/${programId}/members/manage`}>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Manage Members
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">
              {searchQuery ? 'No members found matching your search' : 'No members yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Link key={member.id} to={`/users/${member.user.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={member.user.avatar || undefined} />
                      <AvatarFallback className="text-lg">
                        {member.user.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {member.user.name || 'Unknown'}
                      </h3>
                      {member.user.tagline && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {member.user.tagline}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {member.status === 'completed' && (
                          <Badge variant="default" className="text-xs">
                            Completed
                          </Badge>
                        )}
                        {member.user.role && member.user.role !== 'member' && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {member.user.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}