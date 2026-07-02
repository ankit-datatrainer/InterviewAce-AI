// Shared role helpers for the three panels: student / coach / admin.

export type UserRole = 'student' | 'coach' | 'admin';

// Emails always treated as admin even if their profile row hasn't been migrated yet.
export const ADMIN_EMAILS = [
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase(),
  'admin@interviewace.ai',
  'ankit@interviewace.ai',
].filter(Boolean) as string[];

export function homePathForRole(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'coach') return '/coach';
  return '/dashboard';
}

/**
 * Resolves a user's effective role from their profile row + email.
 * Email allow-list wins so the original admin accounts keep working.
 */
export function resolveRole(email: string | null | undefined, profileRole: string | null | undefined): UserRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'admin';
  if (profileRole === 'admin' || profileRole === 'coach') return profileRole;
  return 'student';
}
