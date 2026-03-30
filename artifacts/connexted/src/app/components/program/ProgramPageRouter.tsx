import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useIsProgramMember } from '@/hooks/useProgramMembership';
import ProgramLandingPage from './ProgramLandingPage';
import ProgramDetailPage from '@/app/components/ProgramDetailPage';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useNavigate } from 'react-router';

interface ProgramInstance {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  cover_image: string | null;
  status: 'not-started' | 'in-progress' | 'completed';
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  pricing_type?: 'free' | 'paid' | 'members-only';
  enrollment_status?: 'open' | 'closed' | 'invite-only';
  created_at: string;
  member_ids: string[];
  admin_ids: string[];
  created_by: string;
  capacity_limit?: number;
  enrollment_opens_at?: string;
  enrollment_closes_at?: string;
  start_date?: string;
  end_date?: string;
  program_overview?: string;
  learning_outcomes?: string[];
  prerequisites?: string[];
  application_requirements?: string[];
  application_deadline?: string;
  pricing_amount?: number;
  refund_policy?: string;
  contact_email?: string;
}

/**
 * Smart router that decides whether to show:
 * - Landing Page: ALWAYS shown at /programs/:slug for ALL users (members & non-members)
 * - Members see a "Go to Dashboard" CTA on the landing page
 * - Dashboard lives at /programs/:slug/dashboard (separate route, members only)
 */
export default function ProgramPageRouter() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [program, setProgram] = useState<ProgramInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMember, isLoading: membershipLoading } = useIsProgramMember(program?.id);

  useEffect(() => {
    if (slug) {
      fetchProgram();
    }
  }, [slug]);

  const fetchProgram = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      setProgram(data);
    } catch (error) {
      console.error('Error fetching program:', error);
      setProgram(null);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading || membershipLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading program...
        </div>
      </div>
    );
  }

  // Program not found
  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Program Not Found</CardTitle>
            <CardDescription>
              The program you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/programs/discover')}>
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has access to view this program based on visibility
  const canViewProgram = () => {
    if (!profile) return program.visibility === 'public';
    
    // Admins can see everything
    if (profile.role === 'super' || profile.role === 'admin') return true;
    
    // Program creator can see it
    if (program.created_by === profile.id) return true;
    
    // Program admins can see it
    if (program.admin_ids && program.admin_ids.includes(profile.id)) return true;
    
    // Members can see it
    if (isMember) return true;
    
    // Check visibility
    if (program.visibility === 'public') return true;
    if (program.visibility === 'member' && profile) return true;
    if (program.visibility === 'unlisted') return true;
    if (program.visibility === 'private') return false;
    
    return false;
  };

  // Access denied
  if (!canViewProgram()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This program is private. You don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/programs/discover')}>
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always show the landing page — members see enrollment status + "Go to Dashboard" CTA
  return <ProgramLandingPage program={program} />;
}