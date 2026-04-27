import { useNavigate } from 'react-router';
import {
  Sparkles,
  Library,
  Tag,
  Hash,
  TrendingUp,
  Rss,
  Trophy,
  ArrowRight,
  Search,
  Users,
  BookOpen,
  Heart,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface GuideSection {
  icon: React.ElementType;
  title: string;
  route: string;
  description: string;
  tips: string[];
}

const SECTIONS: GuideSection[] = [
  {
    icon: Sparkles,
    title: 'Explore',
    route: '/explore',
    description: 'Your central discovery hub. Browse content, members, circles, and programs all in one place. Start here if you don\'t know where to look.',
    tips: [
      'Use the search bar to find anything across the platform',
      'Filter by content type (documents, books, episodes, links)',
      'Switch between Grid and List view for different browsing styles',
    ],
  },
  {
    icon: Library,
    title: 'Explore Content',
    route: '/explore/content',
    description: 'Browse all public content on the platform — documents, books, decks, episodes, blogs, and more. Great for finding resources shared by other members.',
    tips: [
      'Filter by content type using the tabs at the top',
      'Sort by newest, most liked, or most viewed',
      'Click any item to open it and save it to your library',
    ],
  },
  {
    icon: Tag,
    title: 'Topics',
    route: '/topics',
    description: 'Topics are broad subject areas that organise content across the platform. Following a topic surfaces new content matching that theme in your feed.',
    tips: [
      'Click a topic to see all content tagged with it',
      'Follow topics to personalise your discovery feed',
      'Topics differ from tags — topics are curated, tags are user-defined',
    ],
  },
  {
    icon: Hash,
    title: 'Tags',
    route: '/tags',
    description: 'Tags are user-defined keywords attached to content. Browse tags to find a specific niche, format, or skill area.',
    tips: [
      'Tags are more specific than topics — use them for precise searches',
      'Click any tag to see all content carrying that label',
      'Your own content\'s tags help others find it',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Rankings',
    route: '/rankings',
    description: 'See who\'s leading the community in terms of badges, contributions, and engagement. A quick way to find active and influential members.',
    tips: [
      'Rankings refresh regularly based on platform activity',
      'Click a member to visit their profile and see their content',
    ],
  },
  {
    icon: Rss,
    title: 'Discovery Feed',
    route: '/discovery/feed',
    description: 'A personalised stream of content based on the topics and members you follow. The more you engage, the better it gets.',
    tips: [
      'Follow more topics and members to enrich your feed',
      'Like and save content to signal your interests',
      'New content from people you follow appears here first',
    ],
  },
  {
    icon: Trophy,
    title: 'Most Liked',
    route: '/discovery/most-liked',
    description: 'The community\'s highest-rated content, ranked by likes. A shortcut to the best resources on the platform.',
    tips: [
      'Use this when you want proven, well-received content',
      'Filter by time period — all-time, this month, this week',
      'Save anything you find useful to your library',
    ],
  },
];

export default function DiscoverGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Guide</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Everything in the Discover section is designed to help you find content, connect with members, and surface ideas you wouldn't have looked for on your own.
        </p>
      </div>

      {/* Quick tips strip */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-2">
        <h2 className="font-semibold text-indigo-900 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Quick Tips
        </h2>
        <ul className="space-y-1 text-sm text-indigo-800">
          <li className="flex items-start gap-2"><span className="mt-0.5">•</span> Start with <strong>Explore</strong> if you don't know where to look</li>
          <li className="flex items-start gap-2"><span className="mt-0.5">•</span> Follow <strong>Topics</strong> to personalise your Discovery Feed</li>
          <li className="flex items-start gap-2"><span className="mt-0.5">•</span> Check <strong>Most Liked</strong> for high-quality community picks</li>
          <li className="flex items-start gap-2"><span className="mt-0.5">•</span> Use <strong>Tags</strong> when you want something more specific than a topic</li>
        </ul>
      </div>

      {/* Section guides */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.route} className="border border-gray-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    <Icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{section.route}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(section.route)}
                  className="shrink-0"
                >
                  Go <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>

              <p className="text-gray-700">{section.description}</p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to use it</p>
                {section.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-500 mt-0.5">→</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Related sections */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Related areas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: 'Browse Members', route: '/members' },
            { icon: BookOpen, label: 'Link Library', route: '/links' },
            { icon: Heart, label: 'My Saved Content', route: '/my-content/audit' },
          ].map(({ icon: Icon, label, route }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <Icon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
