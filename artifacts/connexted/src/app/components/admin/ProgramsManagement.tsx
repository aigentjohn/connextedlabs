import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Search, Plus, Edit, Trash2, Users, Settings, Eye, FolderKanban, Database, FileText, Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { ProgramTemplatePicker } from '@/app/components/ProgramTemplates';

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  template_id: string | null;
  cover_image: string | null;
  member_ids: string[];
  admin_ids: string[];
  created_at: string;
}

export default function ProgramsManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  
  useEffect(() => {
    if (!profile || profile.role !== 'super') return;

    fetchPrograms();
  }, [profile]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };
  
  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteProgram = async (programId: string, programName: string) => {
    try {
      // Get user token for server-side auth
      const { data: sessionData } = await supabase.auth.getSession();
      const userToken = sessionData?.session?.access_token;
      if (!userToken) {
        toast.error('No active session — please sign in again');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/admin/delete-container`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': userToken,
          },
          body: JSON.stringify({ table: 'programs', id: programId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Server delete error:', result);
        throw new Error(result.error || 'Failed to delete program');
      }

      // Update local state
      setPrograms(programs.filter(p => p.id !== programId));
      toast.success(`Program "${programName}" deleted successfully!`);
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast.error(error.message || 'Failed to delete program');
    }
  };

  const handleProgramCreated = (slug: string) => {
    setShowTemplatePicker(false);
    fetchPrograms(); // Refresh the list
    toast.success('Program created successfully!');
    navigate(`/programs/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Programs Management' }
        ]} 
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Programs Management</h1>
          <p className="text-gray-600">
            Create, edit, and manage all platform programs
          </p>
        </div>
        <Button onClick={() => setShowTemplatePicker(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Program
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <FolderKanban className="w-12 h-12 text-blue-600" />
            <div>
              <div className="text-3xl font-bold text-blue-900">{programs.length}</div>
              <div className="text-sm text-blue-700">Total Programs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search programs by name or description..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Programs List */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No programs match your search' : 'No programs yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowTemplatePicker(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Program
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{program.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {program.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={program.status === 'published' ? 'default' : 'secondary'}>
                    {program.status}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {program.member_ids?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Link to={`/programs/${program.slug}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Link to={`/program-admin/${program.id}/setup`}>
                    <Button variant="outline" size="sm">
                      <Database className="w-4 h-4 mr-2" />
                      Setup
                    </Button>
                  </Link>
                  <Link to={`/programs/${program.slug}/settings`}>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Program</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{program.name}"? This will also delete all
                          journeys, containers, and associated content. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteProgram(program.id, program.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Program
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Program Template Picker Dialog */}
      <ProgramTemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onProgramCreated={handleProgramCreated}
      />
    </div>
  );
}