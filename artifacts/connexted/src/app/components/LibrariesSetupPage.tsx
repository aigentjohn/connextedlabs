import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { AlertCircle, Library, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { initializeLibrariesSystem } from '@/lib/initializeLibraries';

export default function LibrariesSetupPage() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    
    try {
      const result = await initializeLibrariesSystem();
      
      if (result.success) {
        setIsComplete(true);
        toast.success('Libraries system initialized successfully!');
      } else {
        // Check if it's a "function not found" error
        if (result.error?.message?.includes('function') || result.error?.code === '42883') {
          toast.error('Setup function not found in database. Please contact your system administrator.');
        } else {
          toast.error(`Setup failed: ${result.error?.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      toast.error(`Setup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <Breadcrumbs
        items={[
          { label: 'Libraries', path: '/libraries' },
          { label: 'Setup' },
        ]}
      />

      <div className="text-center space-y-2">
        <Library className="w-16 h-16 text-indigo-600 mx-auto" />
        <h1 className="text-3xl font-bold text-gray-900">Setup Libraries System</h1>
        <p className="text-gray-600">
          Initialize the unified library system with folders and document organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>
            Click the button below to automatically set up the Libraries feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isComplete && (
            <>
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Database Setup Required</AlertTitle>
                <AlertDescription className="text-blue-700">
                  This will create 4 new tables: <code className="bg-blue-100 px-1 rounded">libraries</code>, <code className="bg-blue-100 px-1 rounded">library_folders</code>, <code className="bg-blue-100 px-1 rounded">library_documents</code>, and <code className="bg-blue-100 px-1 rounded">document_shares</code>. It will also enhance the existing <code className="bg-blue-100 px-1 rounded">documents</code> table.
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
                      <Library className="w-5 h-5 mr-2" />
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
                    <li><strong>libraries</strong> - Container for organizing documents (system, auto-generated, or manual)</li>
                    <li><strong>library_folders</strong> - Hierarchical folder structure within manual libraries</li>
                    <li><strong>library_documents</strong> - Junction table linking documents to libraries and folders</li>
                    <li><strong>document_shares</strong> - Tracking which containers have access to documents</li>
                    <li><strong>Enhanced documents table</strong> - Adds document_type, intended_audience, and sponsor_org fields</li>
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
                  The Libraries system has been initialized successfully. You can now start organizing your documents.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex gap-3">
                  <Button onClick={() => navigate('/libraries')}>
                    Go to Libraries
                  </Button>
                  <Button onClick={() => navigate('/documents')} variant="outline">
                    Go to Documents
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
{`CREATE OR REPLACE FUNCTION initialize_libraries_system()
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
    </div>
  );
}
