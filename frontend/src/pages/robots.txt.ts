import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = site ? new URL('sitemap-index.xml', site).href : 'https://the-daily-drift-tau.vercel.app/sitemap-index.xml';

  const robotsTxt = `
User-agent: *
Allow: /

# Block admin tools (local only — never deployed anyway)
Disallow: /admin/
Disallow: /api/

Sitemap: ${sitemapUrl}
`.trim();

  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain' },
  });
};

