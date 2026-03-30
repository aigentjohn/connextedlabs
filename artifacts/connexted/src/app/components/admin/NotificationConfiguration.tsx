// Split candidate: ~534 lines — consider extracting NotificationTypeToggle, NotificationChannelSettings, and NotificationPreviewCard into sub-components.
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Input } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import {
  Bell,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Mail,
  Heart,
  UserPlus,
  Star,
  CheckCircle,
  XCircle,
  Flag,
  Sparkles,
  Video,
  MessageCircle,
  Trophy,
  Zap,
  AtSign,
  Search,
  Settings,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface NotificationConfig {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  trigger_event: string;
  recipient_type: string;
  notification_type: string;
  title_template: string;
  message_template: string;
  link_template: string;
  icon_name: string;
  priority: string;
  send_email: boolean;
  send_push: boolean;
  created_at: string;
  updated_at: string;
}

const iconMap: Record<string, any> = {
  Bell,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Mail,
  Heart,
  UserPlus,
  Star,
  CheckCircle,
  XCircle,
  Flag,
  Sparkles,
  Video,
  MessageCircle,
  Trophy,
  Zap,
  AtSign,
};

const categoryColors: Record<string, string> = {
  social: 'bg-purple-100 text-purple-800',
  content: 'bg-blue-100 text-blue-800',
  events: 'bg-green-100 text-green-800',
  admin: 'bg-orange-100 text-orange-800',
  system: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export default function NotificationConfiguration() {
  const { profile } = useAuth();
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedConfig, setSelectedConfig] = useState<NotificationConfig | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'super') {
      fetchConfigurations();
    }
  }, [profile]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_configurations')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching notification configurations:', error);
      toast.error('Failed to load notification configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (config: NotificationConfig) => {
    try {
      const newValue = !config.is_enabled;
      
      const { error } = await supabase
        .from('notification_configurations')
        .update({ is_enabled: newValue })
        .eq('id', config.id);

      if (error) throw error;

      // Update local state
      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, is_enabled: newValue } : c
      ));

      toast.success(`${config.name} ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling notification:', error);
      toast.error('Failed to update notification configuration');
    }
  };

  const handleToggleEmail = async (config: NotificationConfig) => {
    try {
      const newValue = !config.send_email;
      
      const { error } = await supabase
        .from('notification_configurations')
        .update({ send_email: newValue })
        .eq('id', config.id);

      if (error) throw error;

      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, send_email: newValue } : c
      ));

      toast.success(`Email notifications ${newValue ? 'enabled' : 'disabled'} for ${config.name}`);
    } catch (error) {
      console.error('Error toggling email:', error);
      toast.error('Failed to update email setting');
    }
  };

  const handleTogglePush = async (config: NotificationConfig) => {
    try {
      const newValue = !config.send_push;
      
      const { error } = await supabase
        .from('notification_configurations')
        .update({ send_push: newValue })
        .eq('id', config.id);

      if (error) throw error;

      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, send_push: newValue } : c
      ));

      toast.success(`Push notifications ${newValue ? 'enabled' : 'disabled'} for ${config.name}`);
    } catch (error) {
      console.error('Error toggling push:', error);
      toast.error('Failed to update push setting');
    }
  };

  // Access control - platform admin only
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Access denied. Platform admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading notification configurations...</p>
      </div>
    );
  }

  // Filter configurations
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         config.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedConfigs = filteredConfigs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, NotificationConfig[]>);

  const categories = ['all', ...Array.from(new Set(configs.map(c => c.category)))];
  const enabledCount = configs.filter(c => c.is_enabled).length;
  const totalCount = configs.length;

  return (
    <div className="space-y-6">
      <Breadcrumbs 
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Notification Configuration' }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl">Notification Configuration</h1>
          </div>
          <p className="text-gray-600">
            Manage notification types and delivery settings
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Active Notifications</div>
            <div className="text-2xl font-bold text-indigo-600">
              {enabledCount} / {totalCount}
            </div>
          </div>
          <Button onClick={fetchConfigurations} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> These are notification type configurations. The actual triggering logic 
                has not been implemented yet. Enable the notification types you want to use, and you can 
                connect them to your application events later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications by Category */}
      {selectedCategory === 'all' ? (
        Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold capitalize">{category} Notifications</h2>
              <Badge className={categoryColors[category] || categoryColors.system}>
                {categoryConfigs.length}
              </Badge>
            </div>
            <div className="space-y-3 mb-8">
              {categoryConfigs.map((config) => (
                <NotificationConfigCard 
                  key={config.id} 
                  config={config}
                  onToggle={handleToggle}
                  onToggleEmail={handleToggleEmail}
                  onTogglePush={handleTogglePush}
                  onViewDetails={setSelectedConfig}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-3">
          {filteredConfigs.map((config) => (
            <NotificationConfigCard 
              key={config.id} 
              config={config}
              onToggle={handleToggle}
              onToggleEmail={handleToggleEmail}
              onTogglePush={handleTogglePush}
              onViewDetails={setSelectedConfig}
            />
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedConfig} onOpenChange={(open) => !open && setSelectedConfig(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConfig && iconMap[selectedConfig.icon_name] && 
                (() => {
                  const Icon = iconMap[selectedConfig.icon_name];
                  return <Icon className="w-5 h-5 text-indigo-600" />;
                })()
              }
              {selectedConfig?.name}
            </DialogTitle>
            <DialogDescription>{selectedConfig?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <Badge className={`${categoryColors[selectedConfig.category]} mt-1`}>
                    {selectedConfig.category}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Badge className={`${priorityColors[selectedConfig.priority]} mt-1`}>
                    {selectedConfig.priority}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-700">Trigger Event</label>
                <p className="text-sm text-gray-600 mt-1 font-mono bg-gray-50 p-2 rounded">
                  {selectedConfig.trigger_event}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Type</label>
                <p className="text-sm text-gray-600 mt-1 capitalize">
                  {selectedConfig.recipient_type}
                </p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-700">Title Template</label>
                <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                  {selectedConfig.title_template}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Message Template</label>
                <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                  {selectedConfig.message_template}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Link Template</label>
                <p className="text-sm text-gray-600 mt-1 font-mono bg-gray-50 p-2 rounded">
                  {selectedConfig.link_template || 'None'}
                </p>
              </div>

              <div className="text-xs text-gray-500 pt-2">
                <p><strong>Note:</strong> Templates use placeholders like {'{user_name}'}, {'{circle_name}'}, etc. 
                These will be replaced with actual values when the notification is triggered.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface NotificationConfigCardProps {
  config: NotificationConfig;
  onToggle: (config: NotificationConfig) => void;
  onToggleEmail: (config: NotificationConfig) => void;
  onTogglePush: (config: NotificationConfig) => void;
  onViewDetails: (config: NotificationConfig) => void;
}

function NotificationConfigCard({ 
  config, 
  onToggle, 
  onToggleEmail, 
  onTogglePush,
  onViewDetails 
}: NotificationConfigCardProps) {
  const Icon = iconMap[config.icon_name] || Bell;

  return (
    <Card className={`transition-all ${config.is_enabled ? 'border-indigo-200' : 'opacity-60'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            config.is_enabled ? 'bg-indigo-100' : 'bg-gray-100'
          }`}>
            <Icon className={`w-5 h-5 ${config.is_enabled ? 'text-indigo-600' : 'text-gray-600'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{config.name}</h3>
                  <Badge className={categoryColors[config.category]}>
                    {config.category}
                  </Badge>
                  <Badge className={priorityColors[config.priority]}>
                    {config.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{config.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="font-mono">{config.trigger_event}</span>
                  <span>→</span>
                  <span className="capitalize">{config.recipient_type}</span>
                </div>
              </div>

              {/* Main Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.is_enabled}
                  onCheckedChange={() => onToggle(config)}
                />
              </div>
            </div>

            {/* Additional Settings (shown when enabled) */}
            {config.is_enabled && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={config.send_email}
                    onCheckedChange={() => onToggleEmail(config)}
                  />
                  <span className="text-gray-600">Email</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={config.send_push}
                    onCheckedChange={() => onTogglePush(config)}
                  />
                  <span className="text-gray-600">Push</span>
                </div>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(config)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}