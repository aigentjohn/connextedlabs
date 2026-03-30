import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
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
import { Building2, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'E-commerce',
  'Manufacturing',
  'Consulting',
  'Media & Entertainment',
  'Real Estate',
  'Food & Beverage',
  'Travel & Hospitality',
  'Other',
];

const TEAM_SIZES = [
  '1',
  '2-10',
  '11-50',
  '51-200',
  '200+',
];

export default function EditCompanyPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    description: '',
    industry: '',
    team_size: '',
    headquarters_location: '',
    website_url: '',
    founded_year: '',
  });

  useEffect(() => {
    if (profile?.id && id) {
      fetchCompany();
    }
  }, [profile, id]);

  const fetchCompany = async () => {
    if (!profile?.id || !id) return;

    try {
      setLoadingData(true);

      const { data: company, error } = await supabase
        .from('market_companies')
        .select('*')
        .eq('id', id)
        .eq('owner_user_id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
        toast.error('Failed to load company');
        navigate('/my-ventures');
        return;
      }

      if (!company) {
        toast.error('Company not found or you do not have permission to edit it');
        navigate('/my-ventures');
        return;
      }

      setFormData({
        name: company.name || '',
        slug: company.slug || '',
        tagline: company.tagline || '',
        description: company.description || '',
        industry: company.industry || '',
        team_size: company.team_size || '',
        headquarters_location: company.headquarters_location || '',
        website_url: company.website_url || '',
        founded_year: company.founded_year ? company.founded_year.toString() : '',
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return false;
    }

    if (!formData.slug.trim()) {
      toast.error('Company slug is required');
      return false;
    }

    // Slug validation
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }

    if (!formData.industry) {
      toast.error('Industry is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!profile?.id || !id) {
      toast.error('You must be logged in to edit a company');
      return;
    }

    try {
      setLoading(true);

      // Check if slug is unique (excluding current company)
      const { data: existingCompany } = await supabase
        .from('market_companies')
        .select('id')
        .eq('slug', formData.slug)
        .neq('id', id)
        .single();

      if (existingCompany) {
        toast.error('This company slug is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Update the company
      const { error } = await supabase
        .from('market_companies')
        .update({
          name: formData.name,
          slug: formData.slug,
          tagline: formData.tagline || null,
          description: formData.description || null,
          industry: formData.industry,
          team_size: formData.team_size || null,
          headquarters_location: formData.headquarters_location || null,
          website_url: formData.website_url || null,
          founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating company:', error);
        toast.error('Failed to update company. Please try again.');
        return;
      }

      toast.success('Company updated successfully!');
      navigate('/my-ventures');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.id || !id) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('market_companies')
        .delete()
        .eq('id', id)
        .eq('owner_user_id', profile.id);

      if (error) {
        console.error('Error deleting company:', error);
        toast.error('Failed to delete company');
        return;
      }

      toast.success('Company deleted successfully');
      navigate('/my-ventures');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Loading company data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Markets', href: '/markets' },
          { label: 'My Ventures', href: '/my-ventures' },
          { label: 'Edit Company' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/my-ventures')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Company</h1>
            <p className="text-gray-600">Update your company information</p>
          </div>
        </div>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Company
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this company and all associated offerings.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Company'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic details about your company
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Acme Corporation"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="e.g., acme-corporation"
                required
              />
              <p className="text-sm text-gray-500">
                This will be used in your company's URL: /markets/companies/{formData.slug || 'your-slug'}
              </p>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="A brief, catchy description of your company"
                maxLength={200}
              />
              <p className="text-sm text-gray-500">
                {formData.tagline.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Tell us more about your company, what you do, and your mission..."
                rows={5}
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">
                Industry <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleChange('industry', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Size */}
            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Select
                value={formData.team_size}
                onValueChange={(value) => handleChange('team_size', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="headquarters_location">Headquarters Location</Label>
              <Input
                id="headquarters_location"
                value={formData.headquarters_location}
                onChange={(e) => handleChange('headquarters_location', e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            {/* Founded Year */}
            <div className="space-y-2">
              <Label htmlFor="founded_year">Founded Year</Label>
              <Input
                id="founded_year"
                type="number"
                value={formData.founded_year}
                onChange={(e) => handleChange('founded_year', e.target.value)}
                placeholder="e.g., 2024"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/my-ventures')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}