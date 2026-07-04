import { COACHES } from '@/lib/coaches';
import { getPublicCoaches, type CoachProfile } from '@/lib/coach-store';

// The shape the student-facing coaching UI already renders.
export type StudentCoach = (typeof COACHES)[number];

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Overlay a coach's live (edited) profile from the database onto the static
// marketplace card, so anything the coach changes in their portal shows up
// on the student site. Only non-empty DB values override the static ones.
function mergeCoach(base: StudentCoach, db: CoachProfile): StudentCoach {
  const price = db.pricePerSession > 0 ? db.pricePerSession : base.priceValue;
  return {
    ...base,
    name: db.name || base.name,
    title: db.title || base.title,
    bio: db.bio || base.bio,
    tags: db.tags && db.tags.length > 0 ? db.tags : base.tags,
    priceValue: price,
    price: `₹${price}/hr`,
    image: db.imageUrl || base.image,
    experience: db.experienceYears != null ? `${db.experienceYears}+ Years Experience` : base.experience,
    rating: db.rating > 0 ? db.rating : base.rating,
    reviews: db.totalReviews > 0 ? db.totalReviews : base.reviews,
    email: db.email || base.email,
  };
}

// Build a marketplace card for a coach that exists ONLY in the database
// (e.g. a new coach an admin created — no static entry).
function dbToStudentCoach(db: CoachProfile): StudentCoach {
  const price = db.pricePerSession > 0 ? db.pricePerSession : 1000;
  return {
    id: Number.isFinite(Number(db.id)) ? Number(db.id) : Math.abs(hashString(db.id)),
    slug: slugify(db.name),
    name: db.name,
    title: db.title || 'Interview Coach',
    rating: db.rating || 5.0,
    reviews: db.totalReviews || 0,
    tags: db.tags && db.tags.length > 0 ? db.tags : ['Interview Prep'],
    price: `₹${price}/hr`,
    priceValue: price,
    image: db.imageUrl || '/images/coach-placeholder.jpg',
    experience: db.experienceYears != null ? `${db.experienceYears}+ Years Experience` : 'Interview Coach',
    bio: db.bio || 'Book a personalized 1-on-1 coaching session.',
    email: db.email || '',
    calcomLink: '',
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

/**
 * The coach list shown to students. Starts from the curated static list and
 * overlays live edits from the database (matched by name), then appends any
 * database-only approved coaches. Falls back to the static list if the DB is
 * unreachable, so the page always renders.
 */
export async function getStudentCoaches(): Promise<StudentCoach[]> {
  let dbCoaches: CoachProfile[] = [];
  try {
    dbCoaches = await getPublicCoaches();
  } catch {
    return [...COACHES];
  }

  const used = new Set<string>();
  const merged: StudentCoach[] = COACHES.map((base) => {
    const match = dbCoaches.find((d) => d.name.trim().toLowerCase() === base.name.trim().toLowerCase());
    if (match) { used.add(match.id); return mergeCoach(base, match); }
    return base;
  });

  // Append coaches that exist only in the database.
  for (const d of dbCoaches) {
    if (used.has(d.id)) continue;
    merged.push(dbToStudentCoach(d));
  }

  return merged;
}

/** Look up a single student-facing coach by slug (static or DB-derived). */
export async function getStudentCoachBySlug(slug: string): Promise<StudentCoach | null> {
  const all = await getStudentCoaches();
  return all.find((c) => c.slug === slug) ?? null;
}
