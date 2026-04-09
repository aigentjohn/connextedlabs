/**
 * Surveys Page
 * Browse all active surveys, quizzes, and assessments.
 * Placeholder — full implementation in Session 2.
 */

import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

export default function SurveysPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-rose-600" />
          Surveys
        </h1>
        <p className="text-gray-600 mt-1">
          Surveys, quizzes, and assessments for this community.
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">Coming soon</h3>
          <p className="text-gray-400 text-sm">Surveys are being set up.</p>
        </CardContent>
      </Card>
    </div>
  );
}
