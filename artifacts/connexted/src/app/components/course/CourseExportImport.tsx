import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/app/components/ui/dialog';
import { Download, Upload, Copy, FileJson, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportCourse,
  importCourse,
  duplicateCourse,
  downloadCourseExport,
  parseCourseExport,
  type CourseExport,
} from '@/services/courseExportService';

interface CourseExportImportProps {
  courseId?: string;
  courseName?: string;
  onCourseImported?: (courseId: string) => void;
}

export function CourseExportImport({ courseId, courseName, onCourseImported }: CourseExportImportProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<CourseExport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!courseId) {
      toast.error('No course selected');
      return;
    }

    setExporting(true);
    try {
      const exportData = await exportCourse(courseId);
      if (exportData) {
        downloadCourseExport(exportData);
        toast.success('Course exported successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export course');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Read and parse the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = parseCourseExport(content);
        if (data) {
          setImportData(data);
          setNewSlug(data.course.slug);
          setNewTitle(data.course.title);
          setImportDialogOpen(true);
        }
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Failed to read import file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData) return;

    if (!newSlug.trim()) {
      toast.error('Course slug is required');
      return;
    }

    setImporting(true);
    try {
      const courseId = await importCourse(importData, {
        newSlug: newSlug.trim(),
        setAsPublished: false,
      });

      if (courseId) {
        setImportDialogOpen(false);
        setImportFile(null);
        setImportData(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onCourseImported?.(courseId);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import course');
    } finally {
      setImporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!courseId) return;

    if (!newSlug.trim() || !newTitle.trim()) {
      toast.error('Course slug and title are required');
      return;
    }

    setDuplicating(true);
    try {
      const newCourseId = await duplicateCourse(courseId, newSlug.trim(), newTitle.trim());
      if (newCourseId) {
        setDuplicateDialogOpen(false);
        setNewSlug('');
        setNewTitle('');
        onCourseImported?.(newCourseId);
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate course');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      {courseId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Course
            </CardTitle>
            <CardDescription>
              Download {courseName || 'this course'} as a JSON file for backup or transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <FileJson className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  The export includes all course details, journeys, and journey items. You can import this file later to recreate the course structure.
                </p>
              </div>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Course
          </CardTitle>
          <CardDescription>
            Upload a course JSON file to create a new course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <FileJson className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Import a previously exported course. This will create a new course with all journeys and lessons.
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Section */}
      {courseId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Course
            </CardTitle>
            <CardDescription>
              Create a copy of {courseName || 'this course'} with a new slug
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Copy className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Quickly duplicate this course to create variations or templates. All journeys and items will be copied.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setNewSlug('');
                setNewTitle('');
                setDuplicateDialogOpen(true);
              }}
              variant="outline"
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate This Course
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Course</DialogTitle>
            <DialogDescription>
              Review and customize the import settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importData && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Original Title:</span> {importData.course.title}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Journeys:</span> {importData.journeys.length}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total Lessons:</span> {importData.course.total_lessons}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="newTitle">Course Title</Label>
              <Input
                id="newTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter course title"
              />
            </div>
            <div>
              <Label htmlFor="newSlug">Course Slug (URL-friendly)</Label>
              <Input
                id="newSlug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="my-course-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used in the URL: /courses/{newSlug}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Import Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Course</DialogTitle>
            <DialogDescription>
              Create a copy of {courseName || 'this course'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="duplicateTitle">New Course Title</Label>
              <Input
                id="duplicateTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new course title"
              />
            </div>
            <div>
              <Label htmlFor="duplicateSlug">New Course Slug</Label>
              <Input
                id="duplicateSlug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="new-course-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be unique. This will be used in the URL: /courses/{newSlug}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
