import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Lock, Users, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function InviteOnlyPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Store waitlist request in database
      const { error } = await supabase
        .from('waitlist_requests')
        .insert({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          role: formData.role,
          reason: formData.reason,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Request submitted! We\'ll be in touch soon.');
    } catch (error) {
      console.error('Error submitting waitlist request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Join Our Community' },
          ]}
        />

        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-600 text-white px-4 py-2">
            <Lock className="w-4 h-4 mr-2" />
            Invite-Only Beta
          </Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            CONNEXTED LABS
          </h1>
          <p className="text-2xl text-gray-700 font-semibold mb-2">
            THE Community for Innovators & Professionals
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're in private beta, carefully building a quality community. Request an invite to join.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Left: Request Invite Form */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-2xl">Request an Invite</CardTitle>
              <CardDescription>
                Tell us about yourself and why you'd like to join
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Company/Organization</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Your Role</Label>
                    <Input
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      placeholder="Entrepreneur, Developer, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Why do you want to join? *</Label>
                    <Textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      placeholder="Tell us about your interests and what you hope to gain from the community..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Request Invite'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Request Submitted!</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you for your interest. We'll review your request and be in touch soon.
                  </p>
                  <p className="text-sm text-gray-500">
                    Check your email at <strong>{formData.email}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Info & Alternate Access */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  Already Invited?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  If you've received a profile claim link or direct invitation, you can access your account now.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/claim-profile">
                      Claim Your Profile
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/login">
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  What to Expect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      <strong>Quality Community</strong> - We're carefully curating members to ensure valuable connections
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      <strong>Early Access</strong> - Be among the first to experience our platform
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      <strong>Shape the Platform</strong> - Your feedback will directly influence our development
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      <strong>Beta Pricing</strong> - Early members get special pricing considerations
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What We're Building</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  CONNEXTED LABS is THE community for innovators, entrepreneurs, job seekers, and professionals. 
                  We provide structured programs, collaborative circles, and powerful tools to help you grow.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• <strong>Programs</strong> - Structured learning journeys</div>
                  <div>• <strong>Circles</strong> - Small groups</div>
                  <div>• <strong>Containers</strong> - Collaboration spaces</div>
                  <div>• <strong>Markets</strong> - Discover opportunities</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">
            Public launch coming soon. Want to learn more? <Link to="/" className="text-blue-600 hover:underline font-semibold">Visit our homepage</Link>
          </p>
        </div>
      </div>
    </div>
  );
}