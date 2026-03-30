import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { AlertCircle, CheckCircle, Copy, Download, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard-utils';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function ChecklistsSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const initializeChecklistsSystem = async () => {
    try {
      const { data, error } = await supabase.rpc('initialize_checklists_system');
      
      if (error) {
        return { success: false, error, message: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error, message: error.message };
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    setShowManualInstructions(false);
    
    try {
      const result = await initializeChecklistsSystem();
      
      if (result.success) {
        setIsComplete(true);
        toast.success('Checklists & Sprints system initialized successfully!');
      } else {
        // Check if it's a "function not found" error
        if (result.error?.message?.includes('function') || result.error?.code === '42883' || result.error?.code === 'PGRST202') {
          const msg = 'Automatic setup is not available. Please use the manual SQL migration.';
          setErrorMessage(msg);
          setShowManualInstructions(true);
          toast.error(msg);
        } else {
          const msg = result.message || result.error?.message || 'Unknown error';
          setErrorMessage(msg);
          setShowManualInstructions(true);
          toast.error(`Setup failed: ${msg}`);
        }
      }
    } catch (error: any) {
      const msg = error.message || 'Unknown error';
      setErrorMessage(msg);
      setShowManualInstructions(true);
      toast.error(`Setup failed: ${msg}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const copySQLToClipboard = async () => {
    try {
      const response = await fetch('/migrations/001_initialize_checklists_sprints.sql');
      const sqlContent = await response.text();
      await copyToClipboard(sqlContent, 'SQL migration');
    } catch (error) {
      toast.error('Failed to load SQL file. Please download it instead.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <Breadcrumbs
        items={[
          { label: 'Lists', path: '/checklists' },
          { label: 'Setup' },
        ]}
      />

      <div className="text-center space-y-2">
        <CheckSquare className="w-16 h-16 text-indigo-600 mx-auto" />
        <h1 className="text-3xl font-bold text-gray-900">Setup Lists & Sprints System</h1>
        <p className="text-gray-600">
          Initialize the database tables and policies for Lists and Sprints
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>
            Click the button below to automatically set up the Lists & Sprints feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isComplete && (
            <>
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Database Setup Required</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This will create 4 new tables: <code className="bg-blue-100 px-1 rounded">checklists</code>, <code className="bg-blue-100 px-1 rounded">checklist_items</code>, <code className="bg-blue-100 px-1 rounded">sprints</code>, and <code className="bg-blue-100 px-1 rounded">sprint_checklists</code>.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center gap-4 py-8">
                <Button 
                  onClick={handleInitialize} 
                  disabled={isInitializing}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-5 h-5 mr-2" />
                      Initialize System
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500">
                  This process is safe and idempotent - you can run it multiple times
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>What This Creates</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li><strong>checklists</strong> - Platform-wide checklist definitions with categories and templates</li>
                    <li><strong>checklist_items</strong> - Individual tasks within checklists with assignments and priorities</li>
                    <li><strong>sprints</strong> - Time-boxed sprint containers with date ranges and membership</li>
                    <li><strong>sprint_checklists</strong> - Junction table linking checklists to sprints</li>
                    <li><strong>Indexes</strong> - Performance indexes for efficient queries</li>
                    <li><strong>RLS Policies</strong> - Row-level security for access control</li>
                    <li><strong>Triggers</strong> - Automatic timestamp updates</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}

          {isComplete && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
                <AlertDescription className="text-green-700">
                  The Checklists & Sprints system has been initialized successfully. You can now start using the features.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex gap-3">
                  <Button onClick={() => navigate('/checklists')}>
                    Go to Checklists
                  </Button>
                  <Button onClick={() => navigate('/sprints')} variant="outline">
                    Go to Sprints
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isComplete && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900">For System Administrators</CardTitle>
            <CardDescription className="text-yellow-700">
              If the initialization button doesn't work, the RPC function needs to be added to your Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="bg-white">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Required Database Function</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Your database administrator needs to create the following function in Supabase SQL Editor:</p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 max-h-48 overflow-auto">
                  <pre className="text-xs font-mono">
{`CREATE OR REPLACE FUNCTION initialize_checklists_system()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create tables, indexes, RLS policies, and triggers
  -- [Full implementation provided in migration script]
  RETURN json_build_object('success', true);
END;
$$;`}
                  </pre>
                </div>
                <p className="text-sm mt-2 text-gray-600">
                  Contact your platform administrator to add this function. The full implementation is available in the project documentation.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {showManualInstructions && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Manual SQL Migration Required</CardTitle>
            <CardDescription className="text-red-700">
              The automatic setup failed. Please use the manual SQL migration to initialize the system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="bg-white">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Manual SQL Migration</AlertTitle>
              <AlertDescription>
                <p className="mb-2">You can download the SQL migration file or copy the SQL content to your Supabase SQL Editor:</p>
                <div className="flex gap-3">
                  <Button onClick={copySQLToClipboard} size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy SQL
                  </Button>
                  <Button asChild size="sm">
                    <a href="/migrations/001_initialize_checklists_sprints.sql" download>
                      <Download className="w-4 h-4 mr-2" />
                      Download SQL
                    </a>
                  </Button>
                </div>
                <p className="text-sm mt-2 text-gray-600">
                  Once copied or downloaded, paste the SQL into your Supabase SQL Editor and run it.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}