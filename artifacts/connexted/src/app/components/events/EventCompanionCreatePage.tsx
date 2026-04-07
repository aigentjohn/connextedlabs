import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Search } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  start_time: string;
}

export default function EventCompanionCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_time')
          .order('start_time', { ascending: false });
        if (error) throw error;
        setEvents(data || []);
      } catch (err: any) {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  async function handleCreate() {
    if (!name.trim() || !selectedEventId || !profile) {
      toast.error('Please enter a name and select an event');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('event_companions')
        .insert({
          name: name.trim(),
          event_id: selectedEventId,
          notes: notes.trim() || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Event companion created');
      navigate(`/event-companions/${data.id}`);
    } catch (err: any) {
      console.error('Create error:', err);
      toast.error('Failed to create companion');
    } finally {
      setSaving(false);
    }
  }

  const filteredEvents = events.filter((e) => {
    if (!eventSearch) return true;
    return e.title.toLowerCase().includes(eventSearch.toLowerCase());
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Event Companions', href: '/event-companions' },
          { label: 'New' },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-900">New Event Companion</h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tech Summit Companion Pack"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              {selectedEvent && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-indigo-900">{selectedEvent.title}</p>
                    <p className="text-sm text-indigo-600">
                      {new Date(selectedEvent.start_time).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEventId('')}>
                    Change
                  </Button>
                </div>
              )}

              {!selectedEventId && (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search events..."
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {filteredEvents.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No events found</p>
                    ) : (
                      filteredEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(event.start_time).toLocaleDateString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/event-companions')}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={saving || !name.trim() || !selectedEventId}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Creating...' : 'Create Companion'}
        </Button>
      </div>
    </div>
  );
}
