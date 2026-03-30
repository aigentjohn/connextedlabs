/**
 * Badge Types Management Page (Admin)
 * 
 * Create, edit, and manage badge types.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Badge as UIBadge } from '@/app/components/ui/badge';
import { Award, Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import type { BadgeType, BadgeCategory, BadgeIssuerType } from '@/services/badgeService';

export default function BadgeTypesManagementPage() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBadgeTypes();
  }, []);

  async function fetchBadgeTypes() {
    try {
      const { data, error } = await supabase
        .from('badge_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setBadgeTypes(data || []);
    } catch (err: any) {
      toast.error('Failed to load badge types: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('badge_types')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentState ? 'Badge type deactivated' : 'Badge type activated');
      fetchBadgeTypes();
    } catch (err: any) {
      toast.error('Failed to update badge type: ' + err.message);
    }
  }

  async function deleteBadgeType(id: string) {
    if (!confirm('Are you sure you want to delete this badge type? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('badge_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Badge type deleted');
      fetchBadgeTypes();
    } catch (err: any) {
      toast.error('Failed to delete badge type: ' + err.message);
    }
  }

  // Group badges by category
  const badgesByCategory = badgeTypes.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, BadgeType[]>);

  const categoryLabels: Record<string, string> = {
    completion: 'Completion Badges',
    endorsement: 'Endorsement Badges',
    skill: 'Skill Badges',
    verification: 'Verification Badges',
    achievement: 'Achievement Badges',
    membership: 'Membership Badges',
  };

  const categoryEmojis: Record<string, string> = {
    completion: '✅',
    endorsement: '⭐',
    skill: '🏆',
    verification: '✓',
    achievement: '🎖️',
    membership: '👥',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Badge Types', href: '/admin/badge-types' },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Badge Types Management</h1>
          </div>
          <p className="text-gray-600">
            Create and manage badge types that can be issued to users and companies
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Badge Type
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-8">
          <BadgeTypeForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchBadgeTypes();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Badge Types by Category */}
      {!loading && (
        <div className="space-y-8">
          {Object.entries(badgesByCategory).map(([category, badges]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">{categoryEmojis[category]}</span>
                {categoryLabels[category] || category}
                <UIBadge variant="secondary">{badges.length}</UIBadge>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <Card key={badge.id} className={!badge.is_active ? 'opacity-50' : ''}>
                    <CardContent className="p-6">
                      {editingId === badge.id ? (
                        <BadgeTypeForm
                          badgeType={badge}
                          onSuccess={() => {
                            setEditingId(null);
                            fetchBadgeTypes();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          <div className="flex items-start gap-3 mb-4">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0"
                              style={{ backgroundColor: badge.badge_color }}
                            >
                              {categoryEmojis[badge.category]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg">{badge.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {badge.slug}
                              </p>
                            </div>
                          </div>

                          {badge.description && (
                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                              {badge.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-4">
                            <UIBadge variant="outline">{badge.issuer_type}</UIBadge>
                            {badge.assignable_to.includes('user') && (
                              <UIBadge variant="secondary">Users</UIBadge>
                            )}
                            {badge.assignable_to.includes('company') && (
                              <UIBadge variant="secondary">Companies</UIBadge>
                            )}
                            {badge.auto_issue && (
                              <UIBadge>Auto-issue</UIBadge>
                            )}
                            {!badge.is_active && (
                              <UIBadge variant="destructive">Inactive</UIBadge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Link to={`/platform-admin/badges/${badge.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                Detail
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(badge.id)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleActive(badge.id, badge.is_active)}
                            >
                              {badge.is_active ? (
                                <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                              ) : (
                                <><Eye className="w-3 h-3 mr-1" /> Show</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteBadgeType(badge.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Badge Type Form Component
 */
interface BadgeTypeFormProps {
  badgeType?: BadgeType;
  onSuccess: () => void;
  onCancel: () => void;
}

function BadgeTypeForm({ badgeType, onSuccess, onCancel }: BadgeTypeFormProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: badgeType?.name || '',
    slug: badgeType?.slug || '',
    description: badgeType?.description || '',
    category: badgeType?.category || 'achievement' as BadgeCategory,
    issuer_type: badgeType?.issuer_type || 'platform' as BadgeIssuerType,
    badge_color: badgeType?.badge_color || '#3B82F6',
    badge_image_url: badgeType?.badge_image_url || '',
    assignable_to: badgeType?.assignable_to || ['user', 'company'],
    auto_issue: badgeType?.auto_issue || false,
    is_active: badgeType?.is_active !== false,
  });

  function handleChange(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name' && !badgeType) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        badge_image_url: formData.badge_image_url || null,
      };

      if (badgeType) {
        // Update existing
        const { error } = await supabase
          .from('badge_types')
          .update(submitData)
          .eq('id', badgeType.id);

        if (error) throw error;
        toast.success('Badge type updated!');
      } else {
        // Create new
        const { error } = await supabase
          .from('badge_types')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Badge type created!');
      }

      onSuccess();
    } catch (err: any) {
      toast.error('Failed to save badge type: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {badgeType ? 'Edit Badge Type' : 'Create New Badge Type'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., AI Expert"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <Input
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g., ai-expert"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="What does this badge represent?"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="completion">Completion</option>
              <option value="endorsement">Endorsement</option>
              <option value="skill">Skill</option>
              <option value="verification">Verification</option>
              <option value="achievement">Achievement</option>
              <option value="membership">Membership</option>
            </select>
          </div>

          {/* Issuer Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Issuer Type *</label>
            <select
              value={formData.issuer_type}
              onChange={(e) => handleChange('issuer_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="platform">Platform</option>
              <option value="sponsor">Sponsor</option>
              <option value="program">Program</option>
              <option value="course">Course</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Badge Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Badge Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.badge_color}
                onChange={(e) => handleChange('badge_color', e.target.value)}
                className="w-20"
              />
              <Input
                type="text"
                value={formData.badge_color}
                onChange={(e) => handleChange('badge_color', e.target.value)}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Badge Image URL */}
          <div>
            <label className="block text-sm font-medium mb-1">Badge Image URL</label>
            <Input
              type="url"
              value={formData.badge_image_url}
              onChange={(e) => handleChange('badge_image_url', e.target.value)}
              placeholder="https://example.com/badge-icon.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional image displayed on the badge. If empty, the category icon is used.
            </p>
          </div>

          {/* Assignable To */}
          <div>
            <label className="block text-sm font-medium mb-2">Assignable To *</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.assignable_to.includes('user')}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...formData.assignable_to, 'user']
                      : formData.assignable_to.filter(t => t !== 'user');
                    handleChange('assignable_to', newValue);
                  }}
                  className="mr-2"
                />
                Users
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.assignable_to.includes('company')}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...formData.assignable_to, 'company']
                      : formData.assignable_to.filter(t => t !== 'company');
                    handleChange('assignable_to', newValue);
                  }}
                  className="mr-2"
                />
                Companies
              </label>
            </div>
          </div>

          {/* Auto-issue */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_issue}
                onChange={(e) => handleChange('auto_issue', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Auto-issue when criteria met</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Requires additional configuration
            </p>
          </div>

          {/* Active */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : badgeType ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}