/**
 * vCard Parser Utility
 * 
 * Parses vCard (VCF) format and maps to platform profile structure
 * Supports vCard versions 2.1, 3.0, and 4.0
 */
// Split candidate: ~479 lines — consider separating vCardParser, vCardFieldMappers, and vCardExporter into distinct modules.

export interface ParsedVCard {
  // Basic Info
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  
  // Professional
  organization?: string;
  title?: string;
  role?: string;
  
  // Contact
  website?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  
  // Location
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Additional
  note?: string;
  birthday?: string;
  photo?: string;
  
  // Raw for debugging
  raw?: Record<string, string[]>;
}

/**
 * Parse vCard text into structured data
 */
export function parseVCard(vcardText: string): ParsedVCard {
  const lines = vcardText.split(/\r?\n/).filter(line => line.trim());
  const parsed: ParsedVCard = {
    raw: {}
  };
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line folding (continuation lines start with space/tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      line += lines[i + 1].trim();
      i++;
    }
    
    // Skip BEGIN/END markers
    if (line.startsWith('BEGIN:VCARD') || line.startsWith('END:VCARD')) {
      continue;
    }
    
    // Parse property
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const propertyPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1).trim();
    
    // Split property and parameters
    const [property, ...params] = propertyPart.split(';');
    const propertyName = property.toUpperCase();
    
    // Store raw data
    if (!parsed.raw) {
      parsed.raw = {};
    }
    if (!parsed.raw[propertyName]) {
      parsed.raw[propertyName] = [];
    }
    parsed.raw[propertyName].push(value);
    
    // Map to structured fields
    switch (propertyName) {
      case 'N': // Name (structured)
        // Format: Last;First;Middle;Prefix;Suffix
        const nameParts = value.split(';');
        parsed.lastName = nameParts[0] || undefined;
        parsed.firstName = nameParts[1] || undefined;
        break;
        
      case 'FN': // Full Name
        parsed.fullName = value;
        break;
        
      case 'EMAIL':
        // Take first email if multiple
        if (!parsed.email) {
          parsed.email = value;
        }
        break;
        
      case 'TEL': // Telephone
        // Take first phone if multiple
        if (!parsed.phone) {
          parsed.phone = value;
        }
        break;
        
      case 'ORG': // Organization
        // Can be semicolon-separated (org;department)
        parsed.organization = value.split(';')[0];
        break;
        
      case 'TITLE': // Job Title
        parsed.title = value;
        break;
        
      case 'ROLE': // Role/Function
        parsed.role = value;
        break;
        
      case 'URL': // Website
        if (!parsed.website) {
          parsed.website = value;
        }
        // Check if it's LinkedIn/Twitter/GitHub
        if (value.includes('linkedin.com')) {
          parsed.linkedin = value;
        } else if (value.includes('twitter.com') || value.includes('x.com')) {
          parsed.twitter = value;
        } else if (value.includes('github.com')) {
          parsed.github = value;
        }
        break;
        
      case 'ADR': // Address
        // Format: POBox;Extended;Street;City;State;PostalCode;Country
        const addrParts = value.split(';');
        parsed.address = {
          street: addrParts[2] || undefined,
          city: addrParts[3] || undefined,
          state: addrParts[4] || undefined,
          postalCode: addrParts[5] || undefined,
          country: addrParts[6] || undefined,
        };
        break;
        
      case 'NOTE': // Notes
        parsed.note = value;
        break;
        
      case 'BDAY': // Birthday
        parsed.birthday = value;
        break;
        
      case 'PHOTO': // Photo (usually base64)
        parsed.photo = value;
        break;
        
      // Social media extensions (X- prefix for custom fields)
      case 'X-SOCIALPROFILE':
      case 'X-LINKEDIN':
        if (value.includes('linkedin.com')) {
          parsed.linkedin = value;
        }
        break;
        
      case 'X-TWITTER':
        if (value.includes('twitter.com') || value.includes('x.com') || !value.includes('http')) {
          parsed.twitter = value;
        }
        break;
        
      case 'X-GITHUB':
        if (value.includes('github.com') || !value.includes('http')) {
          parsed.github = value;
        }
        break;
    }
  }
  
  return parsed;
}

/**
 * Map parsed vCard to platform profile structure
 */
export function mapVCardToProfile(vcard: ParsedVCard): any {
  const profile: any = {};
  
  // Basic Info
  if (vcard.fullName || (vcard.firstName && vcard.lastName)) {
    profile.name = vcard.fullName || `${vcard.firstName} ${vcard.lastName}`.trim();
  }
  
  if (vcard.email) {
    profile.email = vcard.email;
  }
  
  // Bio from note
  if (vcard.note) {
    profile.bio = vcard.note;
  }
  
  // Professional Info
  if (vcard.title) {
    profile.title = vcard.title;
  }
  
  if (vcard.organization) {
    profile.company = vcard.organization;
  }
  
  // Location
  if (vcard.address) {
    const parts: string[] = [];
    if (vcard.address.city) parts.push(vcard.address.city);
    if (vcard.address.state) parts.push(vcard.address.state);
    if (vcard.address.country) parts.push(vcard.address.country);
    
    if (parts.length > 0) {
      profile.location = parts.join(', ');
    }
  }
  
  // Social Links
  const socialLinks: any = {};
  
  if (vcard.website) {
    socialLinks.website = vcard.website;
  }
  
  if (vcard.linkedin) {
    socialLinks.linkedin = vcard.linkedin;
  }
  
  if (vcard.twitter) {
    socialLinks.twitter = vcard.twitter;
  }
  
  if (vcard.github) {
    socialLinks.github = vcard.github;
  }
  
  if (Object.keys(socialLinks).length > 0) {
    profile.social_links = socialLinks;
  }
  
  // Contact Info
  if (vcard.phone) {
    profile.phone = vcard.phone;
  }
  
  return profile;
}

/**
 * Validate vCard format
 */
export function isValidVCard(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.includes('BEGIN:VCARD') &&
    trimmed.includes('END:VCARD') &&
    (trimmed.includes('FN:') || trimmed.includes('N:'))
  );
}

/**
 * Extract multiple vCards from text (if multiple cards present)
 */
export function extractVCards(text: string): string[] {
  const vcards: string[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentVCard: string[] = [];
  let inVCard = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('BEGIN:VCARD')) {
      inVCard = true;
      currentVCard = [line];
    } else if (line.trim().startsWith('END:VCARD')) {
      currentVCard.push(line);
      vcards.push(currentVCard.join('\n'));
      currentVCard = [];
      inVCard = false;
    } else if (inVCard) {
      currentVCard.push(line);
    }
  }
  
  return vcards;
}

/**
 * Parse multiple vCards
 */
export function parseMultipleVCards(text: string): ParsedVCard[] {
  const vcardTexts = extractVCards(text);
  return vcardTexts.map(parseVCard);
}

/**
 * Generate preview text from parsed vCard
 */
export function generateVCardPreview(vcard: ParsedVCard): string {
  const parts: string[] = [];
  
  if (vcard.fullName) {
    parts.push(`👤 ${vcard.fullName}`);
  }
  
  if (vcard.title && vcard.organization) {
    parts.push(`💼 ${vcard.title} at ${vcard.organization}`);
  } else if (vcard.title) {
    parts.push(`💼 ${vcard.title}`);
  } else if (vcard.organization) {
    parts.push(`🏢 ${vcard.organization}`);
  }
  
  if (vcard.email) {
    parts.push(`📧 ${vcard.email}`);
  }
  
  if (vcard.phone) {
    parts.push(`📱 ${vcard.phone}`);
  }
  
  if (vcard.address?.city) {
    parts.push(`📍 ${vcard.address.city}`);
  }
  
  return parts.join('\n');
}

/**
 * Generate vCard from profile data
 * Creates a vCard 4.0 format string from platform profile
 */
export interface ProfileData {
  name?: string;
  email?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  job_title?: string;
  company_name?: string;
  avatar?: string;
}

export function generateVCardFromProfile(profileData: ProfileData): string {
  const lines: string[] = [];
  
  // vCard header
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:4.0');
  
  // Full Name (required)
  if (profileData.name) {
    const nameParts = profileData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // N: Last;First;Middle;Prefix;Suffix
    lines.push(`N:${lastName};${firstName};;;`);
    lines.push(`FN:${profileData.name}`);
  } else {
    // Fallback if no name
    lines.push('N:;;;;');
    lines.push('FN:Unknown');
  }
  
  // Email
  if (profileData.email) {
    lines.push(`EMAIL;TYPE=work:${profileData.email}`);
  }
  
  // Phone
  if (profileData.phone) {
    lines.push(`TEL;TYPE=work,voice:${profileData.phone}`);
  }
  
  // Organization and Title
  if (profileData.company_name) {
    lines.push(`ORG:${profileData.company_name}`);
  }
  
  if (profileData.job_title) {
    lines.push(`TITLE:${profileData.job_title}`);
  }
  
  // Website
  if (profileData.website) {
    lines.push(`URL:${profileData.website}`);
  }
  
  // LinkedIn
  if (profileData.linkedin_url) {
    lines.push(`URL;TYPE=LinkedIn:${profileData.linkedin_url}`);
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${profileData.linkedin_url}`);
  }
  
  // Twitter
  if (profileData.twitter_handle) {
    const twitterUrl = profileData.twitter_handle.startsWith('http') 
      ? profileData.twitter_handle 
      : `https://twitter.com/${profileData.twitter_handle.replace('@', '')}`;
    lines.push(`URL;TYPE=Twitter:${twitterUrl}`);
    lines.push(`X-SOCIALPROFILE;TYPE=twitter:${twitterUrl}`);
  }
  
  // Location/Address
  if (profileData.location) {
    // Try to parse location (City, State, Country format)
    const locationParts = profileData.location.split(',').map(p => p.trim());
    const city = locationParts[0] || '';
    const state = locationParts[1] || '';
    const country = locationParts[2] || '';
    
    // ADR: POBox;Extended;Street;City;State;PostalCode;Country
    lines.push(`ADR:;;;${city};${state};;${country}`);
  }
  
  // Bio/Note
  if (profileData.bio) {
    // Escape special characters and handle line breaks
    const escapedBio = profileData.bio
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
    lines.push(`NOTE:${escapedBio}`);
  }
  
  // Photo (if avatar URL is available)
  if (profileData.avatar) {
    lines.push(`PHOTO;MEDIATYPE=image/jpeg:${profileData.avatar}`);
  }
  
  // Timestamp
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  lines.push(`REV:${now}`);
  
  // vCard footer
  lines.push('END:VCARD');
  
  return lines.join('\r\n');
}

/**
 * Download vCard as .vcf file
 */
export function downloadVCard(vcardText: string, filename: string = 'contact.vcf') {
  // Ensure filename has .vcf extension
  if (!filename.endsWith('.vcf')) {
    filename += '.vcf';
  }
  
  // Create blob and download
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}