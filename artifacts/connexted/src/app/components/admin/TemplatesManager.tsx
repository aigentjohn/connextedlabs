import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Package, 
  Users, 
  FileText,
  Lock,
  Unlock,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface CommunityTemplate {
  id: string;
  community_id: string;
  name: string;
  description: string;
  icon: string;
  is_default: boolean;
  active: boolean;
  requires_passcode: boolean;
  passcode: string | null;
  passcode_hint: string | null;
  created_at: string;
}

interface TemplateCircle {
  id: string;
  template_id: string;
  circle_name: string;
  circle_description: string;
  circle_type: string;
  auto_approve: boolean;
  set_as_primary: boolean;
  sort_order: number;
}

interface TemplateContent {
  id: string;
  template_id: string;
  content_type: string;
  title: string;
  body: string;
  author_name: string;
  target_circle_index: number;
  pin_to_top: boolean;
  sort_order: number;
}

export default function TemplatesManager() {
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunityTemplate | null>(null);
  const [templateCircles, setTemplateCircles] = useState<TemplateCircle[]>([]);
  const [templateContent, setTemplateContent] = useState<TemplateContent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Form state for new/edit template
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Package',
    is_default: false,
    requires_passcode: false,
    passcode: '',
    passcode_hint: '',
  });

  // Form state for new circle
  const [newCircle, setNewCircle] = useState({
    circle_name: '',
    circle_description: '',
    circle_type: 'private',
    auto_approve: true,
    set_as_primary: false,
  });

  // Form state for new content
  const [newContent, setNewContent] = useState({
    content_type: 'news',
    title: '',
    body: '',
    author_name: 'Community Admin',
    target_circle_index: 0,
    pin_to_top: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setMigrationNeeded(false);
    try {
      const { data, error } = await supabase
        .from('community_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Community templates table not found - migrations needed:', error);
        setMigrationNeeded(true);
        setLoading(false);
        return;
      }
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      setMigrationNeeded(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId: string) => {
    try {
      // Fetch circles
      const { data: circles, error: circlesError } = await supabase
        .from('template_circles')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (circlesError) throw circlesError;
      setTemplateCircles(circles || []);

      // Fetch content
      const { data: content, error: contentError } = await supabase
        .from('template_content')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (contentError) throw contentError;
      setTemplateContent(content || []);
    } catch (error: any) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    }
  };

  const handleSelectTemplate = (template: CommunityTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(false);
    setIsCreating(false);
    fetchTemplateDetails(template.id);
    setFormData({
      name: template.name,
      description: template.description || '',
      icon: template.icon,
      is_default: template.is_default,
      requires_passcode: template.requires_passcode,
      passcode: template.passcode || '',
      passcode_hint: template.passcode_hint || '',
    });
  };

  const handleCreateTemplate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
    setTemplateCircles([]);
    setTemplateContent([]);
    setFormData({
      name: '',
      description: '',
      icon: 'Package',
      is_default: false,
      requires_passcode: false,
      passcode: '',
      passcode_hint: '',
    });
  };

  const handleSaveTemplate = async () => {
    try {
      if (isCreating) {
        // Create new template
        const { data, error } = await supabase
          .from('community_templates')
          .insert({
            community_id: '550e8400-e29b-41d4-a716-446655440000', // Default community
            ...formData,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Template created successfully');
        setSelectedTemplate(data);
        setIsCreating(false);
        fetchTemplates();
      } else if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('community_templates')
          .update(formData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
        setIsEditing(false);
        fetchTemplates();
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('community_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted successfully');
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleAddCircle = async () => {
    if (!selectedTemplate || !newCircle.circle_name) {
      toast.error('Please enter a circle name');
      return;
    }

    try {
      const { error } = await supabase
        .from('template_circles')
        .insert({
          template_id: selectedTemplate.id,
          ...newCircle,
          sort_order: templateCircles.length,
        });

      if (error) throw error;
      toast.success('Circle added to template');
      fetchTemplateDetails(selectedTemplate.id);
      setNewCircle({
        circle_name: '',
        circle_description: '',
        circle_type: 'private',
        auto_approve: true,
        set_as_primary: false,
      });
    } catch (error: any) {
      console.error('Error adding circle:', error);
      toast.error('Failed to add circle');
    }
  };

  const handleDeleteCircle = async (circleId: string) => {
    try {
      const { error } = await supabase
        .from('template_circles')
        .delete()
        .eq('id', circleId);

      if (error) throw error;
      toast.success('Circle removed from template');
      if (selectedTemplate) {
        fetchTemplateDetails(selectedTemplate.id);
      }
    } catch (error: any) {
      console.error('Error deleting circle:', error);
      toast.error('Failed to delete circle');
    }
  };

  const handleAddContent = async () => {
    if (!selectedTemplate || !newContent.title) {
      toast.error('Please enter a content title');
      return;
    }

    try {
      const { error } = await supabase
        .from('template_content')
        .insert({
          template_id: selectedTemplate.id,
          ...newContent,
          sort_order: templateContent.length,
        });

      if (error) throw error;
      toast.success('Content added to template');
      fetchTemplateDetails(selectedTemplate.id);
      setNewContent({
        content_type: 'news',
        title: '',
        body: '',
        author_name: 'Community Admin',
        target_circle_index: 0,
        pin_to_top: false,
      });
    } catch (error: any) {
      console.error('Error adding content:', error);
      toast.error('Failed to add content');
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('template_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      toast.success('Content removed from template');
      if (selectedTemplate) {
        fetchTemplateDetails(selectedTemplate.id);
      }
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  if (migrationNeeded) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="bg-yellow-50 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-700" />
              Database Migration Required
            </CardTitle>
            <CardDescription>
              The Community Templates feature requires database tables that haven't been created yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-yellow-900">What Are Community Templates?</h3>
              <p className="text-sm text-yellow-800">
                Templates allow you to create pre-configured onboarding experiences for new members. 
                When users join a community, they can automatically:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside ml-2">
                <li>Be added to specific circles</li>
                <li>Receive welcome content and resources</li>
                <li>Get cohort-specific configurations via passcodes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-yellow-900">To Enable This Feature:</h3>
              <p className="text-sm text-yellow-800">
                Apply the following database migration in your Supabase SQL Editor:
              </p>
              <div className="bg-yellow-100 rounded p-3 mt-2">
                <code className="text-xs text-yellow-900 break-all">
                  /supabase/migrations/20260128_community_templates.sql
                </code>
              </div>
            </div>

            <div className="bg-yellow-100 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Quick Steps:</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside ml-2">
                <li>Go to your Supabase project dashboard</li>
                <li>Click <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Click <strong>New Query</strong></li>
                <li>Copy and paste the migration file content</li>
                <li>Click <strong>Run</strong></li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                className="flex-1"
              >
                Open Supabase SQL Editor
              </Button>
              <Button 
                variant="outline"
                onClick={fetchTemplates}
                className="flex-1"
              >
                <Package className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            </div>

            <p className="text-xs text-yellow-700">
              <strong>Note:</strong> This feature is optional. Your platform works fine without it. 
              Templates just make onboarding easier for multi-cohort or tiered communities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Community Templates' }
        ]}
      />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community Templates</h1>
          <p className="text-gray-600 mt-1">
            Create onboarding templates that auto-provision circles and content for new members
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Select a template to view or edit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No templates yet. Create one to get started.
                  </p>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                          </div>
                          {template.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex gap-1 mt-2">
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                            {template.requires_passcode && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Passcode
                              </Badge>
                            )}
                            {!template.active && (
                              <Badge variant="destructive" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Details */}
        <div className="lg:col-span-2">
          {!selectedTemplate && !isCreating ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Select a template to view details</p>
                  <p className="text-sm mt-1">or create a new one</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {isCreating ? 'New Template' : isEditing ? 'Edit Template' : formData.name}
                    </CardTitle>
                    <CardDescription>
                      {isCreating || isEditing
                        ? 'Configure template settings, circles, and content'
                        : formData.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isCreating && !isEditing && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectedTemplate && handleDeleteTemplate(selectedTemplate.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    {(isCreating || isEditing) && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => {
                          setIsCreating(false);
                          setIsEditing(false);
                        }}>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveTemplate}>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="settings" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="circles">Circles</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                  </TabsList>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Entrepreneur Starter Pack"
                        disabled={!isCreating && !isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe what new members will get with this template"
                        disabled={!isCreating && !isEditing}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          disabled={!isCreating && !isEditing}
                          className="rounded"
                        />
                        <span className="text-sm">Set as default template</span>
                      </label>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Passcode Protection
                      </h3>

                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.requires_passcode}
                            onChange={(e) => setFormData({ ...formData, requires_passcode: e.target.checked })}
                            disabled={!isCreating && !isEditing}
                            className="rounded"
                          />
                          <span className="text-sm">Require passcode for this template</span>
                        </label>
                      </div>

                      {formData.requires_passcode && (
                        <div className="space-y-3 ml-6">
                          <div className="space-y-2">
                            <Label htmlFor="passcode">Passcode</Label>
                            <Input
                              id="passcode"
                              value={formData.passcode}
                              onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                              placeholder="e.g., PREMIUM2024"
                              disabled={!isCreating && !isEditing}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="passcode_hint">Passcode Hint (optional)</Label>
                            <Input
                              id="passcode_hint"
                              value={formData.passcode_hint}
                              onChange={(e) => setFormData({ ...formData, passcode_hint: e.target.value })}
                              placeholder="e.g., Contact your cohort leader for access"
                              disabled={!isCreating && !isEditing}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Circles Tab */}
                  <TabsContent value="circles" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Auto-Join Circles
                      </h3>
                      <p className="text-sm text-gray-600">
                        When users join with this template, they'll automatically be added to these circles.
                      </p>

                      {templateCircles.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No circles configured yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {templateCircles.map((circle, index) => (
                            <div key={circle.id} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                                    <h4 className="font-semibold">{circle.circle_name}</h4>
                                  </div>
                                  {circle.circle_description && (
                                    <p className="text-sm text-gray-600 mt-1">{circle.circle_description}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {circle.circle_type}
                                    </Badge>
                                    {circle.auto_approve && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Auto-approve
                                      </Badge>
                                    )}
                                    {circle.set_as_primary && (
                                      <Badge className="text-xs">Primary</Badge>
                                    )}
                                  </div>
                                </div>
                                {(isCreating || isEditing) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCircle(circle.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedTemplate && (
                        <div className="border-t pt-4 mt-4 space-y-3">
                          <h4 className="font-medium text-sm">Add Circle</h4>
                          <div className="space-y-2">
                            <Input
                              placeholder="Circle name"
                              value={newCircle.circle_name}
                              onChange={(e) => setNewCircle({ ...newCircle, circle_name: e.target.value })}
                            />
                            <Textarea
                              placeholder="Circle description (optional)"
                              value={newCircle.circle_description}
                              onChange={(e) => setNewCircle({ ...newCircle, circle_description: e.target.value })}
                              rows={2}
                            />
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newCircle.auto_approve}
                                  onChange={(e) => setNewCircle({ ...newCircle, auto_approve: e.target.checked })}
                                  className="rounded"
                                />
                                <span className="text-sm">Auto-approve members</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newCircle.set_as_primary}
                                  onChange={(e) => setNewCircle({ ...newCircle, set_as_primary: e.target.checked })}
                                  className="rounded"
                                />
                                <span className="text-sm">Set as primary circle</span>
                              </label>
                            </div>
                            <Button onClick={handleAddCircle} size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Circle
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Welcome Content
                      </h3>
                      <p className="text-sm text-gray-600">
                        Content items that will be automatically created when users join.
                      </p>

                      {templateContent.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No content configured yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {templateContent.map((content) => (
                            <div key={content.id} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{content.title}</h4>
                                  {content.body && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{content.body}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {content.content_type}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      Circle #{content.target_circle_index + 1}
                                    </Badge>
                                    {content.pin_to_top && (
                                      <Badge className="text-xs">Pinned</Badge>
                                    )}
                                  </div>
                                </div>
                                {(isCreating || isEditing) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteContent(content.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedTemplate && (
                        <div className="border-t pt-4 mt-4 space-y-3">
                          <h4 className="font-medium text-sm">Add Content</h4>
                          <div className="space-y-2">
                            <Input
                              placeholder="Content title"
                              value={newContent.title}
                              onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                            />
                            <Textarea
                              placeholder="Content body"
                              value={newContent.body}
                              onChange={(e) => setNewContent({ ...newContent, body: e.target.value })}
                              rows={3}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="target_circle" className="text-xs">Target Circle</Label>
                                <select
                                  id="target_circle"
                                  className="w-full border rounded px-3 py-2 text-sm"
                                  value={newContent.target_circle_index}
                                  onChange={(e) => setNewContent({ ...newContent, target_circle_index: parseInt(e.target.value) })}
                                >
                                  {templateCircles.map((circle, index) => (
                                    <option key={circle.id} value={index}>
                                      #{index + 1} - {circle.circle_name}
                                    </option>
                                  ))}
                                  {templateCircles.length === 0 && (
                                    <option value={0}>No circles configured</option>
                                  )}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="content_type" className="text-xs">Type</Label>
                                <select
                                  id="content_type"
                                  className="w-full border rounded px-3 py-2 text-sm"
                                  value={newContent.content_type}
                                  onChange={(e) => setNewContent({ ...newContent, content_type: e.target.value })}
                                >
                                  <option value="news">News</option>
                                  <option value="guide">Guide</option>
                                  <option value="resource">Resource</option>
                                </select>
                              </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newContent.pin_to_top}
                                onChange={(e) => setNewContent({ ...newContent, pin_to_top: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">Pin to top</span>
                            </label>
                            <Button onClick={handleAddContent} size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Content
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}