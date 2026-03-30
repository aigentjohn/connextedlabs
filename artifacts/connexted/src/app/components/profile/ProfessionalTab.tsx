import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Separator } from '@/app/components/ui/separator';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  Briefcase, 
  Building2, 
  Users,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfessionalTabProps {
  profile: any;
  onUpdate?: () => void;
}

interface Affiliation {
  id?: string;
  organization_name: string;
  organization_type: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  description?: string;
}

export function ProfessionalTab({ profile, onUpdate }: ProfessionalTabProps) {
  // Basic professional info
  const [professionalStatus, setProfessionalStatus] = useState(profile?.professional_status || '');
  const [currentRole, setCurrentRole] = useState(profile?.job_title || profile?.current_role || '');
  const [currentCompany, setCurrentCompany] = useState(profile?.company_name || profile?.current_company || '');
  const [yearsExperience, setYearsExperience] = useState(profile?.years_experience?.toString() || '');
  
  const [workHistory, setWorkHistory] = useState<Affiliation[]>([]);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAffiliations();
  }, [profile.id]);

  useEffect(() => {
    // Check if basic professional fields have changed
    const changed = 
      professionalStatus !== (profile?.professional_status || '') ||
      currentRole !== (profile?.job_title || profile?.current_role || '') ||
      currentCompany !== (profile?.company_name || profile?.current_company || '') ||
      yearsExperience !== (profile?.years_experience?.toString() || '');
    setHasChanges(changed);
  }, [professionalStatus, currentRole, currentCompany, yearsExperience, profile]);

  const fetchAffiliations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_affiliations')
        .select('*')
        .eq('user_id', profile.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const employers = (data || []).filter(a => a.organization_type === 'employer');
      const others = (data || []).filter(a => a.organization_type !== 'employer');

      setWorkHistory(employers);
      setAffiliations(others);
    } catch (error) {
      console.error('Error fetching affiliations:', error);
      toast.error('Failed to load affiliations');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentRole = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          professional_status: professionalStatus,
          job_title: currentRole,
          company_name: currentCompany,
          years_experience: parseInt(yearsExperience) || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Current role updated');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const addWorkHistory = async () => {
    try {
      const newWork: Affiliation = {
        organization_name: '',
        organization_type: 'employer',
        role: '',
        current: false,
      };

      const { data, error } = await supabase
        .from('user_affiliations')
        .insert({
          user_id: profile.id,
          ...newWork,
        })
        .select()
        .single();

      if (error) throw error;
      setWorkHistory([data, ...workHistory]);
      toast.success('Work experience added');
    } catch (error) {
      console.error('Error adding work history:', error);
      toast.error('Failed to add work experience');
    }
  };

  const updateWorkHistory = async (index: number, field: string, value: any) => {
    const updated = [...workHistory];
    updated[index] = { ...updated[index], [field]: value };
    setWorkHistory(updated);

    if (updated[index].id) {
      try {
        const { error } = await supabase
          .from('user_affiliations')
          .update({ [field]: value })
          .eq('id', updated[index].id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating work history:', error);
        toast.error('Failed to update work history');
      }
    }
  };

  const deleteWorkHistory = async (index: number) => {
    const item = workHistory[index];
    if (item.id) {
      try {
        const { error } = await supabase
          .from('user_affiliations')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting work history:', error);
        toast.error('Failed to delete work history');
        return;
      }
    }

    setWorkHistory(workHistory.filter((_, i) => i !== index));
    toast.success('Work experience deleted');
  };

  const addAffiliation = async () => {
    try {
      const newAffiliation: Affiliation = {
        organization_name: '',
        organization_type: 'organization',
        role: '',
      };

      const { data, error } = await supabase
        .from('user_affiliations')
        .insert({
          user_id: profile.id,
          ...newAffiliation,
        })
        .select()
        .single();

      if (error) throw error;
      setAffiliations([data, ...affiliations]);
      toast.success('Affiliation added');
    } catch (error) {
      console.error('Error adding affiliation:', error);
      toast.error('Failed to add affiliation');
    }
  };

  const updateAffiliation = async (index: number, field: string, value: any) => {
    const updated = [...affiliations];
    updated[index] = { ...updated[index], [field]: value };
    setAffiliations(updated);

    if (updated[index].id) {
      try {
        const { error } = await supabase
          .from('user_affiliations')
          .update({ [field]: value })
          .eq('id', updated[index].id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating affiliation:', error);
        toast.error('Failed to update affiliation');
      }
    }
  };

  const deleteAffiliation = async (index: number) => {
    const item = affiliations[index];
    if (item.id) {
      try {
        const { error } = await supabase
          .from('user_affiliations')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting affiliation:', error);
        toast.error('Failed to delete affiliation');
        return;
      }
    }

    setAffiliations(affiliations.filter((_, i) => i !== index));
    toast.success('Affiliation deleted');
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Current Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="professional-status">Professional Status</Label>
            <Select
              value={professionalStatus}
              onValueChange={(value) => setProfessionalStatus(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status">
                  {professionalStatus || 'Select status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-role">Job Title</Label>
            <Input
              id="current-role"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="e.g., Product Manager"
              onBlur={saveCurrentRole}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-company">Company</Label>
            <Input
              id="current-company"
              value={currentCompany}
              onChange={(e) => setCurrentCompany(e.target.value)}
              placeholder="e.g., Acme Inc."
              onBlur={saveCurrentRole}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years-experience">Years of Experience</Label>
            <Input
              id="years-experience"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g., 5"
              onBlur={saveCurrentRole}
            />
          </div>

          <p className="text-xs text-gray-500">
            This information is displayed on your profile and in member directories
          </p>
        </CardContent>
      </Card>

      {/* Work History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Work Experience
            </CardTitle>
            <Button onClick={addWorkHistory} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No work experience added yet. Click "Add Experience" to get started.
            </p>
          ) : (
            workHistory.map((work, index) => (
              <Card key={work.id || index} className="border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Job Title</Label>
                          <Input
                            value={work.role || ''}
                            onChange={(e) => updateWorkHistory(index, 'role', e.target.value)}
                            placeholder="e.g., Senior Developer"
                            size="sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Company</Label>
                          <Input
                            value={work.organization_name}
                            onChange={(e) => updateWorkHistory(index, 'organization_name', e.target.value)}
                            placeholder="e.g., Tech Corp"
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="month"
                            value={work.start_date || ''}
                            onChange={(e) => updateWorkHistory(index, 'start_date', e.target.value)}
                            size="sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="month"
                            value={work.end_date || ''}
                            onChange={(e) => updateWorkHistory(index, 'end_date', e.target.value)}
                            disabled={work.current}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={work.current || false}
                              onChange={(e) => {
                                updateWorkHistory(index, 'current', e.target.checked);
                                if (e.target.checked) {
                                  updateWorkHistory(index, 'end_date', null);
                                }
                              }}
                            />
                            Current role
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Description (optional)</Label>
                        <Textarea
                          value={work.description || ''}
                          onChange={(e) => updateWorkHistory(index, 'description', e.target.value)}
                          placeholder="Brief description of your role and achievements"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWorkHistory(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Affiliations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Professional Affiliations
            </CardTitle>
            <Button onClick={addAffiliation} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Affiliation
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Professional organizations, communities, or groups you're affiliated with
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {affiliations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No affiliations added yet. Click "Add Affiliation" to get started.
            </p>
          ) : (
            affiliations.map((affiliation, index) => (
              <Card key={affiliation.id || index} className="border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Organization</Label>
                          <Input
                            value={affiliation.organization_name}
                            onChange={(e) => updateAffiliation(index, 'organization_name', e.target.value)}
                            placeholder="e.g., IEEE"
                            size="sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Role/Position</Label>
                          <Input
                            value={affiliation.role || ''}
                            onChange={(e) => updateAffiliation(index, 'role', e.target.value)}
                            placeholder="e.g., Member, Board Member"
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Description (optional)</Label>
                        <Textarea
                          value={affiliation.description || ''}
                          onChange={(e) => updateAffiliation(index, 'description', e.target.value)}
                          placeholder="Brief description of your involvement"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAffiliation(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}