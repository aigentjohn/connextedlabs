import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ProgramTemplatePicker } from '@/app/components/ProgramTemplates';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/app/components/ui/breadcrumb';
import { Home, Rocket, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { canManagePrograms } from '@/lib/constants/roles';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function CreateProgramPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showScratchForm, setShowScratchForm] = useState(false);
  const [scratchName, setScratchName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (profile && !canManagePrograms(profile.role)) {
      toast.error('You do not have permission to create programs');
      navigate('/programs');
    }
  }, [profile, navigate]);

  const handleProgramCreated = (programId: string, slug: string) => {
    setShowTemplatePicker(false);
    navigate(`/program-admin/${programId}/setup`);
  };

  const handleCreateFromScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchName.trim() || !profile) return;
    setCreating(true);
    try {
      const base = scratchName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const suffix = Math.random().toString(36).slice(2, 7);
      const slug = `${base}-${suffix}`;

      const { data: program, error } = await supabase
        .from('programs')
        .insert({
          community_id: profile.community_id,
          name: scratchName.trim(),
          slug,
          admin_ids: [profile.id],
          member_ids: [],
          status: 'not-started',
          created_by: profile.id,
          visibility: 'members-only',
          tags: [],
        })
        .select('id')
        .single();

      if (error) throw error;
      toast.success(`Program "${scratchName.trim()}" created`);
      navigate(`/program-admin/${program.id}/setup`);
    } catch (err) {
      console.error('Error creating program:', err);
      toast.error('Failed to create program');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/programs">Programs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Program</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Create a Program
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from our templates to quickly set up structured learning journeys, cohort programs, 
            or community initiatives.
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Get Started
            </CardTitle>
            <CardDescription>
              Select a program template to customize and launch your cohort-based learning experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {/* Template Option */}
              <div className="p-6 border-2 border-purple-200 bg-purple-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Use a Template
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Start with a pre-built program template including journeys, content structure, 
                      and best practices. Perfect for common use cases like accelerators, courses, or bootcamps.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowTemplatePicker(true)}
                  className="w-full sm:w-auto"
                >
                  Browse Templates
                </Button>
              </div>

              {/* Custom Option */}
              <div className="p-6 border-2 border-gray-200 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-1">Start from Scratch</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Build a completely custom program from the ground up. You'll define your own
                  journeys, content structure, and learning paths. Recommended for advanced users.
                </p>
                {!showScratchForm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowScratchForm(true)}
                    className="w-full sm:w-auto"
                  >
                    Create Custom Program
                  </Button>
                ) : (
                  <form onSubmit={handleCreateFromScratch} className="flex items-end gap-3 mt-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="scratch-name" className="text-xs text-gray-600">Program name</Label>
                      <Input
                        id="scratch-name"
                        value={scratchName}
                        onChange={(e) => setScratchName(e.target.value)}
                        placeholder="e.g., Q3 Accelerator Cohort"
                        autoFocus
                        required
                      />
                    </div>
                    <Button type="submit" disabled={creating || !scratchName.trim()}>
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { setShowScratchForm(false); setScratchName(''); }}>
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => navigate('/programs')}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Picker Dialog */}
      <ProgramTemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onProgramCreated={handleProgramCreated}
      />
    </div>
  );
}