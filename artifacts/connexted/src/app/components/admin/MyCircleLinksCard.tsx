import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Copy, ExternalLink, RefreshCw, AlertCircle, Link2, Circle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface CircleInfo {
  id: string;
  name: string;
  access_type: string;
}

export default function MyCircleLinksCard() {
  const [loading, setLoading] = useState(true);
  const [appBaseUrl, setAppBaseUrl] = useState('');
  const [circles, setCircles] = useState<CircleInfo[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  
  const landingInputRef = useRef<HTMLInputElement>(null);
  const requestInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch all circles
      const { data: circlesData, error: circlesError } = await supabase
        .from('circles')
        .select('id, name, access_type')
        .order('name');

      if (circlesError) throw circlesError;
      setCircles(circlesData || []);

      // Auto-select first circle if available
      if (circlesData && circlesData.length > 0) {
        setSelectedCircleId(circlesData[0].id);
      }

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Loading circles...</p>
        </CardContent>
      </Card>
    );
  }

  if (circles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5 text-indigo-600" />
            My Circle Links
          </CardTitle>
          <CardDescription>
            Get shareable links for your circles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Circle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No circles found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedCircle = circles.find(c => c.id === selectedCircleId);
  const landingUrl = selectedCircle ? `${appBaseUrl}/circles/${selectedCircle.id}/landing` : '';
  const requestUrl = selectedCircle ? `${appBaseUrl}/circles/${selectedCircle.id}/request` : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-600" />
          My Circle Links
        </CardTitle>
        <CardDescription>
          Get shareable links for your circles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base URL Info */}
        {!appBaseUrl && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                App Base URL not configured. Using current domain. 
                <a href="/platform-admin/settings" className="underline ml-1">Configure in Settings</a>
              </p>
            </div>
          </div>
        )}

        {/* Circle Selector */}
        <div>
          <Label htmlFor="circle-select">Select Circle</Label>
          <Select value={selectedCircleId} onValueChange={setSelectedCircleId}>
            <SelectTrigger id="circle-select">
              <SelectValue placeholder="Choose a circle..." />
            </SelectTrigger>
            <SelectContent>
              {circles.map((circle) => (
                <SelectItem key={circle.id} value={circle.id}>
                  <div className="flex items-center gap-2">
                    <Circle className="w-4 h-4" />
                    <span>{circle.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      circle.access_type === 'open' 
                        ? 'bg-green-100 text-green-700'
                        : circle.access_type === 'request'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {circle.access_type}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCircle && (
            <p className="text-xs text-gray-500 mt-1">
              Access type: <strong>{selectedCircle.access_type}</strong>
            </p>
          )}
        </div>

        {selectedCircle && (
          <>
            {/* Landing Page Link */}
            <div>
              <Label htmlFor="landing-url" className="text-xs font-medium text-gray-600">
                Public Landing Page
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="landing-url"
                  value={landingUrl}
                  readOnly
                  className="text-sm font-mono"
                  ref={landingInputRef}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(landingUrl, 'Landing page link', landingInputRef.current)}
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
            {selectedCircle.access_type !== 'open' && (
              <div>
                <Label htmlFor="request-url" className="text-xs font-medium text-gray-600">
                  Request Access Form (requires login)
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="request-url"
                    value={requestUrl}
                    readOnly
                    className="text-sm font-mono"
                    ref={requestInputRef}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(requestUrl, 'Request access link', requestInputRef.current)}
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

            {/* Help Text */}
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <p>
                  Landing pages are public and can be shared in newsletters, social media, or marketing campaigns
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}