import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ApplicationForm from '@/app/components/ApplicationForm';

export default function CircleRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [circle, setCircle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCircle();
    }
  }, [id]);

  const fetchCircle = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('circles')
        .select('id, name, access_type')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Circle not found');
        navigate('/circles');
        return;
      }

      // Check access type
      if (data.access_type === 'invite') {
        toast.error('This circle is invite-only');
        navigate(`/circles/${id}/landing`);
        return;
      }

      setCircle(data);
    } catch (error) {
      console.error('Error fetching circle:', error);
      toast.error('Failed to load circle');
      navigate('/circles');
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

  if (!circle) {
    return null;
  }

  return (
    <ApplicationForm
      containerType="circle"
      containerId={circle.id}
      containerName={circle.name}
      onSuccess={() => navigate(`/circles/${circle.id}`)}
      onCancel={() => navigate(`/circles/${circle.id}/landing`)}
    />
  );
}
