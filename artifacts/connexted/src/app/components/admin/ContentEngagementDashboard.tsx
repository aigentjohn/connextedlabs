import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Tags, Hash, Sparkles, Users, Target, BarChart3 } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import TopicsManagement from './TopicsManagement';
import TagSuggestionsManagement from './TagSuggestionsManagement';
import ContentTaggingInterface from './ContentTaggingInterface';

export default function ContentEngagementDashboard() {
  const [activeTab, setActiveTab] = useState('topics');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Content & Engagement' },
        ]}
      />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Content & Engagement</h1>
        <p className="text-gray-600">
          Manage topics (WHO/WHY) and tags (WHAT/HOW) to help users discover content
        </p>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Topics</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            <span>Tags</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Tag Content</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Topics Management */}
        <TabsContent value="topics" className="space-y-6">
          <TopicsManagement />
        </TabsContent>

        {/* Tag Suggestions Management */}
        <TabsContent value="tags" className="space-y-6">
          <TagSuggestionsManagement />
        </TabsContent>

        {/* Content Tagging Interface */}
        <TabsContent value="content" className="space-y-6">
          <ContentTaggingInterface />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Topics & Tags Analytics
              </CardTitle>
              <CardDescription>
                Usage statistics and insights for topics and tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}