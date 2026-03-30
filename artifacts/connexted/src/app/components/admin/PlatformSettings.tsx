import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Shield, Settings, Save, RefreshCw, Globe, Palette, Image as ImageIcon, UserCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Switch } from '@/app/components/ui/switch';

interface PlatformSettings {
  id: string;
  platform_name: string;
  platform_tagline: string;
  platform_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  app_base_url: string;
  enable_demo_account: boolean;
  demo_account_email: string;
  demo_account_password: string;
  enable_guest_browsing: boolean;
  company_name: string;
  product_name: string;
  company_tagline: string;
  // Removed: default_community_name and default_community_description
  hero_badge_text: string;
  hero_headline: string;
  hero_headline_highlight: string;
  hero_description: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  cta_tertiary_text: string;
  audience_1_title: string;
  audience_1_description: string;
  audience_2_title: string;
  audience_2_description: string;
  audience_3_title: string;
  audience_3_description: string;
  // ConvertKit Integration
  newsletter_form_id: string;
  newsletter_script_url: string;
  newsletter_button_text: string;
  newsletter_button_url: string;
  // Footer Links
  footer_about_url: string;
  footer_contact_url: string;
  footer_privacy_url: string;
  footer_terms_url: string;
  footer_email_link: string;
  footer_website_link: string;
  updated_at: string;
}

export default function PlatformSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoAccountColumnsExist, setDemoAccountColumnsExist] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>({
    id: '',
    platform_name: 'CONNEXTED LABS',
    platform_tagline: 'Building connections together',
    platform_description: 'A community platform for collaboration and growth',
    logo_url: '',
    favicon_url: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    support_email: 'support@example.com',
    app_base_url: 'https://example.com',
    enable_demo_account: false,
    demo_account_email: 'demo@example.com',
    demo_account_password: 'demo123',
    enable_guest_browsing: false,
    company_name: 'Connexted Labs',
    product_name: 'Community Platform',
    company_tagline: 'Building connections together',
    // Removed: default_community_name and default_community_description
    hero_badge_text: 'New',
    hero_headline: 'Welcome to',
    hero_headline_highlight: 'Connexted Labs',
    hero_description: 'A community platform for collaboration and growth',
    cta_primary_text: 'Join Now',
    cta_secondary_text: 'Learn More',
    cta_tertiary_text: 'Contact Us',
    audience_1_title: 'Innovators',
    audience_1_description: 'Discover new ideas and connect with like-minded individuals',
    audience_2_title: 'Entrepreneurs',
    audience_2_description: 'Build and grow your business with the support of a community',
    audience_3_title: 'Professionals',
    audience_3_description: 'Stay up-to-date with industry trends and connect with experts',
    // ConvertKit Integration
    newsletter_form_id: '',
    newsletter_script_url: '',
    newsletter_button_text: 'Subscribe',
    newsletter_button_url: '',
    // Footer Links
    footer_about_url: 'https://example.com/about',
    footer_contact_url: 'https://example.com/contact',
    footer_privacy_url: 'https://example.com/privacy',
    footer_terms_url: 'https://example.com/terms',
    footer_email_link: 'mailto:support@example.com',
    footer_website_link: 'https://example.com',
    updated_at: '',
  });

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchSettings();
    }
  }, [profile]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Check if platform_settings table exists and what columns it has
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        // Check if demo account columns exist in the data
        const hasDemoColumns = 'enable_demo_account' in data && 
                               'demo_account_email' in data && 
                               'demo_account_password' in data;
        setDemoAccountColumnsExist(hasDemoColumns);

        // Ensure all string fields have default values (never null or undefined)
        setSettings({
          id: data.id || '',
          platform_name: data.platform_name || 'Community Platform',
          platform_tagline: data.platform_tagline || 'Building connections together',
          platform_description: data.platform_description || 'A community platform for collaboration and growth',
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
          primary_color: data.primary_color || '#6366f1',
          secondary_color: data.secondary_color || '#8b5cf6',
          support_email: data.support_email || 'support@example.com',
          app_base_url: data.app_base_url || 'https://example.com',
          enable_demo_account: hasDemoColumns ? (data.enable_demo_account || false) : false,
          demo_account_email: hasDemoColumns ? (data.demo_account_email || 'demo@example.com') : 'demo@example.com',
          demo_account_password: hasDemoColumns ? (data.demo_account_password || 'demo123') : 'demo123',
          enable_guest_browsing: data.enable_guest_browsing || false,
          company_name: data.company_name || 'Connexted Labs',
          product_name: data.product_name || 'Community Platform',
          company_tagline: data.company_tagline || 'Building connections together',
          // Removed: default_community_name and default_community_description
          hero_badge_text: data.hero_badge_text || 'New',
          hero_headline: data.hero_headline || 'Welcome to',
          hero_headline_highlight: data.hero_headline_highlight || 'Connexted Labs',
          hero_description: data.hero_description || 'A community platform for collaboration and growth',
          cta_primary_text: data.cta_primary_text || 'Join Now',
          cta_secondary_text: data.cta_secondary_text || 'Learn More',
          cta_tertiary_text: data.cta_tertiary_text || 'Contact Us',
          audience_1_title: data.audience_1_title || 'Innovators',
          audience_1_description: data.audience_1_description || 'Discover new ideas and connect with like-minded individuals',
          audience_2_title: data.audience_2_title || 'Entrepreneurs',
          audience_2_description: data.audience_2_description || 'Build and grow your business with the support of a community',
          audience_3_title: data.audience_3_title || 'Professionals',
          audience_3_description: data.audience_3_description || 'Stay up-to-date with industry trends and connect with experts',
          // ConvertKit Integration
          newsletter_form_id: data.newsletter_form_id || '',
          newsletter_script_url: data.newsletter_script_url || '',
          newsletter_button_text: data.newsletter_button_text || 'Subscribe',
          newsletter_button_url: data.newsletter_button_url || '',
          // Footer Links
          footer_about_url: data.footer_about_url || 'https://example.com/about',
          footer_contact_url: data.footer_contact_url || 'https://example.com/contact',
          footer_privacy_url: data.footer_privacy_url || 'https://example.com/privacy',
          footer_terms_url: data.footer_terms_url || 'https://example.com/terms',
          footer_email_link: data.footer_email_link || 'mailto:support@example.com',
          footer_website_link: data.footer_website_link || 'https://example.com',
          updated_at: data.updated_at || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching platform settings:', error);
      
      // If table doesn't exist, that's okay - we'll show default values
      if (error.code === '42P01') {
        toast.error('Platform settings table not found. Showing default values.');
      } else {
        toast.error('Failed to load platform settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Prepare the update object based on available columns
      const updateData: any = {
        platform_name: settings.platform_name,
        platform_tagline: settings.platform_tagline,
        platform_description: settings.platform_description,
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        support_email: settings.support_email,
        app_base_url: settings.app_base_url,
        updated_at: new Date().toISOString(),
      };

      // Only include demo account fields if columns exist
      if (demoAccountColumnsExist) {
        updateData.enable_demo_account = settings.enable_demo_account;
        updateData.demo_account_email = settings.demo_account_email;
        updateData.demo_account_password = settings.demo_account_password;
      }

      // Include additional fields
      updateData.enable_guest_browsing = settings.enable_guest_browsing;
      updateData.company_name = settings.company_name;
      updateData.product_name = settings.product_name;
      updateData.company_tagline = settings.company_tagline;
      // Removed: default_community_name and default_community_description
      updateData.hero_badge_text = settings.hero_badge_text;
      updateData.hero_headline = settings.hero_headline;
      updateData.hero_headline_highlight = settings.hero_headline_highlight;
      updateData.hero_description = settings.hero_description;
      updateData.cta_primary_text = settings.cta_primary_text;
      updateData.cta_secondary_text = settings.cta_secondary_text;
      updateData.cta_tertiary_text = settings.cta_tertiary_text;
      updateData.audience_1_title = settings.audience_1_title;
      updateData.audience_1_description = settings.audience_1_description;
      updateData.audience_2_title = settings.audience_2_title;
      updateData.audience_2_description = settings.audience_2_description;
      updateData.audience_3_title = settings.audience_3_title;
      updateData.audience_3_description = settings.audience_3_description;
      // ConvertKit Integration
      updateData.newsletter_form_id = settings.newsletter_form_id;
      updateData.newsletter_script_url = settings.newsletter_script_url;
      updateData.newsletter_button_text = settings.newsletter_button_text;
      updateData.newsletter_button_url = settings.newsletter_button_url;
      // Footer Links
      updateData.footer_about_url = settings.footer_about_url;
      updateData.footer_contact_url = settings.footer_contact_url;
      updateData.footer_privacy_url = settings.footer_privacy_url;
      updateData.footer_terms_url = settings.footer_terms_url;
      updateData.footer_email_link = settings.footer_email_link;
      updateData.footer_website_link = settings.footer_website_link;

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('platform_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('platform_settings')
          .insert([updateData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings({ ...settings, ...data });
        }
      }

      toast.success('Platform settings saved successfully!');
      
      // Refresh to check for new columns
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving platform settings:', error);
      
      if (error.code === '42P01') {
        toast.error('Platform settings table does not exist. Please create it in the database first.');
      } else if (error.code === 'PGRST204') {
        toast.error('Some columns are missing. Please run the latest database migrations.');
      } else {
        toast.error('Failed to save platform settings');
      }
    } finally {
      setSaving(false);
    }
  };

  // Access control - platform admin only
  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Access denied. Platform admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading platform settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Platform Settings' }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl">Platform Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure your community platform name, branding, and appearance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSettings} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Warning about database table */}
      {!settings.id && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> Platform settings are currently showing default values. 
                  To persist these settings, you need to create a <code className="bg-yellow-100 px-1 rounded">platform_settings</code> table 
                  in your Supabase database.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Branding Reference
          </CardTitle>
          <CardDescription>
            Platform branding values (hardcoded in code for reference only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hardcoded Branding - Read Only */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              🔒 Hardcoded Branding (Reference Only)
            </h4>
            <p className="text-xs text-gray-600 mb-4">
              These values are hardcoded in the application code and require code changes to update. 
              They are shown here for reference.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Company Name (Public Pages)</Label>
                <Input
                  value={settings.company_name}
                  disabled
                  className="bg-white border-gray-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used on login, marketing pages, and footer
                </p>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Product Name (App Header)</Label>
                <Input
                  value={settings.product_name}
                  disabled
                  className="bg-white border-gray-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in application header after login
                </p>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Company Tagline</Label>
                <Input
                  value={settings.company_tagline}
                  disabled
                  className="bg-white border-gray-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Displayed on login and public pages
                </p>
              </div>
            </div>
          </div>

          {/* Legacy Fields (kept for backward compatibility) */}
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Show legacy fields (deprecated)
            </summary>
            <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded">
              <div>
                <Label htmlFor="platform_name" className="text-xs">Platform Name (Legacy)</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  placeholder="My Community Platform"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="platform_tagline" className="text-xs">Platform Tagline (Legacy)</Label>
                <Input
                  id="platform_tagline"
                  value={settings.platform_tagline}
                  onChange={(e) => setSettings({ ...settings, platform_tagline: e.target.value })}
                  placeholder="Building connections together"
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="platform_description" className="text-xs">Platform Description (Legacy)</Label>
                <Textarea
                  id="platform_description"
                  value={settings.platform_description}
                  onChange={(e) => setSettings({ ...settings, platform_description: e.target.value })}
                  placeholder="Describe your community platform..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          </details>

          {/* Support & Configuration */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                placeholder="support@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact email for member support inquiries
              </p>
            </div>

            <div>
              <Label htmlFor="app_base_url">App Base URL</Label>
              <Input
                id="app_base_url"
                value={settings.app_base_url}
                onChange={(e) => setSettings({ ...settings, app_base_url: e.target.value })}
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                The base URL of your community platform (for shareable links)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding & Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Branding & Assets
          </CardTitle>
          <CardDescription>
            Upload your logo and favicon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended size: 200x60px (transparent PNG)
            </p>
          </div>

          <div>
            <Label htmlFor="favicon_url">Favicon URL</Label>
            <Input
              id="favicon_url"
              value={settings.favicon_url}
              onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
              placeholder="https://example.com/favicon.ico"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended size: 32x32px or 64x64px (.ico or .png)
            </p>
          </div>

          {settings.logo_url && (
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm font-medium mb-2">Logo Preview:</p>
              <img 
                src={settings.logo_url} 
                alt="Platform Logo" 
                className="max-h-16"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            Color Scheme
          </CardTitle>
          <CardDescription>
            Customize your platform's color palette
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  placeholder="#6366f1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for buttons, links, and highlights
              </p>
            </div>

            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  placeholder="#8b5cf6"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used for accents and secondary elements
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-medium mb-3">Color Preview:</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <div 
                  className="h-20 rounded border border-gray-300 flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Primary
                </div>
              </div>
              <div className="flex-1">
                <div 
                  className="h-20 rounded border border-gray-300 flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: settings.secondary_color }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Demo Account
          </CardTitle>
          <CardDescription>
            Enable and configure a demo account for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!demoAccountColumnsExist && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Demo Account Feature Not Available
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    To enable demo account configuration, you need to run the database migration.
                  </p>
                  <div className="bg-blue-100 p-3 rounded text-xs font-mono text-blue-900 overflow-x-auto">
                    <p className="font-semibold mb-2">Run this SQL in Supabase SQL Editor:</p>
                    <pre className="whitespace-pre-wrap">
{`-- Add demo account columns
ALTER TABLE platform_settings 
  ADD COLUMN IF NOT EXISTS enable_demo_account boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_account_email text DEFAULT 'demo@example.com',
  ADD COLUMN IF NOT EXISTS demo_account_password text DEFAULT 'demo123';`}
                    </pre>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    After running the migration, refresh this page to see the demo account settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {demoAccountColumnsExist && (
            <>
              <div>
                <Label htmlFor="enable_demo_account">Enable Demo Account</Label>
                <Switch
                  id="enable_demo_account"
                  checked={settings.enable_demo_account}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_demo_account: checked })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Allows users to access a demo account for testing purposes
                </p>
              </div>

              <div>
                <Label htmlFor="demo_account_email">Demo Account Email</Label>
                <Input
                  id="demo_account_email"
                  type="email"
                  value={settings.demo_account_email}
                  onChange={(e) => setSettings({ ...settings, demo_account_email: e.target.value })}
                  placeholder="demo@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email address for the demo account
                </p>
              </div>

              <div>
                <Label htmlFor="demo_account_password">Demo Account Password</Label>
                <Input
                  id="demo_account_password"
                  type="password"
                  value={settings.demo_account_password}
                  onChange={(e) => setSettings({ ...settings, demo_account_password: e.target.value })}
                  placeholder="demo123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password for the demo account
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Guest Browsing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Guest Browsing Options
          </CardTitle>
          <CardDescription>
            Control access for non-authenticated visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1 mr-4">
              <Label htmlFor="enable_guest_browsing" className="font-semibold">
                Enable Guest Browsing
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Show "Browse as Visitor" and "Browse as Guest" options on the login page. 
                When disabled, users must sign in to access any content.
              </p>
              <p className="text-xs text-amber-700 mt-2 font-medium">
                💡 Recommended: Keep disabled for invite-only or controlled access launches
              </p>
            </div>
            <Switch
              id="enable_guest_browsing"
              checked={settings.enable_guest_browsing}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_guest_browsing: checked })}
            />
          </div>

          {settings.enable_guest_browsing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-900 font-medium mb-2">
                ✓ Guest browsing enabled
              </p>
              <p className="text-xs text-emerald-800">
                Visitors will see two browse options on the login page:
              </p>
              <ul className="text-xs text-emerald-800 mt-2 ml-4 space-y-1">
                <li>• <strong>Browse as Visitor</strong> - View marketplace offerings only</li>
                <li>• <strong>Browse as Guest</strong> - Explore communities, programs, and public content</li>
              </ul>
            </div>
          )}

          {!settings.enable_guest_browsing && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-2">
                🔒 Guest browsing disabled
              </p>
              <p className="text-xs text-gray-600">
                Visitors must sign in or create an account to access any content. 
                The browse options will not appear on the login page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Landing Page Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Marketing Landing Page Content
          </CardTitle>
          <CardDescription>
            Customize hero section, CTAs, and target audiences on your marketing page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Section */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="text-sm font-semibold text-indigo-900 mb-3">
              🎯 Hero Section
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="hero_badge_text">Badge Text</Label>
                <Input
                  id="hero_badge_text"
                  value={settings.hero_badge_text}
                  onChange={(e) => setSettings({ ...settings, hero_badge_text: e.target.value })}
                  placeholder="The Next Phase of Connection"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Small badge above the main headline
                </p>
              </div>

              <div>
                <Label htmlFor="hero_headline">Hero Headline</Label>
                <Input
                  id="hero_headline"
                  value={settings.hero_headline}
                  onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
                  placeholder="Join Connexted"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Main headline (first part)
                </p>
              </div>

              <div>
                <Label htmlFor="hero_headline_highlight">Hero Headline Highlight</Label>
                <Input
                  id="hero_headline_highlight"
                  value={settings.hero_headline_highlight}
                  onChange={(e) => setSettings({ ...settings, hero_headline_highlight: e.target.value })}
                  placeholder="Where Innovators Thrive"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Second part of headline (displays with gradient)
                </p>
              </div>

              <div>
                <Label htmlFor="hero_description">Hero Description</Label>
                <Textarea
                  id="hero_description"
                  value={settings.hero_description}
                  onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                  placeholder="Connect with fellow innovators, entrepreneurs, job seekers, and professionals..."
                  rows={3}
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Descriptive paragraph below the headline
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-3">
              🔘 Call-to-Action Buttons
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cta_primary_text">Primary CTA Button</Label>
                <Input
                  id="cta_primary_text"
                  value={settings.cta_primary_text}
                  onChange={(e) => setSettings({ ...settings, cta_primary_text: e.target.value })}
                  placeholder="Join Connexted Free"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Main action button (links to registration)
                </p>
              </div>

              <div>
                <Label htmlFor="cta_secondary_text">Secondary CTA Button</Label>
                <Input
                  id="cta_secondary_text"
                  value={settings.cta_secondary_text}
                  onChange={(e) => setSettings({ ...settings, cta_secondary_text: e.target.value })}
                  placeholder="Browse Demos"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Second action button (links to demos page)
                </p>
              </div>

              <div>
                <Label htmlFor="cta_tertiary_text">Tertiary CTA Button</Label>
                <Input
                  id="cta_tertiary_text"
                  value={settings.cta_tertiary_text}
                  onChange={(e) => setSettings({ ...settings, cta_tertiary_text: e.target.value })}
                  placeholder="Explore as Guest"
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Third action button (links to explore page)
                </p>
              </div>
            </div>
          </div>

          {/* Target Audiences */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="text-sm font-semibold text-purple-900 mb-3">
              👥 Target Audiences
            </h4>
            <p className="text-xs text-purple-700 mb-4">
              Three audience segments displayed in the social proof section
            </p>
            
            <div className="space-y-4">
              {/* Audience 1 */}
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-2">Audience 1</p>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="audience_1_title" className="text-xs">Title</Label>
                    <Input
                      id="audience_1_title"
                      value={settings.audience_1_title}
                      onChange={(e) => setSettings({ ...settings, audience_1_title: e.target.value })}
                      placeholder="For Innovators"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience_1_description" className="text-xs">Description</Label>
                    <Textarea
                      id="audience_1_description"
                      value={settings.audience_1_description}
                      onChange={(e) => setSettings({ ...settings, audience_1_description: e.target.value })}
                      placeholder="Connect with fellow builders, find collaborators..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Audience 2 */}
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-2">Audience 2</p>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="audience_2_title" className="text-xs">Title</Label>
                    <Input
                      id="audience_2_title"
                      value={settings.audience_2_title}
                      onChange={(e) => setSettings({ ...settings, audience_2_title: e.target.value })}
                      placeholder="For Professionals"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience_2_description" className="text-xs">Description</Label>
                    <Textarea
                      id="audience_2_description"
                      value={settings.audience_2_description}
                      onChange={(e) => setSettings({ ...settings, audience_2_description: e.target.value })}
                      placeholder="Network with peers, find opportunities..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Audience 3 */}
              <div className="p-3 bg-white rounded border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 mb-2">Audience 3</p>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="audience_3_title" className="text-xs">Title</Label>
                    <Input
                      id="audience_3_title"
                      value={settings.audience_3_title}
                      onChange={(e) => setSettings({ ...settings, audience_3_title: e.target.value })}
                      placeholder="For Circle Leaders"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience_3_description" className="text-xs">Description</Label>
                    <Textarea
                      id="audience_3_description"
                      value={settings.audience_3_description}
                      onChange={(e) => setSettings({ ...settings, audience_3_description: e.target.value })}
                      placeholder="Host your community within Connexted..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> These settings allow you to customize your marketing message 
              for different launch modes (invite-only, soft launch, open) or A/B test different 
              value propositions without code changes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ConvertKit Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            ConvertKit Newsletter Integration
          </CardTitle>
          <CardDescription>
            Configure ConvertKit form for newsletter subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              📧 Newsletter Form Setup
            </p>
            <p className="text-xs text-amber-800">
              Configure your ConvertKit form for the "Stay in the Loop" newsletter section. 
              You can either embed a form directly or use a button that links to a subscription page.
            </p>
          </div>

          <div>
            <Label htmlFor="newsletter_form_id">ConvertKit Form ID (Optional)</Label>
            <Input
              id="newsletter_form_id"
              value={settings.newsletter_form_id}
              onChange={(e) => setSettings({ ...settings, newsletter_form_id: e.target.value })}
              placeholder="e.g., 03ed58c6b1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Form ID from ConvertKit. Leave empty to use a button instead of embedded form.
            </p>
          </div>

          <div>
            <Label htmlFor="newsletter_script_url">ConvertKit Script URL (Optional)</Label>
            <Input
              id="newsletter_script_url"
              value={settings.newsletter_script_url}
              onChange={(e) => setSettings({ ...settings, newsletter_script_url: e.target.value })}
              placeholder="https://aigent-john.kit.com/03ed58c6b1/index.js"
            />
            <p className="text-xs text-gray-500 mt-1">
              Full script URL from ConvertKit. Only needed if using embedded form.
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-3">— OR —</p>
            <p className="text-xs text-gray-600 mb-3">
              Use a button instead of embedded form (recommended for better performance)
            </p>
            
            <div>
              <Label htmlFor="newsletter_button_url">Newsletter Button URL</Label>
              <Input
                id="newsletter_button_url"
                value={settings.newsletter_button_url}
                onChange={(e) => setSettings({ ...settings, newsletter_button_url: e.target.value })}
                placeholder="https://your-newsletter-page.com/subscribe"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to your ConvertKit hosted landing page or subscription page
              </p>
            </div>

            <div className="mt-3">
              <Label htmlFor="newsletter_button_text">Newsletter Button Text</Label>
              <Input
                id="newsletter_button_text"
                value={settings.newsletter_button_text}
                onChange={(e) => setSettings({ ...settings, newsletter_button_text: e.target.value })}
                placeholder="Subscribe to Newsletter"
              />
              <p className="text-xs text-gray-500 mt-1">
                Text shown on the subscription button
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded mt-4">
            <p className="text-xs text-blue-800">
              💡 <strong>Priority:</strong> If both form ID and button URL are provided, 
              the embedded form will be used. For better performance and user experience, 
              we recommend using the button URL option.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Footer Links
          </CardTitle>
          <CardDescription>
            Configure footer navigation and social links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              📄 Resource Links
            </h4>
            <p className="text-xs text-gray-600">
              Configure links for About, Contact, Privacy, and Terms pages.
              Use full URLs (https://...) or relative paths (/about, /contact, etc.)
            </p>
          </div>

          <div>
            <Label htmlFor="footer_about_url">About Page URL</Label>
            <Input
              id="footer_about_url"
              value={settings.footer_about_url}
              onChange={(e) => setSettings({ ...settings, footer_about_url: e.target.value })}
              placeholder="https://example.com/about or /about"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your About Us page
            </p>
          </div>

          <div>
            <Label htmlFor="footer_contact_url">Contact Page URL</Label>
            <Input
              id="footer_contact_url"
              value={settings.footer_contact_url}
              onChange={(e) => setSettings({ ...settings, footer_contact_url: e.target.value })}
              placeholder="https://example.com/contact or /contact"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your Contact page or form
            </p>
          </div>

          <div>
            <Label htmlFor="footer_privacy_url">Privacy Policy URL</Label>
            <Input
              id="footer_privacy_url"
              value={settings.footer_privacy_url}
              onChange={(e) => setSettings({ ...settings, footer_privacy_url: e.target.value })}
              placeholder="https://example.com/privacy or /privacy"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your Privacy Policy
            </p>
          </div>

          <div>
            <Label htmlFor="footer_terms_url">Terms of Service URL</Label>
            <Input
              id="footer_terms_url"
              value={settings.footer_terms_url}
              onChange={(e) => setSettings({ ...settings, footer_terms_url: e.target.value })}
              placeholder="https://example.com/terms or /terms"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to your Terms of Service
            </p>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              🔗 Social & Contact Links
            </h4>
            
            <div>
              <Label htmlFor="footer_email_link">Email Link</Label>
              <Input
                id="footer_email_link"
                value={settings.footer_email_link}
                onChange={(e) => setSettings({ ...settings, footer_email_link: e.target.value })}
                placeholder="mailto:hello@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address (use mailto: format)
              </p>
            </div>

            <div className="mt-3">
              <Label htmlFor="footer_website_link">Website Link</Label>
              <Input
                id="footer_website_link"
                value={settings.footer_website_link}
                onChange={(e) => setSettings({ ...settings, footer_website_link: e.target.value })}
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your main website or company homepage
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded mt-4">
            <p className="text-xs text-amber-800">
              ⚠️ <strong>Important:</strong> Make sure all URLs are valid and accessible. 
              Links starting with '#' will be treated as anchor links on the current page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button onClick={fetchSettings} variant="outline" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}