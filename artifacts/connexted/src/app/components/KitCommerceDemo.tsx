import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import KitCommerceButton from '@/app/components/KitCommerceButton';
import { Sparkles, Users, Trophy, Gift } from 'lucide-react';

/**
 * Demo page showing different ways to embed Kit Commerce products
 * This demonstrates the KitCommerceButton component in various contexts
 */
export default function KitCommerceDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CONNEXTED LABS Membership
          </h1>
          <p className="text-xl text-gray-600">
            Join our vibrant community of innovators and entrepreneurs
          </p>
        </div>

        {/* Main Product Card */}
        <Card className="mb-12 border-2 border-blue-200 shadow-xl">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4 mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Premium Membership</CardTitle>
            <CardDescription className="text-lg">
              Get full access to all programs, circles, and exclusive content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Access All Circles</h4>
                  <p className="text-sm text-gray-600">Join unlimited communities and programs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-purple-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Premium Content</h4>
                  <p className="text-sm text-gray-600">Exclusive resources and insights</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-green-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Member Perks</h4>
                  <p className="text-sm text-gray-600">Special discounts and early access</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Networking Events</h4>
                  <p className="text-sm text-gray-600">Connect with fellow innovators</p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-6">
              <div className="text-sm text-gray-600 mb-2">Starting at</div>
              <div className="text-5xl font-bold text-gray-900 mb-2">$99</div>
              <div className="text-gray-600">per month</div>
            </div>

            {/* CTA - Large centered button */}
            <div className="text-center">
              <KitCommerceButton
                productUrl="https://aigent-john.kit.com/products/connexted-membership"
                buttonText="Join CONNEXTED LABS"
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-12 py-6"
              />
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Secure checkout powered by Kit • 30-day money-back guarantee
            </p>
          </CardContent>
        </Card>

        {/* Multiple Product Options */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Basic */}
            <Card>
              <CardHeader>
                <CardTitle>Basic</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$49<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• Access to 3 circles</li>
                  <li>• Basic support</li>
                  <li>• Community access</li>
                </ul>
                <KitCommerceButton
                  productUrl="https://aigent-john.kit.com/products/connexted-membership"
                  buttonText="Get Basic"
                  variant="outline"
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Pro - Popular */}
            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For serious community builders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$99<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• Unlimited circles</li>
                  <li>• Priority support</li>
                  <li>• Premium content</li>
                  <li>• Analytics dashboard</li>
                </ul>
                <KitCommerceButton
                  productUrl="https://aigent-john.kit.com/products/connexted-membership"
                  buttonText="Get Pro"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                />
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$299<span className="text-lg text-gray-600">/mo</span></div>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>• Everything in Pro</li>
                  <li>• Custom integrations</li>
                  <li>• Dedicated support</li>
                  <li>• SLA guarantee</li>
                </ul>
                <KitCommerceButton
                  productUrl="https://aigent-john.kit.com/products/connexted-membership"
                  buttonText="Get Enterprise"
                  variant="outline"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Inline Usage Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center mb-8">More Usage Examples</h2>

          {/* In a banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold mb-2">Limited Time Offer!</h3>
            <p className="mb-6">Get 20% off your first 3 months</p>
            <KitCommerceButton
              productUrl="https://aigent-john.kit.com/products/connexted-membership"
              buttonText="Claim Offer"
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              showIcon={false}
            />
          </div>

          {/* Inline in content */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Join?</CardTitle>
              <CardDescription>
                Start your journey with CONNEXTED LABS today
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  Join thousands of innovators building the future
                </p>
              </div>
              <KitCommerceButton
                productUrl="https://aigent-john.kit.com/products/connexted-membership"
                buttonText="Purchase Now"
              />
            </CardContent>
          </Card>

          {/* Small CTA */}
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              Already convinced? 
            </p>
            <KitCommerceButton
              productUrl="https://aigent-john.kit.com/products/connexted-membership"
              buttonText="Buy Membership"
              size="sm"
            />
          </div>
        </div>

        {/* Code Examples */}
        <div className="mt-16 p-8 bg-gray-900 text-gray-100 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-white">How to Use</h3>
          <pre className="text-sm overflow-x-auto">
            <code>{`import KitCommerceButton from '@/app/components/KitCommerceButton';

// Basic usage
<KitCommerceButton 
  productUrl="https://aigent-john.kit.com/products/connexted-membership"
  buttonText="Buy Now"
/>

// Large button with custom styling
<KitCommerceButton 
  productUrl="https://aigent-john.kit.com/products/connexted-membership"
  buttonText="Join CONNEXTED LABS"
  size="lg"
  className="bg-gradient-to-r from-blue-600 to-purple-600"
/>

// Outline variant without icon
<KitCommerceButton 
  productUrl="https://aigent-john.kit.com/products/connexted-membership"
  buttonText="Learn More"
  variant="outline"
  showIcon={false}
/>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
