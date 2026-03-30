// Split candidate: ~409 lines — consider extracting BuildRow, BuildFilters, and BuildBulkActions into sub-components.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Hammer, Edit, Trash2, Search, Plus, Download, Users, FileText, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { format } from 'date-fns';

interface Build {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  tags: string[];
  member_ids: string[];
  admin_ids: string[];
  document_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function BuildsManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  
  useEffect(() => {
    if (!profile || profile.role !== 'super') return;

    const fetchBuilds = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('builds')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Handle table doesn't exist error gracefully
          if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
            console.log('Builds table not found');
            setBuilds([]);
            setLoading(false);
            return;
          }
          throw error;
        }
        setBuilds(data || []);
      } catch (error) {
        console.error('Error fetching builds:', error);
        toast.error('Failed to load builds');
      } finally {
        setLoading(false);
      }
    };

    fetchBuilds();
  }, [profile]);
  
  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const filteredBuilds = builds.filter(build => {
    const matchesSearch = build.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      build.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = visibilityFilter === 'all' || build.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const handleDeleteBuild = async (buildId: string, buildName: string) => {
    try {
      // Delete build_documents junction records first (if exists)
      await supabase
        .from('build_documents')
        .delete()
        .eq('build_id', buildId);

      // Then delete the build
      const { error } = await supabase
        .from('builds')
        .delete()
        .eq('id', buildId);

      if (error) throw error;

      setBuilds(builds.filter(b => b.id !== buildId));
      toast.success(`Build "${buildName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting build:', error);
      toast.error('Failed to delete build');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(builds, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `builds-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Builds exported successfully!');
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'member':
        return <Users className="w-4 h-4" />;
      case 'unlisted':
        return <Lock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Admin', path: '/admin' },
          { label: 'Builds Management' }
        ]} />
        <div className="text-center py-12">
          <p className="text-gray-600">Loading builds...</p>
        </div>
      </div>
    );
  }

  const publicBuilds = builds.filter(b => b.visibility === 'public').length;
  const totalMembers = builds.reduce((sum, b) => sum + (b.member_ids?.length || 0), 0);
  const totalDocuments = builds.reduce((sum, b) => sum + (b.document_ids?.length || 0), 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Builds Management' }
      ]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Builds Management</h1>
          <p className="text-gray-600">Create and manage all build containers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToJSON} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Link to="/platform-admin/builds/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Build
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{builds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Public Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publicBuilds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search builds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={visibilityFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={visibilityFilter === 'public' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('public')}
            size="sm"
          >
            Public
          </Button>
          <Button
            variant={visibilityFilter === 'member' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('member')}
            size="sm"
          >
            Members Only
          </Button>
          <Button
            variant={visibilityFilter === 'unlisted' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('unlisted')}
            size="sm"
          >
            Unlisted
          </Button>
          <Button
            variant={visibilityFilter === 'private' ? 'default' : 'outline'}
            onClick={() => setVisibilityFilter('private')}
            size="sm"
          >
            Private
          </Button>
        </div>
      </div>

      {/* Builds List */}
      <div className="space-y-4">
        {filteredBuilds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {builds.length === 0 ? (
                <div>
                  <Hammer className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="mb-4">No builds found. Get started by creating your first build!</p>
                  <Link to="/platform-admin/builds/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Build
                    </Button>
                  </Link>
                </div>
              ) : (
                'No builds match your filters'
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBuilds.map((build) => (
            <Card key={build.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {build.cover_image ? (
                      <img 
                        src={build.cover_image} 
                        alt={build.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Hammer className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{build.name}</h3>
                        <Badge 
                          variant={build.visibility === 'public' ? 'default' : 'outline'}
                          className="capitalize flex items-center gap-1"
                        >
                          {getVisibilityIcon(build.visibility)}
                          {build.visibility.replace('-', ' ')}
                        </Badge>
                      </div>
                      
                      {build.description && (
                        <p className="text-gray-600 mb-3">{build.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {build.member_ids?.length || 0} members
                        </div>
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {build.document_ids?.length || 0} documents
                        </div>
                        <div>
                          Slug: <span className="font-mono text-xs">{build.slug}</span>
                        </div>
                        <div>
                          {build.admin_ids?.length || 0} admin{(build.admin_ids?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {build.tags && build.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {build.tags.slice(0, 5).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {build.tags.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{build.tags.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Created {format(new Date(build.created_at), 'PPp')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Link to={`/builds/${build.slug}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    <Link to={`/platform-admin/builds/${build.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Build?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{build.name}"? This will remove all members and linked documents. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBuild(build.id, build.name)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}