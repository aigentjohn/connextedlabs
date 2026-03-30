import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { FileText, Plus, ExternalLink, Download, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ProgramDocumentsProps {
  programId: string;
  isAdmin: boolean;
  selectedJourneyId?: string | null;
}

interface Document {
  id: string;
  program_id: string;
  program_journey_id: string | null;
  title: string;
  description: string;
  url: string;
  category: string;
  author_id: string;
  tags: string[];
  access_level: string;
  view_count: number;
  created_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  circle?: {
    id: string;
    name: string;
  };
}

export default function ProgramDocuments({ programId, isAdmin, selectedJourneyId }: ProgramDocumentsProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('documents')
        .select(`
          id,
          program_id,
          program_journey_id,
          title,
          description,
          url,
          category,
          author_id,
          tags,
          access_level,
          view_count,
          created_at,
          author:users!documents_author_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('program_id', programId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply journey filter if selected
      if (selectedJourneyId) {
        query = query.eq('program_journey_id', selectedJourneyId);
      }

      // Apply category filter
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch circle names for journeys
      const documentsWithCircles = await Promise.all(
        (data || []).map(async (doc) => {
          if (doc.program_journey_id) {
            const { data: journey } = await supabase
              .from('program_journeys')
              .select('circle_id')
              .eq('id', doc.program_journey_id)
              .single();
            
            if (journey?.circle_id) {
              const { data: circle } = await supabase
                .from('circles')
                .select('id, name')
                .eq('id', journey.circle_id)
                .single();
              return { ...doc, circle };
            }
          }
          return doc;
        })
      );

      setDocuments(documentsWithCircles as Document[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [programId, selectedJourneyId, categoryFilter]);

  // Get unique categories from documents
  const categories = Array.from(new Set(documents.map(d => d.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey Filter Badge (if active) */}
      {selectedJourneyId && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filtered to selected journey</span>
        </div>
      )}

      {/* Header with Filters and Create Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          {categories.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant={!categoryFilter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={categoryFilter === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>
        {isAdmin && (
          <Link to={`/programs/${programId}/documents/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </Link>
        )}
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">No documents yet</p>
            {isAdmin && (
              <Link to={`/programs/${programId}/documents/new`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add the first document
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.category && (
                        <Badge variant="secondary" className="text-xs">
                          {doc.category}
                        </Badge>
                      )}
                      {doc.circle && (
                        <Badge variant="outline" className="text-xs">
                          {doc.circle.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {doc.description}
                </p>
                
                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {doc.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{doc.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Author and Stats */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={doc.author?.avatar || undefined} />
                    <AvatarFallback>{doc.author?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span>{doc.author?.name || 'Unknown'}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{doc.view_count || 0}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                  </a>
                  <Link to={`/documents/${doc.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}