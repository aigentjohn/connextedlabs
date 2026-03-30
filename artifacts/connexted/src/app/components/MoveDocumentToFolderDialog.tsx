import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FolderOpen, File } from 'lucide-react';

interface LibraryFolder {
  id: string;
  library_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  display_order: number;
}

interface MoveDocumentToFolderDialogProps {
  libraryDocumentId: string;
  documentTitle: string;
  currentFolderId: string | null;
  allFolders: LibraryFolder[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveDocumentToFolderDialog({
  libraryDocumentId,
  documentTitle,
  currentFolderId,
  allFolders,
  onSuccess,
  open,
  onOpenChange,
}: MoveDocumentToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId);
    }
  }, [open, currentFolderId]);

  const handleMove = async () => {
    if (selectedFolderId === currentFolderId) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('library_documents')
        .update({
          folder_id: selectedFolderId,
        })
        .eq('id', libraryDocumentId);

      if (error) throw error;

      toast.success('Document moved successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error moving document:', error);
      toast.error('Failed to move document');
    } finally {
      setLoading(false);
    }
  };

  // Build folder tree for selection
  const buildFolderOptions = () => {
    const options: Array<{ value: string; label: string; level: number }> = [
      { value: 'root', label: '📁 Root Level', level: 0 },
    ];

    const addFolderRecursive = (parentId: string | null, level: number) => {
      const children = allFolders.filter((f) => f.parent_folder_id === parentId);
      children.forEach((folder) => {
        options.push({
          value: folder.id,
          label: '  '.repeat(level) + '📁 ' + folder.name,
          level,
        });
        addFolderRecursive(folder.id, level + 1);
      });
    };

    addFolderRecursive(null, 1);
    return options;
  };

  const folderOptions = buildFolderOptions();

  // Find current folder name
  const currentFolderName = currentFolderId
    ? allFolders.find((f) => f.id === currentFolderId)?.name || 'Unknown'
    : 'Root Level';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            Move Document to Folder
          </DialogTitle>
          <DialogDescription>
            Move "{documentTitle}" to a different folder in this library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <File className="w-4 h-4 text-gray-500" />
              <span>
                <strong>Current location:</strong> {currentFolderName}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination-folder">Move to</Label>
            <Select
              value={selectedFolderId || 'root'}
              onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}
            >
              <SelectTrigger id="destination-folder">
                <SelectValue placeholder="Select destination folder" />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={loading || selectedFolderId === currentFolderId}
          >
            {loading ? 'Moving...' : 'Move Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
