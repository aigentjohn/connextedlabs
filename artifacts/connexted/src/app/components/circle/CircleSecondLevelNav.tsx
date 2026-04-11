import { Button } from '@/app/components/ui/button';
import { MessageSquare, MessageCircle, Calendar, Users, Sparkles, Layers } from 'lucide-react';

interface CircleSecondLevelNavProps {
  activeSection: 'feed' | 'forum' | 'events' | 'members' | 'prompts' | 'resources';
  onSectionChange: (section: 'feed' | 'forum' | 'events' | 'members' | 'prompts' | 'resources') => void;
  isAdmin: boolean;
  isMember: boolean;
  circleId: string;
  guestAccess: {
    feed: boolean;
    forum: boolean;
    calendar: boolean;
    members: boolean;
  };
}

export function CircleSecondLevelNav({
  activeSection,
  onSectionChange,
  isAdmin,
  isMember,
  circleId,
  guestAccess,
}: CircleSecondLevelNavProps) {
  // Define all sections
  const allSections = [
    { id: 'feed' as const, label: 'Feed', icon: MessageSquare, guestAccessKey: 'feed' },
    { id: 'forum' as const, label: 'Forum', icon: MessageCircle, guestAccessKey: 'forum' },
    { id: 'events' as const, label: 'Events', icon: Calendar, guestAccessKey: 'calendar' },
    { id: 'prompts' as const, label: 'Prompts', icon: Sparkles, guestAccessKey: null }, // Members only
    { id: 'resources' as const, label: 'Resources', icon: Layers, guestAccessKey: null }, // Members only
    { id: 'members' as const, label: 'Members', icon: Users, guestAccessKey: 'members' },
  ];

  // Filter sections based on guest access (members see all)
  const visibleSections = isMember 
    ? allSections 
    : allSections.filter(section => 
        section.guestAccessKey && guestAccess[section.guestAccessKey as keyof typeof guestAccess]
      );

  return (
    <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-14">
          {/* Section Navigation */}
          <div className="flex gap-1 sm:gap-6">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? 'text-indigo-600 bg-indigo-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              );
            })}
          </div>

        </nav>
      </div>
    </div>
  );
}