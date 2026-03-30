// Split candidate: ~402 lines — consider extracting EmailTemplateEditor, EmailPreviewPane, and VariableTokenList into sub-components.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId } from '@/utils/supabase/info';
import { Mail, Copy, Eye, CheckCircle, Sparkles } from 'lucide-react';

interface ClaimableProfile {
  id: string;
  email: string;
  full_name: string;
  default_tier: string;
  default_circles: string[];
  metadata: any;
  claim_status: string;
}

interface EmailTemplateProps {
  profileId?: string;
  onClose?: () => void;
}

export default function ClaimableProfileEmailTemplate({ profileId, onClose }: EmailTemplateProps) {
  const [profile, setProfile] = useState<ClaimableProfile | null>(null);
  const [circles, setCircles] = useState<any[]>([]);
  const [magicLink, setMagicLink] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('claimable_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      setProfile(data);

      // Fetch circle details
      if (data.default_circles && data.default_circles.length > 0) {
        const { data: circlesData } = await supabase
          .from('circles')
          .select('id, name, description')
          .in('id', data.default_circles);

        setCircles(circlesData || []);
      }

      // Generate the email
      generateEmail(data, circlesData || []);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmail = (profileData: ClaimableProfile, circlesList: any[]) => {
    const firstName = profileData.full_name.split(' ')[0];
    const tierName = profileData.default_tier.charAt(0).toUpperCase() + profileData.default_tier.slice(1);

    // Generate subject
    const subject = `You're invited to CONNEXTED LABS - ${tierName} Access`;
    setEmailSubject(subject);

    // Generate body
    const circlesSection = circlesList.length > 0
      ? `\n\n**Your Circles:**\n${circlesList.map(c => `• ${c.name} - ${c.description || 'Exclusive group access'}`).join('\n')}`
      : '';

    const tierFeatures = getTierFeatures(profileData.default_tier);
    const featuresSection = tierFeatures.length > 0
      ? `\n\n**Your ${tierName} Membership Includes:**\n${tierFeatures.map(f => `✓ ${f}`).join('\n')}`
      : '';

    const cohortInfo = profileData.metadata?.cohort
      ? `\n\nYou're part of the **${profileData.metadata.cohort}** cohort.`
      : '';

    const body = `Hi ${firstName},

Welcome to CONNEXTED LABS! 🎉

${profileData.metadata?.notes || "We've created a pre-configured profile for you with access to our community."}${cohortInfo}
${circlesSection}
${featuresSection}

**Getting Started:**

1. Click the button below to view your profile (no password needed!)
2. Browse the community and see what you have access to
3. When you're ready, claim your profile to unlock full access

[View Your Profile] → {{MAGIC_LINK_BUTTON}}

**What happens next?**
• You can explore the platform and view content before claiming
• Once you claim your profile, you'll have full access to post, comment, and connect
• You can add a password later for faster login (optional)

Questions? Reply to this email and we'll help you get started.

Welcome aboard!
The CONNEXTED LABS Team

---
This invitation expires in 30 days. Claim your profile to keep access.`;

    setEmailBody(body);
  };

  const getTierFeatures = (tier: string): string[] => {
    const features: Record<string, string[]> = {
      free: [
        'Access to Open circles',
        'View community content',
        'Connect with members',
        'Basic profile',
      ],
      member: [
        'Access to all member circles',
        'Post and comment freely',
        'Direct messaging',
        'Full profile customization',
        'Event access',
      ],
      premium: [
        'All Member features',
        'Priority access to new circles',
        'Exclusive premium content',
        'Advanced analytics',
        'VIP event access',
        'Premium support',
      ],
    };

    return features[tier] || [];
  };

  const generateMagicLink = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/claimable-profiles/request-magic-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: profile.email }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMagicLink(data.debug.magicLinkUrl);
        toast.success('Magic link generated!');
      } else {
        toast.error(data.error || 'Failed to generate magic link');
      }
    } catch (err: any) {
      console.error('Error generating magic link:', err);
      toast.error('Failed to generate magic link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const copyEmailTemplate = () => {
    const fullEmail = `Subject: ${emailSubject}\n\n${emailBody.replace('{{MAGIC_LINK_BUTTON}}', magicLink || '[Generate magic link first]')}`;
    copyToClipboard(fullEmail, 'Email template');
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No profile selected</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invitation Email for {profile.full_name}</CardTitle>
              <CardDescription>
                {profile.email} • {profile.default_tier} tier
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {profile.default_tier}
            </Badge>
            {circles.map((circle) => (
              <Badge key={circle.id} className="bg-indigo-100 text-indigo-700">
                {circle.name}
              </Badge>
            ))}
            {profile.metadata?.cohort && (
              <Badge className="bg-purple-100 text-purple-700">
                {profile.metadata.cohort}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Magic Link Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Step 1: Generate Magic Link
          </CardTitle>
          <CardDescription>
            Create a unique login link for this user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generateMagicLink} disabled={isLoading || !!magicLink}>
            {magicLink ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Magic Link Generated
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Magic Link
              </>
            )}
          </Button>

          {magicLink && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 truncate">
                  <p className="text-xs text-green-700 font-semibold mb-1">Magic Link (30 min expiry):</p>
                  <code className="text-xs text-green-900 break-all">{magicLink}</code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(magicLink, 'Magic link')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Step 2: Email Template
          </CardTitle>
          <CardDescription>
            Personalized invitation with their circles and tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subject Line</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Email Body</Label>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={18}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              ℹ️ Replace <code>{'{{MAGIC_LINK_BUTTON}}'}</code> with the magic link when sending
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowPreview(!showPreview)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button onClick={copyEmailTemplate} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Email
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="mb-4 pb-4 border-b">
                <div className="text-sm text-gray-600 mb-1">To: {profile.email}</div>
                <div className="text-lg font-semibold">{emailSubject}</div>
              </div>
              <div className="prose prose-sm max-w-none">
                {emailBody.split('\n').map((line, idx) => {
                  if (line.includes('{{MAGIC_LINK_BUTTON}}')) {
                    return (
                      <div key={idx} className="my-4">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                          View Your Profile →
                        </Button>
                      </div>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={idx} className="font-bold text-gray-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>;
                  }
                  if (line.startsWith('•') || line.startsWith('✓')) {
                    return <li key={idx} className="ml-4">{line.substring(2)}</li>;
                  }
                  if (line.trim() === '---') {
                    return <hr key={idx} className="my-4" />;
                  }
                  if (line.trim() === '') {
                    return <br key={idx} />;
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="border-blue-200 bg-blue-50/50">
        <Mail className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-gray-700">
          <strong>Next Steps:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Generate the magic link above</li>
            <li>Copy the email template</li>
            <li>Paste into your email client (Gmail, Outlook, ConvertKit, etc.)</li>
            <li>Replace <code>{'{{MAGIC_LINK_BUTTON}}'}</code> with the actual magic link</li>
            <li>Send to {profile.email}</li>
          </ol>
          <p className="mt-3 text-xs text-gray-600">
            💡 Tip: For bulk sending, use ConvertKit broadcasts and insert the magic link as a merge tag
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}