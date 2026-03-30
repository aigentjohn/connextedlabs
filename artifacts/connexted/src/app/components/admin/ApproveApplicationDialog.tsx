/**
 * Approve Application Dialog
 *
 * Approves a program application with an optional ticket issuance step.
 * When a ticket template is selected, an inventory item from that template
 * will be assigned to the applicant automatically on approval.
 */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Check, Ticket, Package, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  templateApi, inventoryApi,
  type TicketTemplate, type InventoryItem,
  formatCents, expiryLabel,
} from '@/services/ticketSystemService';

interface Application {
  id: string;
  name: string;
  email: string;
  /** Supabase user_id if the applicant has an account */
  user_id?: string;
}

interface ApproveApplicationDialogProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string, ticketItemId?: string) => void;
}

export function ApproveApplicationDialog({
  application,
  isOpen,
  onClose,
  onConfirm,
}: ApproveApplicationDialogProps) {
  const [notes, setNotes] = useState('');

  // Ticket issuance
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [issuing, setIssuing] = useState(false);

  // Load templates when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingTemplates(true);
    templateApi.list()
      .then(({ templates: data }) => {
        setTemplates(data.filter(t => t.status !== 'archived'));
      })
      .catch(err => console.warn('Could not load ticket templates:', err))
      .finally(() => setLoadingTemplates(false));
  }, [isOpen]);

  // Load available inventory for the selected template
  useEffect(() => {
    if (selectedTemplateId === 'none' || !selectedTemplateId) {
      setAvailableItems([]);
      return;
    }
    setLoadingItems(true);
    inventoryApi.listByTemplate(selectedTemplateId)
      .then(({ items }) => {
        setAvailableItems(items.filter(i => i.status === 'available'));
        // Pre-fill price from template
        const tmpl = templates.find(t => t.id === selectedTemplateId);
        if (tmpl) setCustomPrice(String(tmpl.faceValueCents));
      })
      .catch(err => console.warn('Could not load inventory:', err))
      .finally(() => setLoadingItems(false));
  }, [selectedTemplateId, templates]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleConfirm = async () => {
    try {
      setIssuing(true);

      // If a template is selected and inventory exists and applicant has a user_id,
      // assign the first available ticket
      let ticketItemId: string | undefined;
      if (selectedTemplateId !== 'none' && availableItems.length > 0 && application?.user_id) {
        const item = availableItems[0];
        await inventoryApi.assign(item.id, {
          userId: application.user_id,
          pricePaidCents: customPrice !== '' ? Number(customPrice) : selectedTemplate?.faceValueCents,
          paymentReference: paymentRef || undefined,
          notes: `Issued via application approval for ${application.name}`,
          applicationId: application.id,
        });
        ticketItemId = item.id;
        toast.success(`Ticket ${item.serialNumber} issued to ${application.name}`);
      } else if (selectedTemplateId !== 'none' && availableItems.length === 0) {
        toast.warning('No inventory available for selected template — approval will proceed without ticket');
      }

      onConfirm(notes || undefined, ticketItemId);
      setNotes('');
      setSelectedTemplateId('none');
      setCustomPrice('');
      setPaymentRef('');
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message}`);
    } finally {
      setIssuing(false);
    }
  };

  const handleCancel = () => {
    setNotes('');
    setSelectedTemplateId('none');
    setCustomPrice('');
    setPaymentRef('');
    onClose();
  };

  if (!application) return null;

  const willIssueTicket =
    selectedTemplateId !== 'none' &&
    availableItems.length > 0 &&
    !!application.user_id;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            Approve Application
          </DialogTitle>
          <DialogDescription>
            Approving <strong>{application.name}</strong>'s application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Applicant info */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="font-semibold text-sm mb-0.5">{application.name}</div>
            <div className="text-xs text-gray-600">{application.email}</div>
            {!application.user_id && (
              <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                No platform account — ticket issuance will be skipped
              </div>
            )}
          </div>

          {/* Approval notes */}
          <div>
            <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
            <textarea
              id="approval-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about this approval…"
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
            />
          </div>

          {/* ── Ticket issuance ── */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-sm">Issue Access Ticket (Optional)</span>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-gray-400">
                No ticket templates found. Create one in{' '}
                <a href="/platform-admin/ticket-templates" className="text-indigo-600 underline">
                  Ticket Templates
                </a>
                .
              </p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a ticket template…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No ticket (approve only) —</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.faceValueCents ? formatCents(t.faceValueCents) : 'Free'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedTemplateId !== 'none' && (
              <>
                {loadingItems ? (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking inventory…
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    No available inventory for this template. Create a batch first.
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {availableItems.length} ticket{availableItems.length !== 1 ? 's' : ''} available.
                    Will assign: <span className="font-mono font-bold">{availableItems[0].serialNumber}</span>
                  </div>
                )}

                {availableItems.length > 0 && selectedTemplate && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Price Paid (cents)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                        placeholder={String(selectedTemplate.faceValueCents)}
                      />
                      <div className="text-xs text-gray-400 mt-0.5">
                        Face: {formatCents(selectedTemplate.faceValueCents)} · {expiryLabel(selectedTemplate)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Payment Reference</Label>
                      <Input
                        value={paymentRef}
                        onChange={e => setPaymentRef(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                        placeholder="Invoice / ref #"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* What happens */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 text-sm">What happens next:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Application status updated to "Approved"</li>
              <li>• Applicant added to program members</li>
              <li>• In-app notification sent to applicant</li>
              {willIssueTicket && (
                <>
                  <li className="text-indigo-800 font-medium">
                    • Ticket <span className="font-mono">{availableItems[0]?.serialNumber}</span> issued to {application.name}
                  </li>
                  <li className="text-indigo-800">• Access ticket created — they can log in and access content</li>
                </>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleConfirm}
              disabled={issuing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {issuing
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Check className="w-4 h-4 mr-2" />}
              {willIssueTicket ? 'Approve & Issue Ticket' : 'Confirm Approval'}
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
