import { GitFork, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

interface ForkLineageProps {
  contentType: 'prompt' | 'build';
  forkOf?: string;
  forkOfTitle?: string;
  forkOfCreator?: string;
  forkOfCreatorId?: string;
  /** For builds, use the slug for navigation instead of the id */
  forkOfSlug?: string;
  lineage?: Array<{
    id: string;
    slug?: string;
    title: string;
    creatorName?: string;
    creatorId?: string;
  }>;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ForkLineage({
  contentType,
  forkOf,
  forkOfTitle,
  forkOfCreator,
  forkOfCreatorId,
  forkOfSlug,
  lineage,
  variant = 'default',
  className = ''
}: ForkLineageProps) {
  // If no fork data, don't render anything
  if (!forkOf && (!lineage || lineage.length === 0)) {
    return null;
  }

  const buildPath = (id: string, slug?: string) => {
    if (contentType === 'build') {
      return `/builds/${slug || id}`;
    }
    return `/${contentType}s/${id}`;
  };

  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <GitFork className="w-3 h-3" />
        <span>
          Forked from{' '}
          <Link 
            to={buildPath(forkOf!, forkOfSlug)}
            className="font-medium text-blue-600 hover:underline"
          >
            {forkOfTitle || 'original'}
          </Link>
        </span>
      </div>
    );
  }

  // Default variant - full lineage display
  if (lineage && lineage.length > 0) {
    return (
      <div className={`border border-blue-200 bg-blue-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <GitFork className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">Fork Lineage</h4>
            <div className="space-y-2">
              {lineage.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                  <Link
                    to={buildPath(item.id, item.slug)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {item.title}
                  </Link>
                  {item.creatorName && (
                    <span className="text-sm text-gray-600">
                      by{' '}
                      {item.creatorId ? (
                        <Link
                          to={`/users/${item.creatorId}`}
                          className="text-gray-700 hover:underline"
                        >
                          {item.creatorName}
                        </Link>
                      ) : (
                        item.creatorName
                      )}
                    </span>
                  )}
                  {index === 0 && (
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Original
                    </span>
                  )}
                  {index === lineage.length - 1 && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple single-parent display
  return (
    <div className={`border border-blue-200 bg-blue-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <GitFork className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Forked from{' '}
            <Link 
              to={buildPath(forkOf!, forkOfSlug)}
              className="font-semibold text-blue-600 hover:underline"
            >
              {forkOfTitle || 'original'}
            </Link>
            {forkOfCreator && (
              <span>
                {' '}by{' '}
                {forkOfCreatorId ? (
                  <Link
                    to={`/users/${forkOfCreatorId}`}
                    className="font-medium text-gray-800 hover:underline"
                  >
                    {forkOfCreator}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-800">
                    {forkOfCreator}
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}