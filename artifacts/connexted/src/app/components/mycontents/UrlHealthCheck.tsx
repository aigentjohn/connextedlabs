import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Loader2, 
  RefreshCw,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface UrlHealthStatus {
  url: string;
  status: 'checking' | 'active' | 'error' | 'timeout';
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

interface UrlHealthCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentIds: string[];
  onComplete?: () => void;
}

export function UrlHealthCheckDialog({
  open,
  onOpenChange,
  contentIds,
  onComplete,
}: UrlHealthCheckDialogProps) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<UrlHealthStatus[]>([]);

  const checkUrls = async () => {
    if (contentIds.length === 0) return;

    try {
      setChecking(true);
      setResults([]);

      // Fetch URLs from my_contents
      const { data: contents, error } = await supabase
        .from('my_contents')
        .select('id, url, title')
        .in('id', contentIds);

      if (error) throw error;
      if (!contents || contents.length === 0) {
        toast.error('No URLs found to check');
        return;
      }

      // Initialize results with checking status
      const initialResults: UrlHealthStatus[] = contents.map(c => ({
        url: c.url,
        status: 'checking' as const,
      }));
      setResults(initialResults);

      // Check each URL (in batches to avoid overwhelming the browser)
      const batchSize = 5;
      for (let i = 0; i < contents.length; i += batchSize) {
        const batch = contents.slice(i, i + batchSize);
        const batchPromises = batch.map(async (content, index) => {
          const startTime = Date.now();
          try {
            // Use HEAD request first (faster), fall back to GET if needed
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(content.url, {
              method: 'HEAD',
              signal: controller.signal,
              mode: 'no-cors', // Important: avoids CORS issues for URL checking
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            // Update result
            setResults(prev => prev.map((r, idx) => 
              idx === i + index
                ? {
                    ...r,
                    status: 'active' as const,
                    statusCode: response.status || 200, // no-cors doesn't return status, assume OK
                    responseTime,
                  }
                : r
            ));
          } catch (error: any) {
            const responseTime = Date.now() - startTime;
            const status = error.name === 'AbortError' ? 'timeout' : 'error';
            const errorMsg = error.name === 'AbortError' 
              ? 'Request timed out' 
              : error.message || 'Failed to reach URL';

            setResults(prev => prev.map((r, idx) => 
              idx === i + index
                ? {
                    ...r,
                    status: status as const,
                    error: errorMsg,
                    responseTime,
                  }
                : r
            ));
          }
        });

        await Promise.all(batchPromises);
      }

      toast.success('URL health check complete');
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error checking URLs:', error);
      toast.error('Failed to check URLs');
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = (status: UrlHealthStatus['status']) => {
    switch (status) {
      case 'checking':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Checking
          </Badge>
        );
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'timeout':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Timeout
          </Badge>
        );
    }
  };

  const activeCount = results.filter(r => r.status === 'active').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const timeoutCount = results.filter(r => r.status === 'timeout').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>URL Health Check</DialogTitle>
          <DialogDescription>
            Verify that your links are accessible and working properly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{results.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <div className="text-xs text-green-800">Active</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-xs text-red-800">Errors</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{timeoutCount}</div>
                <div className="text-xs text-orange-800">Timeouts</div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {results.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Ready to check {contentIds.length} URL{contentIds.length !== 1 ? 's' : ''}
              </p>
              <Button onClick={checkUrls} disabled={checking}>
                <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                Start Health Check
              </Button>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Results</h3>
                {!checking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResults([]);
                      checkUrls();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Recheck
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 truncate flex items-center gap-1"
                        >
                          <span className="truncate">{result.url}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {result.responseTime && (
                          <span>{result.responseTime}ms</span>
                        )}
                        {result.statusCode && (
                          <span>HTTP {result.statusCode}</span>
                        )}
                        {result.error && (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="text-blue-900 font-medium mb-2">About URL Health Checks:</p>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>• <strong>Active:</strong> URL is reachable and responds successfully</li>
              <li>• <strong>Error:</strong> URL failed to load (may be broken or moved)</li>
              <li>• <strong>Timeout:</strong> URL took too long to respond (over 10 seconds)</li>
              <li>• Some URLs may block automated checks for security reasons</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Button component to trigger health check
interface UrlHealthCheckButtonProps {
  contentIds: string[];
  onComplete?: () => void;
}

export function UrlHealthCheckButton({ contentIds, onComplete }: UrlHealthCheckButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (contentIds.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Check URL Health
        {contentIds.length > 1 && (
          <Badge variant="secondary" className="ml-1">
            {contentIds.length}
          </Badge>
        )}
      </Button>

      <UrlHealthCheckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contentIds={contentIds}
        onComplete={onComplete}
      />
    </>
  );
}
