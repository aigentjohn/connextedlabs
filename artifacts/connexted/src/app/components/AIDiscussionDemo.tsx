import { useState } from 'react';
import DiscussionSummarizer from '@/app/components/DiscussionSummarizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { MessageSquare } from 'lucide-react';

/**
 * Demo page to test the AI Discussion Summarizer
 * Navigate to /ai-demo to see this page
 */
export default function AIDiscussionDemo() {
  // Mock discussion data
  const mockThread = {
    id: 'demo-thread-1',
    title: 'What are the best practices for async team communication?',
    body: `I've been thinking about how our team communicates across time zones. We have members in the US, Europe, and Asia, and real-time meetings are challenging. 

What strategies have worked well for your distributed teams? Should we prioritize written documentation over video calls? How do you balance synchronous vs asynchronous work?`,
    author: { name: 'Sarah Chen' },
    created_at: '2026-01-27T10:00:00Z',
  };

  const mockReplies = [
    {
      id: 'reply-1',
      content: 'Great question! In my experience, written documentation is essential. We use a "write-first" culture where all decisions are documented in Notion before any meeting happens. This way, people in different time zones can contribute asynchronously.',
      created_at: '2026-01-27T14:30:00Z',
      author: { name: 'Marcus Rodriguez' },
    },
    {
      id: 'reply-2',
      content: 'I agree with Marcus. We also record all our meetings and share them with transcripts. The key is making sure async communication is the default, not the exception. Video calls should be for high-bandwidth discussions only.',
      created_at: '2026-01-27T18:45:00Z',
      author: { name: 'Priya Patel' },
    },
    {
      id: 'reply-3',
      content: 'One thing that helped us was establishing "overlap hours" - 2 hours per day when everyone is expected to be available for quick syncs if needed. Outside those hours, everything is async. It gives people predictability while maintaining flexibility.',
      created_at: '2026-01-28T09:15:00Z',
      author: { name: 'Alex Kim' },
    },
    {
      id: 'reply-4',
      content: 'We struggled with this for months until we adopted a "no meeting Wednesdays" policy. It forces people to write things down and be more thoughtful. Also, we use Loom for async video updates which adds a personal touch without requiring real-time presence.',
      created_at: '2026-01-28T16:20:00Z',
      author: { name: 'Jordan Taylor' },
    },
    {
      id: 'reply-5',
      content: 'All great points! I\'d add that setting clear expectations around response times is crucial. We use a 24-hour response SLA for most questions, which removes pressure for immediate responses. Time zones become a feature, not a bug - you get thoughtful responses instead of quick reactions.',
      created_at: '2026-01-29T11:00:00Z',
      author: { name: 'Sarah Chen' },
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Discussion Summarizer Demo</h1>
        <p className="text-gray-600">
          Test the AI-powered discussion summarizer with mock data. In production, this will work with real forum threads.
        </p>
      </div>

      {/* Mock Thread Display */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-3">{mockThread.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                <span className="font-medium">{mockThread.author.name}</span>
                <span>•</span>
                <span>January 27, 2026</span>
                <Badge variant="outline" className="ml-2">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {mockReplies.length} replies
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap mb-6">{mockThread.body}</p>
          
          <div className="border-t border-gray-200 pt-6 space-y-6">
            <h3 className="font-semibold text-lg">Replies</h3>
            {mockReplies.map((reply, index) => (
              <div key={reply.id} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {reply.author.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{reply.author.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Summarizer Component */}
      <DiscussionSummarizer
        threadId={mockThread.id}
        threadTitle={mockThread.title}
        threadBody={mockThread.body}
        threadAuthor={mockThread.author}
        threadCreatedAt={mockThread.created_at}
        replies={mockReplies}
      />

      {/* Info Card */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-indigo-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-indigo-800">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold mt-0.5">1.</span>
              <span>Click "Summarize" button to send the discussion to Google's Gemini AI</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold mt-0.5">2.</span>
              <span>AI analyzes the thread and all replies for key themes and sentiment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold mt-0.5">3.</span>
              <span>Get a concise summary with key points and overall sentiment analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold mt-0.5">4.</span>
              <span>Perfect for long discussions, weekly digests, or onboarding new members</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}