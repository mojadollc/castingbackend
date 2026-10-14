import { UserRole } from '@prisma/client';

/**
 * Returns only the fields appropriate for the requesting user's role.
 * Exact DOB, full surname, city, address and contact info are never
 * exposed to non-guardian viewers — consistent with the scope's privacy
 * requirements around minors.
 */
export function filterTalentProfile(talent: any, viewerRole?: UserRole, viewerUserId?: string): any {
  if (!talent) return null;

  const isOwnerGuardian = talent.guardian?.userId === viewerUserId;
  const isAdmin = viewerRole && (
    [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR] as UserRole[]
  ).includes(viewerRole);

  // Guardian (owner) or admin — full access
  if (isOwnerGuardian || isAdmin) return talent;

  // Verified professional / casting director — professional view
  if (viewerRole && (
    [UserRole.CASTING_PROFESSIONAL, UserRole.CASTING_DIRECTOR, UserRole.ORGANIZATION_ADMIN] as UserRole[]
  ).includes(viewerRole)) {
    return {
      id: talent.id,
      firstName: talent.firstName,
      lastName: talent.lastName ? `${talent.lastName[0]}.` : '', // initial only
      ageRange: talent.dateOfBirth ? getAgeRange(talent.dateOfBirth) : null, // no exact DOB
      gender: talent.gender,
      bio: talent.bio,
      headshot: talent.headshot,
      height: talent.height,
      eyeColor: talent.eyeColor,
      hairColor: talent.hairColor,
      hairLength: talent.hairLength,
      skinTone: talent.skinTone,
      clothingSize: talent.clothingSize,
      shoeSize: talent.shoeSize,
      unionMember: talent.unionMember,
      isAvailable: talent.isAvailable,
      profileCompletion: talent.profileCompletion,
      country: talent.country,           // country only — no city/address
      skills: talent.skills,
      languages: talent.languages,
      credits: talent.credits,
      photos: talent.photos,
      videos: talent.videos,
      audios: talent.audios,
      socialLinks: talent.socialLinks,
    };
  }

  // Public — minimal, no PII
  return {
    id: talent.id,
    firstName: talent.firstName,
    gender: talent.gender,
    ageRange: talent.dateOfBirth ? getAgeRange(talent.dateOfBirth) : null,
    headshot: talent.headshot,
    bio: talent.bio,
    isAvailable: talent.isAvailable,
    skills: talent.skills?.map((s: any) => ({ name: s.skill?.name })),
    languages: talent.languages?.map((l: any) => ({ name: l.language?.name })),
    photos: talent.photos?.filter((p: any) => p.isPrimary).slice(0, 1),
  };
}

function getAgeRange(dateOfBirth: Date): string {
  const age = Math.floor(
    (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  if (age < 5) return 'Under 5';
  if (age <= 7) return '5–7';
  if (age <= 10) return '8–10';
  if (age <= 13) return '11–13';
  if (age <= 16) return '14–16';
  if (age <= 18) return '17–18';
  return '18+';
}
