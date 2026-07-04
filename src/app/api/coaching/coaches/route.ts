import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { PublicCoach } from '@/lib/coach-types';

// The student-facing coach list — read directly from the `coaches` table.
// The admin panel (/admin/coaches) is the single source of truth: only
// coaches with status 'approved'/'active' AND visibility=true appear here.
// There is intentionally no hardcoded fallback list, so what admins set up
// is exactly what students see.

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    // visibility may not exist until deploy/marketplace-update.sql has run —
    // treat missing/undefined as visible so nothing disappears pre-migration.
    dbCoaches = (data || []).filter((d: any) => d.visibility !== false);
  } catch {
    return NextResponse.json([]);
  }

  const coaches: PublicCoach[] = dbCoaches.map((d: any) => {
    const price = d.price_per_session > 0 ? d.price_per_session : 0;
    return {
      id: d.id,
      slug: slugify(d.name),
      name: d.name,
      title: d.title || 'Interview Coach',
      rating: d.rating || 5.0,
      reviews: d.total_reviews || 0,
      tags: d.tags && d.tags.length > 0 ? d.tags : ['Interview Prep'],
      price: `₹${price.toLocaleString()}/hr`,
      priceValue: price,
      image: d.image_url || '',
      experience: d.experience_years != null ? `${d.experience_years}+ Years Experience` : 'Interview Coach',
      bio: d.bio || d.description || 'Book a personalized 1-on-1 coaching session.',
      email: d.email || '',
      priority: d.priority || 'Standard',
      languages: d.languages || [],
      certificates: d.certificates || [],
      introVideoUrl: d.intro_video_url || '',
    };
  });

  // Premium and Featured coaches surface first in the marketplace.
  const rank: Record<string, number> = { Premium: 0, Featured: 1, Standard: 2, New: 3 };
  coaches.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));

  return NextResponse.json(coaches);
}
