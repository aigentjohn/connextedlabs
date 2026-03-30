import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ApplicationForm from '@/app/components/ApplicationForm';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function ProgramApplicationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchProgram();
    }
  }, [slug]);

  const fetchProgram = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Program not found');
        navigate('/programs');
        return;
      }

      setProgram(data);
    } catch (error) {
      console.error('Error fetching program:', error);
      toast.error('Failed to load program');
      navigate('/programs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return null;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Programs', href: '/programs' },
          { label: program.name, href: `/programs/${program.slug}` },
          { label: 'Apply' },
        ]}
      />
      <ApplicationForm
        containerType="program"
        containerId={program.id}
        containerName={program.name}
        onSuccess={() => navigate(`/programs/${program.slug}`)}
        onCancel={() => navigate(`/programs/${program.slug}/landing`)}
      />
    </div>
  );
}