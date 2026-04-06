import { useState,useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { canViewContainer } from '@/lib/visibility-access';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Hammer,
  Settings,
  User,
  Calendar,
  FileText,
  Star as StarIcon,
  Globe,
  Users,
  Lock,
  Tag,
  ExternalLink,
  Plus,
  UserPlus,
  ArrowLeft,
  GitFork
} from 'lucide-react';
import AddDocumentDialog from '@/app/components/build/AddDocumentDialog';
import { ContainerBreadcrumbs } from '@/app/components/shared/ContainerBreadcrumbs';
import { toast } from 'sonner';
import { ShareInviteInline } from '@/app/components/shared/ShareInviteButton';
import { useEngagementExtension } from '@/hooks/useEngagementExtension';
import { ForkButton } from '@/app/components/fork/ForkButton';
import { ForkLineage } from '@/app/components/fork/ForkLineage';
import ContainerReviews from '@/app/components/shared/ContainerReviews';
import { FavoriteButton } from '@/app/components/engagement/FavoriteButton';

interface Build {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: 'public' | 'member' | 'private';
  cover_image: string | null;
  tags: string[];
  created_by: string;
  admin_ids: string[];
  member_ids: string[];
  document_ids: string[];
  review_ids: string[];
  created_at: string;
  program_id?: string | null;
  program_journey_id?: string | null;
  fork_of?: string | null;
  forks_count?: number;
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
  rating: number;
  tags: string[];
  created_at: string;
  author?: {
    id: string;
    name: string;
  };
}

export default function BuildDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [build, setBuild] = useState<Build | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [parentBuild, setParentBuild] = useState<{ id: string; name: string; slug: string; created_by: string; creator_name?: string } | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const { extendOnEngagement } = useEngagementExtension();

  useEffect(() => {
    if (profile && slug) {
      fetchBuildData();
    }
  }, [profile, slug]);

  const fetchBuildData = async () => {
    try {
      // Fetch build
      const { data: buildData, error: buildError } = await supabase
        .from('builds')
        .select('*')
        .eq('slug', slug)
        .single();

      if (buildError) throw buildError;
      setBuild(buildData);

      // Check if user has favorited this build
      if (profile?.id) {
        const { data: favData } = await supabase
          .from('content_favorites')
          .select('id')
          .eq('content_type', 'build')
          .eq('content_id', buildData.id)
          .eq('user_id', profile.id)
          .maybeSingle();
        setIsFavorited(!!favData);
      }

      // Fetch creator
      const { data: creatorData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', buildData.created_by)
        .single();

      setCreator(creatorData);

      // Fetch documents via junction table
      const { data: buildDocuments } = await supabase
        .from('build_documents')
        .select(`
          document:documents (
            id,
            title,
            description,
            url,
            tags,
            created_at,
            author:users!documents_author_id_fkey(id, name)
          )
        `)
        .eq('build_id', buildData.id)
        .is('document.deleted_at', null);

      if (buildDocuments) {
        const docs = buildDocuments
          .map(bd => bd.document)
          .filter((doc): doc is Document => doc !== null);
        setDocuments(docs);
      }

      // Fetch reviews via junction table
      const { data: buildReviews } = await supabase
        .from('build_reviews')
        .select(`
          review:reviews (
            id,
            title,
            description,
            link_url,
            rating,
            tags,
            created_at,
            author:users!reviews_author_id_fkey(id, name)
          )
        `)
        .eq('build_id', buildData.id);

      if (buildReviews) {
        const revs = buildReviews
          .map(br => br.review)
          .filter((rev): rev is Review => rev !== null);
        setReviews(revs);
      }

      // Fetch parent build if this is a fork
      if (buildData.fork_of) {
        try {
          const { data: parentData } = await supabase
            .from('builds')
            .select('id, name, slug, created_by')
            .eq('id', buildData.fork_of)
            .single();

          if (parentData) {
            const { data: parentCreator } = await supabase
              .from('users')
              .select('name')
              .eq('id', parentData.created_by)
              .single();

            setParentBuild({
              ...parentData,
              creator_name: parentCreator?.name
            });
          }
        } catch (err) {
          console.error('Error fetching parent build:', err);
        }
      } else {
        setParentBuild(null);
      }
    } catch (error) {
      console.error('Error fetching build data:', error);
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

  if (!build) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Hammer className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600">Build not found</p>
        <Button asChild className="mt-4">
          <Link to="/builds">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Builds
          </Link>
        </Button>
      </div>
    );
  }

  const isAdmin = profile.role === 'super' || build.admin_ids.includes(profile.id);
  const isMember = build.member_ids.includes(profile.id);
  const isOwner = build.created_by === profile.id;

  // Gate: non-members cannot view private/member-only builds
  if (!canViewContainer(profile, build, 'builds')) {
    return <Navigate to="/builds" replace />;
  }

  const canFork = build.visibility === 'public' && !isOwner;

  const handleJoinBuild = async () => {
    if (!build || !profile) return;

    try {
      const updatedMemberIds = [...build.member_ids, profile.id];
      
      const { error } = await supabase
        .from('builds')
        .update({ member_ids: updatedMemberIds })
        .eq('id', build.id);

      if (error) throw error;

      setBuild({ ...build, member_ids: updatedMemberIds });
      toast.success(`You've joined ${build.name}!`);
    } catch (error) {
      console.error('Error joining build:', error);
      toast.error('Failed to join build');
    }
  };

  const handleFavoriteChange = async (newIsFavorited: boolean) => {
    if (newIsFavorited && build && profile) {
      // Trigger engagement extension when favorited
      const bookmarkId = crypto.randomUUID();
      await extendOnEngagement(
        'builds',
        build.id,
        'bookmark',
        bookmarkId,
        { showToast: false, userId: profile.id }
      );
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <ContainerBreadcrumbs
        containerType="Builds"
        containerName={build.name}
        containerListPath="/builds"
        programId={build.program_id}
        journeyId={build.program_journey_id}
      />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Hammer className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{build.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 ${getVisibilityColor(build.visibility)}`}
                  >
                    {getVisibilityIcon(build.visibility)}
                    <span className="capitalize text-xs">{build.visibility.replace('-', ' ')}</span>
                  </Badge>
                  {isAdmin && (
                    <Badge variant="default">Admin</Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-gray-600">{build.description}</p>
          </div>

          {isAdmin && (
            <Button asChild>
              <Link to={`/builds/${build.slug}/settings`}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-gray-50 border rounded-lg">
        {/* Join */}
        {!isMember && !isOwner && (
          <Button onClick={handleJoinBuild} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Join Build
          </Button>
        )}

        {/* Favorite */}
        <FavoriteButton
          contentType="build"
          contentId={build.id}
          initialIsFavorited={isFavorited}
          userId={profile.id}
          size="sm"
          showCollectionsDialog={true}
          onFavoriteChange={(newIsFavorited) => handleFavoriteChange(newIsFavorited)}
        />

        {/* Write a Review - removed: ContainerReviews component handles review creation */}

        {/* Separator */}
        {canFork && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            {/* Fork */}
            <ForkButton
              contentType="build"
              contentId={build.id}
              contentTitle={build.name}
              forksCount={build.forks_count || 0}
              userId={profile.id}
              size="sm"
              variant="outline"
            />
          </>
        )}

        {/* Forks count indicator for build owners */}
        {isOwner && (build.forks_count || 0) > 0 && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border rounded-lg bg-white">
              <GitFork className="w-4 h-4" />
              <span>{build.forks_count} {build.forks_count === 1 ? 'fork' : 'forks'}</span>
            </div>
          </>
        )}
      </div>

      {/* Fork Lineage - show if this build is a fork */}
      {build.fork_of && parentBuild && (
        <ForkLineage
          contentType="build"
          forkOf={build.fork_of}
          forkOfTitle={parentBuild.name}
          forkOfSlug={parentBuild.slug}
          forkOfCreator={parentBuild.creator_name}
          forkOfCreatorId={parentBuild.created_by}
        />
      )}

      {/* Cover Image */}
      {build.cover_image && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={build.cover_image}
            alt={build.name}
            className="w-full h-64 object-cover"
          />
        </div>
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
                <p className="font-medium">{new Date(build.created_at).toLocaleDateString()}</p>
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
          {build.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Tags:</span>
                {build.tags.map((tag, idx) => (
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

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} in this build
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowAddDocument(true)}>
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
              {isAdmin && (
                <p className="text-sm mt-2">Add documents from the Documents page</p>
              )}
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

      {/* Add Document Dialog */}
      {build && (
        <AddDocumentDialog
          open={showAddDocument}
          onOpenChange={setShowAddDocument}
          buildId={build.id}
          onDocumentAdded={fetchBuildData}
        />
      )}

      {/* Reviews */}
      <ContainerReviews
        containerType="build"
        containerId={build.id}
        containerName={build.name}
        containerSlug={build.slug}
        isAdmin={isAdmin}
      />

      {/* Shareable URL */}
      {build && (
        <ShareInviteInline
          entityType="build"
          entityId={build.slug}
          entityName={build.name}
        />
      )}
    </div>
  );
}