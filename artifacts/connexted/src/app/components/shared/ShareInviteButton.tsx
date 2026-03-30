/**
 * ShareInviteButton — Universal share + invite component for any content or container.
 *
 * Two modes:
 *   1. "Copy Link" — clipboard copy + native share API on mobile
 *   2. "Send to People" — search platform users, send notification with link
 *
 * Records shares to the content_shares table for analytics.
 * Does NOT create container_memberships or manipulate member_ids[].
 * This is a discovery/distribution mechanism, not an access-control mechanism.
 */
// Split candidate: ~582 lines — consider extracting CopyLinkButton, SendToPeopleDialog, and UserSearchCombobox into separate components.
import { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Copy,
  Check,
  Search,
  Send,
  UserPlus,
  X,
  Link2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { type EntityType, getEntityUrl, getEntityLabel } from '@/lib/entity-urls';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareInviteButtonProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  variant?: 'button' | 'icon' | 'inline';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareInviteButton({
  entityType,
  entityId,
  entityName,
  variant = 'button',
  size = 'sm',
  className = '',
}: ShareInviteButtonProps) {
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('link');

  // "Send to People" state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);

  const fullUrl = getEntityUrl(entityType, entityId);
  const entityLabel = getEntityLabel(entityType);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  // -----------------------------------------------------------------------
  // Copy to clipboard
  // -----------------------------------------------------------------------
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
          trackShare('external');
          return;
        } catch (clipErr: any) {
          if (clipErr.name !== 'NotAllowedError') throw clipErr;
        }
      }

      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (ok) {
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
        trackShare('external');
      } else {
        throw new Error('Copy failed');
      }
    } catch (_err) {
      toast.info('Please manually copy: ' + fullUrl, { duration: 5000 });
    }
  };

  // -----------------------------------------------------------------------
  // Native share (mobile)
  // -----------------------------------------------------------------------
  const handleNativeShare = async () => {
    if (!canShare) {
      setDialogOpen(true);
      return;
    }
    try {
      await navigator.share({
        title: entityName,
        text: 'Check out this ' + entityLabel + ': ' + entityName,
        url: fullUrl,
      });
      trackShare('external');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setDialogOpen(true);
      }
    }
  };

  // -----------------------------------------------------------------------
  // User search for "Send to People"
  // -----------------------------------------------------------------------
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .or('name.ilike.%' + query + '%,email.ilike.%' + query + '%')
        .limit(10);

      if (error) throw error;

      const selectedIds = new Set(selectedUsers.map(function(u) { return u.id; }));
      const filtered = (data || []).filter(function(u) {
        return u.id !== (profile ? profile.id : null) && !selectedIds.has(u.id);
      });
      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }, [profile, selectedUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // -----------------------------------------------------------------------
  // Send to selected users
  // -----------------------------------------------------------------------
  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one person');
      return;
    }
    if (!profile) return;

    setSending(true);
    try {
      const pathPrefix = entityType === 'thread' ? 'forums' : entityType + 's';
      const entityPath = '/' + pathPrefix + '/' + entityId;

      const sharerName = profile.name || profile.full_name || 'Someone';

      const notifications = selectedUsers.map(function(user) {
        return {
          user_id: user.id,
          type: 'content.shared',
          title: sharerName + ' shared a ' + entityLabel.toLowerCase() + ' with you',
          message: message
            ? '\"' + message + '\" \u2014 ' + entityName
            : 'Check out "' + entityName + '"',
          link_url: entityPath,
          link_type: entityType,
          link_id: entityId,
          actor_id: profile.id,
          created_by: profile.id,
          created_at: new Date().toISOString(),
        };
      });

      const { error: notifError } = await supabase.from('notifications').insert(notifications);
      if (notifError) {
        console.error('Error creating share notifications:', notifError);
        throw notifError;
      }

      for (const user of selectedUsers) {
        trackShare('direct', user.id);
      }

      toast.success(
        selectedUsers.length === 1
          ? 'Shared with ' + selectedUsers[0].name
          : 'Shared with ' + selectedUsers.length + ' people'
      );

      setSelectedUsers([]);
      setMessage('');
      setSearchQuery('');
      setDialogOpen(false);
    } catch (err) {
      console.error('Error sending shares:', err);
      toast.error('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // -----------------------------------------------------------------------
  // Track share in content_shares table
  // -----------------------------------------------------------------------
  const trackShare = async (channel: 'external' | 'direct', recipientId?: string) => {
    if (!profile) return;
    try {
      const insertData: Record<string, string> = {
        content_type: entityType,
        content_id: entityId,
        shared_in_type: channel,
        shared_by: profile.id,
        share_url: fullUrl,
      };
      if (recipientId) {
        insertData.shared_with = recipientId;
      }
      await supabase.from('content_shares').insert(insertData);
    } catch (err) {
      console.log('Share tracking error (non-critical):', err);
    }
  };

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const addUser = (user: SearchUser) => {
    if (!selectedUsers.find(function(u) { return u.id === user.id; })) {
      setSelectedUsers(function(prev) { return [...prev, user]; });
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(function(prev) { return prev.filter(function(u) { return u.id !== userId; }); });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(function(n) { return n[0]; })
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setActiveTab('link');
    setCopied(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setMessage('');
  };

  // -----------------------------------------------------------------------
  // Render trigger button
  // -----------------------------------------------------------------------
  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenDialog}
                className={className}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (variant === 'inline') {
      const displayPath = '/' + (entityType === 'thread' ? 'forums' : entityType + 's') + '/' + entityId;
      return (
        <div className={'flex items-center gap-2 ' + className}>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-0">
            <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm text-gray-700 font-mono truncate" title={fullUrl}>
              {displayPath}
            </p>
          </div>
          <Button variant={copied ? 'default' : 'ghost'} size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenDialog} title="Share with people">
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleOpenDialog}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const sendButtonLabel = sending
    ? 'Sending...'
    : selectedUsers.length === 0
      ? 'Select people to share with'
      : 'Share with ' + selectedUsers.length + ' ' + (selectedUsers.length === 1 ? 'person' : 'people');

  return (
    <>
      {renderTrigger()}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              {'Share ' + entityLabel}
            </DialogTitle>
            <DialogDescription className="truncate">
              {entityName}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Copy Link
              </TabsTrigger>
              <TabsTrigger value="people" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Send to People
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Copy Link */}
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                  value={fullUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                  onClick={function(e) { e.currentTarget.select(); }}
                />
                <Button
                  onClick={handleCopy}
                  variant={copied ? 'default' : 'secondary'}
                  size="icon"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {canShare && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleNativeShare}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Share via...
                </Button>
              )}

              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  {'Paste this link into a group feed, discussion, email, or social media to share this ' + entityLabel.toLowerCase() + ' with others.'}
                </p>
              </div>
            </TabsContent>

            {/* Tab 2: Send to People */}
            <TabsContent value="people" className="space-y-4 mt-4">
              {!profile ? (
                <p className="text-sm text-muted-foreground">
                  Sign in to share with other members.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={function(e) { setSearchQuery(e.target.value); }}
                      className="pl-10"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {searchResults.map(function(user) {
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={function() { addUser(user); }}
                            className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                          >
                            <Avatar className="w-7 h-7">
                              {user.avatar && (
                                <AvatarImage src={user.avatar} alt={user.name} />
                              )}
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {searching && searchQuery.length >= 2 && (
                    <p className="text-xs text-muted-foreground">Searching...</p>
                  )}

                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground">No users found</p>
                  )}

                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(function(user) {
                        return (
                          <Badge
                            key={user.id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            <span className="truncate max-w-[120px]">{user.name}</span>
                            <button
                              type="button"
                              onClick={function() { removeUser(user.id); }}
                              className="ml-1 rounded-full hover:bg-gray-300 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <Textarea
                    placeholder="Add a message (optional)"
                    value={message}
                    onChange={function(e) { setMessage(e.target.value); }}
                    rows={2}
                    className="resize-none"
                  />

                  <Button
                    onClick={handleSend}
                    disabled={selectedUsers.length === 0 || sending}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendButtonLabel}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact icon-only variant for header toolbars.
 */
export function ShareInviteIconButton(props: Omit<ShareInviteButtonProps, 'variant' | 'size'>) {
  return <ShareInviteButton {...props} variant="icon" />;
}

/**
 * Inline variant — shows URL strip with copy + invite buttons.
 * Drop-in replacement for ShareableUrl.
 */
export function ShareInviteInline(props: Omit<ShareInviteButtonProps, 'variant' | 'size'>) {
  return <ShareInviteButton {...props} variant="inline" />;
}