// Split candidate: ~533 lines — consider extracting ProspectTable, ProspectDetailDrawer, and ProspectBulkActions into sub-components.
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { Upload, Download, Users, Mail, Search, Filter, Trash2, FileText, AlertCircle } from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted';
  created_at: string;
  created_by: string;
  updated_at?: string;
}

export function ProspectManagement() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (profile) {
      loadProspects();
    }
  }, [profile, statusFilter]);

  const loadProspects = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProspects(data || []);
    } catch (error: any) {
      console.error('Error loading prospects:', error);
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = header.indexOf('name') !== -1 ? header.indexOf('name') : 0;
      const emailIndex = header.indexOf('email') !== -1 ? header.indexOf('email') : 1;
      const phoneIndex = header.indexOf('phone');
      const companyIndex = header.indexOf('company');
      const titleIndex = header.indexOf('title');
      const sourceIndex = header.indexOf('source');
      const notesIndex = header.indexOf('notes');

      // Parse data rows
      const prospectsToImport: Omit<Prospect, 'id' | 'created_at' | 'updated_at'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length < 2) continue; // Skip invalid rows

        const name = values[nameIndex] || '';
        const email = values[emailIndex] || '';

        if (!name || !email) continue; // Skip rows without name or email

        prospectsToImport.push({
          name,
          email,
          phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
          company: companyIndex !== -1 ? values[companyIndex] : undefined,
          title: titleIndex !== -1 ? values[titleIndex] : undefined,
          source: sourceIndex !== -1 ? values[sourceIndex] : undefined,
          notes: notesIndex !== -1 ? values[notesIndex] : undefined,
          status: 'new',
          created_by: profile?.id || '',
          tags: []
        });
      }

      if (prospectsToImport.length === 0) {
        throw new Error('No valid prospects found in CSV');
      }

      // Insert prospects into database
      const { error } = await supabase
        .from('prospects')
        .insert(prospectsToImport);

      if (error) throw error;

      toast.success(`Successfully imported ${prospectsToImport.length} prospects`);
      loadProspects();
    } catch (error: any) {
      console.error('Error importing prospects:', error);
      toast.error(error.message || 'Failed to import prospects');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'name,email,phone,company,title,source,notes\n' +
      'John Doe,john@example.com,555-1234,Acme Inc,CEO,Referral,Interested in Q1 cohort\n' +
      'Jane Smith,jane@example.com,555-5678,Tech Corp,CTO,Website,Looking for leadership training';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospects_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportProspects = () => {
    if (prospects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    const csvContent = 'name,email,phone,company,title,source,status,notes,created_at\n' +
      prospects.map(p => 
        `"${p.name}","${p.email}","${p.phone || ''}","${p.company || ''}","${p.title || ''}","${p.source || ''}","${p.status}","${p.notes || ''}","${p.created_at}"`
      ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Prospects exported successfully');
  };

  const exportForKit = () => {
    if (prospects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    // Map prospects to Kit format
    const kitData = prospects.map(p => {
      // Split name into first_name and last_name
      const nameParts = p.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Build tags array from various fields
      const tags: string[] = [];
      
      // Add existing tags if any
      if (p.tags && p.tags.length > 0) {
        tags.push(...p.tags);
      }
      
      // Add status as a tag
      tags.push(`status-${p.status}`);
      
      // Add source as a tag if available
      if (p.source) {
        tags.push(`source-${p.source.toLowerCase().replace(/\s+/g, '-')}`);
      }
      
      // Add company as a tag if available
      if (p.company) {
        tags.push(`company-${p.company.toLowerCase().replace(/\s+/g, '-')}`);
      }

      return {
        first_name: firstName,
        last_name: lastName,
        email: p.email,
        tags: tags.join(',')
      };
    });

    // Create CSV format for Kit
    const csvContent = 'first_name,last_name,email,tags\n' +
      kitData.map(p => 
        `"${p.first_name}","${p.last_name}","${p.email}","${p.tags}"`
      ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success(`Exported ${prospects.length} prospects for Kit`);
  };

  const deleteProspect = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Prospect deleted');
      loadProspects();
    } catch (error: any) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    }
  };

  const updateProspectStatus = async (id: string, newStatus: Prospect['status']) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated');
      loadProspects();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      interested: 'bg-green-100 text-green-800 border-green-200',
      not_interested: 'bg-gray-100 text-gray-800 border-gray-200',
      converted: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[status] || colors.new;
  };

  const filteredProspects = prospects.filter(prospect => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        prospect.name.toLowerCase().includes(search) ||
        prospect.email.toLowerCase().includes(search) ||
        (prospect.company && prospect.company.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const stats = {
    total: prospects.length,
    new: prospects.filter(p => p.status === 'new').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    interested: prospects.filter(p => p.status === 'interested').length,
    converted: prospects.filter(p => p.status === 'converted').length
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/platform-admin' },
          { label: 'Prospect Management' },
        ]}
      />

      <div>
        <h1 className="text-3xl mb-2">Prospect Management</h1>
        <p className="text-gray-600">
          Import and manage your prospect contact list
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('new')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('contacted')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.contacted}</div>
            <div className="text-sm text-gray-600">Contacted</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('interested')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.interested}</div>
            <div className="text-sm text-gray-600">Interested</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('converted')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.converted}</div>
            <div className="text-sm text-gray-600">Converted</div>
          </CardContent>
        </Card>
      </div>

      {/* Import/Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Import & Export</CardTitle>
          <CardDescription>
            Upload a CSV file with prospect information or download a template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={exportProspects} variant="outline" disabled={prospects.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export All Prospects
            </Button>
            <Button onClick={exportForKit} variant="outline" disabled={prospects.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export for Kit
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 text-sm">CSV Format:</h4>
            <p className="text-sm text-blue-800 mb-2">
              Your CSV should include these columns: <strong>name, email, phone, company, title, source, notes</strong>
            </p>
            <p className="text-xs text-blue-700">
              Note: Only name and email are required. All other fields are optional.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prospects List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading prospects...</p>
          </CardContent>
        </Card>
      ) : filteredProspects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-2">
              {searchTerm ? `No prospects found matching "${searchTerm}"` : 'No prospects yet'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Import a CSV file to get started
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProspects.map((prospect) => (
            <Card key={prospect.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{prospect.name}</CardTitle>
                      <Badge className={`${getStatusColor(prospect.status)} border`}>
                        {prospect.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {prospect.email}
                      </div>
                      {prospect.phone && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {prospect.phone}
                        </div>
                      )}
                      {prospect.company && (
                        <div>
                          <strong>Company:</strong> {prospect.company}
                          {prospect.title && ` • ${prospect.title}`}
                        </div>
                      )}
                      {prospect.source && (
                        <div>
                          <strong>Source:</strong> {prospect.source}
                        </div>
                      )}
                      {prospect.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <strong>Notes:</strong> {prospect.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={prospect.status}
                    onChange={(e) => updateProspectStatus(prospect.id, e.target.value as Prospect['status'])}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="converted">Converted</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProspect(prospect.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProspectManagement;