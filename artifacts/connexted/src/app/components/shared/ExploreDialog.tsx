import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Search, UserPlus, Lock, Users, ChevronRight, ArrowUpCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CONTAINER_TYPES, ContainerType } from '@/lib/container-types';
import { DISCOVERABLE_CONTAINER_TYPES } from '@/lib/visibility-access';

interface Container {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  cover_image?: string | null;
  access_type?: 'open' | 'request' | 'invite';
  visibility?: 'public' | 'member' | 'unlisted' | 'private';
  member_ids: string[];
  admin_ids: string[];
  participant_ids?: string[];
  tags?: string[];
  type: ContainerType;
  created_at?: string;
}

interface ExploreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContainerJoined?: () => void;
}

export default function ExploreDialog({ open, onOpenChange, onContainerJoined }: ExploreDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningContainerId, setJoiningContainerId] = useState<string | null>(null);
  const { profile, userPermissions } = useAuth();

  useEffect(() => {
    if (open) {
      fetchContainers();
      setSearchQuery('');
    }
  }, [open]);

  const fetchContainers = async () => {
    if (!profile || !userPermissions) return;

    try {
      setLoading(true);
      
      // Get container types user has access to (excluding home, news, etc.)
      const accessibleTypes = userPermissions.visible_containers
        .filter(c => DISCOVERABLE_CONTAINER_TYPES.includes(c.type_code as any))
        .map(c => c.type_code);

      if (accessibleTypes.length === 0) {
        setContainers([]);
        setLoading(false);
        return;
      }

      // Fetch containers from all accessible types in parallel
      const containerPromises = accessibleTypes.map(async (type) => {
        try {
          const { data, error } = await supabase
            .from(type)
            .select('*')
            .order('name');

          if (error) {
            console.warn(`Error fetching ${type}:`, error);
            return [];
          }

          return (data || []).map(item => ({
            ...item,
            type: type as ContainerType,
            // Normalize member/participant fields
            member_ids: item.member_ids || item.participant_ids || [],
            admin_ids: item.admin_ids || [],
          }));
        } catch (err) {
          console.warn(`Failed to fetch ${type}:`, err);
          return [];
        }
      });

      const results = await Promise.all(containerPromises);
      const allContainers = results.flat();
      
      setContainers(allContainers);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinContainer = async (container: Container) => {
    if (!profile) return;

    // Check access restrictions
    if (container.access_type === 'invite') {
      toast.error('This is an invite-only container. Contact an admin to get invited.');
      return;
    }

    if (container.access_type === 'request') {
      toast.success('Join request sent! Waiting for admin approval.');
      // In a full implementation, this would create a join request in the database
      return;
    }

    if (container.visibility === 'private') {
      toast.error('This container is private. Contact an admin for access.');
      return;
    }

    try {
      setJoiningContainerId(container.id);
      
      // Add user to container
      const updatedMemberIds = [...container.member_ids, profile.id];
      const { error } = await supabase
        .from(container.type)
        .update({ member_ids: updatedMemberIds })
        .eq('id', container.id);

      if (error) throw error;

      // Update local state
      setContainers(containers.map(c => 
        c.id === container.id ? { ...c, member_ids: updatedMemberIds } : c
      ));

      const containerConfig = CONTAINER_TYPES[container.type];
      toast.success(`You've joined ${container.name}!`);
      
      // Call callback to refresh parent components
      if (onContainerJoined) {
        onContainerJoined();
      }
    } catch (error) {
      console.error('Error joining container:', error);
      toast.error('Failed to join container');
    } finally {
      setJoiningContainerId(null);
    }
  };

  if (!profile) return null;

  // Get user's class number for upgrade messaging
  const userClass = (profile as any).user_class || 1;
  const hasNoAccess = !userPermissions || 
    userPermissions.visible_containers.filter(c => 
      DISCOVERABLE_CONTAINER_TYPES.includes(c.type_code as any)
    ).length === 0;

  // Filter containers that user is not a member of
  const availableContainers = containers.filter(container => 
    !container.member_ids.includes(profile.id)
  );

  // Apply search filter
  const filteredContainers = availableContainers.filter((container) => {
    const query = searchQuery.toLowerCase();
    return (
      container.name.toLowerCase().includes(query) ||
      container.description?.toLowerCase().includes(query) ||
      container.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getAccessLabel = (container: Container) => {
    if (container.access_type) {
      switch (container.access_type) {
        case 'open':
          return { label: 'Open', color: 'bg-green-100 text-green-700', icon: Users };
        case 'request':
          return { label: 'Request', color: 'bg-yellow-100 text-yellow-700', icon: UserPlus };
        case 'invite':
          return { label: 'Invite Only', color: 'bg-gray-100 text-gray-700', icon: Lock };
      }
    }
    
    if (container.visibility) {
      switch (container.visibility) {
        case 'public':
          return { label: 'Public', color: 'bg-green-100 text-green-700', icon: Users };
        case 'member':
          return { label: 'Members Only', color: 'bg-blue-100 text-blue-700', icon: Users };
        case 'unlisted':
          return { label: 'Unlisted', color: 'bg-gray-100 text-gray-700', icon: Lock };
        case 'private':
          return { label: 'Private', color: 'bg-gray-100 text-gray-700', icon: Lock };
      }
    }

    return { label: 'Open', color: 'bg-green-100 text-green-700', icon: Users };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Explore Containers
          </DialogTitle>
          <DialogDescription>
            Discover and join containers available for your membership level
          </DialogDescription>
        </DialogHeader>

        {hasNoAccess ? (
          // Upgrade message when no containers are accessible
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full p-6 mb-6">
              <ArrowUpCircle className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Upgrade to Explore Containers
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Your current membership level (Class {userClass}) doesn't have access to explore containers. 
              Upgrade your membership to discover and join circles, tables, and other collaboration spaces.
            </p>
            <Button 
              onClick={() => {
                onOpenChange(false);
                window.location.href = '/my-payments';
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Upgrade Membership
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search containers by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Containers List */}
            <ScrollArea className="h-[450px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading containers...</div>
                </div>
              ) : filteredContainers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">
                    {availableContainers.length === 0 
                      ? "You're already a member of all available containers!"
                      : "No containers found matching your search"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContainers.map((container) => {
                    const containerConfig = CONTAINER_TYPES[container.type];
                    const accessInfo = getAccessLabel(container);
                    const AccessIcon = accessInfo.icon;
                    const isJoining = joiningContainerId === container.id;
                    const TypeIcon = containerConfig.icon;
                    const canJoin = container.access_type !== 'invite' && container.visibility !== 'private';

                    return (
                      <div
                        key={`${container.type}-${container.id}`}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div className={`${containerConfig.color} ${containerConfig.iconColor} p-1.5 rounded`}>
                                <TypeIcon className="w-3.5 h-3.5" />
                              </div>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {container.name}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {containerConfig.label}
                              </Badge>
                              <Badge variant="secondary" className={`${accessInfo.color} flex items-center gap-1 text-xs`}>
                                <AccessIcon className="w-3 h-3" />
                                {accessInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {container.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {container.member_ids.length} {container.member_ids.length === 1 ? 'member' : 'members'}
                              </span>
                              {container.tags && container.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {container.tags.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {canJoin && (
                              <Button
                                size="sm"
                                onClick={() => handleJoinContainer(container)}
                                disabled={isJoining}
                                className="whitespace-nowrap"
                              >
                                {isJoining ? (
                                  'Joining...'
                                ) : (
                                  <>
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    {container.access_type === 'request' ? 'Request' : 'Join'}
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onOpenChange(false);
                                window.location.href = `/${container.type}/${container.id}`;
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
                {filteredContainers.length} {filteredContainers.length === 1 ? 'container' : 'containers'} available
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}