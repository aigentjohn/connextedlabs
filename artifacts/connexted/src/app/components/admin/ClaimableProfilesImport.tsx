// Split candidate: ~500 lines — consider extracting CsvPreviewTable, ColumnMappingForm, and ImportResultsSummary into sub-components.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Users,
  ArrowLeft,
  Info,
  X
} from 'lucide-react';

interface CSVRow {
  email: string;
  full_name: string;
  tier?: string;
  circles?: string;
  cohort?: string;
  role?: string;
  notes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function ClaimableProfilesImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [defaultTier, setDefaultTier] = useState<string>('member');
  const [expirationDays, setExpirationDays] = useState<string>('30');
  const [batchNotes, setBatchNotes] = useState<string>('');

  const downloadTemplate = () => {
    const csvContent = `email,full_name,tier,circles,cohort,role,notes
sarah@example.com,Sarah Johnson,member,"startup-accelerator,founders-circle",Spring 2024,Founder,Early-stage SaaS
john@example.com,John Davis,premium,"founders-circle",Spring 2024,Investor,Angel investor
kate@example.com,Kate Miller,free,"open",Spring 2024,Explorer,Interested in learning`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claimable_profiles_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = async (file: File) => {
    setIsProcessing(true);
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error('CSV file is empty or has no data rows');
      setIsProcessing(false);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Validate required fields
      if (!row.email || !row.email.includes('@')) {
        errors.push({ row: i, field: 'email', message: 'Invalid or missing email' });
      }
      if (!row.full_name) {
        errors.push({ row: i, field: 'full_name', message: 'Missing full name' });
      }

      // Validate tier if provided
      if (row.tier && !['free', 'member', 'premium'].includes(row.tier.toLowerCase())) {
        errors.push({ row: i, field: 'tier', message: 'Tier must be: free, member, or premium' });
      }

      rows.push({
        email: row.email?.trim().toLowerCase() || '',
        full_name: row.full_name?.trim() || '',
        tier: row.tier?.trim().toLowerCase() || defaultTier,
        circles: row.circles?.trim() || '',
        cohort: row.cohort?.trim() || '',
        role: row.role?.trim() || '',
        notes: row.notes?.trim() || '',
      });
    }

    setParsedData(rows);
    setValidationErrors(errors);
    setIsProcessing(false);

    if (errors.length === 0) {
      setStep('preview');
      toast.success(`Parsed ${rows.length} profiles successfully`);
    } else {
      toast.error(`Found ${errors.length} validation errors`);
    }
  };

  // Parse CSV line handling quoted values with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setStep('importing');
    const batchId = `BATCH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        setStep('preview');
        return;
      }

      // Fetch all circles to map slugs to IDs
      const { data: allCircles } = await supabase
        .from('circles')
        .select('id, slug, name');

      const circleMap = new Map(allCircles?.map(c => [c.slug, c.id]) || []);

      const profilesToInsert = parsedData.map(row => {
        // Parse circle slugs and convert to UUIDs
        let circleIds: string[] = [];
        if (row.circles) {
          const slugs = row.circles.split(',').map(s => s.trim()).filter(Boolean);
          circleIds = slugs
            .map(slug => circleMap.get(slug))
            .filter((id): id is string => id !== undefined);
        }

        const expirationDate = expirationDays 
          ? new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
          : null;

        return {
          email: row.email,
          full_name: row.full_name,
          default_tier: row.tier || defaultTier,
          default_circles: circleIds,
          metadata: {
            cohort: row.cohort || '',
            role: row.role || '',
            notes: row.notes || '',
            batch_notes: batchNotes,
          },
          batch_id: batchId,
          created_by: user.id,
          invitation_expires_at: expirationDate,
        };
      });

      const { data, error } = await supabase
        .from('claimable_profiles')
        .insert(profilesToInsert)
        .select();

      if (error) {
        console.error('Import error:', error);
        toast.error(`Failed to import profiles: ${error.message}`);
        setStep('preview');
        return;
      }

      toast.success(`Successfully imported ${data.length} profiles!`, {
        description: `Batch ID: ${batchId}`,
      });

      navigate('/platform-admin/claimable-profiles');
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Failed to import profiles');
      setStep('preview');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/platform-admin/claimable-profiles')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Claimable Profiles
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Import Claimable Profiles</h1>
        <p className="text-gray-600 mt-2">
          Bulk import member profiles from a CSV file for batch onboarding
        </p>
      </div>

      {/* Instructions */}
      <Alert className="mb-6 border-indigo-200 bg-indigo-50/50">
        <Info className="w-4 h-4 text-indigo-600" />
        <AlertDescription className="text-sm text-gray-700">
          <strong>How it works:</strong> Upload a CSV with member details. Each person will receive a magic link 
          to view and claim their pre-configured profile. They can browse before claiming, and have full control after claiming.
        </AlertDescription>
      </Alert>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Download Template</CardTitle>
              <CardDescription>
                Start with our CSV template to ensure proper formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-semibold mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">email</code> - Member's email address</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">full_name</code> - Their display name</li>
                </ul>
                <p className="font-semibold mt-3 mb-2">Optional columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">tier</code> - free, member, or premium</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">circles</code> - Comma-separated circle slugs (e.g., "startup-accelerator,founders-circle")</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">cohort</code> - Cohort or group name</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">role</code> - Member's role or title</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">notes</code> - Additional notes</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Configure Import Settings</CardTitle>
              <CardDescription>
                Set default values and expiration for this batch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Membership Tier (if not specified in CSV)</Label>
                <Select value={defaultTier} onValueChange={setDefaultTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Invitation Expiration (days from now)</Label>
                <Input
                  type="number"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              <div>
                <Label>Batch Notes (optional)</Label>
                <Textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g., Spring 2024 Cohort - Startup Accelerator"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Upload CSV File</CardTitle>
              <CardDescription>
                Select your prepared CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button asChild variant="outline">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      Choose CSV File
                    </span>
                  </Button>
                </label>
                {file && (
                  <p className="text-sm text-gray-600 mt-3">
                    Selected: <strong>{file.name}</strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Review Import Data</CardTitle>
                  <CardDescription>
                    {parsedData.length} profiles ready to import
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedData([]);
                  setValidationErrors([]);
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Found {validationErrors.length} validation errors:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm">
                      {validationErrors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>
                          Row {err.row}, {err.field}: {err.message}
                        </li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li>...and {validationErrors.length - 10} more errors</li>
                      )}
                    </ul>
                    <p className="mt-2">Please fix these errors and re-upload the CSV.</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              {validationErrors.length === 0 && (
                <>
                  <div className="max-h-96 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">#</th>
                          <th className="px-4 py-2 text-left font-semibold">Email</th>
                          <th className="px-4 py-2 text-left font-semibold">Name</th>
                          <th className="px-4 py-2 text-left font-semibold">Tier</th>
                          <th className="px-4 py-2 text-left font-semibold">Circles</th>
                          <th className="px-4 py-2 text-left font-semibold">Cohort</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2">{row.email}</td>
                            <td className="px-4 py-2">{row.full_name}</td>
                            <td className="px-4 py-2">
                              <Badge variant="outline" className="capitalize">
                                {row.tier || defaultTier}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-600">
                              {row.circles || '-'}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-600">
                              {row.cohort || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Ready to import {parsedData.length} profiles</span>
                    </div>
                    <Button onClick={handleImport} size="lg">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Import Profiles
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Profiles...</h3>
            <p className="text-gray-600">
              Please wait while we create {parsedData.length} claimable profiles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
