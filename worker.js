/**
 * GameHub search proxy — Cloudflare Worker for the Brave Search API.
 * Keeps your Brave API key secret (it must never go in script.js).
 *
 * SETUP (about 10 minutes):
 * 1. Get a Brave Search API key: https://brave.com/search/api/
 *    (Brave gives $5 of free credit each month — roughly 1,000 searches.)
 * 2. Create a free Cloudflare account → Workers & Pages → Create → Worker.
 *    Name it e.g. "gamehub-search", deploy, then "Edit code" and paste this file.
 * 3. Worker → Settings → Variables and Secrets:
 *      BRAVE_API_KEY    (type: Secret)  = your Brave key
 *      ALLOWED_ORIGINS  (type: Text)    = your site's address, e.g. https://gamehub.example.com
 *                                         (comma-separate several; this stops others using your credits)
 * 4. Copy the worker URL (https://gamehub-search.<you>.workers.dev) into
 *    CONFIG.searchProxyUrl in script.js.
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
    const allowAll = allowed.includes("*");

    const cors = {
      "Access-Control-Allow-Origin": allowAll ? "*" : origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin"
    };

    if (!allowAll && !allowed.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403, {});
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, cors);
    }
    if (!env.BRAVE_API_KEY) {
      return json({ error: "BRAVE_API_KEY is not set on the worker" }, 500, cors);
    }

    const params = new URL(request.url).searchParams;
    const query = (params.get("q") || "").trim().slice(0, 400);
    const offset = Math.min(9, Math.max(0, parseInt(params.get("offset"), 10) || 0));

    if (!query) return json({ error: "Missing search query" }, 400, cors);

    const api = new URL("https://api.search.brave.com/res/v1/web/search");
    api.searchParams.set("q", query);
    api.searchParams.set("count", "10");
    api.searchParams.set("offset", String(offset));
    api.searchParams.set("safesearch", "moderate");

    const response = await fetch(api, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": env.BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      const reason = response.status === 429 ? "rate limit or credit reached" : `status ${response.status}`;
      return json({ error: `Brave Search error (${reason})` }, 502, cors);
    }

    const data = await response.json();
    const results = (data.web?.results || []).map(r => ({
      title: r.title || r.url,
      url: r.url,
      description: r.description || ""
    }));

    return json(
      { query, offset, results, more: Boolean(data.query?.more_results_available) },
      200,
      { ...cors, "Cache-Control": "public, max-age=300" }
    );
  }
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
