/**
 * CircleSessionsPanel
 *
 * Shows planned sessions for a circle — including proposed (Date TBD) sessions
 * that haven't been scheduled yet. Admins can create sessions inline.
 * Members can RSVP via session_attendance.
 *
 * Sits above the existing CircleCalendar events section so members see
 * the full picture: planned sessions + scheduled events.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  X,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types/sessions';
import type { SessionType, SessionStatus } from '@/types/sessions';

interface CircleSession {
  id: string;
  name: string;
  description: string | null;
  session_type: SessionType;
  status: SessionStatus;
  start_date: string | null;
  duration_minutes: number | null;
  location: string | null;
  virtual_link: string | null;
  timezone: string;
  rsvp_count: number;
  user_rsvpd: boolean;
}

interface CircleSessionsPanelProps {
  circleId: string;
  isAdmin: boolean;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  session_type: 'meeting' as SessionType,
  start_date: '',
  start_time: '',
  duration_minutes: '',
  location: '',
  virtual_link: '',
};

export default function CircleSessionsPanel({ circleId, isAdmin }: CircleSessionsPanelProps) {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<CircleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadSessions();
  }, [circleId, profile]);

  async function loadSessions() {
    try {
      setLoading(true);

      // Fetch sessions for this circle
      const { data: rows, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('circle_id', circleId)
        .not('status', 'eq', 'cancelled')
        .order('start_date', { ascending: true, nullsFirst: true });

      if (error) throw error;
      if (!rows || rows.length === 0) {
        setSessions([]);
        return;
      }

      // Fetch RSVP counts and current user's RSVP in one query
      const sessionIds = rows.map(r => r.id);

      const { data: attendance } = await supabase
        .from('session_attendance')
        .select('session_id, user_id')
        .in('session_id', sessionIds)
        .eq('expected', true);

      const countMap: Record<string, number> = {};
      const rsvpdSet = new Set<string>();

      for (const row of attendance || []) {
        countMap[row.session_id] = (countMap[row.session_id] || 0) + 1;
        if (row.user_id === profile?.id) rsvpdSet.add(row.session_id);
      }

      setSessions(
        rows.map(r => ({
          ...r,
          rsvp_count: countMap[r.id] || 0,
          user_rsvpd: rsvpdSet.has(r.id),
        }))
      );
    } catch (err) {
      console.error('Error loading circle sessions:', err);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleRSVP(sessionId: string, currentlyRsvpd: boolean) {
    if (!profile) return;
    setRsvpLoading(sessionId);
    try {
      if (currentlyRsvpd) {
        const { error } = await supabase
          .from('session_attendance')
          .delete()
          .eq('session_id', sessionId)
          .eq('user_id', profile.id);
        if (error) throw error;
        toast.success('RSVP cancelled');
      } else {
        const { error } = await supabase
          .from('session_attendance')
          .insert({
            session_id: sessionId,
            user_id: profile.id,
            expected: true,
            attended: false,
            rsvp_status: 'yes',
          });
        if (error) throw error;
        toast.success('RSVP confirmed!');
      }

      // Update local state optimistically
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                user_rsvpd: !currentlyRsvpd,
                rsvp_count: currentlyRsvpd ? s.rsvp_count - 1 : s.rsvp_count + 1,
              }
            : s
        )
      );
    } catch (err) {
      console.error('RSVP error:', err);
      toast.error('Failed to update RSVP');
    } finally {
      setRsvpLoading(null);
    }
  }

  async function handleCreateSession() {
    if (!form.name.trim()) return toast.error('Session name is required');

    setSaving(true);
    try {
      // Build start_date: combine date + time if both provided, otherwise null
      let startDate: string | null = null;
      if (form.start_date) {
        const combined = form.start_time
          ? `${form.start_date}T${form.start_time}:00`
          : `${form.start_date}T00:00:00`;
        startDate = new Date(combined).toISOString();
      }

      const status: SessionStatus = startDate ? 'scheduled' : 'proposed';

      const { error } = await supabase.from('sessions').insert({
        circle_id: circleId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        session_type: form.session_type,
        status,
        start_date: startDate,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        location: form.location.trim() || null,
        virtual_link: form.virtual_link.trim() || null,
        timezone: 'America/New_York',
      });

      if (error) throw error;

      toast.success('Session added');
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      toast.error('Failed to create session');
    } finally {
      setSaving(false);
    }
  }

  // Split into proposed (no date) and scheduled (has date)
  const proposed = sessions.filter(s => !s.start_date || s.status === 'proposed');
  const scheduled = sessions.filter(s => s.start_date && s.status !== 'proposed');

  if (loading) {
    return (
      <div className="space-y-3 mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (sessions.length === 0 && !isAdmin) return null;

  return (
    <div className="space-y-4 mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-gray-900">Sessions</h3>
          {sessions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {sessions.length}
            </Badge>
          )}
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant={showForm ? 'outline' : 'default'}
            onClick={() => setShowForm(v => !v)}
          >
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? 'Cancel' : 'Add Session'}
          </Button>
        )}
      </div>

      {/* Inline create form */}
      {isAdmin && showForm && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Monthly Check-in, Design Workshop..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select
                  value={form.session_type}
                  onValueChange={v => setForm(f => ({ ...f, session_type: v as SessionType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>

              <div>
                <Label>Date <span className="text-gray-400 font-normal">(optional — leave blank for TBD)</span></Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Time EST <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  disabled={!form.start_date}
                />
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  placeholder="Room 101 or leave blank"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div>
                <Label>Virtual Link</Label>
                <Input
                  placeholder="https://zoom.us/..."
                  value={form.virtual_link}
                  onChange={e => setForm(f => ({ ...f, virtual_link: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="What will this session cover?"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreateSession} disabled={saving}>
                {saving ? 'Adding...' : 'Add Session'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposed / Date TBD sessions */}
      {proposed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
            Date TBD
          </p>
          {proposed.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onRSVP={handleRSVP}
              rsvpLoading={rsvpLoading}
            />
          ))}
        </div>
      )}

      {/* Scheduled sessions */}
      {scheduled.length > 0 && (
        <div className="space-y-2">
          {proposed.length > 0 && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Scheduled
            </p>
          )}
          {scheduled.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onRSVP={handleRSVP}
              rsvpLoading={rsvpLoading}
            />
          ))}
        </div>
      )}

      {/* Empty state for admins */}
      {sessions.length === 0 && isAdmin && !showForm && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">
              No sessions yet — add one to let members know what's planned
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add First Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: CircleSession;
  onRSVP: (id: string, currentlyRsvpd: boolean) => void;
  rsvpLoading: string | null;
}

function SessionCard({ session, onRSVP, rsvpLoading }: SessionCardProps) {
  const isProposed = !session.start_date || session.status === 'proposed';
  const startDate = session.start_date ? parseISO(session.start_date) : null;
  const isLoading = rsvpLoading === session.id;

  return (
    <Card className={`transition-shadow hover:shadow-sm ${isProposed ? 'border-dashed border-amber-200 bg-amber-50/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-gray-900">{session.name}</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
              </Badge>
              {isProposed && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                  Date TBD
                </Badge>
              )}
            </div>

            {session.description && (
              <p className="text-sm text-gray-500 line-clamp-1 mb-2">{session.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {/* Date / time */}
              {startDate ? (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(startDate, 'MMM d, yyyy')}
                  {format(startDate, 'HH:mm') !== '00:00' && (
                    <span className="flex items-center gap-0.5 ml-1">
                      <Clock className="w-3 h-3" />
                      {format(startDate, 'h:mm a')} EST
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 italic">
                  <Calendar className="w-3.5 h-3.5" />
                  Date to be announced
                </span>
              )}

              {session.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {session.duration_minutes} min
                </span>
              )}

              {session.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {session.location}
                </span>
              )}

              {session.virtual_link && (
                <a
                  href={session.virtual_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <Video className="w-3.5 h-3.5" />
                  Join link
                </a>
              )}

              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {session.rsvp_count} going
              </span>
            </div>
          </div>

          {/* Right: RSVP button */}
          <Button
            size="sm"
            variant={session.user_rsvpd ? 'secondary' : 'outline'}
            className={session.user_rsvpd ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' : ''}
            onClick={() => onRSVP(session.id, session.user_rsvpd)}
            disabled={isLoading}
          >
            {isLoading ? (
              '...'
            ) : session.user_rsvpd ? (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Going</>
            ) : (
              'RSVP'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
