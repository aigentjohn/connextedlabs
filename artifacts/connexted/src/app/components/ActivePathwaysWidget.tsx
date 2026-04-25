import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface ActivePathway {
  pathway_id: string;
  progress_pct: number;
  enrolled_at: string;
  pathway: {
    id: string;
    name: string;
    description: string;
    color: string;
    destination: string;
    step_count: number;
  };
}

export default function ActivePathwaysWidget() {
  const { profile } = useAuth();
  const [active, setActive] = useState<ActivePathway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data } = await supabase
        .from('pathway_enrollments')
        .select(`
          pathway_id,
          progress_pct,
          enrolled_at,
          pathway:pathways(id, name, description, color, destination)
        `)
        .eq('user_id', profile!.id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false })
        .limit(5);

      if (!data) { setLoading(false); return; }

      // Fetch step counts separately (pathways don't embed them by default)
      const pathwayIds = data.map(d => d.pathway_id);
      const { data: stepCounts } = await supabase
        .from('pathway_steps')
        .select('pathway_id')
        .in('pathway_id', pathwayIds);

      const countMap: Record<string, number> = {};
      (stepCounts || []).forEach(s => {
        countMap[s.pathway_id] = (countMap[s.pathway_id] || 0) + 1;
      });

      setActive(
        data.map(d => ({
          ...d,
          pathway: { ...(d.pathway as any), step_count: countMap[d.pathway_id] || 0 },
        }))
      );
      setLoading(false);
    }

    load();
  }, [profile]);

  if (loading || active.length === 0) return null;

  return (
    <Card className="border-indigo-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base">Continue your pathways</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
            <Link to="/my-growth">
              View all <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {active.map(({ pathway_id, progress_pct, pathway }) => {
          const pct = Math.round(progress_pct || 0);
          const stepsLeft = pathway.step_count
            ? Math.ceil(pathway.step_count * (1 - pct / 100))
            : null;

          return (
            <div key={pathway_id} className="flex items-center gap-4">
              {/* Colour dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: pathway.color || '#6366f1' }}
              />

              {/* Text + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{pathway.name}</p>
                  <span className="text-xs text-gray-400 shrink-0">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                {stepsLeft !== null && stepsLeft > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stepsLeft} {stepsLeft === 1 ? 'step' : 'steps'} remaining
                  </p>
                )}
              </div>

              {/* CTA */}
              <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                <Link to={`/my-growth/pathway/${pathway_id}`}>
                  Continue <ArrowRight className="ml-1 w-3 h-3" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
