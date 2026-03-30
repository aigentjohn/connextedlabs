import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Database,
  Users,
  FileText,
  Shield,
  RefreshCw,
  Download
} from 'lucide-react';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

interface CleanupCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  count: number;
  items: any[];
  danger: 'low' | 'medium' | 'high';
}

interface CleanupResults {
  category: string;
  deletedCount: number;
  errors: string[];
}

export default function DataCleanupManager() {
  const [categories, setCategories] = useState<CleanupCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<CleanupResults[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchCleanupData();
  }, []);

  const fetchCleanupData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data needed for cleanup analysis
      const [
        usersResult,
        postsResult,
        momentsResult,
        companiesResult,
        circlesResult,
        demoAccountsResult,
        claimableProfilesResult
      ] = await Promise.all([
        supabase.from('users').select('id, email, name, role, created_at'),
        supabase.from('posts').select('id, author_id, created_at'),
        supabase.from('moments').select('id, user_id'),
        supabase.from('companies').select('id, user_id'),
        supabase.from('circles').select('id, name, member_ids'),
        supabase.from('demo_accounts').select('id, user_id'),
        supabase.from('claimable_profiles').select('id, user_id, claimed')
      ]);

      const users = usersResult.data || [];
      const posts = postsResult.data || [];
      const moments = momentsResult.data || [];
      const companies = companiesResult.data || [];
      const circles = circlesResult.data || [];
      const demoAccounts = demoAccountsResult.data || [];
      const claimableProfiles = claimableProfilesResult.data || [];

      // Identify test accounts
      const testPatterns = ['test', 'temp', 'demo', 'fake', 'example', 'seed', 'sample'];
      const testAccounts = users.filter(u => 
        u.role !== 'platform_admin' && // Never delete platform admins
        u.role !== 'super' && // Never delete super admins
        testPatterns.some(pattern => 
          u.email?.toLowerCase().includes(pattern) || 
          u.name?.toLowerCase().includes(pattern)
        )
      );

      // Identify empty users (no content, not platform admin)
      const userIdsWithContent = new Set([
        ...posts.map(p => p.author_id),
        ...moments.map(m => m.user_id),
        ...companies.map(c => c.user_id)
      ]);

      const emptyUsers = users.filter(u => 
        !userIdsWithContent.has(u.id) && 
        u.role !== 'platform_admin' &&
        u.role !== 'super' &&
        !testAccounts.find(t => t.id === u.id) // Don't double count
      );

      // Identify orphaned posts
      const userIds = new Set(users.map(u => u.id));
      const orphanedPosts = posts.filter(p => !userIds.has(p.author_id));

      // Identify orphaned moments
      const orphanedMoments = moments.filter(m => !userIds.has(m.user_id));

      // Identify old demo accounts (if any configured but user no longer exists)
      const demoUserIds = new Set(demoAccounts.map(d => d.user_id));
      const orphanedDemoConfigs = demoAccounts.filter(d => !userIds.has(d.user_id));

      // Identify unclaimed profiles older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const staleClaimableProfiles = claimableProfiles.filter(p => 
        !p.claimed && 
        p.user_id && 
        !userIds.has(p.user_id)
      );

      // Build cleanup categories
      const cleanupCategories: CleanupCategory[] = [
        {
          id: 'test-accounts',
          name: 'Test & Seed Accounts',
          description: 'User accounts matching common test patterns (test@, temp@, demo@, etc.)',
          icon: Users,
          count: testAccounts.length,
          items: testAccounts,
          danger: 'medium'
        },
        {
          id: 'empty-users',
          name: 'Empty User Accounts',
          description: 'Users with no posts, moments, or companies',
          icon: Users,
          count: emptyUsers.length,
          items: emptyUsers,
          danger: 'low'
        },
        {
          id: 'orphaned-posts',
          name: 'Orphaned Posts',
          description: 'Posts whose authors no longer exist',
          icon: FileText,
          count: orphanedPosts.length,
          items: orphanedPosts,
          danger: 'low'
        },
        {
          id: 'orphaned-moments',
          name: 'Orphaned Moments',
          description: 'Moments whose owners no longer exist',
          icon: FileText,
          count: orphanedMoments.length,
          items: orphanedMoments,
          danger: 'low'
        },
        {
          id: 'orphaned-demo-configs',
          name: 'Orphaned Demo Configs',
          description: 'Demo account configurations for deleted users',
          icon: Database,
          count: orphanedDemoConfigs.length,
          items: orphanedDemoConfigs,
          danger: 'low'
        },
        {
          id: 'stale-claimable',
          name: 'Orphaned Claimable Profiles',
          description: 'Claimable profiles referencing deleted users',
          icon: Database,
          count: staleClaimableProfiles.length,
          items: staleClaimableProfiles,
          danger: 'low'
        }
      ].filter(cat => cat.count > 0); // Only show categories with items to clean

      setCategories(cleanupCategories);
    } catch (error: any) {
      console.error('Error fetching cleanup data:', error);
      toast.error('Failed to load cleanup data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const selectAll = () => {
    setSelectedCategories(new Set(categories.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedCategories(new Set());
  };

  const exportBackup = async () => {
    try {
      const selectedCats = categories.filter(c => selectedCategories.has(c.id));
      const backup = {
        timestamp: new Date().toISOString(),
        categories: selectedCats.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat.count,
          items: cat.items
        }))
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleanup-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup exported successfully');
    } catch (error: any) {
      console.error('Error exporting backup:', error);
      toast.error('Failed to export backup');
    }
  };

  const performCleanup = async () => {
    if (selectedCategories.size === 0) {
      toast.error('Please select at least one category to clean');
      return;
    }

    // Final confirmation
    const totalItems = categories
      .filter(c => selectedCategories.has(c.id))
      .reduce((sum, c) => sum + c.count, 0);

    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete ${totalItems} items across ${selectedCategories.size} categories.\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Have you exported a backup?\n\n` +
      `Click OK to proceed with deletion.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setShowResults(false);
    const cleanupResults: CleanupResults[] = [];

    try {
      for (const category of categories) {
        if (!selectedCategories.has(category.id)) continue;

        const result: CleanupResults = {
          category: category.name,
          deletedCount: 0,
          errors: []
        };

        try {
          switch (category.id) {
            case 'test-accounts':
            case 'empty-users':
              // Delete users and all their related data
              for (const user of category.items) {
                try {
                  // Delete user's posts
                  await supabase.from('posts').delete().eq('author_id', user.id);
                  
                  // Delete user's moments
                  await supabase.from('moments').delete().eq('user_id', user.id);
                  
                  // Delete user's companies
                  await supabase.from('companies').delete().eq('user_id', user.id);
                  
                  // Delete user's portfolios
                  await supabase.from('portfolios').delete().eq('user_id', user.id);
                  
                  // Delete user's circle memberships
                  await supabase.from('circle_memberships').delete().eq('user_id', user.id);
                  
                  // Delete user's connections
                  await supabase.from('connections').delete().or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
                  
                  // Delete demo account config if exists
                  await supabase.from('demo_accounts').delete().eq('user_id', user.id);
                  
                  // Finally delete the user
                  const { error: userDeleteError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', user.id);
                  
                  if (userDeleteError) throw userDeleteError;
                  
                  result.deletedCount++;
                } catch (error: any) {
                  result.errors.push(`Failed to delete user ${user.email}: ${error.message}`);
                }
              }
              break;

            case 'orphaned-posts':
              const postIds = category.items.map(p => p.id);
              if (postIds.length > 0) {
                const { error } = await supabase
                  .from('posts')
                  .delete()
                  .in('id', postIds);
                
                if (error) throw error;
                result.deletedCount = postIds.length;
              }
              break;

            case 'orphaned-moments':
              const momentIds = category.items.map(m => m.id);
              if (momentIds.length > 0) {
                const { error } = await supabase
                  .from('moments')
                  .delete()
                  .in('id', momentIds);
                
                if (error) throw error;
                result.deletedCount = momentIds.length;
              }
              break;

            case 'orphaned-demo-configs':
              const demoConfigIds = category.items.map(d => d.id);
              if (demoConfigIds.length > 0) {
                const { error } = await supabase
                  .from('demo_accounts')
                  .delete()
                  .in('id', demoConfigIds);
                
                if (error) throw error;
                result.deletedCount = demoConfigIds.length;
              }
              break;

            case 'stale-claimable':
              const claimableIds = category.items.map(c => c.id);
              if (claimableIds.length > 0) {
                const { error } = await supabase
                  .from('claimable_profiles')
                  .delete()
                  .in('id', claimableIds);
                
                if (error) throw error;
                result.deletedCount = claimableIds.length;
              }
              break;
          }
        } catch (error: any) {
          result.errors.push(`Category error: ${error.message}`);
        }

        cleanupResults.push(result);
      }

      setResults(cleanupResults);
      setShowResults(true);
      
      const totalDeleted = cleanupResults.reduce((sum, r) => sum + r.deletedCount, 0);
      const totalErrors = cleanupResults.reduce((sum, r) => sum + r.errors.length, 0);
      
      if (totalErrors === 0) {
        toast.success(`Successfully deleted ${totalDeleted} items`);
      } else {
        toast.warning(`Deleted ${totalDeleted} items with ${totalErrors} errors. Check results for details.`);
      }

      // Refresh the data
      await fetchCleanupData();
      deselectAll();
    } catch (error: any) {
      console.error('Error during cleanup:', error);
      toast.error('Cleanup failed: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDangerColor = (danger: string) => {
    switch (danger) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-orange-300 bg-orange-50';
      case 'low': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getDangerBadgeColor = (danger: string) => {
    switch (danger) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-orange-600 text-white';
      case 'low': return 'bg-yellow-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Analyzing data for cleanup...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Data Cleanup' }
        ]}
      />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Data Cleanup Manager</h2>
          <p className="text-sm text-gray-600 mt-1">
            Safely remove test data, empty accounts, and orphaned content
          </p>
        </div>
        <Button onClick={fetchCleanupData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <Alert className="border-red-300 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Dangerous Operation</AlertTitle>
        <AlertDescription className="text-red-700">
          Data deletion is <strong>permanent and cannot be undone</strong>. 
          Always export a backup before proceeding with cleanup.
        </AlertDescription>
      </Alert>

      {/* Summary Stats */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Categories Available</p>
                <p className="text-3xl font-bold mt-1">{categories.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Items to Clean</p>
                <p className="text-3xl font-bold mt-1">
                  {categories.reduce((sum, c) => sum + c.count, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Selected for Deletion</p>
                <p className="text-3xl font-bold mt-1 text-red-600">
                  {categories
                    .filter(c => selectedCategories.has(c.id))
                    .reduce((sum, c) => sum + c.count, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Data to Clean */}
      {categories.length === 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <h3 className="font-semibold text-lg">Database is Clean!</h3>
                <p className="text-sm">No test data, empty accounts, or orphaned content detected.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Categories */}
      {categories.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Select Categories to Clean</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {categories.map(category => {
              const Icon = category.icon;
              const isSelected = selectedCategories.has(category.id);
              
              return (
                <Card 
                  key={category.id} 
                  className={`cursor-pointer transition-all ${
                    isSelected ? getDangerColor(category.danger) + ' border-2' : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleCategory(category.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <Icon className="w-6 h-6 text-gray-500 mt-0.5" />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{category.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getDangerBadgeColor(category.danger)}`}>
                              {category.danger.toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-gray-200 rounded-full text-sm font-semibold">
                              {category.count}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        
                        {/* Preview items */}
                        {isSelected && category.items.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded border space-y-1 max-h-40 overflow-y-auto">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Items to be deleted:</p>
                            {category.items.slice(0, 10).map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 py-1 border-b last:border-0">
                                {item.email || item.name || `ID: ${item.id}`}
                              </div>
                            ))}
                            {category.items.length > 10 && (
                              <p className="text-xs text-gray-500 pt-1">
                                ... and {category.items.length - 10} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={exportBackup}
              disabled={selectedCategories.size === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Backup First
            </Button>
            
            <Button
              variant="destructive"
              onClick={performCleanup}
              disabled={selectedCategories.size === 0 || isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected Items
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Results Display */}
      {showResults && results.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div key={idx} className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.category}</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.errors.length === 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {result.deletedCount} deleted
                    </span>
                  </div>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-red-700">Errors:</p>
                      {result.errors.map((error, errorIdx) => (
                        <p key={errorIdx} className="text-xs text-red-600">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}