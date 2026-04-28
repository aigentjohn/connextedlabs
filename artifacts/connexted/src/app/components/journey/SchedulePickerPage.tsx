import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  CalendarDays,
  ArrowLeft,
  Check,
  Users,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface SchedulePoll {
  id: string;
  title: string;
  description: string | null;
  timezone: string | null;
  confirmed_slot_id: string | null;
}

interface ScheduleSlot {
  id: string;
  schedule_poll_id: string;
  slot_start: string;
  slot_end: string | null;
  label: string | null;
}

interface ScheduleResponse {
  id: string;
  schedule_poll_id: string;
  user_id: string;
  slot_id: string;
  available: boolean;
}

interface SlotWithCount extends ScheduleSlot {
  count: number;
  myResponse: boolean | null;
}

export default function SchedulePickerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [poll, setPoll] = useState<SchedulePoll | null>(null);
  const [slots, setSlots] = useState<SlotWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [confirmingSlot, setConfirmingSlot] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super';

  useEffect(() => {
    if (id) loadData();
  }, [id, profile]);

  const loadData = async () => {
    if (!id || !profile) return;
    setLoading(true);
    try {
      const { data: p, error: pErr } = await supabase
        .from('schedule_polls')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr) throw pErr;
      setPoll(p);

      const { data: slotRows } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('schedule_poll_id', id)
        .order('slot_start', { ascending: true });

      const { data: responses } = await supabase
        .from('schedule_responses')
        .select('*')
        .eq('schedule_poll_id', id)
        .eq('available', true);

      const allResponses = (responses as ScheduleResponse[]) || [];

      const enriched: SlotWithCount[] = ((slotRows as ScheduleSlot[]) || []).map(slot => ({
        ...slot,
        count: allResponses.filter(r => r.slot_id === slot.id).length,
        myResponse: allResponses.find(r => r.slot_id === slot.id && r.user_id === profile.id)?.available ?? null,
      }));

      setSlots(enriched);
    } catch (err) {
      console.error('Error loading schedule picker:', err);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (slotId: string, currentlyAvailable: boolean | null) => {
    if (!profile) return;
    const newAvailable = !currentlyAvailable;
    setSavingSlot(slotId);
    try {
      const { error } = await supabase
        .from('schedule_responses')
        .upsert({
          schedule_poll_id: id,
          user_id: profile.id,
          slot_id: slotId,
          available: newAvailable,
        }, { onConflict: 'schedule_poll_id,user_id,slot_id' });
      if (error) throw error;

      setSlots(prev => prev.map(s =>
        s.id === slotId
          ? {
              ...s,
              myResponse: newAvailable,
              count: s.count + (newAvailable ? 1 : -1),
            }
          : s
      ));
    } catch {
      toast.error('Failed to save response');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleConfirmSlot = async (slotId: string) => {
    setConfirmingSlot(slotId);
    try {
      const { error } = await supabase
        .from('schedule_polls')
        .update({ confirmed_slot_id: slotId })
        .eq('id', id);
      if (error) throw error;
      setPoll(prev => prev ? { ...prev, confirmed_slot_id: slotId } : prev);
      toast.success('Time slot confirmed!');
    } catch {
      toast.error('Failed to confirm slot');
    } finally {
      setConfirmingSlot(null);
    }
  };

  const formatSlot = (slot: ScheduleSlot) => {
    try {
      const start = parseISO(slot.slot_start);
      const startStr = format(start, 'EEE, MMM d · h:mm a');
      if (slot.slot_end) {
        const end = parseISO(slot.slot_end);
        return `${startStr} – ${format(end, 'h:mm a')}`;
      }
      return startStr;
    } catch {
      return slot.label || slot.slot_start;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Schedule picker not found.</p>
      </div>
    );
  }

  const confirmedSlot = slots.find(s => s.id === poll.confirmed_slot_id);
  const maxCount = Math.max(...slots.map(s => s.count), 1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <CalendarDays className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl">{poll.title}</CardTitle>
              {poll.description && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{poll.description}</p>
              )}
              {poll.timezone && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {poll.timezone}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Confirmed slot banner */}
      {confirmedSlot && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Confirmed Time</p>
                <p className="text-sm text-green-700">{formatSlot(confirmedSlot)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slots */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {poll.confirmed_slot_id ? 'All Time Options' : 'Mark Your Availability'}
          </CardTitle>
          {!poll.confirmed_slot_id && (
            <p className="text-xs text-gray-500">Click a time slot to mark yourself as available.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No time slots available yet.</p>
          ) : (
            slots.map(slot => {
              const isConfirmed = slot.id === poll.confirmed_slot_id;
              const isAvailable = slot.myResponse === true;
              const pct = Math.round((slot.count / maxCount) * 100);

              return (
                <div
                  key={slot.id}
                  className={`relative rounded-lg border p-3 overflow-hidden transition-colors ${
                    isConfirmed
                      ? 'border-green-400 bg-green-50'
                      : isAvailable
                      ? 'border-teal-300 bg-teal-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Background fill bar */}
                  {!isConfirmed && (
                    <div
                      className="absolute inset-y-0 left-0 bg-teal-100 opacity-40 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {slot.label || formatSlot(slot)}
                      </p>
                      {slot.label && (
                        <p className="text-xs text-gray-500">{formatSlot(slot)}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {slot.count}
                      </span>

                      {isConfirmed ? (
                        <Badge className="bg-green-600 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant={isAvailable ? 'default' : 'outline'}
                            className={isAvailable ? 'bg-teal-600 hover:bg-teal-700 h-7 px-2' : 'h-7 px-2'}
                            onClick={() => handleToggleAvailability(slot.id, slot.myResponse)}
                            disabled={savingSlot === slot.id}
                          >
                            {savingSlot === slot.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : isAvailable
                              ? <><Check className="w-3 h-3 mr-1" />Available</>
                              : 'I\'m free'
                            }
                          </Button>

                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleConfirmSlot(slot.id)}
                              disabled={confirmingSlot === slot.id}
                            >
                              {confirmingSlot === slot.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : 'Confirm'
                              }
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
