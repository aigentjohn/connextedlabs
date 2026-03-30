// JSON Resume Import Utility
// Handles importing from JSON Resume standard format into our database

import { SupabaseClient } from '@supabase/supabase-js';

interface JSONResume {
  basics?: {
    name?: string;
    label?: string;
    image?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      city?: string;
      region?: string;
      address?: string;
      postalCode?: string;
      countryCode?: string;
    };
    profiles?: Array<{
      network?: string;
      username?: string;
      url?: string;
    }>;
  };
  work?: Array<{
    name?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  volunteer?: Array<{
    organization?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution?: string;
    url?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    courses?: string[];
  }>;
  awards?: Array<{
    title?: string;
    date?: string;
    awarder?: string;
    summary?: string;
  }>;
  certificates?: Array<{
    name?: string;
    date?: string;
    issuer?: string;
    url?: string;
  }>;
  publications?: Array<{
    name?: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
  }>;
  skills?: Array<{
    name?: string;
    level?: string;
    keywords?: string[];
  }>;
  languages?: Array<{
    language?: string;
    fluency?: string;
  }>;
  interests?: Array<{
    name?: string;
    keywords?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    roles?: string[];
  }>;
}

// Map JSON Resume skill levels to our proficiency levels
function mapLevelToProficiency(level: string): string {
  const mapping: Record<string, string> = {
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
    'master': 'expert',
    'expert': 'expert'
  };
  return mapping[level.toLowerCase()] || 'intermediate';
}

// Map JSON Resume fluency to our proficiency levels
function mapFluencyToProficiency(fluency: string): string {
  const mapping: Record<string, string> = {
    'elementary': 'beginner',
    'limited working': 'beginner',
    'professional working': 'intermediate',
    'full professional': 'advanced',
    'native or bilingual': 'expert',
    'native speaker': 'expert'
  };
  return mapping[fluency.toLowerCase()] || 'intermediate';
}

export async function importJSONResume(
  data: JSONResume,
  userId: string,
  supabase: SupabaseClient
): Promise<{
  success: boolean;
  counts: {
    skills: number;
    credentials: number;
    affiliations: number;
    languages: number;
  };
  error?: string;
}> {
  console.log('[JSON Resume Import] Starting import for user:', userId);
  console.log('[JSON Resume Import] Data keys:', Object.keys(data));
  
  try {
    const counts = {
      skills: 0,
      credentials: 0,
      affiliations: 0,
      languages: 0
    };

    // 1. Update users table with basics
    const updateData: any = {};
    
    if (data.basics) {
      console.log('[JSON Resume Import] Processing basics...');
      if (data.basics.name) updateData.name = data.basics.name;
      if (data.basics.label) updateData.tagline = data.basics.label;
      if (data.basics.image) updateData.avatar = data.basics.image;
      if (data.basics.email) updateData.email = data.basics.email;
      if (data.basics.summary) updateData.bio = data.basics.summary;
      
      // Combine city and region for location
      if (data.basics.location) {
        const locationParts = [];
        if (data.basics.location.city) locationParts.push(data.basics.location.city);
        if (data.basics.location.region) locationParts.push(data.basics.location.region);
        if (locationParts.length > 0) {
          updateData.location = locationParts.join(', ');
        }
      }
      
      // Extract LinkedIn and Twitter from profiles
      if (data.basics.profiles && Array.isArray(data.basics.profiles)) {
        data.basics.profiles.forEach(profile => {
          if (profile.network?.toLowerCase() === 'linkedin' && profile.url) {
            updateData.linkedin_url = profile.url;
          }
          if (profile.network?.toLowerCase() === 'twitter' && profile.username) {
            updateData.twitter_handle = profile.username.startsWith('@') ? profile.username : `@${profile.username}`;
          }
        });
      }
    }

    // Add current job from work[0]
    if (data.work && data.work.length > 0 && data.work[0].position && data.work[0].name) {
      updateData.job_title = data.work[0].position;
      updateData.company_name = data.work[0].name;
    }

    // Extract interests
    if (data.interests && Array.isArray(data.interests)) {
      const allInterests: string[] = [];
      data.interests.forEach(interest => {
        if (interest.name) allInterests.push(interest.name);
        if (interest.keywords) allInterests.push(...interest.keywords);
      });
      if (allInterests.length > 0) {
        updateData.interests = allInterests;
      }
    }

    // Update users table
    console.log('[JSON Resume Import] Updating users table with:', updateData);
    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (userError) {
      console.error('[JSON Resume Import] User update error:', userError);
      throw new Error(`Failed to update user profile: ${userError.message}`);
    }

    // 2. Import Skills
    if (data.skills && Array.isArray(data.skills)) {
      // Delete existing non-language skills
      await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .not('skill_name', 'like', '%(Language)%');

      const skillsToInsert: any[] = [];

      data.skills.forEach(skill => {
        if (skill.name && skill.name.trim()) {
          skillsToInsert.push({
            user_id: userId,
            skill_name: skill.name.trim(),
            proficiency_level: skill.level ? mapLevelToProficiency(skill.level) : 'intermediate',
            years_experience: null,
            is_public: true
          });

          // Also add keywords as separate skills
          if (skill.keywords && Array.isArray(skill.keywords)) {
            skill.keywords.forEach(keyword => {
              if (keyword && keyword.trim()) {
                skillsToInsert.push({
                  user_id: userId,
                  skill_name: keyword.trim(),
                  proficiency_level: skill.level ? mapLevelToProficiency(skill.level) : 'intermediate',
                  years_experience: null,
                  is_public: true
                });
              }
            });
          }
        }
      });

      if (skillsToInsert.length > 0) {
        const { error: skillsError } = await supabase
          .from('user_skills')
          .insert(skillsToInsert);

        if (!skillsError) {
          counts.skills = skillsToInsert.length;
        }
      }
    }

    // 3. Import Languages
    if (data.languages && Array.isArray(data.languages)) {
      // Delete existing language skills
      await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', userId)
        .like('skill_name', '%(Language)%');

      const languageSkills: any[] = [];

      data.languages.forEach(lang => {
        if (lang.language && lang.language.trim()) {
          languageSkills.push({
            user_id: userId,
            skill_name: `${lang.language.trim()} (Language)`,
            proficiency_level: lang.fluency ? mapFluencyToProficiency(lang.fluency) : 'intermediate',
            years_experience: null,
            is_public: true
          });
        }
      });

      if (languageSkills.length > 0) {
        const { error: langError } = await supabase
          .from('user_skills')
          .insert(languageSkills);

        if (!langError) {
          counts.languages = languageSkills.length;
        }
      }
    }

    // 4. Import Certificates, Awards, Publications
    await supabase
      .from('user_credentials')
      .delete()
      .eq('user_id', userId);

    const credentials: any[] = [];

    // Certificates
    if (data.certificates && Array.isArray(data.certificates)) {
      data.certificates.forEach(cert => {
        if (cert.name && cert.name.trim() && cert.issuer && cert.issuer.trim()) {
          credentials.push({
            user_id: userId,
            type: 'certification',
            name: cert.name.trim(),
            issuing_organization: cert.issuer.trim(),
            issue_date: cert.date || new Date().toISOString().split('T')[0],
            expiry_date: null,
            is_public: true
          });
        }
      });
    }

    // Awards
    if (data.awards && Array.isArray(data.awards)) {
      data.awards.forEach(award => {
        if (award.title && award.title.trim() && award.awarder && award.awarder.trim()) {
          credentials.push({
            user_id: userId,
            type: 'award',
            name: award.title.trim(),
            issuing_organization: award.awarder.trim(),
            issue_date: award.date || new Date().toISOString().split('T')[0],
            expiry_date: null,
            is_public: true
          });
        }
      });
    }

    // Publications
    if (data.publications && Array.isArray(data.publications)) {
      data.publications.forEach(pub => {
        if (pub.name && pub.name.trim() && pub.publisher && pub.publisher.trim()) {
          credentials.push({
            user_id: userId,
            type: 'publication',
            name: pub.name.trim(),
            issuing_organization: pub.publisher.trim(),
            issue_date: pub.releaseDate || new Date().toISOString().split('T')[0],
            expiry_date: null,
            is_public: true
          });
        }
      });
    }

    if (credentials.length > 0) {
      const { error: credsError } = await supabase
        .from('user_credentials')
        .insert(credentials);

      if (!credsError) {
        counts.credentials = credentials.length;
      }
    }

    // 5. Import Work History, Volunteer, Education as Affiliations
    await supabase
      .from('user_affiliations')
      .delete()
      .eq('user_id', userId);

    const affiliations: any[] = [];

    // Work history (skip first one as it's current job)
    if (data.work && Array.isArray(data.work)) {
      data.work.forEach((job, index) => {
        // Skip first job if it matches current job
        if (index === 0 && job.position === updateData.job_title && job.name === updateData.company_name) {
          return;
        }

        if (job.name && job.name.trim() && job.position && job.position.trim()) {
          affiliations.push({
            user_id: userId,
            organization_name: job.name.trim(),
            organization_type: 'employer',
            relationship: job.position.trim(),
            start_date: job.startDate || new Date().toISOString().split('T')[0],
            end_date: job.endDate || null,
            is_current: !job.endDate,
            is_public: true
          });
        }
      });
    }

    // Volunteer work
    if (data.volunteer && Array.isArray(data.volunteer)) {
      data.volunteer.forEach(vol => {
        if (vol.organization && vol.organization.trim() && vol.position && vol.position.trim()) {
          affiliations.push({
            user_id: userId,
            organization_name: vol.organization.trim(),
            organization_type: 'volunteer',
            relationship: vol.position.trim(),
            start_date: vol.startDate || new Date().toISOString().split('T')[0],
            end_date: vol.endDate || null,
            is_current: !vol.endDate,
            is_public: true
          });
        }
      });
    }

    // Education
    if (data.education && Array.isArray(data.education)) {
      data.education.forEach(edu => {
        if (edu.institution && edu.institution.trim()) {
          const relationship = [edu.studyType, edu.area].filter(Boolean).join(' in ') || 'Student';
          affiliations.push({
            user_id: userId,
            organization_name: edu.institution.trim(),
            organization_type: 'education',
            relationship: relationship,
            start_date: edu.startDate || new Date().toISOString().split('T')[0],
            end_date: edu.endDate || null,
            is_current: !edu.endDate,
            is_public: true
          });
        }
      });
    }

    if (affiliations.length > 0) {
      console.log('[JSON Resume Import] Inserting affiliations:', affiliations.length);
      const { error: affsError } = await supabase
        .from('user_affiliations')
        .insert(affiliations);

      if (affsError) {
        console.error('[JSON Resume Import] Affiliations insert error:', affsError);
      } else {
        counts.affiliations = affiliations.length;
      }
    }

    console.log('[JSON Resume Import] Import completed successfully!', counts);
    return {
      success: true,
      counts
    };

  } catch (error: any) {
    console.error('[JSON Resume Import] Fatal error:', error);
    return {
      success: false,
      counts: { skills: 0, credentials: 0, affiliations: 0, languages: 0 },
      error: error.message || 'Unknown error'
    };
  }
}