// Split candidate: ~597 lines — consider extracting NavigationConfigPanel, ContainerVisibilityForm, and ContainerDefaultsPanel into sub-components.
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Save, RotateCcw, Settings, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface ContainerType {
  type_code: string;
  display_name: string;
  description: string | null;
  icon_name: string;
  route_path: string;
  sort_order: number;
}

interface UserClassPermission {
  id?: string;
  class_number: number;
  container_type: string;
  visible: boolean;
  sort_order: number;
}

export default function ContainerConfigurationPage() {
  const { profile } = useAuth();
  const [containers, setContainers] = useState<ContainerType[]>([]);
  const [permissions, setPermissions] = useState<UserClassPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const userClasses = [
    { number: 1, name: 'Class 1 - Starter' },
    { number: 2, name: 'Class 2 - Basic' },
    { number: 3, name: 'Class 3 - Member' },
    { number: 4, name: 'Class 4 - Plus' },
    { number: 5, name: 'Class 5 - Advanced' },
    { number: 6, name: 'Class 6 - Pro' },
    { number: 7, name: 'Class 7 - Premium' },
    { number: 8, name: 'Class 8 - Enterprise' },
    { number: 9, name: 'Class 9 - Executive' },
    { number: 10, name: 'Class 10 - Unlimited' },
  ];

  useEffect(() => {
    if (profile?.role === 'super') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMigrationNeeded(false);

      // Fetch all container types
      const { data: containersData, error: containersError } = await supabase
        .from('container_types')
        .select('*')
        .order('sort_order', { ascending: true });

      if (containersError) {
        console.warn('Container types table not found - migrations needed');
        setMigrationNeeded(true);
        setLoading(false);
        return;
      }

      // Fetch all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('user_class_permissions')
        .select('*');

      if (permsError) {
        console.warn('User class permissions table not found - migrations needed');
        setMigrationNeeded(true);
        setLoading(false);
        return;
      }

      setContainers(containersData || []);
      setPermissions(permsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMigrationNeeded(true);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (classNumber: number, containerType: string) => {
    return permissions.some(
      p => p.class_number === classNumber && p.container_type === containerType && p.visible
    );
  };

  const togglePermission = (classNumber: number, containerType: string) => {
    const existingPermIndex = permissions.findIndex(
      p => p.class_number === classNumber && p.container_type === containerType
    );

    // Get the sort_order from the container type
    const container = containers.find(c => c.type_code === containerType);
    const sortOrder = container?.sort_order || 0;

    if (existingPermIndex >= 0) {
      // Toggle existing permission
      const updatedPermissions = [...permissions];
      updatedPermissions[existingPermIndex] = {
        ...updatedPermissions[existingPermIndex],
        visible: !updatedPermissions[existingPermIndex].visible,
        sort_order: sortOrder // Update sort_order from container
      };
      setPermissions(updatedPermissions);
    } else {
      // Add new permission
      setPermissions([
        ...permissions,
        {
          class_number: classNumber,
          container_type: containerType,
          visible: true,
          sort_order: sortOrder
        }
      ]);
    }

    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete all existing permissions
      const { error: deleteError } = await supabase
        .from('user_class_permissions')
        .delete()
        .neq('class_number', 0); // Delete all

      if (deleteError && !deleteError.message.includes('0 rows')) {
        console.error('Delete error:', deleteError);
        throw new Error(`Failed to clear existing permissions: ${deleteError.message}`);
      }

      // Insert visible permissions only (with sort_order)
      const visiblePermissions = permissions.filter(p => p.visible).map(p => ({
        class_number: p.class_number,
        container_type: p.container_type,
        visible: true,
        sort_order: p.sort_order
      }));

      if (visiblePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_class_permissions')
          .insert(visiblePermissions);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Failed to save permissions: ${insertError.message}`);
        }
      }

      toast.success('Configuration saved successfully!');
      setHasChanges(false);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Discard all changes and reload from database?')) {
      fetchData();
      setHasChanges(false);
    }
  };

  const toggleAllForClass = (classNumber: number, visible: boolean) => {
    const updatedPermissions = [...permissions];
    
    containers.forEach(container => {
      const existingIndex = updatedPermissions.findIndex(
        p => p.class_number === classNumber && p.container_type === container.type_code
      );

      if (existingIndex >= 0) {
        updatedPermissions[existingIndex] = {
          ...updatedPermissions[existingIndex],
          visible,
          sort_order: container.sort_order
        };
      } else {
        updatedPermissions.push({
          class_number: classNumber,
          container_type: container.type_code,
          visible: visible,
          sort_order: container.sort_order
        });
      }
    });

    setPermissions(updatedPermissions);
    setHasChanges(true);
  };

  const toggleAllForContainer = (containerType: string, visible: boolean) => {
    const updatedPermissions = [...permissions];
    const container = containers.find(c => c.type_code === containerType);
    const sortOrder = container?.sort_order || 0;
    
    userClasses.forEach(userClass => {
      const existingIndex = updatedPermissions.findIndex(
        p => p.class_number === userClass.number && p.container_type === containerType
      );

      if (existingIndex >= 0) {
        updatedPermissions[existingIndex] = {
          ...updatedPermissions[existingIndex],
          visible,
          sort_order: sortOrder
        };
      } else {
        updatedPermissions.push({
          class_number: userClass.number,
          container_type: containerType,
          visible: visible,
          sort_order: sortOrder
        });
      }
    });

    setPermissions(updatedPermissions);
    setHasChanges(true);
  };

  if (!profile || profile.role !== 'super') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You don't have admin access</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show migration needed message
  if (migrationNeeded) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Link to="/platform-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>

        <Breadcrumbs 
          items={[
            { label: 'Platform Admin', path: '/platform-admin' },
            { label: 'Container Configuration' }
          ]} 
        />

        <Card className="bg-yellow-50 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-yellow-700" />
              Database Migrations Required
            </CardTitle>
            <CardDescription>
              The container configuration feature requires database tables that haven't been created yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-yellow-900">What's Happening?</h3>
              <p className="text-sm text-yellow-800">
                The app is currently using <strong>hardcoded default navigation</strong> based on user class.
                This works fine, but doesn't allow you to customize which containers each class can see.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-yellow-900">Current Default Behavior:</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li><strong>Class 1-2:</strong> Home, News, Circles, Calendar (4 containers)</li>
                <li><strong>Class 3-6:</strong> Adds Tables, Meetings, Libraries, Checklists (8 containers)</li>
                <li><strong>Class 7-9:</strong> Adds Standups, Sprints (10 containers)</li>
                <li><strong>Class 10:</strong> All 14 containers</li>
                <li><strong>Admins:</strong> Always see all containers</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-yellow-900">To Enable This Feature:</h3>
              <p className="text-sm text-yellow-800">
                Apply the following database migrations in your Supabase SQL Editor:
              </p>
              <ol className="text-sm text-yellow-800 space-y-2 list-decimal list-inside ml-2">
                <li>
                  <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                    /supabase/migrations/20260124000003_create_container_types.sql
                  </code>
                </li>
                <li>
                  <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                    /supabase/migrations/20260124000004_create_user_class_permissions.sql
                  </code>
                </li>
              </ol>
            </div>

            <div className="bg-yellow-100 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-yellow-900 mb-2">Quick Steps:</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside ml-2">
                <li>Go to your Supabase project dashboard</li>
                <li>Click <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Click <strong>New Query</strong></li>
                <li>Copy and paste each migration file content</li>
                <li>Click <strong>Run</strong> for each migration</li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                className="flex-1"
              >
                Open Supabase SQL Editor
              </Button>
              <Button 
                variant="outline"
                onClick={fetchData}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            </div>

            <p className="text-xs text-yellow-700 mt-4">
              <strong>Note:</strong> Your app is working fine with defaults. This page only unlocks 
              advanced customization features. See <code>/APPLY_MIGRATIONS_FIRST.md</code> for details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getVisibleCountForClass = (classNumber: number) => {
    return containers.filter(c => hasPermission(classNumber, c.type_code)).length;
  };

  const getVisibleCountForContainer = (containerType: string) => {
    return userClasses.filter(uc => hasPermission(uc.number, containerType)).length;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/platform-admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Container Configuration' }
        ]} 
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Container Configuration</h1>
          <p className="text-gray-600">Configure which container types are visible in the header navigation for each user class</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard Changes
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">Header Navigation Visibility</h3>
              <p className="text-sm text-blue-800">
                Control which containers appear in the header navigation for each user class.
                Users will only see containers that are checked for their class level.
                Admins always see all containers regardless of these settings.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Tip:</strong> Start with minimal containers for Class 1 (Guest), add more as classes increase.
                Reserve special containers (Elevators, Pitches, Builds, Meetups) for sponsor sidebar only (Phase 3).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Container Visibility Matrix</CardTitle>
          <CardDescription>Click cells to toggle visibility for each class/container combination</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">Container Type</th>
                  {userClasses.map(uc => (
                    <th key={uc.number} className="text-center py-3 px-2 font-medium text-gray-700 border-b">
                      <div className="text-xs mb-1">C{uc.number}</div>
                      <div className="flex gap-1 justify-center mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-xs px-1"
                          onClick={() => toggleAllForClass(uc.number, true)}
                          title="Select all"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-xs px-1"
                          onClick={() => toggleAllForClass(uc.number, false)}
                          title="Clear all"
                        >
                          None
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 font-medium text-gray-700 border-b">Total</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container) => {
                  const visibleCount = getVisibleCountForContainer(container.type_code);
                  return (
                    <tr key={container.type_code} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{container.display_name}</div>
                          <Badge variant="outline" className="text-xs">{container.type_code}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{container.route_path}</div>
                      </td>
                      {userClasses.map(uc => {
                        const checked = hasPermission(uc.number, container.type_code);
                        return (
                          <td key={uc.number} className="text-center py-3 px-2">
                            <button
                              onClick={() => togglePermission(uc.number, container.type_code)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                checked
                                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={checked ? 'Visible' : 'Hidden'}
                            >
                              {checked ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-4">
                        <div className="text-sm">
                          <span className="font-medium">{visibleCount}</span>
                          <span className="text-gray-500"> / 10</span>
                        </div>
                        <div className="flex gap-1 justify-center mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-xs px-1"
                            onClick={() => toggleAllForContainer(container.type_code, true)}
                            title="Show for all classes"
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-xs px-1"
                            onClick={() => toggleAllForContainer(container.type_code, false)}
                            title="Hide from all classes"
                          >
                            None
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-3 px-4 font-medium">Total Visible</td>
                  {userClasses.map(uc => {
                    const count = getVisibleCountForClass(uc.number);
                    return (
                      <td key={uc.number} className="text-center py-3 px-2">
                        <div className="font-medium text-sm">
                          {count} / {containers.length}
                        </div>
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {userClasses.slice(0, 5).map(uc => {
          const count = getVisibleCountForClass(uc.number);
          return (
            <Card key={uc.number}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Badge variant="outline" className="mb-2">Class {uc.number}</Badge>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-gray-600">containers visible</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save reminder */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-indigo-500 rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium mb-2">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}