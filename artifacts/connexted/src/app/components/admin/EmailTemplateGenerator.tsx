// Split candidate: ~418 lines — consider extracting TemplateVariablePanel, EmailPreviewPane, and TemplateCopyButton into sub-components.
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Mail, FileText, Sparkles } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface EmailTemplateGeneratorProps {
  programName?: string;
  cohortName?: string;
  cohortStartDate?: string;
  recipientCount?: number;
}

const TEMPLATES = {
  approved: {
    subject: 'Congratulations! You\'ve been accepted to {program_name}',
    body: `Hi {applicant_name},

Congratulations! We're thrilled to inform you that you've been accepted to {program_name}.

{cohort_info}

Next Steps:
1. Reply to this email to confirm your attendance by {deadline}
2. Complete the onboarding form: {onboarding_link}
3. Join our community: {community_link}
4. Mark your calendar for our kickoff on {start_date}

What to Expect:
- Access to exclusive resources and mentorship
- Connection with {cohort_size} fellow participants
- Weekly sessions and workshops
- Ongoing support throughout the program

We're excited to have you join us! If you have any questions, don't hesitate to reach out.

Best regards,
{sender_name}
{program_name} Team

---
{program_name}
{contact_email} | {website}`
  },
  
  rejected: {
    subject: 'Update on your application to {program_name}',
    body: `Hi {applicant_name},

Thank you for taking the time to apply to {program_name}. We truly appreciate your interest in our program.

After careful consideration of all applications, we regret to inform you that we're unable to offer you a spot in the current cohort. We received an overwhelming number of strong applications, and unfortunately, we have limited spaces available.

This decision was very difficult, as we saw many qualified candidates. We encourage you to:
- Apply again in the future (our next cohort opens {next_cohort_date})
- Stay connected with our community
- Check out our free resources: {resources_link}

We wish you all the best in your endeavors and hope our paths cross again in the future.

Best regards,
{sender_name}
{program_name} Team

---
{program_name}
{contact_email} | {website}`
  },
  
  waitlisted: {
    subject: 'Your application to {program_name} - Waitlist Update',
    body: `Hi {applicant_name},

Thank you for your application to {program_name}. While we were very impressed with your application, all available spots in our {cohort_name} have been filled.

We'd like to place you on our waitlist. Here's what this means:

✓ You're in our priority group if spots become available
✓ We typically know about openings within 2-3 weeks
✓ Your application remains valid for this cohort
✓ You'll be contacted immediately if a spot opens

Your Position: We don't rank our waitlist, but you're among {waitlist_count} qualified candidates.

What You Can Do:
1. Confirm your continued interest by replying to this email
2. Keep your schedule flexible for {start_date}
3. We'll update you by {deadline}

Alternative Options:
- Pre-register for our next cohort ({next_cohort_date})
- Join our free community: {community_link}
- Access our preparation resources: {resources_link}

Thank you for your patience and continued interest in {program_name}.

Best regards,
{sender_name}
{program_name} Team

---
{program_name}
{contact_email} | {website}`
  },
  
  interview: {
    subject: 'Next Step: Interview for {program_name}',
    body: `Hi {applicant_name},

Thank you for your application to {program_name}. We were impressed with your application and would like to invite you to the next stage of our selection process: an interview.

Interview Details:
Duration: 30-45 minutes
Format: Video call via {platform}
Timeline: Please book a time within the next {interview_window}

Schedule Your Interview:
{booking_link}

What to Prepare:
- Review your application
- Think about your goals and how {program_name} fits
- Prepare questions for us
- Test your video setup beforehand

What to Expect:
- We'll discuss your background and interests
- Learn more about the program structure
- Answer any questions you have
- Typical questions include: {sample_questions}

If none of the available times work for you, please reply to this email and we'll find an alternative.

Looking forward to speaking with you!

Best regards,
{sender_name}
{program_name} Team

---
{program_name}
{contact_email} | {website}`
  },
  
  reminder: {
    subject: 'Reminder: Confirm your spot in {program_name}',
    body: `Hi {applicant_name},

This is a friendly reminder that you've been accepted to {program_name}, and we're waiting for your confirmation!

Your acceptance expires on {deadline} - that's {days_left} days away.

To secure your spot:
1. Reply to our acceptance email
2. Complete the confirmation form: {confirmation_link}
3. Submit any required documents

{cohort_info}

We have a waitlist of qualified candidates, so if you're no longer interested, please let us know so we can offer your spot to someone else.

Need more time or have questions? Just reply to this email.

Best regards,
{sender_name}
{program_name} Team

---
{program_name}
{contact_email} | {website}`
  },
  
  welcome: {
    subject: 'Welcome to {program_name}! Here\'s what happens next',
    body: `Hi {applicant_name},

Welcome to {program_name}! 🎉

Now that you've confirmed your spot in {cohort_name}, here's everything you need to know:

📅 Important Dates:
- Kickoff: {start_date}
- Orientation: {orientation_date}
- Program ends: {end_date}

✅ Action Items (Complete by {deadline}):
1. Join our Slack/Discord: {community_link}
2. Complete onboarding form: {onboarding_link}
3. Review the program handbook: {handbook_link}
4. Submit required documents: {documents_link}
5. Set up your profile: {profile_link}

👥 Meet Your Cohort:
You're joining {cohort_size} talented individuals from {locations}. We'll share the full cohort directory before kickoff.

📚 Pre-Program Resources:
- Reading list: {reading_link}
- Video playlist: {video_link}
- Community guidelines: {guidelines_link}

📞 Upcoming Events:
- {event_1}
- {event_2}
- {event_3}

💬 Questions?
Reply to this email or reach out in {community_channel}. We're here to help!

We're excited to have you with us!

Best regards,
{sender_name} and the entire {program_name} team

---
{program_name}
{contact_email} | {website}`
  }
};

export function EmailTemplateGenerator({
  programName = '{program_name}',
  cohortName = '{cohort_name}',
  cohortStartDate = '{start_date}',
  recipientCount = 0
}: EmailTemplateGeneratorProps) {
  const [templateType, setTemplateType] = useState<keyof typeof TEMPLATES>('approved');
  const [customTemplate, setCustomTemplate] = useState('');
  const [showMergeFields, setShowMergeFields] = useState(false);

  const getCurrentTemplate = () => {
    return customTemplate || fillPlaceholders(TEMPLATES[templateType].body);
  };

  const fillPlaceholders = (template: string) => {
    return template
      .replace(/{program_name}/g, programName)
      .replace(/{cohort_name}/g, cohortName)
      .replace(/{start_date}/g, cohortStartDate);
  };

  const handleCopyTemplate = () => {
    const template = getCurrentTemplate();
    copyToClipboard(template);
    toast.success('Template copied to clipboard');
  };

  const handleCopySubject = () => {
    const subject = fillPlaceholders(TEMPLATES[templateType].subject);
    copyToClipboard(subject);
    toast.success('Subject line copied');
  };

  const handleLoadTemplate = (type: keyof typeof TEMPLATES) => {
    setTemplateType(type);
    setCustomTemplate(fillPlaceholders(TEMPLATES[type].body));
  };

  const mergeFields = [
    { field: '{applicant_name}', description: 'Applicant\'s full name' },
    { field: '{program_name}', description: 'Name of the program' },
    { field: '{cohort_name}', description: 'Name of the cohort' },
    { field: '{start_date}', description: 'Cohort start date' },
    { field: '{end_date}', description: 'Cohort end date' },
    { field: '{cohort_size}', description: 'Number of participants' },
    { field: '{deadline}', description: 'Response/action deadline' },
    { field: '{sender_name}', description: 'Your name' },
    { field: '{contact_email}', description: 'Contact email address' },
    { field: '{website}', description: 'Program website' },
    { field: '{community_link}', description: 'Link to community/Slack' },
    { field: '{onboarding_link}', description: 'Onboarding form link' },
    { field: '{booking_link}', description: 'Interview booking link' },
    { field: '{resources_link}', description: 'Resources/materials link' }
  ];

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Email Template Generator
          </CardTitle>
          <CardDescription>
            Generate professional email templates with automatic merge fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Template Type</label>
            <Select value={templateType} onValueChange={(value: any) => handleLoadTemplate(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">✅ Approval - Welcome to the program</SelectItem>
                <SelectItem value="rejected">❌ Rejection - Thoughtful and kind</SelectItem>
                <SelectItem value="waitlisted">⏳ Waitlist - Keep them engaged</SelectItem>
                <SelectItem value="interview">💬 Interview Invitation</SelectItem>
                <SelectItem value="reminder">⏰ Confirmation Reminder</SelectItem>
                <SelectItem value="welcome">🎉 Welcome Package - Post-confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>This template will be sent to <strong>{recipientCount} recipients</strong></span>
            </div>
          )}

          {/* Subject Line */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subject Line</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fillPlaceholders(TEMPLATES[templateType].subject)}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md bg-gray-50"
              />
              <Button size="sm" variant="outline" onClick={handleCopySubject}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Template Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Email Body</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMergeFields(!showMergeFields)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {showMergeFields ? 'Hide' : 'Show'} Merge Fields
              </Button>
            </div>
            <Textarea
              value={getCurrentTemplate()}
              onChange={(e) => setCustomTemplate(e.target.value)}
              rows={18}
              className="font-mono text-sm"
              placeholder="Edit the template or use the default..."
            />
          </div>

          {/* Merge Fields Reference */}
          {showMergeFields && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">Available Merge Fields</CardTitle>
                <CardDescription className="text-xs">
                  Click to copy. Replace these in your email client before sending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mergeFields.map(({ field, description }) => (
                    <button
                      key={field}
                      onClick={() => {
                        copyToClipboard(field);
                        toast.success(`Copied ${field}`);
                      }}
                      className="text-left p-2 rounded hover:bg-blue-100 transition-colors"
                    >
                      <code className="text-xs bg-blue-200 px-1 py-0.5 rounded">{field}</code>
                      <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleCopyTemplate} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copy Full Template
            </Button>
            <Button variant="outline" onClick={() => setCustomTemplate(fillPlaceholders(TEMPLATES[templateType].body))}>
              Reset
            </Button>
          </div>

          {/* Usage Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-2">
            <div className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              How to use this template:
            </div>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Click "Copy Full Template" above</li>
              <li>Open your email client (Gmail, Outlook, etc.)</li>
              <li>Paste the template into a new email</li>
              <li>Replace all {`{merge_fields}`} with actual values</li>
              <li>Add your BCC list of recipient emails</li>
              <li>Review and send</li>
              <li>Return to platform and mark applications as "notified"</li>
            </ol>
            <div className="text-xs mt-3 pt-3 border-t border-amber-300">
              <strong>Pro tip:</strong> Use mail merge tools like Gmail's "Mail Merge" extension or Outlook's mail merge feature to automatically replace merge fields for each recipient.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}