import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { projectId } from '@/utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles, TrendingUp, Users, Circle as CircleIcon, ArrowRight, Star, Target } from 'lucide-react';
import { toast } from 'sonner';

interface CircleMatch {
  circle_id: string;
  circle_name: string;
  circle_description: string;
  circle_slug: string;
  match_score: number;
  matched_topics: string[];
  matched_audience: string[];
  explanation: string;
  topic_score: number;
  audience_score: number;
}

interface RecommendedCirclesWidgetProps {
  userId: string;
  maxResults?: number;
  showViewAll?: boolean;
}

export default function RecommendedCirclesWidget({ 
  userId, 
  maxResults = 5,
  showViewAll = true 
}: RecommendedCirclesWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<CircleMatch[]>([]);
  const [hasInterests, setHasInterests] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [userId]);

  const loadMatches = async () => {
    try {
      setLoading(true);

      // First check if user has interests/roles configured
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) {
        setHasInterests(false);
        return;
      }

      const interests = (profile?.interests_data as any[]) || [];
      const roles = (profile?.roles_data as any[]) || [];

      if (interests.length === 0 && roles.length === 0) {
        setHasInterests(false);
        return;
      }

      if (profile.enable_recommendations === false) {
        setHasInterests(false);
        return;
      }

      // Calculate matches
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/matching/calculate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        }
      );

      const data = await res.json();

      if (data.success) {
        setMatches(data.matches.slice(0, maxResults));
      } else {
        console.error('Error calculating matches:', data.error);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Recommended Circles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Finding your matches...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasInterests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Recommended Circles
          </CardTitle>
          <CardDescription>
            Get personalized circle recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="bg-indigo-50 rounded-full p-4">
                <Sparkles className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Add Your Interests to Get Started</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tell us what you're interested in and we'll recommend circles that match your profile
              </p>
              <Button asChild>
                <Link to="/my-engagement">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Interests & Roles
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Recommended Circles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="bg-gray-50 rounded-full p-4">
                <CircleIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">No Matches Yet</h3>
              <p className="text-sm text-gray-600">
                We couldn't find circles matching your interests at the moment. Check back soon!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Recommended Circles
            </CardTitle>
            <CardDescription>
              Based on your interests and roles
            </CardDescription>
          </div>
          {showViewAll && matches.length >= maxResults && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/discovery">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map((match) => (
            <Link
              key={match.circle_id}
              to={`/circles/${match.circle_id}`}
              className="block group"
            >
              <div className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
                {/* Circle Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg group-hover:text-indigo-600 transition-colors">
                      {match.circle_name}
                    </h3>
                    {match.circle_description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {match.circle_description}
                      </p>
                    )}
                  </div>
                  
                  {/* Match Score Badge */}
                  <div className="ml-4 flex-shrink-0">
                    <div className={`
                      px-3 py-1 rounded-full text-sm font-semibold
                      ${match.match_score >= 80 ? 'bg-green-100 text-green-700' :
                        match.match_score >= 60 ? 'bg-blue-100 text-blue-700' :
                        match.match_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {match.match_score}% Match
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="space-y-2">
                  {/* Matched Topics */}
                  {match.matched_topics.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Shared Interests</p>
                        <div className="flex flex-wrap gap-1">
                          {match.matched_topics.slice(0, 4).map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {match.matched_topics.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{match.matched_topics.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Matched Audience */}
                  {match.matched_audience.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Target Audience Match</p>
                        <div className="flex flex-wrap gap-1">
                          {match.matched_audience.slice(0, 3).map((aud) => (
                            <Badge key={aud} variant="outline" className="text-xs">
                              {aud}
                            </Badge>
                          ))}
                          {match.matched_audience.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{match.matched_audience.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {match.explanation && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t">
                      <TrendingUp className="w-3 h-3" />
                      {match.explanation}
                    </div>
                  )}
                </div>

                {/* Hover Arrow */}
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-sm text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                    View Circle
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer CTA */}
        {matches.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <Button variant="outline" asChild className="w-full">
              <Link to="/my-engagement">
                <Sparkles className="w-4 h-4 mr-2" />
                Update My Interests
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}