import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { LinkIcon, Upload, FileJson, FileText, Folder, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

interface ImportUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultFolder?: string;
}

type ImportType = 'manual' | 'json' | 'csv' | 'bookmarks';

export default function ImportUrlDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultFolder = '/',
}: ImportUrlDialogProps) {
  const { profile } = useAuth();
  const [importType, setImportType] = useState<ImportType>('manual');
  const [loading, setLoading] = useState(false);

  // Manual import state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [folderType, setFolderType] = useState<string>('');

  // Bulk import state
  const [fileContent, setFileContent] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  
  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<Array<{
    url: string;
    content_type: string;
    content_id: string;
    title: string;
    created_at: string;
  }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      if (importType === 'json') {
        try {
          const data = JSON.parse(content);
          // Validate JSON structure
          if (Array.isArray(data)) {
            toast.success(`Loaded ${data.length} items from JSON`);
          } else {
            toast.error('JSON must be an array of objects');
          }
        } catch (error) {
          toast.error('Invalid JSON format');
        }
      } else if (importType === 'csv') {
        const lines = content.split('\n').filter((line) => line.trim());
        toast.success(`Loaded ${lines.length - 1} items from CSV`);
      }
    };
    reader.readAsText(file);
  };

  const extractDomain = (urlString: string): string | null => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return null;
    }
  };

  const extractTitle = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      const path = urlObj.pathname;
      // Try to extract meaningful title from path
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.[^.]+$/, '') // Remove extension
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      return urlObj.hostname;
    } catch {
      return 'Untitled';
    }
  };
  
  // Check for duplicate URLs in existing content
  const checkForDuplicates = async (urlToCheck: string) => {
    if (!profile || !urlToCheck) return;
    
    setCheckingDuplicates(true);
    try {
      const { data, error } = await supabase.rpc('check_url_exists_in_user_content', {
        p_user_id: profile.id,
        p_url: urlToCheck
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setDuplicates(data);
      } else {
        setDuplicates([]);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Don't show error toast - just log it
      setDuplicates([]);
    } finally {
      setCheckingDuplicates(false);
    }
  };
  
  // Check for duplicates when URL changes (debounced)
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setDuplicates([]); // Clear previous duplicates
    
    // Simple URL validation
    if (newUrl && newUrl.length > 10 && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
      // Debounce the duplicate check
      const timeoutId = setTimeout(() => {
        checkForDuplicates(newUrl);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleManualImport = async () => {
    if (!profile || !url) {
      toast.error('URL is required');
      return;
    }

    try {
      setLoading(true);

      const domain = extractDomain(url);
      const finalTitle = title || extractTitle(url);

      const { error } = await supabase.from('my_contents').insert({
        user_id: profile.id,
        url,
        title: finalTitle,
        description: description || null,
        folder_path: folderPath,
        folder_type: folderType || null,
        domain,
        source_type: 'manual',
        status: 'pending',
      });

      if (error) throw error;

      toast.success('URL imported successfully');
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error importing URL:', error);
      if (error.code === '23505') {
        toast.error('This URL already exists in your contents');
      } else {
        toast.error('Failed to import URL');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUrlImport = async () => {
    if (!profile || !bulkUrls.trim()) {
      toast.error('Please enter URLs');
      return;
    }

    try {
      setLoading(true);

      const urls = bulkUrls
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const items = urls.map((url) => ({
        user_id: profile.id,
        url,
        title: extractTitle(url),
        domain: extractDomain(url),
        folder_path: folderPath,
        folder_type: folderType || null,
        source_type: 'manual',
        status: 'pending',
      }));

      const { error } = await supabase.from('my_contents').insert(items);

      if (error) throw error;

      toast.success(`Imported ${urls.length} URLs`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error importing URLs:', error);
      toast.error('Failed to import URLs');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonImport = async () => {
    if (!profile || !fileContent) {
      toast.error('Please upload a JSON file');
      return;
    }

    try {
      setLoading(true);

      const data = JSON.parse(fileContent);

      if (!Array.isArray(data)) {
        toast.error('JSON must be an array of objects');
        return;
      }

      // Expected format: [{ url, title?, description?, tags? }]
      const items = data.map((item: any) => ({
        user_id: profile.id,
        url: item.url,
        title: item.title || extractTitle(item.url),
        description: item.description || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        domain: extractDomain(item.url),
        folder_path: folderPath,
        folder_type: folderType || null,
        source_type: 'json_import',
        status: 'pending',
      }));

      const { error } = await supabase.from('my_contents').insert(items);

      if (error) throw error;

      toast.success(`Imported ${items.length} URLs from JSON`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error importing JSON:', error);
      toast.error('Failed to import JSON: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async () => {
    if (!profile || !fileContent) {
      toast.error('Please upload a CSV file');
      return;
    }

    try {
      setLoading(true);

      const lines = fileContent.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error('CSV file is empty or missing header');
        return;
      }

      // Expected format: url,title,description,tags
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const urlIndex = headers.indexOf('url');

      if (urlIndex === -1) {
        toast.error('CSV must have a "url" column');
        return;
      }

      const titleIndex = headers.indexOf('title');
      const descIndex = headers.indexOf('description');
      const tagsIndex = headers.indexOf('tags');

      const items = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const url = values[urlIndex];

        return {
          user_id: profile.id,
          url,
          title: titleIndex >= 0 ? values[titleIndex] || extractTitle(url) : extractTitle(url),
          description: descIndex >= 0 ? values[descIndex] || null : null,
          tags:
            tagsIndex >= 0 && values[tagsIndex]
              ? values[tagsIndex].split('|').map((t) => t.trim())
              : [],
          domain: extractDomain(url),
          folder_path: folderPath,
          folder_type: folderType || null,
          source_type: 'csv',
          status: 'pending',
        };
      });

      const { error } = await supabase.from('my_contents').insert(items);

      if (error) throw error;

      toast.success(`Imported ${items.length} URLs from CSV`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast.error('Failed to import CSV: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    switch (importType) {
      case 'manual':
        if (bulkUrls.trim()) {
          await handleBulkUrlImport();
        } else {
          await handleManualImport();
        }
        break;
      case 'json':
        await handleJsonImport();
        break;
      case 'csv':
        await handleCsvImport();
        break;
      case 'bookmarks':
        toast.info('Bookmarks import coming soon!');
        break;
    }
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setBulkUrls('');
    setFileContent('');
    setFolderPath(defaultFolder);
    setFolderType('');
    setDuplicates([]);
    setCheckingDuplicates(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import URLs</DialogTitle>
          <DialogDescription>
            Add URLs to your content library for organization and enrichment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Type Selection */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setImportType('manual')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                importType === 'manual'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <LinkIcon className="w-6 h-6" />
              <span className="text-sm font-medium">Manual</span>
            </button>
            <button
              onClick={() => setImportType('json')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                importType === 'json'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileJson className="w-6 h-6" />
              <span className="text-sm font-medium">JSON</span>
            </button>
            <button
              onClick={() => setImportType('csv')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                importType === 'csv'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm font-medium">CSV</span>
            </button>
            <button
              onClick={() => setImportType('bookmarks')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                importType === 'bookmarks'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Folder className="w-6 h-6" />
              <span className="text-sm font-medium">Bookmarks</span>
            </button>
          </div>

          {/* Folder Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="folder_path">Folder Path</Label>
              <Input
                id="folder_path"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/For Documents/Tutorials"
              />
              <p className="text-xs text-gray-500 mt-1">Use / for root folder</p>
            </div>
            <div>
              <Label htmlFor="folder_type">Folder Type (Optional)</Label>
              <Select value={folderType} onValueChange={setFolderType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="pitch">Pitches</SelectItem>
                  <SelectItem value="build">Builds</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual Import */}
          {importType === 'manual' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/resource"
                />
                {checkingDuplicates && (
                  <p className="text-xs text-gray-500 mt-1">Checking for duplicates...</p>
                )}
                {duplicates.length > 0 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>URL Already Exists</AlertTitle>
                    <AlertDescription>
                      This URL is already in your content library.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-generated from URL if not provided"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this resource..."
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="bulk_urls">Or Import Multiple URLs</Label>
                <Textarea
                  id="bulk_urls"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder="Paste URLs, one per line&#10;https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  One URL per line. Titles will be auto-generated.
                </p>
              </div>
            </div>
          )}

          {/* JSON Import */}
          {importType === 'json' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="json_file">Upload JSON File</Label>
                <Input
                  id="json_file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </div>
              {fileContent && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Expected format:</p>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    {`[
  {
    "url": "https://example.com",
    "title": "Example Title",
    "description": "Optional description",
    "tags": ["tag1", "tag2"]
  }
]`}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* CSV Import */}
          {importType === 'csv' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv_file">Upload CSV File</Label>
                <Input id="csv_file" type="file" accept=".csv" onChange={handleFileUpload} />
              </div>
              {fileContent && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Expected format:</p>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    {`url,title,description,tags
https://example.com,Example Title,Description here,tag1|tag2|tag3
https://example2.com,Another Title,Another description,tag4|tag5`}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Use | to separate multiple tags
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bookmarks Import (Coming Soon) */}
          {importType === 'bookmarks' && (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600">
                Import from browser bookmarks will be available in the next update
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}