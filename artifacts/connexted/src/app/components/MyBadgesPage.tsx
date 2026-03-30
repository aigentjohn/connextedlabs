/**
 * My Badges Page
 *
 * Redesigned to answer three questions for every badge:
 *  1. What is this badge? (name, description, category)
 *  2. How do I earn it? (criteria — pathway completion, auto-issued, admin-awarded)
 *  3. What do I do next? (CTA — enroll in pathway, browse courses, or just keep growing)
 *
 * For pathway-linked badges, also shows enrollment status and progress.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Progress } from '@/app/components/ui/progress';
import {
  Award,
  Trophy,
  Target,
  CheckCircle,
  Star,
  Shield,
  Users,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Compass,
  Sparkles,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { useUserBadges, useBadgeTypes } from '@/hooks/useBadges';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { supabase } from '@/lib/supabase';
import type { BadgeType, UserBadge } from '@/services/badgeService';

// ============================================================================
// TYPES
// ============================================================================

interface PathwayMapping {
  pathway_id: string;
  pathway_name: string;
  pathway_slug: string;
  pathway_destination: string | null;
  step_count: number;
  required_step_count: number;
  estimated_hours: number | null;
  color: string;
}

interface PathwayEnrollmentInfo {
  pathway_id: string;
  status: string;
  progress_percentage: number;
  completed_step_ids: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const categoryIcons: Record<string, React.ReactNode> = {
  completion: <CheckCircle className="w-5 h-5" />,
  endorsement: <Star className="w-5 h-5" />,
  skill: <Trophy className="w-5 h-5" />,
  verification: <Shield className="w-5 h-5" />,
  achievement: <Award className="w-5 h-5" />,
  membership: <Users className="w-5 h-5" />,
};

const categoryLabels: Record<string, string> = {
  completion: 'Completion',
  endorsement: 'Endorsement',
  skill: 'Skill',
  verification: 'Verification',
  achievement: 'Achievement',
  membership: 'Membership',
};

// ============================================================================
// API HELPER
// ============================================================================

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

async function fetchAPI(path: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['X-User-Token'] = session.access_token;
    }
  } catch { /* proceed without */ }

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ============================================================================
// EARNING METHOD RESOLVER
// ============================================================================

function getEarningInfo(bt: BadgeType, pathwayMapping?: PathwayMapping): {
  label: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  icon: React.ReactNode;
} {
  // If admin has set a custom earning description, use it as the primary description
  const customDesc = (bt.auto_issue_criteria as any)?.earning_description;

  if (pathwayMapping) {
    return {
      label: 'Complete a Pathway',
      description: customDesc || `Complete all required steps in the "${pathwayMapping.pathway_name}" pathway.`,
      ctaLabel: 'Go to My Growth',
      ctaLink: '/my-growth',
      icon: <Compass className="w-4 h-4" />,
    };
  }

  if (bt.auto_issue) {
    const typeMap: Record<string, { label: string; desc: string; cta: string; link: string; icon: React.ReactNode }> = {
      course: { label: 'Course Completion', desc: 'Automatically awarded when you finish a qualifying course.', cta: 'Browse Courses', link: '/courses', icon: <BookOpen className="w-4 h-4" /> },
      program: { label: 'Program Completion', desc: 'Automatically awarded when you complete a qualifying program.', cta: 'Browse Programs', link: '/programs', icon: <GraduationCap className="w-4 h-4" /> },
      platform: { label: 'Platform Activity', desc: 'Automatically awarded based on your activity on the platform.', cta: 'Go to My Growth', link: '/my-growth', icon: <Sparkles className="w-4 h-4" /> },
    };
    const t = typeMap[bt.issuer_type] || { label: 'Auto-Awarded', desc: 'Awarded automatically when criteria are met.', cta: 'Go to My Growth', link: '/my-growth', icon: <Sparkles className="w-4 h-4" /> };
    return { label: t.label, description: customDesc || t.desc, ctaLabel: t.cta, ctaLink: t.link, icon: t.icon };
  }

  const typeMap: Record<string, { label: string; desc: string; cta: string; link: string; icon: React.ReactNode }> = {
    sponsor: { label: 'Sponsor Endorsement', desc: 'Awarded by a sponsor or mentor who endorses your accomplishments.', cta: 'View Your Growth', link: '/my-growth', icon: <Star className="w-4 h-4" /> },
    admin: { label: 'Admin Recognition', desc: 'Awarded by platform administrators for notable contributions.', cta: 'View Your Growth', link: '/my-growth', icon: <Shield className="w-4 h-4" /> },
    course: { label: 'Course Achievement', desc: 'Awarded after meeting criteria in a specific course.', cta: 'Browse Courses', link: '/courses', icon: <BookOpen className="w-4 h-4" /> },
    program: { label: 'Program Achievement', desc: 'Awarded after meeting criteria in a specific program.', cta: 'Browse Programs', link: '/programs', icon: <GraduationCap className="w-4 h-4" /> },
  };
  const t = typeMap[bt.issuer_type] || { label: 'Platform Badge', desc: 'Earned through participation and growth on the platform.', cta: 'Go to My Growth', link: '/my-growth', icon: <Award className="w-4 h-4" /> };
  return { label: t.label, description: customDesc || t.desc, ctaLabel: t.cta, ctaLink: t.link, icon: t.icon };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MyBadgesPage() {
  const { profile } = useAuth();
  const { badges, loading: badgesLoading } = useUserBadges(profile?.id || null, true);
  const { badgeTypes, loading: typesLoading } = useBadgeTypes();

  const [badgePathwayMap, setBadgePathwayMap] = useState<Record<string, PathwayMapping>>({});
  const [enrollments, setEnrollments] = useState<PathwayEnrollmentInfo[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    loadExtraData();
  }, []);

  async function loadExtraData() {
    try {
      const [mappingsRes, enrollmentsRes] = await Promise.allSettled([
        fetchAPI('/pathways/badge-mappings'),
        fetchAPI('/pathways/user/enrollments'),
      ]);

      if (mappingsRes.status === 'fulfilled') {
        setBadgePathwayMap(mappingsRes.value.mappings || {});
      }
      if (enrollmentsRes.status === 'fulfilled') {
        const enrollmentData = enrollmentsRes.value.enrollments || [];
        setEnrollments(enrollmentData.map((e: any) => ({
          pathway_id: e.enrollment.pathway_id || e.pathway?.id,
          status: e.enrollment.status,
          progress_percentage: e.enrollment.progress_percentage,
          completed_step_ids: e.enrollment.completed_step_ids || [],
        })));
      }
    } catch (err) {
      console.error('Error loading badge context data:', err);
    } finally {
      setExtraLoading(false);
    }
  }

  if (!profile) return null;

  const loading = badgesLoading || typesLoading;

  // Derived data
  const earnedTypeIds = new Set(badges.map(b => b.badge_type_id));
  const userAssignable = badgeTypes.filter(bt => bt.assignable_to.includes('user'));
  const availableTypes = userAssignable.filter(bt => !earnedTypeIds.has(bt.id));

  // Group available by earning method
  const pathwayLinked = availableTypes.filter(bt => badgePathwayMap[bt.id]);
  const autoIssued = availableTypes.filter(bt => bt.auto_issue && !badgePathwayMap[bt.id]);
  const manuallyAwarded = availableTypes.filter(bt => !bt.auto_issue && !badgePathwayMap[bt.id]);

  // Lookup helper for enrollment by pathway ID
  const enrollmentByPathwayId = Object.fromEntries(
    enrollments.map(e => [e.pathway_id, e])
  );

  const progressPercent = userAssignable.length > 0
    ? Math.round((earnedTypeIds.size / userAssignable.length) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'My Profile', path: '/profile' },
          { label: 'My Badges', path: '/profile/badges' },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-600" />
            My Badges
          </h1>
          <p className="text-gray-600">
            {loading
              ? 'Loading your badges...'
              : badges.length > 0
                ? `You've earned ${badges.length} badge${badges.length !== 1 ? 's' : ''}.${availableTypes.length > 0 ? ` ${availableTypes.length} more to go.` : ''}`
                : 'Earn badges by completing pathways, courses, and platform activities.'}
          </p>
        </div>
        <Link to="/my-growth">
          <Button variant="outline" size="sm">
            <Compass className="w-4 h-4 mr-2" />
            My Growth
          </Button>
        </Link>
      </div>

      {/* How It Works */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="py-4">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-indigo-900">How do I earn badges?</span>
            </div>
            {showHowItWorks
              ? <ChevronUp className="w-4 h-4 text-indigo-600" />
              : <ChevronDown className="w-4 h-4 text-indigo-600" />
            }
          </button>
          {showHowItWorks && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Complete Pathways</p>
                  <p className="text-gray-600 mt-0.5">
                    Follow a structured growth pathway. Many pathways award a badge when you complete all required steps — including self-reported activities.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Finish Courses & Programs</p>
                  <p className="text-gray-600 mt-0.5">
                    Some badges are auto-awarded when you complete a course or program. Just finish the content — the badge appears automatically.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Earn Recognition</p>
                  <p className="text-gray-600 mt-0.5">
                    Admins, sponsors, and mentors can award endorsement badges. There's no application — focus on growing and contributing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {!loading && userAssignable.length > 0 && (
        <Card>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Badge Collection</span>
              <span className="text-sm text-gray-600">
                {earnedTypeIds.size} / {userAssignable.length} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* EARNED BADGES                                                    */}
      {/* ============================================================== */}
      {!loading && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Earned Badges
            {badges.length > 0 && (
              <Badge variant="secondary">{badges.length}</Badge>
            )}
          </h2>
          {badges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No badges earned yet</p>
                <p className="text-sm mt-1 max-w-md mx-auto">
                  Scroll down to see what badges are available and how to earn each one.
                </p>
                <Link to="/my-growth">
                  <Button variant="outline" size="sm" className="mt-4">
                    <Compass className="w-4 h-4 mr-2" />
                    Explore Pathways
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badges.map((badge) => (
                <EarnedBadgeCard
                  key={badge.id}
                  badge={badge}
                  pathwayMapping={badge.badge_type_id ? badgePathwayMap[badge.badge_type_id] : undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* PATHWAY-LINKED BADGES                                            */}
      {/* ============================================================== */}
      {!loading && !extraLoading && pathwayLinked.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            Earn by Completing a Pathway
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Complete all required steps — including self-reported activities — to earn these badges.
          </p>
          <div className="space-y-3">
            {pathwayLinked.map((bt) => (
              <AvailableBadgeCard
                key={bt.id}
                badgeType={bt}
                pathwayMapping={badgePathwayMap[bt.id]}
                enrollment={badgePathwayMap[bt.id] ? enrollmentByPathwayId[badgePathwayMap[bt.id].pathway_id] : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* AUTO-ISSUED BADGES                                               */}
      {/* ============================================================== */}
      {!loading && autoIssued.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" />
            Auto-Awarded Badges
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Automatically awarded when you meet the criteria. No application needed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {autoIssued.map((bt) => (
              <AvailableBadgeCard key={bt.id} badgeType={bt} />
            ))}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* RECOGNITION BADGES                                               */}
      {/* ============================================================== */}
      {!loading && manuallyAwarded.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Recognition Badges
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Awarded by admins, sponsors, or mentors. There's no application — keep growing and contributing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {manuallyAwarded.map((bt) => (
              <AvailableBadgeCard key={bt.id} badgeType={bt} />
            ))}
          </div>
        </section>
      )}

      {/* All collected */}
      {!loading && availableTypes.length === 0 && badges.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="py-8 text-center">
            <Trophy className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="font-semibold text-green-900">You've collected every badge!</p>
            <p className="text-sm text-green-700 mt-1">
              New badges may be added over time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// EARNED BADGE CARD — shows what you earned AND the context (pathway, course)
// ============================================================================

function EarnedBadgeCard({
  badge,
  pathwayMapping,
}: {
  badge: UserBadge;
  pathwayMapping?: PathwayMapping;
}) {
  const bt = badge.badge_type;

  return (
    <Card className="border-green-100 bg-green-50/20 hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          {/* Badge icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md ring-2 ring-green-200"
            style={{ backgroundColor: bt?.badge_color || '#3B82F6' }}
          >
            {bt?.badge_image_url ? (
              <img src={bt.badge_image_url} alt={bt.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              categoryIcons[bt?.category || 'achievement'] || <Award className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{bt?.name || 'Badge'}</h3>
              <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">
                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                Earned
              </Badge>
            </div>

            {bt?.description && (
              <p className="text-sm text-gray-600 mt-1">{bt.description}</p>
            )}

            {/* Earning context */}
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              {badge.issued_by_system && pathwayMapping && (
                <p className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-500" />
                  Earned via pathway: <span className="font-medium text-gray-700">{pathwayMapping.pathway_name}</span>
                </p>
              )}
              {badge.issuer && (
                <p>Issued by <span className="font-medium text-gray-700">{badge.issuer.full_name}</span></p>
              )}
              {badge.issued_by_system && !pathwayMapping && (
                <p>Auto-issued by system</p>
              )}
              {'created_at' in badge && (
                <p className="text-xs text-gray-400">
                  {new Date(badge.created_at).toLocaleDateString(undefined, {
                    month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
            </div>

            {badge.issuer_message && (
              <div className="mt-2 p-2.5 bg-white rounded-lg border text-sm italic text-gray-600">
                "{badge.issuer_message}"
              </div>
            )}

            {badge.evidence_url && (
              <a
                href={badge.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Evidence
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AVAILABLE BADGE CARD — shows criteria, pathway link, enrollment status, CTA
// ============================================================================

function AvailableBadgeCard({
  badgeType,
  pathwayMapping,
  enrollment,
}: {
  badgeType: BadgeType;
  pathwayMapping?: PathwayMapping;
  enrollment?: PathwayEnrollmentInfo;
}) {
  const earning = getEarningInfo(badgeType, pathwayMapping);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          {/* Badge icon */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm opacity-80"
            style={{ backgroundColor: badgeType.badge_color || '#9CA3AF' }}
          >
            {badgeType.badge_image_url ? (
              <img src={badgeType.badge_image_url} alt={badgeType.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              categoryIcons[badgeType.category] || <Award className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + category */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/badges/${badgeType.id}`} className="hover:text-indigo-600">
                <h3 className="font-semibold">{badgeType.name}</h3>
              </Link>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                {categoryLabels[badgeType.category] || badgeType.category}
              </Badge>
            </div>

            {badgeType.description && (
              <p className="text-sm text-gray-600 mt-1">{badgeType.description}</p>
            )}

            {/* How to earn */}
            <div className="mt-2 flex items-start gap-2 text-sm">
              <div className="flex-shrink-0 mt-0.5 text-indigo-600">
                {earning.icon}
              </div>
              <div>
                <span className="font-medium text-gray-700">{earning.label}: </span>
                <span className="text-gray-500">{earning.description}</span>
              </div>
            </div>

            {/* Inline requirements from auto_issue_criteria */}
            {(badgeType.auto_issue_criteria as any)?.requirements?.length > 0 && (
              <ul className="mt-2 ml-6 space-y-1">
                {((badgeType.auto_issue_criteria as any).requirements as Array<{ label: string }>).slice(0, 4).map((req, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    {req.label}
                  </li>
                ))}
                {((badgeType.auto_issue_criteria as any).requirements as Array<{ label: string }>).length > 4 && (
                  <li className="text-xs text-indigo-600">
                    <Link to={`/badges/${badgeType.id}`} className="hover:underline">
                      + {((badgeType.auto_issue_criteria as any).requirements as Array<{ label: string }>).length - 4} more...
                    </Link>
                  </li>
                )}
              </ul>
            )}

            {/* Pathway detail card — with enrollment status */}
            {pathwayMapping && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-900">
                      {pathwayMapping.pathway_name}
                    </p>
                    {pathwayMapping.pathway_destination && (
                      <p className="text-xs text-indigo-700 mt-0.5">
                        {pathwayMapping.pathway_destination}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-indigo-600 mt-1">
                      <span>{pathwayMapping.required_step_count} required steps</span>
                      {pathwayMapping.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{pathwayMapping.estimated_hours}h
                        </span>
                      )}
                    </div>

                    {/* Enrollment status */}
                    {enrollment && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-indigo-700 font-medium">
                            {enrollment.status === 'completed'
                              ? 'Completed!'
                              : enrollment.status === 'active'
                                ? 'In progress'
                                : 'Enrolled'}
                          </span>
                          <span className="text-indigo-600">{enrollment.progress_percentage}%</span>
                        </div>
                        <Progress value={enrollment.progress_percentage} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  <Link to="/my-growth" className="flex-shrink-0">
                    <Button size="sm" className="text-xs">
                      {enrollment
                        ? <><ArrowRight className="w-3 h-3 mr-1" /> Continue</>
                        : <><ArrowRight className="w-3 h-3 mr-1" /> Start</>
                      }
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* CTA for non-pathway badges */}
            {!pathwayMapping && (
              <div className="mt-3">
                <Link to={earning.ctaLink}>
                  <Button variant="outline" size="sm" className="text-xs">
                    {earning.icon}
                    <span className="ml-1.5">{earning.ctaLabel}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}