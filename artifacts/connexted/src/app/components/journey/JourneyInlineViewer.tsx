// Split candidate: ~1038 lines — consider extracting JourneyItemRenderer, JourneyProgressSidebar, and JourneyNavigationControls into sub-components; each content type handler (video, deck, checklist, etc.) could also be a separate sub-component.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownReader } from '@/app/components/journey/MarkdownReader';
import {
  X,
  ExternalLink,
  Loader2,
  FileText,
  PlayCircle,
  Video,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Maximize2,
  Users,
  Calendar,
  Clock,
  Link as LinkIcon,
  AlertCircle,
  BarChart2,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';

interface JourneyInlineViewerProps {
  itemType: string;
  itemId: string;
  title: string;
  onClose: () => void;
  onComplete?: () => void;
}

// ──────── Embedded URL utilities ────────

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    // Google Docs / Sheets / Slides
    if (host.includes('docs.google.com') || host.includes('drive.google.com')) {
      if (url.includes('/edit')) return url.replace('/edit', '/preview');
      if (url.includes('/view')) return url;
      return url + (url.includes('?') ? '&' : '?') + 'embedded=true';
    }

    // Notion – only published (notion.site) pages can be embedded; workspace URLs (notion.so) cannot
    if (host.includes('notion.so')) return null;
    if (host.includes('notion.site')) return url; // Published pages are embeddable

    // Figma
    if (host.includes('figma.com')) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    }

    // Miro
    if (host.includes('miro.com') && url.includes('/board/')) {
      return url.replace('/board/', '/embed/');
    }

    // Loom
    if (host.includes('loom.com') && url.includes('/share/')) {
      return url.replace('/share/', '/embed/');
    }

    // YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`;
    }

    // Vimeo
    if (host.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
    }

    // Airtable
    if (host.includes('airtable.com')) {
      return url.replace('airtable.com/', 'airtable.com/embed/');
    }

    // Generic – try iframe (many sites block it, but we can try)
    return null;
  } catch {
    return null;
  }
};

const getUrlLabel = (url: string): string => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('google.com')) return 'Google';
    if (host.includes('notion')) return 'Notion';
    if (host.includes('figma')) return 'Figma';
    if (host.includes('miro')) return 'Miro';
    if (host.includes('airtable')) return 'Airtable';
    if (host.includes('github')) return 'GitHub';
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
    return host;
  } catch {
    return 'Link';
  }
};

// ──────── Sub-viewers per content type ────────

function DocumentViewer({ data }: { data: any }) {
  const embedUrl = data.url ? getEmbedUrl(data.url) : null;
  const isNotionWorkspace = data.url && /notion\.so/i.test(data.url) && !/notion\.site/i.test(data.url);

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      {data.url && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Source: {getUrlLabel(data.url)}</span>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline ml-1 flex items-center gap-1"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {embedUrl ? (
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe
            src={embedUrl}
            className="w-full"
            style={{ height: '500px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      ) : data.url ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">This document cannot be embedded inline.</p>
          {isNotionWorkspace && (
            <p className="text-xs text-gray-500 mb-3">
              Tip: Notion workspace URLs (notion.so) block embedding. To embed inline, publish the page to the web in Notion (Share → Publish) and use the notion.site URL instead.
            </p>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      ) : null}

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function BookViewer({ data }: { data: any }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, [data.id]);

  const fetchChapters = async () => {
    try {
      const { data: chapterData, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', data.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setChapters(chapterData || []);
      // Auto-expand the first chapter
      if (chapterData && chapterData.length > 0) {
        setExpandedChapters([chapterData[0].id]);
      }
    } catch (err) {
      console.error('Error fetching chapters:', err);
    } finally {
      setLoadingChapters(false);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  if (loadingChapters) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading chapters...</div>;
  }

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      {chapters.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No chapters yet.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {chapters.length} Chapter{chapters.length !== 1 ? 's' : ''}
          </p>
          {chapters.map((ch, i) => {
            const isExpanded = expandedChapters.includes(ch.id);
            return (
              <div
                key={ch.id}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                {/* Chapter header — always visible */}
                <button
                  onClick={() => toggleChapter(ch.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className={`text-sm font-medium flex-1 ${
                    isExpanded ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {ch.title}
                  </span>
                </button>

                {/* Chapter content — collapsible */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <MarkdownReader
                      content={ch.content || '_No content._'}
                      enableTTS={true}
                      enableFontResize={true}
                      className="pt-3"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeckViewer({ data }: { data: any }) {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    fetchCards();
  }, [data.id]);

  const fetchCards = async () => {
    try {
      const { data: cardData, error } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', data.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setCards(cardData || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  if (loadingCards) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading cards...</div>;
  }

  if (cards.length === 0) {
    return <p className="text-sm text-gray-500 italic">No cards in this deck yet.</p>;
  }

  const card = cards[currentIndex];

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      <div className="border rounded-lg bg-white p-6 min-h-[200px]">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="text-xs">
            Card {currentIndex + 1} of {cards.length}
          </Badge>
        </div>
        <h4 className="font-semibold text-gray-900 mb-3">{card.title}</h4>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {card.content || ''}
          </ReactMarkdown>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <span className="text-xs text-gray-500">
          {currentIndex + 1} / {cards.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function EpisodeViewer({ data }: { data: any }) {
  const getYoutubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const getVimeoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
  };

  const videoUrl = data.video_url || data.url || '';
  let embedUrl: string | null = null;

  // Support both episodes (video_platform) and documents (video_provider)
  const platform = data.video_platform || data.video_provider || '';

  if (platform === 'youtube' || videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) {
    embedUrl = getYoutubeEmbedUrl(videoUrl);
  } else if (platform === 'vimeo' || videoUrl.includes('vimeo')) {
    embedUrl = getVimeoEmbedUrl(videoUrl);
  } else if (platform === 'loom' || videoUrl.includes('loom.com')) {
    const loomId = videoUrl.split('/').pop();
    if (loomId) embedUrl = `https://www.loom.com/embed/${loomId}`;
  }

  return (
    <div className="space-y-4">
      {embedUrl ? (
        <div className="border rounded-lg overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : videoUrl ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
          <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Video available externally</p>
          <Button variant="outline" size="sm" asChild>
            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Watch Video
            </a>
          </Button>
        </div>
      ) : null}

      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      <div className="flex gap-3 text-xs text-gray-500">
        {data.duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {data.duration} min
          </span>
        )}
      </div>
    </div>
  );
}

function ChecklistViewer({ data }: { data: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [data.id]);

  const fetchItems = async () => {
    try {
      const { data: itemData, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', data.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setItems(itemData || []);
    } catch (err) {
      console.error('Error fetching checklist items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  if (loadingItems) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading checklist...</div>;
  }

  const completedCount = items.filter((i) => i.is_complete).length;

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      <div className="flex items-center gap-2 text-sm">
        <Badge variant={completedCount === items.length && items.length > 0 ? 'default' : 'secondary'}>
          {completedCount} / {items.length} complete
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No items in this checklist.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-3 py-2 rounded-md ${
                item.is_complete ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {item.is_complete ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <span className={`text-sm ${item.is_complete ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {item.text}
                </span>
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                )}
              </div>
              {item.assignment && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {item.assignment}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistViewer({ data }: { data: any }) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisodes();
  }, [data.id]);

  const fetchEpisodes = async () => {
    try {
      const { data: episodeData, error } = await supabase
        .from('episodes')
        .select('id, title, description, duration, video_url, video_platform, order_index')
        .eq('playlist_id', data.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setEpisodes(episodeData || []);
    } catch (err) {
      console.error('Error fetching playlist episodes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading episodes...</div>;
  }

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      {episodes.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No episodes in this playlist yet.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
          </p>
          {episodes.map((ep, i) => (
            <div key={ep.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}</span>
              <PlayCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{ep.title}</p>
                {ep.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{ep.description}</p>
                )}
              </div>
              {ep.duration && (
                <span className="text-xs text-gray-500 flex-shrink-0">{ep.duration} min</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryViewer({ data }: { data: any }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [data.id]);

  const fetchDocuments = async () => {
    try {
      const { data: libDocs, error } = await supabase
        .from('library_documents')
        .select('document:documents(id, title, description, url, tags)')
        .eq('library_id', data.id)
        .limit(20);

      if (error) throw error;
      const docs = (libDocs || []).map((ld: any) => ld.document).filter(Boolean);
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching library documents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading library...</div>;
  }

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No documents in this library yet.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                {doc.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{doc.description}</p>
                )}
              </div>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContainerViewer({ data }: { data: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContainerDocuments();
  }, [data.id]);

  const fetchContainerDocuments = async () => {
    try {
      // Containers typically hold documents via document_ids or circle_ids
      if (data.document_ids && data.document_ids.length > 0) {
        const { data: docs, error } = await supabase
          .from('documents')
          .select('id, title, description, url')
          .in('id', data.document_ids)
          .is('deleted_at', null);

        if (error) throw error;
        setItems(docs || []);
      }
    } catch (err) {
      console.error('Error fetching container items:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-sm text-gray-500">Loading container...</div>;
  }

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      {data.visibility && (
        <Badge variant="outline" className="text-xs capitalize">{data.visibility}</Badge>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-50">
              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
              </div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No items in this container.</p>
      )}
    </div>
  );
}

function ActivityViewer({ data, activityType }: { data: any; activityType: string }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.member_ids && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{data.member_ids.length} member{data.member_ids.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        {data.start_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{new Date(data.start_date).toLocaleDateString()}</span>
          </div>
        )}
        {data.end_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Ends {new Date(data.end_date).toLocaleDateString()}</span>
          </div>
        )}
        {data.visibility && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="capitalize">{data.visibility}</span>
          </div>
        )}
      </div>

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function PageViewer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.description && (
        <p className="text-sm text-gray-500 italic">{data.description}</p>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {data.content || '_No content._'}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function MagazineViewer({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}
      {data.cover_image && (
        <img
          src={data.cover_image}
          alt={data.title || 'Magazine cover'}
          className="w-full max-h-[300px] object-cover rounded-lg"
        />
      )}
      <div className="flex gap-3 text-xs text-gray-500">
        {data.category && <Badge variant="outline">{data.category}</Badge>}
      </div>
    </div>
  );
}

// ──────── Fallback for unknown types ────────

function GenericViewer({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {data.description && (
        <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
      )}
      {data.content && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.content}
          </ReactMarkdown>
        </div>
      )}
      {data.url && (
        <Button variant="outline" size="sm" asChild>
          <a href={data.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Link
          </a>
        </Button>
      )}
    </div>
  );
}

// ──────── Interactive type viewers ────────

function PollViewer({ data, onComplete }: { data: any; onComplete?: () => void }) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPollData(); }, [data.id]);

  const loadPollData = async () => {
    try {
      const [questionsRes, myRes, allRes] = await Promise.all([
        supabase.from('survey_questions').select('*').eq('survey_id', data.id).order('order_index').limit(1),
        profile
          ? supabase.from('survey_responses').select('answers').eq('survey_id', data.id).eq('user_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('survey_responses').select('answers, user_id').eq('survey_id', data.id),
      ]);
      const q = (questionsRes.data || [])[0];
      setQuestions(questionsRes.data || []);
      setAllResponses(allRes.data || []);
      if (myRes.data && q) {
        setMyVote((myRes.data.answers as any)[q.id] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  const question = questions[0];
  if (loading) return <div className="text-center py-6 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading poll...</div>;
  if (!question) return <p className="text-sm text-gray-500 italic">Poll question not configured yet.</p>;

  const options: Array<{ id: string; text: string }> = question.options || [];
  const hasVoted = myVote !== null;
  const totalVotes = allResponses.length;
  const getCount = (optId: string) => allResponses.filter(r => (r.answers as any)[question.id] === optId).length;

  const handleVote = async () => {
    if (!selectedOption || !profile) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('survey_responses').upsert({
        survey_id: data.id,
        user_id: profile.id,
        answers: { [question.id]: selectedOption },
      });
      if (error) throw error;
      setMyVote(selectedOption);
      setAllResponses(prev => [
        ...prev.filter(r => r.user_id !== profile.id),
        { answers: { [question.id]: selectedOption }, user_id: profile.id },
      ]);
      toast.success('Vote submitted!');
      onComplete?.();
    } catch {
      toast.error('Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="font-medium text-gray-900">{question.text}</p>
      {!hasVoted ? (
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                selectedOption === opt.id
                  ? 'border-violet-500 bg-violet-50 font-medium'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {opt.text}
            </button>
          ))}
          <Button
            disabled={!selectedOption || submitting}
            onClick={handleVote}
            className="mt-2 bg-violet-600 hover:bg-violet-700"
            size="sm"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <BarChart2 className="w-4 h-4 mr-2" />
            Submit Vote
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</p>
          {options.map(opt => {
            const count = getCount(opt.id);
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyVote = myVote === opt.id;
            return (
              <div key={opt.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={isMyVote ? 'font-semibold text-violet-700' : 'text-gray-800'}>
                    {opt.text}{isMyVote && ' ✓'}
                  </span>
                  <span className="text-gray-500 tabular-nums">{count} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${isMyVote ? 'bg-violet-500' : 'bg-gray-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReflectionViewer({ data, onComplete }: { data: any; onComplete?: () => void }) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [hasExistingResponse, setHasExistingResponse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => { loadResponse(); }, [data.id]);

  const loadResponse = async () => {
    if (!profile) { setLoading(false); return; }
    const { data: r } = await supabase
      .from('reflection_responses')
      .select('content, updated_at')
      .eq('reflection_id', data.id)
      .eq('user_id', profile.id)
      .maybeSingle();
    if (r) {
      setContent(r.content);
      setSavedAt(r.updated_at);
      setHasExistingResponse(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile || !content.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('reflection_responses').upsert({
        reflection_id: data.id,
        user_id: profile.id,
        content: content.trim(),
        updated_at: now,
      });
      if (error) throw error;
      setSavedAt(now);
      toast.success('Reflection saved');
      if (!hasExistingResponse) {
        setHasExistingResponse(true);
        onComplete?.();
      }
    } catch {
      toast.error('Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  const prompt = data.prompt || data.description;

  return (
    <div className="space-y-4">
      {prompt && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Reflection Prompt</span>
          </div>
          <p className="text-sm text-teal-900 leading-relaxed">{prompt}</p>
        </div>
      )}
      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...</div>
      ) : (
        <>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your reflection here... This is private to you."
            rows={6}
            className="resize-none"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {hasExistingResponse ? 'Update Reflection' : 'Save Reflection'}
            </Button>
            {savedAt && (
              <span className="text-xs text-gray-500">
                Saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ──────── Table config for fetching ────────

const FETCH_CONFIG: Record<string, { table: string; select: string }> = {
  document: { table: 'documents', select: 'id, title, description, url, tags, media_type, video_url, video_provider, duration_minutes, access_level, created_at' },
  book: { table: 'books', select: 'id, title, description, created_at' },
  page: { table: 'pages', select: 'id, title, content, description, tags, visibility, updated_at' },
  deck: { table: 'decks', select: 'id, title, description, category, tags, created_at' },
  shelf: { table: 'libraries', select: 'id, name, description, icon, is_public, created_at' },
  playlist: { table: 'playlists', select: 'id, name, description, tags, visibility, created_at' },
  build: { table: 'builds', select: 'id, name, description, slug, visibility, tags, member_ids, document_ids, created_at' },
  pitch: { table: 'pitches', select: 'id, name, description, slug, visibility, tags, member_ids, created_at' },
  table: { table: 'tables', select: 'id, name, description, slug, visibility, tags, member_ids, created_at' },
  elevator: { table: 'elevators', select: 'id, name, description, slug, visibility, tags, member_ids, created_at' },
  standup: { table: 'standups', select: 'id, name, description, slug, visibility, tags, member_ids, created_at' },
  meetup: { table: 'meetups', select: 'id, name, description, slug, visibility, tags, member_ids, start_date, end_date, created_at' },
  sprint: { table: 'sprints', select: 'id, name, description, slug, start_date, end_date, member_ids, admin_ids, created_at' },
  event: { table: 'events', select: 'id, title, description, start_time, end_time, location, event_type, created_at' },
  episode: { table: 'episodes', select: 'id, title, description, video_url, video_platform, duration, created_at' },
  checklist: { table: 'checklists', select: 'id, name, description, category, is_template, created_at' },
  magazine: { table: 'magazines', select: 'id, name, description, cover_image, category, created_at' },
  discussion: { table: 'discussions', select: 'id, title, description, tags, created_at' },
  resource: { table: 'documents', select: 'id, title, description, url, tags, created_at' },
  poll: { table: 'surveys', select: 'id, name, description, show_results_before_vote' },
  reflection: { table: 'reflections', select: 'id, title, prompt, description' },
};

// ──────── Main Inline Viewer ────────

export function JourneyInlineViewer({ itemType, itemId, title, onClose, onComplete }: JourneyInlineViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchContent();
  }, [itemType, itemId]);

  const fetchContent = async () => {
    const config = FETCH_CONFIG[itemType];
    if (!config) {
      setError(`Unsupported content type: ${itemType}`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error: fetchError } = await supabase
        .from(config.table)
        .select(config.select)
        .eq('id', itemId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Content not found.');
        } else {
          throw fetchError;
        }
        return;
      }

      setData(result);
    } catch (err: any) {
      console.error(`Error fetching ${itemType} content:`, err);
      setError(err?.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to full page based on item type
  const getFullPageRoute = useCallback(() => {
    const routeMap: Record<string, string> = {
      document: `/documents/${itemId}`,
      book: `/books/${itemId}`,
      deck: `/decks/${itemId}`,
      shelf: `/libraries/${itemId}`,
      episode: `/episodes/${itemId}`,
      checklist: `/checklists/${itemId}`,
      magazine: `/magazines/${itemId}`,
      event: `/events/${itemId}`,
      page: `/my-pages`,
    };

    if (routeMap[itemType]) return routeMap[itemType];

    // Slug-based routes need the slug from fetched data
    const slugTypes = ['playlist', 'build', 'pitch', 'table', 'elevator', 'standup', 'meetup', 'sprint'];
    if (slugTypes.includes(itemType) && data?.slug) {
      const routeBase: Record<string, string> = {
        playlist: '/playlists',
        build: '/builds',
        pitch: '/pitches',
        table: '/tables',
        elevator: '/elevators',
        standup: '/standups',
        meetup: '/meetups',
        sprint: '/sprints',
      };
      return `${routeBase[itemType]}/${data.slug}`;
    }

    return null;
  }, [itemType, itemId, data]);

  const renderContent = () => {
    if (!data) return null;

    // Handle documents with video media_type as episodes
    if (itemType === 'document' && data.media_type === 'video' && data.video_url) {
      return <EpisodeViewer data={data} />;
    }

    switch (itemType) {
      case 'page':
        return <PageViewer data={data} />;
      case 'document':
      case 'resource':
        return <DocumentViewer data={data} />;
      case 'book':
        return <BookViewer data={data} />;
      case 'deck':
        return <DeckViewer data={data} />;
      case 'episode':
        return <EpisodeViewer data={data} />;
      case 'checklist':
        return <ChecklistViewer data={data} />;
      case 'playlist':
        return <PlaylistViewer data={data} />;
      case 'shelf':
        return <LibraryViewer data={data} />;
      case 'magazine':
        return <MagazineViewer data={data} />;
      case 'build':
      case 'pitch':
      case 'table':
      case 'elevator':
      case 'standup':
      case 'meetup':
      case 'sprint':
        return <ActivityViewer data={data} activityType={itemType} />;
      case 'event':
        return (
          <div className="space-y-4">
            {data.description && (
              <p className="text-sm text-gray-700 leading-relaxed">{data.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {data.start_time && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(data.start_time).toLocaleString()}</span>
                </div>
              )}
              {data.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{data.location}</span>
                </div>
              )}
              {data.event_type && (
                <Badge variant="outline" className="text-xs w-fit capitalize">{data.event_type}</Badge>
              )}
            </div>
          </div>
        );
      case 'discussion':
        return <GenericViewer data={data} />;
      case 'poll':
        return <PollViewer data={data} onComplete={onComplete} />;
      case 'reflection':
        return <ReflectionViewer data={data} onComplete={onComplete} />;
      default:
        return <GenericViewer data={data} />;
    }
  };

  const fullPageRoute = getFullPageRoute();

  return (
    <div className="mt-3 border-t border-blue-100 pt-4 animate-in slide-in-from-top-2 fade-in duration-200">
      {/* Viewer header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h5 className="text-sm font-semibold text-gray-800">
            {title}
          </h5>
        </div>
        <div className="flex items-center gap-1.5">
          {fullPageRoute && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(fullPageRoute)}
              className="text-xs h-7 px-2 text-gray-600 hover:text-blue-600"
            >
              <Maximize2 className="w-3.5 h-3.5 mr-1" />
              Full Page
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading content...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-8 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          {fullPageRoute && (
            <Button variant="outline" size="sm" onClick={() => navigate(fullPageRoute)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full Page
            </Button>
          )}
        </div>
      ) : (
        <div className="pb-2">
          {renderContent()}
        </div>
      )}
    </div>
  );
}