import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { MessageSquare, MessageCircle, Users, Sparkles } from 'lucide-react';

interface ProgramSecondLevelNavProps {
  activeSection: 'feed' | 'forum' | 'members' | 'prompts';
  onSectionChange: (section: 'feed' | 'forum' | 'members' | 'prompts') => void;
  isAdmin: boolean;
  isMember: boolean;
  programId: string;
}

export function ProgramSecondLevelNav({
  activeSection,
  onSectionChange,
  isAdmin,
  isMember,
  programId,
}: ProgramSecondLevelNavProps) {
  // Community sections only - sessions/events belong in Journeys tab
  const sections = [
    { id: 'feed' as const, label: 'Feed', icon: MessageSquare },
    { id: 'forum' as const, label: 'Forum', icon: MessageCircle },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'prompts' as const, label: 'Prompts', icon: Sparkles },
  ];

  return (
    <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center h-14">
          {/* Section Navigation */}
          <div className="flex gap-1 sm:gap-6">
            {sections.map((section) => {
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