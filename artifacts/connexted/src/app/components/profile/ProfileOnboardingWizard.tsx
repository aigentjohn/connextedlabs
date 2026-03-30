import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  User,
  Briefcase,
  Heart,
  Link2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfileOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onComplete: () => void;
}

const CAREER_STAGES = [
  { value: 'student', label: 'Student' },
  { value: 'early-career', label: 'Early Career (0-3 years)' },
  { value: 'mid-career', label: 'Mid Career (3-10 years)' },
  { value: 'senior', label: 'Senior (10+ years)' },
  { value: 'executive', label: 'Executive/Leadership' },
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'consultant', label: 'Consultant/Freelancer' },
  { value: 'transition', label: 'Career Transition' },
];

const COMMON_ROLES = [
  'Founder', 'Co-Founder', 'Product Manager', 'Engineer', 'Designer',
  'Marketer', 'Sales Professional', 'Investor', 'Advisor', 'Mentor',
  'Job Seeker', 'Student'
];

const COMMON_INTERESTS = [
  'Artificial Intelligence', 'Product Management', 'Entrepreneurship',
  'Web Development', 'Mobile Apps', 'Data Science', 'UX/UI Design',
  'Marketing', 'Sales', 'Leadership', 'Innovation', 'Blockchain',
  'Sustainability', 'Social Impact', 'FinTech', 'HealthTech', 'EdTech'
];

export function ProfileOnboardingWizard({ isOpen, onClose, profile, onComplete }: ProfileOnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [careerStage, setCareerStage] = useState(profile?.career_stage || '');

  // Step 2: Professional Identity
  const [professionalRoles, setProfessionalRoles] = useState<string[]>(profile?.professional_roles || []);
  const [customRole, setCustomRole] = useState('');
  const [headline, setHeadline] = useState(profile?.headline || '');

  // Step 3: Interests & Social
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [customInterest, setCustomInterest] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.social_links?.linkedin || '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.social_links?.website || '');

  const totalSteps = 3;
  const progressPercent = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (step === 1 && !bio.trim()) {
      toast.error('Please add a short bio');
      return;
    }
    if (step === 2 && professionalRoles.length === 0) {
      toast.error('Please select at least one professional role');
      return;
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const toggleRole = (role: string) => {
    if (professionalRoles.includes(role)) {
      setProfessionalRoles(professionalRoles.filter(r => r !== role));
    } else {
      setProfessionalRoles([...professionalRoles, role]);
    }
  };

  const addCustomRole = () => {
    if (customRole.trim() && !professionalRoles.includes(customRole.trim())) {
      setProfessionalRoles([...professionalRoles, customRole.trim()]);
      setCustomRole('');
    }
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      // Update profile with all collected data
      const updates: any = {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim() || null,
        career_stage: careerStage || null,
        professional_roles: professionalRoles,
        interests: interests,
        headline: headline.trim() || null,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      // Update social links
      const socialLinks = {
        ...(profile?.social_links || {}),
        linkedin: linkedinUrl.trim() || null,
        website: websiteUrl.trim() || null,
      };
      updates.social_links = socialLinks;

      // Enable social sharing if they added links
      if (linkedinUrl || websiteUrl) {
        updates.privacy_settings = {
          ...(profile?.privacy_settings || {}),
          share_social_links: true,
          show_linkedin: !!linkedinUrl,
          show_website: !!websiteUrl,
        };
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile setup complete! 🎉');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Welcome to CONNEXTED! Let's set up your profile
          </DialogTitle>
          <DialogDescription>
            Complete these 3 quick steps to help others understand who you are and what you do
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Step {step} of {totalSteps}</span>
            <span className="font-medium text-indigo-600">{Math.round(progressPercent)}% complete</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <p className="text-sm text-gray-600">Tell us about yourself</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A brief introduction about yourself, your background, and what you're passionate about..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {bio.length}/500 characters
                </p>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="mb-3 block">Career Stage</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CAREER_STAGES.map((stage) => (
                    <button
                      key={stage.value}
                      onClick={() => setCareerStage(stage.value)}
                      className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                        careerStage === stage.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Professional Identity */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Professional Identity</h3>
                <p className="text-sm text-gray-600">How do you identify professionally?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Serial Entrepreneur | AI Enthusiast | 3x Founder"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A concise tagline that appears on your profile
                </p>
              </div>

              <div>
                <Label className="mb-3 block">
                  Professional Roles * <span className="text-sm text-gray-500 font-normal">(select all that apply)</span>
                </Label>
                
                {/* Selected Roles */}
                {professionalRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                    {professionalRoles.map((role, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                      >
                        {role}
                        <button
                          onClick={() => setProfessionalRoles(professionalRoles.filter((_, i) => i !== index))}
                          className="ml-2 text-indigo-600 hover:text-indigo-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick Select Roles */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {COMMON_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      disabled={professionalRoles.includes(role)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        professionalRoles.includes(role)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                {/* Custom Role Input */}
                <div className="flex gap-2">
                  <Input
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomRole()}
                    placeholder="Or add a custom role..."
                    className="flex-1"
                  />
                  <Button onClick={addCustomRole} variant="outline" disabled={!customRole.trim()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interests & Social */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Interests & Connect</h3>
                <p className="text-sm text-gray-600">What are you passionate about?</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Interests */}
              <div>
                <Label className="mb-3 block">
                  Areas of Interest <span className="text-sm text-gray-500 font-normal">(select a few)</span>
                </Label>
                
                {/* Selected Interests */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                    {interests.map((interest, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-3 py-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200"
                      >
                        {interest}
                        <button
                          onClick={() => setInterests(interests.filter((_, i) => i !== index))}
                          className="ml-2 text-purple-600 hover:text-purple-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick Select Interests */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {COMMON_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      disabled={interests.includes(interest)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        interests.includes(interest)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>

                {/* Custom Interest Input */}
                <div className="flex gap-2">
                  <Input
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                    placeholder="Or add a custom interest..."
                    className="flex-1"
                  />
                  <Button onClick={addCustomInterest} variant="outline" disabled={!customInterest.trim()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-gray-600" />
                  <Label className="text-base">Connect Your Socials (Optional)</Label>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-sm">Personal Website</Label>
                    <Input
                      id="website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="mt-1"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    You can add more social links later from your profile settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step > 1 && (
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving}>
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
