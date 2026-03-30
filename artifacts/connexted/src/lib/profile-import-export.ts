/**
 * Profile Import/Export Utilities
 * 
 * Handles JSON Resume export/import and proficiency mapping.
 * Extracted from ProfilePage.tsx to reduce file size and isolate
 * data-operation logic (Tier 4: used occasionally).
 */
// Split candidate: ~452 lines — consider separating JsonResumeExporter, JsonResumeImporter, and ProficiencyMapper into distinct modules.

import { SupabaseClient } from '@supabase/supabase-js';
import { importJSONResume } from '@/app/components/utils/jsonResumeImporter';

// --- Proficiency Mapping Utilities ---

export const mapProficiencyToLevel = (proficiency: string): string => {
  const mapping: Record<string, string> = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'expert': 'Master',
  };
  return mapping[proficiency] || 'Intermediate';
};

export const mapProficiencyToFluency = (proficiency: string): string => {
  const mapping: Record<string, string> = {
    'beginner': 'Elementary',
    'intermediate': 'Professional Working',
    'advanced': 'Full Professional',
    'expert': 'Native or Bilingual',
  };
  return mapping[proficiency] || 'Professional Working';
};

export const mapLevelToProficiency = (level: string): string => {
  const mapping: Record<string, string> = {
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
    'master': 'expert',
    'expert': 'expert',
  };
  return mapping[level.toLowerCase()] || 'intermediate';
};

export const mapFluencyToProficiency = (fluency: string): string => {
  const mapping: Record<string, string> = {
    'elementary': 'beginner',
    'limited working': 'beginner',
    'professional working': 'intermediate',
    'full professional': 'advanced',
    'native or bilingual': 'expert',
    'native speaker': 'expert',
  };
  return mapping[fluency.toLowerCase()] || 'intermediate';
};

// --- JSON Resume Export ---

interface ExportProfileParams {
  profile: any;
  phone: string;
  location: string;
  website: string;
  bio: string;
  linkedinUrl: string;
  twitterHandle: string;
  supabase: SupabaseClient;
}

export async function exportProfileAsJSONResume({
  profile,
  phone,
  location,
  website,
  bio,
  linkedinUrl,
  twitterHandle,
  supabase,
}: ExportProfileParams): Promise<void> {
  // Fetch skills, credentials, and affiliations from database
  const [skillsData, credentialsData, affiliationsData] = await Promise.all([
    supabase.from('user_skills').select('*').eq('user_id', profile.id),
    supabase.from('user_credentials').select('*').eq('user_id', profile.id),
    supabase.from('user_affiliations').select('*').eq('user_id', profile.id),
  ]);

  // Extract social profiles
  const profiles: any[] = [];
  if (linkedinUrl) {
    profiles.push({
      network: 'LinkedIn',
      username: linkedinUrl.split('/').pop() || '',
      url: linkedinUrl,
    });
  }
  if (twitterHandle) {
    profiles.push({
      network: 'Twitter',
      username: twitterHandle.replace('@', ''),
      url: `https://twitter.com/${twitterHandle.replace('@', '')}`,
    });
  }

  // Separate affiliations by type
  const workHistory = (affiliationsData.data || [])
    .filter((a: any) => a.organization_type === 'employer')
    .map((a: any) => ({
      name: a.organization_name,
      position: a.relationship,
      startDate: a.start_date || '',
      endDate: a.end_date || '',
      summary: '',
      highlights: [],
    }));

  const volunteerHistory = (affiliationsData.data || [])
    .filter((a: any) => a.organization_type === 'volunteer')
    .map((a: any) => ({
      organization: a.organization_name,
      position: a.relationship,
      startDate: a.start_date || '',
      endDate: a.end_date || '',
      summary: '',
      highlights: [],
    }));

  const education = (affiliationsData.data || [])
    .filter((a: any) => a.organization_type === 'education')
    .map((a: any) => ({
      institution: a.organization_name,
      area: '',
      studyType: a.relationship,
      startDate: a.start_date || '',
      endDate: a.end_date || '',
      score: '',
      courses: [],
    }));

  // Add current job to work history if available
  if (profile.job_title && profile.company_name) {
    workHistory.unshift({
      name: profile.company_name,
      position: profile.job_title,
      startDate: '',
      endDate: '',
      summary: '',
      highlights: [],
    });
  }

  // Separate skills and languages
  const skills: any[] = [];
  const languages: any[] = [];

  (skillsData.data || []).forEach((s: any) => {
    if (s.skill_name.includes('(Language)')) {
      languages.push({
        language: s.skill_name.replace('(Language)', '').trim(),
        fluency: mapProficiencyToFluency(s.proficiency_level),
      });
    } else {
      skills.push({
        name: s.skill_name,
        level: mapProficiencyToLevel(s.proficiency_level),
        keywords: [],
      });
    }
  });

  // Separate credentials by type
  const certificates = (credentialsData.data || [])
    .filter((c: any) => c.type === 'certification' || c.type === 'certificate')
    .map((c: any) => ({
      name: c.name,
      date: c.issue_date || '',
      issuer: c.issuing_organization,
      url: '',
    }));

  const awards = (credentialsData.data || [])
    .filter((c: any) => c.type === 'award')
    .map((c: any) => ({
      title: c.name,
      date: c.issue_date || '',
      awarder: c.issuing_organization,
      summary: '',
    }));

  const publications = (credentialsData.data || [])
    .filter((c: any) => c.type === 'publication')
    .map((c: any) => ({
      name: c.name,
      publisher: c.issuing_organization,
      releaseDate: c.issue_date || '',
      url: '',
      summary: '',
    }));

  // Create JSON Resume format
  const jsonResume = {
    '$schema': 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profile.name || '',
      label: profile.tagline || '',
      image: profile.avatar || '',
      email: profile.email || '',
      phone: phone || '',
      url: website || '',
      summary: bio || '',
      location: {
        address: '',
        postalCode: '',
        city: location ? location.split(',')[0].trim() : '',
        countryCode: '',
        region: location ? (location.split(',')[1] || '').trim() : '',
      },
      profiles: profiles,
    },
    work: workHistory,
    volunteer: volunteerHistory,
    education: education,
    awards: awards,
    certificates: certificates,
    publications: publications,
    skills: skills,
    languages: languages,
    interests: (profile.interests || []).map((interest: string) => ({
      name: interest,
      keywords: [],
    })),
    references: [],
    projects: [],
  };

  // Create JSON blob and download
  const jsonBlob = new Blob([JSON.stringify(jsonResume, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(jsonBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resume-${profile.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- JSON Resume Import ---

interface ImportResult {
  success: boolean;
  isJSONResume: boolean;
  message: string;
  updatedFields?: {
    bio?: string;
    location?: string;
    phone?: string;
    website?: string;
    linkedinUrl?: string;
    twitterHandle?: string;
    privacy?: {
      email_private?: boolean;
      phone_private?: boolean;
      location_private?: boolean;
      whatsapp_private?: boolean;
    };
  };
}

export async function importProfileFromJSON(
  data: any,
  profileId: string,
  supabase: SupabaseClient
): Promise<ImportResult> {
  // Check if this is JSON Resume format
  const isJSONResume = data.basics || data.$schema?.includes('jsonresume');

  if (isJSONResume) {
    const result = await importJSONResume(data, profileId, supabase);

    if (result.success) {
      return {
        success: true,
        isJSONResume: true,
        message: `JSON Resume imported! ${result.counts.skills} skills, ${result.counts.languages} languages, ${result.counts.credentials} credentials, ${result.counts.affiliations} affiliations added.`,
      };
    } else {
      throw new Error(result.error || 'Failed to import JSON Resume');
    }
  }

  // Legacy format fallback
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.tagline !== undefined) updateData.tagline = data.tagline;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.whatsapp_number !== undefined) updateData.whatsapp_number = data.whatsapp_number;
  if (data.interests !== undefined) updateData.interests = data.interests;
  if (data.professional_status !== undefined) updateData.professional_status = data.professional_status;
  if (data.job_title !== undefined) updateData.job_title = data.job_title;
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.years_experience !== undefined) updateData.years_experience = data.years_experience;
  if (data.privacy_settings !== undefined) updateData.privacy_settings = data.privacy_settings;

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', profileId);

  if (userError) {
    throw new Error(`Failed to update user profile: ${userError.message}`);
  }

  // Handle skills
  if (data.skills && Array.isArray(data.skills)) {
    await supabase.from('user_skills').delete().eq('user_id', profileId);

    const validSkills = data.skills.filter(
      (skill: any) => skill.skill_name && skill.skill_name.trim() !== ''
    );

    if (validSkills.length > 0) {
      const skillsToInsert = validSkills.map((skill: any) => ({
        user_id: profileId,
        skill_name: skill.skill_name.trim(),
        proficiency_level: skill.proficiency_level || 'intermediate',
        years_experience: skill.years_experience || null,
        is_public: true,
      }));

      const { error: skillsError } = await supabase
        .from('user_skills')
        .insert(skillsToInsert);

      if (skillsError) {
        console.error('Error inserting skills:', skillsError);
      }
    }
  }

  // Handle credentials
  if (data.credentials && Array.isArray(data.credentials)) {
    await supabase.from('user_credentials').delete().eq('user_id', profileId);

    const validCredentials = data.credentials.filter(
      (cred: any) =>
        cred.name && cred.name.trim() !== '' &&
        cred.issuing_organization && cred.issuing_organization.trim() !== ''
    );

    if (validCredentials.length > 0) {
      const credentialsToInsert = validCredentials.map((cred: any) => ({
        user_id: profileId,
        type: cred.type || 'certification',
        name: cred.name.trim(),
        issuing_organization: cred.issuing_organization.trim(),
        issue_date: cred.issue_date || new Date().toISOString().split('T')[0],
        expiry_date: cred.expiry_date || null,
        is_public: true,
      }));

      const { error: credsError } = await supabase
        .from('user_credentials')
        .insert(credentialsToInsert);

      if (credsError) {
        console.error('Error inserting credentials:', credsError);
      }
    }
  }

  // Handle affiliations
  if (data.affiliations && Array.isArray(data.affiliations)) {
    await supabase.from('user_affiliations').delete().eq('user_id', profileId);

    const validAffiliations = data.affiliations.filter(
      (aff: any) =>
        aff.organization_name && aff.organization_name.trim() !== '' &&
        aff.relationship && aff.relationship.trim() !== ''
    );

    if (validAffiliations.length > 0) {
      const affiliationsToInsert = validAffiliations.map((aff: any) => ({
        user_id: profileId,
        organization_name: aff.organization_name.trim(),
        organization_type: aff.organization_type ? aff.organization_type.trim() : '',
        relationship: aff.relationship.trim(),
        start_date: aff.start_date || new Date().toISOString().split('T')[0],
        end_date: aff.end_date || null,
        is_current: aff.is_current !== undefined ? aff.is_current : true,
        is_public: true,
      }));

      const { error: affsError } = await supabase
        .from('user_affiliations')
        .insert(affiliationsToInsert);

      if (affsError) {
        console.error('Error inserting affiliations:', affsError);
      }
    }
  }

  // Return updated fields for local state sync
  return {
    success: true,
    isJSONResume: false,
    message: `Profile imported successfully! ${data.skills?.length || 0} skills, ${data.credentials?.length || 0} credentials, and ${data.affiliations?.length || 0} affiliations added.`,
    updatedFields: {
      bio: data.bio,
      location: data.location,
      phone: data.phone,
      website: data.website,
      linkedinUrl: data.linkedin_url,
      twitterHandle: data.twitter_handle,
      privacy: data.privacy,
    },
  };
}

// --- vCard Import Handler ---

export async function importVCardData(
  profileData: any,
  profileId: string,
  supabase: SupabaseClient
): Promise<void> {
  const updateData: any = {};

  if (profileData.name) updateData.name = profileData.name;
  if (profileData.bio) updateData.bio = profileData.bio;
  if (profileData.title) updateData.job_title = profileData.title;
  if (profileData.company) updateData.company_name = profileData.company;
  if (profileData.location) updateData.location = profileData.location;
  if (profileData.phone) updateData.phone_number = profileData.phone;

  if (profileData.social_links) {
    if (profileData.social_links.website) updateData.website = profileData.social_links.website;
    if (profileData.social_links.linkedin) updateData.linkedin_url = profileData.social_links.linkedin;
    if (profileData.social_links.twitter) updateData.twitter_handle = profileData.social_links.twitter;
    if (profileData.social_links.github) updateData.github_url = profileData.social_links.github;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', profileId);

  if (updateError) throw updateError;
}
