import { ArrowLeft, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface CompanyNewsData {
  id: string;
  company_id: string;
  name: string;
  description: string;
  is_public: boolean;
  allow_comments: boolean;
  allow_reactions: boolean;
  visibility_window: string;
}

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
}

export default function CompanyNewsSettings() {
  const { slug } = useParams();
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyNews, setCompanyNews] = useState<CompanyNewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [visibilityWindow, setVisibilityWindow] = useState('');

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  const fetchData = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('market_companies')
        .select('id, name, slug, owner_user_id')
        .eq('slug', slug)
        .single();

      if (companyError) throw companyError;

      // Check if current user is owner
      if (currentUser?.id !== companyData.owner_user_id) {
        toast.error('You do not have permission to edit this company news settings');
        navigate(`/markets/companies/${slug}/news`);
        return;
      }

      setCompany(companyData);

      // Fetch company news
      const { data: newsData, error: newsError } = await supabase
        .from('company_news')
        .select('*')
        .eq('company_id', companyData.id)
        .single();

      if (newsError) {
        // Create default if doesn't exist
        const { data: newNewsData, error: createError } = await supabase
          .from('company_news')
          .insert({
            company_id: companyData.id,
            name: `${companyData.name} News`,
            description: `Company updates and news from ${companyData.name}`,
            is_public: true,
            allow_comments: true,
            allow_reactions: true,
            visibility_window: 'all',
          })
          .select()
          .single();

        if (createError) throw createError;
        setCompanyNews(newNewsData);
        setName(newNewsData.name);
        setDescription(newNewsData.description);
        setIsPublic(newNewsData.is_public);
        setAllowComments(newNewsData.allow_comments);
        setAllowReactions(newNewsData.allow_reactions);
        setVisibilityWindow(newNewsData.visibility_window);
      } else {
        setCompanyNews(newsData);
        setName(newsData.name);
        setDescription(newsData.description);
        setIsPublic(newsData.is_public);
        setAllowComments(newsData.allow_comments);
        setAllowReactions(newsData.allow_reactions);
        setVisibilityWindow(newsData.visibility_window);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
      navigate('/markets');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyNews || !name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_news')
        .update({
          name: name.trim(),
          description: description.trim(),
          is_public: isPublic,
          allow_comments: allowComments,
          allow_reactions: allowReactions,
          updated_at: new Date().toISOString(),
          visibility_window: visibilityWindow,
        })
        .eq('id', companyNews.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
      navigate(`/markets/companies/${slug}/news`);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (!company || !companyNews) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Company news not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Markets', path: '/markets' },
          { label: 'Companies', path: '/markets/all-companies' },
          { label: company.name, path: `/markets/companies/${company.slug}` },
          { label: 'News', path: `/markets/companies/${company.slug}/news` },
          { label: 'Settings' },
        ]}
      />

      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/markets/companies/${slug}/news`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to News
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>News Settings</CardTitle>
          <CardDescription>
            Configure how your company news feed works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Feed Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corp News"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your news feed is about"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Feed</Label>
                <p className="text-sm text-gray-500">
                  Allow anyone to view your company news
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Comments</Label>
                <p className="text-sm text-gray-500">
                  Let viewers comment on your posts
                </p>
              </div>
              <Switch
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Reactions</Label>
                <p className="text-sm text-gray-500">
                  Let viewers react to your posts
                </p>
              </div>
              <Switch
                checked={allowReactions}
                onCheckedChange={setAllowReactions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility_window">Visibility Window</Label>
              <Select
                value={visibilityWindow}
                onValueChange={setVisibilityWindow}
              >
                <SelectTrigger id="visibility_window">
                  <SelectValue placeholder="Select visibility window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Control how far back visitors can see your company news
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/markets/companies/${slug}/news`)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}