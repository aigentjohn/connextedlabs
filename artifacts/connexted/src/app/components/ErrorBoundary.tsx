import React, { Component, ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-reload on chunk load errors (dynamic import failures that bubble up)
    if (this.isChunkLoadError(error)) {
      console.warn('[ErrorBoundary] Chunk load error detected, attempting auto-reload…');
      this.attemptReload();
    }
  }

  private isChunkLoadError(error: Error): boolean {
    const msg = error.message?.toLowerCase() ?? '';
    return (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('dynamically imported module') ||
      (error.name === 'TypeError' && msg.includes('failed to fetch'))
    );
  }

  private attemptReload() {
    const RELOAD_KEY = '__connexted_chunk_reload__';
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    const now = Date.now();

    // Guard: only auto-reload once per 30 seconds to prevent infinite loops
    if (lastReload && now - parseInt(lastReload, 10) < 30_000) {
      console.warn('[ErrorBoundary] Skipping auto-reload — already reloaded recently.');
      return;
    }

    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error ? this.isChunkLoadError(this.state.error) : false;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <CardTitle>{isChunkError ? 'Page failed to load' : 'Something went wrong'}</CardTitle>
              </div>
              <CardDescription>
                {isChunkError
                  ? 'A required module could not be loaded. This is usually temporary — please reload the page.'
                  : 'The application encountered an error and needs to reload.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm font-mono text-gray-700 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}