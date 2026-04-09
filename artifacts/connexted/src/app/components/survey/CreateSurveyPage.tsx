/**
 * Create Survey Page
 * Admin form for creating surveys, quizzes, and assessments.
 * Placeholder — full implementation in Session 2.
 */

import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

export default function CreateSurveyPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-rose-600" />
          Create Survey
        </h1>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-gray-400 text-sm">Survey builder coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
