// Netlify Edge Function: adds Open Graph tags for /c/:slug so link previews (Messenger, Telegram,
// Viber, Slack…) show the person's name, title and photo. Reads only the public_cards view.
// Env (Netlify site settings): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
import type { Context } from 'https://edge.netlify.com';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default async (request: Request, context: Context) => {
  const response = await context.next();
  const slug = new URL(request.url).pathname.split('/')[2]?.toLowerCase() ?? '';
  const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL');
  const anon = Netlify.env.get('VITE_SUPABASE_ANON_KEY');
  if (!/^[a-z0-9-]{6,40}$/.test(slug) || !supabaseUrl || !anon) return response;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/public_cards?slug=eq.${slug}&select=first_name,last_name,name_format,title,company,avatar_path`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    const card = (await res.json())?.[0];
    if (!card) return response;

    const last = (card.last_name ?? '').trim();
    const name = !last ? card.first_name : card.name_format === 'full' ? `${last} ${card.first_name}` : `${Array.from(last)[0]}.${card.first_name}`;
    const desc = [card.title, card.company].filter(Boolean).join(' · ');
    const image = card.avatar_path ? `${supabaseUrl}/storage/v1/object/public/avatars/${card.avatar_path}` : `${new URL(request.url).origin}/favicon.svg`;
    const tags = [
      `<title>${esc(name)}${desc ? ` — ${esc(desc)}` : ''} | Digital Card</title>`,
      `<meta property="og:type" content="profile" />`,
      `<meta property="og:title" content="${esc(name)}" />`,
      `<meta property="og:description" content="${esc(desc || 'Digital Card')}" />`,
      `<meta property="og:image" content="${esc(image)}" />`,
      `<meta property="og:url" content="${esc(request.url)}" />`,
      `<meta name="twitter:card" content="summary" />`,
    ].join('\n    ');

    const html = (await response.text())
      .replace(/<title>.*?<\/title>/s, '')
      .replace(/<!--og-->[\s\S]*?<!--\/og-->/, tags);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, headers });
  } catch {
    return response;
  }
};
