/**
 * Returns the canonical public origin of the app.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL  – set this on your VPS / Vercel to your production
 *     domain (e.g. https://interviewaceai.peculiex.com).
 *  2. The origin derived from the incoming request URL – works perfectly in
 *     local development.
 *
 * Why do we need this?
 * When Next.js server-side routes handle a request, `new URL(req.url).origin`
 * returns "http://localhost:3000" because internally Next.js routes traffic on
 * localhost – even in production.  Without the override the verification links
 * e-mailed by Supabase would point to localhost instead of your real domain.
 */
export function getAppOrigin(requestUrl: string): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    // Strip any trailing slash for consistency.
    return envUrl.replace(/\/$/, '');
  }
  return new URL(requestUrl).origin;
}
