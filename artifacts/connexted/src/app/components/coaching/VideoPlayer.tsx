// Split candidate: ~416 lines — consider extracting VideoControls, VideoProgressBar, and VideoErrorState into sub-components.
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { projectId } from '@/utils/supabase/info';
import { Button } from '@/app/components/ui/button';

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  videoProvider: 'youtube' | 'vimeo' | 'loom' | 'wistia' | 'direct';
  title: string;
  durationMinutes?: number;
  userId: string;
  programId?: string;
  onProgress?: (watchTimeSeconds: number, completed: boolean) => void;
  embedCode?: string;
}

export function VideoPlayer({
  videoId,
  videoUrl,
  videoProvider,
  title,
  durationMinutes,
  userId,
  programId,
  onProgress,
  embedCode
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<number | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    loadProgress();
  }, [videoId, userId]);

  // Save progress periodically while playing
  useEffect(() => {
    if (isPlaying) {
      progressUpdateInterval.current = window.setInterval(() => {
        saveProgress();
      }, 5000); // Save every 5 seconds
    } else {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    }

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/api/video-progress/${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.progress) {
          setWatchTime(data.progress.watch_time_seconds);
          setCompleted(data.progress.completed);
          
          // Resume from last position
          if (videoRef.current && data.progress.watch_time_seconds > 0) {
            videoRef.current.currentTime = data.progress.watch_time_seconds;
          }
        }
      }
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  };

  const saveProgress = async () => {
    if (!videoRef.current) return;

    const currentWatchTime = Math.floor(videoRef.current.currentTime);
    const totalDuration = Math.floor(videoRef.current.duration);
    const isComplete = currentWatchTime >= totalDuration * 0.9; // 90% completion

    setWatchTime(currentWatchTime);
    
    if (isComplete && !completed) {
      setCompleted(true);
    }

    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/api/video-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          video_id: videoId,
          watch_time_seconds: currentWatchTime,
          total_duration_seconds: totalDuration,
          completed: isComplete,
          program_id: programId
        })
      });

      if (onProgress) {
        onProgress(currentWatchTime, isComplete);
      }
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    // Regular expression to handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    // Return the ID if found (removed strict length check to be more permissive)
    return (match && match[2]) ? match[2] : null;
  };

  const getVimeoId = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    // Try to find numeric ID
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = cleanUrl.match(regExp);
    if (match && match[1]) return match[1];
    
    // Fallback: splitting by / might return empty string if trailing slash
    const parts = cleanUrl.split('/');
    // Remove empty strings resulting from trailing slash
    const filteredParts = parts.filter(p => p.length > 0);
    return filteredParts.pop() || null;
  };

  // Render embedded video for YouTube, Vimeo, etc.
  const renderEmbeddedVideo = () => {
    if (embedCode) {
      return (
        <div 
          className="aspect-video w-full"
          dangerouslySetInnerHTML={{ __html: embedCode }}
        />
      );
    }

    // Generate embed URLs
    let embedUrl = '';
    
    switch (videoProvider) {
      case 'youtube':
        const youtubeId = getYoutubeId(videoUrl);
        if (youtubeId) {
          embedUrl = `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`;
        } else {
          // Fallback check if it's already an embed URL
          if (videoUrl.includes('/embed/')) {
            embedUrl = videoUrl;
          } else {
            // Cannot play this URL in an iframe safely
            return (
               <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-yellow-500 mb-2" />
                  <p className="font-medium mb-1">Video Unavailable</p>
                  <p className="text-sm text-gray-400 mb-4">The video URL format is not recognized.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Watch on YouTube
                    </a>
                  </Button>
               </div>
            );
          }
        }
        break;
      case 'vimeo':
        const vimeoId = getVimeoId(videoUrl);
        if (vimeoId) {
          embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
        } else {
           return (
               <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-yellow-500 mb-2" />
                  <p className="font-medium mb-1">Video Unavailable</p>
                  <p className="text-sm text-gray-400 mb-4">The video URL format is not recognized.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Watch on Vimeo
                    </a>
                  </Button>
               </div>
            );
        }
        break;
      case 'loom':
        // Basic check for loom
        const loomId = videoUrl.split('/').pop();
        if (loomId) {
          embedUrl = `https://www.loom.com/embed/${loomId}`;
        } else {
          embedUrl = videoUrl;
        }
        break;
      case 'wistia':
        const wistiaId = videoUrl.split('/').pop();
        if (wistiaId) {
           embedUrl = `https://fast.wistia.net/embed/iframe/${wistiaId}`;
        } else {
           embedUrl = videoUrl;
        }
        break;
      default:
        embedUrl = videoUrl;
    }

    return (
      <iframe
        src={embedUrl}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  };

  // For direct video files, use custom player
  if (videoProvider === 'direct') {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden">
        {completed && (
          <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setCompleted(true);
            saveProgress();
          }}
        />

        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer mb-3"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-blue-400 transition"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-blue-400 transition">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-blue-400 transition"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For embedded videos (YouTube, Vimeo, etc.)
  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {completed && (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-2 z-10">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Completed</span>
        </div>
      )}
      {renderEmbeddedVideo()}
      
      {/* Progress indicator for embedded videos */}
      <div className="p-4 bg-gray-900">
        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
          <span>Your Progress</span>
          <span>{Math.round((watchTime / (duration || 1)) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(watchTime / (duration || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}