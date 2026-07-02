import { NextResponse } from 'next/server';
import { nimChat, isNimConfigured } from '@/lib/nim';

// Note: LinkedIn does not permit scraping profile pages, so this endpoint infers
// the most likely target role from the public profile handle/slug. With NVIDIA
// NIM configured it uses the model for a cleaner inference; otherwise it falls
// back to deterministic keyword matching on the slug.
function guessRoleFromSlug(slug: string): string {
  if (!slug) return 'Software Engineer';
  const words = slug.split('-');
  const keywords = [
    'developer', 'engineer', 'designer', 'manager', 'lead',
    'architect', 'analyst', 'consultant', 'scientist', 'specialist',
    'frontend', 'backend', 'fullstack', 'devops', 'product', 'project',
    'ux', 'ui', 'marketing', 'sales', 'hr', 'data',
  ];
  const found = words.filter((w) => keywords.includes(w.toLowerCase()));
  if (found.length > 0) {
    return found.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return 'Fullstack Engineer';
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation
    if (!url.includes('linkedin.com/')) {
      return NextResponse.json({ error: 'Invalid LinkedIn URL' }, { status: 400 });
    }

    // Extract handle and try to guess a role from the URL slug for a smart simulation
    // e.g. linkedin.com/in/john-doe-software-engineer -> "Software Engineer"
    const urlParts = url.split('/in/');
    const slug = urlParts[1] ? urlParts[1].replace(/\/$/, '').split('?')[0] : '';

    let guessedRole = guessRoleFromSlug(slug);

    // Refine the inference with NVIDIA NIM when available.
    if (slug && isNimConfigured()) {
      try {
        const inferred = await nimChat(
          [
            { role: 'system', content: 'You output only a concise job title, 2-4 words, no punctuation or explanation.' },
            { role: 'user', content: `A LinkedIn profile handle is "${slug.replace(/-/g, ' ')}". Infer the single most likely current professional job title for this person. Respond with only the job title.` },
          ],
          { temperature: 0.3, maxTokens: 16 },
        );
        const clean = inferred.replace(/["'.\n]/g, '').trim();
        if (clean && clean.length <= 40) guessedRole = clean;
      } catch (e) {
        console.warn('NIM role inference failed, using slug heuristic:', e);
      }
    }

    const name = slug
      ? slug.split('-').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'LinkedIn User';

    return NextResponse.json({ role: guessedRole, name });
  } catch (error) {
    console.error('LinkedIn extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract profile information' }, { status: 500 });
  }
}
