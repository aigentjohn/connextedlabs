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

export default function SprintSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sprint, setSprint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchSprint = async () => {
      try {
        const { data, error } = await supabase
          .from('sprints')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setSprint(data);
      } catch (error) {
        console.error('Error fetching sprint:', error);
        toast.error('Failed to load sprint');
        navigate('/sprints');
      } finally {
        setLoading(false);
      }
    };

    fetchSprint();
  }, [slug, navigate]);

  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!sprint) return <div className="text-center py-12">Sprint not found</div>;

  const isAdmin =
    profile.role === 'super' ||
    sprint.admin_ids?.includes(profile.id) ||
    sprint.created_by === profile.id;

  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/sprints/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sprint
        </Button>
      </Link>

      <Breadcrumbs
        items={[
          { label: 'Sprints', href: '/sprints' },
          { label: sprint.name, href: `/sprints/${slug}` },
          { label: 'Settings', href: `/sprints/${slug}/settings` },
        ]}
      />

      <div>
        <h1 className="text-3xl mb-2">Sprint Settings</h1>
        <p className="text-gray-600">Manage {sprint.name}</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />Members
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="w-4 h-4 mr-2" />Moderate
          </TabsTrigger>
          <TabsTrigger value="export-import">
            <FileJson className="w-4 h-4 mr-2" />Export/Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersTab
            containerId={sprint.id}
            containerName={sprint.name}
            containerType="sprints"
            memberIds={sprint.member_ids || []}
            adminIds={sprint.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setSprint({ ...sprint, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab
            containerIdField="sprint_ids"
            containerId={sprint.id}
            containerName={sprint.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="mt-6">
          <ExportImportManager
            containerId={sprint.id}
            containerName={sprint.name}
            containerType="sprint"
            circleId={sprint.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
