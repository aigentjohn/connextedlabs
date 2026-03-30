import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { Users, ArrowLeft, Shield, FileJson } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

export default function StandupSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [standup, setStandup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchStandup = async () => {
      try {
        const { data, error } = await supabase
          .from('standups')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setStandup(data);
      } catch (error) {
        console.error('Error fetching standup:', error);
        toast.error('Failed to load standup');
        navigate('/standups');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStandup();
  }, [slug, navigate]);
  
  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!standup) return <div className="text-center py-12">Standup not found</div>;
  
  const isAdmin = profile.role === 'super' || standup.admin_ids?.includes(profile.id) || standup.created_by === profile.id;
  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/standups/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Standup
        </Button>
      </Link>

      <Breadcrumbs 
        items={[
          { label: 'Standups', href: '/standups' },
          { label: standup.name, href: `/standups/${slug}` },
          { label: 'Settings', href: `/standups/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Standup Settings</h1>
        <p className="text-gray-600">Manage {standup.name}</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderate</TabsTrigger>
          <TabsTrigger value="export-import"><FileJson className="w-4 h-4 mr-2" />Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersTab 
            containerId={standup.id}
            containerName={standup.name}
            containerType="standups"
            memberIds={standup.member_ids || []}
            adminIds={standup.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setStandup({ ...standup, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab 
            containerIdField="standup_ids"
            containerId={standup.id}
            containerName={standup.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="mt-6">
          <ExportImportManager 
            containerId={standup.id}
            containerName={standup.name}
            containerType="standup"
            circleId={standup.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}