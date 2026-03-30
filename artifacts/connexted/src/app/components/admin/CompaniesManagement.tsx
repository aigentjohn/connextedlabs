import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { 
  Building2, 
  Download,
  Upload,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  FileJson,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  industry?: string;
  location?: string;
  team_size?: string;
  owner_user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  updated: number;
  errors: string[];
}

type DuplicateStrategy = 'error' | 'skip' | 'update';

export default function CompaniesManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJSON, setImportJSON] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [showCSVResultDialog, setShowCSVResultDialog] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('market_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast.error(`Failed to load companies: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.location?.toLowerCase().includes(query) ||
      c.tagline?.toLowerCase().includes(query)
    );

    setFilteredCompanies(filtered);
  };

  const exportToJSON = () => {
    const exportData = companies.map(company => ({
      name: company.name,
      slug: company.slug,
      tagline: company.tagline,
      description: company.description,
      logo_url: company.logo_url,
      website_url: company.website_url,
      industry: company.industry,
      location: company.location,
      team_size: company.team_size,
      is_public: company.is_public,
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `companies-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success(`Exported ${companies.length} companies successfully!`);
  };

  const exportToCSV = () => {
    try {
      // Define CSV headers
      const headers = [
        'Name',
        'Slug',
        'Tagline',
        'Description',
        'Logo URL',
        'Website URL',
        'Industry',
        'Location',
        'Team Size',
        'Is Public'
      ];
      
      // Create CSV rows
      const rows = companies.map(company => [
        company.name || '',
        company.slug || '',
        company.tagline || '',
        company.description || '',
        company.logo_url || '',
        company.website_url || '',
        company.industry || '',
        company.location || '',
        company.team_size || '',
        company.is_public ? 'TRUE' : 'FALSE'
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => {
          // Escape fields containing commas, quotes, or newlines
          if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `companies-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${companies.length} companies to CSV`);
    } catch (error) {
      console.error('Error exporting companies to CSV:', error);
      toast.error('Failed to export companies to CSV');
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImporting(true);
        setImportResult(null);
        const text = e.target?.result as string;
        
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));
        
        // Validate headers - only Name is required
        const requiredHeaders = ['Name'];
        const hasRequiredHeaders = requiredHeaders.every(h => 
          headers.some(header => header.toLowerCase() === h.toLowerCase())
        );
        
        if (!hasRequiredHeaders) {
          toast.error('Invalid CSV format. Required column: Name');
          setImporting(false);
          return;
        }
        
        // Parse rows
        const companies = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          // Parse CSV row (handle quoted values with commas)
          const values: string[] = [];
          let currentValue = '';
          let insideQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              if (insideQuotes && line[j + 1] === '"') {
                currentValue += '"';
                j++;
              } else {
                insideQuotes = !insideQuotes;
              }
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());
          
          // Create company object from values
          const companyData: any = {};
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            if (value) {
              const headerLower = header.toLowerCase();
              if (headerLower === 'name') companyData.name = value;
              else if (headerLower === 'slug') companyData.slug = value;
              else if (headerLower === 'tagline') companyData.tagline = value;
              else if (headerLower === 'description') companyData.description = value;
              else if (headerLower === 'logo url') companyData.logo_url = value;
              else if (headerLower === 'website url') companyData.website_url = value;
              else if (headerLower === 'industry') companyData.industry = value;
              else if (headerLower === 'location') companyData.location = value;
              else if (headerLower === 'team size') companyData.team_size = value;
              else if (headerLower === 'is public') {
                companyData.is_public = value.toLowerCase() === 'true' || value === '1';
              }
            }
          });
          
          if (companyData.name) {
            companies.push(companyData);
          }
        }
        
        if (companies.length === 0) {
          toast.error('No valid companies found in CSV');
          setImporting(false);
          return;
        }
        
        // Get current user as owner
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to import companies');
          setImporting(false);
          return;
        }
        
        // Import companies
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        let updateCount = 0;
        const errors: string[] = [];
        
        for (let i = 0; i < companies.length; i++) {
          const companyData = companies[i];
          
          try {
            // Validate required fields
            if (!companyData.name) {
              throw new Error('Missing required field: name');
            }
            
            // Generate slug if not provided
            const slug = companyData.slug || companyData.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            
            // Check if slug already exists
            const { data: existingCompany } = await supabase
              .from('market_companies')
              .select('id')
              .eq('slug', slug)
              .single();
            
            if (existingCompany) {
              if (duplicateStrategy === 'error') {
                throw new Error(`Company with slug '${slug}' already exists`);
              } else if (duplicateStrategy === 'skip') {
                skipCount++;
                continue;
              } else if (duplicateStrategy === 'update') {
                const { error } = await supabase
                  .from('market_companies')
                  .update({
                    name: companyData.name,
                    slug: slug,
                    tagline: companyData.tagline || null,
                    description: companyData.description || null,
                    logo_url: companyData.logo_url || null,
                    website_url: companyData.website_url || null,
                    industry: companyData.industry || null,
                    location: companyData.location || null,
                    team_size: companyData.team_size || null,
                    owner_user_id: user.id,
                    is_public: companyData.is_public ?? true,
                  })
                  .eq('id', existingCompany.id);
                
                if (error) throw error;
                
                updateCount++;
                continue;
              }
            }
            
            // Insert company
            const { error } = await supabase
              .from('market_companies')
              .insert({
                name: companyData.name,
                slug: slug,
                tagline: companyData.tagline || null,
                description: companyData.description || null,
                logo_url: companyData.logo_url || null,
                website_url: companyData.website_url || null,
                industry: companyData.industry || null,
                location: companyData.location || null,
                team_size: companyData.team_size || null,
                owner_user_id: user.id,
                is_public: companyData.is_public ?? true,
              });
            
            if (error) throw error;
            
            successCount++;
          } catch (error: any) {
            failCount++;
            errors.push(`Row ${i + 2} (${companyData.name || 'unnamed'}): ${error.message}`);
          }
        }
        
        setImportResult({
          success: successCount,
          failed: failCount,
          skipped: skipCount,
          updated: updateCount,
          errors: errors,
        });
        
        if (successCount > 0 || updateCount > 0) {
          const totalSuccess = successCount + updateCount;
          toast.success(`Successfully processed ${totalSuccess} companies (${successCount} new, ${updateCount} updated)`);
          fetchCompanies();
        }
        
        if (failCount > 0) {
          toast.error(`Failed to import ${failCount} companies`);
        }
        
        setImporting(false);
        
        // Reset file input
        event.target.value = '';
        
        // Show result dialog
        setShowCSVResultDialog(true);
      } catch (error: any) {
        console.error('Error importing CSV:', error);
        toast.error(`Import failed: ${error.message}`);
        setImporting(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Validate JSON
        JSON.parse(content);
        setImportJSON(content);
        setShowImportDialog(true);
      } catch (error) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setImportResult(null);

      const importData = JSON.parse(importJSON);
      
      if (!Array.isArray(importData)) {
        toast.error('JSON must be an array of company objects');
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;
      let updateCount = 0;
      const errors: string[] = [];

      // Get current user as owner
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to import companies');
        return;
      }

      for (let i = 0; i < importData.length; i++) {
        const companyData = importData[i];
        
        try {
          // Validate required fields
          if (!companyData.name) {
            throw new Error('Missing required field: name');
          }

          // Generate slug if not provided
          const slug = companyData.slug || companyData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          // Check if slug already exists
          const { data: existingCompany } = await supabase
            .from('market_companies')
            .select('id')
            .eq('slug', slug)
            .single();

          if (existingCompany) {
            if (duplicateStrategy === 'error') {
              throw new Error(`Company with slug '${slug}' already exists`);
            } else if (duplicateStrategy === 'skip') {
              skipCount++;
              continue;
            } else if (duplicateStrategy === 'update') {
              const { error } = await supabase
                .from('market_companies')
                .update({
                  name: companyData.name,
                  slug: slug,
                  tagline: companyData.tagline || null,
                  description: companyData.description || null,
                  logo_url: companyData.logo_url || null,
                  website_url: companyData.website_url || null,
                  industry: companyData.industry || null,
                  location: companyData.location || null,
                  team_size: companyData.team_size || null,
                  owner_user_id: user.id,
                  is_public: companyData.is_public ?? true,
                })
                .eq('id', existingCompany.id);

              if (error) throw error;

              updateCount++;
              continue;
            }
          }

          // Insert company
          const { error } = await supabase
            .from('market_companies')
            .insert({
              name: companyData.name,
              slug: slug,
              tagline: companyData.tagline || null,
              description: companyData.description || null,
              logo_url: companyData.logo_url || null,
              website_url: companyData.website_url || null,
              industry: companyData.industry || null,
              location: companyData.location || null,
              team_size: companyData.team_size || null,
              owner_user_id: user.id,
              is_public: companyData.is_public ?? true,
            });

          if (error) throw error;

          successCount++;
        } catch (error: any) {
          failCount++;
          errors.push(`Row ${i + 1} (${companyData.name || 'unnamed'}): ${error.message}`);
        }
      }

      setImportResult({
        success: successCount,
        failed: failCount,
        skipped: skipCount,
        updated: updateCount,
        errors: errors,
      });

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} companies`);
        fetchCompanies();
      }

      if (failCount > 0) {
        toast.error(`Failed to import ${failCount} companies`);
      }

    } catch (error: any) {
      console.error('Error importing companies:', error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated offerings.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('market_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportJSON('');
    setImportResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const publicCompanies = companies.filter(c => c.is_public).length;
  const privateCompanies = companies.filter(c => !c.is_public).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Companies Management' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies Management</h1>
          <p className="text-gray-600">
            Manage market companies with bulk import/export
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <input
            ref={csvFileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => csvFileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={exportToJSON}
            disabled={companies.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            disabled={companies.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchCompanies}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Public
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publicCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Private
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{privateCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(companies.map(c => c.industry).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search companies by name, slug, industry, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* JSON Format Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center text-blue-900">
            <FileJson className="w-4 h-4 mr-2" />
            JSON Import/Export Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-3">
          <div>
            <p className="font-semibold mb-1">Export Behavior:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Exports ALL companies currently in the database</li>
              <li>Exported JSON contains only the data fields (no IDs or timestamps)</li>
              <li>Use exported files as templates or for backup/migration</li>
            </ul>
          </div>
          
          <div>
            <p className="font-semibold mb-1">Import Behavior:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>ADDS</strong> to existing companies (does not replace all companies)</li>
              <li>Duplicates detected by matching <code>slug</code> field</li>
              <li>Choose how to handle duplicates: Error, Skip, or Update</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Duplicate Strategies:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Error:</strong> Stop and report error if slug already exists</li>
              <li><strong>Skip:</strong> Skip companies with existing slugs, import only new ones</li>
              <li><strong>Update:</strong> Update existing companies with new data from JSON</li>
            </ul>
          </div>

          <div className="mt-3">
            <p className="font-semibold mb-2">JSON Format:</p>
            <pre className="bg-white p-3 rounded text-xs overflow-x-auto border border-blue-200">
{`[\n  {\n    "name": "Company Name" (required),\n    "slug": "company-slug" (optional, auto-generated),\n    "tagline": "One-line description",\n    "description": "Full description",\n    "logo_url": "https://...",\n    "website_url": "https://...",\n    "industry": "Technology",\n    "location": "San Francisco, CA",\n    "team_size": "1-10",\n    "is_public": true\n  }\n]`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* CSV Format Guide */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center text-green-900">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            CSV Import/Export Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-green-800 space-y-3">
          <div>
            <p className="font-semibold mb-1">✨ CSV Import Features:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Instant Import:</strong> Upload CSV and companies are added automatically</li>
              <li><strong>Auto-slug Generation:</strong> Slugs created from company names if not provided</li>
              <li><strong>Duplicate Handling:</strong> Uses same strategy selector as JSON import</li>
              <li><strong>Excel-Friendly:</strong> Edit in Excel or Google Sheets</li>
            </ul>
          </div>
          
          <div>
            <p className="font-semibold mb-1">Required Columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Name</strong> - Company name (REQUIRED)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-1">Optional Columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Slug</strong> - URL-friendly identifier (auto-generated if blank)</li>
              <li><strong>Tagline</strong> - One-line company description</li>
              <li><strong>Description</strong> - Full company description</li>
              <li><strong>Logo URL</strong> - Link to company logo image</li>
              <li><strong>Website URL</strong> - Company website</li>
              <li><strong>Industry</strong> - e.g., Technology, Healthcare, Finance</li>
              <li><strong>Location</strong> - e.g., San Francisco, CA</li>
              <li><strong>Team Size</strong> - e.g., 1-10, 11-50, 51-200</li>
              <li><strong>Is Public</strong> - TRUE or FALSE (defaults to TRUE)</li>
            </ul>
          </div>

          <div className="mt-3">
            <p className="font-semibold mb-2">CSV Example:</p>
            <pre className="bg-white p-3 rounded text-xs overflow-x-auto border border-green-200">
{`Name,Slug,Tagline,Industry,Location,Is Public
Acme Corp,acme-corp,Building the future,Technology,San Francisco\\, CA,TRUE
Beta Inc,,Innovating healthcare,Healthcare,New York,FALSE`}
            </pre>
            <p className="text-xs mt-2 text-green-700">
              💡 <strong>Tip:</strong> Export existing companies to get a template with all columns
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No companies found matching your search' : 'No companies yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-xs text-gray-500">{company.slug}</div>
                          {company.tagline && (
                            <div className="text-xs text-gray-600 mt-1 italic">{company.tagline}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.industry ? (
                          <Badge variant="outline">{company.industry}</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {company.location || <span className="text-gray-400 italic">Not set</span>}
                      </TableCell>
                      <TableCell>
                        {company.is_public ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            Private
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link to={`/markets/companies/${company.slug}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <Link to={`/markets/edit-company/${company.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(company.id, company.name)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Companies from JSON</DialogTitle>
            <DialogDescription>
              Review and import companies in bulk. The current user will be set as the owner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">JSON Data</label>
              <Textarea
                value={importJSON}
                onChange={(e) => setImportJSON(e.target.value)}
                placeholder='[{"name": "Company Name", ...}]'
                className="font-mono text-sm h-64"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Duplicate Strategy</label>
              <Select
                value={duplicateStrategy}
                onValueChange={(value) => setDuplicateStrategy(value as DuplicateStrategy)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a strategy">
                    {duplicateStrategy}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="skip">Skip</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {importResult.success} companies imported successfully
                  </span>
                </div>
                {importResult.updated > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-600">
                      {importResult.updated} companies updated
                    </span>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-600">
                      {importResult.skipped} companies skipped
                    </span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-600">
                        {importResult.failed} companies failed to import
                      </span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-48 overflow-y-auto">
                      <ul className="text-sm text-red-800 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={importing || !importJSON.trim()}>
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Companies
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Result Dialog */}
      <Dialog open={showCSVResultDialog} onOpenChange={setShowCSVResultDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV Import Result</DialogTitle>
            <DialogDescription>
              Review the results of your CSV import.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    {importResult.success} companies imported successfully
                  </span>
                </div>
                {importResult.updated > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-600">
                      {importResult.updated} companies updated
                    </span>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-600">
                      {importResult.skipped} companies skipped
                    </span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-600">
                        {importResult.failed} companies failed to import
                      </span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-48 overflow-y-auto">
                      <ul className="text-sm text-red-800 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCSVResultDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}