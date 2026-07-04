import { NextResponse } from 'next/server';
import { nimChat, isNimConfigured } from '@/lib/nim';

// Note: LinkedIn does not permit scraping profile pages, so this endpoint infers
// the most likely target role from the public profile handle/slug. With NVIDIA
// NIM configured it uses the model for a cleaner inference; otherwise it falls
// back to deterministic keyword matching on the slug.
// Known multi-word role phrases to detect directly in the slug (longest first
// so "product manager" wins over "manager"). Returns a clean, canonical title.
const ROLE_PHRASES: string[] = [
  'machine learning engineer', 'full stack developer', 'fullstack developer',
  'front end developer', 'frontend developer', 'back end developer', 'backend developer',
  'devops engineer', 'site reliability engineer', 'cloud engineer', 'data scientist',
  'data engineer', 'data analyst', 'business analyst', 'business development',
  'product manager', 'project manager', 'program manager', 'ux designer', 'ui designer',
  'ui ux designer', 'product designer', 'graphic designer', 'software engineer',
  'software developer', 'web developer', 'mobile developer', 'android developer',
  'ios developer', 'qa engineer', 'test engineer', 'security engineer',
  'cyber security', 'cybersecurity analyst', 'network engineer', 'system administrator',
  'digital marketing', 'social media manager', 'content writer', 'seo specialist',
  'sales executive', 'account manager', 'customer success', 'human resources',
  'talent acquisition', 'financial analyst', 'chartered accountant', 'operations manager',
  'supply chain', 'management consultant', 'solutions architect', 'ai engineer',
];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Infer a role from the profile slug (e.g. "john-doe-product-manager" -> "Product Manager").
function guessRoleFromSlug(slug: string): string | null {
  if (!slug) return null;
  // LinkedIn slugs often end with random hex ids — strip trailing hashes/numbers.
  const words = slug.toLowerCase().replace(/[0-9a-f]{6,}/g, '').split('-').filter(Boolean);
  const normalized = words.join(' ');

  // 1) Try to match a known multi-word role phrase (longest/most-specific first
  // so "ui ux designer" beats "ux designer").
  const phrasesByLength = [...ROLE_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of phrasesByLength) {
    if (normalized.includes(phrase)) {
      // Normalize a couple of common variants for cleaner display.
      const t = titleCase(phrase)
        .replace(/Ui Ux/i, 'UI/UX').replace(/\bUx\b/i, 'UX').replace(/\bUi\b/i, 'UI')
        .replace(/\bAi\b/i, 'AI').replace(/\bSeo\b/i, 'SEO').replace(/\bQa\b/i, 'QA');
      return t;
    }
  }

  // 2) Fall back to single keyword + qualifier (e.g. "senior engineer").
  const roleWords = ['developer', 'engineer', 'designer', 'manager', 'analyst', 'consultant', 'scientist', 'specialist', 'architect', 'accountant', 'recruiter', 'marketer', 'writer'];
  const qualifiers = ['frontend', 'backend', 'fullstack', 'devops', 'product', 'project', 'data', 'cloud', 'security', 'senior', 'lead', 'principal', 'ux', 'ui'];
  const role = words.find((w) => roleWords.includes(w));
  if (role) {
    const qual = words.find((w) => qualifiers.includes(w));
    return titleCase([qual, role].filter(Boolean).join(' '));
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation (accepts /in/ and legacy /pub/ profile links).
    if (!/linkedin\.com\/(in|pub)\//i.test(url)) {
      return NextResponse.json({ error: 'Invalid LinkedIn URL. Use a profile link like linkedin.com/in/your-name' }, { status: 400 });
    }

    // Extract handle and try to guess a role from the URL slug for a smart simulation
    // e.g. linkedin.com/in/john-doe-software-engineer -> "Software Engineer"
    const match = url.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
    const slug = match ? decodeURIComponent(match[1]) : '';

    // Fast path: if the slug clearly reveals a role, use it instantly — no need
    // to wait on the (slow) AI call. This is what makes Auto-fill feel snappy.
    let guessedRole = guessRoleFromSlug(slug);

    // Only ask NVIDIA NIM when the slug gave us nothing usable, and cap it at
    // 5s so the request never feels stuck.
    if (!guessedRole && slug && isNimConfigured()) {
      try {
        const inferred = await nimChat(
          [
            { role: 'system', content: 'You output only a concise job title, 2-4 words, no punctuation or explanation.' },
            { role: 'user', content: `A LinkedIn profile handle is "${slug.replace(/-/g, ' ')}". Infer the single most likely current professional job title for this person. Respond with only the job title.` },
          ],
          { temperature: 0.3, maxTokens: 16, timeoutMs: 5000 },
        );
        const clean = inferred.replace(/["'.\n]/g, '').trim();
        if (clean && clean.length <= 40) guessedRole = clean;
      } catch (e) {
        console.warn('NIM role inference failed, using slug heuristic:', e);
      }
    }

    // Absolute fallback if nothing matched at all.
    if (!guessedRole) guessedRole = 'Software Engineer';

    const name = slug
      ? slug.split('-').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'LinkedIn User';

    return NextResponse.json({ role: guessedRole, name });
  } catch (error) {
    console.error('LinkedIn extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract profile information' }, { status: 500 });
  }
}
