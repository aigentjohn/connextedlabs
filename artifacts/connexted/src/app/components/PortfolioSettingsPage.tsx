import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Briefcase, Save, ArrowLeft } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface PortfolioData {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string;
  is_public: boolean;
  layout_style: string;
  show_categories: boolean;
}

export default function PortfolioSettingsPage() {
  const { userId } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [layoutStyle, setLayoutStyle] = useState('grid');
  const [showCategories, setShowCategories] = useState(true);

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      if (!isOwner) {
        toast.error('You can only edit your own portfolio');
        navigate(`/portfolio/${userId}`);
        return;
      }
      fetchPortfolio();
    }
  }, [userId, isOwner]);

  const fetchPortfolio = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setPortfolio(data);
      setName(data.name);
      setTagline(data.tagline || '');
      setDescription(data.description || '');
      setIsPublic(data.is_public);
      setLayoutStyle(data.layout_style);
      setShowCategories(data.show_categories);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!portfolio || !name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({
          name: name.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          is_public: isPublic,
          layout_style: layoutStyle,
          show_categories: showCategories,
          updated_at: new Date().toISOString(),
        })
        .eq('id', portfolio.id);

      if (error) throw error;

      toast.success('Portfolio settings updated!');
      navigate(`/portfolio/${userId}`);
    } catch (error: any) {
      console.error('Error updating portfolio:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Portfolio not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'My Profile', path: '/profile' },
        { label: 'Portfolio', path: `/portfolio/${userId}` },
        { label: 'Settings' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold">Portfolio Settings</h1>
            <p className="text-gray-600">Customize your portfolio showcase</p>
          </div>
        </div>
        <Link to={`/portfolio/${userId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portfolio
          </Button>
        </Link>
      </div>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Customize how your portfolio appears to others
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Portfolio Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., David's Portfolio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short, catchy description of your work"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about your work and what they'll find in your portfolio..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Control how your portfolio items are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="layout">Layout Style</Label>
            <Select value={layoutStyle} onValueChange={setLayoutStyle}>
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid - Equal sized cards</SelectItem>
                <SelectItem value="list">List - Full width items</SelectItem>
                <SelectItem value="masonry">Masonry - Pinterest-style</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="categories">Show Category Filter</Label>
              <p className="text-sm text-gray-600">
                Display category buttons for filtering items
              </p>
            </div>
            <Switch
              id="categories"
              checked={showCategories}
              onCheckedChange={setShowCategories}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Control who can see your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Portfolio</Label>
              <p className="text-sm text-gray-600">
                Allow anyone to view your portfolio
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link to={`/portfolio/${userId}`}>
          <Button variant="outline">
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
