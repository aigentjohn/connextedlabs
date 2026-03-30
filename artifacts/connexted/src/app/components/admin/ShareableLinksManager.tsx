// Split candidate: ~450 lines — consider extracting ShareableLinkRow, CreateLinkDialog, and LinkAnalyticsPanel into sub-components.
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Copy, ExternalLink, Eye, RefreshCw, Link2, Box, Circle, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard-utils';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Program {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface CircleInfo {
  id: string;
  name: string;
  access_type: string;
}

export default function ShareableLinksManager() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appBaseUrl, setAppBaseUrl] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [circles, setCircles] = useState<CircleInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch app base URL from platform settings
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('app_base_url')
        .single();

      // Use platform setting if available, otherwise use current origin
      const baseUrl = settingsData?.app_base_url?.trim() || window.location.origin;
      setAppBaseUrl(baseUrl);

      // Fetch all programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, name, slug, status')
        .order('name');

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch all circles
      const { data: circlesData, error: circlesError } = await supabase
        .from('circles')
        .select('id, name, access_type')
        .order('name');

      if (circlesError) throw circlesError;
      setCircles(circlesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  // Filter programs and circles based on search
  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCircles = circles.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Access control - platform admin only
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Access denied. Platform admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading shareable links...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Shareable Links' }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl">Shareable Links</h1>
          </div>
          <p className="text-gray-600">
            Copy and share public landing page links for your programs and circles
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* App Base URL Display */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Current App Base URL
              </p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-blue-100 px-2 py-1 rounded flex-1">
                  {appBaseUrl || 'Not configured'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/platform-admin/settings', '_blank')}
                >
                  Configure
                </Button>
              </div>
              {!appBaseUrl && (
                <p className="text-xs text-blue-700 mt-2">
                  Please set your app base URL in Platform Settings to generate accurate links
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search programs and circles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            Programs ({filteredPrograms.length})
          </CardTitle>
          <CardDescription>
            Public landing pages for programs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPrograms.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {searchQuery ? 'No programs match your search' : 'No programs found'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPrograms.map((program) => {
                const landingUrl = `${appBaseUrl}/programs/${program.slug}/landing`;
                const applicationUrl = `${appBaseUrl}/programs/${program.slug}/apply`;
                
                return (
                  <div 
                    key={program.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{program.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            /{program.slug}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            program.status === 'active' 
                              ? 'bg-green-100 text-green-700'
                              : program.status === 'not-started'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {program.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Landing Page Link */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Public Landing Page
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`program-landing-${program.id}`}
                            value={landingUrl}
                            readOnly
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              const input = document.getElementById(`program-landing-${program.id}`) as HTMLInputElement;
                              copyToClipboard(landingUrl, 'Landing page link', input);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLink(landingUrl)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Application Link */}
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Application Form (requires login)
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`program-application-${program.id}`}
                            value={applicationUrl}
                            readOnly
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              const input = document.getElementById(`program-application-${program.id}`) as HTMLInputElement;
                              copyToClipboard(applicationUrl, 'Application link', input);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLink(applicationUrl)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Circles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5 text-indigo-600" />
            Circles ({filteredCircles.length})
          </CardTitle>
          <CardDescription>
            Public landing pages for circles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCircles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {searchQuery ? 'No circles match your search' : 'No circles found'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCircles.map((circle) => {
                const landingUrl = `${appBaseUrl}/circles/${circle.id}/landing`;
                const requestUrl = `${appBaseUrl}/circles/${circle.id}/request`;
                
                return (
                  <div 
                    key={circle.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{circle.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            circle.access_type === 'open' 
                              ? 'bg-green-100 text-green-700'
                              : circle.access_type === 'request'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {circle.access_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Landing Page Link */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          Public Landing Page
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`circle-landing-${circle.id}`}
                            value={landingUrl}
                            readOnly
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`circle-landing-${circle.id}`) as HTMLInputElement;
                              copyToClipboard(landingUrl, 'Landing page link', input);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLink(landingUrl)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Request Access Link (for request/invite circles) */}
                      {circle.access_type !== 'open' && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            Request Access Form (requires login)
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`circle-request-${circle.id}`}
                              value={requestUrl}
                              readOnly
                              className="text-sm font-mono"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(`circle-request-${circle.id}`) as HTMLInputElement;
                                copyToClipboard(requestUrl, 'Request access link', input);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLink(requestUrl)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How to use shareable links</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Landing pages</strong> are public and don't require login - perfect for newsletters, social media, and marketing campaigns
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Application forms</strong> require users to login first, then they can submit their application
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              Make sure to set your <strong>App Base URL</strong> in Platform Settings to generate correct links
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}