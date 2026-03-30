import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import {
  Star,
  Mail,
  MapPin,
  Globe,
  Link2,
  ExternalLink,
} from 'lucide-react';

export default function SponsorsPage() {
  const { profile } = useAuth();
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: sponsorsData, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('tier', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setSponsors(sponsorsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      setLoading(false);
    }
  };

  if (!profile) return null;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading sponsors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Sponsors' }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Our Sponsors</h1>
        <p className="text-gray-600">
          Organizations and partners supporting our community
        </p>
      </div>

      {/* Sponsors Grid */}
      {sponsors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No sponsors yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sponsors.map((sponsor) => {
            // Build location string
            const location = [sponsor.location_city, sponsor.location_state]
              .filter(Boolean)
              .join(', ');

            // Determine tier badge color
            const getTierColor = (tier: string) => {
              switch (tier) {
                case 'platinum': return 'bg-slate-700';
                case 'gold': return 'bg-yellow-600';
                case 'silver': return 'bg-gray-400';
                case 'bronze': return 'bg-amber-700';
                default: return 'bg-blue-600';
              }
            };

            return (
              <Card key={sponsor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Avatar/Logo */}
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={sponsor.logo_url} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                        {sponsor.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{sponsor.name}</CardTitle>
                        {sponsor.tier && (
                          <Badge className={getTierColor(sponsor.tier)}>
                            <Star className="w-3 h-3 mr-1" />
                            {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)}
                          </Badge>
                        )}
                      </div>
                      {sponsor.tagline && (
                        <p className="text-sm text-gray-600 mb-2">{sponsor.tagline}</p>
                      )}
                      {sponsor.description && (
                        <p className="text-sm text-gray-700 line-clamp-2">{sponsor.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    {/* Email */}
                    {sponsor.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`mailto:${sponsor.contact_email}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {sponsor.contact_email}
                        </a>
                      </div>
                    )}

                    {/* Location */}
                    {location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{location}</span>
                      </div>
                    )}
                  </div>

                  {/* Website Link */}
                  {sponsor.website_url && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* View Profile Button */}
                  <div className="pt-2">
                    <Link to={`/sponsors/${sponsor.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}