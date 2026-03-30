import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, UserPlus, Lock, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Circle {
  id: string;
  name: string;
  description: string;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
  tags?: string[];
}

interface JoinCircleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCircleJoined?: () => void;
}

export default function JoinCircleDialog({ open, onOpenChange, onCircleJoined }: JoinCircleDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (open) {
      fetchCircles();
      setSearchQuery('');
    }
  }, [open]);

  const fetchCircles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('circles')
        .select('id, name, description, image, access_type, member_ids, admin_ids, tags')
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

  const handleJoinCircle = async (circle: Circle) => {
    if (!profile) return;

    if (circle.access_type === 'invite') {
      toast.error('This is an invite-only circle. Contact an admin to get invited.');
      return;
    }

    if (circle.access_type === 'request') {
      toast.success('Join request sent! Waiting for admin approval.');
      // In a full implementation, this would create a join request in the database
      return;
    }

    try {
      setJoiningCircleId(circle.id);
      
      // Add user to circle
      const updatedMemberIds = [...circle.member_ids, profile.id];
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      // Update local state
      setCircles(circles.map(c => 
        c.id === circle.id ? { ...c, member_ids: updatedMemberIds } : c
      ));

      toast.success(`You've joined ${circle.name}!`);
      
      // Call callback to refresh parent components
      if (onCircleJoined) {
        onCircleJoined();
      }
    } catch (error) {
      console.error('Error joining circle:', error);
      toast.error('Failed to join circle');
    } finally {
      setJoiningCircleId(null);
    }
  };

  if (!profile) return null;

  // Filter circles that user is not a member of
  const availableCircles = circles.filter(circle => 
    !circle.member_ids.includes(profile.id)
  );

  // Apply search filter
  const filteredCircles = availableCircles.filter((circle) => {
    const query = searchQuery.toLowerCase();
    return (
      circle.name.toLowerCase().includes(query) ||
      circle.description.toLowerCase().includes(query) ||
      circle.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getAccessTypeInfo = (accessType: string) => {
    switch (accessType) {
      case 'open':
        return { label: 'Open', color: 'bg-green-100 text-green-700', icon: Users };
      case 'request':
        return { label: 'Request', color: 'bg-yellow-100 text-yellow-700', icon: UserPlus };
      case 'invite':
        return { label: 'Invite Only', color: 'bg-gray-100 text-gray-700', icon: Lock };
      default:
        return { label: 'Open', color: 'bg-green-100 text-green-700', icon: Users };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Join a Circle</DialogTitle>
          <DialogDescription>
            Browse and join circles to connect with communities that match your interests
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search circles by name or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Circles List */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading circles...</div>
            </div>
          ) : filteredCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">
                {availableCircles.length === 0 
                  ? "You're already a member of all circles!"
                  : "No circles found matching your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCircles.map((circle) => {
                const accessInfo = getAccessTypeInfo(circle.access_type);
                const AccessIcon = accessInfo.icon;
                const isJoining = joiningCircleId === circle.id;

                return (
                  <div
                    key={circle.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {circle.name}
                          </h3>
                          <Badge variant="secondary" className={`${accessInfo.color} flex items-center gap-1 text-xs`}>
                            <AccessIcon className="w-3 h-3" />
                            {accessInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {circle.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {circle.member_ids.length} {circle.member_ids.length === 1 ? 'member' : 'members'}
                          </span>
                          {circle.tags && circle.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {circle.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleJoinCircle(circle)}
                          disabled={isJoining || circle.access_type === 'invite'}
                          className="whitespace-nowrap"
                        >
                          {isJoining ? (
                            'Joining...'
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3 mr-1" />
                              {circle.access_type === 'request' ? 'Request' : 'Join'}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onOpenChange(false);
                            window.location.href = `/circles/${circle.id}`;
                          }}
                          className="whitespace-nowrap"
                        >
                          View
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            {filteredCircles.length} {filteredCircles.length === 1 ? 'circle' : 'circles'} available
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
