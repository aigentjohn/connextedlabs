import ContainerReviews from '@/app/components/shared/ContainerReviews';

interface CircleReviewsProps {
  circleId: string;
  circleName: string;
  circleSlug?: string;
  isAdmin: boolean;
}

/**
 * CircleReviews - Thin wrapper around the shared ContainerReviews component.
 * Provides the circle-specific props (containerType='circle') automatically.
 */
export default function CircleReviews({ circleId, circleName, circleSlug, isAdmin }: CircleReviewsProps) {
  return (
    <ContainerReviews
      containerId={circleId}
      containerType="circle"
      containerName={circleName}
      containerSlug={circleSlug}
      isAdmin={isAdmin}
    />
  );
}
