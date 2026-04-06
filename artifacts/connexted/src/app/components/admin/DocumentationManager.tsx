import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  BookOpen,
  Download,
  Upload,
  Save,
  HelpCircle,
  Globe,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface PlatformDoc {
  id: string;
  doc_key: string;
  title: string;
  content: string;
  doc_type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  help: 'Help & Onboarding',
  marketing: 'Home Page',
  system: 'System',
};

const DOC_HINTS: Record<string, { format: string; preview: string }> = {
  home_hero: {
    format: 'Use # for the main headline, ## for the gradient tagline, then paragraphs for body copy.',
    preview: '# More capable than ever.\n## Less visible than you deserve.\n\nFirst intro paragraph…\n\nSecond intro paragraph…',
  },
  home_about: {
    format: 'First paragraph becomes the large pull-quote. Second paragraph becomes the explanation below it.',
    preview: '"The URL is the content. The container is the intention."\n\nConnexted does not care what format…',
  },
  home_cta: {
    format: 'Three lines: heading, subtext paragraph, button label.',
    preview: 'Ready to get started?\n\nJoin thousands of professionals building their presence.\n\nClaim Your Invite',
  },
  welcome: {
    format: 'Full Markdown document — headings, lists, links, bold, tables all supported.',
    preview: '# Welcome to Connexted\n\n## Getting started\n\n1. Complete your profile…',
  },
  help: {
    format: 'Full Markdown document. Use ## for top-level sections, ### for subsections, code blocks for commands.',
    preview: '# Help Documentation\n\n## Getting Started\n\n### How do I sign in?\n…',
  },
};

const DOC_TYPE_ICON: Record<string, React.ReactNode> = {
  help: <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />,
  marketing: <Globe className="w-3.5 h-3.5 flex-shrink-0" />,
  system: <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />,
};

export default function DocumentationManager() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<PlatformDoc[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('welcome');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_docs')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      const rows = data || [];
      setDocs(rows);

      const first = rows[0];
      if (first) {
        setSelectedKey(first.doc_key);
        setEditContent(first.content);
      }
    } catch (err: any) {
      toast.error('Failed to load documentation: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const selectedDoc = docs.find((d) => d.doc_key === selectedKey);

  const handleSelect = (key: string) => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Switch document without saving?')) return;
    }
    const doc = docs.find((d) => d.doc_key === key);
    setSelectedKey(key);
    setEditContent(doc?.content || '');
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_docs')
        .update({
          content: editContent,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id ?? null,
        })
        .eq('doc_key', selectedKey);

      if (error) throw error;

      setDocs((prev) =>
        prev.map((d) =>
          d.doc_key === selectedKey
            ? { ...d, content: editContent, updated_at: new Date().toISOString() }
            : d
        )
      );
      setIsDirty(false);
      toast.success(`"${selectedDoc.title}" saved successfully`);
    } catch (err: any) {
      toast.error('Save failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setEditContent(text);
      setIsDirty(true);
      toast.success(`"${file.name}" imported — click Save to persist`);
    } catch {
      toast.error('Failed to read file');
    }
    e.target.value = '';
  };

  const handleExport = () => {
    if (!selectedDoc) return;
    const blob = new Blob([editContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedKey}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${selectedKey}.md`);
  };

  const grouped = docs.reduce<Record<string, PlatformDoc[]>>((acc, doc) => {
    (acc[doc.doc_type] ||= []).push(doc);
    return acc;
  }, {});

  const hint = selectedKey ? DOC_HINTS[selectedKey] : null;

  return (
    <div className="space-y-6 pb-8">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Documentation Manager' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage all platform documentation and public home page content — stored in Supabase, no code changes needed.
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Platform Admin Only
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading documentation…
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3 text-amber-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">No documents found in platform_docs table.</p>
              <p className="text-sm mt-0.5">
                Run the setup SQL in Supabase to seed the initial document slots.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {Object.entries(grouped).map(([type, typeDocs]) => (
              <div key={type}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
                  {DOC_TYPE_LABELS[type] || type}
                </p>
                <div className="space-y-0.5">
                  {typeDocs.map((doc) => (
                    <button
                      key={doc.doc_key}
                      onClick={() => handleSelect(doc.doc_key)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedKey === doc.doc_key
                          ? 'bg-indigo-50 text-indigo-700 font-medium border border-indigo-200'
                          : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={selectedKey === doc.doc_key ? 'text-indigo-500' : 'text-gray-400'}>
                          {DOC_TYPE_ICON[doc.doc_type] ?? <HelpCircle className="w-3.5 h-3.5" />}
                        </span>
                        {doc.title}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 ml-5.5">
                        {doc.content ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            has content
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Circle className="w-3 h-3" />
                            empty
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Editor ──────────────────────────────────────────────────── */}
          <div className="space-y-3">
            {selectedDoc && (
              <>
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold">{selectedDoc.title}</h2>
                      <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {selectedDoc.doc_key}
                      </code>
                      {isDirty && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                          Unsaved
                        </Badge>
                      )}
                    </div>
                    {selectedDoc.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{selectedDoc.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {selectedDoc.updated_at
                        ? `Last saved: ${new Date(selectedDoc.updated_at).toLocaleString()}`
                        : 'Never saved'}
                      <span className="text-gray-300">·</span>
                      {editContent.length.toLocaleString()} characters
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.markdown,.txt"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button variant="outline" size="sm" onClick={handleImport}>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Import .md
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={!editContent.trim()}
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Format hint */}
                {hint && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-blue-800">Format guide</p>
                    <p className="text-xs text-blue-700">{hint.format}</p>
                    <pre className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1.5 font-mono whitespace-pre-wrap">
                      {hint.preview}
                    </pre>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-[540px] p-4 border border-gray-200 rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={`Enter Markdown content for "${selectedDoc.title}"…`}
                  spellCheck={false}
                />

                <p className="text-xs text-gray-400">
                  Markdown supported — headings (#, ##, ###), bold (**text**), italic (*text*), lists, links, tables, code blocks.
                  Changes take effect immediately after saving with no code changes or deployment required.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
