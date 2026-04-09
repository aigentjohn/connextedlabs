/**
 * Survey Detail Page
 * Member takes the survey / quiz / assessment.
 * Placeholder — full implementation in Session 2.
 */

import { useParams } from 'react-router';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

export default function SurveyDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-rose-600" />
          Survey
        </h1>
        <p className="text-gray-500 text-sm mt-1">slug: {slug}</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-gray-400 text-sm">Survey detail page coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
