import React from 'react';

interface YouTubeEmbedProps {
  videoUrl: string;
  title?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
}

/**
 * YouTube Embed Component
 * 
 * Accepts various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Just the VIDEO_ID
 * 
 * @example
 * <YouTubeEmbed videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
 * <YouTubeEmbed videoUrl="dQw4w9WgXcQ" />
 */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoUrl,
  title = 'YouTube video player',
  className = '',
  width = '100%',
  height = 'auto',
  autoplay = false,
  controls = true,
  muted = false,
  loop = false,
}) => {
  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;

    // Already just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    // Match various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-600">Invalid YouTube URL</p>
        <p className="text-sm text-gray-500 mt-1">{videoUrl}</p>
      </div>
    );
  }

  // Build embed URL with parameters
  const embedParams = new URLSearchParams();
  if (autoplay) embedParams.append('autoplay', '1');
  if (!controls) embedParams.append('controls', '0');
  if (muted) embedParams.append('mute', '1');
  if (loop) embedParams.append('loop', '1');
  
  const embedUrl = `https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`;

  // Responsive aspect ratio wrapper
  const isResponsive = width === '100%' && height === 'auto';

  if (isResponsive) {
    return (
      <div className={`relative w-full ${className}`} style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        width={width}
        height={height}
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="rounded-lg"
      />
    </div>
  );
};

/**
 * YouTube Link Detector & Auto-Embedder
 * 
 * Detects YouTube links in text and renders them as embeds
 * 
 * @example
 * <YouTubeAutoEmbed text="Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
 */
interface YouTubeAutoEmbedProps {
  text: string;
  className?: string;
}

export const YouTubeAutoEmbed: React.FC<YouTubeAutoEmbedProps> = ({ text, className = '' }) => {
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = youtubeRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add YouTube embed
    parts.push(
      <div key={`video-${match.index}`} className="my-4">
        <YouTubeEmbed videoUrl={match[4]} />
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <div className={className}>{parts}</div>;
};

/**
 * YouTube Video Input Component
 * 
 * Input field with preview for adding YouTube videos
 */
interface YouTubeInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  showPreview?: boolean;
  error?: string;
}

export const YouTubeInput: React.FC<YouTubeInputProps> = ({
  value,
  onChange,
  label = 'YouTube Video URL',
  placeholder = 'https://www.youtube.com/watch?v=...',
  showPreview = true,
  error,
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {showPreview && value && !error && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Preview:</p>
          <YouTubeEmbed videoUrl={value} />
        </div>
      )}
    </div>
  );
};

export default YouTubeEmbed;
