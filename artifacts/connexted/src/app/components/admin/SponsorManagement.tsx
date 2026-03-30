// Split candidate: ~548 lines — consider extracting SponsorCard, SponsorTierSelector, and SponsorMemberTable into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
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
  DialogTrigger,
} from '@/app/components/ui/dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import SponsorMemberDialog from '@/app/components/admin/SponsorMemberDialog';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Crown,
  Star,
  Users,
  ExternalLink,
} from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  location_city: string | null;
  location_state: string | null;
  tier: string;
  tier_id: string | null;
  created_at: string;
}

interface SponsorTier {
  id: string;
  tier_name: string;
  tier_level: number;
}

export default function SponsorManagement() {
  const { profile } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [managingMembersSponsor, setManagingMembersSponsor] = useState<Sponsor | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    website_url: '',
    contact_email: '',
    location_city: '',
    location_state: '',
    tier_id: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch sponsors
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from('sponsors')
        .select('*')
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (sponsorsError) throw sponsorsError;
      setSponsors(sponsorsData || []);

      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('sponsor_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      toast.error('Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const slug = formData.slug || generateSlug(formData.name);

      if (editingSponsor) {
        // Update existing sponsor
        const { error } = await supabase
          .from('sponsors')
          .update({
            name: formData.name,
            slug,
            tagline: formData.tagline || null,
            description: formData.description || null,
            website_url: formData.website_url || null,
            contact_email: formData.contact_email || null,
            location_city: formData.location_city || null,
            location_state: formData.location_state || null,
            tier_id: formData.tier_id || null,
          })
          .eq('id', editingSponsor.id);

        if (error) throw error;
        toast.success('Sponsor updated successfully');
      } else {
        // Create new sponsor
        const { error } = await supabase.from('sponsors').insert([
          {
            name: formData.name,
            slug,
            tagline: formData.tagline || null,
            description: formData.description || null,
            website_url: formData.website_url || null,
            contact_email: formData.contact_email || null,
            location_city: formData.location_city || null,
            location_state: formData.location_state || null,
            tier_id: formData.tier_id || null,
          },
        ]);

        if (error) throw error;
        toast.success('Sponsor created successfully');
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        slug: '',
        tagline: '',
        description: '',
        website_url: '',
        contact_email: '',
        location_city: '',
        location_state: '',
        tier_id: '',
      });
      setEditingSponsor(null);
      setShowCreateDialog(false);

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error saving sponsor:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('A sponsor with this slug already exists');
      } else {
        toast.error('Failed to save sponsor');
      }
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      slug: sponsor.slug,
      tagline: sponsor.tagline || '',
      description: sponsor.description || '',
      website_url: sponsor.website_url || '',
      contact_email: sponsor.contact_email || '',
      location_city: sponsor.location_city || '',
      location_state: sponsor.location_state || '',
      tier_id: sponsor.tier_id || '',
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (sponsorId: string, sponsorName: string) => {
    if (!confirm(`Are you sure you want to delete ${sponsorName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', sponsorId);

      if (error) throw error;

      toast.success('Sponsor deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      toast.error('Failed to delete sponsor');
    }
  };

  const getTierBadge = (tierName: string) => {
    const tierColors: Record<string, string> = {
      Bronze: 'bg-amber-700 text-white',
      Silver: 'bg-gray-400 text-white',
      Gold: 'bg-yellow-600 text-white',
      Platinum: 'bg-slate-700 text-white',
    };
    return tierColors[tierName] || 'bg-blue-600 text-white';
  };

  if (profile?.role !== 'admin' && profile?.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading sponsors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Sponsor Management' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Sponsor Management</h1>
          <p className="text-gray-600">Manage sponsor organizations and assign tiers</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Create New Sponsor'}</DialogTitle>
              <DialogDescription>
                {editingSponsor
                  ? 'Update sponsor information and tier assignment'
                  : 'Add a new sponsor organization to the platform'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Sponsor Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (!editingSponsor) {
                          setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Brief one-liner about the sponsor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Full description of the sponsor"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="sponsor@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_city">City</Label>
                    <Input
                      id="location_city"
                      value={formData.location_city}
                      onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_state">State</Label>
                    <Input
                      id="location_state"
                      value={formData.location_state}
                      onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier_id">Sponsor Tier</Label>
                  <Select value={formData.tier_id} onValueChange={(value) => setFormData({ ...formData, tier_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.tier_name} (Level {tier.tier_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingSponsor(null);
                    setFormData({
                      name: '',
                      slug: '',
                      tagline: '',
                      description: '',
                      website_url: '',
                      contact_email: '',
                      location_city: '',
                      location_state: '',
                      tier_id: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingSponsor ? 'Update' : 'Create'} Sponsor</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sponsors.length}</div>
            <div className="text-sm text-gray-600">Total Sponsors</div>
          </CardContent>
        </Card>
        {tiers.map((tier) => {
          const count = sponsors.filter((s) => {
            const tierData = tiers.find((t) => t.id === s.tier_id);
            return tierData?.tier_name === tier.tier_name;
          }).length;
          return (
            <Card key={tier.id}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600">{tier.tier_name} Tier</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sponsors List */}
      <Card>
        <CardHeader>
          <CardTitle>All Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          {sponsors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No sponsors yet. Click "Add Sponsor" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {sponsors.map((sponsor) => {
                const tier = tiers.find((t) => t.id === sponsor.tier_id);
                return (
                  <div
                    key={sponsor.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {sponsor.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{sponsor.name}</h3>
                          {tier && (
                            <Badge className={getTierBadge(tier.tier_name)}>
                              <Crown className="w-3 h-3 mr-1" />
                              {tier.tier_name}
                            </Badge>
                          )}
                        </div>
                        {sponsor.tagline && (
                          <p className="text-sm text-gray-600 mb-2">{sponsor.tagline}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {sponsor.location_city && sponsor.location_state && (
                            <span>📍 {sponsor.location_city}, {sponsor.location_state}</span>
                          )}
                          {sponsor.website_url && (
                            <a
                              href={sponsor.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Website
                            </a>
                          )}
                          <Link to={`/sponsors/${sponsor.slug}`} className="text-indigo-600 hover:underline">
                            View Profile
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingMembersSponsor(sponsor)}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Members
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(sponsor)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sponsor.id, sponsor.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Management Dialog */}
      {managingMembersSponsor && (
        <SponsorMemberDialog
          sponsorId={managingMembersSponsor.id}
          sponsorName={managingMembersSponsor.name}
          open={!!managingMembersSponsor}
          onOpenChange={(open) => {
            if (!open) setManagingMembersSponsor(null);
          }}
        />
      )}
    </div>
  );
}