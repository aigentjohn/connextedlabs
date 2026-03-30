import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { ApplicationAnalyticsDashboard } from '@/app/components/admin/ApplicationAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Program {
  id: string;
  name: string;
  slug: string;
}

export default function ApplicationAnalyticsDashboardPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadPrograms();
    }
  }, [profile]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      
      // Load programs that the user is an admin for
      const { data: memberships, error: membershipsError } = await supabase
        .from('circle_memberships')
        .select(`
          circle_id,
          circles!inner(
            id,
            name,
            slug,
            circle_type
          )
        `)
        .eq('user_id', profile?.id)
        .eq('role', 'admin')
        .eq('circles.circle_type', 'program');

      if (membershipsError) throw membershipsError;

      const programsList = memberships?.map((m: any) => ({
        id: m.circles.id,
        name: m.circles.name,
        slug: m.circles.slug
      })) || [];

      setPrograms(programsList);

      // Set initial program from URL params or default to first program
      const programIdFromUrl = searchParams.get('programId');
      if (programIdFromUrl && programsList.find(p => p.id === programIdFromUrl)) {
        setSelectedProgramId(programIdFromUrl);
      } else if (programsList.length > 0) {
        setSelectedProgramId(programsList[0].id);
      }
    } catch (error: any) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setSearchParams({ programId });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumbs
          items={[
            { label: 'Program Admin', href: '/program-admin' },
            { label: 'Analytics' }
          ]}
        />
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>No Programs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have admin access to any programs yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumbs
        items={[
          { label: 'Program Admin', href: '/program-admin' },
          { label: 'Analytics' }
        ]}
      />

      <div className="mt-6 mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Program:</label>
          <Select value={selectedProgramId} onValueChange={handleProgramChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedProgramId && (
        <ApplicationAnalyticsDashboard programId={selectedProgramId} />
      )}
    </div>
  );
}
