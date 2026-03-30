import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

interface ModerationPasswordDialogProps {
  circleIds: string[];
  onSuccess: () => void;
}

export default function ModerationPasswordDialog({ circleIds, onSuccess }: ModerationPasswordDialogProps) {
  // TODO: Update to use Supabase
  return null;
}