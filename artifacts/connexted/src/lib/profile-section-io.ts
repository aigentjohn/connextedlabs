/**
 * Profile section export/import for AI-assisted profile editing.
 *
 * Each section exports a JSON file containing the current data plus an
 * embedded AI prompt. The user pastes the file into ChatGPT/Claude/Gemini,
 * fills it out, then imports the updated JSON back.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ── AI prompts embedded in each export ──────────────────────────────────────

const AI_PROMPTS = {
  basics: `You are helping me complete my community profile basics section.
Review my current information below and help me write a compelling bio and tagline, or fill in any missing fields.
Ask me for any information you need, then return ONLY valid JSON using the exact same structure and field names — do not add or remove fields.`,

  professional: `You are helping me complete my community professional profile.
Review my current information below and help me improve my job details, work history, and skills.
Ask me for any information you need, then return ONLY valid JSON using the exact same structure and field names.
Valid organization_type values: employer, volunteer, education, organization
Valid proficiency_level values: beginner, intermediate, advanced, expert`,

  engagement: `You are helping me complete my community engagement profile.
Review my current information below and help me articulate my interests and what I am looking for in this community.
Ask me for any information you need, then return ONLY valid JSON using the exact same structure and field names.
Valid career_stage values: student, early-career, mid-career, senior, executive, entrepreneur, career-changer, retired
Valid looking_for values: peer-support, mentorship, skill-building, accountability, visibility, collaboration`,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function downloadBasicsExport(profile: any) {
  downloadJson(
    {
      _ai_prompt: AI_PROMPTS.basics,
      _section: 'basics',
      name: profile.name || '',
      tagline: profile.tagline || '',
      bio: profile.bio || '',
      location: profile.location || '',
      social_links: profile.social_links || {
        linkedin: '', twitter: '', website: '',
        github: '', instagram: '', calendly: '',
      },
    },
    'profile-basics.json',
  );
}

export async function downloadProfessionalExport(profile: any, supabase: SupabaseClient) {
  const { data: affiliations } = await supabase
    .from('user_affiliations')
    .select('organization_name, organization_type, relationship, start_date, end_date, is_current')
    .eq('user_id', profile.id)
    .order('is_current', { ascending: false });

  const { data: skills } = await supabase
    .from('user_skills')
    .select('skill_name, proficiency_level, years_experience')
    .eq('user_id', profile.id);

  downloadJson(
    {
      _ai_prompt: AI_PROMPTS.professional,
      _section: 'professional',
      professional_status: profile.professional_status || '',
      job_title: profile.job_title || '',
      company_name: profile.company_name || '',
      years_experience: profile.years_experience ?? 0,
      affiliations: affiliations || [],
      skills: skills || [],
    },
    'profile-professional.json',
  );
}

export function downloadEngagementExport(profile: any) {
  downloadJson(
    {
      _ai_prompt: AI_PROMPTS.engagement,
      _section: 'engagement',
      interests: profile.interests || [],
      professional_roles: profile.professional_roles || [],
      career_stage: profile.career_stage || '',
      looking_for: profile.looking_for || [],
      looking_for_details: profile.looking_for_details || '',
    },
    'profile-engagement.json',
  );
}

// ── Imports ───────────────────────────────────────────────────────────────────

export async function importBasicsSection(json: any, userId: string, supabase: SupabaseClient) {
  if (json._section && json._section !== 'basics') {
    throw new Error(`Wrong section: expected 'basics', got '${json._section}'`);
  }
  const update: Record<string, any> = {};
  if (json.name !== undefined) update.name = json.name;
  if (json.tagline !== undefined) update.tagline = json.tagline;
  if (json.bio !== undefined) update.bio = json.bio;
  if (json.location !== undefined) update.location = json.location;
  if (json.social_links !== undefined) update.social_links = json.social_links;
  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) throw error;
}

export async function importProfessionalSection(json: any, userId: string, supabase: SupabaseClient) {
  if (json._section && json._section !== 'professional') {
    throw new Error(`Wrong section: expected 'professional', got '${json._section}'`);
  }

  const update: Record<string, any> = {};
  if (json.professional_status !== undefined) update.professional_status = json.professional_status;
  if (json.job_title !== undefined) update.job_title = json.job_title;
  if (json.company_name !== undefined) update.company_name = json.company_name;
  if (json.years_experience !== undefined) update.years_experience = json.years_experience;
  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('users').update(update).eq('id', userId);
    if (error) throw error;
  }

  if (Array.isArray(json.affiliations)) {
    await supabase.from('user_affiliations').delete().eq('user_id', userId);
    if (json.affiliations.length > 0) {
      const { error } = await supabase.from('user_affiliations')
        .insert(json.affiliations.map((a: any) => ({ ...a, user_id: userId })));
      if (error) throw error;
    }
  }

  if (Array.isArray(json.skills)) {
    await supabase.from('user_skills').delete().eq('user_id', userId);
    if (json.skills.length > 0) {
      const { error } = await supabase.from('user_skills')
        .insert(json.skills.map((s: any) => ({ ...s, user_id: userId })));
      if (error) throw error;
    }
  }
}

export async function importEngagementSection(json: any, userId: string, supabase: SupabaseClient) {
  if (json._section && json._section !== 'engagement') {
    throw new Error(`Wrong section: expected 'engagement', got '${json._section}'`);
  }
  const update: Record<string, any> = {};
  if (json.interests !== undefined) update.interests = json.interests;
  if (json.professional_roles !== undefined) update.professional_roles = json.professional_roles;
  if (json.career_stage !== undefined) update.career_stage = json.career_stage;
  if (json.looking_for !== undefined) update.looking_for = json.looking_for;
  if (json.looking_for_details !== undefined) update.looking_for_details = json.looking_for_details;
  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) throw error;
}
