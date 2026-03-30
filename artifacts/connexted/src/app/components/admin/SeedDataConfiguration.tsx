import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { 
  Users, 
  Circle, 
  FileText, 
  Download,
  Upload,
  Eye,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

// Seed data configuration for 5 demo personas
export const DEMO_PERSONAS = [
  {
    id: 'alex-chen',
    email: 'alex.chen@demo.connexted.com',
    name: 'Alex Chen',
    bio: 'Serial entrepreneur and product innovator. Currently building an AI-powered sustainability platform. Passionate about climate tech and social impact.',
    role: 'member',
    tier: 'premium',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    tagline: 'Building the future of sustainable living',
    location: 'San Francisco, CA',
    website: 'https://alexchen.io',
    linkedin: 'https://linkedin.com/in/alexchen',
    twitter: '@alexchen',
    skills: ['Product Strategy', 'Climate Tech', 'AI/ML', 'Community Building'],
    interests: ['Sustainability', 'Innovation', 'Startups', 'Community'],
    showcase: {
      company: {
        name: 'EcoTrack AI',
        tagline: 'Personal carbon footprint tracking powered by AI',
        stage: 'Post-MVP',
        description: 'EcoTrack AI helps individuals and businesses measure, understand, and reduce their carbon footprint using advanced AI analytics and personalized recommendations.',
        website: 'https://ecotrack.ai',
        founded: '2024',
        team_size: '5',
        products: [
          {
            name: 'EcoTrack Mobile App',
            description: 'Track your daily carbon footprint automatically',
            price: '$9.99/month'
          },
          {
            name: 'Business Dashboard',
            description: 'Enterprise carbon tracking and reporting',
            price: 'Custom pricing'
          }
        ]
      },
      posts: [
        {
          title: 'Just hit 10K users on EcoTrack! 🎉',
          content: 'Incredible milestone for our team. What started as a side project is now helping thousands of people make more sustainable choices every day. The journey from MVP to this point has been challenging but rewarding. Key lessons: talk to users constantly, iterate fast, and don\'t be afraid to pivot when data tells you to.',
          tags: ['milestone', 'sustainability', 'startup-journey']
        },
        {
          title: 'The hardest part about climate tech',
          content: 'It\'s not the technology—it\'s changing behavior. We can build the most sophisticated carbon tracking algorithms, but if people don\'t use them consistently, it doesn\'t matter. That\'s why we\'ve been obsessed with habit formation and gamification. Small wins lead to big changes.',
          tags: ['climate-tech', 'product-development', 'user-behavior']
        },
        {
          title: 'Raising our seed round - lessons learned',
          content: 'Just closed our $2M seed round! Some unexpected lessons: 1) Investors care way more about traction than your deck. 2) Warm intros are 10x more effective. 3) The process takes 3x longer than you think. 4) Have multiple irons in the fire. Happy to chat with anyone going through this process.',
          tags: ['fundraising', 'startup-advice', 'seed-round']
        }
      ],
      moments: [
        {
          title: 'Product Demo Success',
          description: 'Demoed EcoTrack at TechCrunch Disrupt - got 200+ signups!',
          date: '2025-01-15'
        },
        {
          title: 'Team Milestone',
          description: 'Hired our first full-time engineer. Team of 5 now!',
          date: '2025-01-20'
        },
        {
          title: 'Press Coverage',
          description: 'Featured in Forbes 30 Under 30 for Climate Tech',
          date: '2024-12-10'
        }
      ]
    }
  },
  {
    id: 'maria-rodriguez',
    email: 'maria.rodriguez@demo.connexted.com',
    name: 'Maria Rodriguez',
    bio: 'Community builder and program facilitator. Passionate about creating spaces where innovators thrive. Former product manager turned community architect.',
    role: 'host',
    tier: 'member',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    tagline: 'Building communities that build the future',
    location: 'Austin, TX',
    website: 'https://mariabuilds.com',
    linkedin: 'https://linkedin.com/in/mariarodriguez',
    twitter: '@mariabuilds',
    skills: ['Community Building', 'Program Management', 'Facilitation', 'Product Management'],
    interests: ['Community', 'Education', 'Innovation', 'Leadership'],
    showcase: {
      posts: [
        {
          title: 'What I learned facilitating 50+ workshops',
          content: 'After running workshops for hundreds of founders, here are the patterns I see in the most successful ones: 1) They create psychological safety first. 2) They balance structure with flexibility. 3) They prioritize peer learning over expert lectures. 4) They build in reflection time. 5) They foster genuine connections, not just networking.',
          tags: ['community', 'facilitation', 'workshops']
        },
        {
          title: 'The secret to thriving communities',
          content: 'It\'s not about the platform or the content—it\'s about the relationships. The best communities I\'ve built have these in common: clear values, consistent rituals, genuine care for members, and celebration of wins (big and small). Technology enables, but people create magic.',
          tags: ['community-building', 'leadership', 'culture']
        },
        {
          title: 'Starting a new program: Product Founders Accelerator',
          content: 'Excited to announce I\'m launching a 12-week accelerator for product-focused founders! We\'ll be diving deep into user research, MVP development, and go-to-market strategy. Applications open next week. Looking for 10-15 committed founders ready to build together.',
          tags: ['programs', 'accelerator', 'announcement']
        }
      ],
      moments: [
        {
          title: 'Program Launch',
          description: 'Innovation Lab program welcomed its 30th member!',
          date: '2025-01-25'
        },
        {
          title: 'Community Event',
          description: 'Hosted our largest virtual gathering - 150 attendees',
          date: '2025-01-18'
        }
      ]
    }
  },
  {
    id: 'jordan-kim',
    email: 'jordan.kim@demo.connexted.com',
    name: 'Jordan Kim',
    bio: 'Early-stage founder exploring ideas in the EdTech space. Learning by doing and connecting with other builders.',
    role: 'member',
    tier: 'free',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    tagline: 'Building, learning, iterating',
    location: 'Seattle, WA',
    linkedin: 'https://linkedin.com/in/jordankim',
    skills: ['JavaScript', 'React', 'UX Design'],
    interests: ['EdTech', 'Startups', 'Learning'],
    showcase: {
      posts: [
        {
          title: 'Just joined Connexted Labs!',
          content: 'Excited to be part of this community. I\'m working on an EdTech idea and looking forward to connecting with other founders and getting feedback. Still figuring things out but ready to learn!',
          tags: ['introduction', 'edtech']
        },
        {
          title: 'Looking for feedback on my MVP',
          content: 'Built a simple prototype for a study group matching app. Would love to get some eyes on it and hear your thoughts. Anyone interested in EdTech or remote learning?',
          tags: ['feedback', 'mvp', 'edtech']
        }
      ],
      moments: [
        {
          title: 'First Prototype',
          description: 'Shipped my first working prototype!',
          date: '2025-01-28'
        }
      ]
    }
  },
  {
    id: 'sam-patel',
    email: 'sam.patel@demo.connexted.com',
    name: 'Sam Patel',
    bio: 'Product designer and startup advisor. Focused on health tech and wellness. Active connector and community contributor.',
    role: 'member',
    tier: 'premium',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    tagline: 'Designing products that improve lives',
    location: 'New York, NY',
    website: 'https://sampatel.design',
    linkedin: 'https://linkedin.com/in/sampatel',
    twitter: '@sampateldesign',
    skills: ['Product Design', 'UX Research', 'Health Tech', 'Wellness'],
    interests: ['Design', 'Health', 'Wellness', 'Community'],
    showcase: {
      posts: [
        {
          title: 'The importance of design in health tech',
          content: 'Working in health tech has taught me that good design isn\'t just about aesthetics—it\'s about trust, clarity, and accessibility. When people are making decisions about their health, every interaction matters. Our design choices can literally impact health outcomes.',
          tags: ['design', 'health-tech', 'ux']
        },
        {
          title: 'Excited to mentor 3 new designers!',
          content: 'Just committed to mentoring three aspiring product designers through the Connexted Labs mentorship program. If you\'re early in your design journey and looking for guidance, consider applying. Mentorship changed my career trajectory—happy to pay it forward.',
          tags: ['mentorship', 'design', 'community']
        },
        {
          title: 'Thoughts on the future of wellness apps',
          content: 'The wellness app space is crowded, but I think we\'re still missing something fundamental: true personalization. Not just "enter your goals" but apps that understand your context, constraints, and motivations. That\'s the next frontier.',
          tags: ['wellness', 'product-thinking', 'health-tech']
        },
        {
          title: 'Great conversation today!',
          content: 'Had an amazing coffee chat with @alex.chen about the intersection of AI and sustainability. Love this community for facilitating these kinds of connections. Already thinking about potential collaborations.',
          tags: ['networking', 'collaboration']
        }
      ],
      moments: [
        {
          title: 'Speaking Engagement',
          description: 'Spoke at Design Week NYC about health tech UX',
          date: '2025-01-12'
        },
        {
          title: 'Mentorship',
          description: 'Started mentoring 3 designers in the community',
          date: '2025-01-22'
        },
        {
          title: 'Community Contribution',
          description: 'Organized a design critique session - 20 participants',
          date: '2025-01-19'
        }
      ]
    }
  },
  {
    id: 'taylor-morgan',
    email: 'taylor.morgan@demo.connexted.com',
    name: 'Taylor Morgan',
    bio: 'VP of Innovation at TechForward Inc. Sponsor and supporter of emerging founders. Passionate about fostering the next generation of tech leaders.',
    role: 'member',
    tier: 'member',
    is_sponsor: true,
    sponsor_tier: 'gold',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
    tagline: 'Investing in people and ideas that matter',
    location: 'Boston, MA',
    website: 'https://techforward.com',
    linkedin: 'https://linkedin.com/in/taylormorgan',
    company: 'TechForward Inc.',
    company_description: 'Enterprise software solutions for the modern workplace',
    skills: ['Corporate Innovation', 'Strategic Partnerships', 'Venture Building'],
    interests: ['Innovation', 'Startups', 'Mentorship', 'Corporate Partnerships'],
    showcase: {
      posts: [
        {
          title: 'Why TechForward sponsors Connexted Labs',
          content: 'At TechForward, we believe innovation happens at the edges. That\'s why we\'re proud sponsors of Connexted Labs. The founders and builders in this community are solving real problems with fresh perspectives. We\'re here to support, mentor, and occasionally partner with the best ideas.',
          tags: ['sponsorship', 'innovation', 'partnerships']
        },
        {
          title: 'Open office hours for founders',
          content: 'I\'m offering monthly office hours for founders working on B2B SaaS products. Whether you need feedback on enterprise sales, partnership strategy, or just want to chat about your journey—book time with me. Link in my profile.',
          tags: ['mentorship', 'office-hours', 'b2b-saas']
        },
        {
          title: 'The corporate innovation dilemma',
          content: 'Large companies want to innovate like startups but often kill ideas with process. Here\'s what I\'ve learned works: 1) Create protected innovation teams. 2) Allow failure. 3) Partner with external founders. 4) Move fast on small bets. 5) Celebrate learning, not just wins.',
          tags: ['corporate-innovation', 'leadership', 'startups']
        }
      ],
      moments: [
        {
          title: 'Partnership Announcement',
          description: 'TechForward announces strategic partnership with Connexted Labs',
          date: '2024-12-15'
        },
        {
          title: 'Office Hours Success',
          description: 'Completed 15 founder office hour sessions this quarter',
          date: '2025-01-30'
        }
      ]
    }
  }
];

// Circle configurations
export const SEED_CIRCLES = [
  {
    id: 'innovation-lab',
    name: 'Innovation Lab',
    slug: 'innovation-lab',
    description: 'Premium community for post-MVP founders building the next generation of impactful companies. Deep dives into product development, go-to-market strategy, and sustainable growth.',
    type: 'premium',
    visibility: 'members_only',
    default_tier: 'premium',
    settings: {
      allow_applications: true,
      require_approval: true,
      max_members: 100
    },
    programs: [
      {
        name: 'Product Market Fit Sprint',
        description: '8-week intensive program to validate and optimize product-market fit',
        duration: '8 weeks',
        spots: 15
      },
      {
        name: 'Go-To-Market Strategy',
        description: 'Develop and execute your GTM strategy with expert guidance',
        duration: '6 weeks',
        spots: 20
      },
      {
        name: 'Scaling Workshop Series',
        description: 'Monthly workshops on scaling challenges: hiring, ops, fundraising',
        duration: 'Ongoing',
        spots: 50
      }
    ]
  },
  {
    id: 'open-circle',
    name: 'Open Circle',
    slug: 'open',
    description: 'Platform-wide community space for all members. Share updates, ask questions, and connect with the broader Connexted Labs ecosystem.',
    type: 'open',
    visibility: 'public',
    default_tier: 'free',
    settings: {
      allow_applications: false,
      require_approval: false,
      max_members: null
    },
    content: [
      {
        type: 'announcement',
        title: 'Welcome to Connexted Labs!',
        content: 'We\'re excited to have you here. This is your space to connect, learn, and grow with other innovators and founders. Start by introducing yourself in the feed!'
      },
      {
        type: 'resource',
        title: 'Community Guidelines',
        content: 'Our community thrives on respect, generosity, and authenticity. Please read our guidelines to ensure everyone has a great experience.'
      }
    ]
  },
  {
    id: 'product-founders-network',
    name: 'Product Founders Network',
    slug: 'product-founders',
    description: 'Member-tier community for product-focused founders at all stages. Peer learning, accountability groups, and product workshops.',
    type: 'member',
    visibility: 'members_only',
    default_tier: 'member',
    settings: {
      allow_applications: true,
      require_approval: true,
      max_members: 200
    },
    programs: [
      {
        name: 'Product Founders Accelerator',
        description: '12-week program covering user research, MVP development, and go-to-market',
        duration: '12 weeks',
        spots: 15
      },
      {
        name: 'Weekly Product Teardowns',
        description: 'Peer-led sessions analyzing successful products and strategies',
        duration: 'Ongoing',
        spots: 30
      }
    ]
  }
];

export default function SeedDataConfiguration() {
  const [activeTab, setActiveTab] = useState('personas');
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);

  const exportConfiguration = () => {
    const config = {
      version: '1.0',
      generated: new Date().toISOString(),
      personas: DEMO_PERSONAS,
      circles: SEED_CIRCLES,
      metadata: {
        total_personas: DEMO_PERSONAS.length,
        total_circles: SEED_CIRCLES.length,
        total_posts: DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.posts?.length || 0), 0),
        total_moments: DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.moments?.length || 0), 0),
      }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connexted-seed-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Configuration exported successfully');
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      premium: 'bg-purple-100 text-purple-700 border-purple-300',
      member: 'bg-blue-100 text-blue-700 border-blue-300',
      free: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return colors[tier as keyof typeof colors] || colors.free;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      host: 'bg-green-100 text-green-700 border-green-300',
      member: 'bg-blue-100 text-blue-700 border-blue-300',
      platform_admin: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', path: '/platform-admin' },
          { label: 'Seed Data Config' }
        ]}
      />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Seed Data Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review demo personas and circle configurations before seeding
          </p>
        </div>
        <Button onClick={exportConfiguration} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Config
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Demo Personas</p>
                <p className="text-3xl font-bold">{DEMO_PERSONAS.length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Circles</p>
                <p className="text-3xl font-bold">{SEED_CIRCLES.length}</p>
              </div>
              <Circle className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-3xl font-bold">
                  {DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.posts?.length || 0), 0)}
                </p>
              </div>
              <FileText className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Moments</p>
                <p className="text-3xl font-bold">
                  {DEMO_PERSONAS.reduce((sum, p) => sum + (p.showcase?.moments?.length || 0), 0)}
                </p>
              </div>
              <Sparkles className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-300 bg-blue-50">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Production-Ready Configuration</AlertTitle>
        <AlertDescription className="text-blue-800">
          This configuration includes 5 realistic demo personas with varied roles, tiers, and content.
          All content is semi-realistic and clearly marked as demo data. Ready to seed after cleanup.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personas">Demo Personas ({DEMO_PERSONAS.length})</TabsTrigger>
          <TabsTrigger value="circles">Circles ({SEED_CIRCLES.length})</TabsTrigger>
        </TabsList>

        {/* Personas Tab */}
        <TabsContent value="personas" className="space-y-4 mt-6">
          {DEMO_PERSONAS.map((persona) => (
            <Card key={persona.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {persona.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {persona.name}
                        <span className={`text-xs px-2 py-1 rounded border ${getTierBadge(persona.tier)}`}>
                          {persona.tier}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded border ${getRoleBadge(persona.role)}`}>
                          {persona.role}
                        </span>
                        {persona.is_sponsor && (
                          <span className="text-xs px-2 py-1 rounded border bg-yellow-100 text-yellow-700 border-yellow-300">
                            Sponsor
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{persona.email}</CardDescription>
                      <p className="text-sm text-gray-700 mt-2">{persona.tagline}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedPersona(expandedPersona === persona.id ? null : persona.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {expandedPersona === persona.id ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </CardHeader>

              {expandedPersona === persona.id && (
                <CardContent className="pt-6 space-y-6">
                  {/* Bio & Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Bio</h4>
                    <p className="text-sm text-gray-700">{persona.bio}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{persona.location}</span>
                      {persona.skills?.map((skill, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Company (if exists) */}
                  {persona.showcase?.company && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Company Profile
                      </h4>
                      <h5 className="font-medium text-lg">{persona.showcase.company.name}</h5>
                      <p className="text-sm text-gray-600 italic mb-2">{persona.showcase.company.tagline}</p>
                      <p className="text-sm text-gray-700 mb-3">{persona.showcase.company.description}</p>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Stage: {persona.showcase.company.stage}</span>
                        <span>Team: {persona.showcase.company.team_size}</span>
                        <span>Founded: {persona.showcase.company.founded}</span>
                      </div>
                      {persona.showcase.company.products && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Products:</p>
                          <div className="space-y-2">
                            {persona.showcase.company.products.map((product, idx) => (
                              <div key={idx} className="text-xs p-2 bg-white rounded">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-gray-600">{product.description}</p>
                                <p className="text-purple-600 font-medium mt-1">{product.price}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Posts */}
                  {persona.showcase?.posts && persona.showcase.posts.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Posts ({persona.showcase.posts.length})</h4>
                      <div className="space-y-3">
                        {persona.showcase.posts.map((post, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border">
                            <p className="font-medium text-sm">{post.title}</p>
                            <p className="text-xs text-gray-700 mt-1">{post.content}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.tags?.map((tag, tagIdx) => (
                                <span key={tagIdx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Moments */}
                  {persona.showcase?.moments && persona.showcase.moments.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Moments ({persona.showcase.moments.length})</h4>
                      <div className="space-y-2">
                        {persona.showcase.moments.map((moment, idx) => (
                          <div key={idx} className="p-3 bg-yellow-50 rounded border border-yellow-200">
                            <p className="font-medium text-sm">{moment.title}</p>
                            <p className="text-xs text-gray-700 mt-1">{moment.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{moment.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Circles Tab */}
        <TabsContent value="circles" className="space-y-4 mt-6">
          {SEED_CIRCLES.map((circle) => (
            <Card key={circle.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {circle.name}
                      <span className={`text-xs px-2 py-1 rounded border ${getTierBadge(circle.default_tier)}`}>
                        {circle.type}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-2">{circle.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedCircle(expandedCircle === circle.id ? null : circle.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {expandedCircle === circle.id ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </CardHeader>

              {expandedCircle === circle.id && (
                <CardContent className="pt-6 space-y-4">
                  {/* Settings */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Visibility</p>
                      <p className="font-medium capitalize">{circle.visibility.replace('_', ' ')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Applications</p>
                      <p className="font-medium">{circle.settings.allow_applications ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Max Members</p>
                      <p className="font-medium">{circle.settings.max_members || 'Unlimited'}</p>
                    </div>
                  </div>

                  {/* Programs */}
                  {circle.programs && circle.programs.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Programs ({circle.programs.length})</h4>
                      <div className="space-y-2">
                        {circle.programs.map((program, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="font-medium">{program.name}</p>
                            <p className="text-sm text-gray-700 mt-1">{program.description}</p>
                            <div className="flex gap-4 text-xs text-gray-600 mt-2">
                              <span>Duration: {program.duration}</span>
                              <span>Spots: {program.spots}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  {circle.content && circle.content.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Initial Content ({circle.content.length})</h4>
                      <div className="space-y-2">
                        {circle.content.map((item, idx) => (
                          <div key={idx} className="p-3 bg-green-50 rounded border border-green-200">
                            <p className="font-medium text-sm capitalize">{item.type}</p>
                            <p className="text-sm font-medium mt-1">{item.title}</p>
                            <p className="text-xs text-gray-700 mt-1">{item.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}