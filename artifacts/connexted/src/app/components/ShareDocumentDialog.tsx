import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { Users, Globe, Share2 } from 'lucide-react';

interface Circle {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
}

interface ShareDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  currentCircleIds: string[];
  currentTableIds: string[];
  onSuccess?: () => void;
}

export default function ShareDocumentDialog({
  open,
  onClose,
  documentId,
  documentTitle,
  currentCircleIds,
  currentTableIds,
  onSuccess,
}: ShareDocumentDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCircles, setSelectedCircles] = useState<string[]>(currentCircleIds || []);
  const [selectedTables, setSelectedTables] = useState<string[]>(currentTableIds || []);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    if (open && profile) {
      fetchContainers();
    }
  }, [open, profile]);

  useEffect(() => {
    setSelectedCircles(currentCircleIds || []);
    setSelectedTables(currentTableIds || []);
  }, [currentCircleIds, currentTableIds]);

  const fetchContainers = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch user's circles
      const { data: userCircles, error: circlesError } = await supabase
        .from('circles')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');

      if (circlesError) throw circlesError;

      // Fetch user's tables
      const { data: userTables, error: tablesError } = await supabase
        .from('tables')
        .select('id, name')
        .contains('member_ids', [profile.id])
        .order('name');

      if (tablesError) throw tablesError;

      setCircles(userCircles || []);
      setTables(userTables || []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load circles and tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCircles.length === 0 && selectedTables.length === 0) {
      toast.error('Please select at least one circle or table to share with');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          circle_ids: selectedCircles,
          table_ids: selectedTables,
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document sharing updated!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update sharing settings');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCircle = (circleId: string) => {
    if (selectedCircles.includes(circleId)) {
      setSelectedCircles(selectedCircles.filter(id => id !== circleId));
    } else {
      setSelectedCircles([...selectedCircles, circleId]);
    }
  };

  const toggleTable = (tableId: string) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId));
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };

  const handleMakePersonal = async () => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          circle_ids: [],
          table_ids: [],
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document made personal');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to make document personal');
    } finally {
      setSubmitting(false);
    }
  };

  const isCurrentlyShared = currentCircleIds.length > 0 || currentTableIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Manage sharing settings for &quot;{documentTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Circles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <Label>Share with Circles</Label>
              </div>
              {circles.length === 0 ? (
                <p className="text-sm text-gray-500">You are not a member of any circles yet.</p>
              ) : (
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {circles.map((circle) => (
                    <label
                      key={circle.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCircles.includes(circle.id)}
                        onChange={() => toggleCircle(circle.id)}
                        className="rounded"
                      />
                      <span>{circle.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Tables */}
            {tables.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <Label>Share with Tables</Label>
                </div>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {tables.map((table) => (
                    <label
                      key={table.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.id)}
                        onChange={() => toggleTable(table.id)}
                        className="rounded"
                      />
                      <span>{table.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Current Status */}
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <div className="font-medium mb-2">Current Status:</div>
              {!isCurrentlyShared && (
                <p className="text-gray-600">📁 This document is personal (not shared)</p>
              )}
              {selectedCircles.length > 0 && (
                <p className="text-gray-600">
                  👥 Sharing with {selectedCircles.length} circle{selectedCircles.length > 1 ? 's' : ''}
                </p>
              )}
              {selectedTables.length > 0 && (
                <p className="text-gray-600">
                  🌐 Sharing with {selectedTables.length} table{selectedTables.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isCurrentlyShared && (
            <Button
              type="button"
              variant="outline"
              onClick={handleMakePersonal}
              disabled={submitting || loading}
              className="sm:mr-auto"
            >
              Make Personal
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || (selectedCircles.length === 0 && selectedTables.length === 0)}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
