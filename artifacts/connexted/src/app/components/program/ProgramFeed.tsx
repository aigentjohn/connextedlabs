import ContainerFeed from '@/app/components/shared/ContainerFeed';

interface ProgramFeedProps {
  circleId?: string;
  programId: string;
}

export function ProgramFeed({ circleId, programId }: ProgramFeedProps) {
  // Programs can have their own feed directly or use circle feed
  // Priority: Use program feed if no circle, otherwise use circle feed for backwards compatibility
  const useCircleFeed = !!circleId;
  
  return (
    <div>
      <ContainerFeed
        containerId={useCircleFeed ? circleId : programId}
        containerType={useCircleFeed ? 'circle' : 'program'}
        title="Program Feed"
        enablePosting={true}
      />
    </div>
  );
}