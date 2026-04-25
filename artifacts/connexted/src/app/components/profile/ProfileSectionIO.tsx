import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import { Download, Upload, Sparkles } from 'lucide-react';
import {
  downloadBasicsExport,
  downloadProfessionalExport,
  downloadEngagementExport,
  importBasicsSection,
  importProfessionalSection,
  importEngagementSection,
} from '@/lib/profile-section-io';

interface Props {
  section: 'basics' | 'professional' | 'engagement';
  onUpdate: () => void;
}

const LABELS: Record<Props['section'], string> = {
  basics: 'My Basics',
  professional: 'My Professional',
  engagement: 'My Engagement',
};

export function ProfileSectionIO({ section, onUpdate }: Props) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!profile) return;
    try {
      if (section === 'basics') downloadBasicsExport(profile);
      else if (section === 'professional') await downloadProfessionalExport(profile, supabase);
      else downloadEngagementExport(profile);
      toast.success('Exported — paste the JSON into your AI assistant to update it, then import it back');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    e.target.value = '';
    setImporting(true);
    try {
      const json = JSON.parse(await file.text());
      if (section === 'basics') await importBasicsSection(json, profile.id, supabase);
      else if (section === 'professional') await importProfessionalSection(json, profile.id, supabase);
      else await importEngagementSection(json, profile.id, supabase);
      await onUpdate();
      toast.success(`${LABELS[section]} updated from JSON`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed — check the JSON is valid');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 space-y-2 mt-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <p className="text-sm font-medium text-gray-700">AI-assisted profile update</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        Export this section as JSON, paste it into ChatGPT, Claude, or Gemini to fill it out, then import the updated JSON back here.
      </p>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {importing ? 'Importing...' : 'Import JSON'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
