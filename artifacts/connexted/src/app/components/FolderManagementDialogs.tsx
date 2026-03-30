import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FolderPlus, Edit, Trash2, FolderOpen } from 'lucide-react';

interface LibraryFolder {
  id: string;
  library_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  display_order: number;
}

interface CreateFolderDialogProps {
  libraryId: string;
  parentFolderId?: string | null;
  allFolders: LibraryFolder[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateFolderDialog({
  libraryId,
  parentFolderId = null,
  allFolders,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateFolderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentFolderId);
  const [loading, setLoading] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedParentId(parentFolderId);
    }
  }, [open, parentFolderId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('library_folders').insert({
        library_id: libraryId,
        parent_folder_id: selectedParentId,
        name: name.trim(),
        description: description.trim() || null,
        display_order: 0,
      });

      if (error) throw error;

      toast.success('Folder created successfully');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  // Build folder tree for parent selection
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <div onClick={() => setOpen(true)}>{trigger}</div>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-600" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Create a folder to organize documents in this library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name *</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Getting Started, Advanced Topics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-description">Description (optional)</Label>
            <Textarea
              id="folder-description"
              placeholder="What kind of documents belong in this folder?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-folder">Parent Folder</Label>
            <Select
              value={selectedParentId || 'root'}
              onValueChange={(value) => setSelectedParentId(value === 'root' ? null : value)}
            >
              <SelectTrigger id="parent-folder">
                <SelectValue placeholder="Select parent folder" />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Where should this folder be created?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameFolderDialogProps {
  folder: LibraryFolder;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameFolderDialog({
  folder,
  onSuccess,
  open,
  onOpenChange,
}: RenameFolderDialogProps) {
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(folder.name);
      setDescription(folder.description || '');
    }
  }, [open, folder]);

  const handleRename = async () => {
    if (!name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    if (name.trim() === folder.name && description.trim() === (folder.description || '')) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('library_folders')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', folder.id);

      if (error) throw error;

      toast.success('Folder updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" />
            Edit Folder
          </DialogTitle>
          <DialogDescription>
            Update the folder name and description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rename-folder-name">Folder Name *</Label>
            <Input
              id="rename-folder-name"
              placeholder="e.g., Getting Started, Advanced Topics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rename-folder-description">Description (optional)</Label>
            <Textarea
              id="rename-folder-description"
              placeholder="What kind of documents belong in this folder?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  folder: LibraryFolder;
  documentCount: number;
  subfolderCount: number;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteFolderDialog({
  folder,
  documentCount,
  subfolderCount,
  onSuccess,
  open,
  onOpenChange,
}: DeleteFolderDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmText('');
    }
  }, [open]);

  const handleDelete = async () => {
    if (confirmText !== folder.name) {
      toast.error('Please type the folder name to confirm');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('library_folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;

      toast.success('Folder deleted successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Folder
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-yellow-900">What will happen:</h4>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              <li>
                The folder "<strong>{folder.name}</strong>" will be permanently deleted
              </li>
              {subfolderCount > 0 && (
                <li>
                  <strong>{subfolderCount}</strong> subfolder{subfolderCount !== 1 ? 's' : ''} will
                  also be deleted
                </li>
              )}
              {documentCount > 0 && (
                <li>
                  <strong>{documentCount}</strong> document{documentCount !== 1 ? 's' : ''} will be
                  moved to the root level (not deleted)
                </li>
              )}
              {documentCount === 0 && subfolderCount === 0 && (
                <li>This folder is empty and can be safely deleted</li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <strong>{folder.name}</strong> to confirm deletion
            </Label>
            <Input
              id="confirm-delete"
              placeholder={folder.name}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== folder.name}
          >
            {loading ? 'Deleting...' : 'Delete Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MoveFolderDialogProps {
  folder: LibraryFolder;
  allFolders: LibraryFolder[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveFolderDialog({
  folder,
  allFolders,
  onSuccess,
  open,
  onOpenChange,
}: MoveFolderDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    folder.parent_folder_id
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedParentId(folder.parent_folder_id);
    }
  }, [open, folder]);

  // Get all descendant folder IDs to prevent circular references
  const getDescendantIds = (folderId: string): string[] => {
    const descendants: string[] = [folderId];
    const children = allFolders.filter((f) => f.parent_folder_id === folderId);
    children.forEach((child) => {
      descendants.push(...getDescendantIds(child.id));
    });
    return descendants;
  };

  const descendantIds = getDescendantIds(folder.id);

  // Build folder options excluding this folder and its descendants
  const buildFolderOptions = () => {
    const options: Array<{ value: string; label: string; level: number; disabled: boolean }> = [
      { value: 'root', label: '📁 Root Level', level: 0, disabled: false },
    ];

    const addFolderRecursive = (parentId: string | null, level: number) => {
      const children = allFolders.filter((f) => f.parent_folder_id === parentId);
      children.forEach((f) => {
        const isDescendant = descendantIds.includes(f.id);
        options.push({
          value: f.id,
          label: '  '.repeat(level) + '📁 ' + f.name + (isDescendant ? ' (cannot select)' : ''),
          level,
          disabled: isDescendant,
        });
        addFolderRecursive(f.id, level + 1);
      });
    };

    addFolderRecursive(null, 1);
    return options;
  };

  const folderOptions = buildFolderOptions();

  const handleMove = async () => {
    if (selectedParentId === folder.parent_folder_id) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('library_folders')
        .update({
          parent_folder_id: selectedParentId,
        })
        .eq('id', folder.id);

      if (error) throw error;

      toast.success('Folder moved successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error moving folder:', error);
      toast.error('Failed to move folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            Move Folder
          </DialogTitle>
          <DialogDescription>
            Move "{folder.name}" to a different location in this library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="move-parent-folder">New Parent Folder</Label>
            <Select
              value={selectedParentId || 'root'}
              onValueChange={(value) => setSelectedParentId(value === 'root' ? null : value)}
            >
              <SelectTrigger id="move-parent-folder">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              All subfolders and documents will move with this folder.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={loading}>
            {loading ? 'Moving...' : 'Move Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}