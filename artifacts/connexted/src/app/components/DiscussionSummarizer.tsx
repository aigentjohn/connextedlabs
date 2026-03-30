import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface Post {
  author: string;
  content: string;
  timestamp: string;
}

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  sentiment: string;
}

interface DiscussionSummarizerProps {
  threadId: string;
  threadTitle: string;
  threadBody: string;
  threadAuthor: { name: string };
  threadCreatedAt: string;
  replies: Array<{
    id: string;
    content: string;
    created_at: string;
    author: { name: string } | null;
  }>;
  className?: string;
}

export default function DiscussionSummarizer({
  threadId,
  threadTitle,
  threadBody,
  threadAuthor,
  threadCreatedAt,
  replies,
  className = '',
}: DiscussionSummarizerProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format posts for AI
      const posts: Post[] = [
        {
          author: threadAuthor?.name || 'Unknown',
          content: `${threadTitle}\n\n${threadBody}`,
          timestamp: new Date(threadCreatedAt).toLocaleDateString(),
        },
        ...replies.map(reply => ({
          author: reply.author?.name || 'Unknown',
          content: reply.content,
          timestamp: new Date(reply.created_at).toLocaleDateString(),
        })),
      ];

      // Call AI API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/ai/summarize-discussion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ posts }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummary({
        summary: data.summary,
        keyPoints: data.keyPoints || [],
        sentiment: data.sentiment || 'neutral',
      });

      toast.success('Discussion summarized successfully!');
    } catch (err) {
      console.error('Error summarizing discussion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to summarize discussion';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'mixed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'negative':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const postCount = 1 + replies.length; // thread + replies

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Discussion Summary
          </CardTitle>
          {!summary && (
            <Button
              onClick={handleSummarize}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Summarize {postCount} {postCount === 1 ? 'post' : 'posts'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!summary && !error && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Click "Summarize" to generate an AI-powered summary of this discussion
            </p>
            <p className="text-xs mt-2 text-gray-400">
              Includes key points, takeaways, and overall sentiment analysis
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-purple-500 animate-spin" />
            <p className="text-sm text-gray-600">Analyzing discussion with AI...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Failed to generate summary</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button
              onClick={handleSummarize}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            {/* Sentiment Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase font-medium">Sentiment:</span>
              <Badge 
                variant="outline" 
                className={`${getSentimentColor(summary.sentiment)} flex items-center gap-1`}
              >
                {getSentimentIcon(summary.sentiment)}
                {summary.sentiment}
              </Badge>
            </div>

            {/* Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Summary
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-200">
                {summary.summary}
              </p>
            </div>

            {/* Key Points */}
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Key Points
                </h4>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-purple-500 font-bold flex-shrink-0 mt-0.5">•</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regenerate Button */}
            <div className="pt-2 border-t border-gray-200">
              <Button
                onClick={handleSummarize}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Summary
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}