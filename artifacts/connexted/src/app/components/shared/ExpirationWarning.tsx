import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Clock, AlertTriangle, Sparkles, Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ExpirationWarningProps {
  containerType: string;
  containerId: string;
  expiresAt: string | null;
  isPermanent: boolean;
  scheduledArchiveAt?: string | null;
  userClass?: number;
  onExtend?: () => void;
  className?: string;
}

export function ExpirationWarning({
  containerType,
  containerId,
  expiresAt,
  isPermanent,
  scheduledArchiveAt,
  userClass = 1,
  onExtend,
  className = ''
}: ExpirationWarningProps) {
  const [extending, setExtending] = useState(false);
  const [makingPermanent, setMakingPermanent] = useState(false);

  // Calculate expiration details
  const expirationDetails = getExpirationDetails(expiresAt, isPermanent, scheduledArchiveAt);

  const handleExtend = async () => {
    setExtending(true);
    try {
      const { data, error } = await supabase.rpc('extend_expiration', {
        p_container_type: containerType,
        p_container_id: containerId,
        p_extension_months: 3
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Extended by 3 months!');
        onExtend?.();
      } else {
        toast.error(data?.error || 'Failed to extend');
      }
    } catch (error) {
      console.error('Error extending expiration:', error);
      toast.error('Failed to extend expiration');
    } finally {
      setExtending(false);
    }
  };

  const handleMakePermanent = async () => {
    setMakingPermanent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('make_content_permanent', {
        p_container_type: containerType,
        p_container_id: containerId,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Content is now permanent! 🎉');
        onExtend?.();
      } else if (data?.upgrade_required) {
        toast.error('Premium membership required');
        // Could open upgrade modal here
      } else {
        toast.error(data?.error || 'Failed to make permanent');
      }
    } catch (error) {
      console.error('Error making permanent:', error);
      toast.error('Failed to make permanent');
    } finally {
      setMakingPermanent(false);
    }
  };

  // Don't show anything if permanent
  if (isPermanent) {
    return (
      <Badge variant="secondary" className={className}>
        <Sparkles className="w-3 h-3 mr-1" />
        Permanent
      </Badge>
    );
  }

  // Don't show warning if not expiring soon
  if (!expirationDetails.showWarning) {
    return null;
  }

  const isPremium = userClass >= 3;

  return (
    <Alert
      variant={
        expirationDetails.urgency === 'critical' ? 'destructive' :
        expirationDetails.urgency === 'high' ? 'warning' :
        'default'
      }
      className={className}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {expirationDetails.urgency === 'critical' && '🚨 '}
        {expirationDetails.urgency === 'high' && '⚠️ '}
        {expirationDetails.urgency === 'medium' && '⏰ '}
        Expiring Soon
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{expirationDetails.message}</p>
        
        {expirationDetails.daysRemaining !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {expirationDetails.daysRemaining} {expirationDetails.daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {/* Extend button - available to everyone */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtend}
            disabled={extending}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {extending ? 'Extending...' : 'Extend 3 Months (Free)'}
          </Button>

          {/* Make permanent - only for premium users */}
          {isPremium ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleMakePermanent}
              disabled={makingPermanent}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {makingPermanent ? 'Saving...' : 'Make Permanent'}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <Link to="/pricing">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade for Permanent Content
              </Link>
            </Button>
          )}
        </div>

        {!isPremium && (
          <p className="text-xs text-muted-foreground mt-2">
            💎 Premium members get permanent content by default
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Helper function to calculate expiration details
function getExpirationDetails(
  expiresAt: string | null,
  isPermanent: boolean,
  scheduledArchiveAt?: string | null
) {
  if (isPermanent) {
    return {
      status: 'permanent',
      urgency: 'none',
      message: 'This content is permanent',
      daysRemaining: null,
      showWarning: false,
      showUpgradeCta: false
    };
  }

  const effectiveExpiration = scheduledArchiveAt || expiresAt;
  if (!effectiveExpiration) {
    return {
      status: 'active',
      urgency: 'none',
      message: 'No expiration set',
      daysRemaining: null,
      showWarning: false,
      showUpgradeCta: false
    };
  }

  const now = new Date();
  const expiration = new Date(effectiveExpiration);
  const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status: string;
  let urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  let message: string;

  if (daysRemaining <= 0) {
    status = 'expired';
    urgency = 'critical';
    message = 'This content has expired and will be archived soon';
  } else if (daysRemaining <= 1) {
    status = 'expiring_today';
    urgency = 'critical';
    message = `Expires today! ${Math.ceil(daysRemaining * 24)} hours remaining`;
  } else if (daysRemaining <= 7) {
    status = 'expiring_this_week';
    urgency = 'high';
    message = `Expires in ${daysRemaining} days`;
  } else if (daysRemaining <= 30) {
    status = 'expiring_this_month';
    urgency = 'medium';
    message = `Expires in ${daysRemaining} days`;
  } else {
    status = 'active';
    urgency = 'low';
    message = `Expires in ${daysRemaining} days`;
  }

  return {
    status,
    urgency,
    message,
    daysRemaining,
    showWarning: daysRemaining <= 30,
    showUpgradeCta: daysRemaining <= 30
  };
}

/**
 * ExpirationBadge - Small badge showing expiration status
 */
interface ExpirationBadgeProps {
  expiresAt: string | null;
  isPermanent: boolean;
  scheduledArchiveAt?: string | null;
  className?: string;
}

export function ExpirationBadge({
  expiresAt,
  isPermanent,
  scheduledArchiveAt,
  className = ''
}: ExpirationBadgeProps) {
  const details = getExpirationDetails(expiresAt, isPermanent, scheduledArchiveAt);

  if (isPermanent) {
    return (
      <Badge variant="secondary" className={className}>
        <Sparkles className="w-3 h-3 mr-1" />
        Permanent
      </Badge>
    );
  }

  if (!details.daysRemaining || details.daysRemaining > 30) {
    return null;
  }

  const variant = 
    details.urgency === 'critical' ? 'destructive' :
    details.urgency === 'high' ? 'warning' :
    'secondary';

  return (
    <Badge variant={variant} className={className}>
      <Clock className="w-3 h-3 mr-1" />
      {details.daysRemaining}d left
    </Badge>
  );
}

export default ExpirationWarning;