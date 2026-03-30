import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { WaitlistManager } from './WaitlistManager';
import { Loader2, Users, AlertCircle, Info, Ticket } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface Program {
  id: string;
  name: string;
  slug: string;
  waitlist_count?: number;
}

export function WaitlistManagementPage() {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      loadPrograms();
    }
  }, [profile]);

  const loadPrograms = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch programs where user is admin
      const isPlatformAdmin = profile.role === 'super';
      let query = supabase.from('programs').select('id, name, slug, admin_ids');

      if (!isPlatformAdmin) {
        query = query.contains('admin_ids', [profile.id]);
      }

      const { data: programsData, error: programsError } = await query;

      if (programsError) throw programsError;

      // For each program, get waitlist count
      const programsWithCounts = await Promise.all(
        (programsData || []).map(async (program) => {
          const { count } = await supabase
            .from('program_applications')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', program.id)
            .eq('status', 'waitlisted');

          return {
            ...program,
            waitlist_count: count || 0,
          };
        })
      );

      setPrograms(programsWithCounts);

      // Auto-select first program with waitlist
      const firstProgramWithWaitlist = programsWithCounts.find(p => p.waitlist_count && p.waitlist_count > 0);
      if (firstProgramWithWaitlist) {
        setSelectedProgramId(firstProgramWithWaitlist.id);
      } else if (programsWithCounts.length > 0) {
        setSelectedProgramId(programsWithCounts[0].id);
      }
    } catch (error: any) {
      console.error('Error loading programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    // Reload counts after promotion
    await loadPrograms();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Program Admin', href: '/program-admin' },
            { label: 'Waitlist Management' },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Waitlist Management</CardTitle>
            <CardDescription>No programs found that you administer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">
                You don't have admin access to any programs yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalWaitlisted = programs.reduce((sum, p) => sum + (p.waitlist_count || 0), 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Program Admin', href: '/program-admin' },
          { label: 'Waitlist Management' },
        ]}
      />

      <div>
        <h1 className="text-3xl mb-2">Application Waitlist</h1>
        <p className="text-gray-600">
          Promote waitlisted applicants when spots open. Promoting creates an access ticket and grants program membership.
        </p>
      </div>

      {/* Two-system explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Application Waitlist (this page)</p>
            <p className="text-xs text-blue-700 mt-1">
              People who completed a program application but couldn't be accepted yet. High intent, already vetted. Promote when a spot opens.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Ticket className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Ticket Waitlist (Ticket Inventory)</p>
            <p className="text-xs text-amber-700 mt-1">
              People who clicked "Join Waitlist" on a landing page. Passive demand signal, no application required. Fulfill via Ticket Inventory admin.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Programs</p>
                <p className="text-3xl font-bold mt-2">{programs.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Waitlisted</p>
                <p className="text-3xl font-bold mt-2">{totalWaitlisted}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Programs with Waitlists</p>
                <p className="text-3xl font-bold mt-2">
                  {programs.filter(p => p.waitlist_count && p.waitlist_count > 0).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Tabs by Program */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlisted Applications by Program</CardTitle>
          <CardDescription>
            View and manage applicants on the waitlist. Promote them when spots become available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedProgramId || undefined} onValueChange={setSelectedProgramId}>
            <TabsList className="flex-wrap h-auto">
              {programs.map((program) => (
                <TabsTrigger key={program.id} value={program.id} className="flex items-center gap-2">
                  {program.name}
                  {program.waitlist_count && program.waitlist_count > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {program.waitlist_count}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      0
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {programs.map((program) => (
              <TabsContent key={program.id} value={program.id} className="mt-6">
                {selectedProgramId === program.id && (
                  <WaitlistManager programId={program.id} onPromote={handlePromote} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default WaitlistManagementPage;