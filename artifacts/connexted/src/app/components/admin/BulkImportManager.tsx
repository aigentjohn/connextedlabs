// Split candidate: ~509 lines — consider extracting CsvUploadStep, MappingConfigStep, and ImportResultsStep into separate wizard step components.
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Download, FileJson, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface BulkImportField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[]; // For select fields
  defaultValue?: any;
  description?: string;
}

export interface BulkImportConfig {
  entityName: string; // e.g., "Demo Accounts", "Users", "Claimable Profiles"
  entityNameSingular: string; // e.g., "Demo Account", "User", "Claimable Profile"
  fields: BulkImportField[];
  onImport: (records: any[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  validateRecord?: (record: any) => string | null; // Return error message or null if valid
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkImportManager({ config }: { config: BulkImportConfig }) {
  const [importMode, setImportMode] = useState<'json' | 'csv' | null>(null);
  const [importText, setImportText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate JSON template
  const generateJSONTemplate = () => {
    const template = config.fields.reduce((obj, field) => {
      let exampleValue: any = '';
      
      switch (field.type) {
        case 'email':
          exampleValue = 'example@email.com';
          break;
        case 'number':
          exampleValue = 0;
          break;
        case 'boolean':
          exampleValue = true;
          break;
        case 'select':
          exampleValue = field.options?.[0] || '';
          break;
        default:
          exampleValue = `Example ${field.label}`;
      }
      
      obj[field.key] = field.defaultValue !== undefined ? field.defaultValue : exampleValue;
      return obj;
    }, {} as any);

    return [template, { ...template }]; // Return array with 2 example records
  };

  // Generate CSV template
  const generateCSVTemplate = () => {
    const headers = config.fields.map(f => f.key).join(',');
    const exampleRow1 = config.fields.map(field => {
      switch (field.type) {
        case 'email':
          return 'example1@email.com';
        case 'number':
          return '1';
        case 'boolean':
          return 'true';
        case 'select':
          return field.options?.[0] || '';
        default:
          return field.defaultValue !== undefined ? field.defaultValue : `Example ${field.label} 1`;
      }
    }).join(',');
    const exampleRow2 = config.fields.map(field => {
      switch (field.type) {
        case 'email':
          return 'example2@email.com';
        case 'number':
          return '2';
        case 'boolean':
          return 'false';
        case 'select':
          return field.options?.[1] || field.options?.[0] || '';
        default:
          return field.defaultValue !== undefined ? field.defaultValue : `Example ${field.label} 2`;
      }
    }).join(',');

    return `${headers}\n${exampleRow1}\n${exampleRow2}`;
  };

  // Download JSON template
  const downloadJSONTemplate = () => {
    const template = generateJSONTemplate();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.entityName.toLowerCase().replace(/\s+/g, '_')}_template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON template downloaded');
  };

  // Download CSV template
  const downloadCSVTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.entityName.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded');
  };

  // Parse JSON
  const parseJSON = () => {
    try {
      const parsed = JSON.parse(importText);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate records
      const errors: string[] = [];
      records.forEach((record, index) => {
        // Check required fields
        config.fields.forEach(field => {
          if (field.required && !record[field.key]) {
            errors.push(`Row ${index + 1}: Missing required field "${field.label}"`);
          }
        });
        
        // Custom validation
        if (config.validateRecord) {
          const error = config.validateRecord(record);
          if (error) {
            errors.push(`Row ${index + 1}: ${error}`);
          }
        }
      });

      if (errors.length > 0) {
        toast.error('Validation failed', {
          description: `Found ${errors.length} error(s). Check the preview below.`,
        });
        setImportResult({ success: 0, failed: records.length, errors });
        return;
      }

      setParsedRecords(records);
      toast.success(`Parsed ${records.length} record(s)`, {
        description: 'Review the records below and click Import to proceed.',
      });
    } catch (error: any) {
      toast.error('Invalid JSON format', {
        description: error.message,
      });
      setParsedRecords([]);
    }
  };

  // Parse CSV
  const parseCSV = () => {
    try {
      const lines = importText.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const records: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const record: any = {};
        
        headers.forEach((header, index) => {
          const field = config.fields.find(f => f.key === header);
          let value = values[index] || '';
          
          // Type conversion
          if (field) {
            if (field.type === 'number') {
              value = value ? parseFloat(value) : 0;
            } else if (field.type === 'boolean') {
              value = value.toLowerCase() === 'true';
            }
          }
          
          record[header] = value;
        });

        // Check required fields
        config.fields.forEach(field => {
          if (field.required && !record[field.key]) {
            errors.push(`Row ${i + 1}: Missing required field "${field.label}"`);
          }
        });

        // Custom validation
        if (config.validateRecord) {
          const error = config.validateRecord(record);
          if (error) {
            errors.push(`Row ${i + 1}: ${error}`);
          }
        }

        records.push(record);
      }

      if (errors.length > 0) {
        toast.error('Validation failed', {
          description: `Found ${errors.length} error(s). Check the preview below.`,
        });
        setImportResult({ success: 0, failed: records.length, errors });
        return;
      }

      setParsedRecords(records);
      toast.success(`Parsed ${records.length} record(s)`, {
        description: 'Review the records below and click Import to proceed.',
      });
    } catch (error: any) {
      toast.error('Invalid CSV format', {
        description: error.message,
      });
      setParsedRecords([]);
    }
  };

  // Import records
  const handleImport = async () => {
    if (parsedRecords.length === 0) {
      toast.error('No records to import');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await config.onImport(parsedRecords);
      setImportResult(result);
      
      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} record(s)`, {
          description: result.failed > 0 ? `${result.failed} failed` : undefined,
        });
      }
      
      if (result.failed > 0) {
        toast.error(`${result.failed} record(s) failed to import`, {
          description: 'Check the results below for details.',
        });
      }

      // Clear if all successful
      if (result.failed === 0) {
        setImportText('');
        setParsedRecords([]);
        setImportMode(null);
      }
    } catch (error: any) {
      toast.error('Import failed', {
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset
  const handleReset = () => {
    setImportMode(null);
    setImportText('');
    setParsedRecords([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold">Bulk Import {config.entityName}</h3>
        <p className="text-sm text-gray-600 mt-1">
          Import multiple {config.entityName.toLowerCase()} at once using JSON or CSV format
        </p>
      </div>

      {/* Mode Selection */}
      {!importMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JSON Import */}
          <Card className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all" onClick={() => setImportMode('json')}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileJson className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Import from JSON</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Structured data format, great for complex records
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadJSONTemplate(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Import */}
          <Card className="cursor-pointer hover:border-green-400 hover:shadow-md transition-all" onClick={() => setImportMode('csv')}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Import from CSV</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Spreadsheet format, easy to create in Excel/Sheets
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadCSVTemplate(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Interface */}
      {importMode && (
        <Card className={importMode === 'json' ? 'border-blue-400' : 'border-green-400'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {importMode === 'json' ? <FileJson className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                  {importMode === 'json' ? 'JSON' : 'CSV'} Import
                </CardTitle>
                <CardDescription>
                  Paste your {importMode.toUpperCase()} data below
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field Reference */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-semibold mb-2">Available Fields:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {config.fields.map(field => (
                  <div key={field.key} className="flex items-center gap-1">
                    <code className="bg-white px-2 py-1 rounded">{field.key}</code>
                    {field.required && <span className="text-red-500">*</span>}
                    {field.description && (
                      <span className="text-gray-500" title={field.description}>ⓘ</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">* = Required field</p>
            </div>

            {/* Input Area */}
            <div>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  importMode === 'json'
                    ? `[\n  {\n    "${config.fields[0]?.key}": "value1",\n    "${config.fields[1]?.key}": "value2"\n  }\n]`
                    : `${config.fields.map(f => f.key).join(',')}\nvalue1,value2,value3`
                }
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={importMode === 'json' ? parseJSON : parseCSV}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Parse & Validate
              </Button>
              {parsedRecords.length > 0 && (
                <Button onClick={handleImport} disabled={isProcessing}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Importing...' : `Import ${parsedRecords.length} Record(s)`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Parsed Records */}
      {parsedRecords.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({parsedRecords.length} records)</CardTitle>
            <CardDescription>Review the parsed data before importing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">#</th>
                    {config.fields.map(field => (
                      <th key={field.key} className="text-left p-2 font-semibold">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRecords.slice(0, 10).map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-gray-500">{index + 1}</td>
                      {config.fields.map(field => (
                        <td key={field.key} className="p-2">
                          {typeof record[field.key] === 'boolean'
                            ? record[field.key] ? '✓' : '✗'
                            : record[field.key] || <span className="text-gray-400">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRecords.length > 10 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Showing first 10 of {parsedRecords.length} records
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className={importResult.failed > 0 ? 'border-red-400' : 'border-green-400'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.failed === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold">{importResult.success} Successful</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold">{importResult.failed} Failed</span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <h5 className="text-sm font-semibold text-red-800 mb-2">Errors:</h5>
                <ul className="text-sm text-red-700 space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.failed === 0 && (
              <Button onClick={handleReset}>Import More</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
