import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Pause, Play, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

interface ContainerManagementActionsProps {
  containerId: string;
  containerName: string;
  containerType: string; // 'builds', 'pitches', 'tables', etc.
  state?: string;
  redirectPath: string; // Where to redirect after delete
  onUpdate: (updates: any) => void;
  createdBy?: string;
}

/**
 * Reusable component for delete and pause/resume actions on containers
 * Handles permissions, state management, and user feedback
 */
export function ContainerManagementActions({
  containerId,
  containerName,
  containerType,
  state = 'published',
  redirectPath,
  onUpdate,
  createdBy
}: ContainerManagementActionsProps) {
  const navigate = useNavigate();
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPaused = state === 'paused';
  const containerLabel = containerType.slice(0, -1); // Remove 's' from end

  const handleTogglePause = async () => {
    setPausing(true);
    const newState = isPaused ? 'published' : 'paused';

    try {
      const updateData: any = { 
        state: newState,
      };

      // Only set paused_by if we have createdBy
      if (createdBy && !isPaused) {
        updateData.paused_by = createdBy;
      } else if (isPaused) {
        updateData.paused_by = null;
      }

      const { error } = await supabase
        .from(containerType)
        .update(updateData)
        .eq('id', containerId);

      if (error) throw error;

      onUpdate({ state: newState });
      toast.success(isPaused ? `${containerLabel} resumed` : `${containerLabel} paused`);
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast.error(`Failed to update ${containerLabel} state`);
    } finally {
      setPausing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const { error } = await supabase
        .from(containerType)
        .delete()
        .eq('id', containerId);

      if (error) throw error;

      toast.success(`${containerLabel} deleted successfully`);
      navigate(redirectPath);
    } catch (error) {
      console.error(`Error deleting ${containerLabel}:`, error);
      toast.error(`Failed to delete ${containerLabel}`);
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Pause/Resume Section */}
      <Card className="border-2 border-yellow-200 bg-yellow-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPaused ? (
              <Play className="w-5 h-5 text-yellow-600" />
            ) : (
              <Pause className="w-5 h-5 text-yellow-600" />
            )}
            {isPaused ? `Resume ${containerLabel}` : `Pause ${containerLabel}`}
          </CardTitle>
          <CardDescription>
            {isPaused 
              ? `This ${containerLabel} is currently paused and hidden from public view. Resume it to make it visible again.`
              : `Temporarily hide this ${containerLabel} from public view without deleting it. You can resume it anytime.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant={isPaused ? "default" : "outline"}
            onClick={handleTogglePause}
            disabled={pausing}
            className={isPaused ? "" : "border-yellow-500 text-yellow-700 hover:bg-yellow-50"}
          >
            {pausing ? 'Processing...' : (isPaused ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Resume {containerLabel}
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause {containerLabel}
              </>
            ))}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Section */}
      <Card className="border-2 border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            Permanently delete this {containerLabel}. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {containerLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{containerName}</strong> and all associated data.
                  This action cannot be undone.
                  <br /><br />
                  All documents, reviews, and member data associated with this {containerLabel} will remain in the system
                  but will no longer be linked to it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : `Yes, delete ${containerLabel}`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </>
  );
}