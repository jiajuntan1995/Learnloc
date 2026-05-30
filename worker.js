/**
 * Fix One Skill — Cloudflare Worker
 * Serves coach data from a D1 database.
 *
 * Routes:
 *   GET /api/coaches          → all active coaches (JSON array)
 *   GET /api/coaches?cat=tech → filtered by category slug
 *
 * wrangler.toml bindings required:
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "skillloc"
 *   database_id   = "<your-d1-database-id>"
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS helper ──────────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',        // tighten to your domain in prod
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── Route: GET /api/coaches ──────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/api/coaches') {
      const cat = url.searchParams.get('cat') || 'all';

      let query, params;

      if (cat === 'all') {
        query  = `SELECT * FROM coaches WHERE active = 1 ORDER BY rating DESC`;
        params = [];
      } else {
        query  = `SELECT * FROM coaches WHERE active = 1 AND category = ? ORDER BY rating DESC`;
        params = [cat];
      }

      try {
        const { results } = await env.DB.prepare(query).bind(...params).all();

        // Rename snake_case DB columns to camelCase for the frontend
        const coaches = results.map(row => ({
          id:         row.id,
          name:       row.name,
          initial:    row.initial,
          avColor:    row.av_color,
          skill:      row.skill,
          category:   row.category,
          bioShort:   row.bio_short,
          bioFull:    row.bio_full,
          rating:     row.rating,
          sessions:   row.sessions,
          price:      row.price_sgd,
        }));

        return new Response(JSON.stringify(coaches), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        console.error('D1 error:', err);
        return new Response(JSON.stringify({ error: 'Database error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // ── 404 for everything else ──────────────────────────────────
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};
