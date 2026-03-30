// Split candidate: ~511 lines — consider extracting MarkdownToolbar, TTSControls, and FontSizeAdjuster into sub-components.
import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/app/components/ui/button';
import { Slider } from '@/app/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import {
  Play,
  Pause,
  Square,
  Type,
  Volume2,
  Settings2,
} from 'lucide-react';

type FontSize = 'sm' | 'base' | 'lg';

const FONT_SIZE_CONFIG: Record<FontSize, { label: string; className: string }> = {
  sm: { label: 'S', className: 'text-sm [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_p]:text-sm [&_li]:text-sm' },
  base: { label: 'M', className: 'text-base [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:text-base [&_li]:text-base' },
  lg: { label: 'L', className: 'text-lg [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_p]:text-lg [&_li]:text-lg' },
};

interface TTSSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceURI: string | null;
}

const DEFAULT_TTS: TTSSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voiceURI: null,
};

/** Try to load persisted TTS prefs from localStorage */
function loadTTSSettings(): TTSSettings {
  try {
    const raw = localStorage.getItem('connexted_tts_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TTS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_TTS };
}

function saveTTSSettings(settings: TTSSettings) {
  try {
    localStorage.setItem('connexted_tts_settings', JSON.stringify(settings));
  } catch { /* ignore */ }
}

interface MarkdownReaderProps {
  content: string;
  enableTTS?: boolean;
  enableFontResize?: boolean;
  className?: string;
}

/**
 * Strip markdown syntax for TTS — we want the speech engine
 * to read the plain text, not "hash hash Introduction".
 */
function stripMarkdown(md: string): string {
  return md
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove blockquotes marker
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function MarkdownReader({
  content,
  enableTTS = true,
  enableFontResize = true,
  className = '',
}: MarkdownReaderProps) {
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(loadTTSSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check TTS support & load voices on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setTtsSupported(true);

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    loadVoices();
    // Chrome fires voiceschanged asynchronously
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const resolveVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // If user has chosen a specific voice, use it
    if (ttsSettings.voiceURI) {
      const match = voices.find((v) => v.voiceURI === ttsSettings.voiceURI);
      if (match) return match;
    }

    // Fallback: pick a good English voice
    return (
      voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
      voices.find((v) => v.lang.startsWith('en') && !v.localService) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      null
    );
  }, [voices, ttsSettings.voiceURI]);

  /**
   * Split text into chunks to avoid Chrome's ~15s silence bug.
   * We split on sentence boundaries, keeping chunks under ~200 chars.
   */
  const splitIntoChunks = useCallback((text: string): string[] => {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (current.length + trimmed.length > 200 && current.length > 0) {
        chunks.push(current.trim());
        current = trimmed;
      } else {
        current += (current ? ' ' : '') + trimmed;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }, []);

  const speakChunk = useCallback((index: number) => {
    if (!('speechSynthesis' in window)) return;
    const chunks = chunksRef.current;
    if (index >= chunks.length) {
      // All chunks done
      setIsSpeaking(false);
      setIsPaused(false);
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.rate = ttsSettings.rate;
    utterance.pitch = ttsSettings.pitch;
    utterance.volume = ttsSettings.volume;

    const voice = resolveVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      chunkIndexRef.current = index + 1;
      speakChunk(index + 1);
    };
    utterance.onerror = (e) => {
      // 'interrupted' is expected when user stops; only fail on real errors
      if (e.error !== 'interrupted') {
        console.warn('TTS error on chunk', index, e.error);
        setIsSpeaking(false);
        setIsPaused(false);
        if (keepAliveRef.current) {
          clearInterval(keepAliveRef.current);
          keepAliveRef.current = null;
        }
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsSettings, resolveVoice]);

  const handlePlay = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    // Cancel any current speech
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    const plainText = stripMarkdown(content);
    if (!plainText) return;

    // Wait for voices if not yet loaded (Chrome async loading)
    const attemptSpeak = () => {
      const chunks = splitIntoChunks(plainText);
      chunksRef.current = chunks;
      chunkIndexRef.current = 0;

      // Chrome keepalive: periodically nudge the synth so it doesn't auto-pause
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      speakChunk(0);
      setIsSpeaking(true);
      setIsPaused(false);
    };

    // If voices haven't loaded yet, wait briefly
    if (voices.length === 0) {
      const timeout = setTimeout(attemptSpeak, 300);
      const onVoices = () => {
        clearTimeout(timeout);
        attemptSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices, { once: true });
    } else {
      attemptSpeak();
    }
  }, [content, isPaused, voices, splitIntoChunks, speakChunk]);

  const handlePause = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  }, []);

  const handleStop = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const updateSetting = useCallback(<K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
    setTtsSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveTTSSettings(next);
      return next;
    });
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSize((prev) => {
      if (prev === 'sm') return 'base';
      if (prev === 'base') return 'lg';
      return 'sm';
    });
  }, []);

  // Group voices by language for the selector
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  const otherVoices = voices.filter((v) => !v.lang.startsWith('en'));

  const showToolbar = enableFontResize || (enableTTS && ttsSupported);
  const sizeClass = FONT_SIZE_CONFIG[fontSize].className;

  return (
    <div className={className}>
      {/* Reader toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-end gap-1 mb-3">
          {/* Font size toggle */}
          {enableFontResize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleFontSize}
              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 gap-1"
              title={`Text size: ${FONT_SIZE_CONFIG[fontSize].label}`}
            >
              <Type className="w-3.5 h-3.5" />
              {FONT_SIZE_CONFIG[fontSize].label}
            </Button>
          )}

          {/* TTS controls */}
          {enableTTS && ttsSupported && (
            <div className="flex items-center gap-0.5">
              {isSpeaking ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePause}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlay}
                  className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 gap-1"
                  title={isPaused ? 'Resume reading' : 'Read aloud'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {isPaused ? 'Resume' : 'Listen'}
                </Button>
              )}
              {(isSpeaking || isPaused) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStop}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  title="Stop"
                >
                  <Square className="w-3 h-3" />
                </Button>
              )}

              {/* Settings popover */}
              <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                    title="Voice settings"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Voice Settings</h4>

                    {/* Voice selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Voice</label>
                      <select
                        value={ttsSettings.voiceURI || ''}
                        onChange={(e) => updateSetting('voiceURI', e.target.value || null)}
                        className="w-full text-sm border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Auto (best available)</option>
                        {englishVoices.length > 0 && (
                          <optgroup label="English">
                            {englishVoices.map((v) => (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} ({v.lang}){v.localService ? '' : ' ☁️'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {otherVoices.length > 0 && (
                          <optgroup label="Other Languages">
                            {otherVoices.map((v) => (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} ({v.lang}){v.localService ? '' : ' ☁️'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p className="text-[10px] text-gray-400">☁️ = cloud-based (higher quality)</p>
                    </div>

                    {/* Speed */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">Speed</label>
                        <span className="text-xs text-gray-400">{ttsSettings.rate.toFixed(1)}×</span>
                      </div>
                      <Slider
                        value={[ttsSettings.rate]}
                        onValueChange={([v]) => updateSetting('rate', v)}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Slower</span>
                        <span>Faster</span>
                      </div>
                    </div>

                    {/* Pitch */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">Pitch</label>
                        <span className="text-xs text-gray-400">{ttsSettings.pitch.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[ttsSettings.pitch]}
                        onValueChange={([v]) => updateSetting('pitch', v)}
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Lower</span>
                        <span>Higher</span>
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">Volume</label>
                        <span className="text-xs text-gray-400">{Math.round(ttsSettings.volume * 100)}%</span>
                      </div>
                      <Slider
                        value={[ttsSettings.volume]}
                        onValueChange={([v]) => updateSetting('volume', v)}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Reset */}
                    <div className="pt-1 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-gray-500"
                        onClick={() => {
                          setTtsSettings({ ...DEFAULT_TTS });
                          saveTTSSettings({ ...DEFAULT_TTS });
                        }}
                      >
                        Reset to defaults
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {/* Markdown content */}
      <div className={`prose max-w-none ${sizeClass}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content || '_No content._'}
        </ReactMarkdown>
      </div>
    </div>
  );
}