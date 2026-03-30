import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
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
  Eye,
  Calendar,
  FileJson,
  Sparkles
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { MembersTab, ModerationTab } from '@/app/components/shared/ContainerSettings';
import { ExportImportManager } from '@/app/components/ExportImportManager';

interface Table {
  id: string;
  name: string;
  description: string;
  slug: string;
  member_ids: string[];
  admin_ids: string[];
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  guest_access?: {
    feed: boolean;
    members: boolean;
    documents: boolean;
    reviews: boolean;
  };
  circle_id: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function TableSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    
    const fetchTable = async () => {
      try {
        const { data, error } = await supabase
          .from('tables')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setTable(data);
      } catch (error) {
        console.error('Error fetching table:', error);
        toast.error('Failed to load table');
        navigate('/tables');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTable();
  }, [slug, navigate]);
  
  if (!profile) {
    return <div className="text-center py-12">Please log in</div>;
  }
  
  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }
  
  if (!table) {
    return <div className="text-center py-12">Table not found</div>;
  }
  
  const isAdmin = profile.role === 'super' || table.admin_ids.includes(profile.id);
  
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access to this table</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/tables/${slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Table
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Tables', href: '/tables' },
          { label: table.name, href: `/tables/${slug}` },
          { label: 'Settings', href: `/tables/${slug}/settings` }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Table Settings</h1>
        <p className="text-gray-600">Manage {table.name}</p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">
            <Sparkles className="w-4 h-4 mr-2" />
            Info
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="guest-access">
            <Eye className="w-4 h-4 mr-2" />
            Guest Access
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

        <TabsContent value="info" className="space-y-4 mt-6">
          <BasicInfoTab table={table} setTable={setTable} />
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-6">
          <MembersTab 
            containerId={table.id}
            containerName={table.name}
            containerType="tables"
            memberIds={table.member_ids}
            adminIds={table.admin_ids}
            currentUserId={profile.id}
            onUpdate={(updates) => setTable({ ...table, ...updates })}
          />
        </TabsContent>

        <TabsContent value="guest-access" className="space-y-4 mt-6">
          <GuestAccessTab table={table} setTable={setTable} />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4 mt-6">
          <ModerationTab 
            containerIdField="table_id"
            containerId={table.id}
            containerName={table.name}
          />
        </TabsContent>

        <TabsContent value="export-import" className="space-y-4 mt-6">
          <ExportImportManager 
            containerId={table.id}
            containerName={table.name}
            containerType="table"
            circleId={table.circle_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Guest Access Tab Component
function GuestAccessTab({ table, setTable }: { table: Table; setTable: (table: Table) => void }) {
  const defaultAccess = {
    feed: false,
    members: false,
    documents: false,
    reviews: false,
  };

  const [guestAccess, setGuestAccess] = useState(table.guest_access || defaultAccess);

  const handleToggleAccess = async (key: string) => {
    const updated = { ...guestAccess, [key]: !guestAccess[key] };

    try {
      const { error } = await supabase
        .from('tables')
        .update({ guest_access: updated })
        .eq('id', table.id);

      if (error) throw error;

      setGuestAccess(updated);
      setTable({ ...table, guest_access: updated });
      toast.success(`Guest access to ${key} ${!guestAccess[key] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating guest access:', error);
      toast.error('Failed to update guest access');
    }
  };

  const handleBulkUpdate = async (enabled: boolean) => {
    const allAccess = {
      feed: enabled,
      members: enabled,
      documents: enabled,
      reviews: enabled,
    };

    try {
      const { error } = await supabase
        .from('tables')
        .update({ guest_access: allAccess })
        .eq('id', table.id);

      if (error) throw error;

      setGuestAccess(allAccess);
      setTable({ ...table, guest_access: allAccess });
      toast.success(`All guest access ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating guest access:', error);
      toast.error('Failed to update guest access');
    }
  };

  const accessItems = [
    { key: 'feed', label: 'Feed', icon: MessageSquare, description: 'Allow guests to view posts and updates' },
    { key: 'members', label: 'Members', icon: Users, description: 'Allow guests to see the member directory' },
    { key: 'documents', label: 'Documents', icon: FileText, description: 'Allow guests to access documents' },
    { key: 'reviews', label: 'Reviews', icon: Star, description: 'Allow guests to read reviews' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guest Access Control</CardTitle>
          <CardDescription>
            Configure which content tabs are visible to non-members when they view this table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accessItems.map(item => {
            const Icon = item.icon;
            const isEnabled = guestAccess[item.key];
            
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="w-5 h-5 text-gray-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900">{item.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={isEnabled ? 'outline' : 'default'}
                    onClick={() => handleToggleAccess(item.key)}
                  >
                    {isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => handleBulkUpdate(true)}>
            Enable All
          </Button>
          <Button variant="outline" onClick={() => handleBulkUpdate(false)}>
            Disable All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Basic Info Tab Component
function BasicInfoTab({ table, setTable }: { table: any; setTable: (table: any) => void }) {
  const [category, setCategory] = useState(table.category || '');
  const [tagline, setTagline] = useState(table.tagline || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('tables')
        .update({ category, tagline })
        .eq('id', table.id);

      if (error) throw error;

      setTable({ ...table, category, tagline });
      toast.success('Table info updated');
    } catch (error) {
      console.error('Error updating table info:', error);
      toast.error('Failed to update table info');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Table Identity
        </CardTitle>
        <CardDescription>
          Set the category and tagline that will appear on table cards. This helps members quickly understand what your table is about.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Collaboration, Resources, Data, Community"
            className="mt-1"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            Main purpose/type. This appears as a prominent badge on the table card.
          </p>
        </div>

        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Shared resources for the community"
            className="mt-1"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            Short, compelling description (shown under table name on cards)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Info'}
        </Button>
      </CardContent>
    </Card>
  );
}