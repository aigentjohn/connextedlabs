import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { FolderKanban, ArrowRight, Calendar, Users, BookOpen, Plus } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { accessTicketService } from '@/services/accessTicketService';

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  member_ids: string[];
  admin_ids: string[];
  created_at: string;
}

interface UserProgramStatus {
  program: Program;
  status: string; // 'visitor', 'applied', 'approved', 'enrolled', 'active', 'completed', etc.
  enrolledAt?: string;
}

export default function MyProgramsPage() {
  const { profile } = useAuth();
  const [userPrograms, setUserPrograms] = useState<UserProgramStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMyPrograms();
    }
  }, [profile]);

  const fetchMyPrograms = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      const programMap = new Map<string, UserProgramStatus>();

      // 1. Fetch from access_tickets (unified system — source of truth)
      try {
        const tickets = await accessTicketService.getUserTicketsByType(profile.id, 'program');
        
        if (tickets && tickets.length > 0) {
          const ticketProgramIds = tickets.map(t => t.container_id).filter(Boolean) as string[];
          
          if (ticketProgramIds.length > 0) {
            const { data: ticketPrograms } = await supabase
              .from('programs')
              .select('id, name, slug, description, cover_image, member_ids, admin_ids, created_at')
              .in('id', ticketProgramIds);

            for (const ticket of tickets) {
              const prog = ticketPrograms?.find(p => p.id === ticket.container_id);
              if (prog) {
                programMap.set(prog.id, {
                  program: {
                    id: prog.id,
                    name: prog.name,
                    slug: prog.slug,
                    description: prog.description,
                    image: prog.cover_image,
                    member_ids: prog.member_ids || [],
                    admin_ids: prog.admin_ids || [],
                    created_at: prog.created_at,
                  },
                  status: ticket.status === 'completed' ? 'completed' : 'enrolled',
                  enrolledAt: ticket.granted_at,
                });
              }
            }
          }
        }
      } catch (ticketErr) {
        console.error('Failed to fetch program tickets (non-fatal):', ticketErr);
      }

      // 2. Fallback: also fetch from legacy program_members
      try {
        const { data: memberRecords, error: memberError } = await supabase
          .from('program_members')
          .select(`
            id,
            program_id,
            status,
            enrolled_at,
            programs (
              id,
              name,
              slug,
              description,
              cover_image,
              member_ids,
              admin_ids,
              created_at
            )
          `)
          .eq('user_id', profile.id)
          .in('status', ['enrolled', 'active', 'completed'])
          .order('enrolled_at', { ascending: false });

        if (!memberError && memberRecords) {
          for (const record of memberRecords) {
            if (record.programs && !programMap.has(record.programs.id)) {
              programMap.set(record.programs.id, {
                program: {
                  id: record.programs.id,
                  name: record.programs.name,
                  slug: record.programs.slug,
                  description: record.programs.description,
                  image: record.programs.cover_image,
                  member_ids: record.programs.member_ids || [],
                  admin_ids: record.programs.admin_ids || [],
                  created_at: record.programs.created_at,
                },
                status: record.status,
                enrolledAt: record.enrolled_at,
              });
            }
          }
        }
      } catch (legacyErr) {
        console.error('Failed to fetch legacy program members (non-fatal):', legacyErr);
      }

      setUserPrograms(Array.from(programMap.values()));
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        toast.error('Failed to load your programs');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'enrolled':
      case 'active':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'applied':
        return 'outline';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'My Programs' }]} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading your programs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Programs' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">My Programs</h1>
          <p className="text-gray-600">
            Programs you're enrolled in or participating in
          </p>
        </div>
        <Link to="/programs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
        </Link>
      </div>

      {/* Programs Grid */}
      {userPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No programs yet
              </h3>
              <p className="text-gray-600 mb-6">
                You're not enrolled in any programs. Explore available programs to join.
              </p>
              <Link to="/programs">
                <Button>
                  Browse Programs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userPrograms.map(({ program, status, enrolledAt }) => (
            <Link key={program.id} to={`/programs/${program.slug}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                {/* Program Image */}
                {program.image && (
                  <div className="h-40 w-full overflow-hidden rounded-t-lg">
                    <img
                      src={program.image}
                      alt={program.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {program.name}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {getStatusLabel(status)}
                    </Badge>
                  </div>
                  {program.description && (
                    <CardDescription className="line-clamp-2">
                      {program.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{program.member_ids.length} members</span>
                    </div>
                    {enrolledAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Enrolled {new Date(enrolledAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button variant="ghost" size="sm" className="w-full group">
                      View Program
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Info Card */}
      {userPrograms.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center text-indigo-900">
              <BookOpen className="w-5 h-5 mr-2" />
              About Your Programs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm">
              Programs are structured learning or cohort-based experiences that may include
              journeys, events, resources, and community interactions. Your status in each
              program determines your access level and available actions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}