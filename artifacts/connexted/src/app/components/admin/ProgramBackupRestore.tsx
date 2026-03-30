// Split candidate: ~598 lines — consider extracting BackupListTable, RestoreConfirmDialog, and ExportOptionsPanel into sub-components.
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Download, Upload, Database, AlertCircle, CheckCircle2, Loader2, FileText, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { exportProgram, downloadTemplate, uploadTemplate } from '@/lib/template-engine';
import { generateProgramSummary, downloadProgramSummary, downloadTextReport, type ProgramSummary } from '@/lib/program-summary';
import type { ExportLevel } from '@/types/templates';

interface ProgramOption {
  id: string;
  name: string;
  slug: string;
  template_id: string;
}

export default function ProgramBackupRestore() {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [exportLevel, setExportLevel] = useState<ExportLevel>('full');
  const [includeMembers, setIncludeMembers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [lastSummary, setLastSummary] = useState<ProgramSummary | null>(null);
  const [lastOperation, setLastOperation] = useState<{
    type: 'export' | 'import' | 'summary';
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, slug, template_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const handleExport = async () => {
    if (!selectedProgramId) {
      toast.error('Please select a program to export');
      return;
    }

    setIsExporting(true);
    setLastOperation(null);

    try {
      const template = await exportProgram(selectedProgramId, {
        level: exportLevel,
        includeMembers: exportLevel === 'full' ? includeMembers : false,
        includeContainers: true,
        includeCircle: true,
        includeMetadata: true,
      });

      if (!template) {
        throw new Error('Failed to export program');
      }

      const program = programs.find(p => p.id === selectedProgramId);
      const timestamp = new Date().toISOString().split('T')[0];
      const levelSuffix = exportLevel === 'full' ? 'FULL' : 'STRUCTURE';
      const filename = `${program?.slug || 'program'}-${levelSuffix}-${timestamp}.json`;

      downloadTemplate(template, filename);

      setLastOperation({
        type: 'export',
        success: true,
        message: `Successfully exported "${program?.name}" (${exportLevel === 'full' ? 'Full Backup' : 'Structure Only'})`,
      });

      toast.success('Program exported successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      setLastOperation({
        type: 'export',
        success: false,
        message: error.message || 'Export failed',
      });
      toast.error('Failed to export program');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    setIsImporting(true);
    setLastOperation(null);

    try {
      const template = await uploadTemplate();

      // Use server-side import route (bypasses RLS, handles all 17 item types)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/json-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            jsonData: template,
            importedBy: profile.id,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Import failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Import failed');
      }

      setLastOperation({
        type: 'import',
        success: true,
        message: result.message || 'Program imported successfully',
      });

      toast.success('Program imported successfully!');
      
      // Refresh programs list
      await fetchPrograms();
    } catch (error: any) {
      console.error('Import error:', error);
      setLastOperation({
        type: 'import',
        success: false,
        message: error.message || 'Import failed',
      });
      toast.error('Failed to import program');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedProgramId) {
      toast.error('Please select a program to generate a summary');
      return;
    }

    setIsGeneratingSummary(true);
    setLastOperation(null);

    try {
      const summary = await generateProgramSummary(selectedProgramId);

      if (!summary) {
        throw new Error('Failed to generate program summary');
      }

      setLastSummary(summary);

      setLastOperation({
        type: 'summary',
        success: true,
        message: 'Successfully generated program summary',
      });

      toast.success('Program summary generated successfully!');
    } catch (error: any) {
      console.error('Summary generation error:', error);
      setLastOperation({
        type: 'summary',
        success: false,
        message: error.message || 'Summary generation failed',
      });
      toast.error('Failed to generate program summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!lastSummary) {
      toast.error('No summary available to download');
      return;
    }

    const program = programs.find(p => p.id === selectedProgramId);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${program?.slug || 'program'}-summary-${timestamp}.json`;

    downloadProgramSummary(lastSummary, filename);

    toast.success('Program summary downloaded successfully!');
  };

  const handleDownloadTextReport = () => {
    if (!lastSummary) {
      toast.error('No summary available to download');
      return;
    }

    const program = programs.find(p => p.id === selectedProgramId);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${program?.slug || 'program'}-report-${timestamp}.txt`;

    downloadTextReport(lastSummary, filename);

    toast.success('Program text report downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Program Backup & Restore' }
        ]}
      />
      
      {/* Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <CardTitle>Export Program (Backup)</CardTitle>
          </div>
          <CardDescription>
            Download a program as a JSON file for backup or duplication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Selection */}
          <div>
            <Label>Select Program</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Level */}
          <div>
            <Label>Export Level</Label>
            <Select value={exportLevel} onValueChange={(v) => setExportLevel(v as ExportLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structure">
                  Structure Only (Template for new programs)
                </SelectItem>
                <SelectItem value="full">
                  Full Backup (Structure + All Content)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              {exportLevel === 'structure' 
                ? 'Exports program structure, journeys, and containers without content'
                : 'Exports everything: structure, posts, documents, events, members, etc.'}
            </p>
          </div>

          {/* Include Members (only for full exports) */}
          {exportLevel === 'full' && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label className="text-base">Include Members</Label>
                <p className="text-sm text-gray-500">
                  Export program member list with roles and status
                </p>
              </div>
              <Switch
                checked={includeMembers}
                onCheckedChange={setIncludeMembers}
              />
            </div>
          )}

          {/* Export Button */}
          <Button 
            onClick={handleExport} 
            disabled={!selectedProgramId || isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Program
              </>
            )}
          </Button>

          {lastOperation?.type === 'export' && (
            <Alert className={lastOperation.success ? 'border-green-500' : 'border-red-500'}>
              {lastOperation.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>{lastOperation.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            <CardTitle>Import Program (Restore)</CardTitle>
          </div>
          <CardDescription>
            Upload a JSON backup file to restore or duplicate a program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="w-4 h-4" />
            <AlertDescription>
              <strong>Import Behavior:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Creates a new program instance with unique slug</li>
                <li>You become the admin of the imported program</li>
                <li>Structure-only imports create empty containers</li>
                <li>Full imports restore all content (posts, documents, events)</li>
                <li>Member list is imported but users won't be auto-enrolled</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleImport} 
            disabled={isImporting}
            variant="secondary"
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Select File to Import
              </>
            )}
          </Button>

          {lastOperation?.type === 'import' && (
            <Alert className={lastOperation.success ? 'border-green-500' : 'border-red-500'}>
              {lastOperation.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>{lastOperation.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-600" />
            <CardTitle>Generate Program Summary</CardTitle>
          </div>
          <CardDescription>
            Generate a summary of the program's structure and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Selection */}
          <div>
            <Label>Select Program</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Summary Button */}
          <Button 
            onClick={handleGenerateSummary} 
            disabled={!selectedProgramId || isGeneratingSummary}
            className="w-full"
          >
            {isGeneratingSummary ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BarChart className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>

          {lastOperation?.type === 'summary' && (
            <Alert className={lastOperation.success ? 'border-green-500' : 'border-red-500'}>
              {lastOperation.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>{lastOperation.message}</AlertDescription>
            </Alert>
          )}

          {lastSummary && (
            <div className="space-y-2">
              <Button 
                onClick={handleDownloadSummary} 
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Summary (JSON)
              </Button>
              <Button 
                onClick={handleDownloadTextReport} 
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Text Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Display */}
      {lastSummary && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Program Summary: {lastSummary.program.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Journeys</div>
                <div className="text-2xl font-bold text-gray-900">{lastSummary.totals.journeys}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Containers</div>
                <div className="text-2xl font-bold text-gray-900">{lastSummary.totals.containers}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Members</div>
                <div className="text-2xl font-bold text-gray-900">{lastSummary.totals.members}</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Content Items</div>
                <div className="text-2xl font-bold text-gray-900">{lastSummary.totals.total_content_items}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 mb-2">Content Breakdown</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {lastSummary.totals.posts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Posts:</span>
                    <span className="font-medium">{lastSummary.totals.posts}</span>
                  </div>
                )}
                {lastSummary.totals.documents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Documents:</span>
                    <span className="font-medium">{lastSummary.totals.documents}</span>
                  </div>
                )}
                {lastSummary.totals.reviews > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reviews:</span>
                    <span className="font-medium">{lastSummary.totals.reviews}</span>
                  </div>
                )}
                {lastSummary.totals.events > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Events:</span>
                    <span className="font-medium">{lastSummary.totals.events}</span>
                  </div>
                )}
                {lastSummary.totals.forum_threads > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Forum Threads:</span>
                    <span className="font-medium">{lastSummary.totals.forum_threads}</span>
                  </div>
                )}
                {lastSummary.totals.pitches > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pitches:</span>
                    <span className="font-medium">{lastSummary.totals.pitches}</span>
                  </div>
                )}
                {lastSummary.totals.standup_responses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Standup Responses:</span>
                    <span className="font-medium">{lastSummary.totals.standup_responses}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 mb-2">Containers by Type</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(lastSummary.containersByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{type}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Generated: {new Date(lastSummary.generated_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup & Restore Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Use Structure Export:</strong> For creating program templates and sharing designs</p>
          <p><strong>Use Full Export:</strong> For complete backups before major changes or quarterly program resets</p>
          <p><strong>File Names:</strong> Exported files include export level and date for easy identification</p>
          <p><strong>Import Safety:</strong> Imports always create new instances - your original program is never modified</p>
        </CardContent>
      </Card>
    </div>
  );
}