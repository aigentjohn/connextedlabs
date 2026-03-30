import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { CheckCircle, HelpCircle, XCircle, Users, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CalendarStatus } from './StatusBadge';

interface RSVPActionsProps {
  itemId: string;
  itemType: 'session' | 'event';
  currentStatus: CalendarStatus;
  onRSVPChange: () => void;
  onManageAttendees?: () => void;
  registrationUrl?: string | null;
  agendaUrl?: string | null;
  signupsClosed?: boolean;
}

export function RSVPActions({ 
  itemId, 
  itemType,
  currentStatus, 
  onRSVPChange,
  onManageAttendees,
  registrationUrl,
  agendaUrl,
  signupsClosed
}: RSVPActionsProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleMarkAttendance = async (didAttend: boolean) => {
    if (!profile || itemType !== 'session') {
      toast.error('Attendance tracking is only available for sessions');
      return;
    }

    try {
      setLoading(true);

      // Upsert attendance record - mark as attended
      const { error } = await supabase
        .from('session_attendance')
        .upsert({
          session_id: itemId,
          user_id: profile.id,
          expected: true, // Assume they intended to attend if marking attendance
          attended: didAttend,
          rsvp_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,user_id'
        });

      if (error) throw error;

      toast.success(didAttend ? '✅ Marked as attended!' : 'Attendance updated');
      onRSVPChange();
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (rsvpStatus: 'yes' | 'maybe' | 'no') => {
    if (!profile) {
      toast.error('Please log in to RSVP');
      return;
    }

    try {
      setLoading(true);

      if (itemType === 'session') {
        // Handle session RSVP using session_attendance table
        const { error } = await supabase
          .from('session_attendance')
          .upsert({
            session_id: itemId,
            user_id: profile.id,
            expected: rsvpStatus === 'yes',
            attended: false, // Will be updated separately via handleMarkAttendance
            rsvp_at: new Date().toISOString()
          }, {
            onConflict: 'session_id,user_id'
          });

        if (error) throw error;
      } else {
        // Handle event RSVP using events.attendee_ids array
        const { data: event } = await supabase
          .from('events')
          .select('attendee_ids')
          .eq('id', itemId)
          .single();

        if (!event) throw new Error('Event not found');

        const attendeeIds = event.attendee_ids || [];
        const isCurrentlyAttending = attendeeIds.includes(profile.id);

        let updatedAttendeeIds;
        if (rsvpStatus === 'yes' && !isCurrentlyAttending) {
          updatedAttendeeIds = [...attendeeIds, profile.id];
        } else if (rsvpStatus !== 'yes' && isCurrentlyAttending) {
          updatedAttendeeIds = attendeeIds.filter((id: string) => id !== profile.id);
        } else {
          updatedAttendeeIds = attendeeIds;
        }

        const { error } = await supabase
          .from('events')
          .update({ attendee_ids: updatedAttendeeIds })
          .eq('id', itemId);

        if (error) throw error;
      }
      
      toast.success(
        rsvpStatus === 'yes' ? "You're attending! 🎉" :
        rsvpStatus === 'maybe' ? "Marked as maybe" :
        "RSVP updated - Hope to see you at the next one!"
      );
      
      onRSVPChange();
    } catch (error) {
      console.error('RSVP error:', error);
      toast.error('Failed to update RSVP');
    } finally {
      setLoading(false);
    }
  };

  // Past sessions - show self-attendance tracking for sessions only
  if (currentStatus === 'attended' || currentStatus === 'missed' || currentStatus === 'past_no_rsvp') {
    // For sessions, allow self-reporting attendance
    if (itemType === 'session') {
      return (
        <div className="space-y-2">
          {agendaUrl && (
            <div className="flex gap-2 mb-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(agendaUrl, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Agenda
                </Button>
            </div>
          )}
          {currentStatus === 'attended' ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
              <CheckCircle className="w-4 h-4" />
              <span>You attended this session</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => handleMarkAttendance(false)}
                disabled={loading}
              >
                Unmark
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Did you attend this session?
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleMarkAttendance(true)}
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Yes, I attended
                </Button>
                {currentStatus === 'missed' && (
                  <span className="text-sm text-gray-500 self-center">
                    (You RSVP'd but didn't attend)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // For events, just show agenda if available
    if (agendaUrl) {
      return (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(agendaUrl, '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            View Agenda
          </Button>
        </div>
      );
    }
    return null;
  }

  // Hosting view
  if (currentStatus === 'hosting') {
    return (
      <div className="flex gap-2 flex-wrap">
        {agendaUrl && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(agendaUrl, '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            View Agenda
          </Button>
        )}
        <Button 
          variant="default" 
          size="sm"
          onClick={onManageAttendees}
        >
          <Users className="w-4 h-4 mr-2" />
          Manage Attendees
        </Button>
      </div>
    );
  }

  // Signups are closed - show message
  if (signupsClosed) {
    return (
      <div className="space-y-2">
        {agendaUrl && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(agendaUrl, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Agenda
            </Button>
          </div>
        )}
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded">
          ⛔ {registrationUrl ? 'Registration Closed' : 'RSVPs Closed'}
        </div>
      </div>
    );
  }

  // External registration URL provided - show Register button instead of RSVP
  if (registrationUrl) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {agendaUrl && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(agendaUrl, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Agenda
            </Button>
          )}
          <Button 
            variant="default" 
            size="sm"
            onClick={() => window.open(registrationUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Register
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Registration required via external platform
        </p>
      </div>
    );
  }

  // Platform RSVP - Needs RSVP or invited - show full RSVP options
  if (currentStatus === 'needs_rsvp' || currentStatus === 'invited') {
    return (
      <div className="space-y-2">
        {agendaUrl && (
          <div className="flex gap-2 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(agendaUrl, '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Agenda
            </Button>
          </div>
        )}
        <div className="text-sm font-medium text-gray-700">
          🎯 Please RSVP:
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="default" 
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleRSVP('yes')}
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Yes, I'll be there
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleRSVP('maybe')}
            disabled={loading}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Maybe
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleRSVP('no')}
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Can't make it
          </Button>
        </div>
      </div>
    );
  }

  // Already RSVP'd - show change option
  return (
    <div className="space-y-2">
      {agendaUrl && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(agendaUrl, '_blank')}
          >
            <FileText className="w-4 h-4 mr-2" />
            View Agenda
          </Button>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm text-gray-600">
          Change RSVP:
        </div>
        <div className="flex gap-2">
          {currentStatus !== 'attending' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleRSVP('yes')}
              disabled={loading}
            >
              Yes
            </Button>
          )}
          {currentStatus !== 'maybe' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleRSVP('maybe')}
              disabled={loading}
            >
              Maybe
            </Button>
          )}
          {currentStatus !== 'not_attending' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleRSVP('no')}
              disabled={loading}
            >
              No
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}