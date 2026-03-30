import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
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
import { Search, Plus, Edit, Trash2, Users } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { canManageCircles } from '@/lib/constants/roles';

interface Circle {
  id: string;
  name: string;
  description: string;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
}

export default function CircleManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!profile || !canManageCircles(profile.role)) return;

    const fetchCircles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .order('name');

        if (error) throw error;
        setCircles(data || []);
      } catch (error) {
        console.error('Error fetching circles:', error);
        toast.error('Failed to load circles');
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, [profile]);
  
  if (!profile || !canManageCircles(profile.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }
  
  const filteredCircles = circles.filter(circle =>
    circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    circle.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteCircle = async (circleId: string, circleName: string) => {
    try {
      // Delete the circle (related content will be handled by database CASCADE)
      const { error } = await supabase
        .from('circles')
        .delete()
        .eq('id', circleId);

      if (error) throw error;

      // Update local state
      setCircles(circles.filter(c => c.id !== circleId));
      
      toast.success(`Circle "${circleName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting circle:', error);
      toast.error('Failed to delete circle');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl mb-2">Circle Management</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">Loading circles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Circle Management' }
      ]} />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Circle Management</h1>
          <p className="text-gray-600">Create and manage all circles</p>
        </div>
        <Link to="/platform-admin/circles/new/edit">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Circle
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search circles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Circles List */}
      <div className="space-y-4">
        {filteredCircles.map((circle) => (
          <Card key={circle.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {circle.image ? (
                    <img 
                      src={circle.image} 
                      alt={circle.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                      {circle.name.charAt(0)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-1">{circle.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{circle.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="capitalize">
                        {circle.access_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{circle.member_ids.length} members</span>
                      </div>
                      <span>•</span>
                      <span>{circle.admin_ids.length} admin{circle.admin_ids.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Link to={`/circles/${circle.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                  <Link to={`/platform-admin/circles/${circle.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Circle</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{circle.name}"? This will permanently delete
                          the circle and all its content (posts, documents, courses, etc.). This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCircle(circle.id, circle.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCircles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchQuery ? 'No circles found' : 'No circles yet. Create your first circle!'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}