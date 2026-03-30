/**
 * MembersSection Component
 *
 * Member directory navigation: All, Directory, Friends, Socials, etc.
 */

import { Link, useLocation } from 'react-router';
import {
  ChevronDown,
  ChevronRight,
  Users,
  ContactRound,
  Handshake,
  Share2,
  UserPlus,
  UserCircle,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MembersSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  userCount: number;
}

export function MembersSection({ isExpanded, onToggle, userCount }: MembersSectionProps) {
  const location = useLocation();

  const links = [
    { to: '/members/all', icon: Users, label: 'All Members', color: 'text-blue-500', count: userCount },
    { to: '/contacts/directory', icon: ContactRound, label: 'Contact Directory', color: 'text-green-500' },
    { to: '/members/friends', icon: Handshake, label: 'Friends', color: 'text-pink-500' },
    { to: '/members/socials', icon: Share2, label: 'Socials', color: 'text-purple-500' },
    { to: '/members/following', icon: UserPlus, label: 'Following', color: 'text-blue-500' },
    { to: '/members/followers', icon: UserCircle, label: 'Followers', color: 'text-purple-500' },
    { to: '/members/active', icon: Activity, label: 'Active Members', color: 'text-orange-500' },
    { to: '/members/affinity', icon: Zap, label: 'Affinity', color: 'text-yellow-500', suffix: '(recommended)' },
  ];

  return (
    <div className="mb-1.5">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
          isExpanded && 'bg-gray-50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <Users className="w-4 h-4 text-purple-600" />
        <span className="flex-1 text-left font-semibold text-gray-900">MEMBERS</span>
        <span className="text-xs text-gray-500">({userCount})</span>
      </button>

      {isExpanded && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors',
                location.pathname === link.to && 'bg-indigo-50 text-indigo-700'
              )}
            >
              <link.icon className={cn('w-4 h-4', link.color)} />
              <span>{link.label}</span>
              {link.count !== undefined && (
                <span className="text-xs text-gray-500">({link.count})</span>
              )}
              {link.suffix && (
                <span className="text-xs text-gray-500">{link.suffix}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
