import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import PublicHeader from '@/app/components/PublicHeader';
import PublicFooter from '@/app/components/PublicFooter';
import KitForm from '@/app/components/KitForm';
import { supabase } from '@/lib/supabase';
import {
  Users,
  TrendingUp,
  CheckCircle,
  Star,
  ArrowRight,
  Sparkles,
  Mail,
  Globe,
  Layers,
  Award,
  Shield,
  Briefcase,
  Building2,
  Target,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PlatformSettings {
  newsletter_form_id?: string;
  newsletter_script_url?: string;
  newsletter_button_text?: string;
  newsletter_button_url?: string;
  footer_about_url?: string;
  footer_contact_url?: string;
  footer_privacy_url?: string;
  footer_terms_url?: string;
  footer_email_link?: string;
  footer_website_link?: string;
}

const DIFFERENTIATORS = [
  {
    icon: Target,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    title: 'The enrollment system is commerce-grade, not LMS-grade',
    body: 'Most platforms have two enrollment states: enrolled or not. Connexted tracks twelve acquisition sources, seven ticket types — paid, free, trial, scholarship, membership-included, gifted, promotional — and a full referral system with click tracking and per-ticket earnings. This is the infrastructure of a real commerce platform.',
  },
  {
    icon: Users,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    title: 'Connection happens in context, not in a separate feed',
    body: 'On most platforms, discussion is separated from the work it is about — a generic comment thread, a disconnected forum tab, or an entirely separate app. On Connexted, every course, program, and content piece can have its own focused space for questions, peer feedback, and exchange. You do not need to be building a community for this to matter. You just need peers who engage with what you make.',
  },
  {
    icon: Layers,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Content types include real work, not just consumption',
    body: 'A course on most platforms is video plus text. A journey item on Connexted can be a document, a book, a deck, an episode, a checklist, a sprint, a build, a pitch, a table, a discussion, or an event. Leaders can design learning experiences that involve doing, not just watching.',
  },
  {
    icon: Award,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Pathways create a credential layer above individual courses',
    body: 'A learner who completes a Pathway earns a badge that represents something larger than a single course. The platform issues and displays credentials that carry meaning inside the community — not just a certificate download that nobody looks at, but a visible public record of the work that earned it.',
  },
  {
    icon: Shield,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Privacy by design, not privacy as a missing feature',
    body: 'Members-only circles create a space that is private enough to be honest. No advertising model to protect. No public surface area to optimize. The professional sharing work in progress, the founder pitching to investors, the coach facilitating peer review — all of them deserve a room where the audience is known and the incentives reward substance over performance.',
  },
];

const PERSONAS = [
  {
    icon: Briefcase,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-100',
    accentBg: 'bg-indigo-50',
    accentBorder: 'border-l-indigo-400',
    accentText: 'text-indigo-800',
    labelColor: 'text-indigo-600',
    title: 'The Solopreneur Creator',
    label: 'Coaches · Consultants · Educators',
    description:
      'She has been coaching senior leaders for eleven years. She has a newsletter, a video channel, an online course, and AI tools that have made her coaching dramatically more effective. None of these things know the others exist. Her professional profile accurately describes who she was in 2019.',
    moment:
      '"The moment that breaks her": A prospective client asks what makes her different from the fifteen coaches who reach out every week. She has a great answer. She cannot point to anything that shows it.',
  },
  {
    icon: Building2,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    borderColor: 'border-cyan-100',
    accentBg: 'bg-cyan-50',
    accentBorder: 'border-l-cyan-400',
    accentText: 'text-cyan-800',
    labelColor: 'text-cyan-600',
    title: 'The Micro Startup Team',
    label: 'Founders · Small Teams · Early-stage Builders',
    description:
      'Three people. One builds. One sells. One runs operations. Their tools are a group chat, a shared drive, a project workspace that made sense when they set it up, and a slide deck they update every week before investor meetings.',
    moment:
      '"The moment that breaks them": An investor asks for the latest deck and one of the three has to say, honestly, that they are not sure which version is current.',
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-100',
    accentBg: 'bg-purple-50',
    accentBorder: 'border-l-purple-400',
    accentText: 'text-purple-800',
    labelColor: 'text-purple-600',
    title: 'The Professional in Transition',
    label: 'Career Changers · New Independents · Re-inventors',
    description:
      'He spent nineteen years in brand strategy. Eight months ago he left to build an independent practice. He is more engaged with his work than he has been in a decade. He is also, to anyone who looks him up, completely invisible. His LinkedIn profile still shows his old job title.',
    moment:
      '"The moment that breaks him": Someone he met at a networking event looks him up before a second meeting and leads with a question about his old job.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Maya R.',
    role: 'Independent Executive Coach',
    location: 'Austin TX',
    text: 'I spent three years stitching together Kajabi, Circle, LinkedIn, and a personal website that I never updated. My coaching methodology, my AI tools, my client results — none of it was visible in one place. I set up my Connexted profile on a Tuesday afternoon and by Thursday I had three people reach out who found me through the AI coaching topic. I had not sent a single email. I had not posted on LinkedIn. The platform just made me findable in a way I had been trying to achieve for years.',
  },
  {
    name: 'Derek T.',
    role: 'Startup Founder',
    location: 'Atlanta GA',
    text: 'We used to email our pitch deck to investors as a PDF attachment. Different version every week, no record of who saw what, feedback scattered across six email threads. We put the pitch in a Connexted Pitch container and gave our two advisors access. Three weeks later we had a complete version history, consolidated feedback, and one URL we sent to every new investor. One of them told us the pitch trail itself showed them how seriously we take feedback. We closed our pre-seed round two weeks after that.',
  },
  {
    name: 'Sandra L.',
    role: 'Career Transition Coach',
    location: 'Chicago IL',
    text: 'My clients are professionals who left corporate careers and are building something new. Every single one of them had the same problem — eight months of real work that was completely invisible to the outside world. I put my first cohort through a Pathway I designed — a Build documenting their methodology, a course on positioning, a pitch reviewed by peers, an Elevator intro at a community event. By the end every one of them had a portfolio page that showed what they had actually been doing. Two got consulting contracts directly from people who found their profiles through topic search. I cried at our final session. I am not ashamed of that.',
  },
  {
    name: 'James K.',
    role: 'AI Tools Builder and Solopreneur',
    location: 'San Francisco CA',
    text: 'I have built eleven custom GPTs and a prompt library I spent fourteen months refining. Before Connexted nobody could see any of it unless they were already my client. I shared my prompt library in a Connexted circle for AI practitioners and within a week forty people had tried it and fifteen had left detailed feedback that made it significantly better. Two of those people became paying clients. The platform turned invisible work into visible expertise without me writing a single LinkedIn post about it.',
  },
  {
    name: 'The Founders of Meridian Labs',
    role: 'Climate Tech Accelerator',
    location: 'Boston MA',
    text: 'We run a twelve-week accelerator for climate tech startups. Before Connexted we were managing cohort progress across Notion, Slack, Airtable, and a Google Drive folder that nobody could ever find anything in. We built a Pathway for our program — validation sprint, pitch review, investor meeting simulation, fundraising course, demo day. Every startup in our cohort follows the same sequence and we track progress across all of it in one place. When they complete the program they earn a Meridian Labs badge that appears on their founder profiles. Three investors have told us they looked up our badge-holders before meetings because the profile gives them more context than a deck ever could.',
  },
  {
    name: 'Priya M.',
    role: 'Freelance Brand Strategist',
    location: 'New York NY',
    text: 'I was invisible. I had a great portfolio on a website nobody visited, a LinkedIn profile that showed my last job title, and a newsletter with 400 subscribers who never heard from me consistently. I set up my Connexted profile, linked my portfolio, started posting Moments about the work I was doing, and joined two circles in the brand strategy topic. Six weeks later someone found me through a topic search, read three of my Moments, looked at my portfolio page, and hired me for a four-month project. She told me she felt like she already knew how I worked before she ever emailed me. That is exactly what I had been trying to create for three years.',
  },
  {
    name: 'Carlos V.',
    role: 'Meetup Organizer',
    location: 'Miami FL',
    text: 'I ran eighty-nine events over seven years and did not own a single email address. Not one. The platform owned everything. When I moved my community to Connexted I was terrified nobody would follow. I sent one Meetup message with the new URL. Two hundred and forty people joined the circle in the first week. For our next event I printed QR codes on the name badges. People were scanning each other before they said hello. After the event the conversation kept going in the circle. I have never had that before. An event used to end when people left. Now it just changes form.',
  },
  {
    name: 'Rachel W.',
    role: 'Independent Researcher and Writer',
    location: 'London UK',
    text: 'I write about urban planning and post my documentaries on YouTube. The YouTube comments were exhausting — moderation took an hour after every upload and the quality of conversation was terrible. I created a Connexted circle for serious urban planning practitioners, linked my videos as Episodes, and made the discussion members-only. The difference is extraordinary. The same video that got two hundred YouTube comments of varying quality gets forty Connexted circle responses that are genuinely thoughtful. People know each other. They are not performing. The platform gave my audience a place to be serious without the internet watching.',
  },
  {
    name: 'Tom B.',
    role: 'Technical Co-Founder',
    location: 'Denver CO',
    text: 'I found my co-founder through Connexted. I had been looking for six months through every channel I could find — LinkedIn, accelerator networks, founder forums. Nothing felt right. I joined a circle for technical founders in the AI space, posted a Build documenting what I was working on, and put my looking-for status on my profile. Three weeks later someone found my Build through topic search, read my profile, and sent me a message through the platform. We met for coffee. We are now eight months into building together and we just closed our seed round. The platform did not find me a co-founder. It made me visible enough that the right person could find me.',
  },
  {
    name: 'Dr. Amara O.',
    role: 'Professional Association Director',
    location: 'Washington DC',
    text: 'We run a certification program for independent consultants in organizational development. Before Connexted our credentials lived on our website as PDFs that nobody looked at after the first week. We built three certification Pathways on Connexted — foundation, practitioner, and fellow. Each one sequences a combination of coursework, peer review sessions, and demonstrated client work. When a member completes a Pathway their badge appears on their Connexted profile alongside the actual work that earned it. Prospective clients can see the credential and click through to the portfolio page that shows the work behind it. Our certification completion rate went from forty percent to eighty-one percent in two cohorts. People finish because finishing means something visible now.',
  },
];

const ALTERNATIVES = [
  {
    name: 'Meetup',
    verdict:
      'Meetup does one thing well: it makes events findable. The limitation is structural — it owns every member relationship in every group on its platform. After years of events, you have built Meetup\'s audience, not your own. You cannot message your members directly, export their data, or build a persistent community around the audience you have assembled.',
  },
  {
    name: 'LinkedIn Groups',
    verdict:
      'Technically available and effectively abandoned. LinkedIn\'s own algorithm deprioritizes group content in favor of personal posts and paid distribution. The conversation format produces performative engagement, not professional exchange. LinkedIn Groups exist. They do not function as communities.',
  },
  {
    name: 'Kajabi or Circle',
    verdict:
      'Kajabi is the right tool for selling and delivering online courses. Circle is a community-first platform and does that well. The gap is that both assume content lives inside them — they require migration. Connexted does not. And neither models collaborative work: no Sprints, Standups, Pitches, or Builds, because both assume the creator creates and the member consumes.',
  },
  {
    name: 'The combination of all of them',
    verdict:
      'The most honest comparison is the stack many of our ideal members are already running: Meetup for events, LinkedIn for presence, Kajabi for courses, Circle for community, Google Drive or Notion for collaboration. The cost is not just money. It is fragmented member data, split analytics, and no single place to send someone who wants to understand who you are and what you do.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketingLandingPage() {
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select(
          'newsletter_form_id, newsletter_script_url, newsletter_button_text, newsletter_button_url, footer_about_url, footer_contact_url, footer_privacy_url, footer_terms_url, footer_email_link, footer_website_link'
        )
        .single();

      if (data && !error) {
        setPlatformSettings({
          newsletter_form_id: data.newsletter_form_id,
          newsletter_script_url: data.newsletter_script_url,
          newsletter_button_text: data.newsletter_button_text,
          newsletter_button_url: data.newsletter_button_url,
          footer_about_url: data.footer_about_url,
          footer_contact_url: data.footer_contact_url,
          footer_privacy_url: data.footer_privacy_url,
          footer_terms_url: data.footer_terms_url,
          footer_email_link: data.footer_email_link,
          footer_website_link: data.footer_website_link,
        });
      }
    } catch (error) {
      console.log('Using default platform settings');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <PublicHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                A professional home for independent professionals
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              More capable than ever.
              <span className="block bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mt-2">
                Less visible than you deserve.
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-4 leading-relaxed">
              You have expertise that took years to build. Maybe you teach, write, or consult. Maybe you have frameworks that clients rely on and tools that make your work meaningfully better. Whatever form it takes, the work is real — and the profile that is supposed to introduce you to the world still shows who you were before you built any of it.
            </p>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Connexted is the professional home that brings all of it into one structured, discoverable place — without asking you to migrate a single file, abandon a single platform, or rebuild anything you have already created.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-lg px-8 py-6"
                onClick={() => navigate('/login')}
              >
                Sign In
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 py-6"
                onClick={() => navigate('/login')}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Claim Your Invite
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {(['Join as Member', 'Browse Demos', 'Explore as Guest', 'Visit our Market'] as const).map(
                (label) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="outline"
                    className="text-sm px-4 py-5 cursor-not-allowed opacity-60"
                    disabled
                  >
                    {label}
                    <span className="block text-xs text-gray-500 mt-1">Coming Soon</span>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Philosophy strip ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl sm:text-3xl font-light leading-relaxed tracking-wide mb-6 text-gray-100">
            "The URL is the content.
            <br className="hidden sm:block" /> The container is the intention.
            <br className="hidden sm:block" /> The community is the context."
          </p>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Connexted does not care what format your content is in. It cares what you are doing with it. A Pitch invites review and feedback. A Sprint commits to time-boxed work. A Build documents something being made. A Library curates resources worth returning to. Whether the content behind any of these is a slide deck, a YouTube video, a Claude Project URL, or a custom GPT is entirely irrelevant — because the container defines the intention, not the file type.
          </p>
        </div>
      </section>

      {/* ── What makes us different ──────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What makes Connexted meaningfully different
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Five specific claims. None of them are features that competitors have and we lack. They are areas where the underlying design is genuinely different.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {DIFFERENTIATORS.map((d, i) => {
              const Icon = d.icon;
              return (
                <Card
                  key={i}
                  className="border-2 border-transparent hover:border-gray-200 hover:shadow-lg transition-all"
                >
                  <CardContent className="pt-6">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${d.iconBg}`}
                    >
                      <Icon className={`w-6 h-6 ${d.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">
                      {d.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-sm">{d.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Who this is for ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-cyan-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Who this is for
            </h2>
            <p className="text-xl text-gray-600">
              Three kinds of professional whose tools have let them down in the same way
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PERSONAS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Card
                  key={i}
                  className={`border-2 ${p.borderColor} hover:shadow-lg transition-all`}
                >
                  <CardContent className="pt-6">
                    <div
                      className={`w-12 h-12 rounded-full ${p.iconBg} flex items-center justify-center mb-4`}
                    >
                      <Icon className={`w-6 h-6 ${p.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{p.title}</h3>
                    <p className={`text-sm font-medium mb-4 ${p.labelColor}`}>{p.label}</p>
                    <p className="text-gray-600 leading-relaxed mb-4 text-sm">{p.description}</p>
                    <div
                      className={`${p.accentBg} rounded-lg p-3 border-l-4 ${p.accentBorder}`}
                    >
                      <p className={`text-sm font-medium italic ${p.accentText}`}>{p.moment}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              The reviews we are building toward
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These are imagined — written to represent the kinds of outcomes Connexted is designed to produce. They are not real testimonials yet. They are the ones we are working to earn.
            </p>
          </div>

          {/* Imagined disclaimer */}
          <div className="mb-12 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-start gap-3 max-w-3xl mx-auto">
            <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>A note on what follows:</strong> Every review below is imagined — written to reflect the specific problems Connexted was built to solve and the outcomes we believe it will produce for the right members. The names, roles, and situations are hypothetical composites of the professional archetypes this platform was designed for. The problems they describe are real. As the platform grows, these are the stories we intend to replace with actual member voices.
            </p>
          </div>

          {/* Masonry grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="break-inside-avoid mb-6">
                <Card className="border border-gray-200 hover:shadow-md transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, s) => (
                        <Star
                          key={s}
                          className="w-4 h-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 leading-relaxed mb-4 text-sm">
                      "{t.text}"
                    </blockquote>
                    <div className="border-t pt-3">
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                      <p className="text-xs text-gray-400">{t.location}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why not the alternatives ─────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why not the alternatives?
            </h2>
            <p className="text-xl text-gray-600">
              The honest version of the comparison
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ALTERNATIVES.map((alt, i) => (
              <Card
                key={i}
                className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{alt.name}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{alt.verdict}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access Options ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How you can participate
            </h2>
            <p className="text-xl text-gray-600">
              Three participation levels — each one a real step in the platform, not a marketing abstraction
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guest */}
            <Card className="border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Eye className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Guest</h3>
                  <p className="text-sm text-gray-500 mb-1 font-medium">No account required</p>
                  <p className="text-sm text-gray-500 mb-4">Browse the platform and see what is here before committing to anything</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {[
                    'Browse public profiles and portfolios',
                    'View published courses and programs',
                    'Explore circles and learning pathways',
                    'Discover practitioners by topic',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Member */}
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg transition-all relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST COMMON
              </div>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Member</h3>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Account required · Paid tier</p>
                  <p className="text-sm text-gray-500 mb-4">Join circles and programs, build your profile, and make your work visible</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {[
                    'Full profile with portfolio and credentials',
                    'Join circles, cohorts, and programs',
                    'Post, comment, and attend events',
                    'Track progress across learning journeys',
                    'Earn badges and pathway credentials',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Leader */}
            <Card className="border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">Leader</h3>
                  <p className="text-sm text-gray-500 mb-1 font-medium">Account required · Higher tier</p>
                  <p className="text-sm text-gray-500 mb-4">Create and run circles, design programs and pathways, issue credentials to members</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {[
                    'Everything in Member',
                    'Create and host your own circles',
                    'Design courses, programs, and pathways',
                    'Issue badges and credentials to members',
                    'Commerce-grade enrollment and ticket management',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-500 text-sm mb-6">
              The platform uses a ten-class access model. Guest and Member cover the first four classes. Circle Leader and Program Leader are distinct named tiers above that.{' '}
              <a href="/pricing" className="text-indigo-600 hover:underline font-medium">See full tier breakdown →</a>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700"
              >
                Sign In
              </Button>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Claim Your Invite
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-full mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Stay in the Loop
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Get the latest updates, insights, and member stories delivered to your inbox
            </p>
            <p className="text-sm text-gray-500">
              Join our newsletter • No spam • Unsubscribe anytime
            </p>
          </div>

          {platformSettings.newsletter_form_id && platformSettings.newsletter_script_url ? (
            <Card className="border-2 border-indigo-100 shadow-lg">
              <CardContent className="pt-8 pb-8">
                <KitForm
                  formId={platformSettings.newsletter_form_id}
                  scriptSrc={platformSettings.newsletter_script_url}
                  className="kit-form-newsletter"
                  useIframe={true}
                />
              </CardContent>
            </Card>
          ) : platformSettings.newsletter_button_url ? (
            <div className="text-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-lg px-8 py-6"
                onClick={() =>
                  window.open(platformSettings.newsletter_button_url, '_blank')
                }
              >
                {platformSettings.newsletter_button_text || 'Subscribe to Newsletter'}
              </Button>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600 mb-2">Newsletter signup not configured</p>
              <p className="text-sm text-gray-500">
                Configure ConvertKit integration in Platform Settings
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            {['Weekly insights', 'Member highlights', 'Early access to features'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <PublicFooter
        footerAboutUrl={platformSettings.footer_about_url}
        footerContactUrl={platformSettings.footer_contact_url}
        footerPrivacyUrl={platformSettings.footer_privacy_url}
        footerTermsUrl={platformSettings.footer_terms_url}
        footerEmailLink={platformSettings.footer_email_link}
        footerWebsiteLink={platformSettings.footer_website_link}
      />
    </div>
  );
}