import { Link } from 'react-router';
import { AlertCircle, ArrowUpRight, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

interface TierLimitWarningProps {
  type: 'circle' | 'container' | 'program' | 'feature';
  currentCount?: number;
  maxAllowed?: number;
  tierName?: string;
  variant?: 'inline' | 'card' | 'banner';
}

/**
 * Display tier limit warning with upgrade prompt
 */
export function TierLimitWarning({
  type,
  currentCount,
  maxAllowed,
  tierName = 'Free',
  variant = 'inline',
}: TierLimitWarningProps) {
  const messages = {
    circle: {
      title: 'Circle Limit Reached',
      description: currentCount && maxAllowed
        ? `You've joined ${currentCount} of ${maxAllowed} circles on the ${tierName} plan.`
        : `You've reached your circle limit on the ${tierName} plan.`,
    },
    container: {
      title: 'Container Limit Reached',
      description: currentCount && maxAllowed
        ? `You've joined ${currentCount} of ${maxAllowed} containers on the ${tierName} plan.`
        : `You've reached your container limit on the ${tierName} plan.`,
    },
    program: {
      title: 'Upgrade Required',
      description: `Your current ${tierName} plan doesn't include program purchases. Upgrade to unlock this feature.`,
    },
    feature: {
      title: 'Feature Unavailable',
      description: `This feature is not available on the ${tierName} plan.`,
    },
  };

  const { title, description } = messages[type];

  if (variant === 'inline') {
    return (
      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">{title}</AlertTitle>
        <AlertDescription className="text-amber-700">
          {description}
          <Link to="/pricing" className="ml-2 font-semibold underline hover:no-underline">
            View upgrade options
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-amber-900">{title}</CardTitle>
          </div>
          <CardDescription className="text-amber-700">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link to="/pricing">
              Upgrade Your Plan
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Banner variant
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 mb-1">{title}</h3>
          <p className="text-amber-700 mb-4">{description}</p>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link to="/pricing">
              View Upgrade Options
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface UsageProgressBarProps {
  current: number;
  max: number;
  label: string;
  unlimited?: boolean;
}

/**
 * Display usage progress bar for tier limits
 */
export function UsageProgressBar({ current, max, label, unlimited = false }: UsageProgressBarProps) {
  if (unlimited) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          <span className="font-semibold text-blue-600">∞ Unlimited</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={`font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-900'}`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-amber-500'
              : 'bg-gradient-to-r from-green-500 to-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-600">
          Limit reached. <Link to="/pricing" className="underline hover:no-underline">Upgrade to continue</Link>
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-600">
          Approaching limit. <Link to="/pricing" className="underline hover:no-underline">Consider upgrading</Link>
        </p>
      )}
    </div>
  );
}

interface TierFeatureCheckProps {
  hasFeature: boolean;
  featureName: string;
  children: React.ReactNode;
}

/**
 * Conditionally render content based on tier feature access
 */
export function TierFeatureCheck({ hasFeature, featureName, children }: TierFeatureCheckProps) {
  if (hasFeature) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Upgrade Required</CardTitle>
            <CardDescription className="text-center">
              {featureName} is not available on your current plan
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/pricing">
                View Upgrade Options
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
