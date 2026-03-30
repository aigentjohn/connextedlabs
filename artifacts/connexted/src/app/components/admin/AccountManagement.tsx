// Split candidate: ~575 lines — consider extracting AccountPasswordSection, AccountDangerZone, and AccountProfileSync into sub-components.
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Copy,
  Database,
  RefreshCw,
  FileText,
  Lock,
  UserX,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Textarea } from '@/app/components/ui/textarea';
import { copyToClipboard } from '@/lib/clipboard-utils';

interface AccountExport {
  version: string;
  exportDate: string;
  userData: {
    email: string;
    name: string;
    bio?: string;
    profile_image_url?: string;
    [key: string]: any;
  };
  circles: any[];
  programs: any[];
  posts: any[];
  events: any[];
  memberships: any[];
  libraries: any[];
  connections: any[];
  tags: any[];
  settings?: any;
}

interface AccountManagementProps {
  currentUserId: string;
  accessToken: string;
}

export function AccountManagement({ currentUserId, accessToken }: AccountManagementProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [exportData, setExportData] = useState<AccountExport | null>(null);
  const [importJson, setImportJson] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Import options
  const [importMode, setImportMode] = useState<'create' | 'restore' | 'merge'>('create');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/account/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId: selectedUserId }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Export failed');
      }

      setExportData(result.data);
      toast.success('Account exported successfully!', {
        description: 'You can now download or preview the JSON data.',
      });
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to export account', {
        description: `${errorMessage}. The Edge Function may not be deployed yet.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJson = () => {
    if (!exportData) return;

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `account-export-${exportData.userData.email}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('JSON file downloaded!');
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Parse the JSON
      let accountData: AccountExport;
      try {
        accountData = JSON.parse(importJson);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      // Validate required fields
      if (!accountData.version || !accountData.userData) {
        throw new Error('Invalid account export format');
      }

      // Prepare import options
      const options: any = {
        mode: importMode,
      };

      if (importMode === 'create') {
        if (!newEmail || !newPassword) {
          throw new Error('Email and password required for creating new account');
        }
        options.newEmail = newEmail;
        options.newPassword = newPassword;
      } else {
        options.userId = selectedUserId;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/account/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ accountData, options }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      toast.success('Account imported successfully!', {
        description: result.message,
      });

      // Clear form
      setImportJson('');
      setNewEmail('');
      setNewPassword('');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import account', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      toast.success('File loaded successfully');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const previewData = () => {
    if (!exportData) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Export Version</p>
            <p className="text-gray-600">{exportData.version}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Export Date</p>
            <p className="text-gray-600">{new Date(exportData.exportDate).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">User Email</p>
            <p className="text-gray-600">{exportData.userData.email}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">User Name</p>
            <p className="text-gray-600">{exportData.userData.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.circles.length}</p>
                <p className="text-sm text-gray-600">Circles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.programs.length}</p>
                <p className="text-sm text-gray-600">Programs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.posts.length}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.events.length}</p>
                <p className="text-sm text-gray-600">Events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.libraries.length}</p>
                <p className="text-sm text-gray-600">Libraries</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{exportData.connections.length}</p>
                <p className="text-sm text-gray-600">Connections</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
          <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(exportData, null, 2)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Account Management' }
        ]}
      />
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Management</h2>
        <p className="text-gray-600">
          Export accounts to JSON for backup, import JSON to create or restore accounts
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Account</TabsTrigger>
          <TabsTrigger value="import">Import Account</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Note:</strong> This feature requires Supabase Edge Functions to be deployed. 
              If you see export errors, the backend functions may not be set up yet.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Account to JSON
              </CardTitle>
              <CardDescription>
                Export a complete account snapshot including all data, settings, and content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID to Export</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  You can only export your own account unless you're a Platform Admin
                </p>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || !selectedUserId}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Account
                  </>
                )}
              </Button>

              {exportData && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-3">
                      <p className="font-medium">Export completed successfully!</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={downloadJson} variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download JSON
                        </Button>
                        <Button size="sm" onClick={() => copyToClipboard(JSON.stringify(exportData, null, 2))} variant="outline">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button size="sm" onClick={() => setShowPreview(true)} variant="outline">
                          <Database className="w-4 h-4 mr-2" />
                          Preview Data
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Account from JSON
              </CardTitle>
              <CardDescription>
                Create new accounts, restore backups, or merge data from JSON exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Platform Admin Only:</strong> Only platform administrators can import accounts
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="importMode">Import Mode</Label>
                <Select value={importMode} onValueChange={(value: any) => setImportMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create New Account</SelectItem>
                    <SelectItem value="restore">Restore to Existing Account</SelectItem>
                    <SelectItem value="merge">Merge with Existing Account</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {importMode === 'create' && 'Creates a brand new user account with the imported data'}
                  {importMode === 'restore' && 'Overwrites all data for an existing account'}
                  {importMode === 'merge' && 'Adds imported data to existing account without overwriting'}
                </p>
              </div>

              {importMode === 'create' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">New Account Credentials</p>
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email Address</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="demo@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(importMode === 'restore' || importMode === 'merge') && (
                <div className="space-y-2">
                  <Label htmlFor="targetUserId">Target User ID</Label>
                  <Input
                    id="targetUserId"
                    placeholder="Enter user ID"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>JSON Data</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Load from File
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={loadFromFile}
                  />
                </div>
                <Textarea
                  placeholder="Paste JSON data here or load from file..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting || !importJson}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Use Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Common Use Cases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3 p-3 bg-purple-50 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">Create Demo Account</p>
                    <p className="text-sm text-purple-700">
                      Export a fully-populated test account, edit the JSON (change email), then import as "Create New Account" with demo credentials
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
                  <Save className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Backup & Archive</p>
                    <p className="text-sm text-green-700">
                      Export accounts regularly as JSON backups. Store them safely and restore when needed
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                  <UserX className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Account Templates</p>
                    <p className="text-sm text-blue-700">
                      Create template accounts for different user types (member, admin, sponsor) and quickly spin up test accounts
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Account Export Preview</DialogTitle>
            <DialogDescription>
              Review the exported account data
            </DialogDescription>
          </DialogHeader>
          {previewData()}
        </DialogContent>
      </Dialog>
    </div>
  );
}