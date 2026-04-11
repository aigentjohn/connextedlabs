/**
 * MemberMatchesPage
 *
 * Demonstrates the affinity matching concept for ConnextedLabs.
 * Shows how profile data from My Basics, My Professional, and My Engagement
 * maps to match signals used to surface relevant members.
 *
 * Currently uses representative mock matches alongside real profile signals.
 * Full scoring requires sufficient member population (25–50+ per community).
 */

import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Users, UserCheck, Sparkles, Briefcase, Heart, Target,
  GraduationCap, Star, Award, Info, TrendingUp, ChevronRight,
  Handshake, Lightbulb, Building2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchReason {
  label: string;
  source: 'basics' | 'professional' | 'engagement';
}

interface MockMember {
  id: string;
  name: string;
  avatar: string | null;
  tagline: string;
  job_title: string;
  company: string;
  years_experience: number;
  career_stage: string;
  interests: string[];
  skills: string[];
  credentials: string[];
  affiliations: string[];
  looking_for: string[];
  score: number;
  matchReasons: MatchReason[];
}

// ─── Mock member data — representative of industrial professional verticals ──

const MOCK_MEMBERS: MockMember[] = [
  {
    id: 'm1',
    name: 'Sarah Chen',
    avatar: null,
    tagline: 'Senior Leader | Program Management | Community Builder',
    job_title: 'Senior Program Manager',
    company: 'Meridian Group',
    years_experience: 14,
    career_stage: 'senior-leader',
    interests: ['Leadership Development', 'AI & Technology', 'Community Building'],
    skills: ['Program Management', 'Risk Management', 'Change Management'],
    credentials: ['PMP', 'Lean Six Sigma'],
    affiliations: ['PMI', 'Local Industry Association'],
    looking_for: ['peer-support', 'collaboration'],
    score: 92,
    matchReasons: [
      { label: 'Both: Senior Leader career stage', source: 'basics' },
      { label: 'Shared credential: PMP', source: 'professional' },
      { label: 'Shared affiliation: PMI', source: 'professional' },
      { label: 'Shared interest: Leadership Development', source: 'engagement' },
      { label: 'Both looking for: Peer Support', source: 'engagement' },
    ],
  },
  {
    id: 'm2',
    name: 'Marcus Webb',
    avatar: null,
    tagline: 'Principal Consultant | Advisor | Mentor',
    job_title: 'Principal Consultant',
    company: 'Webb Advisory',
    years_experience: 18,
    career_stage: 'coach-consultant',
    interests: ['Organizational Development', 'Leadership Development', 'Business Strategy'],
    skills: ['Executive Coaching', 'Facilitation', 'Program Development'],
    credentials: ['PMP', 'ICF Certified Coach'],
    affiliations: ['ICF', 'PMI'],
    looking_for: ['mentorship', 'peer-support'],
    score: 84,
    matchReasons: [
      { label: 'Both: Consultant / Advisor stage', source: 'basics' },
      { label: 'Shared credential: PMP', source: 'professional' },
      { label: 'Shared affiliation: PMI', source: 'professional' },
      { label: 'Shared interest: Leadership Development', source: 'engagement' },
      { label: 'Complementary: Offers mentorship', source: 'engagement' },
    ],
  },
  {
    id: 'm3',
    name: 'Janet Rodriguez',
    avatar: null,
    tagline: 'Strategy Consultant | Digital Transformation | Facilitator',
    job_title: 'Strategy & Innovation Consultant',
    company: 'Independent',
    years_experience: 12,
    career_stage: 'coach-consultant',
    interests: ['Digital Transformation', 'AI & Technology', 'Innovation & Design Thinking'],
    skills: ['Strategic Planning', 'Workshop Facilitation', 'Business Development'],
    credentials: ['MBA', 'PMP'],
    affiliations: ['Local Startup Ecosystem', 'Industry Roundtable'],
    looking_for: ['collaboration', 'visibility'],
    score: 81,
    matchReasons: [
      { label: 'Both: Coach / Consultant stage', source: 'basics' },
      { label: 'Shared credential: PMP', source: 'professional' },
      { label: 'Shared interest: AI & Technology', source: 'engagement' },
      { label: 'Both: Consultant role identity', source: 'engagement' },
      { label: 'Both looking for: Collaboration', source: 'engagement' },
    ],
  },
  {
    id: 'm4',
    name: 'David Park',
    avatar: null,
    tagline: 'Program Director | Operations | 20+ Years Experience',
    job_title: 'Program Director',
    company: 'Harmon Industries',
    years_experience: 22,
    career_stage: 'senior-leader',
    interests: ['Operations Management', 'PMO Leadership', 'Team Building'],
    skills: ['Program Governance', 'Stakeholder Engagement', 'Earned Value Management'],
    credentials: ['PMP', 'PgMP'],
    affiliations: ['PMI', 'Industry Council'],
    looking_for: ['peer-support', 'skill-building'],
    score: 78,
    matchReasons: [
      { label: 'Both: Senior Leader career stage', source: 'basics' },
      { label: 'Shared credential: PMP', source: 'professional' },
      { label: 'Aligned: Program Manager role identity', source: 'engagement' },
      { label: 'Both looking for: Peer Support', source: 'engagement' },
    ],
  },
  {
    id: 'm5',
    name: 'Priya Nair',
    avatar: null,
    tagline: 'Director | Digital Innovation | Leadership Coach',
    job_title: 'Director of Innovation',
    company: 'Vertex Solutions',
    years_experience: 16,
    career_stage: 'senior-leader',
    interests: ['Digital Transformation', 'AI & Technology', 'Leadership Development', 'DEI & Belonging'],
    skills: ['Team Leadership', 'Innovation Programs', 'Executive Communication'],
    credentials: ['MBA', 'Certified Coach'],
    affiliations: ['Women in Leadership Network', 'Industry Association'],
    looking_for: ['collaboration', 'mentorship'],
    score: 76,
    matchReasons: [
      { label: 'Shared interest: AI & Technology', source: 'engagement' },
      { label: 'Shared interest: Leadership Development', source: 'engagement' },
      { label: 'Both: Senior Leader career stage', source: 'basics' },
      { label: 'Complementary: Offers mentorship', source: 'engagement' },
    ],
  },
  {
    id: 'm6',
    name: 'Tom Gallagher',
    avatar: null,
    tagline: 'Established Professional | Project Manager | Seeking Growth',
    job_title: 'Project Manager',
    company: 'Clearfield Partners',
    years_experience: 5,
    career_stage: 'established',
    interests: ['Career Development', 'AI & Technology', 'Leadership Development'],
    skills: ['Project Coordination', 'Stakeholder Communication', 'Agile'],
    credentials: ['CAPM'],
    affiliations: ['PMI', 'Young Professionals Network'],
    looking_for: ['mentorship', 'skill-building'],
    score: 68,
    matchReasons: [
      { label: 'Shared affiliation: PMI', source: 'professional' },
      { label: 'Shared interest: Leadership Development', source: 'engagement' },
      { label: 'Seeking mentorship you could offer', source: 'engagement' },
    ],
  },
];

// ─── Signal source config ─────────────────────────────────────────────────────

const SOURCE_CONFIG = {
  basics: {
    label: 'My Basics',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
    href: '/my-basics',
  },
  professional: {
    label: 'My Professional',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-400',
    href: '/my-professional',
  },
  engagement: {
    label: 'My Engagement',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-400',
    href: '/my-engagement',
  },
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  'peer-support': 'Peer Support',
  'mentorship': 'Mentorship',
  'skill-building': 'Skill Building',
  'accountability': 'Accountability',
  'visibility': 'Clients & Visibility',
  'collaboration': 'Collaboration',
};

// ─── Score bar component ──────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 85 ? 'bg-emerald-500' :
    score >= 70 ? 'bg-blue-500' :
    'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{score}%</span>
    </div>
  );
}

// ─── Match reason chip ────────────────────────────────────────────────────────

function ReasonChip({ reason }: { reason: MatchReason }) {
  const config = SOURCE_CONFIG[reason.source];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
      {reason.label}
    </span>
  );
}

// ─── Signal summary pill ──────────────────────────────────────────────────────

function SignalPill({ icon: Icon, label, value, source }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  source: 'basics' | 'professional' | 'engagement';
}) {
  const config = SOURCE_CONFIG[source];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${config.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemberMatchesPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  // Derive real signals from the logged-in user's profile
  const careerStageLabel = {
    'student': 'Student / Early Explorer',
    'emerging': 'Emerging Professional',
    'established': 'Established Professional',
    'senior-leader': 'Senior Leader',
    'founder': 'Founder / Solopreneur',
    'coach-consultant': 'Coach / Consultant',
    'career-changer': 'Career Changer',
    'retired-advisor': 'Retired / Advisor',
  }[profile.career_stage || ''] || profile.career_stage || 'Not set';

  const interests: string[] = profile.interests || [];
  const roles: string[] = profile.professional_roles || [];
  const lookingFor: string[] = profile.looking_for || [];

  const activeSignalCount =
    (profile.career_stage ? 1 : 0) +
    (profile.job_title ? 1 : 0) +
    interests.length +
    roles.length +
    lookingFor.length;

  const profileStrength =
    activeSignalCount === 0 ? 'none' :
    activeSignalCount < 4 ? 'low' :
    activeSignalCount < 8 ? 'medium' : 'strong';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Members', href: '/members' }, { label: 'Member Matches' }]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          Member Matches
        </h1>
        <p className="text-gray-500 mt-1">
          Members who align with your professional identity, interests, and goals
        </p>
      </div>

      {/* How matching works */}
      <Card className="border-indigo-100 bg-indigo-50/40">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900 mb-1">How affinity matching works</p>
              <p className="text-sm text-indigo-700 mb-3">
                Your profile across three sections contributes signals that are scored against other members.
                The richer your profile, the more precise your matches. Matching improves significantly with 25–50+ members in your community.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                  <Link key={key} to={cfg.href} className="flex items-center gap-1.5 hover:underline">
                    <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                    <span className={`font-medium ${key === 'basics' ? 'text-slate-600' : key === 'professional' ? 'text-blue-600' : 'text-purple-600'}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your active match signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500" />
            Your Active Match Signals
            <Badge
              variant="secondary"
              className={
                profileStrength === 'strong' ? 'bg-emerald-100 text-emerald-700' :
                profileStrength === 'medium' ? 'bg-blue-100 text-blue-700' :
                profileStrength === 'low' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }
            >
              {profileStrength === 'strong' ? 'Strong profile' :
               profileStrength === 'medium' ? 'Good profile' :
               profileStrength === 'low' ? 'Add more signals' :
               'Profile incomplete'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* My Basics signals */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              My Basics
              <Link to="/my-basics" className="ml-auto text-indigo-600 hover:underline font-normal normal-case tracking-normal">Edit →</Link>
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.career_stage ? (
                <SignalPill icon={TrendingUp} label="Stage" value={careerStageLabel} source="basics" />
              ) : (
                <p className="text-xs text-gray-400 italic">Career stage not set</p>
              )}
              {profile.tagline && (
                <SignalPill icon={Users} label="Tagline" value={profile.tagline.slice(0, 40) + (profile.tagline.length > 40 ? '…' : '')} source="basics" />
              )}
            </div>
          </div>

          {/* My Professional signals */}
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              My Professional
              <Link to="/my-professional" className="ml-auto text-indigo-600 hover:underline font-normal normal-case tracking-normal">Edit →</Link>
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.job_title ? (
                <SignalPill icon={Briefcase} label="Role" value={profile.job_title} source="professional" />
              ) : (
                <p className="text-xs text-gray-400 italic">Job title not set</p>
              )}
              {profile.years_experience && (
                <SignalPill icon={Star} label="Experience" value={`${profile.years_experience} yrs`} source="professional" />
              )}
              {profile.company_name && (
                <SignalPill icon={Building2} label="Company" value={profile.company_name} source="professional" />
              )}
            </div>
          </div>

          {/* My Engagement signals */}
          <div>
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              My Engagement
              <Link to="/my-engagement" className="ml-auto text-indigo-600 hover:underline font-normal normal-case tracking-normal">Edit →</Link>
            </p>
            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? interests.map(i => (
                <SignalPill key={i} icon={Heart} label="Interest" value={i} source="engagement" />
              )) : (
                <p className="text-xs text-gray-400 italic">No interests added</p>
              )}
              {roles.map(r => (
                <SignalPill key={r} icon={Award} label="Role identity" value={r} source="engagement" />
              ))}
              {lookingFor.map(lf => (
                <SignalPill key={lf} icon={Target} label="Looking for" value={LOOKING_FOR_LABELS[lf] || lf} source="engagement" />
              ))}
            </div>
          </div>

          {activeSignalCount < 5 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Add more signals to improve your matches — career stage, interests, and what you're looking for have the most impact.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match scoring legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
        <span className="font-medium text-gray-700">Match score:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-emerald-500 inline-block" /> 85%+ Strong</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-blue-500 inline-block" /> 70–84% Good</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded bg-amber-500 inline-block" /> Below 70% Partial</span>
        <div className="flex items-center gap-3 ml-auto">
          {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Matched members — Friends-style card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-indigo-300 transition-all"
          >
            <div className="flex flex-col items-center text-center">

              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4 relative">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  member.name.split(' ').map(n => n[0]).join('')
                )}
                {/* Score badge */}
                <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white text-xs font-bold text-white
                  ${member.score >= 85 ? 'bg-emerald-500' : member.score >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}>
                  {member.score}
                </div>
              </div>

              {/* Name + tagline */}
              <Link to={`/users/${member.id}`} className="font-semibold text-gray-900 hover:text-indigo-600 mb-0.5">
                {member.name}
              </Link>
              <p className="text-sm text-gray-500 mb-1">{member.tagline}</p>
              <p className="text-xs text-gray-400 mb-3">{member.job_title} · {member.company}</p>

              {/* Credentials */}
              {member.credentials.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mb-3">
                  {member.credentials.map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              )}

              {/* Score bar */}
              <div className="w-full mb-3">
                <ScoreBar score={member.score} />
              </div>

              {/* Match reasons */}
              <div className="flex flex-wrap justify-center gap-1 mb-4">
                {member.matchReasons.map((reason, i) => (
                  <ReasonChip key={i} reason={reason} />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <Link
                  to={`/users/${member.id}`}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium text-center"
                >
                  View Profile
                </Link>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <Handshake className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Network effects notice */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">About Member Matching</p>
              <p className="text-sm text-gray-500">
                Affinity matching improves significantly as the community grows. At 25–50 members per community,
                the scoring engine can surface highly relevant connections across all signal dimensions —
                interests, credentials, affiliations, experience bands, and what members are looking for.
                The matches above are representative of what the system surfaces with a full member population.
              </p>
              <div className="flex gap-3 mt-3 flex-wrap">
                <Link to="/members">
                  <Button size="sm" variant="outline">
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    Browse All Members
                  </Button>
                </Link>
                <Link to="/my-engagement">
                  <Button size="sm" variant="outline">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Improve My Signals
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
