import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { COACHES } from '@/lib/coaches';

// Builds the student-facing coach list by merging the static COACHES array
// with live data from the Supabase `coaches` table. Any field the coach has
// edited in their portal will override the static default.

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export async function GET() {
  let dbCoaches: any[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('coaches')
      .select('*')
      .in('status', ['approved', 'active'])
      .order('rating', { ascending: false });
    // Hide coaches the admin has toggled off (column may not exist pre-migration).
    dbCoaches = (data || []).filter((d: any) => d.visibility !== false);
  } catch {
    // DB unreachable — fall back to static list
    return NextResponse.json(COACHES);
  }

  const used = new Set<string>();

  // Merge: overlay DB values onto matching static entries
  const merged = COACHES.map((base) => {
    const match = dbCoaches.find(
      (d: any) => d.name?.trim().toLowerCase() === base.name.trim().toLowerCase(),
    );
    if (!match) return base;
    used.add(match.id);

    const price = match.price_per_session > 0 ? match.price_per_session : base.priceValue;
    return {
      ...base,
      name: match.name || base.name,
      title: match.title || base.title,
      bio: match.bio || match.description || base.bio,
      tags: match.tags && match.tags.length > 0 ? match.tags : base.tags,
      priceValue: price,
      price: `₹${price}/hr`,
      image: match.image_url || base.image,
      experience:
        match.experience_years != null
          ? `${match.experience_years}+ Years Experience`
          : base.experience,
      rating: match.rating > 0 ? match.rating : base.rating,
      reviews: match.total_reviews > 0 ? match.total_reviews : base.reviews,
      email: match.email || base.email,
      priority: match.priority || 'Standard',
      languages: match.languages || [],
      certificates: match.certificates || [],
      introVideoUrl: match.intro_video_url || '',
    };
  });

  // Append coaches that exist only in the database (admin-created)
  for (const d of dbCoaches) {
    if (used.has(d.id)) continue;
    const price = d.price_per_session > 0 ? d.price_per_session : 1000;
    merged.push({
      id: Number.isFinite(Number(d.id)) ? Number(d.id) : Math.abs(hashString(d.id)),
      slug: slugify(d.name),
      name: d.name,
      title: d.title || 'Interview Coach',
      rating: d.rating || 5.0,
      reviews: d.total_reviews || 0,
      tags: d.tags && d.tags.length > 0 ? d.tags : ['Interview Prep'],
      price: `₹${price}/hr`,
      priceValue: price,
      image: d.image_url || '/images/coach-placeholder.jpg',
      experience:
        d.experience_years != null
          ? `${d.experience_years}+ Years Experience`
          : 'Interview Coach',
      bio: d.bio || d.description || 'Book a personalized 1-on-1 coaching session.',
      email: d.email || '',
      calcomLink: '',
      priority: d.priority || 'Standard',
      languages: d.languages || [],
      certificates: d.certificates || [],
      introVideoUrl: d.intro_video_url || '',
    });
  }

  // Premium and Featured coaches surface first in the marketplace.
  const rank: Record<string, number> = { Premium: 0, Featured: 1, Standard: 2, New: 3 };
  merged.sort((a: any, b: any) => (rank[a.priority ?? 'Standard'] ?? 2) - (rank[b.priority ?? 'Standard'] ?? 2));

  return NextResponse.json(merged);
}
