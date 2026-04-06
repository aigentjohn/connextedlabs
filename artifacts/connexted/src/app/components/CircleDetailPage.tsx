import { useState, useEffect } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Users, Check, Settings, UserPlus, QrCode } from 'lucide-react';
import { ContainerStateManager } from '@/app/components/admin/ContainerStateManager';
import { MembershipStatusManager } from '@/app/components/membership/MembershipStatusManager';
import { isValidUUID } from '@/lib/uuid-utils';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { ContainerAccessGate, ContainerStateBanner } from '@/app/components/container/ContainerStateBanner';
import { ShareableUrl } from '@/app/components/container/ShareableUrl';
import { CircleSecondLevelNav } from '@/app/components/circle/CircleSecondLevelNav';
import CircleFeed from '@/app/components/circle/CircleFeed';
import CircleForum from '@/app/components/circle/CircleForum';
import CircleCalendar from '@/app/components/circle/CircleCalendar';
import CircleMembers from '@/app/components/circle/CircleMembers';
import CirclePrompts from '@/app/components/circle/CirclePrompts';
import { QRCodeDialog } from '@/app/components/shared/QRCodeGenerator';
import { ShareIconButton } from '@/app/components/shared/ShareButton';

interface Circle {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  member_ids: string[];
  admin_ids: string[];
  guest_access: {
    feed: boolean;
    members: boolean;
    documents: boolean;
    forum: boolean;
    checklists: boolean;
    reviews: boolean;
    calendar: boolean;
  };
}

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'feed' | 'forum' | 'events' | 'members' | 'prompts'>('feed');
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    // Validate ID before fetching
    if (!id || !isValidUUID(id)) {
      setLoading(false);
      toast.error('Invalid circle ID');
      return;
    }

    const fetchCircle = async () => {
      try {
        const { data, error } = await supabase
          .from('circles')
          .select('id, name, description, long_description, image, access_type, member_ids, admin_ids, guest_access')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCircle(data);
      } catch (error) {
        console.error('Error fetching circle:', error);
        toast.error('Failed to load circle');
      } finally {
        setLoading(false);
      }
    };

    fetchCircle();
  }, [id]);

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading circle...</div>
      </div>
    );
  }

  if (!circle) {
    return <Navigate to="/circles" replace />;
  }

  const isMember = circle.member_ids.includes(profile.id);
  const isAdmin = profile.role === 'super' || circle.admin_ids.includes(profile.id);

  // Guest section access (for second-level nav)
  const guestSectionAccess = {
    feed: circle.guest_access.feed,
    forum: circle.guest_access.forum,
    calendar: circle.guest_access.calendar,
    members: circle.guest_access.members,
  };

  // Check if any section is accessible to guests
  const hasGuestAccess = !isMember && Object.values(guestSectionAccess).some(v => v);

  // Get the list of enabled tabs for guests
  const getAvailableTabs = () => {
    if (isMember) {
      const tabs = ['feed', 'members', 'documents', 'forum', 'checklists', 'reviews', 'calendar'];
      if (isAdmin) {
        tabs.push('admin');
      }
      return tabs;
    }
    return Object.entries(circle.guest_access)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  };

  const availableTabs = getAvailableTabs();

  const handleJoinCircle = async () => {
    if (circle.access_type === 'invite') {
      toast.error('This is an invite-only group');
      return;
    }

    if (circle.access_type === 'request') {
      // Route to the application form instead of doing nothing
      navigate(`/circles/${circle.id}/request`);
      return;
    }

    // Open circle: join directly and write to all three systems
    try {
      // 1. Add to member_ids[]
      const updatedMemberIds = [...circle.member_ids, profile.id];
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      // 2. Create container_memberships record for audit trail
      await supabase
        .from('container_memberships')
        .upsert(
          {
            user_id: profile.id,
            container_type: 'circle',
            container_id: circle.id,
            status: 'active',
            applied_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,container_type,container_id', ignoreDuplicates: true }
        );

      setCircle({ ...circle, member_ids: updatedMemberIds });
      toast.success(`You've joined ${circle.name}!`);

      // 3. Create participants record for funnel tracking (best-effort — table may not exist yet)
      supabase
        .from('participants')
        .upsert(
          {
            circle_id: circle.id,
            user_id: profile.id,
            current_state: 'enrolled',
            state_changed_at: new Date().toISOString(),
            state_change_reason: 'Direct join (open group)',
            state_change_auto: false,
            state_history: [
              {
                from_state: null,
                to_state: 'enrolled',
                changed_at: new Date().toISOString(),
                reason: 'Direct join (open group)',
                auto: false,
              },
            ],
            last_activity_at: new Date().toISOString(),
            total_sessions_expected: 0,
            total_sessions_attended: 0,
            attendance_rate: 0,
            consecutive_absences: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'circle_id,user_id', ignoreDuplicates: true }
        )
        .then(({ error }) => {
          if (error) console.warn('participants upsert skipped (table pending migration):', error.code);
        });
    } catch (error) {
      console.error('Error joining circle:', error);
      toast.error('Failed to join group');
    }
  };

  const handleLeaveCircle = async () => {
    try {
      const updatedMemberIds = circle.member_ids.filter((memberId) => memberId !== profile.id);
      const { error } = await supabase
        .from('circles')
        .update({ member_ids: updatedMemberIds })
        .eq('id', circle.id);

      if (error) throw error;

      setCircle({ ...circle, member_ids: updatedMemberIds });
      toast.success(`You've left ${circle.name}`);
    } catch (error) {
      console.error('Error leaving circle:', error);
      toast.error('Failed to leave circle');
    }
  };

  return (
    <ContainerAccessGate
      containerType="circle"
      containerId={circle.id}
      isAdmin={isAdmin}
      isMember={isMember}
      isPlatformAdmin={profile.role === 'super'}
    >
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: 'Circles', path: '/circles' },
          { label: circle.name }
        ]} />
        
        {/* Container State Banner */}
        <ContainerStateBanner
          containerType="circle"
          containerId={circle.id}
          isAdmin={isAdmin}
          isMember={isMember}
        />

        {/* Circle Header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {circle.image && (
            <img src={circle.image} alt={circle.name} className="w-full h-48 object-cover" />
          )}
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{circle.name}</h1>
                <p className="text-gray-600 mb-4">{circle.long_description || circle.description}</p>
                
                {/* Shareable URL */}
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <ShareableUrl 
                        containerType="circle" 
                        containerId={circle.id}
                        containerName={circle.name}
                        variant="inline"
                        showLabel={true}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ShareIconButton
                        url={`${window.location.origin}/circles/${circle.id}`}
                        title={`Join ${circle.name}`}
                        text={`Check out ${circle.name} on CONNEXTED LABS`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQRCode(true)}
                        className="flex-shrink-0"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Code
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{circle.member_ids.length} members</span>
                  </div>
                  <div className="flex items-center">
                    <span className="capitalize">{circle.access_type} circle</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 md:mt-0 md:ml-6">
                {isMember ? (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" disabled>
                      <Check className="w-4 h-4 mr-2" />
                      Member
                    </Button>
                    {isAdmin && (
                      <Link to={`/circles/${circle.id}/settings`}>
                        <Button variant="default" size="sm" className="w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLeaveCircle}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Leave Circle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handleJoinCircle} className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {circle.access_type === 'request' ? 'Request to Join' : 'Join Circle'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation and Content */}
        {isMember || hasGuestAccess ? (
          <>
            <CircleSecondLevelNav
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              isAdmin={isAdmin}
              isMember={isMember}
              circleId={circle.id}
              guestAccess={guestSectionAccess}
            />

            {/* Feed Section */}
            {activeSection === 'feed' && (
              <div className="mt-6">
                <CircleFeed circleId={circle.id} isAdmin={isAdmin} isMember={isMember} guestAccess={circle.guest_access} />
              </div>
            )}

            {/* Forum Section */}
            {activeSection === 'forum' && (
              <div className="mt-6">
                <CircleForum circleId={circle.id} isAdmin={isAdmin} />
              </div>
            )}

            {/* Events Section */}
            {activeSection === 'events' && (
              <div className="mt-6">
                <CircleCalendar circleId={circle.id} isAdmin={isAdmin} />
              </div>
            )}

            {/* Members Section */}
            {activeSection === 'members' && (
              <div className="mt-6">
                <CircleMembers circleId={circle.id} />
              </div>
            )}

            {/* Prompts Section */}
            {activeSection === 'prompts' && (
              <div className="mt-6">
                <CirclePrompts circleId={circle.id} isAdmin={isAdmin} isMember={isMember} />
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Join to Access Circle Content</h3>
            <p className="text-gray-600 mb-6">
              Become a member to view posts, documents, checklists, and connect with other members.
            </p>
            <Button onClick={handleJoinCircle} size="lg">
              <UserPlus className="w-5 h-5 mr-2" />
              {circle.access_type === 'request' ? 'Request to Join' : 'Join Circle'}
            </Button>
          </div>
        )}
      </div>

      {/* QR Code Dialog */}
      <QRCodeDialog
        url={`${window.location.origin}/preview/circles/${circle.id}`}
        title={`Join ${circle.name}`}
        description="Scan this QR code to access this circle"
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
      />
    </ContainerAccessGate>
  );
}