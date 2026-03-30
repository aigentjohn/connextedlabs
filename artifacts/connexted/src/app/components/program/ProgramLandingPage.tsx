// Split candidate: ~813 lines — consider extracting ProgramHeroSection, ProgramCurriculumAccordion, ProgramEnrollBlock, and ProgramTestimonialsSection into sub-components.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Separator } from '@/app/components/ui/separator';
import { PROGRAM_TEMPLATES } from '@/data/program-templates';
import { useIsProgramMember, useJoinProgram, useProgramMembers } from '@/hooks/useProgramMembership';
import { 
  CheckCircle, 
  Globe, 
  Lock, 
  Clock, 
  Users, 
  Calendar, 
  UserPlus,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  Target,
  Award,
  BookOpen,
  Play,
  ChevronRight,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { formatParticipantCount } from '@/utils/terminology';
import RedeemCodeDialog from '@/app/components/shared/RedeemCodeDialog';
import { WaitlistBlock } from '@/app/components/shared/WaitlistBlock';
import { templateApi, type TicketTemplate } from '@/services/ticketSystemService';

interface ProgramInstance {
  id: string;
  name: string;
  description: string;
  slug: string;
  template_id: string;
  cover_image: string | null;
  status: 'not-started' | 'in-progress' | 'completed';
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  pricing_type?: 'free' | 'paid' | 'members-only';
  enrollment_status?: 'open' | 'closed' | 'invite-only';
  created_at: string;
  member_ids: string[];
  admin_ids: string[];
  created_by: string;
  capacity_limit?: number;
  enrollment_opens_at?: string;
  enrollment_closes_at?: string;
  start_date?: string;
  end_date?: string;
  program_overview?: string;
  learning_outcomes?: string[];
  prerequisites?: string[];
  application_requirements?: string[];
  application_deadline?: string;
  pricing_amount?: number;
  refund_policy?: string;
  contact_email?: string;
}

interface ProgramJourney {
  id: string;
  program_id: string;
  title: string;
  description: string;
  order_index: number;
  status: 'not-started' | 'in-progress' | 'completed';
  start_date: string | null;
  finish_date: string | null;
  created_at: string;
}

interface ProgramSession {
  id: string;
  program_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: string;
  session_type?: string;
}

interface ProgramOrganizer {
  id: string;
  full_name: string;
  avatar: string | null;
  bio: string | null;
  title: string | null;
  email: string | null;
}

export default function ProgramLandingPage({ program }: { program: ProgramInstance }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isMember, membership } = useIsProgramMember(program.id);
  const { joinProgram, isLoading: isJoining } = useJoinProgram();
  const { members } = useProgramMembers(program.id);

  const [journeys, setJourneys] = useState<ProgramJourney[]>([]);
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [organizers, setOrganizers] = useState<ProgramOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedTemplate, setLinkedTemplate] = useState<TicketTemplate | null>(null);

  const template = PROGRAM_TEMPLATES.find(t => t.id === program.template_id);

  useEffect(() => {
    fetchProgramDetails();
  }, [program.id]);

  const fetchProgramDetails = async () => {
    try {
      setLoading(true);

      // Fetch journeys
      const { data: journeysData, error: journeysError } = await supabase
        .from('program_journeys')
        .select('*')
        .eq('program_id', program.id)
        .order('order_index', { ascending: true });

      if (journeysError) throw journeysError;
      setJourneys(journeysData || []);

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('program_id', program.id)
        .order('start_date', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch organizers (admins and creator)
      const organizerIds = [...new Set([program.created_by, ...program.admin_ids])];
      const { data: organizersData, error: organizersError } = await supabase
        .from('users')
        .select('id, full_name, avatar, bio, title, email')
        .in('id', organizerIds);

      if (organizersError) throw organizersError;
      setOrganizers(organizersData || []);

      // Fetch linked ticket template (public — works for logged-out visitors)
      try {
        const { templates: tmplList } = await templateApi.forContainer('program', program.id);
        setLinkedTemplate(tmplList?.[0] ?? null);
      } catch (tmplErr) {
        console.warn('Could not load linked ticket template:', tmplErr);
      }

    } catch (error) {
      console.error('Error fetching program details:', error);
      toast.error('Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProgram = async () => {
    const result = await joinProgram(program.id);
    if (result.success) {
      toast.success('Successfully joined program!');
      // Redirect to dashboard
      navigate(`/programs/${program.slug}/dashboard`);
    } else if (result.error) {
      toast.error(result.error.message || 'Failed to join program');
    }
  };

  const handleApply = () => {
    navigate(`/programs/${program.slug}/apply`);
  };

  // Enrollment Badge Logic
  const getEnrollmentBadge = () => {
    if (isMember) {
      return (
        <Badge className="bg-green-500 text-white text-base px-4 py-2">
          <CheckCircle className="w-4 h-4 mr-2" />
          You're Enrolled
        </Badge>
      );
    }

    const enrollmentStatus = program.enrollment_status || 'open';
    
    if (enrollmentStatus === 'open') {
      return (
        <Badge className="bg-green-500 text-white text-base px-4 py-2">
          <Globe className="w-4 h-4 mr-2" />
          Enrollment Open
        </Badge>
      );
    }
    
    if (enrollmentStatus === 'invite-only') {
      return (
        <Badge className="bg-yellow-500 text-white text-base px-4 py-2">
          <Lock className="w-4 h-4 mr-2" />
          Invite Only
        </Badge>
      );
    }
    
    if (enrollmentStatus === 'closed') {
      return (
        <Badge className="bg-red-500 text-white text-base px-4 py-2">
          <Lock className="w-4 h-4 mr-2" />
          Enrollment Closed
        </Badge>
      );
    }
  };

  // Status Badge
  const getStatusBadge = () => {
    if (program.status === 'in-progress') {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-700 text-sm px-3 py-1">
          <Play className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    if (program.status === 'completed') {
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-600 text-sm px-3 py-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-indigo-500 text-indigo-700 text-sm px-3 py-1">
        <Calendar className="w-3 h-3 mr-1" />
        Upcoming
      </Badge>
    );
  };

  // Pricing Badge
  const getPricingBadge = () => {
    if (program.pricing_type === 'paid') {
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-700 text-sm px-3 py-1">
          <DollarSign className="w-3 h-3 mr-1" />
          {program.pricing_amount ? `$${program.pricing_amount}` : 'Paid'}
        </Badge>
      );
    }
    if (program.pricing_type === 'members-only') {
      return (
        <Badge variant="outline" className="border-indigo-500 text-indigo-700 text-sm px-3 py-1">
          <Users className="w-3 h-3 mr-1" />
          Members Only
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-green-500 text-green-700 text-sm px-3 py-1">
        <CheckCircle className="w-3 h-3 mr-1" />
        Free
      </Badge>
    );
  };

  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // CTA Button
  const renderCTA = () => {
    if (isMember) {
      return (
        <Button size="lg" onClick={() => navigate(`/programs/${program.slug}/dashboard`)}>
          Go to Program Dashboard
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      );
    }

    const enrollmentStatus = program.enrollment_status || 'open';

    if (enrollmentStatus === 'open') {
      // Check if application is required
      if (program.application_requirements && program.application_requirements.length > 0) {
        return (
          <Button size="lg" onClick={handleApply}>
            <FileText className="w-5 h-5 mr-2" />
            Apply Now
          </Button>
        );
      } else {
        return (
          <Button size="lg" onClick={handleJoinProgram} disabled={isJoining}>
            <UserPlus className="w-5 h-5 mr-2" />
            {isJoining ? 'Joining...' : 'Join Program'}
          </Button>
        );
      }
    }

    if (enrollmentStatus === 'invite-only') {
      return (
        <Button size="lg" variant="outline" onClick={handleApply}>
          <Mail className="w-5 h-5 mr-2" />
          Request Invitation
        </Button>
      );
    }

    if (enrollmentStatus === 'closed') {
      return (
        <Button size="lg" variant="outline" disabled>
          <Lock className="w-5 h-5 mr-2" />
          Enrollment Closed
        </Button>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div 
        className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white"
        style={{
          backgroundImage: program.cover_image ? `url(${program.cover_image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay for readability if cover image exists */}
        {program.cover_image && (
          <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        )}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/20 mb-6"
            onClick={() => navigate('/programs/discover')}
          >
            ← Back to Programs
          </Button>

          <div className="flex items-start gap-6">
            {/* Program Icon */}
            {template && (
              <div className={`w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-5xl flex-shrink-0 border-2 border-white/20`}>
                {template.icon}
              </div>
            )}

            <div className="flex-1">
              {/* Enrollment & Status Badges */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {getEnrollmentBadge()}
                {getStatusBadge()}
                {getPricingBadge()}
              </div>

              {/* Program Name */}
              <h1 className="text-5xl font-bold mb-4">{program.name}</h1>

              {/* Description */}
              <p className="text-xl text-white/90 mb-6 max-w-3xl">
                {program.description}
              </p>

              {/* Key Stats */}
              <div className="flex items-center gap-6 mb-8 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="text-lg">{members.length} {members.length === 1 ? 'Member' : 'Members'}</span>
                  {program.capacity_limit && (
                    <span className="text-white/70">/ {program.capacity_limit} max</span>
                  )}
                </div>

                {journeys.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">{journeys.length} {journeys.length === 1 ? 'Journey' : 'Journeys'}</span>
                  </div>
                )}

                {template?.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-lg">{template.duration}</span>
                  </div>
                )}

                {program.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg">Starts {formatDate(program.start_date)}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="flex items-center gap-4">
                {renderCTA()}
                {isMember && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => navigate(`/programs/${program.slug}/about`)}
                  >
                    View Program Info
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Info className="w-6 h-6 text-indigo-600" />
                  Program Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {program.program_overview || program.description}
                </p>
              </CardContent>
            </Card>

            {/* Learning Outcomes */}
            {program.learning_outcomes && program.learning_outcomes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Target className="w-6 h-6 text-indigo-600" />
                    What You'll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {program.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Curriculum/Journeys Section */}
            {journeys.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    Program Curriculum
                  </CardTitle>
                  <CardDescription>
                    {journeys.length} learning {journeys.length === 1 ? 'journey' : 'journeys'} designed to guide your progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {journeys.map((journey, index) => (
                      <div key={journey.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{journey.title}</h4>
                          <p className="text-sm text-gray-600">{journey.description}</p>
                          {(journey.start_date || journey.finish_date) && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {journey.start_date && (
                                <span>Starts: {formatDate(journey.start_date)}</span>
                              )}
                              {journey.finish_date && (
                                <span>Ends: {formatDate(journey.finish_date)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {journey.status === 'completed' && 'Completed'}
                          {journey.status === 'in-progress' && 'In Progress'}
                          {journey.status === 'not-started' && 'Upcoming'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prerequisites */}
            {program.prerequisites && program.prerequisites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {program.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <ChevronRight className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Application Requirements */}
            {program.application_requirements && program.application_requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    Application Requirements
                  </CardTitle>
                  <CardDescription>
                    Please prepare the following for your application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {program.application_requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                  {program.application_deadline && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Application Deadline:</strong> {formatDate(program.application_deadline)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Facilitators/Organizers */}
            {organizers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Award className="w-6 h-6 text-indigo-600" />
                    Program Leaders
                  </CardTitle>
                  <CardDescription>
                    Meet the team leading this program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {organizers.map((organizer) => (
                      <div key={organizer.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={organizer.avatar || undefined} />
                          <AvatarFallback>{organizer.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{organizer.full_name}</h4>
                          {organizer.title && (
                            <p className="text-sm text-indigo-600 mb-2">{organizer.title}</p>
                          )}
                          {organizer.bio && (
                            <p className="text-sm text-gray-600">{organizer.bio}</p>
                          )}
                          {organizer.email && (
                            <a 
                              href={`mailto:${organizer.email}`}
                              className="text-sm text-indigo-600 hover:underline mt-2 inline-block"
                            >
                              <Mail className="w-3 h-3 inline mr-1" />
                              Contact
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-xl">Ready to Join?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Info */}
                <div className="space-y-3">
                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price</span>
                    <div>
                      {program.pricing_type === 'paid' && program.pricing_amount ? (
                        <span className="text-lg font-bold text-gray-900">${program.pricing_amount}</span>
                      ) : program.pricing_type === 'members-only' ? (
                        <Badge variant="outline" className="border-indigo-500 text-indigo-700">
                          Members Only
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white">Free</Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Duration */}
                  {template?.duration && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Duration</span>
                        <span className="text-sm font-medium text-gray-900">{template.duration}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Start Date */}
                  {program.start_date && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Start Date</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(program.start_date)}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Enrollment Deadline */}
                  {program.enrollment_closes_at && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Enrollment Closes</span>
                        <span className="text-sm font-medium text-red-600">{formatDate(program.enrollment_closes_at)}</span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Capacity */}
                  {program.capacity_limit && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Available Spots</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.max(0, program.capacity_limit - members.length)} / {program.capacity_limit}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Members */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Members</span>
                    <span className="text-sm font-medium text-gray-900">{members.length}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  {renderCTA()}
                </div>

                {/* Have a code? */}
                {!isMember && profile && (
                  <div className="text-center mt-3">
                    <RedeemCodeDialog
                      containerType="program"
                      containerId={program.id}
                      userId={profile.id}
                      onRedeemed={() => {
                        toast.success('You now have access!');
                        setTimeout(() => navigate(`/programs/${program.slug}/dashboard`), 1500);
                      }}
                    />
                  </div>
                )}

                {/* Contact Info */}
                {program.contact_email && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-600 mb-2">Questions?</p>
                    <a 
                      href={`mailto:${program.contact_email}`}
                      className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-4 h-4" />
                      {program.contact_email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket waitlist — shown when enrollment is closed/invite-only
                and a ticket template is linked to this program */}
            {linkedTemplate && !isMember && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Access &amp; Waitlist
                </p>
                <WaitlistBlock
                  template={linkedTemplate}
                  profile={profile}
                  displayName={program.name}
                />
              </div>
            )}

            {/* Upcoming Sessions Preview */}
            {sessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="text-sm">
                        <p className="font-medium text-gray-900">{session.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(session.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        {session.location && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.location}
                          </p>
                        )}
                      </div>
                    ))}
                    {sessions.length > 3 && (
                      <p className="text-xs text-gray-500 pt-2 border-t">
                        +{sessions.length - 3} more sessions
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Policy */}
            {program.refund_policy && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Refund Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">{program.refund_policy}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}