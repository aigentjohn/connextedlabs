import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Crown, Shield, Settings, Users, Plus, UserCheck } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Circle {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  host_ids: string[];
  moderator_ids: string[];
}

export default function MyCirclesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchCircles = async () => {
      try {
        setLoading(true);
        
        // Fetch all circles where user is host, moderator, or member
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .or(`host_ids.cs.{${profile.id}},moderator_ids.cs.{${profile.id}},member_ids.cs.{${profile.id}}`);

        if (error) throw error;
        setCircles(data || []);
      } catch (error) {
        console.error('Error fetching circles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, [profile]);

  if (!profile) return null;

  const getCircleRole = (circle: Circle): 'host' | 'moderator' | 'member' => {
    if (circle.host_ids?.includes(profile.id)) return 'host';
    if (circle.moderator_ids?.includes(profile.id)) return 'moderator';
    return 'member';
  };

  const hostedCircles = circles.filter(c => c.host_ids?.includes(profile.id));
  const moderatedCircles = circles.filter(c =>
    c.moderator_ids?.includes(profile.id) && !c.host_ids?.includes(profile.id)
  );
  const memberOnlyCircles = circles.filter(c =>
    !c.host_ids?.includes(profile.id) && !c.moderator_ids?.includes(profile.id)
  );


  const roleBadge = (role: 'host' | 'moderator' | 'member') => {
    if (role === 'host') return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Crown className="w-3 h-3 mr-1" />Host
      </Badge>
    );
    if (role === 'moderator') return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Shield className="w-3 h-3 mr-1" />Moderator
      </Badge>
    );
    return (
      <Badge variant="secondary">
        <UserCheck className="w-3 h-3 mr-1" />Member
      </Badge>
    );
  };

  const renderCircleCard = (circle: Circle) => {
    const role = getCircleRole(circle);
    const canManage = role === 'host' || role === 'moderator';

    return (
      <Card key={circle.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <Link to={`/circles/${circle.id}`}>
                  <h3 className="font-semibold text-lg hover:text-indigo-600 transition-colors">
                    {circle.name}
                  </h3>
                </Link>
                {roleBadge(role)}
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {circle.description}
              </p>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {circle.member_ids.length} members
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link to={`/circles/${circle.id}`}>
                  <Button size="sm" variant="outline">View Circle</Button>
                </Link>
                {canManage && (
                  <Link to={`/circles/${circle.id}/settings`}>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'My Circles' }]} />
        <div className="text-center py-12">
          <p className="text-gray-500">Loading your circles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Circles' }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">My Circles</h1>
          <p className="text-gray-600">
            All circles you belong to
          </p>
        </div>
        {profile.role === 'super' && (
          <Button onClick={() => navigate('/circle-admin')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Circle
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">{hostedCircles.length}</div>
            <div className="text-sm text-gray-600">Hosting</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{moderatedCircles.length}</div>
            <div className="text-sm text-gray-600">Moderating</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{memberOnlyCircles.length}</div>
            <div className="text-sm text-gray-600">Member</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{circles.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">{circles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="hosted">
            <Crown className="w-4 h-4 mr-1" />
            Hosting
            <Badge variant="secondary" className="ml-2">{hostedCircles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="moderated">
            <Shield className="w-4 h-4 mr-1" />
            Moderating
            <Badge variant="secondary" className="ml-2">{moderatedCircles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="member">
            <UserCheck className="w-4 h-4 mr-1" />
            Member
            <Badge variant="secondary" className="ml-2">{memberOnlyCircles.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {circles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-4">You haven't joined any circles yet</p>
                {profile.role === 'super' && (
                  <Button onClick={() => navigate('/circle-admin')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create a Circle
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circles.map(renderCircleCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hosted" className="space-y-4 mt-6">
          {hostedCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                You don't host any circles yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hostedCircles.map(renderCircleCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="moderated" className="space-y-4 mt-6">
          {moderatedCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                You don't moderate any circles yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moderatedCircles.map(renderCircleCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="member" className="space-y-4 mt-6">
          {memberOnlyCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                You aren't a member-only participant in any circles
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberOnlyCircles.map(renderCircleCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}