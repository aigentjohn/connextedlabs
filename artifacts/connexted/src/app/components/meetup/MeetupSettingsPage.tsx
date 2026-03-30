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

export default function MeetupSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [meetup, setMeetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchMeetup = async () => {
      try {
        const { data, error } = await supabase
          .from('meetups')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setMeetup(data);
      } catch (error) {
        console.error('Error fetching meetup:', error);
        toast.error('Failed to load meetup');
        navigate('/meetups');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeetup();
  }, [slug, navigate]);
  
  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!meetup) return <div className="text-center py-12">Meetup not found</div>;
  
  const isAdmin = profile.role === 'super' || meetup.admin_ids?.includes(profile.id) || meetup.created_by === profile.id;
  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/meetups/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meetup
        </Button>
      </Link>

      <Breadcrumbs 
        items={[
          { label: 'Meetups', href: '/meetups' },
          { label: meetup.name, href: `/meetups/${slug}` },
          { label: 'Settings', href: `/meetups/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Meetup Settings</h1>
        <p className="text-gray-600">Manage {meetup.name}</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderate</TabsTrigger>
          <TabsTrigger value="export-import"><FileJson className="w-4 h-4 mr-2" />Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersTab 
            containerId={meetup.id}
            containerName={meetup.name}
            containerType="meetups"
            memberIds={meetup.member_ids || []}
            adminIds={meetup.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setMeetup({ ...meetup, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab 
            containerIdField="meetup_ids"
            containerId={meetup.id}
            containerName={meetup.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="mt-6">
          <ExportImportManager 
            containerId={meetup.id}
            containerName={meetup.name}
            containerType="meetup"
            circleId={meetup.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}