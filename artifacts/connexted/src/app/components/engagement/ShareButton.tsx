import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ShareButtonProps {
  contentType: string;
  contentId: string;
  contentUrl: string;
  contentTitle: string;
  userId?: string;
  circleId?: string;
  programId?: string;
  meetupId?: string;
  tableId?: string;
  sharesCount?: number;
  size?: 'sm' | 'md' | 'lg';
  onShareComplete?: (shareCount: number) => void;
}

export function ShareButton({
  contentType,
  contentId,
  contentUrl,
  contentTitle,
  userId,
  circleId,
  programId,
  meetupId,
  tableId,
  sharesCount = 0,
  size = 'md',
  onShareComplete
}: ShareButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [shareText, setShareText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contentUrl);
      setCopied(true);
      
      // Track external share
      if (userId) {
        await supabase.from('content_shares').insert({
          content_type: contentType,
          content_id: contentId,
          shared_in_type: 'external',
          shared_by: userId,
          share_url: contentUrl,
          circle_id: circleId,
          program_id: programId,
          meetup_id: meetupId,
          table_id: tableId
        });
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleInternalShare = async (shareInType: 'post' | 'forum_thread', shareInId: string) => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.from('content_shares').insert({
        content_type: contentType,
        content_id: contentId,
        shared_in_type: shareInType,
        shared_in_id: shareInId,
        shared_by: userId,
        share_url: contentUrl,
        share_text: shareText || null,
        circle_id: circleId,
        program_id: programId,
        meetup_id: meetupId,
        table_id: tableId
      });

      if (error) throw error;

      onShareComplete?.(sharesCount + 1);
      setShowDialog(false);
      setShareText('');
    } catch (error) {
      console.error('Error sharing content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const shareViaWebShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: contentTitle,
        url: contentUrl
      });

      // Track share
      if (userId) {
        await supabase.from('content_shares').insert({
          content_type: contentType,
          content_id: contentId,
          shared_in_type: 'external',
          shared_by: userId,
          share_url: contentUrl,
          circle_id: circleId,
          program_id: programId,
          meetup_id: meetupId,
          table_id: tableId
        });
      }
    } catch (error) {
      // User cancelled share or error occurred
      console.log('Share cancelled or error:', error);
    }
  };

  const hasWebShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <>
      <button
        onClick={() => hasWebShare ? shareViaWebShare() : setShowDialog(true)}
        className={`
          inline-flex items-center gap-1.5
          px-3 py-1.5 rounded-full
          transition-all duration-200
          bg-gray-100 text-gray-600 hover:bg-gray-200
          cursor-pointer
        `}
        title="Share"
      >
        <Share2 size={iconSizes[size]} />
        {sharesCount > 0 && (
          <span className="text-sm font-medium tabular-nums">
            {sharesCount.toLocaleString()}
          </span>
        )}
      </button>

      {/* Share Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share2 size={20} />
                Share
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {contentTitle}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {contentUrl}
              </p>
            </div>

            {/* Copy Link */}
            <div className="mb-4">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-green-600" />
                    <span className="font-medium text-green-600">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span className="font-medium">Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Share Text (for internal sharing) */}
            {userId && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add a message (optional)
                  </label>
                  <textarea
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    placeholder="Why are you sharing this?"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  Share to:
                </div>

                {/* Share Options - These would be dynamically populated based on user's circles/programs */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 italic">
                    Internal sharing coming soon! For now, use "Copy Link" to share anywhere.
                  </p>
                </div>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowDialog(false)}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
