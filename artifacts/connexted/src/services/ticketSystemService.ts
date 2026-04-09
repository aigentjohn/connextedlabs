/**
 * Ticket System Service
 *
 * Frontend API client for:
 *  - Ticket Templates (KV-backed product definitions)
 *  - Ticket Inventory  (individual sellable units)
 *  - Waitlist          (universal join/leave for any container)
 */

import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-handler';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f`;

// ─── Auth token helpers ───────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (err) {
    logError('Error getting auth token:', err, { component: 'ticketSystemService' });
    return null;
  }
}

async function api<T = any>(
  path: string,
  opts: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  const token = await getAuthToken();

  if (requireAuth && !token) {
    throw new Error('Authentication required');
  }

  // Always use publicAnonKey in Authorization to satisfy the Supabase gateway.
  // Pass the real user JWT via X-User-Token so route handlers can validate identity.
  // This matches the pattern used throughout the rest of the codebase.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['X-User-Token'] = token;
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    logError(`API Error [${path}]:`, { status: res.status, error: err, requireAuth, hasToken: !!token }, { component: 'ticketSystemService' });
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpiryType = 'never' | 'fixed_date' | 'months_from_assignment';
export type InventoryStatus = 'available' | 'assigned' | 'voided';

export interface TicketTemplateUnlocks {
  type: 'container' | 'user_class' | 'bundle';
  containerType?: string;
  containerId?: string;
  containerName?: string;
  userClass?: number;
  bundleItems?: Array<{ type: string; id: string; name?: string }>;
}

export interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  unlocks: TicketTemplateUnlocks;
  faceValueCents: number;
  currency: string;
  expiryType: ExpiryType;
  expiryDate: string | null;
  expiryMonths: number | null;
  ticketType: string;
  acquisitionSource: string;
  capabilities: Record<string, any>;
  serialPrefix: string;
  status: 'active' | 'archived';
  inventoryCount: number;
  assignedCount: number;
  // Marketplace offering correlation
  offeringId: string | null;
  offeringName: string | null;
  // Kit Commerce — denormalized routing key copied from offering.kit_product_id
  // Used by the webhook to find the right template in one KV scan (no Supabase hop).
  kitProductId: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  templateId: string;
  templateName: string;
  serialNumber: string;
  batchId: string;
  status: InventoryStatus;
  assignedToUserId: string | null;
  assignedToEmail: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  pricePaidCents: number | null;
  paymentReference: string | null;
  accessTicketId: string | null;
  applicationId: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

export interface WaitlistEntry {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  containerType: string;
  containerId: string;
  containerName: string;
  // Template that unlocks this container — set when joining via a ticket template flow
  templateId: string | null;
  position: number;
  total: number;
}

// ─── Template API ─────────────────────────────────────────────────────────────

export const templateApi = {
  list: (): Promise<{ templates: TicketTemplate[] }> =>
    api('/ticket-templates'),  // Requires authentication

  get: (id: string): Promise<{ template: TicketTemplate }> =>
    api(`/ticket-templates/${id}`),  // Requires authentication

  /**
   * Public: returns active templates whose unlocks target a specific container.
   * Used by program/course landing pages to discover if a waitlist exists.
   * No admin auth required — works for logged-out visitors too.
   */
  forContainer: (
    containerType: string,
    containerId: string,
  ): Promise<{ templates: TicketTemplate[] }> =>
    api(
      `/ticket-templates/for-container?containerType=${encodeURIComponent(containerType)}&containerId=${encodeURIComponent(containerId)}`,
      {},
      false, // requireAuth = false — public endpoint
    ),

  /**
   * Public: returns active templates whose offeringId matches the marketplace offering.
   * Used by OfferingProfilePage to discover if a waitlist exists.
   */
  forOffering: (offeringId: string): Promise<{ templates: TicketTemplate[] }> =>
    api(
      `/ticket-templates/for-container?offeringId=${encodeURIComponent(offeringId)}`,
      {},
      false, // requireAuth = false — public endpoint
    ),

  create: (data: Partial<TicketTemplate>): Promise<{ template: TicketTemplate }> =>
    api('/ticket-templates', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<TicketTemplate>): Promise<{ template: TicketTemplate }> =>
    api(`/ticket-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  archive: (id: string): Promise<{ success: boolean }> =>
    api(`/ticket-templates/${id}`, { method: 'DELETE' }),
};

// ─── Inventory helpers ────────────────────────────────────────────────────────

function dbRowToInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    serialNumber: row.serial_number,
    batchId: row.batch_id,
    status: row.status as InventoryStatus,
    assignedToUserId: row.assigned_to_user_id ?? null,
    assignedToEmail: row.assigned_to_email ?? null,
    assignedToName: row.assigned_to_name ?? null,
    assignedAt: row.assigned_at ?? null,
    assignedBy: row.assigned_by ?? null,
    pricePaidCents: row.price_paid_cents ?? null,
    paymentReference: row.payment_reference ?? null,
    accessTicketId: row.access_ticket_id ?? null,
    applicationId: row.application_id ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

// ─── Inventory API ────────────────────────────────────────────────────────────
// All inventory CRUD goes directly to Postgres (ticket_inventory_items table).
// Template management still uses the edge function KV store (unchanged).

export const inventoryApi = {
  listAll: async (): Promise<{ items: InventoryItem[] }> => {
    const { data, error } = await supabase
      .from('ticket_inventory_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data || []).map(dbRowToInventoryItem) };
  },

  listByTemplate: async (templateId: string): Promise<{ items: InventoryItem[] }> => {
    const { data, error } = await supabase
      .from('ticket_inventory_items')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data || []).map(dbRowToInventoryItem) };
  },

  listForUser: async (userId: string): Promise<{ items: InventoryItem[] }> => {
    const { data, error } = await supabase
      .from('ticket_inventory_items')
      .select('*')
      .eq('assigned_to_user_id', userId)
      .order('assigned_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data || []).map(dbRowToInventoryItem) };
  },

  createBatch: async (data: {
    templateId: string;
    quantity: number;
    notes?: string;
  }): Promise<{ batchId: string; items: InventoryItem[]; count: number }> => {
    // 1. Fetch template metadata from edge function (still works fine).
    const { template } = await templateApi.get(data.templateId);

    // 2. Derive serial prefix: use template.serialPrefix, or first 3 chars of name.
    const rawPrefix = (template.serialPrefix || template.name.substring(0, 3));
    const prefix = rawPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const batchId = crypto.randomUUID();

    const { data: { user } } = await supabase.auth.getUser();

    const rows = Array.from({ length: data.quantity }, (_, i) => ({
      template_id: data.templateId,
      template_name: template.name,
      serial_number: `${prefix}-${timestamp}-${String(i + 1).padStart(4, '0')}`,
      batch_id: batchId,
      status: 'available',
      notes: data.notes || null,
      created_by: user?.id || null,
    }));

    const { data: inserted, error } = await supabase
      .from('ticket_inventory_items')
      .insert(rows)
      .select();

    if (error) throw new Error(error.message);

    return {
      batchId,
      items: (inserted || []).map(dbRowToInventoryItem),
      count: inserted?.length ?? 0,
    };
  },

  assign: async (itemId: string, data: {
    userId: string;
    pricePaidCents?: number;
    paymentReference?: string;
    notes?: string;
    applicationId?: string;
    // When true, also remove the user from the waitlist for this template's container.
    removeFromWaitlist?: boolean;
  }): Promise<{ item: InventoryItem; accessTicketId: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser();

    // Look up assignee profile for email/name.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.userId)
      .single();

    const { data: updated, error } = await supabase
      .from('ticket_inventory_items')
      .update({
        status: 'assigned',
        assigned_to_user_id: data.userId,
        assigned_to_email: profile?.email ?? null,
        assigned_to_name: profile?.full_name ?? null,
        assigned_at: new Date().toISOString(),
        assigned_by: user?.id ?? null,
        price_paid_cents: data.pricePaidCents ?? null,
        payment_reference: data.paymentReference ?? null,
        notes: data.notes ?? null,
        application_id: data.applicationId ?? null,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { item: dbRowToInventoryItem(updated), accessTicketId: null };
  },

  void: async (itemId: string): Promise<{ item: InventoryItem }> => {
    const { data: updated, error } = await supabase
      .from('ticket_inventory_items')
      .update({ status: 'voided' })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { item: dbRowToInventoryItem(updated) };
  },
};

// ─── Waitlist API ─────────────────────────────────────────────────────────────

export const waitlistApi = {
  join: (
    containerType: string,
    containerId: string,
    containerName?: string,
    // Pass the ticket template ID so the inventory admin can correlate
    // the waitlist with the right template in the fulfillment panel.
    templateId?: string,
  ): Promise<{
    position: number;
    total: number;
    alreadyOnWaitlist?: boolean;
  }> =>
    api('/waitlist/join', {
      method: 'POST',
      body: JSON.stringify({ containerType, containerId, containerName, templateId }),
    }),

  leave: (containerType: string, containerId: string): Promise<{ success: boolean }> =>
    api('/waitlist/leave', {
      method: 'DELETE',
      body: JSON.stringify({ containerType, containerId }),
    }),

  getPosition: (containerType: string, containerId: string): Promise<{
    onWaitlist: boolean;
    position: number | null;
    total: number;
  }> =>
    api(`/waitlist/${containerType}/${containerId}/position`),

  getAdminList: (containerType: string, containerId: string): Promise<{
    list: WaitlistEntry[];
    total: number;
  }> =>
    api(`/waitlist/${containerType}/${containerId}`),

  // Returns the waitlist for a template by deriving the container from
  // template.unlocks — this is what the inventory admin panel uses.
  getForTemplate: (templateId: string): Promise<{
    list: WaitlistEntry[];
    total: number;
    containerType?: string;
    containerId?: string;
    note?: string;
  }> =>
    api(`/waitlist/template/${templateId}`),

  getMyWaitlists: (): Promise<{ waitlists: WaitlistEntry[] }> =>
    api('/waitlist/me'),
};

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function templateColor(color: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  };
  return map[color] || map['indigo'];
}

export function expiryLabel(template: TicketTemplate): string {
  if (template.expiryType === 'never') return 'Never expires';
  if (template.expiryType === 'fixed_date' && template.expiryDate)
    return `Expires ${new Date(template.expiryDate).toLocaleDateString()}`;
  if (template.expiryType === 'months_from_assignment' && template.expiryMonths)
    return `Expires ${template.expiryMonths} months after assignment`;
  return 'Unknown expiry';
}