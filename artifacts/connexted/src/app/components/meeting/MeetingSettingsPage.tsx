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

export default function MeetingSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchMeeting = async () => {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        
        if (error) throw error;
        
        if (!data) {
          toast.error('Meeting not found');
          navigate('/meetings');
          return;
        }
        
        setMeeting(data);
      } catch (error) {
        console.error('Error fetching meeting:', error);
        toast.error('Failed to load meeting');
        navigate('/meetings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeeting();
  }, [slug, navigate]);
  
  if (!profile || loading) return <div className="text-center py-12">Loading...</div>;
  if (!meeting) return <div className="text-center py-12">Meeting not found</div>;
  
  const isAdmin = profile.role === 'super' || meeting.admin_ids?.includes(profile.id);
  if (!isAdmin) return <div className="text-center py-12">Access denied</div>;

  return (
    <div className="space-y-6">
      <Link to={`/meetings/${slug}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meeting
        </Button>
      </Link>

      <Breadcrumbs 
        items={[
          { label: 'Meetings', href: '/meetings' },
          { label: meeting.name, href: `/meetings/${slug}` },
          { label: 'Settings', href: `/meetings/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Meeting Settings</h1>
        <p className="text-gray-600">Manage {meeting.name}</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderate</TabsTrigger>
          <TabsTrigger value="export-import"><FileJson className="w-4 h-4 mr-2" />Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <MembersTab 
            containerId={meeting.id}
            containerName={meeting.name}
            containerType="meetings"
            memberIds={meeting.member_ids || []}
            adminIds={meeting.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setMeeting({ ...meeting, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ModerationTab 
            containerIdField="meeting_ids"
            containerId={meeting.id}
            containerName={meeting.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="mt-6">
          <ExportImportManager 
            containerId={meeting.id}
            containerName={meeting.name}
            containerType="meeting"
            circleId={meeting.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}