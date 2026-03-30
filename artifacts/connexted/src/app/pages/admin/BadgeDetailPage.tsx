/**
 * Badge Detail Page
 *
 * Full detail view for a single badge type. Two modes:
 *  - Public view: anyone can see badge info, criteria, and recent recipients
 *  - Admin view: editable criteria fields + inline "Award This Badge" form
 *
 * Route: /platform-admin/badges/:badgeTypeId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge as UIBadge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Award,
  Edit,
  Save,
  X,
  UserPlus,
  Search,
  CheckCircle,
  Clock,
  Users,
  Compass,
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Star,
  BookOpen,
  GraduationCap,
  Building2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';
import { issueBadge, revokeBadge } from '@/services/badgeService';
import type { BadgeType, BadgeLevel, UserBadge, CompanyBadge } from '@/services/badgeService';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface RecipientInfo {
  id: string;
  type: 'user' | 'company';
  name: string;
  avatar?: string | null;
  email?: string;
  tagline?: string;
  earned_at?: string;
  issuer_name?: string;
  issuer_message?: string;
}

interface PathwayLink {
  pathway_id: string;
  pathway_name: string;
  pathway_slug: string;
  step_count: number;
  required_step_count: number;
  estimated_hours: number | null;
}

interface CriteriaData {
  earning_description?: string;
  requirements?: Array<{
    type: string;
    label: string;
    value?: string;
  }>;
}

// ============================================================================
// HELPERS
// ============================================================================

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

async function fetchAPI(path: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const issuerTypeLabels: Record<string, string> = {
  platform: 'Platform',
  sponsor: 'Sponsor',
  program: 'Program',
  course: 'Course',
  admin: 'Admin',
};

const categoryLabels: Record<string, string> = {
  completion: 'Completion',
  endorsement: 'Endorsement',
  skill: 'Skill',
  verification: 'Verification',
  achievement: 'Achievement',
  membership: 'Membership',
};

const categoryIcons: Record<string, React.ReactNode> = {
  completion: <CheckCircle className="w-5 h-5" />,
  endorsement: <Star className="w-5 h-5" />,
  skill: <Award className="w-5 h-5" />,
  verification: <Shield className="w-5 h-5" />,
  achievement: <Award className="w-5 h-5" />,
  membership: <Users className="w-5 h-5" />,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BadgeDetailPage() {
  const { badgeTypeId } = useParams<{ badgeTypeId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [badgeType, setBadgeType] = useState<BadgeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Recipients
  const [userRecipients, setUserRecipients] = useState<RecipientInfo[]>([]);
  const [companyRecipients, setCompanyRecipients] = useState<RecipientInfo[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);

  // Pathway link
  const [pathwayLink, setPathwayLink] = useState<PathwayLink | null>(null);

  // Criteria editing
  const [editingCriteria, setEditingCriteria] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState<CriteriaData>({});
  const [savingCriteria, setSavingCriteria] = useState(false);

  // Award form
  const [showAwardForm, setShowAwardForm] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (badgeTypeId) {
      loadBadgeType();
      loadRecipients();
      loadPathwayLink();
    }
  }, [badgeTypeId]);

  async function loadBadgeType() {
    try {
      const { data, error } = await supabase
        .from('badge_types')
        .select('*')
        .eq('id', badgeTypeId)
        .single();

      if (error) throw error;
      setBadgeType(data);
      setCriteriaForm(data.auto_issue_criteria || {});
    } catch (err: any) {
      console.error('Error loading badge type:', err);
      toast.error('Badge type not found');
      navigate('/platform-admin/badge-types');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipients() {
    try {
      setRecipientsLoading(true);

      // Load user recipients
      const { data: userBadges, error: userError } = await supabase
        .from('user_badges')
        .select(`
          id, created_at, issuer_message, is_public,
          recipient:users!user_badges_recipient_user_id_fkey(id, full_name, avatar_url, email),
          issuer:users!user_badges_issued_by_user_id_fkey(id, full_name)
        `)
        .eq('badge_type_id', badgeTypeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!userError && userBadges) {
        setUserRecipients(userBadges.map((ub: any) => ({
          id: ub.recipient?.id,
          type: 'user' as const,
          name: ub.recipient?.full_name || 'Unknown',
          avatar: ub.recipient?.avatar_url,
          email: ub.recipient?.email,
          earned_at: ub.created_at,
          issuer_name: ub.issuer?.full_name,
          issuer_message: ub.issuer_message,
        })));
      }

      // Load company recipients
      const { data: companyBadges, error: companyError } = await supabase
        .from('company_badges')
        .select(`
          id, issued_at, issuer_message, is_public,
          company:market_companies(id, name, logo_url, tagline),
          issuer:users!company_badges_issued_by_user_id_fkey(id, full_name)
        `)
        .eq('badge_type_id', badgeTypeId)
        .order('issued_at', { ascending: false })
        .limit(50);

      if (!companyError && companyBadges) {
        setCompanyRecipients(companyBadges.map((cb: any) => ({
          id: cb.company?.id,
          type: 'company' as const,
          name: cb.company?.name || 'Unknown',
          avatar: cb.company?.logo_url,
          tagline: cb.company?.tagline,
          earned_at: cb.issued_at,
          issuer_name: cb.issuer?.full_name,
          issuer_message: cb.issuer_message,
        })));
      }
    } catch (err) {
      console.error('Error loading recipients:', err);
    } finally {
      setRecipientsLoading(false);
    }
  }

  async function loadPathwayLink() {
    try {
      const data = await fetchAPI('/pathways/badge-mappings');
      if (data.mappings && data.mappings[badgeTypeId!]) {
        setPathwayLink(data.mappings[badgeTypeId!]);
      }
    } catch (err) {
      // Badge may not be linked to a pathway — that's fine
    }
  }

  // ============================================================================
  // CRITERIA EDITING
  // ============================================================================

  async function saveCriteria() {
    if (!badgeType) return;
    setSavingCriteria(true);
    try {
      const { error } = await supabase
        .from('badge_types')
        .update({ auto_issue_criteria: criteriaForm })
        .eq('id', badgeType.id);

      if (error) throw error;
      setBadgeType({ ...badgeType, auto_issue_criteria: criteriaForm });
      setEditingCriteria(false);
      toast.success('Earning criteria saved');
    } catch (err: any) {
      toast.error('Failed to save criteria: ' + err.message);
    } finally {
      setSavingCriteria(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!badgeType) return null;

  const totalRecipients = userRecipients.length + companyRecipients.length;
  const criteria: CriteriaData = badgeType.auto_issue_criteria || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/platform-admin' },
          { label: 'Badge Types', href: '/platform-admin/badge-types' },
          { label: badgeType.name },
        ]}
      />

      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      {/* ============================================================== */}
      {/* HEADER CARD                                                     */}
      {/* ============================================================== */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Large badge icon */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-lg"
              style={{ backgroundColor: badgeType.badge_color }}
            >
              {badgeType.badge_image_url ? (
                <img
                  src={badgeType.badge_image_url}
                  alt={badgeType.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="text-3xl">
                  {categoryIcons[badgeType.category] || <Award className="w-10 h-10" />}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{badgeType.name}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">/{badgeType.slug}</p>
                </div>
                <div className="flex gap-2">
                  {!badgeType.is_active && (
                    <UIBadge variant="destructive">Inactive</UIBadge>
                  )}
                  {isAdmin && (
                    <Button
                      onClick={() => setShowAwardForm(!showAwardForm)}
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Award This Badge
                    </Button>
                  )}
                </div>
              </div>

              {badgeType.description && (
                <p className="text-gray-700 mt-2">{badgeType.description}</p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                <UIBadge variant="outline" className="capitalize">
                  {categoryLabels[badgeType.category] || badgeType.category}
                </UIBadge>
                <UIBadge variant="secondary">
                  {issuerTypeLabels[badgeType.issuer_type] || badgeType.issuer_type} issued
                </UIBadge>
                {badgeType.auto_issue && (
                  <UIBadge className="bg-green-100 text-green-800">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Auto-issue
                  </UIBadge>
                )}
                {badgeType.assignable_to.includes('user') && (
                  <UIBadge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    Users
                  </UIBadge>
                )}
                {badgeType.assignable_to.includes('company') && (
                  <UIBadge variant="outline">
                    <Building2 className="w-3 h-3 mr-1" />
                    Companies
                  </UIBadge>
                )}
              </div>

              {/* Stats row */}
              <div className="flex gap-6 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Created {new Date(badgeType.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* INLINE AWARD FORM (admin only)                                  */}
      {/* ============================================================== */}
      {showAwardForm && isAdmin && (
        <InlineAwardForm
          badgeType={badgeType}
          onSuccess={() => {
            setShowAwardForm(false);
            loadRecipients();
          }}
          onCancel={() => setShowAwardForm(false)}
        />
      )}

      {/* ============================================================== */}
      {/* TABS                                                            */}
      {/* ============================================================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview & Criteria</TabsTrigger>
          <TabsTrigger value="recipients">
            Recipients ({totalRecipients})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
        </TabsList>

        {/* ============================================================== */}
        {/* OVERVIEW TAB                                                    */}
        {/* ============================================================== */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Pathway Link */}
          {pathwayLink && (
            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Compass className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-indigo-900">Linked Pathway</h3>
                    <p className="text-sm text-indigo-700 mt-1">
                      This badge is automatically awarded when a user completes the
                      <strong> {pathwayLink.pathway_name}</strong> pathway.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-indigo-600 mt-2">
                      <span>{pathwayLink.required_step_count} required steps</span>
                      <span>{pathwayLink.step_count} total steps</span>
                      {pathwayLink.estimated_hours && (
                        <span>~{pathwayLink.estimated_hours}h estimated</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Earning Criteria */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Earning Criteria
                </CardTitle>
                {isAdmin && !editingCriteria && (
                  <Button variant="outline" size="sm" onClick={() => setEditingCriteria(true)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Edit Criteria
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingCriteria ? (
                <CriteriaEditor
                  criteria={criteriaForm}
                  onChange={setCriteriaForm}
                  onSave={saveCriteria}
                  onCancel={() => {
                    setCriteriaForm(badgeType.auto_issue_criteria || {});
                    setEditingCriteria(false);
                  }}
                  saving={savingCriteria}
                />
              ) : (
                <CriteriaDisplay criteria={criteria} badgeType={badgeType} pathwayLink={pathwayLink} />
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">{userRecipients.length}</p>
                <p className="text-sm text-gray-600">Users Earned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{companyRecipients.length}</p>
                <p className="text-sm text-gray-600">Companies Earned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {badgeType.auto_issue ? 'Auto' : 'Manual'}
                </p>
                <p className="text-sm text-gray-600">Issue Mode</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* RECIPIENTS TAB                                                  */}
        {/* ============================================================== */}
        <TabsContent value="recipients" className="mt-4 space-y-4">
          {recipientsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading recipients...</div>
          ) : totalRecipients === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No recipients yet</p>
                <p className="text-sm mt-1">
                  {isAdmin
                    ? 'Click "Award This Badge" to give this badge to a user or company.'
                    : 'This badge hasn\'t been awarded to anyone yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* User recipients */}
              {userRecipients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Users ({userRecipients.length})
                  </h3>
                  <div className="space-y-2">
                    {userRecipients.map((r) => (
                      <RecipientRow
                        key={r.id}
                        recipient={r}
                        badgeSlug={badgeType.slug}
                        isAdmin={isAdmin}
                        onRevoked={loadRecipients}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Company recipients */}
              {companyRecipients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Companies ({companyRecipients.length})
                  </h3>
                  <div className="space-y-2">
                    {companyRecipients.map((r) => (
                      <RecipientRow
                        key={r.id}
                        recipient={r}
                        badgeSlug={badgeType.slug}
                        isAdmin={isAdmin}
                        onRevoked={loadRecipients}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* SETTINGS TAB (admin only)                                      */}
        {/* ============================================================== */}
        {isAdmin && (
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Badge Status</h3>
                    <p className="text-sm text-gray-500">
                      {badgeType.is_active ? 'This badge is active and visible' : 'This badge is currently inactive'}
                    </p>
                  </div>
                  <UIBadge variant={badgeType.is_active ? 'default' : 'destructive'}>
                    {badgeType.is_active ? 'Active' : 'Inactive'}
                  </UIBadge>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Quick Actions</h3>
                  <div className="flex gap-2">
                    <Link to="/platform-admin/badge-types">
                      <Button variant="outline" size="sm">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit in Badge Types Manager
                      </Button>
                    </Link>
                    <Link to="/platform-admin/badges">
                      <Button variant="outline" size="sm">
                        <Award className="w-3 h-3 mr-1" />
                        Badge Management Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ============================================================================
// CRITERIA DISPLAY — shows how to earn this badge
// ============================================================================

function CriteriaDisplay({
  criteria,
  badgeType,
  pathwayLink,
}: {
  criteria: CriteriaData;
  badgeType: BadgeType;
  pathwayLink: PathwayLink | null;
}) {
  const hasCustomCriteria = criteria.earning_description || (criteria.requirements && criteria.requirements.length > 0);

  if (!hasCustomCriteria && !pathwayLink && !badgeType.auto_issue) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p>No earning criteria have been defined yet.</p>
        <p className="text-xs mt-1">
          Admins can add criteria to help members understand how to earn this badge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom description */}
      {criteria.earning_description && (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {criteria.earning_description}
        </div>
      )}

      {/* Auto-generated pathway criteria */}
      {pathwayLink && !criteria.earning_description && (
        <div className="text-sm text-gray-700">
          Complete all required steps in the <strong>{pathwayLink.pathway_name}</strong> pathway
          to automatically earn this badge. The pathway has {pathwayLink.required_step_count} required
          steps{pathwayLink.estimated_hours ? ` and takes approximately ${pathwayLink.estimated_hours} hours` : ''}.
        </div>
      )}

      {/* Auto-issue fallback */}
      {badgeType.auto_issue && !pathwayLink && !criteria.earning_description && (
        <div className="text-sm text-gray-700">
          This badge is automatically awarded when the earning criteria are met.
        </div>
      )}

      {/* Structured requirements */}
      {criteria.requirements && criteria.requirements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements</h4>
          <ul className="space-y-2">
            {criteria.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CRITERIA EDITOR — admin form for earning criteria
// ============================================================================

function CriteriaEditor({
  criteria,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  criteria: CriteriaData;
  onChange: (c: CriteriaData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [newReqLabel, setNewReqLabel] = useState('');

  function addRequirement() {
    if (!newReqLabel.trim()) return;
    const reqs = [...(criteria.requirements || [])];
    reqs.push({ type: 'custom', label: newReqLabel.trim() });
    onChange({ ...criteria, requirements: reqs });
    setNewReqLabel('');
  }

  function removeRequirement(index: number) {
    const reqs = [...(criteria.requirements || [])];
    reqs.splice(index, 1);
    onChange({ ...criteria, requirements: reqs });
  }

  return (
    <div className="space-y-4">
      {/* Earning description */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Earning Description
        </label>
        <textarea
          value={criteria.earning_description || ''}
          onChange={(e) => onChange({ ...criteria, earning_description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="Describe how a member can earn this badge. Be specific about what actions, completions, or achievements are required.&#10;&#10;Example: Complete the AI Fundamentals pathway including all 12 required steps. You must complete at least 3 hands-on activities and pass the final assessment with a score of 80% or higher."
        />
        <p className="text-xs text-gray-500 mt-1">
          This text is shown to members on the badge detail and My Badges pages.
        </p>
      </div>

      {/* Structured requirements */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Requirements Checklist
        </label>
        {criteria.requirements && criteria.requirements.length > 0 && (
          <ul className="space-y-2 mb-3">
            {criteria.requirements.map((req, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm flex-1">{req.label}</span>
                <button
                  type="button"
                  onClick={() => removeRequirement(i)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={newReqLabel}
            onChange={(e) => setNewReqLabel(e.target.value)}
            placeholder="e.g., Complete 3 hands-on activities"
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
          />
          <Button variant="outline" size="sm" onClick={addRequirement} type="button">
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Add individual requirements that members must meet. Press Enter or click Add.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} disabled={saving} size="sm">
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving...' : 'Save Criteria'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// RECIPIENT ROW
// ============================================================================

function RecipientRow({
  recipient,
  badgeSlug,
  isAdmin,
  onRevoked,
}: {
  recipient: RecipientInfo;
  badgeSlug: string;
  isAdmin: boolean;
  onRevoked: () => void;
}) {
  const linkTo = recipient.type === 'user'
    ? `/users/${recipient.id}`
    : `/markets/companies/${recipient.id}`;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <Avatar className="w-10 h-10">
        <AvatarImage src={recipient.avatar || undefined} />
        <AvatarFallback>
          {recipient.name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <Link to={linkTo} className="text-sm font-medium hover:text-indigo-600">
          {recipient.name}
        </Link>
        {recipient.email && (
          <p className="text-xs text-gray-500">{recipient.email}</p>
        )}
        {recipient.tagline && (
          <p className="text-xs text-gray-500">{recipient.tagline}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {recipient.earned_at && (
          <p className="text-xs text-gray-500">
            {new Date(recipient.earned_at).toLocaleDateString()}
          </p>
        )}
        {recipient.issuer_name && (
          <p className="text-xs text-gray-400">by {recipient.issuer_name}</p>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={async () => {
              if (!recipient.id) return;
              if (!confirm(`Revoke this badge from ${recipient.name}?`)) return;
              try {
                await revokeBadge(badgeSlug, recipient.type, recipient.id);
                toast.success(`Badge revoked from ${recipient.name}`);
                onRevoked();
              } catch (err: any) {
                toast.error(`Failed to revoke: ${err.message}`);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INLINE AWARD FORM — streamlined "select badge first, then find member"
// ============================================================================

function InlineAwardForm({
  badgeType,
  onSuccess,
  onCancel,
}: {
  badgeType: BadgeType;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [recipientType, setRecipientType] = useState<'user' | 'company'>(
    badgeType.assignable_to.includes('user') ? 'user' : 'company'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [issuerMessage, setIssuerMessage] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel | ''>('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => search(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, recipientType]);

  async function search() {
    try {
      if (recipientType === 'user') {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(8);
        setSearchResults(data || []);
      } else {
        const { data } = await supabase
          .from('market_companies')
          .select('id, name, logo_url, tagline')
          .ilike('name', `%${searchQuery}%`)
          .limit(8);
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }

  async function handleAward() {
    if (!selectedRecipient) return;
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await issueBadge({
        badgeTypeSlug: badgeType.slug,
        recipientType,
        recipientId: selectedRecipient.id,
        issuedByUserId: user.id,
        issuerMessage: issuerMessage || undefined,
        evidenceUrl: evidenceUrl || undefined,
        badgeLevel: badgeLevel || undefined,
        isPublic,
      });

      toast.success(`Badge awarded to ${recipientType === 'user' ? selectedRecipient.full_name : selectedRecipient.name}`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          Award "{badgeType.name}" Badge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Recipient type toggle */}
        <div className="flex gap-2">
          {badgeType.assignable_to.includes('user') && (
            <Button
              variant={recipientType === 'user' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRecipientType('user');
                setSelectedRecipient(null);
                setSearchQuery('');
              }}
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              User
            </Button>
          )}
          {badgeType.assignable_to.includes('company') && (
            <Button
              variant={recipientType === 'company' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setRecipientType('company');
                setSelectedRecipient(null);
                setSearchQuery('');
              }}
            >
              <Building2 className="w-3.5 h-3.5 mr-1" />
              Company
            </Button>
          )}
        </div>

        {/* Recipient search */}
        {selectedRecipient ? (
          <div className="flex items-center justify-between p-3 bg-white border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={recipientType === 'user' ? selectedRecipient.avatar_url : selectedRecipient.logo_url}
                />
                <AvatarFallback>
                  {(recipientType === 'user' ? selectedRecipient.full_name : selectedRecipient.name)?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {recipientType === 'user' ? selectedRecipient.full_name : selectedRecipient.name}
                </p>
                {recipientType === 'user' && (
                  <p className="text-xs text-gray-500">{selectedRecipient.email}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRecipient(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for a ${recipientType} by name...`}
                className="pl-9"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setSelectedRecipient(result);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="w-full p-2.5 hover:bg-gray-50 text-left flex items-center gap-3 text-sm"
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarImage
                        src={recipientType === 'user' ? result.avatar_url : result.logo_url}
                      />
                      <AvatarFallback className="text-xs">
                        {(recipientType === 'user' ? result.full_name : result.name)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {recipientType === 'user' ? result.full_name : result.name}
                      </p>
                      {recipientType === 'user' && (
                        <p className="text-xs text-gray-500">{result.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Endorsement level */}
        {badgeType.category === 'endorsement' && (
          <div>
            <label className="block text-sm font-medium mb-1">Endorsement Level</label>
            <select
              value={badgeLevel}
              onChange={(e) => setBadgeLevel(e.target.value as BadgeLevel | '')}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">None</option>
              <option value="supported">Supported</option>
              <option value="recommended">Recommended</option>
              <option value="highly_recommended">Highly Recommended</option>
            </select>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-sm font-medium mb-1">Personal Message (optional)</label>
          <textarea
            value={issuerMessage}
            onChange={(e) => setIssuerMessage(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Congratulations on this achievement..."
          />
        </div>

        {/* Evidence URL */}
        <div>
          <label className="block text-sm font-medium mb-1">Evidence URL (optional)</label>
          <Input
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://..."
            className="text-sm"
          />
        </div>

        {/* Public toggle */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this badge publicly visible on the recipient's profile
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleAward}
            disabled={saving || !selectedRecipient}
          >
            <Award className="w-4 h-4 mr-1" />
            {saving ? 'Awarding...' : 'Award Badge'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}