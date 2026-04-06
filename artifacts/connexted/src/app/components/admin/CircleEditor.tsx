// Split candidate: ~414 lines — consider extracting CircleBasicInfoForm, CircleAccessSettings, and CircleImageUpload into sub-components.
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/lib/uuid-utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { X, Plus } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { canManageCircles } from '@/lib/constants/roles';

interface User {
  id: string;
  name: string;
  email: string;
}

interface GuestAccess {
  feed: boolean;
  members: boolean;
  documents: boolean;
  forum: boolean;
  checklists: boolean;
  reviews: boolean;
  calendar: boolean;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  long_description: string;
  image: string | null;
  access_type: 'open' | 'request' | 'invite';
  admin_ids: string[];
  member_ids: string[];
  moderation_password: string | null;
  guest_access: GuestAccess | null;
}

const DEFAULT_GUEST_ACCESS: GuestAccess = {
  feed: false,
  members: false,
  documents: false,
  forum: false,
  checklists: false,
  reviews: false,
  calendar: false,
};

const GUEST_ACCESS_SECTIONS: { key: keyof GuestAccess; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'members', label: 'Members' },
  { key: 'documents', label: 'Documents' },
  { key: 'forum', label: 'Forum' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'calendar', label: 'Calendar' },
];

export default function CircleEditor() {
  const navigate = useNavigate();
  const { circleId } = useParams<{ circleId: string }>();
  const { profile } = useAuth();
  const isEditing = circleId !== 'new';
  
  const [loading, setLoading] = useState(false);
  const [existingCircle, setExistingCircle] = useState<Circle | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    longDescription: '',
    image: '',
    accessType: 'open' as 'open' | 'request' | 'invite',
    moderationPassword: '',
  });
  
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [guestAccess, setGuestAccess] = useState<GuestAccess>({ ...DEFAULT_GUEST_ACCESS });

  // Fetch existing circle and users
  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('community_id', profile.community_id);

        if (usersError) throw usersError;
        setAllUsers(usersData || []);

        // Fetch existing circle if editing
        if (isEditing && circleId && isValidUUID(circleId)) {
          const { data: circleData, error: circleError } = await supabase
            .from('circles')
            .select('*')
            .eq('id', circleId)
            .single();

          if (circleError) throw circleError;
          
          setExistingCircle(circleData);
          setFormData({
            name: circleData.name,
            description: circleData.description,
            longDescription: circleData.long_description || '',
            image: circleData.image || '',
            accessType: circleData.access_type,
            moderationPassword: circleData.moderation_password || '',
          });

          // Convert admin IDs to emails
          const adminUsers = usersData?.filter(u => circleData.admin_ids.includes(u.id)) || [];
          setAdminEmails(adminUsers.map(u => u.email));
          setGuestAccess({ ...DEFAULT_GUEST_ACCESS, ...(circleData.guest_access || {}) });
        } else {
          // For new circles, add current user as admin
          const currentUserData = usersData?.find(u => u.id === profile.id);
          if (currentUserData) {
            setAdminEmails([currentUserData.email]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, circleId, isEditing]);

  if (!profile || !canManageCircles(profile.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  const handleAddAdmin = () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    
    const user = allUsers.find(u => u.email.toLowerCase() === email);
    if (!user) {
      toast.error('User not found with that email');
      return;
    }
    
    if (adminEmails.includes(email)) {
      toast.error('User is already an admin');
      return;
    }
    
    setAdminEmails([...adminEmails, email]);
    setNewAdminEmail('');
    toast.success(`Added ${user.name} as admin`);
  };

  const handleRemoveAdmin = (email: string) => {
    if (adminEmails.length === 1) {
      toast.error('Circle must have at least one admin');
      return;
    }
    setAdminEmails(adminEmails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (adminEmails.length === 0) {
      toast.error('Circle must have at least one admin');
      return;
    }

    try {
      setLoading(true);

      // Convert admin emails to user IDs
      const adminIds = adminEmails
        .map(email => {
          const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
          return user?.id;
        })
        .filter(Boolean) as string[];

      if (isEditing && existingCircle) {
        // Update existing circle
        const { error } = await supabase
          .from('circles')
          .update({
            name: formData.name,
            description: formData.description,
            long_description: formData.longDescription,
            image: formData.image || null,
            access_type: formData.accessType,
            admin_ids: adminIds,
            moderation_password: formData.moderationPassword || null,
            guest_access: guestAccess,
          })
          .eq('id', existingCircle.id);

        if (error) throw error;
        toast.success('Circle updated successfully!');
      } else {
        // Create new circle
        const { data: newCircle, error: circleError } = await supabase
          .from('circles')
          .insert({
            community_id: profile.community_id,
            name: formData.name,
            description: formData.description,
            long_description: formData.longDescription,
            image: formData.image || null,
            access_type: formData.accessType,
            admin_ids: adminIds,
            member_ids: adminIds, // Admins are automatically members
            moderation_password: formData.moderationPassword || null,
            guest_access: guestAccess,
          })
          .select()
          .single();

        if (circleError) throw circleError;
        
        // Create a default post with the circle name as a tag
        const { error: postError } = await supabase
          .from('posts')
          .insert({
            id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            circle_ids: [newCircle.id],
            author_id: profile.id,
            content: `Welcome to ${formData.name}!`,
            access_level: 'public',
            pinned: false,
            created_at: new Date().toISOString(),
          });

        if (postError) console.error('Error creating default post:', postError);
        
        toast.success('Circle created successfully!');
      }

      navigate('/admin/circles');
    } catch (error) {
      console.error('Error saving circle:', error);
      toast.error('Failed to save circle');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Circle Management', path: '/platform-admin/circles' },
        { label: isEditing ? 'Edit Circle' : 'Create Circle' }
      ]} />
      
      <div>
        <h1 className="text-3xl">{isEditing ? 'Edit Circle' : 'Create New Circle'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Circle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Circle Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Web Development"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description for circle cards"
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label htmlFor="longDescription">Full Description</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  placeholder="Detailed description shown on circle page"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="image">Cover Image URL</Label>
                <Input
                  id="image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="accessType">Access Type *</Label>
                <Select
                  value={formData.accessType}
                  onValueChange={(value: 'open' | 'request' | 'invite') =>
                    setFormData({ ...formData, accessType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open - Anyone can join</SelectItem>
                    <SelectItem value="request">Request - Must request to join</SelectItem>
                    <SelectItem value="invite">Invite Only - Admin must invite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="moderationPassword">Moderation Password</Label>
                <Input
                  id="moderationPassword"
                  type="password"
                  value={formData.moderationPassword}
                  onChange={(e) => setFormData({ ...formData, moderationPassword: e.target.value })}
                  placeholder="Enter a password for moderation"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Optional: Set a password to allow any member to gain temporary moderation access to this circle's forum. Leave empty to disable password-based moderation.
                </p>
              </div>
            </div>

            {/* Guest Access */}
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-base font-semibold">Guest Access</Label>
                <p className="text-sm text-gray-500 mt-0.5">
                  Choose which sections non-members can view. Enabling any section will mark the circle as Public.
                </p>
              </div>
              <div className="flex gap-3 pb-2 border-b">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setGuestAccess({ feed: true, members: true, documents: true, forum: true, checklists: true, reviews: true, calendar: true })}
                >
                  Enable All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setGuestAccess({ ...DEFAULT_GUEST_ACCESS })}
                >
                  Disable All
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GUEST_ACCESS_SECTIONS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={guestAccess[key]}
                      onChange={() => setGuestAccess(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div>
              <Label>Circle Admins *</Label>
              <p className="text-sm text-gray-600 mb-2">
                Add users as admins by their email address
              </p>
              <div className="flex gap-2 mt-2 mb-3">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAdmin();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddAdmin} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {adminEmails.length > 0 && (
                <div className="space-y-2">
                  {adminEmails.map((email, index) => {
                    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{user?.name || email}</span>
                          <span className="text-sm text-gray-600 ml-2">({email})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(email)}
                          disabled={adminEmails.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update Circle' : 'Create Circle'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/platform-admin/circles')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}