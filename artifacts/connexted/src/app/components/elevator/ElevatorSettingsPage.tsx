import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Star,
  ArrowLeft,
  Shield,
  UserPlus,
  UserX,
  Trash2,
  Search,
  FileJson
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

interface Elevator {
  id: string;
  name: string;
  description: string;
  slug: string;
  member_ids: string[];
  admin_ids: string[];
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  circle_id: string;
}

export default function ElevatorSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [elevator, setElevator] = useState<Elevator | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchElevator = async () => {
      try {
        const { data, error } = await supabase
          .from('elevators')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setElevator(data);
      } catch (error) {
        console.error('Error fetching elevator:', error);
        toast.error('Failed to load elevator');
        navigate('/elevators');
      } finally {
        setLoading(false);
      }
    };
    
    fetchElevator();
  }, [slug, navigate]);
  
  if (!profile) {
    return <div className="text-center py-12">Please log in</div>;
  }
  
  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }
  
  if (!elevator) {
    return <div className="text-center py-12">Elevator not found</div>;
  }
  
  const isAdmin = profile.role === 'super' || elevator.admin_ids.includes(profile.id);
  
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access to this elevator</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/elevators/${slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Elevator
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Elevators', href: '/elevators' },
          { label: elevator.name, href: `/elevators/${slug}` },
          { label: 'Settings', href: `/elevators/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Elevator Settings</h1>
        <p className="text-gray-600">Manage {elevator.name}</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Shield className="w-4 h-4 mr-2" />
            Moderate
          </TabsTrigger>
          <TabsTrigger value="export-import">
            <FileJson className="w-4 h-4 mr-2" />
            Export/Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-6">
          <MembersTab 
            containerId={elevator.id}
            containerName={elevator.name}
            containerType="elevators"
            memberIds={elevator.member_ids}
            adminIds={elevator.admin_ids}
            currentUserId={profile.id}
            onUpdate={(updates) => setElevator({ ...elevator, ...updates })}
          />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4 mt-6">
          <ModerationTab 
            containerIdField="elevator_ids"
            containerId={elevator.id}
            containerName={elevator.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="space-y-4 mt-6">
          <ExportImportManager 
            containerId={elevator.id}
            containerName={elevator.name}
            containerType="elevator"
            circleId={elevator.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}