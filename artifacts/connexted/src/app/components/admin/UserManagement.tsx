import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Link } from 'react-router';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Search, Shield, UserCog, Mail, MapPin, Download, Upload, Lock, CreditCard, CheckCircle2, XCircle, UserPlus, AlertCircle, Trash2, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/app/components/ui/alert';

// ---------------------------------------------------------------------------
// Server route helpers — all privileged auth.admin operations go here.
// The service role key lives exclusively in Deno.env on the server.
// ---------------------------------------------------------------------------
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      'X-User-Token': token,
      ...(options.headers ?? {}),
    },
  });
}

// User class definitions for reference
const USER_CLASSES = [
  { level: 1, name: 'Guest', description: 'Minimal access' },
  { level: 2, name: 'Basic', description: 'Basic features' },
  { level: 3, name: 'Member', description: 'Standard member (default)' },
  { level: 4, name: 'Plus', description: 'Enhanced access' },
  { level: 5, name: 'Advanced', description: 'Advanced features' },
  { level: 6, name: 'Pro', description: 'Professional tier' },
  { level: 7, name: 'Premium', description: 'Full community access' },
  { level: 8, name: 'Enterprise', description: 'Enterprise level' },
  { level: 9, name: 'Executive', description: 'Executive access' },
  { level: 10, name: 'Unlimited', description: 'Complete access' },
];

// Role hierarchy definitions
const USER_ROLES = [
  { 
    value: 'member', 
    label: 'Member', 
    description: 'Standard community member',
    color: 'bg-gray-100 text-gray-700 border-gray-300'
  },
  { 
    value: 'host', 
    label: 'Host', 
    description: 'Can host events and sessions',
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  { 
    value: 'moderator', 
    label: 'Moderator', 
    description: 'Can moderate content in circles',
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Circle and community admin',
    color: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  { 
    value: 'coordinator', 
    label: 'Coordinator', 
    description: 'Program coordinator access',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300'
  },
  { 
    value: 'manager', 
    label: 'Manager', 
    description: 'Program manager access',
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  { 
    value: 'super', 
    label: 'Super Admin', 
    description: 'Full platform administrator',
    color: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-400'
  },
];

export default function UserManagement() {
  const { profile, impersonateUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userClassFilter, setUserClassFilter] = useState<'all' | number>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [authStatusFilter, setAuthStatusFilter] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<Set<string>>(new Set());
  const [circles, setCircles] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const [usersData, circlesData, tablesData, elevatorsData, meetingsData, pitchesData, postsData, documentsData] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('circles').select('*'),
        supabase.from('tables').select('*'),
        supabase.from('elevators').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('pitches').select('*'),
        supabase.from('posts').select('*'),
        supabase.from('documents').select('*'),
      ]);

      const users = usersData.data || [];

      // Fetch all auth users in one server call (service role key stays on server)
      let authUserMetaMap = new Map<string, any>();
      try {
        const res = await adminFetch('/admin/users?page=1&per_page=1000');
        const json = await res.json();
        if (json.success && json.users) {
          json.users.forEach((u: any) => { authUserMetaMap.set(u.id, u); });
        } else {
          console.error('Failed to fetch auth users for metadata merge:', json.error);
        }
      } catch (err) {
        console.error('Error fetching auth users from server:', err);
      }

      const usersWithPasswords = users.map((user: any) => {
        const authUser = authUserMetaMap.get(user.id);
        return {
          ...user,
          has_auth_account: !!authUser,
          temp_password: authUser?.user_metadata?.temp_password || '',
          imported_via_csv: authUser?.user_metadata?.imported_via_csv || false,
          custom_password: authUser?.user_metadata?.custom_password || false,
        };
      });

      setUsers(usersWithPasswords);
      setCircles(circlesData.data || []);
      setTables(tablesData.data || []);
      setElevators(elevatorsData.data || []);
      setMeetings(meetingsData.data || []);
      setPitches(pitchesData.data || []);
      setPosts(postsData.data || []);
      setDocuments(documentsData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user data');
      setLoading(false);
    }
  };
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.location && user.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    const matchesUserClass = userClassFilter === 'all' || user.user_class === userClassFilter;
    
    const matchesTier = tierFilter === 'all' || user.membership_tier === tierFilter;
    
    const matchesAuthStatus = authStatusFilter === 'all' || (authStatusFilter === 'active' ? user.has_auth_account : !user.has_auth_account);
    
    return matchesSearch && matchesRole && matchesUserClass && matchesTier && matchesAuthStatus;
  });

  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'member') => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Prevent users from changing their own role
    if (userId === profile?.id) {
      toast.error('You cannot change your own role');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      const roleLabel = USER_ROLES.find(r => r.value === newRole)?.label || newRole;
      toast.success(`User role updated to ${roleLabel}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const getRoleInfo = (role: string) => {
    return USER_ROLES.find(r => r.value === role) || USER_ROLES[0];
  };

  const handleUpdateUserClass = async (userId: string, newClass: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ user_class: newClass })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, user_class: newClass } : u));
      const className = USER_CLASSES.find(c => c.level === newClass)?.name || `Class ${newClass}`;
      toast.success(`User class updated to ${className}`);
    } catch (error) {
      console.error('Error updating user class:', error);
      toast.error('Failed to update user class');
    }
  };

  const handleUpdateTier = async (userId: string, newTier: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ membership_tier: newTier })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, membership_tier: newTier } : u));
      toast.success(`Billing tier updated to ${newTier}`);
    } catch (error) {
      console.error('Error updating billing tier:', error);
      toast.error('Failed to update billing tier');
    }
  };

  const getUserClassName = (userClass: number) => {
    const classInfo = USER_CLASSES.find(c => c.level === userClass);
    return classInfo ? classInfo.name : `Class ${userClass}`;
  };

  const getUserClassColor = (userClass: number) => {
    if (userClass <= 2) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (userClass <= 4) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (userClass <= 6) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (userClass <= 8) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'member':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getUserCircles = (userId: string) => {
    return circles.filter(c => c.member_ids?.includes(userId) || false);
  };

  const getUserAdminCircles = (userId: string) => {
    return circles.filter(c => c.admin_ids?.includes(userId) || false);
  };

  const getUserActivity = (userId: string) => {
    const userPosts = posts.filter(p => p.author_id === userId).length;
    const userDocs = documents.filter(d => d.uploaded_by === userId).length;
    
    // Admin containers
    const adminCirclesCount = circles.filter(c => c.admin_ids?.includes(userId) || false).length;
    const adminTablesCount = tables.filter(t => t.admin_ids?.includes(userId) || false).length;
    const adminElevatorsCount = elevators.filter(e => e.admin_ids?.includes(userId) || false).length;
    const adminMeetingsCount = meetings.filter(m => m.admin_ids?.includes(userId) || false).length;
    const adminPitchesCount = pitches.filter(p => p.admin_ids?.includes(userId) || false).length;
    
    const totalAdminContainers = adminCirclesCount + adminTablesCount + adminElevatorsCount + adminMeetingsCount + adminPitchesCount;
    
    return {
      posts: userPosts,
      documents: userDocs,
      totalActivity: userPosts + userDocs,
      adminContainers: {
        circles: adminCirclesCount,
        tables: adminTablesCount,
        elevators: adminElevatorsCount,
        meetings: adminMeetingsCount,
        pitches: adminPitchesCount,
        total: totalAdminContainers
      }
    };
  };

  const exportUsersToCSV = () => {
    try {
      // Define CSV headers - include all three permission systems + password
      const headers = ['ID', 'Name', 'Email', 'Password', 'Role', 'User Class', 'Membership Tier', 'Location', 'Tagline', 'Bio', 'Phone', 'Website'];
      
      // Create CSV rows
      const rows = users.map(user => [
        user.id || '',
        user.name || '',
        user.email || '',
        user.temp_password || '', // Export temp password if it exists
        user.role || 'member',
        user.user_class || 3, // Access level 1-10, default is 3 (Member)
        user.membership_tier || 'free',
        user.location || '',
        user.tagline || '',
        user.bio || '',
        user.phone || '',
        user.website || ''
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => {
          // Escape fields containing commas or quotes
          if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${users.length} users to CSV`);
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImporting(true);
        const text = e.target?.result as string;
        
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Validate headers
        const requiredHeaders = ['Name', 'Email', 'Role', 'Membership Tier'];
        const hasRequiredHeaders = requiredHeaders.every(h => 
          headers.some(header => header.toLowerCase() === h.toLowerCase())
        );
        
        if (!hasRequiredHeaders) {
          toast.error('Invalid CSV format. Required columns: Name, Email, Role, Membership Tier');
          setImporting(false);
          return;
        }
        
        // Parse rows
        const usersToImport = [];
        const skippedInvalidEmails: Array<{email: string, reason: string}> = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const user: any = {};
          
          headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase();
            if (normalizedHeader === 'id') user.id = values[index] || null; // Optional for updates
            else if (normalizedHeader === 'name') user.name = values[index];
            else if (normalizedHeader === 'email') user.email = values[index];
            else if (normalizedHeader === 'password') user.password = values[index] || null; // Optional custom password
            else if (normalizedHeader === 'role') user.role = values[index] || 'member';
            else if (normalizedHeader === 'user class') user.user_class = parseInt(values[index]) || 3;
            else if (normalizedHeader === 'membership tier') user.membership_tier = values[index] || 'free';
            else if (normalizedHeader === 'location') user.location = values[index];
            else if (normalizedHeader === 'tagline') user.tagline = values[index];
            else if (normalizedHeader === 'bio') user.bio = values[index];
            else if (normalizedHeader === 'phone') user.phone = values[index];
            else if (normalizedHeader === 'website') user.website = values[index];
          });
          
          // Validate required fields and email format
          if (user.name && user.email) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const trimmedEmail = user.email.trim();
            if (emailRegex.test(trimmedEmail)) {
              // Update user object with trimmed email
              user.email = trimmedEmail;
              usersToImport.push(user);
            } else {
              // Provide specific feedback about what's wrong
              let reason = 'invalid format';
              if (!trimmedEmail.includes('@')) {
                reason = 'missing @ symbol';
              } else if (!trimmedEmail.includes('.') || trimmedEmail.indexOf('.') <= trimmedEmail.indexOf('@')) {
                reason = 'missing or invalid domain';
              } else if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
                reason = 'invalid @ position';
              }
              console.warn(`❌ Skipping invalid email "${user.email}" (${reason})`);
              skippedInvalidEmails.push({ email: user.email, reason });
            }
          }
        }
        
        if (usersToImport.length === 0) {
          toast.error('No valid users found in CSV');
          setImporting(false);
          return;
        }
        
        // Get all existing auth users ONCE (outside loop for efficiency)
        // Fetches via server route — service role key never leaves the server
        const authUserMap = new Map<string, string>();
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const res = await adminFetch(`/admin/users?page=${page}&per_page=1000`);
          const json = await res.json();

          if (json.success && json.users && json.users.length > 0) {
            json.users.forEach((u: any) => {
              if (u.email) authUserMap.set(u.email, u.id);
            });
            hasMore = json.users.length === 1000;
            page++;
          } else {
            if (!json.success) console.error('Error fetching auth users page:', json.error);
            hasMore = false;
          }
        }

        console.log(`📊 Loaded ${authUserMap.size} existing auth users for duplicate detection`);
        
        // Import/Update users
        let successCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        
        for (const user of usersToImport) {
          try {
            // Check if user exists by email (RLS bypass via server route)
            const byEmailRes = await adminFetch(`/admin/users/by-email?email=${encodeURIComponent(user.email)}`);
            const byEmailJson = await byEmailRes.json();
            if (!byEmailJson.success) throw new Error(`by-email lookup failed: ${byEmailJson.error}`);
            const existingUser = byEmailJson.profile;

            if (existingUser) {
              // UPDATE EXISTING USER
              console.log(`Updating existing user: ${user.email}`);

              const updateData: any = {
                name: user.name,
                role: user.role || 'member',
                user_class: user.user_class || 3,
                membership_tier: user.membership_tier || 'free',
              };

              // Only update optional fields if they have values
              if (user.location) updateData.location = user.location;
              if (user.tagline) updateData.tagline = user.tagline;
              if (user.bio) updateData.bio = user.bio;
              if (user.phone) updateData.phone = user.phone;
              if (user.website) updateData.website = user.website;

              const updateRes = await adminFetch(`/admin/users/${existingUser.id}/profile`, {
                method: 'PUT',
                body: JSON.stringify(updateData),
              });
              const updateJson = await updateRes.json();

              if (!updateJson.success) {
                console.error(`Error updating user ${user.email}:`, updateJson.error);
                errors.push(`${user.email}: ${updateJson.error}`);
                errorCount++;
              } else {
                updatedCount++;
              }
            } else {
              // CREATE NEW USER WITH AUTH ACCOUNT
              console.log(`Creating new user with auth: ${user.email}`);
              
              // Use custom password if provided, otherwise generate temporary password
              const password = user.password && user.password.trim() 
                ? user.password.trim() 
                : `Temp${Math.random().toString(36).substring(2, 10)}!${Date.now().toString().substring(8)}`;
              
              const isCustomPassword = !!user.password?.trim();
              
              // Check if user already exists in auth by email (using pre-loaded map)
              const existingAuthUserId = authUserMap.get(user.email);
              
              let authUserId: string;
              
              if (existingAuthUserId) {
                // User already exists in auth, use their ID
                authUserId = existingAuthUserId;
                console.log(`⚠️ Auth user already exists for ${user.email}, using existing ID`);

                // Check if profile exists (RLS bypass via server route)
                const profileCheckRes = await adminFetch(`/admin/users/by-email?email=${encodeURIComponent(user.email)}`);
                const profileCheckJson = await profileCheckRes.json();
                const existingProfile = profileCheckJson.profile;

                if (existingProfile) {
                  console.log(`⏭️ Skipping ${user.email} - already fully imported`);
                  successCount++; // Count as success since user exists
                  continue;
                }
                // If no profile, we'll create one below
              } else {
                // Create new Supabase Auth user via server route
                const createRes = await adminFetch('/admin/users', {
                  method: 'POST',
                  body: JSON.stringify({
                    email: user.email,
                    password,
                    user_metadata: {
                      name: user.name,
                      imported_via_csv: true,
                      custom_password: isCustomPassword,
                      temp_password: password,
                    },
                  }),
                });
                const createJson = await createRes.json();

                if (!createJson.success) {
                  const errMsg: string = createJson.error ?? '';
                  if (errMsg.includes('already been registered') || errMsg.includes('already exists')) {
                    console.warn(`⚠️ Auth user already exists for ${user.email}, looking up from pre-loaded map`);

                    // Re-use the authUserMap already built above — no second listUsers call needed
                    const foundId = authUserMap.get(user.email);
                    if (foundId) {
                      authUserId = foundId;
                      console.log(`✓ Found existing auth user ID for ${user.email}`);

                      // Check if profile already exists for this auth user (server route returns both)
                      const existingProfileRes = await adminFetch(`/admin/users/${foundId}`);
                      const existingProfileJson = await existingProfileRes.json();

                      if (existingProfileJson.profile) {
                        console.log(`⏭️ Skipping ${user.email} - profile already exists`);
                        successCount++;
                        continue;
                      }
                      // No profile exists — fall through to create one below
                    } else {
                      console.error(`Error creating auth for ${user.email}:`, errMsg);
                      errors.push(`${user.email}: ${errMsg}`);
                      errorCount++;
                      continue;
                    }
                  } else {
                    console.error(`Error creating auth for ${user.email}:`, errMsg);
                    errors.push(`${user.email}: ${errMsg}`);
                    errorCount++;
                    continue;
                  }
                } else if (!createJson.user) {
                  console.error(`No auth user returned for ${user.email}`);
                  errors.push(`${user.email}: No auth user created`);
                  errorCount++;
                  continue;
                } else {
                  authUserId = createJson.user.id;
                }
              }
              
              // Get default community ID from current user's profile
              const defaultCommunityId = profile?.community_id || '550e8400-e29b-41d4-a716-446655440000';

              // Insert user profile row (RLS bypass via server route)
              const profileInsertRes = await adminFetch(`/admin/users/${authUserId}/profile`, {
                method: 'POST',
                body: JSON.stringify({
                  community_id: defaultCommunityId,
                  name: user.name,
                  full_name: user.name,
                  email: user.email,
                  role: user.role || 'member',
                  user_class: user.user_class || 3,
                  membership_tier: user.membership_tier || 'free',
                  location: user.location || null,
                  tagline: user.tagline || null,
                  bio: user.bio || null,
                  phone: user.phone || null,
                  website: user.website || null,
                  badges: [],
                  // Password info stored in auth.user_metadata (imported_via_csv, custom_password, temp_password)
                }),
              });
              const profileInsertJson = await profileInsertRes.json();

              if (!profileInsertJson.success) {
                console.error(`Error creating profile for ${user.email}:`, profileInsertJson.error);
                errors.push(`${user.email}: ${profileInsertJson.error}`);

                // Only clean up if we just created the auth user
                if (!existingAuthUserId) {
                  await adminFetch(`/admin/users/${authUserId}`, { method: 'DELETE' });
                }
                errorCount++;
              } else {
                successCount++;
                const passwordType = isCustomPassword ? 'custom password' : `temp password: ${password}`;
                console.log(`✅ Created user ${user.email} with ${passwordType}`);
              }
            }
          } catch (err) {
            console.error(`Error processing user ${user.email}:`, err);
            errors.push(`${user.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            errorCount++;
          }
        }
        
        // Refresh users list
        await fetchData();
        
        // Show results
        const messages: string[] = [];
        if (successCount > 0) {
          messages.push(`✅ Created ${successCount} new user${successCount > 1 ? 's' : ''} with temporary passwords`);
        }
        if (updatedCount > 0) {
          messages.push(`✏️ Updated ${updatedCount} existing user${updatedCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          messages.push(`❌ ${errorCount} error${errorCount > 1 ? 's' : ''}`);
        }
        if (skippedInvalidEmails.length > 0) {
          messages.push(`⏭️ Skipped ${skippedInvalidEmails.length} invalid email${skippedInvalidEmails.length > 1 ? 's' : ''}`);
        }
        
        if (messages.length > 0) {
          const summary = messages.join(' | ');
          if (errorCount === 0 && skippedInvalidEmails.length === 0) {
            toast.success(summary, { duration: 5000 });
          } else if (successCount > 0 || updatedCount > 0) {
            toast.warning(summary, { duration: 7000 });
          } else {
            toast.error(summary, { duration: 7000 });
          }
        }
        
        // Show skipped invalid emails
        if (skippedInvalidEmails.length > 0) {
          setTimeout(() => {
            if (skippedInvalidEmails.length <= 5) {
              const emailList = skippedInvalidEmails.map(e => `"${e.email}" (${e.reason})`).join(', ');
              toast.warning(`Skipped invalid emails: ${emailList}`, { duration: 10000 });
            } else {
              toast.warning(`Skipped ${skippedInvalidEmails.length} invalid emails. Check console for details.`, { duration: 7000 });
              console.warn('Skipped invalid emails:', skippedInvalidEmails);
            }
          }, 500);
        }
        
        // Show detailed errors if any
        if (errors.length > 0 && errors.length <= 5) {
          setTimeout(() => {
            toast.error(`Errors: ${errors.join(', ')}`, { duration: 10000 });
          }, 500);
        } else if (errors.length > 5) {
          setTimeout(() => {
            toast.error(`${errors.length} errors occurred. Check console for details.`, { duration: 7000 });
          }, 500);
          console.error('Import errors:', errors);
        }
        
        // Show temp password info if new users were created
        if (successCount > 0) {
          setTimeout(() => {
            toast.info(
              `💡 New users can log in with their email. If you provided custom passwords, users have those. Otherwise, auto-generated temp passwords are in user settings (User Detail page).`,
              { duration: 10000 }
            );
          }, 1000);
        }
        
        setImporting(false);
      } catch (error) {
        console.error('Error importing CSV:', error);
        toast.error(`Failed to import users: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setImporting(false);
      }
    };
    
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setDeleting(true);
      
      // Step 1: Delete from database (will cascade to all content)
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      // Step 2: Try to delete from Supabase Auth via server route (if auth account exists)
      try {
        const deleteAuthRes = await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
        const deleteAuthJson = await deleteAuthRes.json();
        if (!deleteAuthJson.success) {
          console.warn('Auth deletion failed (user may not have auth account):', deleteAuthJson.error);
          // Don't throw — this is OK if user has no auth account
        }
      } catch (authErr) {
        console.warn('Auth deletion error:', authErr);
        // Don't throw — database deletion succeeded, that's what matters
      }

      // Update local state
      setUsers(users.filter(u => u.id !== userId));
      setDeleteUserId(null);
      setDeletionPreview(null);
      toast.success('User and all content deleted successfully');
      
      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error?.message || 'Unknown error';
      const errorDetails = error?.details || '';
      toast.error(`Failed to delete user: ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCleanupTestUsers = async () => {
    if (!confirm('⚠️ This will delete ALL test users (emails containing "@testplatform.io"). Are you sure?')) {
      return;
    }
    
    try {
      setImporting(true);
      
      // Get all auth users via server route (paginated)
      const allAuthUsers: any[] = [];
      let cleanupPage = 1;
      let cleanupHasMore = true;
      while (cleanupHasMore) {
        const res = await adminFetch(`/admin/users?page=${cleanupPage}&per_page=1000`);
        const json = await res.json();
        if (json.success && json.users && json.users.length > 0) {
          allAuthUsers.push(...json.users);
          cleanupHasMore = json.users.length === 1000;
          cleanupPage++;
        } else {
          if (!json.success) console.error('Error fetching auth users for cleanup:', json.error);
          cleanupHasMore = false;
        }
      }
      const testAuthUsers = allAuthUsers.filter((u: any) => u.email?.includes('@testplatform.io'));
      
      // Get all test users from database
      const { data: testDbUsers } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', '%@testplatform.io%');
      
      let deletedAuth = 0;
      let deletedDb = 0;
      const errors: string[] = [];
      
      // Delete from database first
      for (const user of testDbUsers || []) {
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);
          
          if (error) {
            errors.push(`DB: ${user.email} - ${error.message}`);
          } else {
            deletedDb++;
          }
        } catch (err) {
          errors.push(`DB: ${user.email} - ${err}`);
        }
      }
      
      // Delete from auth via server route
      for (const user of testAuthUsers) {
        try {
          const res = await adminFetch(`/admin/users/${user.id}`, { method: 'DELETE' });
          const json = await res.json();

          if (!json.success) {
            errors.push(`Auth: ${user.email} - ${json.error}`);
          } else {
            deletedAuth++;
          }
        } catch (err) {
          errors.push(`Auth: ${user.email} - ${err}`);
        }
      }
      
      await fetchData();
      
      const message = `✅ Deleted ${deletedAuth} auth users and ${deletedDb} database profiles`;
      if (errors.length === 0) {
        toast.success(message, { duration: 5000 });
      } else {
        toast.warning(`${message} with ${errors.length} error(s)`, { duration: 7000 });
        console.error('Cleanup errors:', errors);
      }
      
      setImporting(false);
    } catch (error) {
      console.error('Error cleaning up test users:', error);
      toast.error(`Failed to cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setImporting(false);
    }
  };

  const loadDeletionPreview = async (userId: string) => {
    try {
      setLoadingPreview(true);
      const user = users.find(u => u.id === userId);
      if (!user) {
        toast.error('User not found');
        setLoadingPreview(false);
        return;
      }

      const userCircles = getUserCircles(userId);
      const adminCircles = getUserAdminCircles(userId);
      const userActivity = getUserActivity(userId);
      const isCurrentUser = user.id === profile.id;

      setDeletionPreview({
        user,
        userCircles,
        adminCircles,
        userActivity,
        isCurrentUser
      });
      setLoadingPreview(false);
    } catch (error) {
      console.error('Error loading deletion preview:', error);
      toast.error('Failed to load deletion preview');
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Platform Admin', path: '/platform-admin' },
        { label: 'User Management' }
      ]} />
      
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">User Management</h1>
        <p className="text-gray-600">Manage user accounts and roles</p>
      </div>

      {/* Explanation Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">Understanding Platform Roles</p>
              <div className="text-blue-700 space-y-1">
                <p className="text-xs mb-2">
                  <strong>Role Hierarchy:</strong> Member → Host → Moderator → Admin → Coordinator → Manager → Super Admin
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><strong>Member:</strong> Standard community member</div>
                  <div><strong>Host:</strong> Can host events and sessions</div>
                  <div><strong>Moderator:</strong> Can moderate content in circles</div>
                  <div><strong>Admin:</strong> Circle and community admin</div>
                  <div><strong>Coordinator:</strong> Program coordinator access</div>
                  <div><strong>Manager:</strong> Program manager access</div>
                  <div><strong>Super Admin:</strong> Full platform administrator (you!)</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three Permission Systems Banner */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <Lock className="w-5 h-5 text-amber-600" />
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-sm">
              <p className="font-medium text-amber-900 mb-2">🎯 Three Independent Permission Systems</p>
              <div className="text-amber-700 space-y-1.5">
                <p><strong>1. Platform Role</strong> (member, admin, super, etc.) = What they ARE - organizational role and admin capabilities</p>
                <p><strong>2. User Class (1-10)</strong> = What they can ACCESS - controls navigation visibility and feature permissions</p>
                <p><strong>3. Membership Tier</strong> (free/member/premium) = What they PAY - billing and subscription level</p>
                <p className="text-xs mt-2 text-amber-600 bg-amber-100 p-2 rounded">
                  💡 <strong>Example:</strong> A user could be Role=<em>member</em>, Class=<em>9 (Executive)</em>, Tier=<em>free</em> → Regular user with full access who doesn't pay (sponsored member)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* CSV Import/Export Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-green-900 mb-1">✅ CSV Import/Export - Fully Functional</p>
              <div className="text-green-700 space-y-1">
                <p className="text-xs"><strong>Export Users:</strong> Downloads all user data including passwords</p>
                <p className="text-xs"><strong>Import Users (New):</strong> Creates Supabase Auth accounts with temporary passwords - users can log in immediately</p>
                <p className="text-xs"><strong>Import Users (Existing):</strong> Updates existing user information without affecting their authentication</p>
                <p className="text-xs mt-2 text-green-600 font-medium">
                  💡 <strong>How it works:</strong> Import CSV → System creates auth accounts automatically → Export to get passwords.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Class Tabs */}
      <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setUserClassFilter(value === 'all' ? 'all' : parseInt(value))}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
          {USER_CLASSES.map(cls => {
            const count = users.filter(u => (u.user_class || 3) === cls.level).length;
            return (
              <TabsTrigger key={cls.level} value={cls.level.toString()}>
                <Badge className={`mr-2 ${getUserClassColor(cls.level)}`}>
                  {cls.name}
                </Badge>
                ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value={userClassFilter.toString()} className="mt-4">
          {/* Content will show filtered users below */}
        </TabsContent>
      </Tabs>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4">
        {/* Export/Import Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportUsersToCSV}
            disabled={users.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Users CSV
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="csv-upload"
              disabled={importing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Users CSV'}
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupTestUsers}
            disabled={importing}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clean Up Test Users
          </Button>
          
          <div className="ml-auto flex items-center gap-2 text-xs">
            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-200">
              <span className="font-medium">✨ Import creates auth accounts | Export includes passwords</span>
            </div>
          </div>
        </div>
        
        {/* CSV Format Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-sm flex-1">
              <p className="font-medium text-gray-900 mb-2">📋 CSV Format & Usage</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
                <div>
                  <p className="font-medium text-gray-900 mb-1">Required Columns:</p>
                  <ul className="space-y-0.5 ml-4 list-disc">
                    <li><strong>Name</strong> - User's full name</li>
                    <li><strong>Email</strong> - Must be unique</li>
                    <li><strong>Role</strong> - member, host, moderator, admin, coordinator, manager, super</li>
                    <li><strong>User Class</strong> - Number 1-10 (access level, default: 3)</li>
                    <li><strong>Membership Tier</strong> - free, member, premium (billing tier)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Optional Columns:</p>
                  <ul className="space-y-0.5 ml-4 list-disc">
                    <li><strong>ID</strong> - For updates only (leave blank for new users)</li>
                    <li><strong>Password</strong> - Custom password for new users (or leave blank for auto-generated)</li>
                    <li><strong>Location</strong> - User's location</li>
                    <li><strong>Tagline</strong> - Short bio</li>
                    <li><strong>Bio</strong> - Longer description</li>
                    <li><strong>Phone</strong> - Phone number</li>
                    <li><strong>Website</strong> - Website URL</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800">
                  <strong>✅ Import Behavior:</strong> New users → Creates auth account. Password column: provide custom OR leave blank for auto-generated temp password. Existing users (matched by email) → Updates info only, auth unchanged.
                </p>
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  <strong>🔑 Password Column:</strong> Exports show auto-generated temp passwords (if any). For imports: provide your own password OR leave blank for random temp password. Custom passwords are NOT stored in settings (secure).
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value: string) => setRoleFilter(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles ({users.length})</SelectItem>
              {USER_ROLES.map(role => {
                const count = users.filter(u => (u.role || 'member') === role.value).length;
                return (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={userClassFilter.toString()} onValueChange={(value) => setUserClassFilter(value === 'all' ? 'all' : parseInt(value))}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="User Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {USER_CLASSES.map(userClass => {
                const count = users.filter(u => (u.user_class || 3) === userClass.level).length;
                return (
                  <SelectItem key={userClass.level} value={userClass.level.toString()}>
                    {userClass.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={(value: string) => setTierFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Billing Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free ({users.filter(u => (u.membership_tier || 'free') === 'free').length})</SelectItem>
              <SelectItem value="member">Member ({users.filter(u => u.membership_tier === 'member').length})</SelectItem>
              <SelectItem value="premium">Premium ({users.filter(u => u.membership_tier === 'premium').length})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={authStatusFilter} onValueChange={(value: string) => setAuthStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Auth Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Auth Active ({users.filter(u => u.has_auth_account).length})</SelectItem>
              <SelectItem value="inactive">No Auth ({users.filter(u => !u.has_auth_account).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Active Filters Display */}
        {(roleFilter !== 'all' || userClassFilter !== 'all' || tierFilter !== 'all' || authStatusFilter !== 'all' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-900">Active filters:</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1 bg-white">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-red-600 font-bold">×</button>
              </Badge>
            )}
            {roleFilter !== 'all' && (
              <Badge variant="outline" className="gap-1 bg-white">
                Role: {USER_ROLES.find(r => r.value === roleFilter)?.label}
                <button onClick={() => setRoleFilter('all')} className="ml-1 hover:text-red-600 font-bold">×</button>
              </Badge>
            )}
            {userClassFilter !== 'all' && (
              <Badge variant="outline" className="gap-1 bg-white">
                Class: {getUserClassName(userClassFilter as number)}
                <button onClick={() => setUserClassFilter('all')} className="ml-1 hover:text-red-600 font-bold">×</button>
              </Badge>
            )}
            {tierFilter !== 'all' && (
              <Badge variant="outline" className="gap-1 bg-white">
                Tier: {tierFilter}
                <button onClick={() => setTierFilter('all')} className="ml-1 hover:text-red-600 font-bold">×</button>
              </Badge>
            )}
            {authStatusFilter !== 'all' && (
              <Badge variant="outline" className="gap-1 bg-white">
                Auth: {authStatusFilter}
                <button onClick={() => setAuthStatusFilter('all')} className="ml-1 hover:text-red-600 font-bold">×</button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setUserClassFilter('all');
                setTierFilter('all');
                setAuthStatusFilter('all');
              }}
              className="text-xs h-6 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              Clear all filters
            </Button>
            <span className="ml-auto text-sm text-blue-700 font-medium">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold mt-2">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Super Admins</p>
              <p className="text-3xl font-bold mt-2 text-purple-600">
                {users.filter(u => u.role === 'super').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Auth Active</p>
              <p className="text-3xl font-bold mt-2 text-green-600">
                {users.filter(u => u.has_auth_account).length}
              </p>
              {users.filter(u => !u.has_auth_account).length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {users.filter(u => !u.has_auth_account).length} missing auth
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className={filteredUsers.length < users.length ? 'border-blue-300 bg-blue-50' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {filteredUsers.length < users.length ? 'Filtered Results' : 'Showing All'}
              </p>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {filteredUsers.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const userCircles = getUserCircles(user.id);
          const adminCircles = getUserAdminCircles(user.id);
          const userActivity = getUserActivity(user.id);
          const isCurrentUser = user.id === profile.id;

          return (
            <Card key={user.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link to={`/platform-admin/users/${user.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{user.name}</h3>
                          {isCurrentUser && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">You</Badge>
                          )}
                          {!user.has_auth_account && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Auth Account
                            </Badge>
                          )}
                        </div>
                        
                        {user.tagline && (
                          <p className="text-sm text-gray-600 mb-2">{user.tagline}</p>
                        )}
                        
                        {/* User Class & Membership Tier - inline editor */}
                        <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.preventDefault()}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              <Lock className="w-3 h-3 inline mr-1" />
                              Access Level:
                            </span>
                            <Select 
                              value={user.user_class?.toString() || '3'} 
                              onValueChange={(value) => handleUpdateUserClass(user.id, parseInt(value))}
                            >
                              <SelectTrigger className="h-7 text-xs border">
                                <SelectValue>
                                  <Badge className={`text-xs ${getUserClassColor(user.user_class || 3)}`}>
                                    {getUserClassName(user.user_class || 3)}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {USER_CLASSES.map(cls => (
                                  <SelectItem key={cls.level} value={cls.level.toString()}>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-xs ${getUserClassColor(cls.level)}`}>
                                        {cls.name}
                                      </Badge>
                                      <span className="text-xs text-gray-500">- {cls.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              <CreditCard className="w-3 h-3 inline mr-1" />
                              Billing Tier:
                            </span>
                            <Select 
                              value={user.membership_tier || 'free'} 
                              onValueChange={(value) => handleUpdateTier(user.id, value)}
                            >
                              <SelectTrigger className="h-7 text-xs border">
                                <SelectValue>
                                  <Badge className={`text-xs ${getTierColor(user.membership_tier || 'free')}`}>
                                    {user.membership_tier || 'free'}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">
                                  <Badge className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                                    free
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="member">
                                  <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                                    member
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="premium">
                                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                                    premium
                                  </Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {user.email}
                          </div>
                          {user.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {user.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-600">Member of: </span>
                            <span className="font-medium">{userCircles.length} circles</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Activity: </span>
                            <span className="font-medium">{userActivity.posts} posts, {userActivity.documents} docs</span>
                          </div>
                          {user.badges.length > 0 && (
                            <div>
                              <span className="text-gray-600">Badges: </span>
                              <span className="font-medium">{user.badges.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Admin Capabilities */}
                        {userActivity.adminContainers.total > 0 && (
                          <div className="bg-purple-50 rounded-lg p-3 mb-3">
                            <div className="text-sm font-medium text-purple-900 mb-2">
                              Administrator of {userActivity.adminContainers.total} containers:
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {userActivity.adminContainers.circles > 0 && (
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                                  {userActivity.adminContainers.circles} Circle{userActivity.adminContainers.circles > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {userActivity.adminContainers.tables > 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  {userActivity.adminContainers.tables} Table{userActivity.adminContainers.tables > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {userActivity.adminContainers.elevators > 0 && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  {userActivity.adminContainers.elevators} Elevator{userActivity.adminContainers.elevators > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {userActivity.adminContainers.meetings > 0 && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                  {userActivity.adminContainers.meetings} Meeting{userActivity.adminContainers.meetings > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {userActivity.adminContainers.pitches > 0 && (
                                <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                                  {userActivity.adminContainers.pitches} Pitch{userActivity.adminContainers.pitches > 1 ? 'es' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4" onClick={(e) => e.preventDefault()}>
                      {/* Role Selector and Delete Button */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Platform Role:
                          </span>
                          <Select 
                            value={user.role || 'member'} 
                            onValueChange={(value) => handleUpdateRole(user.id, value)}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="h-8 w-48 text-sm">
                              <SelectValue>
                                <Badge className={`text-xs ${getRoleInfo(user.role || 'member').color}`}>
                                  {getRoleInfo(user.role || 'member').label}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex flex-col gap-1 py-1">
                                    <Badge className={`text-xs w-fit ${role.color}`}>
                                      {role.label}
                                    </Badge>
                                    <span className="text-xs text-gray-500">{role.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {isCurrentUser ? (
                          <span className="text-xs text-gray-400">Cannot change own role</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await impersonateUser(user.id);
                                window.location.href = '/';
                              }}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-300"
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Switch to User
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                loadDeletionPreview(user.id);
                                setDeleteUserId(user.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete User
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No users found
          </CardContent>
        </Card>
      )}

      {/* Delete User Confirmation Dialog */}
      {deleteUserId && (
        <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteUserId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteUser(deleteUserId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Deletion Preview Dialog - Simplified */}
      {deletionPreview && (
        <Dialog open={!!deletionPreview} onOpenChange={() => setDeletionPreview(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Delete User & Content
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the user and all their content.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={deletionPreview.user.avatar} />
                  <AvatarFallback>{deletionPreview.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{deletionPreview.user.name}</h3>
                  <p className="text-sm text-gray-600">{deletionPreview.user.email}</p>
                </div>
                <Badge className={`text-xs ${getRoleInfo(deletionPreview.user.role || 'member').color}`}>
                  {getRoleInfo(deletionPreview.user.role || 'member').label}
                </Badge>
              </div>

              {/* Warning Alert */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>The following will be permanently deleted:</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>• <strong>{deletionPreview.userActivity.posts}</strong> posts</div>
                      <div>• <strong>{deletionPreview.userActivity.documents}</strong> documents</div>
                      <div>• <strong>{deletionPreview.userCircles.length}</strong> circle memberships</div>
                      <div>• <strong>{deletionPreview.userActivity.adminContainers.total}</strong> admin roles</div>
                    </div>
                    {deletionPreview.userActivity.adminContainers.total > 0 && (
                      <p className="text-xs mt-2 text-red-700 font-medium">
                        ⚠️ This user is an admin of {deletionPreview.userActivity.adminContainers.total} containers. Those containers will lose this admin.
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteUserId(null);
                  setDeletionPreview(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setDeleting(true);
                  await handleDeleteUser(deleteUserId);
                  setDeleting(false);
                  setDeleteUserId(null);
                  setDeletionPreview(null);
                }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete User & Content'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}