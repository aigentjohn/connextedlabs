import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Save, Trash2, Plus, X } from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function BuildEditor() {
  const navigate = useNavigate();
  
  // TODO: Update to use Supabase instead of localStorage
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Builds', path: '/builds' }, { label: 'Editor' }]} />
      <div className="text-center py-12">
        <h1 className="text-3xl mb-2">Build Editor</h1>
        <p className="text-gray-600">Feature needs Supabase migration</p>
        <Button onClick={() => navigate('/builds')} className="mt-4">
          Back to Builds
        </Button>
      </div>
    </div>
  );
}