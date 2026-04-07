import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Loader2,
  Hash,
  Tag as TagIcon,
  FileText,
  Book,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface SeedProgress {
  phase: string;
  current: number;
  total: number;
  status: 'pending' | 'running' | 'complete' | 'error';
  message: string;
}

interface SeedResults {
  topics: { success: number; failed: number; ids: string[] };
  tags: { success: number; failed: number; ids: string[] };
  documents: { success: number; failed: number; ids: string[] };
  books: { success: number; failed: number; ids: string[] };
  decks: { success: number; failed: number; ids: string[] };
  topicLinks: { success: number; failed: number };
  tagLinks: { success: number; failed: number };
  errors: string[];
}

// Seed Data Definitions
const SEED_TOPICS = [
  // AUDIENCE Topics
  { name: 'Job Seekers', slug: 'job-seekers', icon: '🎯', color: '#3B82F6', type: 'audience', description: 'For professionals actively searching for new career opportunities' },
  { name: 'Career Changers', slug: 'career-changers', icon: '🔄', color: '#8B5CF6', type: 'audience', description: 'Transitioning from one career field to another' },
  { name: 'Entrepreneurs', slug: 'entrepreneurs', icon: '🚀', color: '#EF4444', type: 'audience', description: 'Building and scaling their own businesses' },
  { name: 'Startup Founders', slug: 'startup-founders', icon: '💡', color: '#F59E0B', type: 'audience', description: 'Early-stage company founders and co-founders' },
  { name: 'Students', slug: 'students', icon: '🎓', color: '#10B981', type: 'audience', description: 'Currently enrolled in educational programs' },
  { name: 'Freelancers', slug: 'freelancers', icon: '💼', color: '#6366F1', type: 'audience', description: 'Independent professionals and consultants' },
  { name: 'Product Managers', slug: 'product-managers', icon: '📊', color: '#EC4899', type: 'audience', description: 'Managing product strategy and development' },
  { name: 'Engineers', slug: 'engineers', icon: '⚙️', color: '#14B8A6', type: 'audience', description: 'Software developers and technical professionals' },
  { name: 'Designers', slug: 'designers', icon: '🎨', color: '#F97316', type: 'audience', description: 'UX/UI and product designers' },
  { name: 'Marketers', slug: 'marketers', icon: '📢', color: '#A855F7', type: 'audience', description: 'Marketing and growth professionals' },

  // PURPOSE Topics
  { name: 'Career Transition', slug: 'career-transition', icon: '🌉', color: '#0EA5E9', type: 'purpose', description: 'Making major career changes and pivots' },
  { name: 'Skill Development', slug: 'skill-development', icon: '📚', color: '#22C55E', type: 'purpose', description: 'Building new professional capabilities' },
  { name: 'Networking', slug: 'networking', icon: '🤝', color: '#F59E0B', type: 'purpose', description: 'Building professional relationships and connections' },
  { name: 'Launch Business', slug: 'launch-business', icon: '🎯', color: '#EF4444', type: 'purpose', description: 'Starting a new company or venture' },
  { name: 'Raise Funding', slug: 'raise-funding', icon: '💰', color: '#8B5CF6', type: 'purpose', description: 'Securing investment for your startup' },
  { name: 'Build MVP', slug: 'build-mvp', icon: '🛠️', color: '#14B8A6', type: 'purpose', description: 'Creating a minimum viable product' },
  { name: 'Find Co-founder', slug: 'find-cofounder', icon: '👥', color: '#EC4899', type: 'purpose', description: 'Seeking a business partner' },
  { name: 'Get Mentorship', slug: 'get-mentorship', icon: '🎓', color: '#6366F1', type: 'purpose', description: 'Finding guidance and advice from experienced professionals' },

  // THEME Topics  
  { name: 'Artificial Intelligence', slug: 'ai', icon: '🤖', color: '#7C3AED', type: 'theme', description: 'AI, machine learning, and automation technologies' },
  { name: 'Web3 & Blockchain', slug: 'web3', icon: '⛓️', color: '#0891B2', type: 'theme', description: 'Decentralized technologies and cryptocurrencies' },
  { name: 'SaaS', slug: 'saas', icon: '☁️', color: '#2563EB', type: 'theme', description: 'Software as a Service businesses and products' },
  { name: 'HealthTech', slug: 'healthtech', icon: '🏥', color: '#DC2626', type: 'theme', description: 'Healthcare innovation and medical technology' },
  { name: 'FinTech', slug: 'fintech', icon: '💳', color: '#059669', type: 'theme', description: 'Financial technology and digital banking' },
  { name: 'EdTech', slug: 'edtech', icon: '📖', color: '#D97706', type: 'theme', description: 'Educational technology and online learning' },
  { name: 'Climate Tech', slug: 'climate-tech', icon: '🌍', color: '#16A34A', type: 'theme', description: 'Sustainability and environmental solutions' },
  { name: 'Remote Work', slug: 'remote-work', icon: '🏠', color: '#0D9488', type: 'theme', description: 'Distributed teams and remote-first culture' },
];

const SEED_TAGS = [
  // SUBJECT Tags (What)
  { name: 'Resume Writing', slug: 'resume-writing', type: 'what', description: 'Creating effective resumes and CVs', category: 'career' },
  { name: 'Interview Prep', slug: 'interview-prep', type: 'what', description: 'Preparing for job interviews', category: 'career' },
  { name: 'Pitch Decks', slug: 'pitch-decks', type: 'what', description: 'Creating investor presentations', category: 'business' },
  { name: 'Business Models', slug: 'business-models', type: 'what', description: 'Revenue and business strategy frameworks', category: 'business' },
  { name: 'Product Strategy', slug: 'product-strategy', type: 'what', description: 'Product planning and roadmapping', category: 'business' },
  { name: 'User Research', slug: 'user-research', type: 'what', description: 'Understanding customer needs', category: 'business' },
  { name: 'Growth Hacking', slug: 'growth-hacking', type: 'what', description: 'Rapid growth strategies', category: 'business' },
  { name: 'Fundraising', slug: 'fundraising', type: 'what', description: 'Raising capital from investors', category: 'business' },
  { name: 'Team Building', slug: 'team-building', type: 'what', description: 'Hiring and managing teams', category: 'business' },
  { name: 'Marketing Strategy', slug: 'marketing-strategy', type: 'what', description: 'Marketing planning and execution', category: 'business' },
  { name: 'Sales Techniques', slug: 'sales-techniques', type: 'what', description: 'Selling products and services', category: 'business' },
  { name: 'Leadership', slug: 'leadership', type: 'what', description: 'Managing and inspiring teams', category: 'career' },
  { name: 'Personal Branding', slug: 'personal-branding', type: 'what', description: 'Building your professional reputation', category: 'career' },
  { name: 'Negotiation', slug: 'negotiation', type: 'what', description: 'Deal-making and conflict resolution', category: 'career' },

  // METHOD Tags (How)
  { name: 'Step-by-Step Guide', slug: 'step-by-step', type: 'how', description: 'Structured tutorials with clear steps', category: 'format' },
  { name: 'Template', slug: 'template', type: 'how', description: 'Ready-to-use frameworks and documents', category: 'format' },
  { name: 'Case Study', slug: 'case-study', type: 'how', description: 'Real-world examples and analysis', category: 'format' },
  { name: 'Video Tutorial', slug: 'video-tutorial', type: 'how', description: 'Visual learning content', category: 'format' },
  { name: 'Worksheet', slug: 'worksheet', type: 'how', description: 'Interactive exercises and activities', category: 'format' },
  { name: 'List', slug: 'checklist', type: 'how', description: 'Task lists and verification items', category: 'format' },
  { name: 'Framework', slug: 'framework', type: 'how', description: 'Conceptual models and approaches', category: 'format' },
  { name: 'Tool', slug: 'tool', type: 'how', description: 'Software and applications', category: 'format' },
  { name: 'Article', slug: 'article', type: 'how', description: 'Written content and blog posts', category: 'format' },
  { name: 'Podcast', slug: 'podcast', type: 'how', description: 'Audio content and interviews', category: 'format' },
];

const SEED_DOCUMENTS = [
  {
    title: 'The Ultimate Resume Template for Tech Jobs',
    url: 'https://docs.google.com/document/d/example-resume-tech',
    description: 'A proven resume template that helped 100+ engineers land FAANG jobs. Includes sections for technical skills, projects, and achievements.',
    topics: ['job-seekers', 'engineers', 'career-transition'],
    tags: ['resume-writing', 'template', 'step-by-step']
  },
  {
    title: 'YC Startup School: How to Build an MVP in 30 Days',
    url: 'https://www.youtube.com/watch?v=example-mvp',
    description: 'Step-by-step guide from Y Combinator on validating your idea and shipping your first product quickly.',
    topics: ['startup-founders', 'entrepreneurs', 'build-mvp'],
    tags: ['product-strategy', 'step-by-step', 'video-tutorial']
  },
  {
    title: 'Pitch Deck Template That Raised $2M Seed Round',
    url: 'https://docs.google.com/presentation/d/example-pitch',
    description: 'The exact pitch deck structure used to raise funding from top-tier VCs. Includes storytelling framework.',
    topics: ['startup-founders', 'raise-funding'],
    tags: ['pitch-decks', 'template', 'fundraising']
  },
  {
    title: 'Career Transition Roadmap: From Corporate to Startup',
    url: 'https://medium.com/example-career-transition',
    description: 'A comprehensive guide for making the leap from corporate jobs to startup life, including financial planning.',
    topics: ['career-changers', 'entrepreneurs', 'career-transition'],
    tags: ['step-by-step', 'article', 'personal-branding']
  },
  {
    title: 'Interview Prep Checklist for Product Managers',
    url: 'https://notion.so/example-pm-interview',
    description: 'Everything you need to prepare for PM interviews at top tech companies. Covers case studies, frameworks, and questions.',
    topics: ['product-managers', 'job-seekers'],
    tags: ['interview-prep', 'checklist', 'framework']
  },
  {
    title: 'AI Product Launch Playbook',
    url: 'https://www.example.com/ai-launch-playbook',
    description: 'How to launch and market AI-powered products in 2024. Includes positioning, messaging, and go-to-market strategy.',
    topics: ['ai', 'startup-founders', 'launch-business'],
    tags: ['product-strategy', 'marketing-strategy', 'framework']
  },
  {
    title: 'Remote Team Management Best Practices',
    url: 'https://docs.google.com/document/d/example-remote-team',
    description: 'Practical tips for managing distributed teams effectively. Covers communication, culture, and productivity.',
    topics: ['remote-work', 'entrepreneurs'],
    tags: ['team-building', 'leadership', 'article']
  },
  {
    title: 'Freelancer Rate Calculator & Negotiation Guide',
    url: 'https://www.example.com/freelancer-rates',
    description: 'Calculate your hourly rate and learn how to negotiate with clients. Includes contract templates.',
    topics: ['freelancers', 'networking'],
    tags: ['negotiation', 'tool', 'template']
  },
  {
    title: 'SaaS Metrics Dashboard Template',
    url: 'https://docs.google.com/spreadsheets/d/example-saas-metrics',
    description: 'Track your key SaaS metrics (MRR, churn, CAC, LTV) with this ready-to-use spreadsheet template.',
    topics: ['saas', 'entrepreneurs', 'startup-founders'],
    tags: ['business-models', 'template', 'framework']
  },
  {
    title: 'LinkedIn Profile Optimization for Job Seekers',
    url: 'https://www.youtube.com/watch?v=example-linkedin',
    description: 'How to optimize your LinkedIn profile to attract recruiters and hiring managers. Includes headline formulas.',
    topics: ['job-seekers', 'networking'],
    tags: ['personal-branding', 'video-tutorial', 'step-by-step']
  },
];

const SEED_BOOKS = [
  {
    title: 'Product-Market Fit Checklist',
    description: 'A systematic checklist for validating product-market fit across different customer segments.',
    category: 'Lists',
    topics: ['startup-founders', 'entrepreneurs', 'build-mvp'],
    tags: ['product-strategy', 'checklist', 'framework']
  },
  {
    title: 'Weekly Standup Template for Remote Teams',
    description: 'Structure your weekly team updates with this async standup template designed for distributed teams.',
    category: 'Templates',
    topics: ['remote-work', 'entrepreneurs'],
    tags: ['team-building', 'template']
  },
  {
    title: 'User Interview Question Bank',
    description: 'Over 50 proven user research questions organized by research goal and product stage.',
    category: 'Resources',
    topics: ['product-managers', 'designers', 'startup-founders'],
    tags: ['user-research', 'framework', 'worksheet']
  },
  {
    title: 'Fundraising Email Templates',
    description: 'Cold outreach templates for connecting with investors, including subject lines and follow-ups.',
    category: 'Templates',
    topics: ['startup-founders', 'raise-funding'],
    tags: ['fundraising', 'template', 'step-by-step']
  },
  {
    title: '30-60-90 Day Onboarding Plan',
    description: 'A structured onboarding plan template for new hires to hit the ground running.',
    category: 'Templates',
    topics: ['entrepreneurs', 'product-managers'],
    tags: ['team-building', 'template', 'leadership']
  },
];

const SEED_DECKS = [
  {
    title: 'The Complete Startup Fundraising Guide',
    description: 'Everything you need to know about raising a seed round, from pitch deck to term sheet negotiation.',
    topics: ['startup-founders', 'raise-funding'],
    tags: ['fundraising', 'pitch-decks', 'framework']
  },
  {
    title: 'Growth Marketing Playbook for SaaS',
    description: 'Proven growth strategies and tactics for scaling SaaS products from 0 to 10k users.',
    topics: ['saas', 'marketers', 'startup-founders'],
    tags: ['growth-hacking', 'marketing-strategy', 'case-study']
  },
  {
    title: 'Design System Starter Kit',
    description: 'Build a scalable design system from scratch with components, tokens, and documentation templates.',
    topics: ['designers', 'engineers', 'startup-founders'],
    tags: ['framework', 'template']
  },
  {
    title: 'Customer Discovery Framework',
    description: 'A comprehensive framework for conducting customer interviews and validating assumptions.',
    topics: ['entrepreneurs', 'startup-founders', 'build-mvp'],
    tags: ['user-research', 'framework', 'step-by-step']
  },
];

export default function TopicsTagsSeeder() {
  const { profile } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<SeedProgress[]>([]);
  const [results, setResults] = useState<SeedResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  const updateProgress = (
    phase: string,
    current: number,
    total: number,
    status: SeedProgress['status'],
    message: string
  ) => {
    setProgress((prev) => {
      const existing = prev.find((p) => p.phase === phase);
      if (existing) {
        return prev.map((p) =>
          p.phase === phase ? { phase, current, total, status, message } : p
        );
      } else {
        return [...prev, { phase, current, total, status, message }];
      }
    });
  };

  const startSeeding = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will create Topics, Tags, and Content in your database.\n\n' +
        'This seed data includes:\n' +
        `- ${SEED_TOPICS.length} Topics (audience, purpose, theme)\n` +
        `- ${SEED_TAGS.length} Tags (subject, method)\n` +
        `- ${SEED_DOCUMENTS.length} Documents\n` +
        `- ${SEED_BOOKS.length} Books\n` +
        `- ${SEED_DECKS.length} Decks\n\n` +
        'Continue with seeding?'
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setProgress([]);
    setShowResults(false);

    const seedResults: SeedResults = {
      topics: { success: 0, failed: 0, ids: [] },
      tags: { success: 0, failed: 0, ids: [] },
      documents: { success: 0, failed: 0, ids: [] },
      books: { success: 0, failed: 0, ids: [] },
      decks: { success: 0, failed: 0, ids: [] },
      topicLinks: { success: 0, failed: 0 },
      tagLinks: { success: 0, failed: 0 },
      errors: [],
    };

    try {
      // Get current user ID for created_by fields
      const currentUserId = profile?.id;
      if (!currentUserId) {
        throw new Error('Could not determine current user ID. Please make sure you are logged in.');
      }

      // Phase 1: Create Topics
      updateProgress('topics', 0, SEED_TOPICS.length, 'running', 'Creating topics...');
      const topicMap = new Map<string, string>(); // slug -> id

      for (let i = 0; i < SEED_TOPICS.length; i++) {
        const topic = SEED_TOPICS[i];
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/topics`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                ...topic,
                topic_type: topic.type,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            topicMap.set(topic.slug, data.topic.id);
            seedResults.topics.success++;
            seedResults.topics.ids.push(data.topic.id);
          } else {
            const errorText = await response.text();
            
            // Check for missing table error
            if (errorText.includes('PGRST205') || errorText.includes('Could not find the table')) {
              updateProgress('topics', 0, SEED_TOPICS.length, 'error', '❌ Database tables not found');
              throw new Error(
                '⚠️ DATABASE SETUP REQUIRED\n\n' +
                'The Topics & Tags tables do not exist in your database.\n\n' +
                'Unfortunately, Figma Make cannot automatically create these tables due to security restrictions.\n\n' +
                'To use this feature, you need to:\n' +
                '1. Access your Supabase dashboard\n' +
                '2. Create the required tables: topics, tags, topic_links, tag_links, topic_followers, tag_followers\n' +
                '3. Or contact your database administrator\n\n' +
                'This feature is currently not fully operational without manual database setup.'
              );
            }
            
            seedResults.topics.failed++;
            seedResults.errors.push(`Failed to create topic ${topic.name}: ${errorText}`);
          }
        } catch (error) {
          seedResults.topics.failed++;
          seedResults.errors.push(`Error creating topic ${topic.name}: ${String(error)}`);
        }

        updateProgress(
          'topics',
          i + 1,
          SEED_TOPICS.length,
          'running',
          `Created ${i + 1}/${SEED_TOPICS.length} topics`
        );
      }

      updateProgress(
        'topics',
        SEED_TOPICS.length,
        SEED_TOPICS.length,
        'complete',
        `Topics complete: ${seedResults.topics.success} success, ${seedResults.topics.failed} failed`
      );

      // Phase 2: Create Tags
      updateProgress('tags', 0, SEED_TAGS.length, 'running', 'Creating tags...');
      const tagMap = new Map<string, string>(); // slug -> id

      for (let i = 0; i < SEED_TAGS.length; i++) {
        const tag = SEED_TAGS[i];
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/tags/suggestions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                tag: tag.slug, // Use slug as the tag identifier
                type: tag.type, // 'what' or 'how'
                description: tag.description,
                category: tag.category,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            tagMap.set(tag.slug, data.tag.id);
            seedResults.tags.success++;
            seedResults.tags.ids.push(data.tag.id);
          } else {
            const errorText = await response.text();
            
            // Check for missing table error
            if (errorText.includes('PGRST205') || errorText.includes('Could not find the table')) {
              updateProgress('tags', 0, SEED_TAGS.length, 'error', '❌ Database tables not found');
              throw new Error(
                '⚠️ DATABASE SETUP REQUIRED\n\n' +
                'The Topics & Tags tables do not exist in your database.\n\n' +
                'You must run the database migrations first:\n' +
                '1. Go to Supabase Dashboard → SQL Editor\n' +
                '2. Run migration: 20260205000600_create_tag_suggestions_system.sql\n' +
                '3. Run migration: 20260205000700_create_topics_system.sql\n\n' +
                'See DATABASE_MIGRATIONS_REQUIRED.md for complete instructions.'
              );
            }
            
            seedResults.tags.failed++;
            seedResults.errors.push(`Failed to create tag ${tag.name}: ${errorText}`);
          }
        } catch (error) {
          seedResults.tags.failed++;
          seedResults.errors.push(`Error creating tag ${tag.name}: ${String(error)}`);
        }

        updateProgress(
          'tags',
          i + 1,
          SEED_TAGS.length,
          'running',
          `Created ${i + 1}/${SEED_TAGS.length} tags`
        );
      }

      updateProgress(
        'tags',
        SEED_TAGS.length,
        SEED_TAGS.length,
        'complete',
        `Tags complete: ${seedResults.tags.success} success, ${seedResults.tags.failed} failed`
      );

      // Phase 3: Create Documents with links
      updateProgress('documents', 0, SEED_DOCUMENTS.length, 'running', 'Creating documents...');

      for (let i = 0; i < SEED_DOCUMENTS.length; i++) {
        const doc = SEED_DOCUMENTS[i];
        try {
          const topicIds = doc.topics.map((slug) => topicMap.get(slug)).filter(Boolean);
          const tagIds = doc.tags.map((slug) => tagMap.get(slug)).filter(Boolean);

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/content/documents`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                title: doc.title,
                url: doc.url,
                description: doc.description,
                topicIds,
                tagIds,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            seedResults.documents.success++;
            seedResults.documents.ids.push(data.document.id);
            seedResults.topicLinks.success += topicIds.length;
            seedResults.tagLinks.success += tagIds.length;
          } else {
            const errorText = await response.text();
            seedResults.documents.failed++;
            seedResults.errors.push(`Failed to create document ${doc.title}: ${errorText}`);
          }
        } catch (error) {
          seedResults.documents.failed++;
          seedResults.errors.push(`Error creating document ${doc.title}: ${String(error)}`);
        }

        updateProgress(
          'documents',
          i + 1,
          SEED_DOCUMENTS.length,
          'running',
          `Created ${i + 1}/${SEED_DOCUMENTS.length} documents`
        );
      }

      updateProgress(
        'documents',
        SEED_DOCUMENTS.length,
        SEED_DOCUMENTS.length,
        'complete',
        `Documents complete: ${seedResults.documents.success} success`
      );

      // Phase 4: Create Books with links
      updateProgress('books', 0, SEED_BOOKS.length, 'running', 'Creating books...');

      for (let i = 0; i < SEED_BOOKS.length; i++) {
        const book = SEED_BOOKS[i];
        try {
          const topicIds = book.topics.map((slug) => topicMap.get(slug)).filter(Boolean);
          const tagIds = book.tags.map((slug) => tagMap.get(slug)).filter(Boolean);

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/content/books`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                title: book.title,
                description: book.description,
                category: book.category,
                topicIds,
                tagIds,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            seedResults.books.success++;
            seedResults.books.ids.push(data.book.id);
            seedResults.topicLinks.success += topicIds.length;
            seedResults.tagLinks.success += tagIds.length;
          } else {
            const errorText = await response.text();
            seedResults.books.failed++;
            seedResults.errors.push(`Failed to create book ${book.title}: ${errorText}`);
          }
        } catch (error) {
          seedResults.books.failed++;
          seedResults.errors.push(`Error creating book ${book.title}: ${String(error)}`);
        }

        updateProgress(
          'books',
          i + 1,
          SEED_BOOKS.length,
          'running',
          `Created ${i + 1}/${SEED_BOOKS.length} books`
        );
      }

      updateProgress(
        'books',
        SEED_BOOKS.length,
        SEED_BOOKS.length,
        'complete',
        `Books complete: ${seedResults.books.success} success`
      );

      // Phase 5: Create Decks with links
      updateProgress('decks', 0, SEED_DECKS.length, 'running', 'Creating decks...');

      for (let i = 0; i < SEED_DECKS.length; i++) {
        const deck = SEED_DECKS[i];
        try {
          const topicIds = deck.topics.map((slug) => topicMap.get(slug)).filter(Boolean);
          const tagIds = deck.tags.map((slug) => tagMap.get(slug)).filter(Boolean);

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-d7930c7f/content/decks`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserId,
                title: deck.title,
                description: deck.description,
                topicIds,
                tagIds,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            seedResults.decks.success++;
            seedResults.decks.ids.push(data.deck.id);
            seedResults.topicLinks.success += topicIds.length;
            seedResults.tagLinks.success += tagIds.length;
          } else {
            const errorText = await response.text();
            seedResults.decks.failed++;
            seedResults.errors.push(`Failed to create deck ${deck.title}: ${errorText}`);
          }
        } catch (error) {
          seedResults.decks.failed++;
          seedResults.errors.push(`Error creating deck ${deck.title}: ${String(error)}`);
        }

        updateProgress(
          'decks',
          i + 1,
          SEED_DECKS.length,
          'running',
          `Created ${i + 1}/${SEED_DECKS.length} decks`
        );
      }

      updateProgress(
        'decks',
        SEED_DECKS.length,
        SEED_DECKS.length,
        'complete',
        `Decks complete: ${seedResults.decks.success} success`
      );

      // All done!
      setResults(seedResults);
      setShowResults(true);
      toast.success('Seed data creation complete!');
    } catch (error) {
      console.error('Seeding error:', error);
      seedResults.errors.push(`Critical error: ${String(error)}`);
      toast.error('Seeding failed. Check console for details.');
      setResults(seedResults);
      setShowResults(true);
    } finally {
      setIsSeeding(false);
    }
  };

  const getStatusIcon = (status: SeedProgress['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const progressPercentage =
    progress.length > 0
      ? Math.round(
          (progress.reduce((sum, p) => sum + (p.status === 'complete' ? 1 : 0), 0) /
            progress.length) *
            100
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Topics & Tags Seeder' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Topics, Tags & Content Seeder
          </CardTitle>
          <CardDescription>
            Create realistic seed data for testing the WHO/WHY (Topics) vs WHAT/HOW (Tags) taxonomy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seed Data Overview */}
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>What will be created:</AlertTitle>
            <AlertDescription>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-600" />
                  <span>
                    <strong>{SEED_TOPICS.length}</strong> Topics
                  </span>
                  <span className="text-xs text-gray-500">
                    (audience, purpose, theme)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-purple-600" />
                  <span>
                    <strong>{SEED_TAGS.length}</strong> Tags
                  </span>
                  <span className="text-xs text-gray-500">(subject, method)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>{SEED_DOCUMENTS.length}</strong> Documents
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Book className="w-4 h-4 text-green-600" />
                  <span>
                    <strong>{SEED_BOOKS.length}</strong> Books
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span>
                    <strong>{SEED_DECKS.length}</strong> Decks
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Start Button */}
          <div className="flex justify-center">
            <Button
              onClick={startSeeding}
              disabled={isSeeding}
              size="lg"
              className="w-full md:w-auto"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Seeding in Progress...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Seeding
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {progress.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-gray-600">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="space-y-3">
                {progress.map((p) => (
                  <div
                    key={p.phase}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getStatusIcon(p.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm capitalize">{p.phase}</span>
                        <span className="text-xs text-gray-600">
                          {p.current}/{p.total}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{p.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {showResults && results && (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>Seeding Complete!</AlertTitle>
              <AlertDescription>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Topics:</strong> {results.topics.success} created
                    </div>
                    <div>
                      <strong>Tags:</strong> {results.tags.success} created
                    </div>
                    <div>
                      <strong>Documents:</strong> {results.documents.success} created
                    </div>
                    <div>
                      <strong>Books:</strong> {results.books.success} created
                    </div>
                    <div>
                      <strong>Decks:</strong> {results.decks.success} created
                    </div>
                    <div>
                      <strong>Links:</strong> {results.topicLinks.success + results.tagLinks.success}{' '}
                      created
                    </div>
                  </div>

                  {results.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                      <p className="font-semibold text-red-900 mb-2">
                        Errors ({results.errors.length}):
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                        {results.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {results.errors.length > 10 && (
                          <li>... and {results.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/topics">
              <Hash className="w-4 h-4 mr-2" />
              Browse Topics
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/tags">
              <TagIcon className="w-4 h-4 mr-2" />
              Browse Tags
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/browse?type=documents">
              <FileText className="w-4 h-4 mr-2" />
              Browse Documents
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}