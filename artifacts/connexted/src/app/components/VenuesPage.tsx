import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  fetchMyVenues,
  fetchPublicVenues, 
  deleteVenue, 
  getVenueUsageCount,
  formatVenueAddress,
  Venue 
} from '@/lib/venueHelpers';
import { MapPin, Video, Plus, Edit, Trash2, Users, Phone, Mail, Info, Calendar, Globe, Lock, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import VenueFormDialog from '@/app/components/venues/VenueFormDialog';
import VenueEventsDialog from '@/app/components/venues/VenueEventsDialog';

export default function VenuesPage() {
  const { profile } = useAuth();
  const [myVenues, setMyVenues] = useState<Venue[]>([]);
  const [publicVenues, setPublicVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [venueUsage, setVenueUsage] = useState<Record<string, number>>({});
  const [viewingVenue, setViewingVenue] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'physical' | 'virtual'>('all');

  useEffect(() => {
    if (profile) {
      loadVenues();
    }
  }, [profile]);

  const loadVenues = async () => {
    if (!profile) return;
    
    setLoading(true);
    const myData = await fetchMyVenues(profile.id);
    setMyVenues(myData);
    
    // Load usage counts for my venues
    const usageCounts: Record<string, number> = {};
    for (const venue of myData) {
      const count = await getVenueUsageCount(venue.id);
      usageCounts[venue.id] = count;
    }
    setVenueUsage(usageCounts);
    
    // Load public venues (excluding user's own)
    const publicData = await fetchPublicVenues(profile.id);
    setPublicVenues(publicData);
    
    setLoading(false);
  };

  const handleDelete = async (venueId: string) => {
    const usage = venueUsage[venueId] || 0;
    
    if (usage > 0) {
      if (!confirm(`This venue is used by ${usage} event(s). Are you sure you want to delete it? Events will keep their location text.`)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this venue?')) {
        return;
      }
    }
    
    const success = await deleteVenue(venueId);
    if (success) {
      loadVenues();
    }
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setShowCreateDialog(true);
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setEditingVenue(null);
    loadVenues();
  };

  const handleViewEvents = (venue: any) => {
    setViewingVenue(venue);
  };

  const handleEventsDialogClose = () => {
    setViewingVenue(null);
  };

  // Filter public venues based on search and type
  const filteredPublicVenues = useMemo(() => {
    let filtered = publicVenues;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(v => v.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(query) ||
        v.city?.toLowerCase().includes(query) ||
        v.state?.toLowerCase().includes(query) ||
        v.address?.toLowerCase().includes(query) ||
        v.creator?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [publicVenues, filterType, searchQuery]);

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please log in to manage your venues.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Venues</h1>
            <p className="text-gray-600 mt-2">Manage and discover venues for events</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading venues...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venues</h1>
          <p className="text-gray-600 mt-2">Manage your venues and discover public locations</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {/* Info Card */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Save your frequently used venues or browse public venues shared by the community.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="my-venues" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="my-venues">
            My Venues ({myVenues.length})
          </TabsTrigger>
          <TabsTrigger value="public-venues">
            <Globe className="w-4 h-4 mr-2" />
            Public Venues ({publicVenues.length})
          </TabsTrigger>
        </TabsList>

        {/* My Venues Tab */}
        <TabsContent value="my-venues">
          {myVenues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No venues yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first venue to streamline event creation
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myVenues.map(venue => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  usageCount={venueUsage[venue.id] || 0}
                  onEdit={() => handleEdit(venue)}
                  onDelete={() => handleDelete(venue.id)}
                  onViewEvents={() => handleViewEvents(venue)}
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Public Venues Tab */}
        <TabsContent value="public-venues">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, location, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="physical">Physical Only</SelectItem>
                <SelectItem value="virtual">Virtual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Public Venues List */}
          {filteredPublicVenues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">
                  {publicVenues.length === 0 ? 'No public venues yet' : 'No matching venues'}
                </h3>
                <p className="text-gray-600">
                  {publicVenues.length === 0 
                    ? 'Be the first to create a public venue for the community!'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPublicVenues.map(venue => (
                <PublicVenueCard
                  key={venue.id}
                  venue={venue}
                  onViewEvents={() => handleViewEvents(venue)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <VenueFormDialog
          open={showCreateDialog}
          onOpenChange={handleDialogClose}
          editingVenue={editingVenue}
        />
      )}

      {/* View Events Dialog */}
      {viewingVenue && (
        <VenueEventsDialog
          open={viewingVenue !== null}
          onOpenChange={handleEventsDialogClose}
          venue={viewingVenue}
        />
      )}
    </div>
  );
}

// My Venue Card Component
function VenueCard({
  venue,
  usageCount,
  onEdit,
  onDelete,
  onViewEvents,
  isOwner
}: {
  venue: Venue;
  usageCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onViewEvents: () => void;
  isOwner: boolean;
}) {
  const isPhysical = venue.type === 'physical';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isPhysical ? (
                <MapPin className="w-5 h-5 text-blue-600" />
              ) : (
                <Video className="w-5 h-5 text-purple-600" />
              )}
              <CardTitle className="text-xl">{venue.name}</CardTitle>
            </div>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {isPhysical ? 'Physical' : 'Virtual'}
              </Badge>
              {venue.is_public ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              )}
              {usageCount > 0 && (
                <Badge variant="secondary">
                  {usageCount} event{usageCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">Location</p>
          {isPhysical ? (
            <div className="text-sm text-gray-700">
              {venue.address && <p>{venue.address}</p>}
              {(venue.city || venue.state || venue.zip_code) && (
                <p>
                  {[venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ')}
                </p>
              )}
              {venue.country && <p>{venue.country}</p>}
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <a 
                href={venue.virtual_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {venue.virtual_link}
              </a>
            </div>
          )}
        </div>

        {/* Capacity & Amenities */}
        {(venue.capacity || (venue.amenities && venue.amenities.length > 0)) && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Details</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.capacity && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Capacity: {venue.capacity}</span>
                </div>
              )}
              {venue.amenities && venue.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {venue.amenities.map((amenity, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {(venue.contact_name || venue.contact_email || venue.contact_phone) && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-900 mb-2">Venue Contact</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.contact_name && (
                <p className="font-medium">{venue.contact_name}</p>
              )}
              {venue.contact_email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <a 
                    href={`mailto:${venue.contact_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {venue.contact_email}
                  </a>
                </div>
              )}
              {venue.contact_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <a 
                    href={`tel:${venue.contact_phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {venue.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Instructions */}
        {(venue.booking_instructions || venue.booking_lead_time) && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-900 mb-1">Booking Notes</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.booking_lead_time && (
                <p className="text-orange-700">
                  <strong>Lead time:</strong> {venue.booking_lead_time}
                </p>
              )}
              {venue.booking_instructions && (
                <p className="text-gray-600">{venue.booking_instructions}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {isOwner && (
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewEvents}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Calendar className="w-4 h-4 mr-1" />
              View Events
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Public Venue Card Component
function PublicVenueCard({
  venue,
  onViewEvents
}: {
  venue: any;
  onViewEvents: () => void;
}) {
  const isPhysical = venue.type === 'physical';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isPhysical ? (
                <MapPin className="w-5 h-5 text-blue-600" />
              ) : (
                <Video className="w-5 h-5 text-purple-600" />
              )}
              <CardTitle className="text-xl">{venue.name}</CardTitle>
            </div>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {isPhysical ? 'Physical' : 'Virtual'}
              </Badge>
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                <Globe className="w-3 h-3 mr-1" />
                Public
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Creator Info */}
        {venue.creator && (
          <div className="flex items-center gap-2 pb-3 border-b">
            <Avatar className="w-8 h-8">
              <AvatarImage src={venue.creator.avatar} alt={venue.creator.name} />
              <AvatarFallback>
                {venue.creator.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{venue.creator.name}</p>
              <p className="text-xs text-gray-500">Venue Creator</p>
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">Location</p>
          {isPhysical ? (
            <div className="text-sm text-gray-700">
              {venue.address && <p>{venue.address}</p>}
              {(venue.city || venue.state || venue.zip_code) && (
                <p>
                  {[venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ')}
                </p>
              )}
              {venue.country && <p>{venue.country}</p>}
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <a 
                href={venue.virtual_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {venue.virtual_link}
              </a>
            </div>
          )}
        </div>

        {/* Capacity & Amenities */}
        {(venue.capacity || (venue.amenities && venue.amenities.length > 0)) && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Details</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.capacity && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Capacity: {venue.capacity}</span>
                </div>
              )}
              {venue.amenities && venue.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {venue.amenities.map((amenity: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {(venue.contact_name || venue.contact_email || venue.contact_phone) && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-900 mb-2">Contact</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.contact_name && (
                <p className="font-medium">{venue.contact_name}</p>
              )}
              {venue.contact_email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <a 
                    href={`mailto:${venue.contact_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {venue.contact_email}
                  </a>
                </div>
              )}
              {venue.contact_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <a 
                    href={`tel:${venue.contact_phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {venue.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Instructions */}
        {(venue.booking_instructions || venue.booking_lead_time) && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-900 mb-1">Booking Notes</p>
            <div className="text-sm text-gray-700 space-y-1">
              {venue.booking_lead_time && (
                <p className="text-orange-700">
                  <strong>Lead time:</strong> {venue.booking_lead_time}
                </p>
              )}
              {venue.booking_instructions && (
                <p className="text-gray-600">{venue.booking_instructions}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewEvents}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Calendar className="w-4 h-4 mr-1" />
            View Events at This Venue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}