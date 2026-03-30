import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createVenue, updateVenue, Venue, VenueFormData } from '@/lib/venueHelpers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { X, Globe, Lock } from 'lucide-react';

interface VenueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVenue?: Venue | null;
}

export default function VenueFormDialog({
  open,
  onOpenChange,
  editingVenue
}: VenueFormDialogProps) {
  const { profile } = useAuth();
  const isEditing = !!editingVenue;

  // Form state
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    type: 'physical',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    virtual_link: '',
    capacity: undefined,
    amenities: [],
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    booking_instructions: '',
    booking_lead_time: '',
    is_public: false
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Load editing venue data
  useEffect(() => {
    if (editingVenue) {
      setFormData({
        name: editingVenue.name,
        type: editingVenue.type,
        address: editingVenue.address || '',
        city: editingVenue.city || '',
        state: editingVenue.state || '',
        zip_code: editingVenue.zip_code || '',
        country: editingVenue.country || '',
        virtual_link: editingVenue.virtual_link || '',
        capacity: editingVenue.capacity,
        amenities: editingVenue.amenities || [],
        contact_name: editingVenue.contact_name || '',
        contact_email: editingVenue.contact_email || '',
        contact_phone: editingVenue.contact_phone || '',
        booking_instructions: editingVenue.booking_instructions || '',
        booking_lead_time: editingVenue.booking_lead_time || '',
        is_public: editingVenue.is_public
      });
    }
  }, [editingVenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);

    if (isEditing && editingVenue) {
      await updateVenue(editingVenue.id, formData);
    } else {
      await createVenue(formData, profile.id);
    }

    setSaving(false);
    onOpenChange(false);
  };

  const addAmenity = () => {
    if (amenityInput.trim() && !formData.amenities?.includes(amenityInput.trim())) {
      setFormData({
        ...formData,
        amenities: [...(formData.amenities || []), amenityInput.trim()]
      });
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities?.filter(a => a !== amenity) || []
    });
  };

  const isPhysical = formData.type === 'physical';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Venue' : 'Add New Venue'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update venue details and contact information'
              : 'Save a venue for quick selection when creating events'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
            
            {/* Venue Name */}
            <div>
              <Label htmlFor="name">Venue Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downtown Office, My Zoom Room"
                required
              />
            </div>

            {/* Venue Type */}
            <div>
              <Label>Venue Type *</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: 'physical' | 'virtual') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="physical" id="physical" />
                    <Label htmlFor="physical" className="font-normal cursor-pointer">
                      📍 Physical Location
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="virtual" id="virtual" />
                    <Label htmlFor="virtual" className="font-normal cursor-pointer">
                      🖥️ Virtual/Online
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Location Details</h3>
            
            {isPhysical ? (
              <>
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, Suite 400"
                    required={isPhysical}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="CA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zip_code">Zip/Postal Code</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      placeholder="94102"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="USA"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="virtual_link">Virtual Meeting Link *</Label>
                <Input
                  id="virtual_link"
                  type="url"
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                  placeholder="https://zoom.us/j/123456789"
                  required={!isPhysical}
                />
              </div>
            )}
          </div>

          {/* Capacity & Amenities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Capacity & Amenities</h3>
            
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  capacity: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="50"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="amenities">Amenities</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="amenities"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAmenity();
                    }
                  }}
                  placeholder="e.g., WiFi, Projector, Catering"
                />
                <Button type="button" onClick={addAmenity} variant="outline">
                  Add
                </Button>
              </div>
              {formData.amenities && formData.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="gap-1">
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Contact Information
              <span className="text-xs font-normal text-gray-500 ml-2">
                (Only visible to event creators)
              </span>
            </h3>

            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="facilities@company.com"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Booking Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Booking Information</h3>

            <div>
              <Label htmlFor="booking_lead_time">Lead Time Required</Label>
              <Input
                id="booking_lead_time"
                value={formData.booking_lead_time}
                onChange={(e) => setFormData({ ...formData, booking_lead_time: e.target.value })}
                placeholder="e.g., 3 days, 1 week"
              />
            </div>

            <div>
              <Label htmlFor="booking_instructions">Booking Instructions</Label>
              <Textarea
                id="booking_instructions"
                value={formData.booking_instructions}
                onChange={(e) => setFormData({ ...formData, booking_instructions: e.target.value })}
                placeholder="Any special instructions for booking this venue..."
                rows={3}
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Visibility</h3>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public" className="font-normal cursor-pointer">
                {formData.is_public ? 'Public' : 'Private'}
                <span className="text-xs font-normal text-gray-500 ml-2">
                  {formData.is_public ? 'Visible to all users' : 'Visible only to you'}
                </span>
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Venue' : 'Create Venue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}