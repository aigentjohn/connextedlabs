import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import KitForm from '@/app/components/KitForm';
import { Mail, Users, Sparkles } from 'lucide-react';

/**
 * ProspectSignup Page
 * 
 * Public landing page for prospect lead capture using Kit forms.
 * This page can be shared with potential prospects to join your mailing list.
 */
export function ProspectSignup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join CONNEXTED LABS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Be the first to know about new programs, innovation opportunities, and community events.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Early Access</h3>
              <p className="text-sm text-gray-600">
                Get notified when new programs and cohorts open for enrollment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Community Updates</h3>
              <p className="text-sm text-gray-600">
                Stay connected with the latest innovations and success stories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Exclusive Content</h3>
              <p className="text-sm text-gray-600">
                Receive curated insights, resources, and opportunities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kit Form Embed */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Stay Connected</CardTitle>
            <CardDescription>
              Join our mailing list to receive updates and opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Embed your Kit form here */}
            <KitForm 
              formId="03ed58c6b1"
              scriptSrc="https://aigent-john.kit.com/03ed58c6b1/index.js"
              className="kit-form-container"
              useIframe={true}
            />
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}

export default ProspectSignup;