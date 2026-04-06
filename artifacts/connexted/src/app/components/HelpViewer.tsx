import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  BookOpen,
  Search,
  HelpCircle,
  FileText,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import ReactMarkdown from 'react-markdown';

// Static fallbacks — used when the DB row has no content yet
// @ts-ignore
import staticWelcome from '@/WELCOME.md?raw';
// @ts-ignore
import staticHelp from '@/HELP.md?raw';

const STATIC_FALLBACK: Record<string, string> = {
  welcome: staticWelcome,
  help: staticHelp,
};

export default function HelpViewer() {
  const { type } = useParams<{ type?: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [docContent, setDocContent] = useState<Record<string, string>>({
    welcome: staticWelcome,
    help: staticHelp,
  });
  const [loading, setLoading] = useState(true);

  const docType = type || 'welcome';
  const isWelcome = docType === 'welcome';
  const isHelp = docType === 'help';

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_docs')
        .select('doc_key, content')
        .in('doc_key', ['welcome', 'help'])
        .eq('is_active', true);

      if (error) throw error;

      setDocContent((prev) => {
        const next = { ...prev };
        for (const row of data || []) {
          // Only override the static fallback if the DB has non-empty content
          if (row.content && row.content.trim()) {
            next[row.doc_key] = row.content;
          }
        }
        return next;
      });
    } catch (err) {
      // Silently fall back to static content — no toast needed here
      console.warn('[HelpViewer] Could not load from DB, using static files:', err);
    } finally {
      setLoading(false);
    }
  };

  const rawContent = docContent[docType] || STATIC_FALLBACK[docType] || '';

  const filteredContent = searchTerm
    ? rawContent
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
        .join('\n')
    : rawContent;

  return (
    <div className="space-y-6 pb-8">
      <Breadcrumbs
        items={[
          { label: 'Help & Documentation', path: '/help' },
          { label: isWelcome ? 'Welcome Guide' : 'Help Documentation' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isWelcome ? (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {isWelcome ? 'Welcome to CONNEXTED' : 'Help Documentation'}
            </h1>
            <p className="text-gray-600">
              {isWelcome
                ? 'Your quick start guide to getting the most out of the platform'
                : 'Comprehensive guide to all platform features and functionality'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isWelcome ? (
            <Link to="/help/help">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Full Documentation
              </Button>
            </Link>
          ) : (
            <Link to="/help/welcome">
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                Welcome Guide
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search + Tab nav */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Link to="/help/welcome">
              <Button variant={isWelcome ? 'default' : 'outline'} size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                Welcome
              </Button>
            </Link>
            <Link to="/help/help">
              <Button variant={isHelp ? 'default' : 'outline'} size="sm">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading…</div>
          ) : !filteredContent.trim() ? (
            <div className="text-center text-gray-400 py-12">
              {searchTerm
                ? 'No results match your search.'
                : 'No content yet. Admins can add content in Platform Admin → Documentation Manager.'}
            </div>
          ) : (
            <div className="prose prose-indigo max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mb-4 mt-8 first:mt-0" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mb-3 mt-6 border-b border-gray-200 pb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold mb-2 mt-3" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-relaxed text-gray-700" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic text-gray-600" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-600" {...props} />
                    ) : (
                      <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm" {...props} />
                    ),
                  a: ({ node, ...props }) => (
                    <a className="text-indigo-600 hover:text-indigo-700 underline" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-gray-200" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-gray-200" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-gray-200 px-4 py-2 bg-gray-50 font-semibold text-left" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-200 px-4 py-2" {...props} />
                  ),
                }}
              >
                {filteredContent}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Still have questions?</h3>
              <p className="text-gray-600 text-sm">
                Reach out to our team or visit the community for additional support.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/circles">
                <Button>Visit Community</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
