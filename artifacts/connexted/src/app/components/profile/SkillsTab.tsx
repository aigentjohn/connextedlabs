import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Award,
  GraduationCap,
  Star,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface SkillsTabProps {
  profile: any;
}

interface Skill {
  id?: string;
  skill_name: string;
  proficiency_level?: string;
  is_public?: boolean;
}

interface Credential {
  id?: string;
  credential_name: string;
  issuing_organization?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
  is_public?: boolean;
}

export function SkillsTab({ profile }: SkillsTabProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillsAndCredentials();
  }, [profile.id]);

  const fetchSkillsAndCredentials = async () => {
    try {
      const [skillsData, credentialsData, badgesData] = await Promise.all([
        supabase.from('user_skills').select('*').eq('user_id', profile.id),
        supabase.from('user_credentials').select('*').eq('user_id', profile.id),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profile.id),
      ]);

      setSkills(skillsData.data || []);
      setCredentials(credentialsData.data || []);
      setBadges(badgesData.data || []);
    } catch (error) {
      console.error('Error fetching skills and credentials:', error);
      toast.error('Failed to load skills and credentials');
    } finally {
      setLoading(false);
    }
  };

  // Skills
  const addSkill = async () => {
    try {
      const { data, error } = await supabase
        .from('user_skills')
        .insert({
          user_id: profile.id,
          skill_name: '',
          proficiency_level: 'intermediate',
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;
      setSkills([...skills, data]);
      toast.success('Skill added');
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error('Failed to add skill');
    }
  };

  const updateSkill = async (index: number, field: string, value: any) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);

    if (updated[index].id) {
      try {
        const { error } = await supabase
          .from('user_skills')
          .update({ [field]: value })
          .eq('id', updated[index].id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating skill:', error);
        toast.error('Failed to update skill');
      }
    }
  };

  const deleteSkill = async (index: number) => {
    const item = skills[index];
    if (item.id) {
      try {
        const { error } = await supabase
          .from('user_skills')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting skill:', error);
        toast.error('Failed to delete skill');
        return;
      }
    }

    setSkills(skills.filter((_, i) => i !== index));
    toast.success('Skill deleted');
  };

  // Credentials
  const addCredential = async () => {
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .insert({
          user_id: profile.id,
          credential_name: '',
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;
      setCredentials([...credentials, data]);
      toast.success('Credential added');
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Failed to add credential');
    }
  };

  const updateCredential = async (index: number, field: string, value: any) => {
    const updated = [...credentials];
    updated[index] = { ...updated[index], [field]: value };
    setCredentials(updated);

    if (updated[index].id) {
      try {
        const { error } = await supabase
          .from('user_credentials')
          .update({ [field]: value })
          .eq('id', updated[index].id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating credential:', error);
        toast.error('Failed to update credential');
      }
    }
  };

  const deleteCredential = async (index: number) => {
    const item = credentials[index];
    if (item.id) {
      try {
        const { error } = await supabase
          .from('user_credentials')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting credential:', error);
        toast.error('Failed to delete credential');
        return;
      }
    }

    setCredentials(credentials.filter((_, i) => i !== index));
    toast.success('Credential deleted');
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Skills
            </CardTitle>
            <Button onClick={addSkill} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No skills added yet. Click "Add Skill" to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {skills.map((skill, index) => (
                <div key={skill.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      value={skill.skill_name}
                      onChange={(e) => updateSkill(index, 'skill_name', e.target.value)}
                      placeholder="e.g., React, Project Management"
                      size="sm"
                    />
                    <select
                      value={skill.proficiency_level || 'intermediate'}
                      onChange={(e) => updateSkill(index, 'proficiency_level', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={skill.is_public !== false ? 'Visible on public profile — click to hide' : 'Hidden from public profile — click to show'}
                    onClick={() => updateSkill(index, 'is_public', skill.is_public === false ? true : false)}
                    className={skill.is_public === false ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:text-green-700'}
                  >
                    {skill.is_public === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSkill(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications & Credentials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Certifications & Credentials
            </CardTitle>
            <Button onClick={addCredential} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No credentials added yet. Click "Add Credential" to get started.
            </p>
          ) : (
            credentials.map((credential, index) => (
              <Card key={credential.id || index} className="border-gray-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Credential Name</Label>
                          <Input
                            value={credential.credential_name}
                            onChange={(e) => updateCredential(index, 'credential_name', e.target.value)}
                            placeholder="e.g., PMP, AWS Certified"
                            size="sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Issuing Organization</Label>
                          <Input
                            value={credential.issuing_organization || ''}
                            onChange={(e) => updateCredential(index, 'issuing_organization', e.target.value)}
                            placeholder="e.g., PMI, Amazon"
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Issue Date</Label>
                          <Input
                            type="month"
                            value={credential.issue_date || ''}
                            onChange={(e) => updateCredential(index, 'issue_date', e.target.value)}
                            size="sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expiry Date (optional)</Label>
                          <Input
                            type="month"
                            value={credential.expiry_date || ''}
                            onChange={(e) => updateCredential(index, 'expiry_date', e.target.value)}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Credential URL (optional)</Label>
                        <Input
                          type="url"
                          value={credential.credential_url || ''}
                          onChange={(e) => updateCredential(index, 'credential_url', e.target.value)}
                          placeholder="https://..."
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={credential.is_public !== false ? 'Visible on public profile — click to hide' : 'Hidden from public profile — click to show'}
                        onClick={() => updateCredential(index, 'is_public', credential.is_public === false ? true : false)}
                        className={credential.is_public === false ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:text-green-700'}
                      >
                        {credential.is_public === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCredential(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Earned Badges
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Badges you've earned through participation in CONNEXTED LABS
          </p>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No badges earned yet. Participate in programs, events, and activities to earn badges!
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((userBadge) => (
                <div
                  key={userBadge.id}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg"
                >
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm text-center">
                    {userBadge.badges?.name || 'Badge'}
                  </h4>
                  <p className="text-xs text-gray-600 text-center">
                    {userBadge.badges?.description || ''}
                  </p>
                  {userBadge.earned_at && (
                    <p className="text-xs text-gray-500">
                      Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
