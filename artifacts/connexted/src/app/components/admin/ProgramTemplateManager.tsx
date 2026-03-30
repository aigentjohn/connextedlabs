// Split candidate: ~554 lines — consider extracting TemplateExportPanel, TemplateImportPanel, and TemplateJsonPreview into sub-components.
import { useState } from 'react';
import { Download, Upload, Copy, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { exportProgram, downloadTemplate, uploadTemplate } from '@/lib/template-engine';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { ProgramTemplate } from '@/types/templates';

interface ProgramTemplateManagerProps {
  programId?: string;
  programName?: string;
  programSlug?: string;
  userId: string;
  mode?: 'standalone' | 'inline'; // standalone = own page, inline = card in dashboard
}

export default function ProgramTemplateManager({
  programId,
  programName,
  programSlug,
  userId,
  mode = 'inline',
}: ProgramTemplateManagerProps) {
  const navigate = useNavigate();
  
  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLevel, setExportLevel] = useState<'structure' | 'full'>('structure');
  const [includeMembers, setIncludeMembers] = useState(false);
  const [exportingProgram, setExportingProgram] = useState(false);
  
  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importingProgram, setImportingProgram] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const [newProgramName, setNewProgramName] = useState('');
  const [importAsTemplate, setImportAsTemplate] = useState(true);
  const [importMembers, setImportMembers] = useState(false);

  // Handle export
  const handleExportProgram = async () => {
    if (!programId) {
      toast.error('No program selected');
      return;
    }

    try {
      setExportingProgram(true);
      toast.loading('Exporting program...');

      const template = await exportProgram(programId, {
        level: exportLevel,
        includeContainers: true,
        includeCircle: true,
        includeMetadata: true,
        includeMembers: exportLevel === 'full' && includeMembers,
      });

      if (template) {
        const filename = `${programSlug || 'program'}-${exportLevel}-export-${Date.now()}.json`;
        downloadTemplate(template, filename);
        toast.dismiss();
        toast.success(`Program exported successfully! (${exportLevel} mode)`);
        setExportDialogOpen(false);
      } else {
        toast.dismiss();
        toast.error('Failed to export program');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Failed to export program');
    } finally {
      setExportingProgram(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    try {
      const template = await uploadTemplate();
      setSelectedTemplate(template);
      
      // Pre-fill name from template
      if (template.program?.name) {
        setNewProgramName(template.program.name);
      }
      
      setImportDialogOpen(true);
      toast.success('Template file loaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to load template file');
    }
  };

  // Handle import
  const handleImportProgram = async () => {
    if (!selectedTemplate) {
      toast.error('No template selected');
      return;
    }

    try {
      setImportingProgram(true);
      toast.loading('Importing program...');

      // Clone template to avoid modifying original
      const templateCopy = JSON.parse(JSON.stringify(selectedTemplate));

      // Apply customizations
      if (importAsTemplate) {
        // Import as template: rename and remove members
        if (newProgramName.trim()) {
          templateCopy.program.name = newProgramName.trim();
          // Generate new slug from new name
          const baseSlug = newProgramName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          templateCopy.program.slug = `${baseSlug}-${Date.now()}`;
        }
        
        // Remove members unless explicitly requested
        if (!importMembers) {
          delete templateCopy.members;
        }
      } else {
        // Import as copy: keep original name but remove members by default
        if (!importMembers) {
          delete templateCopy.members;
        }
        // Ensure unique slug
        if (templateCopy.program.slug) {
          templateCopy.program.slug = `${templateCopy.program.slug}-copy-${Date.now()}`;
        }
      }

      // Import the program via server-side route (bypasses RLS, handles all 17 item types)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/json-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            jsonData: templateCopy,
            importedBy: userId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Import failed');
      }

      const result = await response.json();

      toast.dismiss();

      if (result.success) {
        toast.success(
          `Program "${result.data?.program?.name}" imported successfully!`,
          {
            description: `${result.data?.journeys?.length || 0} journeys created`,
            duration: 5000,
          }
        );
        
        setImportDialogOpen(false);
        setSelectedTemplate(null);
        setNewProgramName('');
        
        // Navigate to new program
        if (result.data?.program?.slug) {
          navigate(`/programs/${result.data.program.slug}`);
        }
      } else {
        toast.error('Import failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.dismiss();
      toast.error('Failed to import program', {
        description: error.message,
      });
    } finally {
      setImportingProgram(false);
    }
  };

  if (mode === 'inline') {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-600" />
              <CardTitle>Program Templates</CardTitle>
            </div>
            <CardDescription>
              Export programs as JSON templates or import from template files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Section */}
            {programId && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Export This Program</h4>
                    <p className="text-sm text-gray-600">
                      Save as JSON template for backup or reuse
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportDialogOpen(true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {programName}
                  </Badge>
                </div>
              </div>
            )}

            {/* Import Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Import Program</h4>
                  <p className="text-sm text-gray-600">
                    Create program from JSON template file
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFileUpload}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertCircle className="w-3 h-3" />
                <span>Supports .json template files</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {programId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setExportLevel('structure');
                      setIncludeMembers(false);
                      setExportDialogOpen(true);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Clone Program
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={handleFileUpload}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Load Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Program</DialogTitle>
              <DialogDescription>
                Choose what to include in your export
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Export Level */}
              <div className="space-y-2">
                <Label>Export Level</Label>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => setExportLevel('structure')}
                  >
                    <input
                      type="radio"
                      checked={exportLevel === 'structure'}
                      onChange={() => setExportLevel('structure')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">Structure Only</div>
                      <div className="text-xs text-gray-600">
                        Program setup, journeys, and containers (no user content)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => setExportLevel('full')}
                  >
                    <input
                      type="radio"
                      checked={exportLevel === 'full'}
                      onChange={() => setExportLevel('full')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-sm">Full Backup</div>
                      <div className="text-xs text-gray-600">
                        Everything including posts, documents, pitches, and events
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Include Members */}
              {exportLevel === 'full' && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Checkbox
                    id="export-members"
                    checked={includeMembers}
                    onCheckedChange={(checked) => setIncludeMembers(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="export-members" className="text-sm font-medium cursor-pointer">
                      Include Member List
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Export member emails and roles (useful for full backups)
                    </p>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-blue-900">
                  {exportLevel === 'structure' 
                    ? 'Perfect for creating reusable templates without personal data'
                    : 'Complete backup including all content and activity'
                  }
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExportProgram} disabled={exportingProgram}>
                {exportingProgram ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Program</DialogTitle>
              <DialogDescription>
                Configure how to import this template
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <div className="space-y-4 py-4">
                {/* Template Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Template</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedTemplate.export_level || 'structure'}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {selectedTemplate.program?.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {selectedTemplate.journeys?.length || 0} journeys • 
                    {selectedTemplate.journeys?.reduce((sum, j) => sum + (j.containers?.length || 0), 0) || 0} containers
                    {selectedTemplate.members && ` • ${selectedTemplate.members.length} members`}
                  </div>
                </div>

                {/* Import Mode */}
                <div className="space-y-2">
                  <Label>Import Mode</Label>
                  <div className="space-y-2">
                    <div 
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setImportAsTemplate(true)}
                    >
                      <input
                        type="radio"
                        checked={importAsTemplate}
                        onChange={() => setImportAsTemplate(true)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm">Create as New Template</div>
                        <div className="text-xs text-gray-600">
                          Rename and customize before importing
                        </div>
                      </div>
                    </div>
                    <div 
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setImportAsTemplate(false)}
                    >
                      <input
                        type="radio"
                        checked={!importAsTemplate}
                        onChange={() => setImportAsTemplate(false)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm">Duplicate Exactly</div>
                        <div className="text-xs text-gray-600">
                          Keep original name (will add "-copy" to slug)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Name */}
                {importAsTemplate && (
                  <div className="space-y-2">
                    <Label htmlFor="program-name">Program Name</Label>
                    <Input
                      id="program-name"
                      value={newProgramName}
                      onChange={(e) => setNewProgramName(e.target.value)}
                      placeholder="Enter new program name"
                    />
                  </div>
                )}

                {/* Import Members */}
                {selectedTemplate.members && selectedTemplate.members.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox
                      id="import-members"
                      checked={importMembers}
                      onCheckedChange={(checked) => setImportMembers(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="import-members" className="text-sm font-medium cursor-pointer">
                        Import Members ({selectedTemplate.members.length})
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Add members from template to new program
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning */}
                {!importMembers && selectedTemplate.members && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-blue-900">
                      Members will not be copied. You'll start with an empty program.
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportProgram} 
                disabled={importingProgram || (importAsTemplate && !newProgramName.trim())}
              >
                {importingProgram ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Program
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Standalone mode (full page view) - can be expanded later
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Program Template Manager</h1>
        {/* Add standalone view content here */}
      </div>
    </div>
  );
}