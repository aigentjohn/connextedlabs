import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ApplicationFormProps {
  containerType: 'program' | 'circle';
  containerId: string;
  containerName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ApplicationFormData {
  why_join: string;
  goals: string;
  referral_source: string;
  additional_info: string;
}

export default function ApplicationForm({
  containerType,
  containerId,
  containerName,
  onSuccess,
  onCancel,
}: ApplicationFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    why_join: '',
    goals: '',
    referral_source: '',
    additional_info: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast.error('You must be logged in to apply');
      navigate(`/login?redirect=${window.location.pathname}`);
      return;
    }

    if (!formData.why_join.trim() || !formData.goals.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // ─── Programs: use program_applications (the admin-reviewed table) ──────
      if (containerType === 'program') {
        // Duplicate check against program_applications
        const { data: existingApp, error: checkError } = await supabase
          .from('program_applications')
          .select('id, status')
          .eq('program_id', containerId)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingApp) {
          if (existingApp.status === 'pending' || existingApp.status === 'under_review') {
            toast.error('You already have a pending application');
            setSubmitted(true);
            return;
          } else if (existingApp.status === 'approved') {
            toast.error('You are already approved for this program');
            setSubmitted(true);
            return;
          } else if (existingApp.status === 'waitlisted') {
            toast.error("You're already on the waitlist for this program");
            setSubmitted(true);
            return;
          }
          // Rejected or withdrawn — allow re-application by updating the row
          const { error: updateError } = await supabase
            .from('program_applications')
            .update({
              status: 'pending',
              answers: {
                why_join: formData.why_join,
                goals: formData.goals,
                referral_source: formData.referral_source,
                additional_info: formData.additional_info,
              },
              review_notes: null,
              rejection_reason: null,
              reviewed_by: null,
              reviewed_at: null,
              created_at: new Date().toISOString(),
            })
            .eq('id', existingApp.id);

          if (updateError) throw updateError;
        } else {
          // New application
          const { error: insertError } = await supabase
            .from('program_applications')
            .insert({
              program_id: containerId,
              user_id: profile.id,
              name: profile.name || profile.email || 'Applicant',
              email: profile.email || '',
              answers: {
                why_join: formData.why_join,
                goals: formData.goals,
                referral_source: formData.referral_source,
                additional_info: formData.additional_info,
              },
              status: 'pending',
            });

          if (insertError) throw insertError;
        }
      } else {
        // ─── Circles (and other containers): keep container_memberships path ─
        const { data: existingMembership, error: checkError } = await supabase
          .from('container_memberships')
          .select('id, status')
          .eq('user_id', profile.id)
          .eq('container_type', containerType)
          .eq('container_id', containerId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingMembership) {
          if (existingMembership.status === 'pending') {
            toast.error('You already have a pending application');
            setSubmitted(true);
            return;
          } else if (existingMembership.status === 'active') {
            toast.error('You are already a member');
            setSubmitted(true);
            return;
          } else {
            const { error: updateError } = await supabase
              .from('container_memberships')
              .update({
                status: 'pending',
                applied_at: new Date().toISOString(),
                application_text: `Why join: ${formData.why_join}\n\nGoals: ${formData.goals}\n\nAdditional info: ${formData.additional_info}`,
                application_data: formData,
                referral_source: formData.referral_source || null,
              })
              .eq('id', existingMembership.id);

            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('container_memberships')
            .insert({
              user_id: profile.id,
              container_type: containerType,
              container_id: containerId,
              status: 'pending',
              applied_at: new Date().toISOString(),
              application_text: `Why join: ${formData.why_join}\n\nGoals: ${formData.goals}\n\nAdditional info: ${formData.additional_info}`,
              application_data: formData,
              referral_source: formData.referral_source || null,
            });

          if (insertError) throw insertError;
        }
      }

      // Track landing page conversion
      await supabase
        .from('landing_page_visits')
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
          conversion_type: 'application',
        })
        .eq('container_type', containerType)
        .eq('container_id', containerId)
        .eq('visitor_id', profile.id)
        .is('converted', false);

      // Notify admins
      let adminIds: string[] = [];
      
      if (containerType === 'program') {
        const { data: programData } = await supabase
          .from('programs')
          .select('admin_ids')
          .eq('id', containerId)
          .single();
        if (programData) adminIds = programData.admin_ids || [];
      } else if (containerType === 'circle') {
        const { data: circleData } = await supabase
          .from('circles')
          .select('admin_ids')
          .eq('id', containerId)
          .single();
        if (circleData) adminIds = circleData.admin_ids || [];
      }

      if (adminIds.length > 0) {
        const notifications = adminIds.map(adminId => ({
          user_id: adminId,
          type: 'application_received',
          title: 'New Application',
          message: `${profile.name || profile.email} has applied to join ${containerName}`,
          link: `/${containerType}s/${containerId}/settings`,
          created_by: profile.id,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast.success('Application submitted successfully!');
      setSubmitted(true);

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Application Submitted!</h2>
            <p className="text-muted-foreground mb-2">
              Thank you for applying to join <strong>{containerName}</strong>.
            </p>
            <p className="text-muted-foreground mb-8">
              An admin will review your application and get back to you soon.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Apply to Join</CardTitle>
          <CardDescription>
            Complete this application to request access to {containerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Why Join */}
            <div className="space-y-2">
              <Label htmlFor="why_join">
                Why do you want to join? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="why_join"
                placeholder="Tell us why you're interested in joining..."
                value={formData.why_join}
                onChange={(e) => setFormData({ ...formData, why_join: e.target.value })}
                rows={4}
                required
                disabled={submitting}
              />
              <p className="text-sm text-muted-foreground">
                Help us understand your motivation for joining
              </p>
            </div>

            {/* Goals */}
            <div className="space-y-2">
              <Label htmlFor="goals">
                What do you hope to achieve? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goals"
                placeholder="Share your goals and what you hope to gain..."
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                rows={4}
                required
                disabled={submitting}
              />
              <p className="text-sm text-muted-foreground">
                Tell us about your objectives and expectations
              </p>
            </div>

            {/* Referral Source */}
            <div className="space-y-2">
              <Label htmlFor="referral_source">
                How did you hear about us?
              </Label>
              <Select
                value={formData.referral_source}
                onValueChange={(value) => setFormData({ ...formData, referral_source: value })}
                disabled={submitting}
              >
                <SelectTrigger id="referral_source">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="friend-referral">Friend/Referral</SelectItem>
                  <SelectItem value="search">Search Engine</SelectItem>
                  <SelectItem value="event">Event or Conference</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <Label htmlFor="additional_info">
                Anything else you'd like us to know?
              </Label>
              <Textarea
                id="additional_info"
                placeholder="Share any additional information (optional)..."
                value={formData.additional_info}
                onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* User Info Display */}
            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Your Information</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong>Name:</strong> {profile?.name || 'Not provided'}
                </p>
                <p>
                  <strong>Email:</strong> {profile?.email}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Make sure your profile is up to date before applying
              </p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}