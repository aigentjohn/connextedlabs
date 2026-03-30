import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Download, Upload, FileJson, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard-utils';
import {
  validateContainerExport,
  validateCircleExport,
  validateProgramExport,
  validateCourseExport,
  downloadJSON,
  readJSONFile,
} from '@/lib/json-schemas';

interface ExportImportManagerProps {
  entityType?: 'container' | 'circle' | 'program' | 'course';
  entityId?: string;
  entityName?: string;
  // Container-specific props (backwards compatible)
  containerId?: string;
  containerName?: string;
  containerType?: string;
  // Circle/Program/Course specific
  circleId?: string;
  programId?: string;
  courseId?: string;
  onImportComplete?: () => void;
}

export function ExportImportManager({
  entityType: entityTypeProp,
  entityId: entityIdProp,
  entityName: entityNameProp,
  containerId,
  containerName,
  containerType,
  circleId: circleIdProp,
  programId: programIdProp,
  courseId: courseIdProp,
  onImportComplete,
}: ExportImportManagerProps) {
  // Support both direct props and container-specific props for backwards compatibility
  const entityType = entityTypeProp || 'container';
  const entityId = entityIdProp || containerId || '';
  const entityName = entityNameProp || containerName || '';
  const circleId = circleIdProp;
  const programId = programIdProp;
  const courseId = courseIdProp;

  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [loading, setLoading] = useState(false);
  const [exportJSON, setExportJSON] = useState<string>('');
  const [importJSON, setImportJSON] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Export
  const handleExport = async () => {
    try {
      setLoading(true);
      setExportJSON('');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/json-export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            entityType,
            entityId,
            containerType,
            circleId,
            programId,
            courseId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Export failed');
      }

      const data = await response.json();
      const jsonString = JSON.stringify(data, null, 2);
      setExportJSON(jsonString);
      toast.success('Export generated successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Download exported JSON
  const handleDownloadExport = () => {
    if (!exportJSON) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${entityType}-${entityName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
    
    downloadJSON(JSON.parse(exportJSON), filename);
    toast.success('Downloaded successfully');
  };

  // Copy to clipboard
  const handleCopyExport = async () => {
    if (!exportJSON) return;
    
    try {
      await copyToClipboard(exportJSON);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Validate Import JSON
  const validateImportJSON = (json: string): boolean => {
    setValidationErrors([]);
    
    if (!json.trim()) {
      setValidationErrors(['Please provide JSON data']);
      return false;
    }

    try {
      const parsed = JSON.parse(json);
      
      let validation;
      switch (entityType) {
        case 'container':
          validation = validateContainerExport(parsed);
          break;
        case 'circle':
          validation = validateCircleExport(parsed);
          break;
        case 'program':
          validation = validateProgramExport(parsed);
          break;
        case 'course':
          validation = validateCourseExport(parsed);
          break;
        default:
          setValidationErrors(['Unknown entity type']);
          return false;
      }

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return false;
      }

      return true;
    } catch (error) {
      setValidationErrors(['Invalid JSON format: ' + (error as Error).message]);
      return false;
    }
  };

  // Handle Import
  const handleImport = async () => {
    if (!validateImportJSON(importJSON)) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      setLoading(true);
      setImportSuccess(false);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/json-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            jsonData: JSON.parse(importJSON),
            targetCircleId: circleId,
            targetProgramId: programId,
            targetCourseId: courseId,
            importedBy: profile?.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Import failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Import failed on server');
      }
      
      setImportSuccess(true);
      toast.success(result.message || 'Import completed successfully');
      
      if (onImportComplete) {
        onImportComplete();
      }

      // Reset form after successful import
      setTimeout(() => {
        setImportJSON('');
        setImportSuccess(false);
        setDialogOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Failed to import: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJSONFile(file);
      setImportJSON(JSON.stringify(json, null, 2));
      toast.success('File loaded successfully');
    } catch (error) {
      toast.error('Failed to read file: ' + (error as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <FileJson className="w-4 h-4" />
        Export/Import JSON
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export/Import {entityName}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'import')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="w-4 h-4" />
                Import
              </TabsTrigger>
            </TabsList>

            {/* EXPORT TAB */}
            <TabsContent value="export" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Export this {entityType} as JSON. You can use this to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Create backups</li>
                    <li>Clone content to other {entityType}s</li>
                    <li>Share templates with other admins</li>
                    <li>Migrate content between circles or programs</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {!exportJSON ? (
                <div className="text-center py-8">
                  <Button onClick={handleExport} disabled={loading} size="lg">
                    {loading ? 'Generating Export...' : 'Generate Export'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Exported JSON</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyExport}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadExport}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={exportJSON}
                    readOnly
                    className="font-mono text-xs min-h-[400px]"
                  />

                  <Alert>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Export generated successfully. Download or copy to save.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </TabsContent>

            {/* IMPORT TAB */}
            <TabsContent value="import" className="space-y-4">
              <Alert>
                <AlertDescription>
                  Import a {entityType} from JSON. The imported content will be created in{' '}
                  {circleId ? 'this circle' : programId ? 'this program' : courseId ? 'this course' : 'the system'}.
                </AlertDescription>
              </Alert>

              {importSuccess ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Import completed successfully! The new {entityType} has been created.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="file-upload">Upload JSON File</Label>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="mt-2 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="text-center text-sm text-gray-500">OR</div>

                  {/* JSON Textarea */}
                  <div>
                    <Label htmlFor="import-json">Paste JSON</Label>
                    <Textarea
                      id="import-json"
                      value={importJSON}
                      onChange={(e) => {
                        setImportJSON(e.target.value);
                        setValidationErrors([]);
                      }}
                      placeholder={`Paste your ${entityType} JSON here...`}
                      className="font-mono text-xs min-h-[300px]"
                    />
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Validation Errors:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Import Info */}
                  {importJSON && validationErrors.length === 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        JSON is valid and ready to import
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {activeTab === 'import' && !importSuccess && (
              <Button
                onClick={handleImport}
                disabled={loading || !importJSON || validationErrors.length > 0}
              >
                {loading ? 'Importing...' : 'Import'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}