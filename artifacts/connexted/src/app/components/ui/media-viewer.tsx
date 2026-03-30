// Split candidate: ~456 lines — consider extracting VideoViewer, AudioViewer, ImageViewer, and DocumentViewer into separate renderer components keyed by media type.
import React from 'react';
import { YouTubeEmbed } from '@/app/components/ui/youtube-embed';
import { FileText, ExternalLink, Film, Music, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export type MediaType = 'video' | 'audio' | 'pdf' | 'document' | 'image' | 'link' | 'file';

interface Document {
  id: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
  media_type?: MediaType;
  media_metadata?: any;
  author_id?: string;
  created_at?: string;
}

interface MediaViewerProps {
  document: Document;
  className?: string;
  autoplay?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
}

/**
 * MediaViewer Component
 * 
 * Intelligently renders different media types based on document.media_type
 * Supports: video, audio, pdf, document, image, link, file
 * 
 * @example
 * <MediaViewer document={doc} />
 */
export const MediaViewer: React.FC<MediaViewerProps> = ({
  document,
  className = '',
  autoplay = false,
  showTitle = true,
  showDescription = false,
}) => {
  const mediaType = document.media_type || detectMediaType(document.url, document.category);

  return (
    <div className={`space-y-2 ${className}`}>
      {showTitle && (
        <h3 className="font-semibold text-lg">{document.title}</h3>
      )}
      
      {showDescription && document.description && (
        <p className="text-sm text-gray-600">{document.description}</p>
      )}

      {renderMedia(document, mediaType, autoplay)}
    </div>
  );
};

/**
 * Detect media type from URL or category
 */
function detectMediaType(url: string, category?: string): MediaType {
  if (!url) return 'link';

  // Check category first if provided
  if (category) {
    const validTypes: MediaType[] = ['video', 'audio', 'pdf', 'document', 'image', 'link', 'file'];
    if (validTypes.includes(category as MediaType)) {
      return category as MediaType;
    }
  }

  const urlLower = url.toLowerCase();

  // Video patterns
  if (
    urlLower.includes('youtube.com') ||
    urlLower.includes('youtu.be') ||
    urlLower.includes('vimeo.com') ||
    urlLower.includes('loom.com') ||
    urlLower.includes('wistia.com')
  ) {
    return 'video';
  }

  // Audio patterns
  if (
    urlLower.includes('spotify.com') ||
    urlLower.includes('soundcloud.com') ||
    urlLower.endsWith('.mp3') ||
    urlLower.endsWith('.wav') ||
    urlLower.endsWith('.m4a') ||
    urlLower.endsWith('.ogg')
  ) {
    return 'audio';
  }

  // PDF
  if (urlLower.endsWith('.pdf')) {
    return 'pdf';
  }

  // Images
  if (
    urlLower.endsWith('.jpg') ||
    urlLower.endsWith('.jpeg') ||
    urlLower.endsWith('.png') ||
    urlLower.endsWith('.gif') ||
    urlLower.endsWith('.webp') ||
    urlLower.endsWith('.svg')
  ) {
    return 'image';
  }

  // Documents
  if (
    urlLower.includes('docs.google.com') ||
    urlLower.includes('notion.so') ||
    urlLower.includes('notion.site') ||
    urlLower.includes('airtable.com') ||
    urlLower.includes('coda.io')
  ) {
    return 'document';
  }

  // Default to link
  return 'link';
}

/**
 * Render the appropriate media component based on type
 */
function renderMedia(document: Document, mediaType: MediaType, autoplay: boolean): React.ReactNode {
  const { url, title } = document;

  switch (mediaType) {
    case 'video':
      return <VideoEmbed url={url} title={title} autoplay={autoplay} />;
    
    case 'audio':
      return <AudioPlayer url={url} title={title} autoplay={autoplay} />;
    
    case 'pdf':
      return <PDFViewer url={url} title={title} />;
    
    case 'image':
      return <ImageViewer url={url} title={title} />;
    
    case 'document':
      return <DocumentEmbed url={url} title={title} />;
    
    case 'link':
    case 'file':
    default:
      return <ExternalLinkButton url={url} title={title} />;
  }
}

/**
 * Video Embed Component
 * Supports YouTube, Vimeo, Loom
 */
const VideoEmbed: React.FC<{ url: string; title: string; autoplay: boolean }> = ({ url, title, autoplay }) => {
  // Check if it's YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return <YouTubeEmbed videoUrl={url} title={title} autoplay={autoplay} />;
  }

  // Check if it's Vimeo
  if (url.includes('vimeo.com')) {
    const vimeoId = extractVimeoId(url);
    if (vimeoId) {
      const embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay ? 1 : 0}`;
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={embedUrl}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }

  // Check if it's Loom
  if (url.includes('loom.com')) {
    const loomId = extractLoomId(url);
    if (loomId) {
      const embedUrl = `https://www.loom.com/embed/${loomId}`;
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={embedUrl}
            title={title}
            allowFullScreen
          />
        </div>
      );
    }
  }

  // Fallback to external link
  return <ExternalLinkButton url={url} title={title} icon={<Film />} />;
};

/**
 * Audio Player Component
 * Supports native audio files, Spotify, SoundCloud
 */
const AudioPlayer: React.FC<{ url: string; title: string; autoplay: boolean }> = ({ url, title, autoplay }) => {
  // Check if it's Spotify
  if (url.includes('spotify.com')) {
    const spotifyId = extractSpotifyId(url);
    if (spotifyId) {
      return (
        <iframe
          className="rounded-lg w-full"
          src={`https://open.spotify.com/embed/${spotifyId}`}
          height="152"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      );
    }
  }

  // Check if it's SoundCloud
  if (url.includes('soundcloud.com')) {
    return (
      <iframe
        className="w-full rounded-lg"
        height="166"
        scrolling="no"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=${autoplay}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
        allow="autoplay"
      />
    );
  }

  // Native audio file (MP3, WAV, etc.)
  if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.m4a') || url.endsWith('.ogg')) {
    return (
      <audio controls autoPlay={autoplay} className="w-full rounded-lg">
        <source src={url} />
        Your browser does not support the audio element.
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Download audio file
        </a>
      </audio>
    );
  }

  // Fallback to external link
  return <ExternalLinkButton url={url} title={title} icon={<Music />} />;
};

/**
 * PDF Viewer Component
 */
const PDFViewer: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <iframe
        src={url}
        title={title}
        className="w-full rounded-lg"
        style={{ minHeight: '600px' }}
      />
      <div className="p-3 bg-white border-t flex justify-between items-center">
        <span className="text-sm text-gray-600 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PDF Document
        </span>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>
    </div>
  );
};

/**
 * Image Viewer Component
 */
const ImageViewer: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <img
        src={url}
        alt={title}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  );
};

/**
 * Document Embed Component
 * For Google Docs, Notion, etc.
 */
const DocumentEmbed: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  let embedUrl = url;

  // Convert Google Docs view URLs to embed URLs
  if (url.includes('docs.google.com')) {
    embedUrl = url.replace('/edit', '/preview').replace('/view', '/preview');
  }

  // Notion workspace URLs (notion.so) cannot be embedded — they send X-Frame-Options: DENY.
  // Only published pages (notion.site) can be iframed.
  const isNotionBlocked = /notion\.so/i.test(url) && !/notion\.site/i.test(url);

  if (isNotionBlocked) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-1">Notion workspace pages cannot be embedded inline.</p>
        <p className="text-xs text-gray-500 mb-3">
          Tip: Publish the page in Notion (Share → Publish) and use the notion.site URL to enable inline embedding.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Notion
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      <iframe
        src={embedUrl}
        title={title}
        className="w-full rounded-lg"
        style={{ minHeight: '600px' }}
      />
      <div className="p-3 bg-white border-t flex justify-between items-center">
        <span className="text-sm text-gray-600 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Document
        </span>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>
    </div>
  );
};

/**
 * External Link Button
 */
const ExternalLinkButton: React.FC<{ url: string; title: string; icon?: React.ReactNode }> = ({ 
  url, 
  title,
  icon = <File className="w-4 h-4" />
}) => {
  return (
    <div className="border rounded-lg p-6 bg-gray-50 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-gray-400">
          {icon}
        </div>
        <p className="text-sm text-gray-600">{title}</p>
        <Button asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Link
          </a>
        </Button>
      </div>
    </div>
  );
};

/**
 * Helper functions to extract IDs from various platforms
 */
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractSpotifyId(url: string): string | null {
  // Matches: track/xxx, episode/xxx, playlist/xxx, album/xxx
  const match = url.match(/spotify\.com\/(track|episode|playlist|album)\/([a-zA-Z0-9]+)/);
  return match ? `${match[1]}/${match[2]}` : null;
}

/**
 * MediaTypeIcon - Display icon based on media type
 */
export const MediaTypeIcon: React.FC<{ type: MediaType; className?: string }> = ({ type, className = '' }) => {
  const iconClass = `w-4 h-4 ${className}`;
  
  switch (type) {
    case 'video':
      return <Film className={iconClass} />;
    case 'audio':
      return <Music className={iconClass} />;
    case 'pdf':
      return <FileText className={iconClass} />;
    case 'image':
      return <ImageIcon className={iconClass} />;
    case 'document':
      return <FileText className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
};

/**
 * MediaTypeBadge - Display badge with media type
 */
export const MediaTypeBadge: React.FC<{ type: MediaType }> = ({ type }) => {
  const badges = {
    video: { label: 'Video', color: 'bg-purple-100 text-purple-800' },
    audio: { label: 'Audio', color: 'bg-green-100 text-green-800' },
    pdf: { label: 'PDF', color: 'bg-red-100 text-red-800' },
    image: { label: 'Image', color: 'bg-blue-100 text-blue-800' },
    document: { label: 'Document', color: 'bg-yellow-100 text-yellow-800' },
    link: { label: 'Link', color: 'bg-gray-100 text-gray-800' },
    file: { label: 'File', color: 'bg-gray-100 text-gray-800' },
  };

  const badge = badges[type];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      <MediaTypeIcon type={type} />
      {badge.label}
    </span>
  );
};

export default MediaViewer;