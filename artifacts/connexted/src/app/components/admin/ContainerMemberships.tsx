// Split candidate: ~451 lines — consider extracting MembershipTable, MembershipTypeFilter, and RemoveMemberDialog into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  Users, 
  Table as TableIcon,
  TrendingUp,
  Video,
  Presentation,
  Hammer,
  MessageSquare,
  Users2,
  Search,
  Download,
  Upload,
  ArrowLeft,
  BarChart3,
  Settings,
  Info
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface ContainerStats {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  adminCount: number;
  visibility?: string;
  access_type?: string;
  created_at: string;
}

export default function ContainerMemberships() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'circles' | 'tables' | 'elevators' | 'meetings' | 'pitches' | 'builds' | 'standups' | 'meetups'>('circles');
  const [containers, setContainers] = useState<ContainerStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMemberships: 0,
    totalContainers: 0,
    averageMembers: 0,
  });

  useEffect(() => {
    fetchContainers();
  }, [activeTab]);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(activeTab)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const containerStats: ContainerStats[] = (data || []).map((container: any) => ({
        id: container.id,
        name: container.name,
        slug: container.slug,
        description: container.description,
        memberCount: (container.member_ids || []).length,
        adminCount: (container.admin_ids || []).length,
        visibility: container.visibility,
        access_type: container.access_type,
        created_at: container.created_at,
      }));

      setContainers(containerStats);
      
      // Calculate stats
      const totalMembers = containerStats.reduce((sum, c) => sum + c.memberCount, 0);
      setStats({
        totalMemberships: totalMembers,
        totalContainers: containerStats.length,
        averageMembers: containerStats.length > 0 ? Math.round(totalMembers / containerStats.length) : 0,
      });
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    const exportData = {
      containerType: activeTab,
      exportDate: new Date().toISOString(),
      stats,
      containers: containers.map(c => ({
        name: c.name,
        slug: c.slug,
        description: c.description,
        memberCount: c.memberCount,
        adminCount: c.adminCount,
        visibility: c.visibility || c.access_type,
        access_type: c.access_type,
        created: new Date(c.created_at).toLocaleDateString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-memberships-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const importFromJSON = async () => {
    // Only allow import for simpler containers (not circles)
    if (activeTab === 'circles') {
      toast.error('Import is not yet supported for Circles');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate the import data
        if (!importData.containerType) {
          toast.error('Invalid import file: missing containerType');
          return;
        }

        if (importData.containerType !== activeTab) {
          toast.error(`This file is for ${importData.containerType}, but you're viewing ${activeTab}. Please switch tabs or use the correct file.`);
          return;
        }

        if (!Array.isArray(importData.containers)) {
          toast.error('Invalid import file: containers must be an array');
          return;
        }

        // Process import for simpler containers
        toast.loading('Importing containers...');
        
        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const container of importData.containers) {
          try {
            // Check if container already exists
            const { data: existing } = await supabase
              .from(activeTab)
              .select('id')
              .eq('slug', container.slug)
              .single();

            if (existing) {
              skippedCount++;
              continue;
            }

            // Create new container with basic fields
            const newContainer: any = {
              name: container.name,
              slug: container.slug,
              description: container.description || `Imported ${container.name}`,
              admin_ids: profile?.id ? [profile.id] : [],
              member_ids: [],
            };

            // Add container-specific fields
            if (activeTab === 'tables' || activeTab === 'elevators') {
              newContainer.access_type = container.visibility || container.access_type || 'public';
            } else {
              newContainer.visibility = container.visibility || 'public';
            }

            const { error } = await supabase
              .from(activeTab)
              .insert([newContainer]);

            if (error) throw error;

            importedCount++;
          } catch (error) {
            console.error(`Error importing ${container.name}:`, error);
            errorCount++;
          }
        }

        toast.dismiss();
        
        if (importedCount > 0) {
          toast.success(`Successfully imported ${importedCount} container(s)`);
        }
        if (skippedCount > 0) {
          toast.info(`Skipped ${skippedCount} existing container(s)`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to import ${errorCount} container(s)`);
        }

        // Refresh the list
        fetchContainers();
      } catch (error) {
        console.error('Import error:', error);
        toast.dismiss();
        toast.error('Failed to import: Invalid JSON file');
      }
    };

    input.click();
  };

  if (profile?.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Access denied. Platform admin only.</p>
      </div>
    );
  }

  const filteredContainers = containers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerConfig = {
    circles: { icon: Users, label: 'Circles', basePath: '/circles' },
    tables: { icon: TableIcon, label: 'Tables', basePath: '/tables' },
    elevators: { icon: TrendingUp, label: 'Elevators', basePath: '/elevators' },
    meetings: { icon: Video, label: 'Meetings', basePath: '/meetings' },
    pitches: { icon: Presentation, label: 'Pitches', basePath: '/pitches' },
    builds: { icon: Hammer, label: 'Builds', basePath: '/builds' },
    standups: { icon: MessageSquare, label: 'Standups', basePath: '/standups' },
    meetups: { icon: Users2, label: 'Meetups', basePath: '/meetups' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Container Memberships', href: '/platform-admin/container-memberships' }
        ]} 
      />

      <div>
        <h1 className="text-3xl mb-2">Container Memberships</h1>
        <p className="text-gray-600">View who belongs to which containers across the platform</p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">About Container Memberships</h3>
              <p className="text-sm text-blue-800">
                This page tracks <strong>who belongs to which containers</strong> (Circles, Tables, Meetings, etc.). 
                This is different from billing/payment subscriptions, which are managed on the Subscription Packages page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalMemberships}</div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all {activeTab}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total {containerConfig[activeTab].label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalContainers}</div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Active containers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.averageMembers}</div>
              <Users2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Per {activeTab.slice(0, -1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Container Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {Object.entries(containerConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key}>
                <Icon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>{containerConfig[activeTab].label} Memberships</CardTitle>
                  <CardDescription>
                    View and manage who belongs to each {activeTab.slice(0, -1)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportToJSON} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={importFromJSON} variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Import JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Container List */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredContainers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No containers found matching your search' : `No ${activeTab} found`}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContainers.map((container) => (
                    <div 
                      key={container.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{container.name}</h3>
                          {container.visibility && (
                            <Badge variant="outline" className="text-xs">
                              {container.visibility}
                            </Badge>
                          )}
                          {container.access_type && (
                            <Badge variant="outline" className="text-xs">
                              {container.access_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {container.memberCount} member{container.memberCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            {container.adminCount} admin{container.adminCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created {new Date(container.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`${containerConfig[activeTab].basePath}/${container.slug}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link to={`${containerConfig[activeTab].basePath}/${container.slug}/settings`}>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}