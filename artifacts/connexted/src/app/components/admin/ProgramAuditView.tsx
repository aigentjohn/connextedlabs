// Split candidate: ~542 lines — consider extracting AuditIssueRow, AuditSummaryCard, and AuditFixActionsPanel into sub-components.
import { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, Info, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

interface Program {
  id: string;
  name: string;
  member_ids: string[];
  admin_ids: string[];
}

interface Journey {
  id: string;
  program_id: string;
  name: string;
  circle_id: string | null;
}

interface AuditIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
  fix_suggestion?: string;
}

interface AuditResult {
  timestamp: string;
  total_checks: number;
  errors: number;
  warnings: number;
  info: number;
  issues: AuditIssue[];
}

interface ProgramAuditViewProps {
  programId: string;
  program: Program;
  journeys: Journey[];
}

export default function ProgramAuditView({ programId, program, journeys }: ProgramAuditViewProps) {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);

  const runAudit = async () => {
    try {
      setLoading(true);
      const issues: AuditIssue[] = [];
      let totalChecks = 0;

      // Check 1: Verify program has admin
      totalChecks++;
      if (!program.admin_ids || program.admin_ids.length === 0) {
        issues.push({
          severity: 'error',
          category: 'Program Configuration',
          message: 'Program has no administrators',
          details: 'Every program should have at least one administrator',
          fix_suggestion: 'Add administrators in the program settings'
        });
      }

      // Check 2: Verify attenders exist in profiles table
      totalChecks++;
      if (program.member_ids && program.member_ids.length > 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id')
          .in('id', program.member_ids);

        if (error) {
          issues.push({
            severity: 'error',
            category: 'Data Integrity',
            message: 'Failed to verify attender profiles',
            details: error.message
          });
        } else if (profiles && profiles.length < program.member_ids.length) {
          const missingCount = program.member_ids.length - profiles.length;
          issues.push({
            severity: 'warning',
            category: 'Data Integrity',
            message: `${missingCount} attender(s) not found in profiles table`,
            details: 'Some member IDs in the program do not correspond to existing user profiles',
            fix_suggestion: 'Review and clean up the member_ids array'
          });
        }
      }

      // Check 3: Verify journeys exist
      totalChecks++;
      if (journeys.length === 0) {
        issues.push({
          severity: 'info',
          category: 'Program Structure',
          message: 'Program has no journeys',
          details: 'Consider adding journeys to organize program content',
          fix_suggestion: 'Go to the Journeys tab to create journeys'
        });
      }

      // Check 4: Check for orphaned journeys (invalid circle_id)
      totalChecks++;
      const journeysWithCircles = journeys.filter(j => j.circle_id);
      if (journeysWithCircles.length > 0) {
        const circleIds = journeysWithCircles.map(j => j.circle_id).filter(Boolean) as string[];
        const { data: circles, error } = await supabase
          .from('circles')
          .select('id')
          .in('id', circleIds);

        if (error) {
          issues.push({
            severity: 'error',
            category: 'Data Integrity',
            message: 'Failed to verify journey circles',
            details: error.message
          });
        } else if (circles && circles.length < circleIds.length) {
          const foundIds = new Set(circles.map(c => c.id));
          const orphanedJourneys = journeysWithCircles.filter(j => j.circle_id && !foundIds.has(j.circle_id));
          issues.push({
            severity: 'warning',
            category: 'Data Integrity',
            message: `${orphanedJourneys.length} journey(s) reference non-existent circles`,
            details: `Journeys: ${orphanedJourneys.map(j => j.name).join(', ')}`,
            fix_suggestion: 'Update or remove invalid circle references'
          });
        }
      }

      // Check 5: Verify journey items exist
      totalChecks++;
      for (const journey of journeys) {
        const { data: items, error } = await supabase
          .from('journey_items')
          .select('id')
          .eq('journey_id', journey.id);

        if (error && error.code !== 'PGRST205') {
          issues.push({
            severity: 'error',
            category: 'Database',
            message: `Failed to check items for journey "${journey.name}"`,
            details: error.message
          });
        } else if (error && error.code === 'PGRST205') {
          issues.push({
            severity: 'warning',
            category: 'Database',
            message: 'Journey items table not yet created',
            details: 'The journey_items table has not been created in the database',
            fix_suggestion: 'Run migration: 20260202000200_create_journey_progress_tracking.sql'
          });
          break; // No need to check other journeys
        } else if (!items || items.length === 0) {
          issues.push({
            severity: 'info',
            category: 'Content',
            message: `Journey "${journey.name}" has no content items`,
            details: 'Consider adding videos, articles, or other content to this journey',
            fix_suggestion: 'Add content items in the Journeys tab'
          });
        }
      }

      // Check 6: Verify progress tracking tables exist
      totalChecks++;
      const { error: progressError } = await supabase
        .from('journey_progress')
        .select('id')
        .limit(1);

      if (progressError && progressError.code === 'PGRST205') {
        issues.push({
          severity: 'warning',
          category: 'Database',
          message: 'Journey progress tracking tables not created',
          details: 'Progress tracking tables (journey_progress, journey_item_completions) are missing',
          fix_suggestion: 'Run migration: 20260202000200_create_journey_progress_tracking.sql'
        });
      }

      // Check 7: Verify journey order indices are sequential
      totalChecks++;
      const orderIndices = journeys.map(j => j.order_index).sort((a, b) => a - b);
      let hasGaps = false;
      for (let i = 0; i < orderIndices.length; i++) {
        if (orderIndices[i] !== i) {
          hasGaps = true;
          break;
        }
      }
      if (hasGaps) {
        issues.push({
          severity: 'info',
          category: 'Data Quality',
          message: 'Journey order indices are not sequential',
          details: 'Order indices should be 0, 1, 2, etc. for optimal sorting',
          fix_suggestion: 'Reorder journeys to fix indexing'
        });
      }

      // Check 8: Check for duplicate attenders
      totalChecks++;
      if (program.member_ids && program.member_ids.length > 0) {
        const uniqueMembers = new Set(program.member_ids);
        if (uniqueMembers.size < program.member_ids.length) {
          const duplicateCount = program.member_ids.length - uniqueMembers.size;
          issues.push({
            severity: 'warning',
            category: 'Data Quality',
            message: `Found ${duplicateCount} duplicate attender ID(s)`,
            details: 'The member_ids array contains duplicate entries',
            fix_suggestion: 'Remove duplicate IDs from the member_ids array'
          });
        }
      }

      // Check 9: Verify program status
      totalChecks++;
      if (!program || !['draft', 'published', 'archived'].includes((program as any).status)) {
        issues.push({
          severity: 'warning',
          category: 'Program Configuration',
          message: 'Invalid program status',
          details: 'Program status should be one of: draft, published, archived',
          fix_suggestion: 'Update program status in settings'
        });
      }

      // Check 10: Check if program has description
      totalChecks++;
      if (!(program as any).description) {
        issues.push({
          severity: 'info',
          category: 'Content',
          message: 'Program has no description',
          details: 'A description helps attenders understand what the program is about',
          fix_suggestion: 'Add a description in program settings'
        });
      }

      // Count issues by severity
      const errors = issues.filter(i => i.severity === 'error').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;
      const info = issues.filter(i => i.severity === 'info').length;

      const result: AuditResult = {
        timestamp: new Date().toISOString(),
        total_checks: totalChecks,
        errors,
        warnings,
        info,
        issues
      };

      setAuditResult(result);
      setLastAuditTime(new Date().toLocaleString());

      if (errors === 0 && warnings === 0) {
        toast.success('Audit completed with no critical issues');
      } else if (errors > 0) {
        toast.error(`Audit found ${errors} error(s) and ${warnings} warning(s)`);
      } else {
        toast.warning(`Audit found ${warnings} warning(s)`);
      }

    } catch (error: any) {
      console.error('Error running audit:', error);
      toast.error('Failed to complete audit');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditReport = () => {
    if (!auditResult) return;

    const report = {
      program_name: program.name,
      program_id: programId,
      audit_result: auditResult,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${program.name.replace(/\s+/g, '_')}_audit_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Audit report exported');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Program Audit</CardTitle>
              <CardDescription>
                Run comprehensive checks on program data integrity and configuration
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {auditResult && (
                <Button variant="outline" onClick={exportAuditReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              )}
              <Button onClick={runAudit} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Running Audit...' : 'Run Audit'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {lastAuditTime && (
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600">
              Last audit: {lastAuditTime}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Audit Results */}
      {auditResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{auditResult.total_checks}</div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{auditResult.errors}</div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{auditResult.warnings}</div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{auditResult.info}</div>
              </CardContent>
            </Card>
          </div>

          {/* Issues List */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Issues</CardTitle>
              <CardDescription>
                {auditResult.issues.length === 0
                  ? 'No issues found - your program data looks good!'
                  : `Found ${auditResult.issues.length} issue(s) that need attention`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditResult.issues.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                  <p className="text-gray-600">
                    Your program passed all audit checks. No issues detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditResult.issues.map((issue, index) => (
                    <Alert key={index} className={getSeverityColor(issue.severity)}>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getSeverityIcon(issue.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTitle className="mb-0">{issue.message}</AlertTitle>
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          </div>
                          {issue.details && (
                            <AlertDescription className="mt-2">
                              {issue.details}
                            </AlertDescription>
                          )}
                          {issue.fix_suggestion && (
                            <div className="mt-3 p-2 bg-white/50 rounded border border-current/20">
                              <p className="text-sm font-medium mb-1">💡 Suggestion:</p>
                              <p className="text-sm">{issue.fix_suggestion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
              <CardDescription>
                Overview of program data at the time of audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Program Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{program.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attenders:</span>
                      <span className="font-medium">{program.member_ids?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admins:</span>
                      <span className="font-medium">{program.admin_ids?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Journeys:</span>
                      <span className="font-medium">{journeys.length}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Audit Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-medium">
                        {new Date(auditResult.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Checks Performed:</span>
                      <span className="font-medium">{auditResult.total_checks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issues Found:</span>
                      <span className="font-medium">{auditResult.issues.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Initial State */}
      {!auditResult && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Run Audit</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Click "Run Audit" to perform comprehensive checks on your program data integrity,
              configuration, and content structure.
            </p>
            <Button onClick={runAudit} size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Your First Audit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
