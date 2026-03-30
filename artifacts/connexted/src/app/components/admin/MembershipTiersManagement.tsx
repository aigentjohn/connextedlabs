import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Info, ArrowRight, Settings } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function MembershipTiersManagement() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Membership Tiers' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Membership Tier Management</h1>
        <p className="text-gray-600">
          Configure user classes and access permissions
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>This page has been consolidated into the User Class Management system.</strong>
          <br />
          User classes now handle all membership tiers and access limits in one place.
        </AlertDescription>
      </Alert>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* User Class Management */}
        <Card className="border-2 border-blue-200 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>User Class Management</CardTitle>
            <CardDescription>
              Manage the 10-tier user class system with access limits for circles, containers, and admin permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-gray-600">
              <li>• Configure 10 user classes (Class 1-10)</li>
              <li>• Set admin circle & container limits</li>
              <li>• Set member container limits</li>
              <li>• View user distribution by class</li>
            </ul>
            <Button 
              className="w-full"
              onClick={() => navigate('/platform-admin/user-classes')}
            >
              Manage User Classes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Membership Tier Permissions */}
        <Card className="border-2 border-purple-200 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle>Market Tier Permissions</CardTitle>
            <CardDescription>
              Configure Market feature permissions and dynamic market access per tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-gray-600">
              <li>• Free, Member, Premium tiers</li>
              <li>• Company & offering limits</li>
              <li>• Dynamic market access (per market)</li>
              <li>• Feature flags & analytics access</li>
            </ul>
            <Button 
              className="w-full"
              variant="outline"
              onClick={() => navigate('/platform-admin/membership-tier-permissions')}
            >
              Manage Market Permissions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">System Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>User Classes (1-10):</strong> Control access to platform features including circles, containers, 
              and administrative capabilities. This is the primary membership system.
            </p>
            <p>
              <strong>Market Tier Permissions (Free/Member/Premium):</strong> Control access to Market-specific features 
              like creating companies, listings, and accessing marketplace tools.
            </p>
            <p className="text-xs text-gray-500 pt-2 border-t">
              Note: Users have both a user_class (1-10) AND a membership_tier (free/member/premium) which control 
              different aspects of their platform experience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}