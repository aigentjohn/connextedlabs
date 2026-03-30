import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import {
  Users,
  ArrowLeft,
  Settings as SettingsIcon,
  Shield,
  FileJson,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

interface Library {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'auto_generated' | 'manual';
  owner_type: 'user' | 'circle' | 'platform';
  is_public: boolean;
  member_ids: string[];
  admin_ids: string[];
  created_by: string | null;
  circle_id: string | null;
}

export default function LibrarySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchLibrary();
  }, [id]);

  const fetchLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLibrary(data);
    } catch (error) {
      console.error('Error fetching library:', error);
      toast.error('Failed to load library');
      navigate('/libraries');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="text-center py-12">Please log in</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!library) {
    return <div className="text-center py-12">Library not found</div>;
  }

  // Check if current user is admin
  const isAdmin = profile.role === 'super' || library.admin_ids?.includes(profile.id);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access to this library</p>
      </div>
    );
  }

  // System libraries cannot have members managed (only platform admins can edit them)
  if (library.type === 'system' && profile.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">System libraries cannot have members managed</p>
        <Link to={`/libraries/${id}`}>
          <Button variant="outline" className="mt-4">
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/libraries/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>

      <Breadcrumbs
        items={[
          { label: 'Libraries', href: '/libraries' },
          { label: library.name, href: `/libraries/${id}` },
          { label: 'Settings', href: `/libraries/${id}/settings` },
        ]}
      />

      <div>
        <h1 className="text-3xl mb-2">Library Settings</h1>
        <p className="text-gray-600">Manage {library.name}</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="export-import">
            <FileJson className="w-4 h-4 mr-2" />
            Export/Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-6">
          <MembersTab
            containerId={library.id}
            containerName={library.name}
            containerType="libraries"
            memberIds={library.member_ids || []}
            adminIds={library.admin_ids || []}
            currentUserId={profile.id}
            onUpdate={(updates) => setLibrary({ ...library, ...updates })}
          />
        </TabsContent>

        <TabsContent value="general" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic library information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Library Name</label>
                <p className="text-gray-900">{library.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <p className="text-gray-600">{library.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 capitalize">{library.type.replace('_', ' ')}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Visibility</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{library.is_public ? 'Public' : 'Private'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-import" className="space-y-4 mt-6">
          <ExportImportManager
            containerId={library.id}
            containerName={library.name}
            containerType="library"
            circleId={library.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}