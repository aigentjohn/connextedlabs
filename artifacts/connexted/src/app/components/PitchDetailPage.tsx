import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { useViewTracking } from '@/hooks/useViewTracking';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { YouTubeEmbed } from '@/app/components/ui/youtube-embed';
import { ShareInviteInline } from '@/app/components/shared/ShareInviteButton';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import DirectorInfo from '@/app/components/shared/DirectorInfo';
import AddDocumentDialog from '@/app/components/pitch/AddDocumentDialog';
import AddReviewDialog from '@/app/components/pitch/AddReviewDialog';
import PrivateCommentDialog from '@/app/components/shared/PrivateCommentDialog';
import { 
  ExternalLink, 
  Star, 
  Calendar, 
  User, 
  Users, 
  FileText,
  ArrowLeft,
  Presentation,
  Globe,
  Lock,
  UserPlus,
  Settings,
  Tag,
  Plus,
  Maximize2,
  Star as StarIcon,
  Link2,
  Video,
  Flag,
} from 'lucide-react';
import ReportContentDialog from '@/app/components/shared/ReportContentDialog';
import { toast } from 'sonner';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';

interface Pitch {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  slug: string;
  visibility: 'public' | 'member' | 'unlisted' | 'private';
  cover_image: string | null;
  url: string | null;
  video_url: string | null;
  tags: string[];
  created_by: string;
  director_id: string | null;
  admin_ids: string[];
  member_ids: string[];
  sponsor_id: string | null;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  created_at: string;
  author?: {
    id: string;
    name: string;
  };
}

interface Review {
  id: string;
  title: string;
  description: string;
  link_url: string;
  external_rating: number;
  tags: string[];
  created_at: string;
  author?: {
    id: string;
    name: string;
  };
}

export default function PitchDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [sponsor, setSponsor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [showPrivateComment, setShowPrivateComment] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Track pitch views
  useViewTracking('pitch', pitch?.id);

  useEffect(() => {
    if (profile && slug) {
      fetchPitchData();
    }
  }, [profile, slug]);

  const fetchPitchData = async () => {
    try {
      // Fetch pitch
      const { data: pitchData, error: pitchError } = await supabase
        .from('pitches')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (pitchError) throw pitchError;
      
      if (!pitchData) {
        setLoading(false);
        return;
      }
      
      setPitch(pitchData);

      // Check if user has favorited this pitch
      if (profile?.id) {
        const { data: favData } = await supabase
          .from('content_favorites')
          .select('id')
          .eq('content_type', 'pitch')
          .eq('content_id', pitchData.id)
          .eq('user_id', profile.id)
          .maybeSingle();
        setIsFavorited(!!favData);
      }

      // Fetch creator
      const { data: creatorData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', pitchData.created_by)
        .single();

      setCreator(creatorData);

      // Fetch sponsor
      if (pitchData.sponsor_id) {
        const { data: sponsorData } = await supabase
          .from('sponsors')
          .select('*')
          .eq('id', pitchData.sponsor_id)
          .single();

        setSponsor(sponsorData);
      }

      // Fetch documents that belong to this pitch via pitch_ids array
      const { data: pitchDocuments, error: docsError } = await supabase
        .from('documents')
        .select('id, title, description, url, tags, created_at, author:users!documents_author_id_fkey(id, name)')
        .contains('pitch_ids', [pitchData.id])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching pitch documents:', docsError);
      } else if (pitchDocuments) {
        setDocuments(pitchDocuments as Document[]);
      }

      // Fetch reviews that belong to this pitch via pitch_ids array
      const { data: pitchReviews, error: reviewsError } = await supabase
        .from('endorsements')
        .select('id, title, description, link_url, external_rating, tags, created_at, author:users!reviews_author_id_fkey(id, name)')
        .contains('pitch_ids', [pitchData.id])
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching pitch reviews:', reviewsError);
      } else if (pitchReviews) {
        setReviews(pitchReviews as Review[]);
      }
    } catch (error) {
      console.error('Error fetching pitch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Presentation className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600">Pitch not found</p>
        <Button asChild className="mt-4">
          <Link to="/pitches">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pitches
          </Link>
        </Button>
      </div>
    );
  }

  const isAdmin = profile.role === 'super' || pitch.admin_ids?.includes(profile.id) || pitch.created_by === profile.id;
  const isMember = pitch.member_ids?.includes(profile.id);

  // Gate: non-members cannot view private/member-only pitches
  if (!canViewContainer(profile, pitch, 'pitches')) {
    return <Navigate to="/pitches" replace />;
  }

  const handleJoinPitch = async () => {
    if (!pitch || !profile) return;

    try {
      const updatedMemberIds = [...pitch.member_ids, profile.id];
      
      const { error } = await supabase
        .from('pitches')
        .update({ member_ids: updatedMemberIds })
        .eq('id', pitch.id);

      if (error) throw error;

      setPitch({ ...pitch, member_ids: updatedMemberIds });
      toast.success(`You've joined ${pitch.name}!`);
    } catch (error) {
      console.error('Error joining pitch:', error);
      toast.error('Failed to join pitch');
    }
  };

  // handleToggleFavorite removed — now handled by engagement/FavoriteButton component

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'member':
        return <Users className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'private':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleOpenInWindow = (url: string, title: string) => {
    // Open in a popup window with specific dimensions
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
    );
  };

  // Check if URL can be embedded in iframe
  const canEmbedUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // List of domains that block iframe embedding
      const blockedDomains = [
        'gemini.google.com',
        'chat.openai.com',
        'claude.ai',
        'mail.google.com',
        'accounts.google.com',
        'login.microsoftonline.com',
        'github.com/login',
        'twitter.com',
        'x.com',
        'facebook.com',
        'instagram.com',
        'linkedin.com',
        'notion.so', // Notion workspace URLs block iframe embedding; use notion.site (published) URLs instead
      ];
      
      // Check if domain is in blocked list
      if (blockedDomains.some(domain => hostname.includes(domain))) {
        return false;
      }
      
      // Generally embeddable domains
      const embeddableDomains = [
        'docs.google.com',
        'drive.google.com',
        'notion.site',
        'figma.com',
        'miro.com',
        'youtube.com/embed',
        'youtu.be',
        'vimeo.com',
        'airtable.com/embed',
        'codepen.io/embed',
      ];
      
      if (embeddableDomains.some(domain => hostname.includes(domain) || url.includes(domain))) {
        return true;
      }
      
      // Default: assume embeddable (will show fallback on error)
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Pitches', path: '/pitches' },
        { label: pitch.name }
      ]} />
      
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/pitches">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pitches
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Presentation className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{pitch.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 ${getVisibilityColor(pitch.visibility)}`}
                  >
                    {getVisibilityIcon(pitch.visibility)}
                    <span className="capitalize text-xs">{pitch.visibility.replace('-', ' ')}</span>
                  </Badge>
                  {isAdmin && (
                    <Badge variant="default">Admin</Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-gray-600">{pitch.description}</p>
            {pitch.long_description && (
              <p className="text-gray-600 mt-2">{pitch.long_description}</p>
            )}

            {/* Pitch Links */}
            {(pitch.url || pitch.video_url) && (
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {pitch.url && (
                  <a
                    href={pitch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Link2 className="w-4 h-4" />
                    <span className="truncate max-w-[250px]">
                      {(() => { try { return new URL(pitch.url).hostname; } catch { return pitch.url; } })()}
                    </span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
                {pitch.video_url && (
                  <a
                    href={pitch.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <Video className="w-4 h-4" />
                    Video
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isMember && (
              <Button onClick={handleJoinPitch}>
                <UserPlus className="w-4 h-4 mr-2" />
                Join Pitch
              </Button>
            )}
            <FavoriteButton
              contentType="pitch"
              contentId={pitch.id}
              initialIsFavorited={isFavorited}
              userId={profile.id}
              size="sm"
              showCollectionsDialog={true}
            />
            {pitch.created_by && pitch.created_by !== profile.id && (
              <PrivateCommentDialog
                containerType="pitch"
                containerId={pitch.id}
                containerTitle={pitch.name}
                recipientId={pitch.created_by}
                recipientName={creator?.name || 'the creator'}
              />
            )}
            {pitch.created_by !== profile?.id && (
              <ReportContentDialog
                contentType="pitch"
                contentId={pitch.id}
                contentTitle={pitch.name}
                trigger={
                  <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                    <Flag className="w-4 h-4" />
                  </Button>
                }
              />
            )}
            {isAdmin && (
              <Button asChild>
                <Link to={`/pitches/${pitch.slug}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {pitch.cover_image && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={pitch.cover_image}
            alt={pitch.name}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Pitch Video */}
      {pitch.video_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎥 Pitch Video
            </CardTitle>
            <CardDescription>
              Watch the pitch presentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YouTubeEmbed videoUrl={pitch.video_url} />
          </CardContent>
        </Card>
      )}

      {/* Pitch URL Embed - Embed the pitch URL inline if available */}
      {pitch.url && (() => {
        const pitchUrl = pitch.url!;
        return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="w-5 h-5 text-blue-600" />
                  Pitch Resource
                </CardTitle>
                <CardDescription>
                  {(() => { try { return new URL(pitchUrl).hostname; } catch { return 'External link'; } })()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenInWindow(pitchUrl, pitch.name || 'Pitch')}
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Open in Window
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={pitchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Tab
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {canEmbedUrl(pitchUrl) ? (
              <div className="rounded-lg overflow-hidden border bg-gray-50">
                <iframe
                  src={pitchUrl}
                  className="w-full h-[600px]"
                  title={pitch.name || 'Pitch resource'}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <ExternalLink className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Preview Not Available
                    </h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      This URL cannot be previewed inline due to security restrictions from the source website.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-center pt-2">
                    <Button 
                      variant="default"
                      onClick={() => handleOpenInWindow(pitchUrl, pitch.name || 'Pitch')}
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Open in Window
                    </Button>
                    <Button asChild variant="outline">
                      <a href={pitchUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        );
      })()}

      {/* Document Preview - Show first document embedded if available */}
      {documents.length > 0 && documents[0].url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Preview</CardTitle>
            <CardDescription>
              {documents[0].title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEmbedUrl(documents[0].url) ? (
              <>
                <div className="rounded-lg overflow-hidden border bg-gray-50">
                  <iframe
                    src={documents[0].url}
                    className="w-full h-[600px]"
                    title={documents[0].title}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">{documents[0].description}</p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenInWindow(documents[0].url, documents[0].title)}
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Open in Window
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={documents[0].url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Full Size
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <ExternalLink className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Preview Not Available
                    </h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto mb-1">
                      This document cannot be previewed inline due to security restrictions from the source website.
                    </p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Services like Google Gemini, ChatGPT, and Claude block embedding for security reasons.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-center pt-2">
                    <Button 
                      variant="default"
                      onClick={() => handleOpenInWindow(documents[0].url, documents[0].title)}
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Open in Window
                    </Button>
                    <Button asChild variant="outline">
                      <a href={documents[0].url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                  </div>
                  {documents[0].description && (
                    <p className="text-sm text-gray-600 pt-4 border-t">{documents[0].description}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Created by</p>
                <p className="font-medium">{creator?.name || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{new Date(pitch.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="font-medium">{documents.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Reviews</p>
                <p className="font-medium">{reviews.length}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {pitch.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Tags:</span>
                {pitch.tags.map((tag, idx) => (
                  <Link key={idx} to={`/tags/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="hover:bg-gray-200 cursor-pointer transition-colors">
                      <span className="mr-1">#</span>
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sponsor */}
      {sponsor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default" className="bg-yellow-500 text-white">
                Sponsor
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/sponsors/${sponsor.slug}`} className="block hover:bg-gray-50 transition-colors p-4 rounded-lg -m-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600 flex-shrink-0">
                  {sponsor.name?.charAt(0) || 'S'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{sponsor.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{sponsor.tagline}</p>
                  {sponsor.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{sponsor.description}</p>
                  )}
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Director - Financial Sponsor */}
      {pitch.director_id && (
        <DirectorInfo
          directorId={pitch.director_id}
          containerType="pitch"
          containerName={pitch.name}
        />
      )}

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} in this pitch
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowAddDocument(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>No documents added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/documents/${doc.id}`}>
                            <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-600">{doc.title}</h3>
                          </Link>
                          <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>by {doc.author?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                          {/* Tags */}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {doc.tags.slice(0, 5).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} in this pitch
              </CardDescription>
            </div>
            {/* TODO: Create AddReviewDialog component for pitches */}
            {isAdmin && (
              <Button onClick={() => setShowAddReview(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <StarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>No reviews added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <StarIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/reviews/${review.id}`}>
                            <h3 className="font-semibold text-gray-900 mb-1 hover:text-blue-600">{review.title}</h3>
                          </Link>
                          <div className="mb-2">{renderStars(review.external_rating)}</div>
                          <p className="text-sm text-gray-600 mb-2">{review.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>by {review.author?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          {/* Tags */}
                          {review.tags && review.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {review.tags.slice(0, 5).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.link_url && (
                      <Button asChild variant="outline" size="sm">
                        <a href={review.link_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Document Dialog */}
      {pitch && (
        <AddDocumentDialog
          open={showAddDocument}
          onOpenChange={setShowAddDocument}
          pitchId={pitch.id}
          onDocumentAdded={fetchPitchData}
        />
      )}

      {/* Add Review Dialog */}
      {pitch && (
        <AddReviewDialog
          open={showAddReview}
          onOpenChange={setShowAddReview}
          pitchId={pitch.id}
          onReviewAdded={fetchPitchData}
        />
      )}

      {/* Shareable URL */}
      {pitch && (
        <ShareInviteInline
          entityType="pitch"
          entityId={pitch.slug}
          entityName={pitch.name}
        />
      )}
    </div>
  );
}