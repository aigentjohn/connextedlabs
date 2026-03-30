import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { 
  Store,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Package,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface Market {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  offering_count?: number;
}

const ICON_OPTIONS = [
  'Store', 'Microscope', 'Rocket', 'ShoppingBag', 'Package', 
  'Building2', 'Sparkles', 'Zap', 'TrendingUp', 'Target',
  'Award', 'Star', 'Briefcase', 'Box', 'Globe'
];

const COLOR_OPTIONS = [
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
];

export default function MarketsConfiguration() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [deleteMarket, setDeleteMarket] = useState<Market | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tagline: '',
    icon: 'Store',
    color: 'blue',
    is_active: true,
    is_public: true,
  });

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);

      // Fetch markets with offering counts
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .order('display_order');

      if (marketsError) throw marketsError;

      // Get offering counts for each market
      const marketsWithCounts = await Promise.all(
        (marketsData || []).map(async (market) => {
          const { count } = await supabase
            .from('market_placements')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', market.id)
            .eq('is_active', true);

          return {
            ...market,
            offering_count: count || 0,
          };
        })
      );

      setMarkets(marketsWithCounts);
    } catch (error: any) {
      console.error('Error fetching markets:', error);
      toast.error(`Failed to load markets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleCreate = () => {
    setEditingMarket(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      tagline: '',
      icon: 'Store',
      color: 'blue',
      is_active: true,
      is_public: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (market: Market) => {
    setEditingMarket(market);
    setFormData({
      name: market.name,
      slug: market.slug,
      description: market.description || '',
      tagline: market.tagline || '',
      icon: market.icon,
      color: market.color,
      is_active: market.is_active,
      is_public: market.is_public,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim() || !formData.slug.trim()) {
        toast.error('Name and slug are required');
        return;
      }

      if (editingMarket) {
        // Update existing market
        const { error } = await supabase
          .from('markets')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            tagline: formData.tagline,
            icon: formData.icon,
            color: formData.color,
            is_active: formData.is_active,
            is_public: formData.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMarket.id);

        if (error) throw error;
        toast.success('Market updated successfully');
      } else {
        // Create new market
        const maxOrder = Math.max(...markets.map(m => m.display_order), 0);
        
        const { error } = await supabase
          .from('markets')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            tagline: formData.tagline,
            icon: formData.icon,
            color: formData.color,
            is_active: formData.is_active,
            is_public: formData.is_public,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success('Market created successfully');
      }

      setShowDialog(false);
      fetchMarkets();
    } catch (error: any) {
      console.error('Error saving market:', error);
      toast.error(`Failed to save market: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteMarket) return;

    try {
      // Check if market has offerings
      if (deleteMarket.offering_count && deleteMarket.offering_count > 0) {
        toast.error(`Cannot delete market with ${deleteMarket.offering_count} offerings. Remove offerings first.`);
        setDeleteMarket(null);
        return;
      }

      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', deleteMarket.id);

      if (error) throw error;

      toast.success('Market deleted successfully');
      setDeleteMarket(null);
      fetchMarkets();
    } catch (error: any) {
      console.error('Error deleting market:', error);
      toast.error(`Failed to delete market: ${error.message}`);
    }
  };

  const handleToggleActive = async (market: Market) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ 
          is_active: !market.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', market.id);

      if (error) throw error;

      toast.success(`Market ${!market.is_active ? 'activated' : 'deactivated'}`);
      fetchMarkets();
    } catch (error: any) {
      console.error('Error toggling market status:', error);
      toast.error(`Failed to update market: ${error.message}`);
    }
  };

  const handleTogglePublic = async (market: Market) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ 
          is_public: !market.is_public,
          updated_at: new Date().toISOString(),
        })
        .eq('id', market.id);

      if (error) throw error;

      toast.success(`Market is now ${!market.is_public ? 'public' : 'members only'}`);
      fetchMarkets();
    } catch (error: any) {
      console.error('Error toggling market visibility:', error);
      toast.error(`Failed to update market: ${error.message}`);
    }
  };

  const handleReorder = async (marketId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = markets.findIndex(m => m.id === marketId);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= markets.length) return;

      const currentMarket = markets[currentIndex];
      const targetMarket = markets[targetIndex];

      // Swap display orders
      await supabase
        .from('markets')
        .update({ display_order: targetMarket.display_order })
        .eq('id', currentMarket.id);

      await supabase
        .from('markets')
        .update({ display_order: currentMarket.display_order })
        .eq('id', targetMarket.id);

      toast.success('Market order updated');
      fetchMarkets();
    } catch (error: any) {
      console.error('Error reordering markets:', error);
      toast.error(`Failed to reorder: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Markets Configuration' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Markets Configuration</h1>
          <p className="text-gray-600">
            Define market categories that members can place their offerings in
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMarkets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Market
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{markets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {markets.filter(m => m.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Public Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {markets.filter(m => m.is_public).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Placements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {markets.reduce((sum, m) => sum + (m.offering_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Markets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Market Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tagline</TableHead>
                  <TableHead className="text-center">Offerings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No markets configured. Create your first market to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  markets.map((market, index) => (
                    <TableRow key={market.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReorder(market.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReorder(market.id, 'down')}
                            disabled={index === markets.length - 1}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${market.color}-100 flex items-center justify-center`}>
                            <Store className={`w-4 h-4 text-${market.color}-600`} />
                          </div>
                          <div>
                            <div className="font-medium">{market.name}</div>
                            <div className="text-xs text-gray-500">
                              Icon: {market.icon} • Color: {market.color}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {market.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {market.tagline || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          <Package className="w-3 h-3 mr-1" />
                          {market.offering_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {market.is_active ? (
                            <Badge variant="outline" className="bg-green-50 w-fit">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 w-fit">
                              Inactive
                            </Badge>
                          )}
                          {market.is_public ? (
                            <Badge variant="outline" className="bg-blue-50 w-fit">
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-50 w-fit">
                              Members Only
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(market)}
                            title={market.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {market.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(market)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteMarket(market)}
                            disabled={(market.offering_count || 0) > 0}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">About Markets</p>
              <p>Markets are categories where members can place their offerings. Examples: "Discovery Lab" for MVPs, "Launch Pad" for early-stage products, or custom categories like "Enterprise Solutions", "Consumer Apps", etc.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMarket ? 'Edit Market' : 'Create New Market'}
            </DialogTitle>
            <DialogDescription>
              Configure the market category details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Market Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Discovery Lab"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., discovery"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Short description for cards"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of this market"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Theme</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <div className="text-xs text-gray-500">
                    Active markets are visible to admins and can accept placements
                  </div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public</Label>
                  <div className="text-xs text-gray-500">
                    Public markets are visible to all users, private only to members
                  </div>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingMarket ? 'Save Changes' : 'Create Market'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMarket} onOpenChange={() => setDeleteMarket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Market?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteMarket?.name}"? This action cannot be undone.
              {deleteMarket?.offering_count && deleteMarket.offering_count > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-900">
                  <strong>Cannot delete:</strong> This market has {deleteMarket.offering_count} offerings.
                  Remove all offerings before deleting the market.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteMarket?.offering_count ? deleteMarket.offering_count > 0 : false}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}