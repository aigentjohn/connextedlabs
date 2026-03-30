/**
 * Container Actions Hook
 * 
 * Provides action handlers for container interactions (join, leave, request, etc.)
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { waitlistApi } from '@/services/ticketSystemService';

interface UseContainerActionsProps {
  containerId: string;
  containerType: string;
  containerName: string;
  userId: string | null;
  onSuccess?: () => void;
}

export function useContainerActions({
  containerId,
  containerType,
  containerName,
  userId,
  onSuccess
}: UseContainerActionsProps) {
  const [loading, setLoading] = useState(false);

  /**
   * Join container (for open access type)
   * Creates 'enrolled' membership state immediately
   */
  const handleJoin = async () => {
    if (!userId) {
      toast.error('Please log in to join');
      return;
    }

    setLoading(true);
    try {
      // Create enrolled membership state
      const { error } = await supabase
        .from('membership_states')
        .insert({
          user_id: userId,
          entity_type: containerType,
          entity_id: containerId,
          state: 'enrolled',
          enrolled_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`Joined ${containerName}!`);
      onSuccess?.();
    } catch (error) {
      console.error('Error joining container:', error);
      toast.error('Failed to join container');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request to join (for request access type)
   * Creates 'applied' membership state
   */
  const handleRequestToJoin = async () => {
    if (!userId) {
      toast.error('Please log in to request access');
      return;
    }

    setLoading(true);
    try {
      // Create applied membership state
      const { error } = await supabase
        .from('membership_states')
        .insert({
          user_id: userId,
          entity_type: containerType,
          entity_id: containerId,
          state: 'applied',
          applied_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Application submitted! Waiting for admin approval.');
      onSuccess?.();
    } catch (error) {
      console.error('Error requesting to join:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept invitation
   * Transitions from 'invited' to 'enrolled'
   */
  const handleAcceptInvite = async () => {
    if (!userId) {
      toast.error('Please log in to accept invitation');
      return;
    }

    setLoading(true);
    try {
      // Update membership state from invited to enrolled
      const { error } = await supabase
        .from('membership_states')
        .update({
          state: 'enrolled',
          enrolled_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('entity_type', containerType)
        .eq('entity_id', containerId)
        .eq('state', 'invited');

      if (error) throw error;

      toast.success(`Welcome to ${containerName}!`);
      onSuccess?.();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Decline invitation
   * Removes 'invited' membership state
   */
  const handleDeclineInvite = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('membership_states')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', containerType)
        .eq('entity_id', containerId)
        .eq('state', 'invited');

      if (error) throw error;

      toast.success('Invitation declined');
      onSuccess?.();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Withdraw application
   * Removes 'applied' membership state
   */
  const handleWithdrawApplication = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('membership_states')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', containerType)
        .eq('entity_id', containerId)
        .eq('state', 'applied');

      if (error) throw error;

      toast.success('Application withdrawn');
      onSuccess?.();
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Leave container
   * Transitions from 'enrolled' to 'not_completed' (if not archived)
   * OR removes membership state entirely
   */
  const handleLeave = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Check if container is archived - if so, we might want to keep as 'not_completed'
      // For now, let's update to not_completed
      const { error } = await supabase
        .from('membership_states')
        .update({
          state: 'not_completed',
          completed_at: new Date().toISOString(),
          completion_reason: 'User left voluntarily'
        })
        .eq('user_id', userId)
        .eq('entity_type', containerType)
        .eq('entity_id', containerId)
        .eq('state', 'enrolled');

      if (error) throw error;

      toast.success(`Left ${containerName}`);
      onSuccess?.();
    } catch (error) {
      console.error('Error leaving container:', error);
      toast.error('Failed to leave container');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Join waitlist (for frozen containers)
   * This could create a special waitlist entry or just notify admins
   */
  const handleJoinWaitlist = async () => {
    if (!userId) {
      toast.error('Please log in to join waitlist');
      return;
    }

    try {
      setLoading(true);
      const result = await waitlistApi.join(containerType, containerId, containerName);
      if (result.alreadyOnWaitlist) {
        toast.info(`You're already on the waitlist at position #${result.position}`);
      } else {
        toast.success(
          result.position === 1
            ? "You're first on the waitlist! We'll notify you when tickets are available."
            : `Added to waitlist at position #${result.position} of ${result.total}. We'll notify you when a ticket opens up.`
        );
      }
      onSuccess?.();
    } catch (err: any) {
      toast.error(`Failed to join waitlist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subscribe to notifications (for paused/scheduled containers)
   */
  const handleNotifyMe = async () => {
    if (!userId) {
      toast.error('Please log in to get notifications');
      return;
    }

    // TODO: Implement notification subscription
    toast.success('You\'ll be notified when this container becomes active!');
  };

  return {
    loading,
    handleJoin,
    handleRequestToJoin,
    handleAcceptInvite,
    handleDeclineInvite,
    handleWithdrawApplication,
    handleLeave,
    handleJoinWaitlist,
    handleNotifyMe
  };
}
