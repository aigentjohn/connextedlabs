// Split candidate: ~566 lines — consider extracting DemoAccountCard, CreateDemoForm, and DemoAccountsTable into sub-components.
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, Eye, EyeOff, Upload } from 'lucide-react';
import BulkImportManager, { BulkImportConfig } from '@/app/components/admin/BulkImportManager';

interface DemoAccount {
  id: string;
  label: string;
  description: string;
  email: string;
  password: string;
  icon: string;
  tier_badge: string;
  role_type: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function DemoAccountsManager() {
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<DemoAccount>>({
    label: '',
    description: '',
    email: '',
    password: '',
    icon: '🎯',
    tier_badge: 'FREE TIER',
    role_type: 'member',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchDemoAccounts();
  }, []);

  const fetchDemoAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('demo_accounts')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDemoAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching demo accounts:', error);
      toast.error('Failed to load demo accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.label || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('demo_accounts')
        .insert({
          ...formData,
          display_order: demoAccounts.length + 1,
        });

      if (error) throw error;

      toast.success('Demo account created successfully');
      setIsCreating(false);
      resetForm();
      fetchDemoAccounts();
    } catch (error: any) {
      console.error('Error creating demo account:', error);
      toast.error(error.message || 'Failed to create demo account');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('demo_accounts')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Demo account updated successfully');
      setEditingId(null);
      resetForm();
      fetchDemoAccounts();
    } catch (error: any) {
      console.error('Error updating demo account:', error);
      toast.error(error.message || 'Failed to update demo account');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return;

    try {
      const { error } = await supabase
        .from('demo_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Demo account deleted successfully');
      fetchDemoAccounts();
    } catch (error: any) {
      console.error('Error deleting demo account:', error);
      toast.error(error.message || 'Failed to delete demo account');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('demo_accounts')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentState ? 'Demo account hidden' : 'Demo account activated');
      fetchDemoAccounts();
    } catch (error: any) {
      console.error('Error toggling demo account:', error);
      toast.error('Failed to update demo account');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = demoAccounts.findIndex(d => d.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === demoAccounts.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reordered = [...demoAccounts];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    // Update display_order for all affected items
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('demo_accounts')
          .update({ display_order: i + 1 })
          .eq('id', reordered[i].id);
      }

      toast.success('Order updated successfully');
      fetchDemoAccounts();
    } catch (error: any) {
      console.error('Error reordering demo accounts:', error);
      toast.error('Failed to reorder demo accounts');
    }
  };

  const startEdit = (account: DemoAccount) => {
    setEditingId(account.id);
    setFormData(account);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      label: '',
      description: '',
      email: '',
      password: '',
      icon: '🎯',
      tier_badge: 'FREE TIER',
      role_type: 'member',
      is_active: true,
      display_order: 0,
    });
  };

  // Bulk import handler
  const handleBulkImport = async (records: any[]) => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const { error } = await supabase
          .from('demo_accounts')
          .insert({
            label: record.label,
            description: record.description,
            email: record.email,
            password: record.password,
            icon: record.icon || '🎯',
            tier_badge: record.tier_badge || 'FREE TIER',
            role_type: record.role_type || 'member',
            is_active: record.is_active !== undefined ? record.is_active : true,
            display_order: record.display_order || (demoAccounts.length + success + 1),
          });

        if (error) throw error;
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 1} (${record.label || record.email}): ${error.message}`);
      }
    }

    if (success > 0) {
      fetchDemoAccounts();
    }

    return { success, failed, errors };
  };

  // Bulk import config
  const bulkImportConfig: BulkImportConfig = {
    entityName: 'Demo Accounts',
    entityNameSingular: 'Demo Account',
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, description: 'Display name for the demo account' },
      { key: 'description', label: 'Description', type: 'text', required: true, description: 'Short description of the demo persona' },
      { key: 'email', label: 'Email', type: 'email', required: true, description: 'Must match an existing user account' },
      { key: 'password', label: 'Password', type: 'text', required: true, description: 'Must match the existing user\'s password' },
      { key: 'icon', label: 'Icon', type: 'text', required: false, defaultValue: '🎯', description: 'Emoji icon' },
      { key: 'tier_badge', label: 'Tier Badge', type: 'select', required: false, defaultValue: 'FREE TIER', options: ['FREE TIER', 'MEMBER TIER', 'PREMIUM TIER'] },
      { key: 'role_type', label: 'Role Type', type: 'text', required: false, defaultValue: 'member', description: 'Reference only: member, host, manager, etc.' },
      { key: 'is_active', label: 'Active', type: 'boolean', required: false, defaultValue: true, description: 'Whether to show on login page' },
      { key: 'display_order', label: 'Display Order', type: 'number', required: false, defaultValue: 0, description: 'Order on login page (0 = auto)' },
    ],
    onImport: handleBulkImport,
    validateRecord: (record) => {
      if (!record.label || !record.description || !record.email || !record.password) {
        return 'Missing required fields: label, description, email, or password';
      }
      
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
        return 'Invalid email format';
      }
      
      return null;
    },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading demo accounts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Demo Accounts' }
        ]}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Demo Accounts Manager</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure multiple demo accounts shown on the login page
          </p>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Demo accounts are display configurations only. The user accounts must already exist in your database. 
              When visitors click a demo, they'll login as the existing user with that email/password.
            </p>
          </div>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Demo Account
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle>Create New Demo Account</CardTitle>
            <CardDescription>Add a new demo option to the login page</CardDescription>
          </CardHeader>
          <CardContent>
            <DemoAccountForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleCreate}
              onCancel={cancelEdit}
            />
          </CardContent>
        </Card>
      )}

      {/* Demo Accounts List */}
      <div className="space-y-4">
        {demoAccounts.map((account, index) => (
          <Card
            key={account.id}
            className={`${
              !account.is_active ? 'opacity-50 bg-gray-50' : ''
            } ${editingId === account.id ? 'border-2 border-blue-400' : ''}`}
          >
            <CardContent className="pt-6">
              {editingId === account.id ? (
                <DemoAccountForm
                  formData={formData}
                  setFormData={setFormData}
                  onSave={() => handleUpdate(account.id)}
                  onCancel={cancelEdit}
                />
              ) : (
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-4xl">{account.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{account.label}</h3>
                          {account.tier_badge && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                              {account.tier_badge}
                            </span>
                          )}
                          {!account.is_active && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-medium">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{account.description}</p>
                        <div className="flex gap-4 mt-3 text-xs text-gray-500">
                          <span>📧 {account.email}</span>
                          <span>🔐 {account.password}</span>
                          <span>👤 {account.role_type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Reorder */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(account.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorder(account.id, 'down')}
                        disabled={index === demoAccounts.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>

                      {/* Toggle Active */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(account.id, account.is_active)}
                      >
                        {account.is_active ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(account)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id, account.label)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {demoAccounts.length === 0 && !isCreating && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No demo accounts configured yet.</p>
              <Button onClick={() => setIsCreating(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Demo Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Import Manager */}
      <BulkImportManager config={bulkImportConfig} />
    </div>
  );
}

// Form Component
interface DemoAccountFormProps {
  formData: Partial<DemoAccount>;
  setFormData: (data: Partial<DemoAccount>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function DemoAccountForm({ formData, setFormData, onSave, onCancel }: DemoAccountFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            value={formData.label || ''}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder="Premium Innovator"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Full platform + Market showcase"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="demo@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">Must match an existing user account's email</p>
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            value={formData.password || ''}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="demo123"
          />
          <p className="text-xs text-gray-500 mt-1">Must match the existing user's password</p>
        </div>

        <div>
          <Label htmlFor="icon">Icon (Emoji)</Label>
          <Input
            id="icon"
            value={formData.icon || ''}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="🚀"
          />
        </div>

        <div>
          <Label htmlFor="tier_badge">Tier Badge</Label>
          <select
            id="tier_badge"
            value={formData.tier_badge || 'FREE TIER'}
            onChange={(e) => setFormData({ ...formData, tier_badge: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="FREE TIER">FREE TIER</option>
            <option value="MEMBER TIER">MEMBER TIER</option>
            <option value="PREMIUM TIER">PREMIUM TIER</option>
          </select>
        </div>

        <div>
          <Label htmlFor="role_type">Role Type (Reference)</Label>
          <Input
            id="role_type"
            value={formData.role_type || ''}
            onChange={(e) => setFormData({ ...formData, role_type: e.target.value })}
            placeholder="member, host, manager"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Switch
            id="is_active"
            checked={formData.is_active || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active (Visible on Login)</Label>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={onSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}