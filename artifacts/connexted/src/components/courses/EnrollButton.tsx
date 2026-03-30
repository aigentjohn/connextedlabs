/**
 * Universal Enrollment Button
 * 
 * ✨ NOW WORKS FOR ALL CONTAINER TYPES! ✨
 * 
 * This button works for:
 * - Courses (self-paced learning)
 * - Programs (cohort-based)
 * - Circles (paid memberships)
 * - Events (workshops/conferences)
 * - Bundles (multiple items)
 * - Any future offering type!
 * 
 * Platform Advantage:
 * ✅ One component for everything
 * ✅ Consistent UX across all offerings
 * ✅ Automatic referral handling
 * ✅ Universal payment processing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { accessTicketService, type ContainerType, type AcquisitionSource } from '@/services/accessTicketService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface EnrollButtonProps {
  // Universal props (work for ANY type!)
  containerType: ContainerType; // 'course', 'program', 'circle', 'bundle', etc.
  containerId: string;
  containerSlug: string;
  priceCents: number;
  
  // Optional props
  kitProductUrl?: string;
  acquisitionSource?: AcquisitionSource;
  offeringId?: string; // For marketplace tracking
  referralCode?: string; // From URL params
  bundleItems?: Array<{ type: ContainerType; id: string }>; // For bundles
  className?: string;
  onEnrollSuccess?: () => void;
  
  // Backward compatibility (deprecated - use containerType/containerId instead)
  /** @deprecated Use containerType='course' and containerId instead */
  courseId?: string;
  /** @deprecated Use containerSlug instead */
  courseSlug?: string;
}

export function EnrollButton({
  containerType: propContainerType,
  containerId: propContainerId,
  containerSlug: propContainerSlug,
  priceCents,
  kitProductUrl,
  acquisitionSource = 'direct_enrollment',
  offeringId,
  referralCode,
  bundleItems,
  className,
  onEnrollSuccess,
  // Backward compatibility
  courseId,
  courseSlug,
}: EnrollButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backward compatibility: map old course props to new universal props
  const containerType = propContainerType || 'course';
  const containerId = propContainerId || courseId || '';
  const containerSlug = propContainerSlug || courseSlug || '';

  const isFree = priceCents === 0;
  const hasReferral = referralCode && priceCents > 0;
  const discount = hasReferral ? Math.round(priceCents * 0.1) : 0; // 10% referral discount
  const finalPrice = hasReferral ? priceCents - discount : priceCents;

  const handleEnroll = async () => {
    if (!user) {
      // Redirect to login with return URL
      const basePath = getBasePath(containerType);
      const returnUrl = `${basePath}/${containerSlug}${referralCode ? `?ref=${referralCode}` : ''}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      if (isFree) {
        // Free - enroll immediately
        await enrollFree();
      } else {
        // Paid - redirect to payment
        await redirectToPayment();
      }
    } catch (err) {
      console.error('Enrollment failed:', err);
      setError('Enrollment failed. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const enrollFree = async () => {
    if (!user) return;

    // Create access ticket (works for ALL types!)
    const ticket = await accessTicketService.createTicket({
      userId: user.id,
      containerType,
      containerId: containerType === 'bundle' ? undefined : containerId,
      bundleItems: bundleItems || [],
      acquisitionSource: referralCode ? 'referral' : acquisitionSource,
      acquisitionContext: {
        ...(offeringId && { marketplace_offering_id: offeringId }),
        ...(referralCode && { referral_code: referralCode }),
      },
      ticketType: 'free',
      pricePaidCents: 0,
    });

    // Success! Redirect to content
    onEnrollSuccess?.();
    const basePath = getBasePath(containerType);
    
    // Navigate to appropriate page based on type
    if (containerType === 'course') {
      navigate(`${basePath}/${containerSlug}/learn`);
    } else if (containerType === 'program') {
      navigate(`${basePath}/${containerSlug}/overview`);
    } else if (containerType === 'circle') {
      navigate(`${basePath}/${containerSlug}`);
    } else {
      navigate(basePath);
    }
  };

  const redirectToPayment = async () => {
    if (!user) return;

    // Build ConvertKit payment URL with metadata
    const metadata = {
      user_id: user.id,
      container_type: containerType,
      container_id: containerId,
      acquisition_source: referralCode ? 'referral' : acquisitionSource,
      ...(offeringId && { marketplace_offering_id: offeringId }),
      ...(referralCode && { referral_code: referralCode }),
      ...(bundleItems && bundleItems.length > 0 && { bundle_items: bundleItems }),
    };

    const paymentUrl = kitProductUrl || `/api/payments/convertkit?type=${containerType}&id=${containerId}`;
    const urlWithMetadata = `${paymentUrl}&metadata=${encodeURIComponent(JSON.stringify(metadata))}`;

    // Redirect to payment
    window.location.href = urlWithMetadata;
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getButtonLabel = () => {
    const action = getActionLabel(containerType);
    
    if (isFree) {
      return `${action} Free`;
    }
    
    if (hasReferral) {
      return (
        <>
          {action} - <span className="line-through opacity-70">{formatPrice(priceCents)}</span>{' '}
          <span className="font-bold">{formatPrice(finalPrice)}</span>
        </>
      );
    }
    
    return `${action} - ${formatPrice(priceCents)}`;
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleEnroll}
        disabled={isEnrolling}
        className={className}
        size="lg"
      >
        {isEnrolling ? 'Processing...' : getButtonLabel()}
      </Button>

      {referralCode && priceCents > 0 && (
        <p className="text-sm text-green-600 dark:text-green-400">
          🎉 10% discount applied via referral!
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getBasePath(type: ContainerType): string {
  switch (type) {
    case 'course': return '/courses';
    case 'program': return '/programs';
    case 'circle': return '/circles';
    case 'event': return '/events';
    case 'bundle': return '/marketplace';
    default: return '/';
  }
}

function getActionLabel(type: ContainerType): string {
  switch (type) {
    case 'course': return 'Enroll';
    case 'program': return 'Join Program';
    case 'circle': return 'Join Circle';
    case 'event': return 'Register';
    case 'bundle': return 'Purchase Bundle';
    default: return 'Enroll';
  }
}