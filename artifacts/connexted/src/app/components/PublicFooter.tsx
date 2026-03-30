import { Link } from 'react-router';
import { Users, Mail, Globe, Heart } from 'lucide-react';

interface PublicFooterProps {
  brandName?: string;
  showExtendedLinks?: boolean;
  footerAboutUrl?: string;
  footerContactUrl?: string;
  footerPrivacyUrl?: string;
  footerTermsUrl?: string;
  footerEmailLink?: string;
  footerWebsiteLink?: string;
}

export default function PublicFooter({ 
  brandName = 'Connexted Labs',
  showExtendedLinks = true,
  footerAboutUrl,
  footerContactUrl,
  footerPrivacyUrl,
  footerTermsUrl,
  footerEmailLink,
  footerWebsiteLink
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">{brandName}</span>
            </div>
            <p className="text-gray-600 text-sm mb-4 max-w-md">
              A professional home where your work becomes visible, your expertise becomes findable, and your connections become meaningful.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for independent professionals</span>
            </div>
          </div>

          {/* Platform Links */}
          {showExtendedLinks && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
                <ul className="space-y-3">
                  <li>
                    <Link to="/join" className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Explore the Platform
                    </Link>
                  </li>
                  <li>
                    <Link to="/explore" className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Browse Content
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Get Started
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
                <ul className="space-y-3">
                  <li>
                    <a href={footerAboutUrl} className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href={footerContactUrl} className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href={footerPrivacyUrl} className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href={footerTermsUrl} className="text-gray-600 hover:text-indigo-600 text-sm transition-colors">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {currentYear} {brandName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href={footerEmailLink} className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Mail className="w-5 h-5" />
                <span className="sr-only">Email</span>
              </a>
              <a href={footerWebsiteLink} className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Globe className="w-5 h-5" />
                <span className="sr-only">Website</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}