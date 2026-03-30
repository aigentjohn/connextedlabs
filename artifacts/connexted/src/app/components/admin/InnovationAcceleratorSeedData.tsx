// Split candidate: ~550 lines — consider extracting SeedDataPreviewTable, SeedProgressIndicator, and SeedCategoryToggles into sub-components.
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Rocket, CheckCircle, AlertCircle } from 'lucide-react';

interface SeedStatus {
  program?: boolean;
  journeys?: boolean;
  containers?: boolean;
  sessions?: boolean;
  journeyItems?: boolean;
}

export default function InnovationAcceleratorSeedData() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SeedStatus>({});
  const [programId, setProgramId] = useState<string | null>(null);

  const createSeedData = async () => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);
      setStatus({});

      // Step 1: Create Program
      toast.info('Creating Innovation Accelerator program...');
      const programData = {
        name: 'Innovation Accelerator',
        slug: 'innovation-accelerator',
        description: 'A 12-week intensive program to transform your innovative idea into a market-ready product. Learn lean startup methodology, validate your concept, build an MVP, and prepare for launch.',
        program_type: 'bootcamp',
        status: 'published',
        visibility: 'public',
        duration_weeks: 12,
        application_required: true,
        max_capacity: 30,
        admin_ids: [profile.id],
        member_ids: [profile.id],
        created_by: profile.id,
        tags: ['innovation', 'startup', 'entrepreneurship', 'product-development'],
        outcomes: [
          'Validate your business idea with real customer feedback',
          'Build a working MVP using lean methodologies',
          'Develop a go-to-market strategy',
          'Create investor-ready pitch materials',
          'Build a network of fellow entrepreneurs and mentors'
        ]
      };

      const { data: program, error: programError } = await supabase
        .from('programs')
        .insert(programData)
        .select()
        .single();

      if (programError) throw programError;
      setProgramId(program.id);
      setStatus(prev => ({ ...prev, program: true }));
      toast.success('Program created');

      // Step 2: Create Journeys
      toast.info('Creating 6 program journeys...');
      const journeys = [
        {
          name: 'Foundation: Ideation & Validation',
          description: 'Discover and validate your breakthrough idea through customer development and market research.',
          order_index: 0,
          status: 'published'
        },
        {
          name: 'Discovery: Customer Development',
          description: 'Master customer interviews, identify pain points, and validate problem-solution fit.',
          order_index: 1,
          status: 'published'
        },
        {
          name: 'Build: MVP Development',
          description: 'Design and build your minimum viable product using lean and agile principles.',
          order_index: 2,
          status: 'published'
        },
        {
          name: 'Launch: Go-to-Market Strategy',
          description: 'Create your marketing strategy, pricing model, and customer acquisition plan.',
          order_index: 3,
          status: 'published'
        },
        {
          name: 'Scale: Growth & Metrics',
          description: 'Implement growth strategies, track key metrics, and optimize your business model.',
          order_index: 4,
          status: 'published'
        },
        {
          name: 'Showcase: Pitch & Demo Day',
          description: 'Prepare your pitch, create demo materials, and present to investors and stakeholders.',
          order_index: 5,
          status: 'published'
        }
      ];

      const journeysToInsert = journeys.map(j => ({
        ...j,
        program_id: program.id
      }));

      const { data: createdJourneys, error: journeysError } = await supabase
        .from('program_journeys')
        .insert(journeysToInsert)
        .select();

      if (journeysError) throw journeysError;
      setStatus(prev => ({ ...prev, journeys: true }));
      toast.success('6 journeys created');

      // Step 3: Create Containers
      toast.info('Creating program containers...');
      const containers = [
        // Tables for collaborative work
        {
          type: 'tables',
          name: 'Idea Board',
          description: 'Share and discuss innovative ideas with your cohort',
          slug: 'innovation-accelerator-idea-board'
        },
        {
          type: 'tables',
          name: 'Customer Insights',
          description: 'Document customer interview findings and insights',
          slug: 'innovation-accelerator-customer-insights'
        },
        // Sprints for MVP development
        {
          type: 'sprints',
          name: 'MVP Sprint',
          description: 'Build your minimum viable product in focused sprints',
          slug: 'innovation-accelerator-mvp-sprint'
        },
        // Standups for progress tracking
        {
          type: 'standups',
          name: 'Weekly Progress Updates',
          description: 'Share weekly progress, blockers, and wins',
          slug: 'innovation-accelerator-standups'
        },
        // Meetups for networking
        {
          type: 'meetups',
          name: 'Founder Meetups',
          description: 'Monthly networking with fellow entrepreneurs',
          slug: 'innovation-accelerator-meetups'
        },
        // Pitches for presentation practice
        {
          type: 'pitches',
          name: 'Pitch Practice Sessions',
          description: 'Practice and refine your investor pitch',
          slug: 'innovation-accelerator-pitches'
        },
        // Workshops
        {
          type: 'workshops',
          name: 'Lean Startup Workshop',
          description: 'Learn lean startup methodology',
          slug: 'innovation-accelerator-lean-workshop'
        },
        {
          type: 'workshops',
          name: 'Market Research Workshop',
          description: 'Master market research techniques',
          slug: 'innovation-accelerator-market-research'
        }
      ];

      const containerIds: Record<string, string> = {};

      for (const container of containers) {
        const containerData: any = {
          name: container.name,
          description: container.description,
          slug: container.slug,
          created_by: profile.id,
          admin_ids: [profile.id],
          member_ids: [profile.id]
        };

        const { data: createdContainer, error: containerError } = await supabase
          .from(container.type)
          .insert(containerData)
          .select()
          .single();

        if (containerError) throw containerError;
        containerIds[container.slug] = createdContainer.id;
      }

      setStatus(prev => ({ ...prev, containers: true }));
      toast.success('8 containers created');

      // Step 4: Create Session Templates
      toast.info('Creating session templates...');
      const sessions = [
        {
          name: 'Week 1: Program Kickoff & Orientation',
          description: 'Welcome to the Innovation Accelerator! Meet your cohort, understand the curriculum, and set your goals.',
          session_type: 'class',
          duration_minutes: 90,
          template_order: 1,
          journey_id: createdJourneys[0].id
        },
        {
          name: 'Week 2: Ideation Workshop',
          description: 'Generate and evaluate innovative ideas using structured brainstorming techniques.',
          session_type: 'workshop',
          duration_minutes: 120,
          template_order: 2,
          journey_id: createdJourneys[0].id
        },
        {
          name: 'Week 3: Customer Discovery Workshop',
          description: 'Learn customer interview techniques and start validating your assumptions.',
          session_type: 'workshop',
          duration_minutes: 120,
          template_order: 3,
          journey_id: createdJourneys[1].id
        },
        {
          name: 'Week 4: Problem-Solution Fit',
          description: 'Analyze interview data and validate problem-solution fit.',
          session_type: 'class',
          duration_minutes: 90,
          template_order: 4,
          journey_id: createdJourneys[1].id
        },
        {
          name: 'Week 5: MVP Planning Session',
          description: 'Define your MVP scope, features, and development roadmap.',
          session_type: 'workshop',
          duration_minutes: 120,
          template_order: 5,
          journey_id: createdJourneys[2].id
        },
        {
          name: 'Week 6: MVP Sprint Review',
          description: 'Demo your MVP progress and get feedback from mentors.',
          session_type: 'meeting',
          duration_minutes: 90,
          template_order: 6,
          journey_id: createdJourneys[2].id
        },
        {
          name: 'Week 7: Go-to-Market Strategy',
          description: 'Develop your marketing and customer acquisition strategy.',
          session_type: 'class',
          duration_minutes: 120,
          template_order: 7,
          journey_id: createdJourneys[3].id
        },
        {
          name: 'Week 8: Pricing & Business Model',
          description: 'Define your pricing strategy and revenue model.',
          session_type: 'workshop',
          duration_minutes: 90,
          template_order: 8,
          journey_id: createdJourneys[3].id
        },
        {
          name: 'Week 9: Growth Metrics Workshop',
          description: 'Identify and track your key performance indicators.',
          session_type: 'workshop',
          duration_minutes: 120,
          template_order: 9,
          journey_id: createdJourneys[4].id
        },
        {
          name: 'Week 10: Pitch Deck Workshop',
          description: 'Create a compelling investor pitch deck.',
          session_type: 'workshop',
          duration_minutes: 120,
          template_order: 10,
          journey_id: createdJourneys[5].id
        },
        {
          name: 'Week 11: Pitch Practice',
          description: 'Practice your pitch and get feedback from peers and mentors.',
          session_type: 'meeting',
          duration_minutes: 90,
          template_order: 11,
          journey_id: createdJourneys[5].id
        },
        {
          name: 'Week 12: Demo Day & Graduation',
          description: 'Present your final pitch to investors, stakeholders, and the community.',
          session_type: 'event',
          duration_minutes: 180,
          template_order: 12,
          journey_id: createdJourneys[5].id
        }
      ];

      const sessionsToInsert = sessions.map(s => ({
        ...s,
        program_id: program.id,
        is_template: true,
        status: 'unscheduled'
      }));

      const { error: sessionsError } = await supabase
        .from('sessions')
        .insert(sessionsToInsert);

      if (sessionsError) throw sessionsError;
      setStatus(prev => ({ ...prev, sessions: true }));
      toast.success('12 session templates created');

      // Step 5: Link Containers to Journeys
      toast.info('Linking containers to journeys...');
      const journeyItems = [
        // Journey 1: Foundation
        {
          journey_id: createdJourneys[0].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-idea-board'],
          title: 'Idea Board',
          description: 'Share your innovative ideas and get feedback from peers',
          order_index: 0,
          is_published: true,
        },
        {
          journey_id: createdJourneys[0].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-lean-workshop'],
          title: 'Lean Startup Workshop',
          description: 'Learn the fundamentals of lean startup methodology',
          order_index: 1,
          is_published: true,
        },
        // Journey 2: Discovery
        {
          journey_id: createdJourneys[1].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-customer-insights'],
          title: 'Customer Insights Table',
          description: 'Document your customer interview findings',
          order_index: 0,
          is_published: true,
        },
        {
          journey_id: createdJourneys[1].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-market-research'],
          title: 'Market Research Workshop',
          description: 'Deep dive into market research techniques',
          order_index: 1,
          is_published: true,
        },
        // Journey 3: Build
        {
          journey_id: createdJourneys[2].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-mvp-sprint'],
          title: 'MVP Sprint',
          description: 'Build your MVP in focused sprints',
          order_index: 0,
          is_published: true,
        },
        {
          journey_id: createdJourneys[2].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-standups'],
          title: 'Weekly Progress Updates',
          description: 'Share your progress with the team',
          order_index: 1,
          is_published: true,
        },
        // Journey 4: Launch
        {
          journey_id: createdJourneys[3].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-standups'],
          title: 'Launch Planning Updates',
          description: 'Coordinate your go-to-market activities',
          order_index: 0,
          is_published: true,
        },
        // Journey 5: Scale
        {
          journey_id: createdJourneys[4].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-standups'],
          title: 'Growth Metrics Check-ins',
          description: 'Review your growth metrics weekly',
          order_index: 0,
          is_published: true,
        },
        {
          journey_id: createdJourneys[4].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-meetups'],
          title: 'Founder Networking',
          description: 'Connect with fellow entrepreneurs',
          order_index: 1,
          is_published: true,
        },
        // Journey 6: Showcase
        {
          journey_id: createdJourneys[5].id,
          item_type: 'container',
          item_id: containerIds['innovation-accelerator-pitches'],
          title: 'Pitch Practice',
          description: 'Practice and refine your investor pitch',
          order_index: 0,
          is_published: true,
        }
      ];

      const itemsToInsert = journeyItems.map(item => ({
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from('journey_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
      setStatus(prev => ({ ...prev, journeyItems: true }));
      toast.success('Containers linked to journeys');

      // Success!
      toast.success('🎉 Innovation Accelerator program created successfully!');
      toast.info('Navigate to Programs to view your new program');

    } catch (error: any) {
      console.error('Error creating seed data:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allComplete = status.program && status.journeys && status.containers && status.sessions && status.journeyItems;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Rocket className="w-8 h-8 text-indigo-600" />
            <div>
              <CardTitle>Innovation Accelerator Seed Data</CardTitle>
              <CardDescription>
                Generate a complete example program with journeys, containers, sessions, and content
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What This Creates</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="font-medium">A complete 12-week Innovation Accelerator program with:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>1 Published program with rich description and outcomes</li>
                <li>6 Journeys (phases) covering the full curriculum</li>
                <li>8 Containers (tables, sprints, meetups, workshops, etc.)</li>
                <li>12 Session templates (unscheduled - ready to schedule when cohort starts)</li>
                <li>10 Journey items (containers linked to specific journeys)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {(loading || Object.keys(status).length > 0) && (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold mb-3">Progress:</h3>
                <div className="space-y-2">
                  <StatusItem label="Program Created" complete={status.program} loading={loading && !status.program} />
                  <StatusItem label="6 Journeys Created" complete={status.journeys} loading={loading && status.program && !status.journeys} />
                  <StatusItem label="8 Containers Created" complete={status.containers} loading={loading && status.journeys && !status.containers} />
                  <StatusItem label="12 Session Templates" complete={status.sessions} loading={loading && status.containers && !status.sessions} />
                  <StatusItem label="Journey Items Linked" complete={status.journeyItems} loading={loading && status.sessions && !status.journeyItems} />
                </div>
              </CardContent>
            </Card>
          )}

          {allComplete && programId && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Success!</AlertTitle>
              <AlertDescription className="text-green-800">
                <p className="mb-2">Innovation Accelerator program created successfully!</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/programs/innovation-accelerator`}>View Program</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/program-admin/${programId}/setup`}>Manage Journeys</a>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={createSeedData} 
              disabled={loading || allComplete}
              size="lg"
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {allComplete ? '✓ Seed Data Created' : 'Create Innovation Accelerator'}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              This will create real data in your database. Sessions are created as templates (unscheduled) -
              you can schedule them later when you have confirmed student enrollment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ label, complete, loading }: { label: string; complete?: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
      {complete && <CheckCircle className="w-4 h-4 text-green-600" />}
      {!loading && !complete && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
      <span className={complete ? 'text-green-900 font-medium' : 'text-gray-600'}>{label}</span>
    </div>
  );
}